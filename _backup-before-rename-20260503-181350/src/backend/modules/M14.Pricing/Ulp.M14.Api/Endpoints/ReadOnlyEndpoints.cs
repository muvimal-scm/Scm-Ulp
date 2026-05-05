using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M14.Application;

namespace Ulp.M14.Api.Endpoints;

public static class ReadOnlyEndpoints
{
    public static IEndpointRouteBuilder MapM14ReadOnlyEndpoints(this IEndpointRouteBuilder app)
    {
        var s = app.MapGroup("/api/v1/m14/surcharges").WithTags("M14 · Surcharges").RequireAuthorization();
        s.MapGet("/", async ([FromServices] IPricingService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListSurchargesAsync(ct)));

        var c = app.MapGroup("/api/v1/m14/contracts").WithTags("M14 · Contracts").RequireAuthorization();
        c.MapGet("/", async ([FromServices] IPricingService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListContractsAsync(ct)));

        return app;
    }
}
