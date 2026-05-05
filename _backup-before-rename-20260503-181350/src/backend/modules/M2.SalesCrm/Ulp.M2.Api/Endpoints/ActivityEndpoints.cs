using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M2.Application;
using Ulp.M2.Domain.Entities;

namespace Ulp.M2.Api.Endpoints;

public static class ActivityEndpoints
{
    public static IEndpointRouteBuilder MapActivityEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m2/activities").WithTags("M2 · Activities").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] ICrmService svc,
            [FromQuery] RelatedTo? relatedTo,
            [FromQuery] long? relatedId,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            CancellationToken ct) =>
            Results.Ok(await svc.ListActivitiesAsync(relatedTo, relatedId, page ?? 1, pageSize ?? 50, ct)));

        g.MapPost("/", async (
            [FromBody] CreateActivityRequest req,
            [FromServices] ICrmService svc, CancellationToken ct) =>
            Results.Created("/api/v1/m2/activities/", await svc.AddActivityAsync(req, ct)));

        return app;
    }
}
