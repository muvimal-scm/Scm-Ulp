using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M3.Application;

namespace Ulp.M3.Api.Endpoints;

public static class NcrEndpoints
{
    public static IEndpointRouteBuilder MapNcrEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m3/ncrs").WithTags("M3 · NCRs").RequireAuthorization();

        g.MapPost("/", async (
            [FromBody] RaiseNcrRequest req,
            [FromServices] IVendorService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/m3/ncrs/", await svc.RaiseNcrAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPut("/{id:long}", async (long id,
            [FromBody] UpdateNcrRequest req,
            [FromServices] IVendorService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.UpdateNcrAsync(id, req, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        return app;
    }
}
