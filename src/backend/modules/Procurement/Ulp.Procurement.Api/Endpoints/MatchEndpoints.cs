using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.Procurement.Application;

namespace Ulp.Procurement.Api.Endpoints;

public static class MatchEndpoints
{
    public static IEndpointRouteBuilder MapMatchEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/procurement/invoice-matches").WithTags("M7 · Invoice Matches").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] IProcurementService svc,
            [FromQuery] long? poId,
            CancellationToken ct) => Results.Ok(await svc.ListMatchesAsync(poId, ct)));

        g.MapPost("/", async (
            [FromBody] CreateMatchRequest req,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/procurement/invoice-matches/", await svc.RecordMatchAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        return app;
    }
}
