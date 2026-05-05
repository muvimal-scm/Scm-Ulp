using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.VendorManagement.Application;

namespace Ulp.VendorManagement.Api.Endpoints;

public static class NcrEndpoints
{
    public static IEndpointRouteBuilder MapNcrEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/vendor-management/ncrs").WithTags("M3 · NCRs").RequireAuthorization();

        g.MapPost("/", async (
            [FromBody] RaiseNcrRequest req,
            [FromServices] IVendorService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/vendor-management/ncrs/", await svc.RaiseNcrAsync(req, ct)); }
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
