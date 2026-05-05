using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.PricingQuotation.Application;

namespace Ulp.PricingQuotation.Api.Endpoints;

public static class ReadOnlyEndpoints
{
    public static IEndpointRouteBuilder MapM14ReadOnlyEndpoints(this IEndpointRouteBuilder app)
    {
        var s = app.MapGroup("/api/v1/pricing-quotation/surcharges").WithTags("M14 Â· Surcharges").RequireAuthorization();
        s.MapGet("/", async ([FromServices] IPricingService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListSurchargesAsync(ct)));

        var c = app.MapGroup("/api/v1/pricing-quotation/contracts").WithTags("M14 Â· Contracts").RequireAuthorization();
        c.MapGet("/", async ([FromServices] IPricingService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListContractsAsync(ct)));

        return app;
    }
}
