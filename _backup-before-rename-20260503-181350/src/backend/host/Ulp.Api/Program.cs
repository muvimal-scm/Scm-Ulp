using Microsoft.AspNetCore.Authentication.JwtBearer;
using NodaTime;
using NodaTime.Serialization.SystemTextJson;
using Serilog;
using Ulp.Core.Infrastructure.Json;
using Ulp.M1.Api;
using Ulp.M1.Infrastructure.Persistence;
using Ulp.M26.Api;
using Ulp.M26.Infrastructure;
using Ulp.M21.Api;
using Ulp.M21.Infrastructure;
using Ulp.M27.Api;
using Ulp.M27.Infrastructure;
using Ulp.M3.Api;
using Ulp.M3.Infrastructure;
using Ulp.M14.Api;
using Ulp.M14.Infrastructure;
using Ulp.M6.Api;
using Ulp.M6.Infrastructure;
using Ulp.M5.Api;
using Ulp.M5.Infrastructure;
using Ulp.M2.Api;
using Ulp.M2.Infrastructure;
using Ulp.M7.Api;
using Ulp.M7.Infrastructure;
using Ulp.M9.Api;
using Ulp.M9.Infrastructure;
using Ulp.M17.Api;
using Ulp.M17.Infrastructure;
using Ulp.M4.Api;
using Ulp.M4.Infrastructure;
using Ulp.Core.Abstractions.Plugins;
using Ulp.Core.PluginHost;
using Ulp.Plugin.India.Tax;

// =====================================================================
// ULP API host — Phase 1 skeleton.
// Wires Serilog, JWT auth (Keycloak `ulp` realm), Money JSON converter,
// NodaTime JSON, IClock, and a /health endpoint.
// Modules + plugins are added in Phase 1 work-streams 4 (DB) and 3 (M1).
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

    // ---- CORS — Phase 1 dev allows the Angular SPA at localhost:4200.
    // Production tightens this to the deployed origins per region.
    const string DevSpaCors = "DevSpa";
    builder.Services.AddCors(o => o.AddPolicy(DevSpaCors, p =>
        p.WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials()
         .WithExposedHeaders("Location")));

    // ---- Tenant context (M26 RBAC resolves real tenant from JWT) ----
    builder.Services.AddHttpContextAccessor();

    // ---- M26 RBAC + Tenant module — registers ITenantContext (replaces dev stub) ----
    builder.Services.AddM26Module(builder.Configuration);

    // ---- M1 Master Data module ----
    builder.Services.AddM1Module(builder.Configuration);
    builder.Services.AddM1Validators();

    // ---- M21 Document Management module (also registers IStorageProvider) ----
    builder.Services.AddM21Module(builder.Configuration);

    // ---- M27 Notifications module (also registers IEmailSender via MailHog) ----
    builder.Services.AddM27Module(builder.Configuration);

    // ---- M3 Vendor Management module (extends M1.Party with vendor satellite) ----
    builder.Services.AddM3Module(builder.Configuration);

    // ---- M14 Pricing & Quotation module (Phase 2) ----
    builder.Services.AddM14Module(builder.Configuration);

    // ---- M6 Document Generation module (Phase 2) — also registers IDocumentRenderer ----
    builder.Services.AddM6Module(builder.Configuration);

    // ---- M5 Freight Forwarding module (Phase 2) — bookings, shipments, MBL/HBL/AWB, containers, milestones ----
    builder.Services.AddM5Module(builder.Configuration);

    // ---- M2 Sales / CRM module (Phase 4) — leads, opportunities, activities, campaigns, RFQs ----
    builder.Services.AddM2Module(builder.Configuration);

    // ---- M7 Procurement module (Phase 4) — PR → vendor RFQ → PO → GRN → invoice match ----
    builder.Services.AddM7Module(builder.Configuration);

    // ---- M9 Last-Mile Delivery module (Phase 4) — courier bookings, routes, manifests, POD, COD, attempts ----
    builder.Services.AddM9Module(builder.Configuration);

    // ---- M17 Accounts module (per sealed LLD) — GL/AR/AP/period close + India plugin extensions ----
    builder.Services.AddM17Module(builder.Configuration);

    // ---- M4 Customs module — M4-US (CBP/ABI) per sealed LLD ULP_LLD_M4_US_CBP_ABI_v1.0.docx ----
    builder.Services.AddM4Module(builder.Configuration);

    // ---- Compliance plugins (M17-IN tax provider) — keyed by country code via Core.PluginHost ----
    var indiaTaxPlugin = new IndiaTaxPlugin();
    indiaTaxPlugin.ConfigureServices(builder.Services);

    // ---- OpenAPI ----
    builder.Services.AddEndpointsApiExplorer();

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseCors(DevSpaCors);            // CORS must run before auth so preflight succeeds
    app.UseAuthentication();
    app.UseM26TenantContext();          // resolve tenant from JWT before authorization runs
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

    // ---- M26 RBAC + Tenant endpoints (me, users, roles, permissions, api-keys) ----
    app.MapM26Endpoints();

    // ---- M1 Master Data endpoints (parties, products, reference) ----
    app.MapM1Endpoints();

    // ---- M21 Document Management endpoints (documents, storage quota) ----
    app.MapM21Endpoints();

    // ---- M27 Notifications endpoints (inbox, preferences, templates, send-test) ----
    app.MapM27Endpoints();

    // ---- M3 Vendor Management endpoints (vendors, onboarding, agreements, performance, NCRs) ----
    app.MapM3Endpoints();

    // ---- M14 Pricing endpoints (rate-cards, quotes, surcharges, contracts) ----
    app.MapM14Endpoints();

    // ---- M6 Doc Generation endpoints (templates, render) ----
    app.MapM6Endpoints();

    // ---- M5 Freight Forwarding endpoints (bookings, shipments, mbls/hbls/awbs, containers, charges) ----
    app.MapM5Endpoints();

    // ---- M2 Sales / CRM endpoints (leads, opportunities, activities, campaigns, RFQs) ----
    app.MapM2Endpoints();

    // ---- M7 Procurement endpoints (PRs, RFQs, POs, GRNs, invoice matches) ----
    app.MapM7Endpoints();

    // ---- M9 Last-Mile Delivery endpoints (bookings, routes, manifests, PODs, COD, attempts, zone rates) ----
    app.MapM9Endpoints();

    // ---- M17 Accounts endpoints (chart of accounts, periods, invoices, bills, receipts, payments, journals, reports) ----
    app.MapM17Endpoints();

    // ---- M17 Accounts ext endpoints (settlement links, bank accounts/recon/deposits, fund transfer, voided checks,
    //      print batches, past-due notices, email templates, credit-card payments, general expenses, comparative profit) ----
    app.MapM17ExtEndpoints();

    // ---- M4 Customs endpoints (entries, bonds, ATM, release orders, ISF, PGA holds, hold/exam, in-bond, ABI messages) ----
    app.MapM4Endpoints();

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
