using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.Core.Domain.ValueObjects;
using Ulp.M26.Application;
using Ulp.M26.Domain.Entities;
using Ulp.M26.Infrastructure.Persistence;

namespace Ulp.M26.Api.Endpoints;

public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m26/users").WithTags("M26 · Users").RequireAuthorization();

        g.MapGet("/", ListAsync);
        g.MapGet("/{id:long}", GetAsync);
        g.MapPost("/invite", InviteAsync);
        g.MapPut("/{id:long}", UpdateAsync);
        g.MapPost("/{id:long}/deactivate", DeactivateAsync);
        g.MapPut("/{id:long}/roles", UpdateRolesAsync);

        return app;
    }

    private static async Task<IResult> ListAsync(
        [FromServices] M26DbContext db,
        [FromServices] ITenantContext tenant,
        [FromQuery] string? search,
        [FromQuery] int page,
        [FromQuery] int pageSize,
        CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var p  = Math.Max(page, 1);
        var ps = pageSize is <= 0 or > 200 ? 50 : pageSize;

        var q = db.Users.AsNoTracking().Where(u => u.TenantId == tenant.TenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(u => u.Email.Contains(s) || u.DisplayName.Contains(s));
        }
        var total = await q.LongCountAsync(ct);
        var rows  = await q.OrderBy(u => u.DisplayName)
            .Skip((p - 1) * ps).Take(ps).ToListAsync(ct);
        return Results.Ok(new { items = rows.Select(ToBriefDto), page = p, pageSize = ps, totalCount = total });
    }

    private static async Task<IResult> GetAsync(long id,
        [FromServices] M26DbContext db,
        [FromServices] ITenantContext tenant,
        [FromServices] IPermissionResolver perms,
        CancellationToken ct)
    {
        var u = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (u is null || u.TenantId.Value != tenant.TenantId.Value) return Results.NotFound();

        var roles = await (
            from ur in db.UserRoles
            where ur.UserId == u.Id
            join r in db.Roles on ur.RoleId equals r.Id
            select r.Code).ToListAsync(ct);

        var effective = await perms.GetEffectivePermissionsAsync(u.Id, ct);
        return Results.Ok(new UserDto(u.Id, int.Parse(u.TenantId.Value), u.Email, u.DisplayName,
            u.CountryCode.Value, u.Status.ToString(), roles, effective.ToList()));
    }

    private static async Task<IResult> InviteAsync(
        [FromBody] InviteUserRequest req,
        [FromServices] M26DbContext db,
        [FromServices] ITenantContext tenant,
        [FromServices] IClock clock,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.DisplayName))
            return Results.ValidationProblem(new Dictionary<string, string[]>
                { ["email"] = ["email and displayName required"] });

        var tenantId = int.Parse(tenant.TenantId.Value);
        var exists = await db.Users.AnyAsync(u => u.TenantId == tenant.TenantId && u.Email == req.Email, ct);
        if (exists) return Results.Conflict(new { error = "user already exists in tenant" });

        var now = clock.GetCurrentInstant();
        var u = new TenantUser
        {
            TenantId        = tenant.TenantId,
            CountryCode     = new CountryCode(req.CountryCode),
            KeycloakSubject = "",                           // populated when M27 invite is accepted
            Email           = req.Email,
            DisplayName     = req.DisplayName,
            Status          = UserStatus.Invited,
            CreatedAt       = now,
            ModifiedAt      = now,
        };
        db.Users.Add(u);
        await db.SaveChangesAsync(ct);

        foreach (var roleId in req.RoleIds.Distinct())
        {
            db.UserRoles.Add(new UserRole { UserId = u.Id, RoleId = roleId, GrantedAt = now, GrantedBy = 0 });
        }
        await db.SaveChangesAsync(ct);

        // TODO: enqueue M27 invite email when M27 lands.
        return Results.Created($"/api/v1/m26/users/{u.Id}", ToBriefDto(u));
    }

    private static async Task<IResult> UpdateAsync(long id,
        [FromBody] UpdateUserRequest req,
        [FromServices] M26DbContext db,
        [FromServices] ITenantContext tenant,
        [FromServices] IClock clock,
        CancellationToken ct)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (u is null || u.TenantId.Value != tenant.TenantId.Value) return Results.NotFound();

        if (!string.IsNullOrWhiteSpace(req.DisplayName)) u.DisplayName = req.DisplayName;
        if (!string.IsNullOrWhiteSpace(req.Phone))       u.Phone = req.Phone;
        if (!string.IsNullOrWhiteSpace(req.PreferredLocale))   u.PreferredLocale = req.PreferredLocale;
        if (!string.IsNullOrWhiteSpace(req.PreferredTimezone)) u.PreferredTimezone = req.PreferredTimezone;
        u.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return Results.Ok(ToBriefDto(u));
    }

    private static async Task<IResult> DeactivateAsync(long id,
        [FromServices] M26DbContext db,
        [FromServices] ITenantContext tenant,
        [FromServices] IClock clock,
        CancellationToken ct)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (u is null || u.TenantId.Value != tenant.TenantId.Value) return Results.NotFound();

        u.Status = UserStatus.Deactivated;
        u.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> UpdateRolesAsync(long id,
        [FromBody] UpdateUserRolesRequest req,
        [FromServices] M26DbContext db,
        [FromServices] ITenantContext tenant,
        [FromServices] IClock clock,
        CancellationToken ct)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (u is null || u.TenantId.Value != tenant.TenantId.Value) return Results.NotFound();

        var existing = await db.UserRoles.Where(ur => ur.UserId == id).ToListAsync(ct);
        db.UserRoles.RemoveRange(existing);

        var now = clock.GetCurrentInstant();
        foreach (var rid in req.RoleIds.Distinct())
        {
            db.UserRoles.Add(new UserRole { UserId = id, RoleId = rid, GrantedAt = now, GrantedBy = 0 });
        }
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static object ToBriefDto(TenantUser u) => new
    {
        u.Id,
        TenantId = int.Parse(u.TenantId.Value),
        u.Email,
        u.DisplayName,
        CountryCode = u.CountryCode.Value,
        Status      = u.Status.ToString(),
        u.PreferredLocale,
        u.PreferredTimezone,
        LastLoginAt = u.LastLoginAt?.ToString(),
        CreatedAt   = u.CreatedAt.ToString(),
    };
}

public sealed record UpdateUserRequest(string? DisplayName, string? Phone, string? PreferredLocale, string? PreferredTimezone);
public sealed record UpdateUserRolesRequest(IReadOnlyList<long> RoleIds);
