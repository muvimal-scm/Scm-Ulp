using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using NodaTime;
using Ulp.Identity.Application;
using Ulp.Identity.Domain.Entities;

namespace Ulp.Identity.Infrastructure.Persistence;

public sealed class PermissionResolver(IdentityDbContext db, IMemoryCache cache, IClock clock) : IPermissionResolver
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    public async Task<IReadOnlySet<string>> GetEffectivePermissionsAsync(long userId, CancellationToken ct)
    {
        var key = $"m26:perms:{userId}";
        if (cache.TryGetValue<HashSet<string>>(key, out var cached) && cached is not null) return cached;

        // Compute "now" once on the client so EF can pass it as a parameter.
        // The previous version called DateTime.UtcNow.ToInstant() inside the LINQ
        // tree, which EF can't translate (custom extension method).
        var nowInstant = clock.GetCurrentInstant();

        var directRoleIds = db.UserRoles
            .Where(ur => ur.UserId == userId && (ur.ExpiresAt == null || ur.ExpiresAt > nowInstant))
            .Select(ur => ur.RoleId);

        var groupRoleIds = from ug in db.UserGroups
                           where ug.UserId == userId
                           join gr in db.GroupRoles on ug.GroupId equals gr.GroupId
                           select gr.RoleId;

        var roleIds = await directRoleIds.Concat(groupRoleIds).Distinct().ToListAsync(ct);

        var roleGranted = await (
            from rp in db.RolePermissions
            where roleIds.Contains(rp.RoleId)
            join p in db.Permissions on rp.PermissionId equals p.Id
            select p
        ).Distinct().ToListAsync(ct);

        var effective = new HashSet<string>(roleGranted.Select(p => p.ToCode()), StringComparer.Ordinal);

        var overrides = await (
            from o in db.UserPermissionOverrides
            where o.UserId == userId && (o.ExpiresAt == null || o.ExpiresAt > nowInstant)
            join p in db.Permissions on o.PermissionId equals p.Id
            select new { o.Effect, Code = p.ModuleCode + "." + p.Resource + "." + p.Action.ToString().ToLower() }
        ).ToListAsync(ct);

        foreach (var ov in overrides)
        {
            if (ov.Effect == OverrideEffect.Grant) effective.Add(ov.Code);
            else effective.Remove(ov.Code);              // DENY supersedes
        }

        cache.Set(key, effective, new MemoryCacheEntryOptions { SlidingExpiration = Ttl });
        return effective;
    }
}
