using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using NodaTime;
using Ulp.Identity.Application;
using Ulp.Identity.Domain.Entities;

namespace Ulp.Identity.Infrastructure.Persistence;

/// <summary>
/// User lookup keyed on Keycloak `sub`. 5-minute sliding cache. Login + last-seen
/// updates are written through and bust the cache; permission changes are bust
/// via PermissionResolver instead.
/// </summary>
public sealed class UserLookup(IdentityDbContext db, IMemoryCache cache) : IUserLookup
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    public async Task<TenantUser?> GetBySubjectAsync(string keycloakSubject, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(keycloakSubject)) return null;
        var key = Key(keycloakSubject);
        if (cache.TryGetValue<TenantUser>(key, out var cached) && cached is not null) return cached;

        var user = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.KeycloakSubject == keycloakSubject, ct);
        if (user is not null) cache.Set(key, user, new MemoryCacheEntryOptions { SlidingExpiration = Ttl });
        return user;
    }

    public async Task<long> RecordLoginAsync(long userId, Instant at, string? ip, CancellationToken ct)
    {
        var rows = await db.Users.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LastLoginAt, at), ct);

        if (rows > 0)
        {
            // Write the login audit row alongside the timestamp update.
            db.Audits.Add(new M26Audit
            {
                TenantId    = (await db.Users.AsNoTracking().Where(u => u.Id == userId)
                                   .Select(u => (int)int.Parse(u.TenantId.Value))
                                   .FirstAsync(ct)),
                ActorUserId = userId,
                Action      = AuditAction.Login,
                IpAddress   = ip,
                OccurredAt  = at,
            });
            await db.SaveChangesAsync(ct);

            // Bust the cache for any sub mapped to this user.
            var sub = await db.Users.AsNoTracking().Where(u => u.Id == userId)
                .Select(u => u.KeycloakSubject).FirstOrDefaultAsync(ct);
            if (!string.IsNullOrEmpty(sub)) cache.Remove(Key(sub));
        }

        return rows;
    }

    public void InvalidateCache(string keycloakSubject) => cache.Remove(Key(keycloakSubject));

    private static string Key(string sub) => $"m26:user:sub:{sub}";
}
