using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.FreightForwarding.Application;
using Ulp.FreightForwarding.Domain.Entities;

namespace Ulp.FreightForwarding.Api.Endpoints;

public static class BookingEndpoints
{
    public static IEndpointRouteBuilder MapBookingEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/freight-forwarding/bookings").WithTags("M5 Â· Bookings").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] IFreightService svc,
            [FromQuery] BookingStatus? status,
            [FromQuery] long? customerPartyId,
            [FromQuery] TransportMode? mode,
            [FromQuery] string? countryCode,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            CancellationToken ct) =>
        {
            var q = new BookingListQuery(status, customerPartyId, mode, countryCode, page ?? 1, pageSize ?? 50);
            return Results.Ok(await svc.ListBookingsAsync(q, ct));
        });

        g.MapGet("/{id:long}", async (long id,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            var d = await svc.GetBookingAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        g.MapPost("/", async (
            [FromBody] CreateBookingRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/freight-forwarding/bookings/", await svc.CreateBookingAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/status", async (long id,
            [FromBody] StatusBody body,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ChangeBookingStatusAsync(id, body.NewStatus, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        g.MapPost("/{id:long}/lines", async (long id,
            [FromBody] CreateBookingLineRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/freight-forwarding/bookings/{id}/lines", await svc.AddBookingLineAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        return app;
    }

    public sealed record StatusBody(BookingStatus NewStatus);
}
