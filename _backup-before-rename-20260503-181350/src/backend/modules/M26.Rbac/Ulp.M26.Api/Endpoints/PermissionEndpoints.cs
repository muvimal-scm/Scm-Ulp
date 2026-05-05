using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Ulp.M26.Application;
using Ulp.M26.Infrastructure.Persistence;

namespace Ulp.M26.Api.Endpoints;

public static class PermissionEndpoints
{
    public static IEndpointRouteBuilder MapPermissionEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m26/permissions").WithTags("M26 · Permissions").RequireAuthorization();

        // Read-only catalog — written via the seed migration, not the API.
        g.MapGet("/", async ([FromServices] M26DbContext db, CancellationToken ct) =>
        {
            var rows = await db.Permissions.AsNoTracking()
                .OrderBy(p => p.ModuleCode).ThenBy(p => p.Resource).ThenBy(p => p.Action)
                .ToListAsync(ct);

            return Results.Ok(rows.Select(p => new PermissionDto(p.Id, p.ToCode(), p.Description ?? "")));
        });

        return app;
    }
}
