using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M7.Application;
using Ulp.M7.Domain.Entities;

namespace Ulp.M7.Api.Endpoints;

public static class PrEndpoints
{
    public static IEndpointRouteBuilder MapPrEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m7/purchase-requests").WithTags("M7 · Purchase Requests").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] IProcurementService svc,
            [FromQuery] PrStatus? status,
            [FromQuery] string? countryCode,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            CancellationToken ct) =>
            Results.Ok(await svc.ListPrsAsync(new PrListQuery(status, countryCode, page ?? 1, pageSize ?? 50), ct)));

        g.MapGet("/{id:long}", async (long id,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            var d = await svc.GetPrAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        g.MapPost("/", async (
            [FromBody] CreatePrRequest req,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/m7/purchase-requests/", await svc.CreatePrAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/status", async (long id,
            [FromBody] StatusBody body,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ChangePrStatusAsync(id, body.NewStatus, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        g.MapPost("/{id:long}/lines", async (long id,
            [FromBody] CreatePrLineRequest req,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m7/purchase-requests/{id}/lines", await svc.AddPrLineAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        return app;
    }

    public sealed record StatusBody(PrStatus NewStatus);
}
