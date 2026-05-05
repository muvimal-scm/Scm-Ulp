using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M6.Application;

namespace Ulp.M6.Api.Endpoints;

public static class RenderEndpoints
{
    public static IEndpointRouteBuilder MapRenderEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m6/render").WithTags("M6 · Render").RequireAuthorization();

        g.MapPost("/", async (
            [FromBody] RenderApiRequest req,
            [FromServices] IDocGenService svc, CancellationToken ct) =>
            Results.Ok(await svc.RenderAsync(req, ct)));

        g.MapGet("/requests", async (
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            [FromServices] IDocGenService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListRenderRequestsAsync(page ?? 1, pageSize ?? 50, ct)));

        return app;
    }
}
