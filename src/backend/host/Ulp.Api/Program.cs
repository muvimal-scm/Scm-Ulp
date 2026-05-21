using Microsoft.AspNetCore.Authentication.JwtBearer;
using NodaTime;
using NodaTime.Serialization.SystemTextJson;
using Serilog;
using Ulp.Core.Infrastructure.Json;
using Ulp.MasterData.Api;
using Ulp.MasterData.Infrastructure.Persistence;
using Ulp.Identity.Api;
using Ulp.Identity.Infrastructure;
using Ulp.DocumentManagement.Api;
using Ulp.DocumentManagement.Infrastructure;
using Ulp.Notifications.Api;
using Ulp.Notifications.Infrastructure;
using Ulp.VendorManagement.Api;
using Ulp.VendorManagement.Infrastructure;
using Ulp.PricingQuotation.Api;
using Ulp.PricingQuotation.Infrastructure;
using Ulp.DocumentGeneration.Api;
using Ulp.DocumentGeneration.Infrastructure;
using Ulp.FreightForwarding.Api;
using Ulp.FreightForwarding.Infrastructure;
using Ulp.Sales.Api;
using Ulp.Sales.Infrastructure;
using Ulp.Procurement.Api;
using Ulp.Procurement.Infrastructure;
using Ulp.LastMile.Api;
using Ulp.LastMile.Infrastructure;
using Ulp.Accounting.Api;
using Ulp.Accounting.Infrastructure;
using Ulp.Customs.Api;
using Ulp.Customs.Infrastructure;
using Ulp.Reports.Api;
using Ulp.Reports.Infrastructure;
using Ulp.Wms.Api;
using Ulp.Wms.Infrastructure;
using Ulp.Trucking.Api;
using Ulp.Trucking.Infrastructure;
using Ulp.Core.Abstractions.Plugins;
using Ulp.Core.PluginHost;
using Ulp.Plugin.India.Tax;
using Ulp.Api;

