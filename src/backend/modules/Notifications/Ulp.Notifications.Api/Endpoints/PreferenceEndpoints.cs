using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.Identity.Infrastructure.Tenancy;
using Ulp.Notifications.Application;

namespace Ulp.Notifications.Api.Endpoints;

public static class PreferenceEndpoints
{
    public static IEndpointRouteBuilder MapPreferenceEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/notifications/preferences").WithTags("M27 · Preferences").RequireAuthorization();

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
