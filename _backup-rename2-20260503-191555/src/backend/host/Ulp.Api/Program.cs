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
using Ulp.Core.Abstractions.Plugins;
using Ulp.Core.PluginHost;
using Ulp.Plugin.India.Tax;

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

    // ---- Compliance plugins (India tax provider) — keyed by country code via Core.PluginHost ----
    var indiaTaxPlugin = new IndiaTaxPlugin();
    indiaTaxPlugin.ConfigureServices(builder.Services);

    // ---- OpenAPI ----
    builder.Services.AddEndpointsApiExplorer();

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseCors(DevSpaCors);            // CORS must run before auth so preflight succeeds
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
