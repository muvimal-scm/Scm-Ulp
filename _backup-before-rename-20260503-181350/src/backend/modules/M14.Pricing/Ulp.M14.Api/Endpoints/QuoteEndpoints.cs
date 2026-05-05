using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M14.Application;
using Ulp.M14.Domain.Entities;

namespace Ulp.M14.Api.Endpoints;

public static class QuoteEndpoints
{
    public static IEndpointRouteBuilder MapQuoteEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m14/quotes").WithTags("M14 · Quotes").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] IPricingService svc,
            [FromQuery] QuoteStatus? status,
            [FromQuery] long? customerPartyId,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            CancellationToken ct) =>
        {
            var q = new QuoteListQuery(status, customerPartyId, page ?? 1, pageSize ?? 50);
            return Results.Ok(await svc.ListQuotesAsync(q, ct));
        });

        g.MapGet("/{id:long}", async (long id,
            [FromServices] IPricingService svc, CancellationToken ct) =>
        {
            var q = await svc.GetQuoteAsync(id, ct);
            return q is null ? Results.NotFound() : Results.Ok(q);
        });

        g.MapPost("/", async (
            [FromBody] CreateQuoteRequest req,
            [FromServices] IPricingService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m14/quotes/", await svc.CreateQuoteAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapGet("/{id:long}/lines", async (long id,
            [FromServices] IPricingService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetQuoteLinesAsync(id, ct)));

        g.MapPost("/{id:long}/lines", async (long id,
            [FromBody] CreateQuoteLineRequest req,
            [FromServices] IPricingService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m14/quotes/{id}/lines", await svc.AddQuoteLineAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/status", async (long id,
            [FromBody] ChangeStatusRequest req,
            [FromServices] IPricingService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ChangeQuoteStatusAsync(id, req.NewStatus, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        return app;
    }
}

public sealed record ChangeStatusRequest(QuoteStatus NewStatus);
