using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NodaTime;
using Ulp.Trucking.Application;
using Ulp.Trucking.Domain.Entities;

namespace Ulp.Trucking.Api;

public static class TruckingEndpoints
{
    public static IEndpointRouteBuilder MapTruckingEndpoints(this IEndpointRouteBuilder app)
    {
        var base_ = "/api/v1/trucking";

        // ---- Drivers ----
        var drivers = app.MapGroup($"{base_}/drivers").WithTags("M10 · Drivers").RequireAuthorization();
        drivers.MapGet("/", async ([FromServices] ITruckingService svc, [FromQuery] DriverAvailability? availability, CancellationToken ct) =>
            Results.Ok(await svc.ListDriversAsync(availability, ct)));
        drivers.MapPost("/{id:long}/availability", async (long id, [FromBody] SetAvailabilityBody body, [FromServices] ITruckingService svc, CancellationToken ct) =>
        {
            try { return Results.Ok(await svc.SetDriverAvailabilityAsync(id, body.Availability, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        // ---- Trucks ----
        var trucks = app.MapGroup($"{base_}/trucks").WithTags("M10 · Trucks").RequireAuthorization();
        trucks.MapGet("/", async ([FromServices] ITruckingService svc, [FromQuery] TruckStatus? status, CancellationToken ct) =>
            Results.Ok(await svc.ListTrucksAsync(status, ct)));

        // ---- Chassis ----
        var chassis = app.MapGroup($"{base_}/chassis").WithTags("M10 · Chassis").RequireAuthorization();
        chassis.MapGet("/", async ([FromServices] ITruckingService svc, [FromQuery] ChassisStatus? status, CancellationToken ct) =>
            Results.Ok(await svc.ListChassisAsync(status, ct)));

        // ---- Maintenance ----
        var maint = app.MapGroup($"{base_}/maintenance").WithTags("M10 · Maintenance").RequireAuthorization();
        maint.MapGet("/", async ([FromServices] ITruckingService svc, [FromQuery] EquipmentKind? kind, [FromQuery] MaintStatus? status, CancellationToken ct) =>
            Results.Ok(await svc.ListMaintAsync(kind, status, ct)));

        // ---- Jobs ----
        var jobs = app.MapGroup($"{base_}/jobs").WithTags("M10 · Jobs").RequireAuthorization();
        jobs.MapGet("/", async ([FromServices] ITruckingService svc, [FromQuery] JobAvailabilityStatus? status, CancellationToken ct) =>
            Results.Ok(await svc.ListJobsAsync(status, ct)));
        jobs.MapGet("/{id:long}", async (long id, [FromServices] ITruckingService svc, CancellationToken ct) =>
        {
            var d = await svc.GetJobAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });
        jobs.MapPost("/{id:long}/advance-status", async (long id, [FromBody] AdvanceJobStatusRequest req, [FromServices] ITruckingService svc, CancellationToken ct) =>
        {
            try { return Results.Ok(await svc.AdvanceJobStatusAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });
        jobs.MapPost("/{id:long}/assign-dispatch", async (long id, [FromBody] AssignDispatchRequest req, [FromServices] ITruckingService svc, CancellationToken ct) =>
        {
            try { return Results.Ok(await svc.AssignDispatchAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });
        jobs.MapGet("/{id:long}/accessorials", async (long id, [FromServices] ITruckingService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListJobAccessorialsAsync(id, ct)));
        jobs.MapPost("/{id:long}/accessorials", async (long id, [FromBody] AddAccessorialRequest req, [FromServices] ITruckingService svc, CancellationToken ct) =>
            Results.Created("", await svc.AddJobAccessorialAsync(id, req, ct)));
        jobs.MapPost("/{id:long}/pod", async (long id, [FromBody] UploadPodRequest req, [FromServices] ITruckingService svc, CancellationToken ct) =>
            Results.Created("", await svc.UploadPodAsync(id, req, ct)));

        // ---- Accessorial master ----
        var acc = app.MapGroup($"{base_}/accessorials").WithTags("M10 · Accessorial Master").RequireAuthorization();
        acc.MapGet("/", async ([FromServices] ITruckingService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAccessorialsAsync(ct)));

        // ---- Appointments ----
        var appts = app.MapGroup($"{base_}/appointments").WithTags("M10 · Appointments").RequireAuthorization();
        appts.MapGet("/", async ([FromServices] ITruckingService svc,
            [FromQuery] string? from, [FromQuery] string? to, CancellationToken ct) =>
        {
            LocalDate? f = from is null ? null : LocalDate.FromDateTime(DateTime.Parse(from));
            LocalDate? t = to   is null ? null : LocalDate.FromDateTime(DateTime.Parse(to));
            return Results.Ok(await svc.ListAppointmentsAsync(f, t, ct));
        });

        // ---- Dispatch board (calendar feed) ----
        var board = app.MapGroup($"{base_}/dispatch-board").WithTags("M10 · Dispatch Board").RequireAuthorization();
        board.MapGet("/", async ([FromServices] ITruckingService svc, [FromQuery] string? day, CancellationToken ct) =>
        {
            LocalDate? d = day is null ? null : LocalDate.FromDateTime(DateTime.Parse(day));
            return Results.Ok(await svc.DispatchBoardAsync(d, ct));
        });

        return app;
    }

    public sealed record SetAvailabilityBody(DriverAvailability Availability);
}