// =====================================================================
// ULP API host.
// Wires Serilog, JWT auth (Keycloak `ulp` realm), Money JSON converter,
// NodaTime JSON, IClock, and a /health endpoint. Composes all live modules
// + the India tax compliance plugin (resolved per tenant by country code).
// =====================================================================

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .Enrich.FromLogContext()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    // ---- Sentry (CP21) ----
    // Active only when SENTRY_DSN is set; left unset in dev so local runs
    // never accidentally ship errors upstream. Beta sets DSN via .env.beta.
    var sentryDsn = builder.Configuration["Sentry:Dsn"]
                    ?? Environment.GetEnvironmentVariable("SENTRY_DSN");
    if (!string.IsNullOrWhiteSpace(sentryDsn))
    {
        builder.WebHost.UseSentry(o =>
        {
            o.Dsn = sentryDsn;
            o.Environment = builder.Environment.EnvironmentName;
            o.Release = typeof(Program).Assembly.GetName().Version?.ToString();
            // 100% transactions for the small beta cohort. Drop to 0.2 once
            // we're past beta and traffic ramps.
            o.TracesSampleRate = 1.0;
            o.SendDefaultPii = false;     // stay GDPR-safe by default
            o.AttachStacktrace = true;
        });
    }

    // ---- Time seam ----
    builder.Services.AddSingleton<IClock>(SystemClock.Instance);
    builder.Services.AddSingleton<IDateTimeZoneProvider>(DateTimeZoneProviders.Tzdb);

    // ---- JSON: Money + NodaTime + string-named enums (case-insensitive) ----
    builder.Services.ConfigureHttpJsonOptions(opts =>
    {
        opts.SerializerOptions.Converters.Add(new MoneyJsonConverter());
        opts.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter(allowIntegerValues: true));
        opts.SerializerOptions.PropertyNameCaseInsensitive = true;
        opts.SerializerOptions.ConfigureForNodaTime(DateTimeZoneProviders.Tzdb);
    });

    // ---- Request body size cap (CP22) ----
    // OWASP A04:2021. Cap raw request bodies at 25 MB. Document uploads use a
    // per-endpoint MultipartBodyLengthLimit override of 50 MB inside M21.
    builder.WebHost.ConfigureKestrel(o =>
    {
        o.Limits.MaxRequestBodySize = 25L * 1024 * 1024;
        o.Limits.MaxRequestHeadersTotalSize = 32 * 1024;
        o.Limits.MaxConcurrentConnections    = 1024;
        o.Limits.MaxConcurrentUpgradedConnections = 256;
    });

    // ---- Rate limiter (CP22) ----
    // Three named policies. Applied per-endpoint via RequireRateLimiting(...).
    // Per-IP partition; we use the X-Forwarded-For first hop because Caddy
    // injects it (KC_PROXY=edge / X-Real-IP for the API path).
    builder.Services.AddRateLimiter(opts =>
    {
        opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        static string ClientKey(HttpContext ctx)
        {
            var fwd = ctx.Request.Headers["X-Forwarded-For"].ToString();
            if (!string.IsNullOrWhiteSpace(fwd))
            {
                var first = fwd.Split(',', 2)[0].Trim();
                if (!string.IsNullOrEmpty(first)) return first;
            }
            return ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }

        // Auth-sensitive: factory-reset, password-reset callbacks, anything
        // that's a juicy brute-force target. Strict.
        opts.AddPolicy("auth-sensitive", ctx =>
            System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: ClientKey(ctx),
                factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
                {
                    PermitLimit          = 10,
                    Window               = TimeSpan.FromMinutes(1),
                    QueueLimit           = 0,
                    QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst,
                }));

        // General write — POST/PUT/DELETE on the regular CRUD surface.
        opts.AddPolicy("general-write", ctx =>
            System.Threading.RateLimiting.RateLimitPartition.GetTokenBucketLimiter(
                partitionKey: ClientKey(ctx),
                factory: _ => new System.Threading.RateLimiting.TokenBucketRateLimiterOptions
                {
                    TokenLimit          = 120,
                    TokensPerPeriod     = 60,
                    ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                    AutoReplenishment   = true,
                    QueueLimit          = 0,
                }));

        // Read — list/detail GETs. Generous.
        opts.AddPolicy("read", ctx =>
            System.Threading.RateLimiting.RateLimitPartition.GetTokenBucketLimiter(
                partitionKey: ClientKey(ctx),
                factory: _ => new System.Threading.RateLimiting.TokenBucketRateLimiterOptions
                {
                    TokenLimit          = 600,
                    TokensPerPeriod     = 600,
                    ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                    AutoReplenishment   = true,
                    QueueLimit          = 0,
                }));
    });

    // ---- Auth (Keycloak `ulp` realm) ----
    var authority = builder.Configuration["Auth:Authority"]
                    ?? "http://localhost:8080/realms/ulp";
    var audience = builder.Configuration["Auth:Audience"] ?? "ulp-api";

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(opts =>
        {
            opts.Authority = authority;
            opts.Audience = audience;
            opts.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
            opts.TokenValidationParameters.ValidateAudience = false; // Keycloak puts aud in `azp`/`resource_access`
        });
    builder.Services.AddAuthorization();

    // ---- CORS â€” Phase 1 dev allows the Angular SPA at localhost:4200.
    // Production tightens this to the deployed origins per region.
    const string DevSpaCors = "DevSpa";
    builder.Services.AddCors(o => o.AddPolicy(DevSpaCors, p =>
        p.WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials()
         .WithExposedHeaders("Location")));

    // ---- Tenant context (Identity module resolves real tenant from JWT) ----
    builder.Services.AddHttpContextAccessor();

    // ---- Identity module — registers ITenantContext (RBAC + tenant resolution from JWT) ----
    builder.Services.AddIdentityModule(builder.Configuration);

    // ---- Master Data module ----
    builder.Services.AddMasterDataModule(builder.Configuration);
    builder.Services.AddMasterDataValidators();

    // ---- Document Management module (also registers IStorageProvider via MinIO) ----
    builder.Services.AddDocumentManagementModule(builder.Configuration);

    // ---- Notifications module (also registers IEmailSender via MailHog) ----
    builder.Services.AddNotificationsModule(builder.Configuration);

    // ---- Vendor Management module (extends Master Data parties with vendor satellite) ----
    builder.Services.AddVendorManagementModule(builder.Configuration);

    // ---- Pricing & Quotation module ----
    builder.Services.AddPricingQuotationModule(builder.Configuration);

    // ---- Document Generation module (also registers IDocumentRenderer) ----
    builder.Services.AddDocumentGenerationModule(builder.Configuration);

    // ---- Freight Forwarding module — bookings, shipments, MBL/HBL/AWB, containers, milestones ----
    builder.Services.AddFreightForwardingModule(builder.Configuration);

    // ---- Sales module — leads, opportunities, activities, campaigns, RFQs ----
    builder.Services.AddSalesModule(builder.Configuration);

    // ---- Procurement module — PR → vendor RFQ → PO → GRN → invoice match ----
    builder.Services.AddProcurementModule(builder.Configuration);

    // ---- Last-Mile Delivery module — courier bookings, routes, manifests, POD, COD, attempts ----
    builder.Services.AddLastMileModule(builder.Configuration);

    // ---- Accounting module — GL/AR/AP/period close + India plugin extensions (GST/IRN/TDS) ----
    builder.Services.AddAccountingModule(builder.Configuration);

    // ---- Customs module — US CBP/ABI per sealed LLD ULP_LLD_M4_US_CBP_ABI_v1.0.docx ----
    builder.Services.AddCustomsModule(builder.Configuration);

    // ---- M22 Reports & Analytics — read-only cross-module aggregations ----
    builder.Services.AddReportsModule(builder.Configuration);

    // ---- M10 Trucking ERP — drivers, trucks, chassis, jobs, dispatch, accessorials ----
    builder.Services.AddTruckingModule(builder.Configuration);

    // ---- M8 WMS — warehouse management (warehouses, zones, bins, GRN, pick lists) ----
    builder.Services.AddWmsModule(builder.Configuration);

    // ---- Hangfire background jobs (CP-Sprint-1.4) — fires the M27 rules-
    //      sweep every 15 minutes so notifications don't depend on the
    //      "Run now" button being clicked manually.
    builder.Services.AddBackgroundJobs(builder.Configuration);

    // ---- Compliance plugins (India tax provider) — keyed by country code via Core.PluginHost ----
    var indiaTaxPlugin = new IndiaTaxPlugin();
    indiaTaxPlugin.ConfigureServices(builder.Services);

    // ---- OpenAPI ----
    builder.Services.AddEndpointsApiExplorer();

    var app = builder.Build();

    app.UseSerilogRequestLogging();

    // ---- Security headers (CP22) ----
    // Defense-in-depth — Caddy already sets HSTS / X-Content-Type-Options on
    // the public edge, but Caddy isn't in the loop for east-west traffic
    // inside the cluster. Setting them at the API too means an internal caller
    // hitting :8080 directly still gets the same posture.
    app.Use(async (ctx, next) =>
    {
        var h = ctx.Response.Headers;
        h["X-Content-Type-Options"]   = "nosniff";
        h["X-Frame-Options"]          = "DENY";
        h["Referrer-Policy"]          = "no-referrer";
        h["Permissions-Policy"]       = "geolocation=(), camera=(), microphone=()";
        // No CSP here — APIs serve JSON, browser doesn't render API responses.
        await next();
    });

    app.UseCors(DevSpaCors);            // CORS must run before auth so preflight succeeds
    app.UseRateLimiter();               // CP22 — must run after CORS, before auth
    app.UseAuthentication();
    app.UseIdentityTenantContext();          // resolve tenant from JWT before authorization runs
    app.UseAuthorization();

    // ---- Health ----
    app.MapGet("/health", () => Results.Ok(new
    {
        status = "ok",
        service = "ulp-api",
        version = typeof(Program).Assembly.GetName().Version?.ToString() ?? "0.0.0",
        time = SystemClock.Instance.GetCurrentInstant().ToString()
    })).AllowAnonymous();

    // ---- Whoami (auth smoke test) ----
    app.MapGet("/whoami", (HttpContext ctx) => Results.Ok(new
    {
        name = ctx.User.Identity?.Name,
        tenant_id = ctx.User.FindFirst("tenant_id")?.Value,
        country_code = ctx.User.FindFirst("country_code")?.Value,
        region = ctx.User.FindFirst("region")?.Value
    })).RequireAuthorization();

    // ---- Identity endpoints (me, users, roles, permissions, api-keys) ----
    app.MapIdentityEndpoints();

    // ---- Master Data endpoints (parties, products, reference) ----
    app.MapMasterDataEndpoints();

    // ---- Document Management endpoints (documents, storage quota) ----
    app.MapDocumentManagementEndpoints();

    // ---- Notifications endpoints (inbox, preferences, templates, send-test) ----
    app.MapNotificationsEndpoints();

    // ---- Vendor Management endpoints (vendors, onboarding, agreements, performance, NCRs) ----
    app.MapVendorManagementEndpoints();

    // ---- Pricing & Quotation endpoints (rate-cards, quotes, surcharges, contracts) ----
    app.MapPricingQuotationEndpoints();

    // ---- Document Generation endpoints (templates, render) ----
    app.MapDocumentGenerationEndpoints();

    // ---- Freight Forwarding endpoints (bookings, shipments, mbls/hbls/awbs, containers, charges) ----
    app.MapFreightForwardingEndpoints();

    // ---- Sales endpoints (leads, opportunities, activities, campaigns, RFQs) ----
    app.MapSalesEndpoints();

    // ---- Procurement endpoints (PRs, RFQs, POs, GRNs, invoice matches) ----
    app.MapProcurementEndpoints();

    // ---- Last-Mile Delivery endpoints (bookings, routes, manifests, PODs, COD, attempts, zone rates) ----
    app.MapLastMileEndpoints();

    // ---- Accounting endpoints (chart of accounts, periods, invoices, bills, receipts, payments, journals, reports) ----
    app.MapAccountingEndpoints();

    // ---- Accounting ext endpoints (settlement links, bank accounts/recon/deposits, fund transfer, voided checks,
    //      print batches, past-due notices, email templates, credit-card payments, general expenses, comparative profit) ----
    app.MapAccountingExtEndpoints();

    // ---- Customs endpoints (entries, bonds, ATM, release orders, ISF, PGA holds, hold/exam, in-bond, ABI messages) ----
    app.MapCustomsEndpoints();

    // ---- M22 Reports endpoints (ar-ageing, ap-ageing, revenue-by-mode, demurrage-exposure) ----
    app.MapReportsEndpoints();

    // ---- M10 Trucking ERP endpoints (drivers, trucks, chassis, jobs, dispatch board, accessorials) ----
    app.MapTruckingEndpoints();

    // ---- M8 WMS endpoints (warehouses, zones, bins, GRNs, pick-lists, stock) ----
    app.MapWmsEndpoints();

    // ---- CP17 admin endpoints (factory-reset demo data, db-stats) — gated to PlatformAdmin / OrgAdmin ----
    app.MapAdminEndpoints();

    Log.Information("ULP API starting on {Urls}", string.Join(",", app.Urls));
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "ULP API failed to start");
    return 1;
}
finally
{
    Log.CloseAndFlush();
}

return 0;

// Marker so Program is referenceable from tests
public partial class Program;
