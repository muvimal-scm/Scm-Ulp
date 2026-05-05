using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.Sales.Application;
using Ulp.Sales.Domain.Entities;

namespace Ulp.Sales.Api.Endpoints;

public static class OpportunityEndpoints
{
    public static IEndpointRouteBuilder MapOpportunityEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/sales/opportunities").WithTags("M2 · Opportunities").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] ICrmService svc,
            [FromQuery] OppStage? stage,
            [FromQuery] long? partyId,
            [FromQuery] string? countryCode,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            CancellationToken ct) =>
        {
            var q = new OpportunityListQuery(stage, partyId, countryCode, page ?? 1, pageSize ?? 50);
            return Results.Ok(await svc.ListOpportunitiesAsync(q, ct));
        });

        g.MapGet("/{id:long}", async (long id,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            var o = await svc.GetOpportunityAsync(id, ct);
            return o is null ? Results.NotFound() : Results.Ok(o);
        });

        g.MapPost("/", async (
            [FromBody] CreateOpportunityRequest req,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/sales/opportunities/", await svc.CreateOpportunityAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/stage", async (long id,
            [FromBody] StageBody body,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ChangeOpportunityStageAsync(id, body.NewStage, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        g.MapPut("/{id:long}", async (long id,
            [FromBody] UpdateOpportunityRequest req,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.UpdateOpportunityAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        g.MapDelete("/{id:long}", async (long id,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try
            {
                var deleted = await svc.DeleteOpportunityAsync(id, ct);
                return deleted ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        return app;
    }

    public sealed record StageBody(OppStage NewStage);
}
