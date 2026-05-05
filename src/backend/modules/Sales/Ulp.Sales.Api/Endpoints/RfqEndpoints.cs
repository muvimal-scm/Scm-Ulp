using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.Sales.Application;

namespace Ulp.Sales.Api.Endpoints;

public static class RfqEndpoints
{
    public static IEndpointRouteBuilder MapRfqEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/sales/rfqs").WithTags("M2 · RFQs").RequireAuthorization();

        g.MapGet("/", async ([FromServices] ICrmService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListRfqsAsync(ct)));

        g.MapGet("/{id:long}", async (long id,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            var r = await svc.GetRfqAsync(id, ct);
            return r is null ? Results.NotFound() : Results.Ok(r);
        });

        g.MapPost("/", async (
            [FromBody] CreateRfqRequest req,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/sales/rfqs/", await svc.CreateRfqAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/lines", async (long id,
            [FromBody] CreateRfqLineRequest req,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/sales/rfqs/{id}/lines", await svc.AddRfqLineAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/responses", async (long id,
            [FromBody] CreateRfqResponseRequest req,
            [FromServices] ICrmService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/sales/rfqs/{id}/responses", await svc.AddRfqResponseAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        return app;
    }
}
