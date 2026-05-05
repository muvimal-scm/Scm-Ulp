using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M5.Application;
using Ulp.M5.Domain.Entities;

namespace Ulp.M5.Api.Endpoints;

public static class ShipmentEndpoints
{
    public static IEndpointRouteBuilder MapShipmentEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m5/shipments").WithTags("M5 · Shipments").RequireAuthorization();

        g.MapGet("/", async (
            HttpContext httpCtx,
            [FromServices] IFreightService svc,
            [FromQuery] ShipmentStatus? status,
            [FromQuery] TransportMode? mode,
            [FromQuery] string? countryCode,
            // SCM Milestone 2 Control Tower filters:
            [FromQuery] TradeDirection? direction,
            [FromQuery] string? shipmentNumber,
            [FromQuery] string? mblNumber,
            [FromQuery] string? hblNumber,
            [FromQuery] string? containerNumber,
            [FromQuery] long? customerPartyId,
            [FromQuery] long? originPortId,
            [FromQuery] long? destinationPortId,
            [FromQuery] DateOnly? etaFrom,
            [FromQuery] DateOnly? etaTo,
            // SCM Milestone 1+2 watchlist:
            [FromQuery] bool? starredOnly,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            CancellationToken ct) =>
        {
            NodaTime.LocalDate? toLd(DateOnly? d) => d.HasValue ? new NodaTime.LocalDate(d.Value.Year, d.Value.Month, d.Value.Day) : null;
            var userSub = httpCtx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? httpCtx.User.FindFirstValue("sub");
            var q = new ShipmentListQuery(
                status, mode, countryCode,
                direction, shipmentNumber, mblNumber, hblNumber, containerNumber,
                customerPartyId, originPortId, destinationPortId,
                toLd(etaFrom), toLd(etaTo),
                starredOnly ?? false, userSub,
                page ?? 1, pageSize ?? 50);
            return Results.Ok(await svc.ListShipmentsAsync(q, ct));
        });

        // SCM Milestone 1+2 — watchlist
        g.MapPost("/{id:long}/star", async (long id, HttpContext httpCtx,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            var userSub = httpCtx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? httpCtx.User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userSub)) return Results.Unauthorized();
            try   { var added = await svc.StarShipmentAsync(id, userSub, ct);
                    return added ? Results.Ok(new { starred = true, alreadyStarred = false })
                                 : Results.Ok(new { starred = true, alreadyStarred = true }); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        g.MapDelete("/{id:long}/star", async (long id, HttpContext httpCtx,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            var userSub = httpCtx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? httpCtx.User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userSub)) return Results.Unauthorized();
            try   { var removed = await svc.UnstarShipmentAsync(id, userSub, ct);
                    return removed ? Results.NoContent() : Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        g.MapGet("/watchlist/ids", async (HttpContext httpCtx,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            var userSub = httpCtx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? httpCtx.User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userSub)) return Results.Unauthorized();
            return Results.Ok(await svc.ListWatchlistShipmentIdsAsync(userSub, ct));
        });

        g.MapGet("/{id:long}", async (long id,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            var d = await svc.GetShipmentAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        g.MapPost("/", async (
            [FromBody] CreateShipmentRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/m5/shipments/", await svc.CreateShipmentAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/status", async (long id,
            [FromBody] StatusBody body,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ChangeShipmentStatusAsync(id, body.NewStatus, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        g.MapGet("/{id:long}/containers", async (long id,
            [FromServices] IFreightService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListContainersAsync(id, ct)));

        g.MapPost("/{id:long}/containers", async (long id,
            [FromBody] CreateContainerRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m5/shipments/{id}/containers", await svc.AddContainerAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        g.MapGet("/{id:long}/milestones", async (long id,
            [FromServices] IFreightService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListMilestonesAsync(id, ct)));

        g.MapPost("/{id:long}/milestones", async (long id,
            [FromBody] CreateMilestoneRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m5/shipments/{id}/milestones", await svc.AddMilestoneAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        g.MapGet("/{id:long}/charges", async (long id,
            [FromServices] IFreightService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListChargesAsync(id, ct)));

        g.MapPost("/{id:long}/charges", async (long id,
            [FromBody] CreateChargeRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m5/shipments/{id}/charges", await svc.AddChargeAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        g.MapGet("/{id:long}/mbls", async (long id,
            [FromServices] IFreightService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListMblsAsync(id, ct)));

        g.MapPost("/{id:long}/mbls", async (long id,
            [FromBody] CreateMblRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m5/shipments/{id}/mbls", await svc.AddMblAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapGet("/{id:long}/awbs", async (long id,
            [FromServices] IFreightService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAwbsAsync(id, ct)));

        g.MapPost("/{id:long}/awbs", async (long id,
            [FromBody] CreateAwbRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m5/shipments/{id}/awbs", await svc.AddAwbAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        // SCM Milestone 1 — internal memo notes per shipment.
        g.MapGet("/{id:long}/memos", async (long id,
            [FromServices] IFreightService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListMemosAsync(id, ct)));

        g.MapPost("/{id:long}/memos", async (long id,
            [FromBody] AddMemoRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m5/shipments/{id}/memos", await svc.AddMemoAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        // SCM Milestone 1+2 — Holds.
        g.MapGet("/{id:long}/holds", async (long id,
            [FromQuery] bool? includeCleared,
            [FromServices] IFreightService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListHoldsAsync(id, includeCleared ?? false, ct)));

        g.MapPost("/{id:long}/holds", async (long id,
            [FromBody] PlaceHoldRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m5/shipments/{id}/holds", await svc.PlaceHoldAsync(id, req, raisedByUserId: null, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        g.MapPost("/holds/{holdId:long}/clear", async (long holdId,
            [FromBody] ClearHoldRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ClearHoldAsync(holdId, req, clearedByUserId: null, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        // SCM Milestone 1+2 — Reminders (per-shipment add + per-shipment list).
        g.MapPost("/{id:long}/reminders", async (long id,
            [FromBody] AddReminderRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m5/shipments/{id}/reminders", await svc.AddReminderAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        g.MapGet("/{id:long}/reminders", async (long id,
            [FromServices] IFreightService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListRemindersAsync(new ReminderListQuery(ShipmentId: id, PageSize: 100), ct)));

        return app;
    }

    public sealed record StatusBody(ShipmentStatus NewStatus);
}
