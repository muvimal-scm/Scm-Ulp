using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.Sales.Application;
using Ulp.Sales.Domain.Entities;

namespace Ulp.Sales.Api.Endpoints;

public static class LeadEndpoints
{
    public static IEndpointRouteBuilder MapLeadEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/sales/leads").WithTags("M2 · Leads").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] ICrmService svc,
            [FromQuery] LeadStage? stage,
            [FromQuery] LeadSource? source,
            [FromQuery] string? countryCode,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            CancellationToken ct) =>
        {
            var q = new LeadListQuery(stage, source, countryCode, page ?? 1, pageSize ?? 50);
            return Results.Ok(await svc.ListLeadsAsync(q, ct));
        });

        g.MapGet("/{id:long}", async (long id,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            var l = await svc.GetLeadAsync(id, ct);
            return l is null ? Results.NotFound() : Results.Ok(l);
        });

        g.MapPost("/", async (
            [FromBody] CreateLeadRequest req,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/sales/leads/", await svc.CreateLeadAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/stage", async (long id,
            [FromBody] StageBody body,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ChangeLeadStageAsync(id, body.NewStage, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        g.MapPut("/{id:long}", async (long id,
            [FromBody] UpdateLeadRequest req,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.UpdateLeadAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        g.MapDelete("/{id:long}", async (long id,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try
            {
                var deleted = await svc.DeleteLeadAsync(id, ct);
                return deleted ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        return app;
    }

    public sealed record StageBody(LeadStage NewStage);
}
