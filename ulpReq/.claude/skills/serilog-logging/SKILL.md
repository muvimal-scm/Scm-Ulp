---
name: serilog-logging
description: Serilog structured logging for ULP. Use when adding logging to services, configuring log enrichment, integrating with Application Insights or Sentry. Covers log levels, scope properties, masking PII, request logging. Always log structured (with properties), never use string concatenation.
---

# Serilog Structured Logging for ULP

## When this skill triggers
Adding logging to services, configuring sinks, masking sensitive data, structured request logging, correlation IDs. Use Serilog everywhere - never `ILogger` with string concatenation.

## Top 3 reference repos
1. **serilog/serilog** (https://github.com/serilog/serilog) - Official. The wiki covers all enricher and sink patterns.
2. **serilog/serilog-aspnetcore** (https://github.com/serilog/serilog-aspnetcore) - Request logging middleware for ASP.NET Core.
3. **serilog-contrib/serilog-enrichers-sensitive** (https://github.com/serilog-contrib/serilog-enrichers-sensitive) - Mask PII (PAN, GSTIN, mobile, email) before logs reach sinks.

## Standard ULP setup
```csharp
// Program.cs
builder.Host.UseSerilog((ctx, sp, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .ReadFrom.Services(sp)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .Enrich.WithProperty("Application", "ULP")
    .Enrich.WithProperty("Module", Assembly.GetExecutingAssembly().GetName().Name)
    .Enrich.With<TenantEnricher>()         // adds TenantId from HTTP context
    .Enrich.With<UserIdEnricher>()         // adds UserId from JWT
    .Enrich.With<CorrelationIdEnricher>()  // adds X-Correlation-Id
    .Enrich.WithSensitiveDataMasking()     // masks PAN, GSTIN, mobile, email
    .WriteTo.Console(outputTemplate: 
        "[{Timestamp:HH:mm:ss} {Level:u3}] [{TenantId}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .WriteTo.ApplicationInsights(
        ctx.Configuration["ApplicationInsights:ConnectionString"],
        TelemetryConverter.Traces)
    .WriteTo.Sentry(o => {
        o.Dsn = ctx.Configuration["Sentry:Dsn"];
        o.MinimumEventLevel = LogEventLevel.Warning;
        o.MinimumBreadcrumbLevel = LogEventLevel.Information;
    }));

// Request logging
app.UseSerilogRequestLogging(opts => {
    opts.MessageTemplate = "HTTP {RequestMethod} {RequestPath} -> {StatusCode} in {Elapsed:0}ms";
    opts.GetLevel = (httpCtx, elapsed, ex) => 
        ex != null ? LogEventLevel.Error
        : httpCtx.Response.StatusCode >= 500 ? LogEventLevel.Error
        : elapsed > 3000 ? LogEventLevel.Warning
        : LogEventLevel.Information;
    opts.EnrichDiagnosticContext = (diag, http) => {
        diag.Set("UserId", http.User.FindFirst("sub")?.Value);
        diag.Set("TenantId", http.Items["TenantId"]);
        diag.Set("UserAgent", http.Request.Headers.UserAgent.ToString());
    };
});
```

## Standard log statements
```csharp
public class InvoiceService
{
    private readonly ILogger<InvoiceService> _log;

    public async Task ApproveAsync(Guid id, CancellationToken ct)
    {
        // GOOD - structured properties
        _log.LogInformation("Approving invoice {InvoiceId} amount {Amount} {Currency}",
            id, invoice.Amount, invoice.Currency);
        
        // BAD - never use string interpolation in log messages
        // _log.LogInformation($"Approving invoice {id}");
        
        try {
            await DoWorkAsync(ct);
        }
        catch (Exception ex) {
            _log.LogError(ex, "Failed to approve invoice {InvoiceId}", id);
            throw;
        }
    }
}
```

## Custom enrichers (TenantEnricher example)
```csharp
public class TenantEnricher : ILogEventEnricher
{
    private readonly IHttpContextAccessor _http;
    
    public TenantEnricher(IHttpContextAccessor http) { _http = http; }
    
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory factory)
    {
        var tenantId = _http.HttpContext?.Items["TenantId"]?.ToString();
        if (!string.IsNullOrEmpty(tenantId))
            logEvent.AddPropertyIfAbsent(factory.CreateProperty("TenantId", tenantId));
    }
}
```

## PII masking patterns (ULP-specific)
```csharp
// Configured via serilog-enrichers-sensitive
.Enrich.WithSensitiveDataMasking(opts => {
    opts.MaskingOperators = new[] {
        new RegexMaskingOperator(@"[A-Z]{5}[0-9]{4}[A-Z]"),    // PAN
        new RegexMaskingOperator(@"\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z][Z]\d"),  // GSTIN
        new RegexMaskingOperator(@"[6-9]\d{9}"),           // Indian mobile
        new EmailAddressMaskingOperator(),
        new RegexMaskingOperator(@"\d{12}")                // Aadhaar (12 digits)
    };
})
```

## Gotchas specific to ULP

1. **NEVER log raw passwords, JWTs, API keys, OTPs** - even in DEBUG. Use the masking enricher religiously.
2. **NEVER log full credit card numbers, bank account numbers, Aadhaar** - PCI-DSS / RBI / UIDAI requirements.
3. **Always log `TenantId`** - via enricher. Without it, debugging cross-tenant issues is impossible.
4. **Correlation ID propagates through events** - extract from `X-Correlation-Id` header; if missing, generate a GUID.
5. **Log levels in production**:
   - `Verbose` / `Debug` -> off
   - `Information` -> business events (invoice approved, trip dispatched)
   - `Warning` -> degraded paths (retry attempts, circuit breaker open)
   - `Error` -> exceptions or failed operations
   - `Fatal` -> unrecoverable (should page on-call)
6. **Don't log inside tight loops** - 1M GPS points per minute = log explosion. Sample or aggregate.
7. **Sentry is for errors only** - don't send `Information` to Sentry. Application Insights handles all levels.

## ULP companion docs
- Observability strategy: `docs/ULP_HLD_v1.0_HighLevelDesign.docx` Section 7


---

## v2.0 ADDENDUM — Mandatory Multi-Region Log Schema

Every log line in v2.0 MUST be JSON with this minimum schema:

| Field | Type | Description |
|---|---|---|
| `timestamp` | ISO 8601 (UTC, with `Z`) | `Instant` from `IClock` |
| `level` | string | `TRACE \| DEBUG \| INFO \| WARN \| ERROR \| FATAL` |
| `service` | string | Logical service name (e.g., `orders-api`) |
| `environment` | string | `dev \| qa \| uat \| perf \| prod` |
| `region` | string | `centralindia \| southindia \| eastus2 \| westus2` |
| `traceId` | string | W3C trace-context (32-char hex) |
| `spanId` | string | W3C span-id (16-char hex) |
| `tenantId` | string | Tenant ULID |
| `countryCode` | string | `IN \| US` — drives plugin DI; required for ops |
| `userId` | string \| null | Authenticated user; null on anonymous |
| `requestId` | string | Per-request correlation id (X-Request-Id) |
| `messageTemplate` | string | Serilog template (preserved structure) |
| `eventId` | string (optional) | Stable identifier for known event types |

### Mandatory enrichers (Program.cs)

```csharp
builder.Host.UseSerilog((ctx, sp, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .ReadFrom.Services(sp)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("service", AssemblyName)
    .Enrich.WithProperty("environment", environmentName)
    .Enrich.WithProperty("region", azureRegionKey)        // NEW v2.0
    .Enrich.With<TenantEnricher>()                         // tenantId
    .Enrich.With<CountryCodeEnricher>()                    // NEW v2.0 — countryCode from ITenantContext
    .Enrich.With<TraceContextEnricher>()                   // NEW v2.0 — W3C traceId + spanId
    .Enrich.With<UserIdEnricher>()
    .Enrich.With<CorrelationIdEnricher>()
    .Enrich.WithSensitiveDataMasking()                     // PII redaction (extended in v2.0)
    .WriteTo.Console(new RenderedCompactJsonFormatter())   // JSON only — no pretty text in v2.0
    .WriteTo.ApplicationInsights(...)
);
```

### CountryCodeEnricher

```csharp
public sealed class CountryCodeEnricher : ILogEventEnricher
{
    private readonly IHttpContextAccessor _http;
    public CountryCodeEnricher(IHttpContextAccessor http) => _http = http;
    public void Enrich(LogEvent ev, ILogEventPropertyFactory pf)
    {
        var ctx = _http.HttpContext?.RequestServices?.GetService<ITenantContext>();
        if (ctx is null) return;
        ev.AddPropertyIfAbsent(pf.CreateProperty("countryCode", ctx.CountryCode));
    }
}
```

### Extended PII redaction policy (v2.0)
Adds US identifiers to the masking denylist:

```
Redacted property names (case-insensitive, partial match):
  IN: pan, gstin, aadhaar, dl
  US: ssn, ein, itin, dl
  Banking: bankAccount, accountNumber, routingNumber
  Auth: password, apiKey, accessToken, refreshToken, otp, plaidAccessToken
  Email: partial mask (j***@e***.com)
  Phone: country code + last 4 only
```

### What to never log
- Full SSN, EIN, ITIN, PAN, GSTIN, Aadhaar.
- Plaid `access_token` (always encrypted at rest; never log even masked).
- Full bank account or routing numbers.
- Any field tagged `[Sensitive]` in the domain model.

### Sensitive event marking
For an event that needs heightened audit (Sensitive PII read, admin action), use a structured event ID:
```csharp
_log.LogInformation("{eventId} ssn read for payroll filing for {employeeId}",
                    "PAYROLL_SSN_READ", employee.Id);
```
This routes to the audit-grade log stream with 7-year retention.

## See also (v2.0)
- `multi-region-tenant-context` — provides `ITenantContext` for the country-code enricher.
- `compliance-plugin-pattern` — keep plugin internals out of logs (no GSTIN/SSN even in plugin code).
- `nodatime-luxon-timezone` — `timestamp` is always `Instant` UTC ISO 8601.
- ULP_ObservabilitySRE_v2.0.docx — full schema + retention policy reference.
