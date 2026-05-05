using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M5.Application;

namespace Ulp.M5.Api.Endpoints;

public static class ReadOnlyEndpoints
{
    public static IEndpointRouteBuilder MapReadOnlyEndpoints(this IEndpointRouteBuilder app)
    {
        var consols = app.MapGroup("/api/v1/m5/consols").WithTags("M5 · Consols").RequireAuthorization();
        consols.MapGet("/", async ([FromServices] IFreightService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListConsolsAsync(ct)));

        var demu = app.MapGroup("/api/v1/m5/demurrage").WithTags("M5 · Demurrage").RequireAuthorization();
        demu.MapGet("/", async (
            [FromServices] IFreightService svc,
            [FromQuery] long? containerId,
            CancellationToken ct) => Results.Ok(await svc.ListDemurrageAsync(containerId, ct)));

        return app;
    }
}
