using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M7.Application;
using Ulp.M7.Domain.Entities;

namespace Ulp.M7.Api.Endpoints;

public static class PoEndpoints
{
    public static IEndpointRouteBuilder MapPoEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m7/purchase-orders").WithTags("M7 · Purchase Orders").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] IProcurementService svc,
            [FromQuery] PoStatus? status,
            [FromQuery] long? vendorPartyId,
            [FromQuery] string? countryCode,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            CancellationToken ct) =>
            Results.Ok(await svc.ListPosAsync(new PoListQuery(status, vendorPartyId, countryCode, page ?? 1, pageSize ?? 50), ct)));

        g.MapGet("/{id:long}", async (long id,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            var d = await svc.GetPoAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        g.MapPost("/", async (
            [FromBody] CreatePoRequest req,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/m7/purchase-orders/", await svc.CreatePoAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/status", async (long id,
            [FromBody] StatusBody body,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ChangePoStatusAsync(id, body.NewStatus, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        g.MapPost("/{id:long}/lines", async (long id,
            [FromBody] CreatePoLineRequest req,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m7/purchase-orders/{id}/lines", await svc.AddPoLineAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        return app;
    }

    public sealed record StatusBody(PoStatus NewStatus);
}
