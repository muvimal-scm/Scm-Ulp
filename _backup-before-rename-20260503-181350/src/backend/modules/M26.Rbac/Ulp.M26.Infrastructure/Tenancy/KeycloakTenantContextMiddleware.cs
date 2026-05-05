using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using NodaTime;
using Ulp.M26.Application;

namespace Ulp.M26.Infrastructure.Tenancy;

/// <summary>
/// Per LLD §5: extract tenant_id from JWT, look up the tenant record, verify the
/// region matches the current host, write the result into the per-request holder.
/// On region mismatch, emit HTTP 421 with a Location header (handled by the host
/// using IRegionResolver — Phase 1 dev defers this to a single-region setup).
/// </summary>
public sealed class KeycloakTenantContextMiddleware(
    RequestDelegate next,
    ILogger<KeycloakTenantContextMiddleware> log)
{
    private static readonly HashSet<string> AnonymousPrefixes = new(StringComparer.Ordinal)
    {
        "/health", "/whoami", "/swagger", "/_framework", "/favicon.ico"
    };

    public async Task InvokeAsync(
        HttpContext ctx,
        TenantContextHolder holder,
        ITenantLookup tenants,
        IUserLookup users,
        IClock clock)
    {
        var path = ctx.Request.Path.Value ?? "";
        if (AnonymousPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await next(ctx);
            return;
        }

        var user = ctx.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            await next(ctx);     // Authorization layer will reject if the endpoint requires it
            return;
        }

        var tenantClaim  = user.FindFirst("tenant_id")?.Value;
        var countryClaim = user.FindFirst("country_code")?.Value ?? "";
        var sub          = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? user.FindFirst("sub")?.Value;

        if (!int.TryParse(tenantClaim, out var tenantId))
        {
            log.LogWarning("Authenticated request without parseable tenant_id claim (sub={Sub})", sub);
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            await ctx.Response.WriteAsync("tenant_id claim missing or invalid");
            return;
        }

        var tenant = await tenants.GetAsync(tenantId, ctx.RequestAborted);
        if (tenant is null)
        {
            log.LogWarning("Tenant {TenantId} not found from JWT (sub={Sub})", tenantId, sub);
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            await ctx.Response.WriteAsync("tenant not found");
            return;
        }

        if (!string.IsNullOrEmpty(countryClaim) &&
            !string.Equals(tenant.CountryCode, countryClaim, StringComparison.OrdinalIgnoreCase))
        {
            log.LogWarning("Tenant {TenantId} country={Tenant} but JWT claim={Claim}",
                tenantId, tenant.CountryCode, countryClaim);
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            await ctx.Response.WriteAsync("country claim does not match tenant");
            return;
        }

        // Map sub → local user id (and record the login on first hit).
        long? userId = null;
        if (!string.IsNullOrEmpty(sub))
        {
            var localUser = await users.GetBySubjectAsync(sub, ctx.RequestAborted);
            if (localUser is not null)
            {
                userId = localUser.Id;
                if (localUser.LastLoginAt is null
                    || (clock.GetCurrentInstant() - localUser.LastLoginAt.Value).TotalMinutes > 5)
                {
                    var ip = ctx.Connection.RemoteIpAddress?.ToString();
                    _ = users.RecordLoginAsync(localUser.Id, clock.GetCurrentInstant(), ip, ctx.RequestAborted);
                }
            }
        }

        holder.Set(tenant, userId, sub);
        await next(ctx);
    }
}
