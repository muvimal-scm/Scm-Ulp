using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NodaTime;
using Ulp.FreightForwarding.Application;
using Ulp.FreightForwarding.Domain.Entities;

namespace Ulp.FreightForwarding.Api.Endpoints;

/// <summary>
/// SCM Milestone 1+2 — global reminders endpoints.
/// Per-shipment add + list live on ShipmentEndpoints; this group is the
/// cross-shipment list page + the on-demand "fire due reminders" trigger.
/// </summary>
public static class ReminderEndpoints
{
    public static IEndpointRouteBuilder MapReminderEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/freight-forwarding/reminders").WithTags("M5 · Reminders").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] IFreightService svc,
            [FromQuery] ReminderStatus? status,
            [FromQuery] bool? dueNow,
            [FromQuery] string? assignedUserSub,
            [FromQuery] int? page, [FromQuery] int? pageSize,
            CancellationToken ct) =>
            Results.Ok(await svc.ListRemindersAsync(
                new ReminderListQuery(
                    ShipmentId: null,
                    Status: status,
                    DueNow: dueNow ?? false,
                    AssignedUserSub: assignedUserSub,
                    Page: page ?? 1, PageSize: pageSize ?? 100),
                ct)));

        g.MapPost("/{id:long}/status", async (long id,
            [FromBody] ChangeReminderStatusBody body,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ChangeReminderStatusAsync(id, body.NewStatus, body.SnoozeUntilUtc, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        // Phase-1 on-demand "fire due reminders" — same handler that Hangfire
        // will call on a schedule in Phase 5. No code change needed when scheduler lands.
        g.MapPost("/run-due", async ([FromServices] IFreightService svc, CancellationToken ct) =>
            Results.Ok(await svc.RunDueRemindersAsync(ct)));

        return app;
    }

    public sealed record ChangeReminderStatusBody(ReminderStatus NewStatus, Instant? SnoozeUntilUtc = null);
}
