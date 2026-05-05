using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.Notifications.Application;
using Ulp.Notifications.Domain.Entities;

namespace Ulp.Notifications.Api.Endpoints;

public static class RuleEndpoints
{
    public static IEndpointRouteBuilder MapRuleEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/notifications/rules").WithTags("M27 Â· Auto-notification rules").RequireAuthorization();

        g.MapGet("/", async ([FromServices] INotificationRuleService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListRulesAsync(ct)));

        g.MapGet("/{id:long}", async (long id, [FromServices] INotificationRuleService svc, CancellationToken ct) =>
        {
            var r = await svc.GetRuleAsync(id, ct);
            return r is null ? Results.NotFound() : Results.Ok(r);
        });

        g.MapPost("/{id:long}/run", async (long id,
            [FromServices] INotificationRuleService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.RunRuleAsync(id, RuleRunTrigger.Manual, null, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/toggle", async (long id, [FromBody] ToggleBody body,
            [FromServices] INotificationRuleService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ToggleRuleAsync(id, body.Enabled, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        g.MapGet("/{id:long}/runs", async (long id,
            [FromQuery] int? page, [FromQuery] int? pageSize,
            [FromServices] INotificationRuleService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListRunsAsync(id, page ?? 1, pageSize ?? 25, ct)));

        return app;
    }

    public sealed record ToggleBody(bool Enabled);
}
