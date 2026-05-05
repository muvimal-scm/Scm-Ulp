using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.FreightForwarding.Application;

namespace Ulp.FreightForwarding.Api.Endpoints;

public static class HblEndpoints
{
    public static IEndpointRouteBuilder MapHblEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/freight-forwarding/hbls").WithTags("M5 Â· HBLs").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] IFreightService svc,
            [FromQuery] long? mblId,
            CancellationToken ct) => Results.Ok(await svc.ListHblsAsync(mblId, ct)));

        g.MapPost("/", async (
            [FromBody] CreateHblRequest req,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/freight-forwarding/hbls/", await svc.AddHblAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        return app;
    }
}
