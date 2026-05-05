using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M26.Infrastructure.Tenancy;
using Ulp.M27.Application;

namespace Ulp.M27.Api.Endpoints;

public static class PreferenceEndpoints
{
    public static IEndpointRouteBuilder MapPreferenceEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m27/preferences").WithTags("M27 · Preferences").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] INotificationService svc,
            [FromServices] TenantContextHolder holder,
            CancellationToken ct) =>
        {
            if (holder.UserId is null) return Results.Unauthorized();
            return Results.Ok(await svc.GetPreferencesAsync(holder.UserId.Value, ct));
        });

        g.MapPut("/", async (
            [FromBody] PreferenceDto pref,
            [FromServices] INotificationService svc,
            [FromServices] TenantContextHolder holder,
            CancellationToken ct) =>
        {
            if (holder.UserId is null) return Results.Unauthorized();
            await svc.UpsertPreferenceAsync(holder.UserId.Value, pref, ct);
            return Results.NoContent();
        });

        return app;
    }
}
