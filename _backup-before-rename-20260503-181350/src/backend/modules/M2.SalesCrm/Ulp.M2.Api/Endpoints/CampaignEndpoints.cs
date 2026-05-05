using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M2.Application;
using Ulp.M2.Domain.Entities;

namespace Ulp.M2.Api.Endpoints;

public static class CampaignEndpoints
{
    public static IEndpointRouteBuilder MapCampaignEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m2/campaigns").WithTags("M2 · Campaigns").RequireAuthorization();

        g.MapGet("/", async ([FromServices] ICrmService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListCampaignsAsync(ct)));

        g.MapPost("/", async (
            [FromBody] CreateCampaignRequest req,
            [FromServices] ICrmService svc, CancellationToken ct) =>
            Results.Created("/api/v1/m2/campaigns/", await svc.CreateCampaignAsync(req, ct)));

        g.MapPost("/{id:long}/status", async (long id,
            [FromBody] StatusBody body,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ChangeCampaignStatusAsync(id, body.NewStatus, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        return app;
    }

    public sealed record StatusBody(CampaignStatus NewStatus);
}
