---
name: redis-caching
description: Redis 7 caching patterns for ULP using StackExchange.Redis. Use when implementing distributed cache, session storage, rate limiting, or any work in Backend/*/Caching/. Covers cache-aside pattern, key naming conventions, TTL strategy, ConnectionMultiplexer reuse, MVP Docker Redis to Azure Cache for Redis migration, and tenant-scoped key prefixes. Always use for high-read-low-write data like master data lookups, RBAC permission caches, dashboard aggregates, and OTP throttling.
---

# Redis 7 Caching for ULP

## When this skill triggers
Implementing distributed cache, session store, OTP rate limiter, lookup table cache (M1 master data), RBAC permission cache (M26), dashboard aggregate cache (M24), or any code in `Backend/*/Caching/`, `Backend/Common/Caching/`. Trigger on `IDistributedCache`, `IConnectionMultiplexer`, `StringGet*`, `StringSet*`, or appsettings cache config changes.

## Top 3 reference repos
1. **StackExchange/StackExchange.Redis** (https://github.com/StackExchange/StackExchange.Redis) — Official high-performance .NET Redis client. Read `docs/Basics.md` for ConnectionMultiplexer lifetime rules and `docs/Pipelines-Multiplexers.md` for performance patterns. Single multiplexer per app — never per request.
2. **dotnet/aspnetcore** (https://github.com/dotnet/aspnetcore/tree/main/src/Caching/StackExchangeRedis) — `Microsoft.Extensions.Caching.StackExchangeRedis` source. Authoritative IDistributedCache implementation. Read tests for canonical config.
3. **thepirat000/CachingFramework.Redis** (https://github.com/thepirat000/CachingFramework.Redis) — Higher-level wrapper with tagging, fetch-with-callback, pub/sub patterns. Useful reference for cache-aside helpers and tag-based invalidation patterns ULP can adopt.

## Critical ULP patterns

### Connection registration (Program.cs) — singleton multiplexer
```csharp
// Single multiplexer per app — Redis recommends this strongly
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var config = builder.Configuration.GetSection("Redis").Get<RedisOptions>()!;
    var options = ConfigurationOptions.Parse(config.Endpoint);
    options.AbortOnConnectFail = false;       // retry forever; fail-open at app startup
    options.ConnectRetry = 3;
    options.ConnectTimeout = 5000;
    options.AsyncTimeout = 5000;
    options.KeepAlive = 60;
    options.ClientName = $"ulp-{Environment.MachineName}";
    return ConnectionMultiplexer.Connect(options);
});

// IDistributedCache for ASP.NET Core abstractions
builder.Services.AddStackExchangeRedisCache(opt =>
{
    opt.Configuration = builder.Configuration["Redis:Endpoint"];
    opt.InstanceName = "ulp:";  // global key prefix
});
```

### Tenant-scoped cache key convention (mandatory)
```csharp
// Every cache key MUST include tenant_id - never share across tenants
public static class CacheKeys
{
    // Format: ulp:{tenant_id}:{module}:{entity}:{id}
    public static string CustomerById(int tenantId, long customerId)
        => $"ulp:{tenantId}:m1:customer:{customerId}";

    public static string UserPermissions(int tenantId, Guid userId)
        => $"ulp:{tenantId}:m26:perms:{userId}";

    public static string OtpThrottle(string mobileE164)
        => $"ulp:global:otp:throttle:{mobileE164}";  // OTP is cross-tenant
}
```

### Cache-aside pattern (the ULP standard)
```csharp
public class CustomerService
{
    private readonly IDistributedCache _cache;
    private readonly IM1DbContext _db;
    private readonly ITenantContext _tenant;
    private static readonly TimeSpan TTL = TimeSpan.FromMinutes(15);

    public async Task<Customer?> GetAsync(long id, CancellationToken ct)
    {
        var key = CacheKeys.CustomerById(_tenant.TenantId, id);
        var cached = await _cache.GetStringAsync(key, ct);
        if (cached is not null)
            return JsonSerializer.Deserialize<Customer>(cached);

        var entity = await _db.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        if (entity is null) return null;

        await _cache.SetStringAsync(key, JsonSerializer.Serialize(entity),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TTL }, ct);
        return entity;
    }

    public async Task InvalidateAsync(long id, CancellationToken ct)
        => await _cache.RemoveAsync(CacheKeys.CustomerById(_tenant.TenantId, id), ct);
}
```

### OTP rate limiting (M26 / M27)
```csharp
public class OtpThrottleService
{
    private readonly IConnectionMultiplexer _redis;

    public async Task<bool> TryAllowAsync(string mobileE164)
    {
        var db = _redis.GetDatabase();
        var key = CacheKeys.OtpThrottle(mobileE164);
        // Atomic INCR with TTL on first set
        var count = await db.StringIncrementAsync(key);
        if (count == 1) await db.KeyExpireAsync(key, TimeSpan.FromMinutes(15));
        return count <= 5;  // max 5 OTP requests per 15 min
    }
}
```

## Critical gotchas

### NEVER use KEYS command in production
- KEYS is O(N) and blocks Redis. Use SCAN with cursor pagination instead.
- For tag-based invalidation, use Redis Sets to track keys per tag.

### Multiplexer lifetime
- ONE ConnectionMultiplexer per app — registered as singleton.
- Creating per-request causes connection storms and client-side throttling.

### Serialization
- Default to `System.Text.Json` (not Newtonsoft) — faster, allocation-friendly.
- For DateTime fields, use `JsonSerializerOptions { DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull }`.

### TTL discipline
- Every key MUST have TTL. Unbounded keys = production memory leak.
- ULP defaults: master data 15 min, dashboards 60 sec, sessions 8 hr, OTP 15 min.

### MVP -> Production migration
- MVP: `localhost:6379` (Docker Compose redis:7-alpine)
- Prod: `<name>.redis.cache.windows.net:6380,password=...,ssl=True`
- Code change: NONE — only connection string in appsettings.

## ULP companion docs
- ULP_HLD_v1.0_HighLevelDesign.docx Section 7 (Cross-cutting concerns - caching)
- ULP_TechStack_v3.0_Final.xlsx (Cache row)
- ULP_DevelopmentGuide_v1.0.docx Section 6.2 (MVP-to-prod migration)
