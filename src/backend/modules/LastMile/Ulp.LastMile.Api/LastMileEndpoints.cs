using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.LastMile.Application;
using Ulp.LastMile.Domain.Entities;

namespace Ulp.LastMile.Api;

public static class LastMileEndpoints
{
    public static IEndpointRouteBuilder MapLastMileEndpoints(this IEndpointRouteBuilder app)
    {
        var bookings = app.MapGroup("/api/v1/last-mile/bookings").WithTags("M9 · Courier Bookings").RequireAuthorization();
        bookings.MapGet("/", async (
            [FromServices] ILastMileService svc,
            [FromQuery] CourierBookingStatus? status,
            [FromQuery] CourierType? courierType,
            [FromQuery] string? countryCode,
            [FromQuery] int? page, [FromQuery] int? pageSize,
            CancellationToken ct) =>
            Results.Ok(await svc.ListBookingsAsync(new CourierBookingListQuery(status, courierType, countryCode, page ?? 1, pageSize ?? 50), ct)));
        bookings.MapGet("/{id:long}", async (long id, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            var d = await svc.GetBookingAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });
        bookings.MapPost("/", async ([FromBody] CreateCourierBookingRequest req, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/last-mile/bookings/", await svc.CreateBookingAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });
        bookings.MapPost("/{id:long}/status", async (long id, [FromBody] BookingStatusBody body, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ChangeBookingStatusAsync(id, body.NewStatus, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        var routes = app.MapGroup("/api/v1/last-mile/routes").WithTags("M9 · Routes").RequireAuthorization();
        routes.MapGet("/", async ([FromServices] ILastMileService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListRoutesAsync(ct)));
        routes.MapGet("/{id:long}", async (long id, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            var d = await svc.GetRouteAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });
        routes.MapPost("/", async ([FromBody] CreateRouteRequest req, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/last-mile/routes/", await svc.CreateRouteAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        var manifests = app.MapGroup("/api/v1/last-mile/manifests").WithTags("M9 · Manifests").RequireAuthorization();
        manifests.MapGet("/", async ([FromServices] ILastMileService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListManifestsAsync(ct)));

        var pods = app.MapGroup("/api/v1/last-mile/pods").WithTags("M9 · POD").RequireAuthorization();
        pods.MapGet("/", async ([FromServices] ILastMileService svc, [FromQuery] long? bookingId, CancellationToken ct) =>
            Results.Ok(await svc.ListPodsAsync(bookingId, ct)));
        pods.MapPost("/", async ([FromBody] CreatePodRequest req, [FromServices] ILastMileService svc, CancellationToken ct) =>
            Results.Created("/api/v1/last-mile/pods/", await svc.RecordPodAsync(req, ct)));

        var cods = app.MapGroup("/api/v1/last-mile/cod").WithTags("M9 · COD").RequireAuthorization();
        cods.MapGet("/", async ([FromServices] ILastMileService svc, [FromQuery] CodSettledStatus? status, CancellationToken ct) =>
            Results.Ok(await svc.ListCodAsync(status, ct)));
        cods.MapPost("/", async ([FromBody] CreateCodRequest req, [FromServices] ILastMileService svc, CancellationToken ct) =>
            Results.Created("/api/v1/last-mile/cod/", await svc.RecordCodAsync(req, ct)));

        var attempts = app.MapGroup("/api/v1/last-mile/attempts").WithTags("M9 · Attempts").RequireAuthorization();
        attempts.MapGet("/", async ([FromServices] ILastMileService svc, [FromQuery] long bookingId, CancellationToken ct) =>
            Results.Ok(await svc.ListAttemptsAsync(bookingId, ct)));
        attempts.MapPost("/", async ([FromBody] CreateAttemptRequest req, [FromServices] ILastMileService svc, CancellationToken ct) =>
            Results.Created("/api/v1/last-mile/attempts/", await svc.RecordAttemptAsync(req, ct)));

        var zones = app.MapGroup("/api/v1/last-mile/zone-rates").WithTags("M9 · Zone Rates").RequireAuthorization();
        zones.MapGet("/", async (
            [FromServices] ILastMileService svc,
            [FromQuery] string? countryCode,
            [FromQuery] CourierType? courierType,
            CancellationToken ct) =>
            Results.Ok(await svc.ListZoneRatesAsync(countryCode, courierType, ct)));

        /* Ocean Drayage */
        var odJobs = app.MapGroup("/api/v1/last-mile/ocean-drayage").WithTags("M9 · Ocean Drayage").RequireAuthorization();
        odJobs.MapGet("/", async ([FromServices] ILastMileService svc, [FromQuery] OdStatus? status, CancellationToken ct) =>
            Results.Ok(await svc.ListOdJobsAsync(status, ct)));
        odJobs.MapGet("/{id:long}", async (long id, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            var d = await svc.GetOdJobAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });
        odJobs.MapPost("/", async ([FromBody] CreateOdJobRequest req, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            try { return Results.Created("", await svc.CreateOdJobAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });
        odJobs.MapPut("/{id:long}", async (long id, [FromBody] UpdateOdJobRequest req, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            try { return Results.Ok(await svc.UpdateOdJobAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });
        odJobs.MapDelete("/{id:long}", async (long id, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            try { await svc.DeleteOdJobAsync(id, ct); return Results.NoContent(); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        /* Over-The-Road */
        var otrJobs = app.MapGroup("/api/v1/last-mile/otr").WithTags("M9 · Over-The-Road").RequireAuthorization();
        otrJobs.MapGet("/", async ([FromServices] ILastMileService svc, [FromQuery] OtrStatus? status, CancellationToken ct) =>
            Results.Ok(await svc.ListOtrJobsAsync(status, ct)));
        otrJobs.MapGet("/{id:long}", async (long id, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            var d = await svc.GetOtrJobAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });
        otrJobs.MapPost("/", async ([FromBody] CreateOtrJobRequest req, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            try { return Results.Created("", await svc.CreateOtrJobAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });
        otrJobs.MapPut("/{id:long}", async (long id, [FromBody] UpdateOtrJobRequest req, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            try { return Results.Ok(await svc.UpdateOtrJobAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });
        otrJobs.MapDelete("/{id:long}", async (long id, [FromServices] ILastMileService svc, CancellationToken ct) =>
        {
            try { await svc.DeleteOtrJobAsync(id, ct); return Results.NoContent(); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        return app;
    }

    public sealed record BookingStatusBody(CourierBookingStatus NewStatus);
}
