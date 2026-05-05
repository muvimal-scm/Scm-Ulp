using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Ulp.Identity.Application;
using Ulp.Identity.Domain.Entities;

namespace Ulp.Identity.Infrastructure.Persistence;

/// <summary>
/// Effective permissions per LLD Â§3.4â€“Â§3.7:
///   directRoles âˆª groupRoles â†’ role_permission â†’ permission
///   âˆª override.GRANT
///   âˆ– override.DENY  (DENY supersedes per LLD Â§3.7)
/// Returns the dotted permission codes ("m1.party.read") for ASP.NET policy mapping.
/// </summary>
public sealed class PermissionResolver(IdentityDbContext db, IMemoryCache cache) : IPermissionResolver
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    public async Task<IReadOnlySet<string>> GetEffectivePermissionsAsync(long userId, CancellationToken ct)
    {
        var key = $"m26:perms:{userId}";
        if (cache.TryGetValue<HashSet<string>>(key, out var cached) && cached is not null) return cached;

        // Role-derived permissions: direct userâ†’role plus groupâ†’role.
        var directRoleIds = db.UserRoles.Where(ur => ur.UserId == userId
                                && (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow.ToInstant()))
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

        // Apply user-level overrides.
        var nowInstant = NodaTime.SystemClock.Instance.GetCurrentInstant();
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

internal static class InstantExtensions
{
    public static NodaTime.Instant ToInstant(this DateTime utc)
        => NodaTime.Instant.FromDateTimeUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc));
}
