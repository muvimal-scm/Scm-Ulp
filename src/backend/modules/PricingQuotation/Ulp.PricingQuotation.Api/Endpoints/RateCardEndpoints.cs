using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.PricingQuotation.Application;
using Ulp.PricingQuotation.Domain.Entities;

namespace Ulp.PricingQuotation.Api.Endpoints;

public static class RateCardEndpoints
{
    public static IEndpointRouteBuilder MapRateCardEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/pricing-quotation/rate-cards").WithTags("M14 · Rate Cards").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] IPricingService svc,
            [FromQuery] RateCardStatus? status,
            [FromQuery] RateCardType? cardType,
            [FromQuery] string? countryCode,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            CancellationToken ct) =>
        {
            var q = new RateCardListQuery(status, cardType, countryCode, page ?? 1, pageSize ?? 50);
            return Results.Ok(await svc.ListRateCardsAsync(q, ct));
        });

        g.MapGet("/{id:long}", async (long id,
            [FromServices] IPricingService svc, CancellationToken ct) =>
        {
            var c = await svc.GetRateCardAsync(id, ct);
            return c is null ? Results.NotFound() : Results.Ok(c);
        });

        g.MapPost("/", async (
            [FromBody] CreateRateCardRequest req,
            [FromServices] IPricingService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/pricing-quotation/rate-cards/", await svc.CreateRateCardAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/approve", async (long id,
            [FromServices] IPricingService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ApproveRateCardAsync(id, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        g.MapGet("/{id:long}/lines", async (long id,
            [FromServices] IPricingService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetRateCardLinesAsync(id, ct)));

        g.MapPost("/{id:long}/lines", async (long id,
            [FromBody] CreateRateCardLineRequest req,
            [FromServices] IPricingService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/pricing-quotation/rate-cards/{id}/lines", await svc.AddRateCardLineAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        return app;
    }
}
