using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.Procurement.Application;

namespace Ulp.Procurement.Api.Endpoints;

public static class RfqEndpoints
{
    public static IEndpointRouteBuilder MapRfqEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/procurement/rfqs").WithTags("M7 · RFQs").RequireAuthorization();

        g.MapGet("/", async ([FromServices] IProcurementService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListRfqsAsync(ct)));

        g.MapGet("/{id:long}", async (long id,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            var d = await svc.GetRfqAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        g.MapPost("/", async (
            [FromBody] CreateRfqRequest req,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/procurement/rfqs/", await svc.CreateRfqAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/recipients", async (long id,
            [FromBody] RecipientBody body,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/procurement/rfqs/{id}/recipients", await svc.AddRfqRecipientAsync(id, body.VendorPartyId, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/responses", async (long id,
            [FromBody] CreateRfqResponseRequest req,
            [FromServices] IProcurementService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/procurement/rfqs/{id}/responses", await svc.AddRfqResponseAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        return app;
    }

    public sealed record RecipientBody(long VendorPartyId);
}
