using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.M26.Application;
using Ulp.M26.Domain.Entities;
using Ulp.M26.Infrastructure.Persistence;

namespace Ulp.M26.Api.Endpoints;

public static class RoleEndpoints
{
    public static IEndpointRouteBuilder MapRoleEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m26/roles").WithTags("M26 · Roles").RequireAuthorization();

        g.MapGet("/", ListAsync);
        g.MapGet("/{id:long}", GetAsync);
        g.MapPost("/", CreateAsync);
        g.MapPut("/{id:long}/permissions", UpdatePermissionsAsync);
        g.MapPost("/{id:long}/deactivate", DeactivateAsync);

        return app;
    }

    private static async Task<IResult> ListAsync(
        [FromServices] M26DbContext db,
        [FromServices] ITenantContext tenant,
        CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        // Tenant roles + system roles (TenantId == null).
        var rows = await db.Roles.AsNoTracking()
            .Where(r => r.TenantId == null || r.TenantId == tenantId)
            .OrderBy(r => r.IsSystem ? 0 : 1).ThenBy(r => r.Name)
            .ToListAsync(ct);
        return Results.Ok(rows.Select(ToDto));
    }

    private static async Task<IResult> GetAsync(long id,
        [FromServices] M26DbContext db,
        [FromServices] ITenantContext tenant,
        CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var r = await db.Roles.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && (x.TenantId == null || x.TenantId == tenantId), ct);
        if (r is null) return Results.NotFound();

        var perms = await (
            from rp in db.RolePermissions
            where rp.RoleId == r.Id
            join p in db.Permissions on rp.PermissionId equals p.Id
            select p).ToListAsync(ct);

        return Results.Ok(new RoleDto(r.Id, r.TenantId, r.Code, r.Name, r.Description, r.IsSystem, r.IsActive,
            perms.Select(p => p.ToCode()).ToList()));
    }

    private static async Task<IResult> CreateAsync(
        [FromBody] CreateRoleRequest req,
        [FromServices] M26DbContext db,
        [FromServices] ITenantContext tenant,
        [FromServices] IClock clock,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Code) || string.IsNullOrWhiteSpace(req.Name))
            return Results.ValidationProblem(new Dictionary<string, string[]>
                { ["code"] = ["code and name required"] });

        var tenantId = int.Parse(tenant.TenantId.Value);
        var dup = await db.Roles.AnyAsync(r => r.TenantId == tenantId && r.Code == req.Code, ct);
        if (dup) return Results.Conflict(new { error = "role code already exists" });

        var now = clock.GetCurrentInstant();
        var role = new Role
        {
            TenantId    = tenantId,
            Code        = req.Code,
            Name        = req.Name,
            Description = req.Description,
            IsSystem    = false,
            IsActive    = true,
            CreatedAt   = now,
            ModifiedAt  = now,
        };
        db.Roles.Add(role);
        await db.SaveChangesAsync(ct);

        foreach (var pid in req.PermissionIds.Distinct())
        {
            db.RolePermissions.Add(new RolePermission
            { RoleId = role.Id, PermissionId = pid, GrantedAt = now, GrantedBy = 0 });
        }
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/v1/m26/roles/{role.Id}", new { role.Id });
    }

    private static async Task<IResult> UpdatePermissionsAsync(long id,
        [FromBody] UpdateRolePermissionsRequest req,
        [FromServices] M26DbContext db,
        [FromServices] ITenantContext tenant,
        [FromServices] IClock clock,
        CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var role = await db.Roles.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (role is null || (role.TenantId != null && role.TenantId != tenantId))
            return Results.NotFound();
        if (role.IsSystem) return Results.Forbid();

        var existing = await db.RolePermissions.Where(rp => rp.RoleId == id).ToListAsync(ct);
        db.RolePermissions.RemoveRange(existing);

        var now = clock.GetCurrentInstant();
        foreach (var pid in req.PermissionIds.Distinct())
        {
            db.RolePermissions.Add(new RolePermission
            { RoleId = id, PermissionId = pid, GrantedAt = now, GrantedBy = 0 });
        }
        role.ModifiedAt = now;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> DeactivateAsync(long id,
        [FromServices] M26DbContext db,
        [FromServices] ITenantContext tenant,
        [FromServices] IClock clock,
        CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var role = await db.Roles.FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId, ct);
        if (role is null) return Results.NotFound();
        if (role.IsSystem) return Results.Forbid();

        role.IsActive  = false;
        role.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static RoleDto ToDto(Role r) => new(r.Id, r.TenantId, r.Code, r.Name, r.Description,
        r.IsSystem, r.IsActive, Array.Empty<string>());
}
