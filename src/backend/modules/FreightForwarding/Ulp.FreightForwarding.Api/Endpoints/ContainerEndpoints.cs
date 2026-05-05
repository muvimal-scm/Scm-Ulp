using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.FreightForwarding.Application;
using Ulp.FreightForwarding.Domain.Entities;

namespace Ulp.FreightForwarding.Api.Endpoints;

public static class ContainerEndpoints
{
    public static IEndpointRouteBuilder MapContainerEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/freight-forwarding/containers").WithTags("M5 · Containers").RequireAuthorization();

        g.MapPost("/{id:long}/status", async (long id,
            [FromBody] StatusBody body,
            [FromServices] IFreightService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ChangeContainerStatusAsync(id, body.NewStatus, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        return app;
    }

    public sealed record StatusBody(ContainerStatus NewStatus);
}
