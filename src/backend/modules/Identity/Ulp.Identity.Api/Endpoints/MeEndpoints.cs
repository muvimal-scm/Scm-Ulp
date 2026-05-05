using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Ulp.Identity.Application;
using Ulp.Identity.Infrastructure.Persistence;
using Ulp.Identity.Infrastructure.Tenancy;

namespace Ulp.Identity.Api.Endpoints;

public static class MeEndpoints
{
    public static IEndpointRouteBuilder MapMeEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/identity/me").WithTags("M26 · Me").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] TenantContextHolder holder,
            [FromServices] IdentityDbContext db,
            [FromServices] IPermissionResolver perms,
            CancellationToken ct) =>
        {
            if (holder.UserId is null) return Results.Unauthorized();

            var user = await db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == holder.UserId, ct);
            if (user is null) return Results.NotFound();

            var roles = await (
                from ur in db.UserRoles
                where ur.UserId == user.Id
                join r in db.Roles on ur.RoleId equals r.Id
                select r.Code).ToListAsync(ct);

            var effective = await perms.GetEffectivePermissionsAsync(user.Id, ct);

            return Results.Ok(new UserDto(
                user.Id,
                int.Parse(user.TenantId.Value),
                user.Email,
                user.DisplayName,
                user.CountryCode.Value,
                user.Status.ToString(),
                roles,
                effective.ToList()));
        });

        return app;
    }
}
