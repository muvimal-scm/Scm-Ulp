using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.DocumentGeneration.Application;

namespace Ulp.DocumentGeneration.Api.Endpoints;

public static class RenderEndpoints
{
    public static IEndpointRouteBuilder MapRenderEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/document-generation/render").WithTags("M6 Â· Render").RequireAuthorization();

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
