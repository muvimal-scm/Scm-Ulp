using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Ulp.Identity.Application;
using Ulp.Identity.Domain.Entities;

namespace Ulp.Identity.Infrastructure.Persistence;

/// <summary>
/// L1 in-memory tenant lookup per LLD Â§5. Sliding TTL of 5 minutes keeps
/// resolution under 1ms on the hot path; cache is invalidated on TenantUpdated /
/// TenantSuspended events.
/// </summary>
public sealed class TenantLookup(IdentityDbContext db, IMemoryCache cache) : ITenantLookup
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    public async Task<TenantRecord?> GetAsync(int tenantId, CancellationToken ct)
    {
        var key = Key(tenantId);
        if (cache.TryGetValue<TenantRecord>(key, out var cached) && cached is not null) return cached;

        var record = await db.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, ct);
        if (record is not null) cache.Set(key, record, new MemoryCacheEntryOptions { SlidingExpiration = Ttl });
        return record;
    }

    public async Task<TenantRecord?> GetByCountryAsync(int tenantId, string countryClaim, CancellationToken ct)
    {
        var record = await GetAsync(tenantId, ct);
        if (record is null) return null;
        return string.Equals(record.CountryCode, countryClaim, StringComparison.OrdinalIgnoreCase) ? record : null;
    }

    public void InvalidateCache(int tenantId) => cache.Remove(Key(tenantId));

    private static string Key(int tenantId) => $"m26:tenant:{tenantId}";
}
