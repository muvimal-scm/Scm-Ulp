using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.MasterData.Application.Profiles;

namespace Ulp.MasterData.Api.Endpoints;

/// <summary>
/// SCM Milestone 1 — Profiles &amp; Settings extensions.
/// One bundle GET to load the Profile Detail panel; three POSTs to add new
/// records of each kind. No PUT/DELETE for now (out of milestone scope).
/// </summary>
public static class ProfileExtensionsEndpoints
{
    public static IEndpointRouteBuilder MapProfileExtensionsEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/master-data/parties/{partyId:long}").WithTags("M1 · Profile Extensions").RequireAuthorization();

        g.MapGet("/profile-extensions", async (
            long partyId,
            [FromServices] IProfileExtensionsRepository repo,
            CancellationToken ct) => Results.Ok(await repo.GetBundleAsync(partyId, ct)));

        g.MapPost("/poas", async (
            long partyId,
            [FromBody] AddPoaRequest req,
            [FromServices] IProfileExtensionsRepository repo,
            CancellationToken ct) =>
            Results.Created($"/api/v1/master-data/parties/{partyId}/poas", await repo.AddPoaAsync(partyId, req, ct)));

        g.MapPost("/permits", async (
            long partyId,
            [FromBody] AddPermitRequest req,
            [FromServices] IProfileExtensionsRepository repo,
            CancellationToken ct) =>
            Results.Created($"/api/v1/master-data/parties/{partyId}/permits", await repo.AddPermitAsync(partyId, req, ct)));

        g.MapPost("/misc-docs", async (
            long partyId,
            [FromBody] AddMiscDocRequest req,
            [FromServices] IProfileExtensionsRepository repo,
            CancellationToken ct) =>
            Results.Created($"/api/v1/master-data/parties/{partyId}/misc-docs", await repo.AddMiscDocAsync(partyId, req, ct)));

        return app;
    }
}
