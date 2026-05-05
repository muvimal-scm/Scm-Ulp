using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Ulp.Identity.Application;
using Ulp.Identity.Infrastructure.Persistence;

namespace Ulp.Identity.Api.Endpoints;

public static class PermissionEndpoints
{
    public static IEndpointRouteBuilder MapPermissionEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/identity/permissions").WithTags("M26 · Permissions").RequireAuthorization();

        // Read-only catalog — written via the seed migration, not the API.
        g.MapGet("/", async ([FromServices] IdentityDbContext db, CancellationToken ct) =>
        {
            var rows = await db.Permissions.AsNoTracking()
                .OrderBy(p => p.ModuleCode).ThenBy(p => p.Resource).ThenBy(p => p.Action)
                .ToListAsync(ct);

            return Results.Ok(rows.Select(p => new PermissionDto(p.Id, p.ToCode(), p.Description ?? "")));
        });

        return app;
    }
}
