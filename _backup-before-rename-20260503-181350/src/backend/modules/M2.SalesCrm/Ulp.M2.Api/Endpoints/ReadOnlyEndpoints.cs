using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M2.Application;

namespace Ulp.M2.Api.Endpoints;

public static class ReadOnlyEndpoints
{
    public static IEndpointRouteBuilder MapReadOnlyEndpoints(this IEndpointRouteBuilder app)
    {
        var stages = app.MapGroup("/api/v1/m2/pipeline-stages").WithTags("M2 · Pipeline").RequireAuthorization();
        stages.MapGet("/", async ([FromServices] ICrmService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListPipelineStagesAsync(ct)));

        var fc = app.MapGroup("/api/v1/m2/forecasts").WithTags("M2 · Forecasts").RequireAuthorization();
        fc.MapGet("/", async (
            [FromServices] ICrmService svc,
            [FromQuery] string? period,
            CancellationToken ct) => Results.Ok(await svc.ListForecastsAsync(period, ct)));

        return app;
    }
}
