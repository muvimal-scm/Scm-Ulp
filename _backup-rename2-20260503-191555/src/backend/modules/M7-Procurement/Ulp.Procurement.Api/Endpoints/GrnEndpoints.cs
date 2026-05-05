using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.Procurement.Application;

namespace Ulp.Procurement.Api.Endpoints;

public static class GrnEndpoints
{
    public static IEndpointRouteBuilder MapGrnEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/procurement/grns").WithTags("M7 Â· Goods Receipts").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] IProcurementService svc,
            [FromQuery] long? poId,
            CancellationToken ct) => Results.Ok(await svc.ListGrnsAsync(poId, ct)));

        g.MapGet("/{id:long}", async (long id,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            var d = await svc.GetGrnAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        g.MapPost("/", async (
            [FromBody] CreateGrnRequest req,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/procurement/grns/", await svc.CreateGrnAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        return app;
    }
}
