---
name: multi-region-tenant-context
description: ULP v2.0 multi-region tenant context — country_code, region pinning, plugin DI resolution, ITenantContext. Use whenever code needs to know which country a tenant belongs to or which region they live in. Tenant.country_code is the SINGLE source of truth that drives connection strings, Key Vault selection, plugin DI resolution, and Front Door routing. Always resolve via ITenantContext; never hardcode country.
---

# Multi-Region Tenant Context for ULP v2.0

## When this skill triggers
Any code that needs the tenant's country, region, currency, timezone, or locale. Front Door routing, DB connection string selection, plugin DI resolution, log enrichment, audit logging, and any logic that varies by country.

## The contract

```csharp
public interface ITenantContext
{
    string TenantId      { get; }   // ULID
    string CountryCode   { get; }   // "IN" | "US" — ISO 3166-1 alpha-2
    string CurrencyCode  { get; }   // "INR" | "USD" — ISO 4217
    string Timezone      { get; }   // "Asia/Kolkata" | "America/New_York" — IANA
    string Locale        { get; }   // "en-IN" | "en-US" — BCP 47
    string Region        { get; }   // "centralindia" | "eastus2" — Azure region key
    Plan   Plan          { get; }   // tenant subscription tier
}
```

Resolution: per-request, derived from the JWT claim `tenant_id` looked up against the admin DB tenant table. Cached in `IMemoryCache` with 5-minute sliding TTL; invalidated on tenant update events.

## Standard middleware (mandatory at API boundary)

```csharp
app.Use(async (ctx, next) =>
{
    var tenantId = ctx.User.FindFirstValue("tenant_id")
        ?? throw new UnauthorizedAccessException("missing tenant claim");

    var lookup = ctx.RequestServices.GetRequiredService<ITenantLookup>();
    var tenantRecord = await lookup.GetAsync(tenantId, ctx.RequestAborted);

    // Reject if request hit the wrong region (HTTP 421 Misdirected Request)
    var hostRegion = ctx.RequestServices
        .GetRequiredService<IRegionResolver>().FromHost(ctx.Request.Host.Host);
    if (tenantRecord.Region != hostRegion)
    {
        ctx.Response.StatusCode = StatusCodes.Status421MisdirectedRequest;
        return;
    }

    var ctxImpl = ctx.RequestServices.GetRequiredService<TenantContextImpl>();
    ctxImpl.Set(tenantRecord);

    await next();
});
```

Register `ITenantContext` as `Scoped` so every service dependency in the request gets the same instance.

## Country code drives everything

| Concern | How country_code is used |
|---|---|
| Plugin DI | `services.GetRequiredKeyedService<ITaxProvider>(tenant.CountryCode)` |
| DB connection string | `connectionStrings[$"primary-{tenant.Region}"]` |
| Key Vault | `keyVaults[tenant.Region]` |
| Audit log enrichment | `LogContext.PushProperty("CountryCode", tenant.CountryCode)` |
| Money formatting | `tenant.CurrencyCode` from `tenant.CountryCode` |
| Schedule jobs in tenant TZ | `NodaTime.DateTimeZoneProviders.Tzdb[tenant.Timezone]` |
| Locale-aware UI | `Accept-Language` defaults to `tenant.Locale` |

## Region pinning rules (non-negotiable)

1. A tenant's primary data **never** moves to another region. Cross-region migration is a manual professional-services engagement (Tenant Lifecycle Runbook §9).
2. If a request arrives at the wrong region's Front Door, return **HTTP 421 Misdirected Request** with the correct host in the body.
3. Front Door routes by `tenant_id` claim → tenant-to-region lookup table updated on tenant create.
4. Workforce admin access from another region requires Conditional Access JIT elevation; never auto-allowed.

## Tenant lookup performance
- L1 cache: in-memory `IMemoryCache` (5-min sliding TTL).
- L2 cache: Redis (per-region) for cross-pod consistency.
- Source of truth: admin DB tenant table; subscribed via Service Bus event `tenant.updated` to invalidate caches.
- Target lookup latency: < 1 ms (cached) / < 20 ms (cold).

## Background jobs
Hangfire jobs running outside an HTTP request must restore tenant context manually:

```csharp
public class InvoicePostingJob(ITenantContextRestorer restorer, IInvoicePostingService svc)
{
    public async Task Run(string tenantId, string invoiceId, CancellationToken ct)
    {
        using var _ = await restorer.RestoreAsync(tenantId, ct); // sets ITenantContext for this scope
        await svc.PostAsync(invoiceId, ct);
    }
}
```

## DO and DON'T

| DO | DON'T |
|---|---|
| Always read country/currency/timezone from `ITenantContext` | Don't hardcode `"IN"` or `"INR"` in business logic |
| Resolve plugins via keyed DI keyed by `tenant.CountryCode` | Don't construct plugins manually |
| Reject misrouted requests with HTTP 421 | Don't silently serve a tenant from the wrong region |
| Invalidate caches on `tenant.updated` events | Don't cache tenant context with TTL > 5 min without invalidation |
| Pass `tenantId` explicitly into background jobs | Don't rely on `HttpContext.User` outside HTTP scope |
| Audit log every cross-region admin access | Don't allow it without JIT elevation |

## Common pitfalls
- Forgetting to register the resolver as `Scoped` — singletons leak tenant context across requests.
- Reading from `HttpContext.User` directly in a service — use `ITenantContext` instead so it works in jobs.
- Building connection strings at startup — they must be selected per request based on region.
- Using `DateTime.Now` for tenant-local time — use `NodaTime` with `tenant.Timezone`.

## See also
- `compliance-plugin-pattern` — the plugins that consume this context.
- `nodatime-luxon-timezone` — for tenant-local time handling.
- `money-type-multicurrency` — for using `tenant.CurrencyCode`.
- `keycloak-mvp-identity` — for the JWT issuance carrying `tenant_id`.
