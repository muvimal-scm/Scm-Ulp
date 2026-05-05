---
name: efcore-mysql-pomelo
description: EF Core 8 + Pomelo MySQL provider patterns for ULP. Use when implementing data access, writing migrations, configuring DbContext, defining entities, or writing LINQ queries against MySQL. Covers tenant filters, audit interceptors, no-tracking queries, bulk operations, and Pomelo-specific gotchas. Always use this when touching Backend/*/Data/ or Backend/*/Entities/ folders.
---

# EF Core 8 + Pomelo MySQL Provider for ULP

## When this skill triggers
Implementing repositories, writing EF migrations, configuring DbContext, defining EF entities, writing LINQ queries against MySQL, or any work in `Backend/*/Data/` or `Backend/*/Entities/`.

## Top 3 reference repos
1. **dotnet/efcore** (https://github.com/dotnet/efcore) - Official Microsoft EF Core repo. Authoritative source for query patterns, change tracking, and migrations. Read the `test/` directory for canonical patterns.
2. **PomeloFoundation/Pomelo.EntityFrameworkCore.MySql** (https://github.com/PomeloFoundation/Pomelo.EntityFrameworkCore.MySql) - The MySQL provider ULP uses. README has critical config like `ServerVersion.AutoDetect()` and charset settings.
3. **ziggyrafiq/EntityFrameworkCoreGuideNET8** (https://github.com/ziggyrafiq/EntityFrameworkCoreGuideNET8) - Comprehensive .NET 8 patterns: repository pattern, unit-of-work, DTOs, concurrency, optimistic locking.

## Critical ULP patterns

### DbContext setup (every module)
```csharp
public class M17AccountsDbContext : DbContext
{
    private readonly ITenantContext _tenant;
    
    public M17AccountsDbContext(DbContextOptions opts, ITenantContext tenant) 
        : base(opts) { _tenant = tenant; }
    
    protected override void OnModelCreating(ModelBuilder b)
    {
        // CRITICAL: Global tenant filter on EVERY entity
        b.Entity<Invoice>().HasQueryFilter(e => e.TenantId == _tenant.TenantId);
        b.Entity<JournalEntry>().HasQueryFilter(e => e.TenantId == _tenant.TenantId);
        // ... every entity
    }
}
```

### Connection string pattern
```csharp
// Program.cs - use ServerVersion.AutoDetect to handle MySQL 8 vs MariaDB
services.AddDbContext<M17AccountsDbContext>(opts =>
    opts.UseMySql(
        config.GetConnectionString("Mysql"),
        ServerVersion.AutoDetect(config.GetConnectionString("Mysql")),
        mysql => mysql
            .EnableRetryOnFailure(3)
            .CommandTimeout(30)
    ));
```

### Audit interceptor (M21 integration)
```csharp
public class AuditInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData ed, InterceptionResult<int> result, CancellationToken ct)
    {
        var entries = ed.Context.ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted);
        foreach (var entry in entries) {
            // Emit audit event to M21 outbox
        }
        return ValueTask.FromResult(result);
    }
}
```

## Gotchas specific to ULP

1. **NEVER use lazy loading** - It causes N+1 queries. Use `.Include()` explicitly.
2. **Always `.AsNoTracking()` for reads** - Tracking is only for writes. Default to no-tracking and opt-in to tracking.
3. **NEVER `.Migrate()` on app startup in production** - Run `dotnet ef database update` from CI/CD. App startup migrations cause race conditions across replicas.
4. **No SQL JOIN across module schemas** - This is a hard ULP invariant (preserves Y2 DB split). If you need data from another module, call its API or read its read-model.
5. **MySQL 8 charset must be `utf8mb4`** with `utf8mb4_0900_ai_ci` collation - hard-coded in connection string.
6. **Bulk operations** - For >1000 row inserts, use `EFCore.BulkExtensions` (Z.EntityFramework.Extensions), not `SaveChangesAsync` per row.
7. **DateTimeOffset for all timestamps** - Never `DateTime`. MySQL stores as `TIMESTAMP(6)` for microsecond precision.

## Migration commands
```bash
# Add migration
dotnet ef migrations add <Name> -p Backend/M17.Accounts/ -s Backend/M17.Accounts.Api/

# Apply to local DB
dotnet ef database update -p Backend/M17.Accounts/

# Generate SQL script (for prod review)
dotnet ef migrations script -p Backend/M17.Accounts/ --idempotent -o migration.sql
```

## ULP companion docs
- Schema details: `docs/ULP_DBD_v1.0_DatabaseDesign.docx`
- Tenant strategy: `docs/ULP_HLD_v1.0_HighLevelDesign.docx` Section 4


---

## v2.0 ADDENDUM — Multi-Region Schema Conventions

### Mandatory columns on every business table (v2.0)

```sql
-- v2.0 adds country_code; v1.0 already had tenant_id
tenant_id           BIGINT       NOT NULL,
country_code        CHAR(2)      NOT NULL DEFAULT 'IN',  -- backfilled to IN for legacy rows
created_at_utc      BIGINT       NOT NULL,                -- microseconds since epoch (Instant)
created_by          BIGINT       NULL,
updated_at_utc      BIGINT       NULL,
updated_by          BIGINT       NULL,

INDEX  ix_tenant         (tenant_id),
INDEX  ix_tenant_country (tenant_id, country_code)
```

### Money columns (v2.0)

Always paired `_amount` (DECIMAL(19,4)) + `_currency` (CHAR(3)). Use EF Core 8 `ComplexProperty`:

```csharp
modelBuilder.Entity<Invoice>().ComplexProperty(i => i.Total, b => {
    b.Property(m => m.Amount).HasColumnName("total_amount").HasPrecision(19, 4);
    b.Property(m => m.Currency).HasColumnName("total_currency").HasMaxLength(3);
});
```

DDL convention:
```sql
total_amount       DECIMAL(19, 4)  NOT NULL,
total_currency     CHAR(3)         NOT NULL,
```

### Timezone columns (v2.0)

Calendar dates: `DATE`. Event instants: `BIGINT` (microseconds since epoch). IANA timezone IDs in tenant config:

```sql
posting_date       DATE             NOT NULL,
posted_at_utc      BIGINT           NOT NULL,  -- Instant
display_tz         VARCHAR(64)      NOT NULL DEFAULT 'Asia/Kolkata',
```

EF Core conversion:
```csharp
b.Property(i => i.PostingDate).HasConversion(
    v => v.ToDateOnly(), v => LocalDate.FromDateOnly(v));

b.Property(i => i.PostedAt).HasConversion(
    v => v.ToUnixTimeMilliseconds(),
    v => Instant.FromUnixTimeMilliseconds(v));
```

### Region-pinned connection string resolution

Don't hardcode connection strings. Resolve per request based on `tenant.Region`:

```csharp
public sealed class RegionalDbContextFactory : IDbContextFactory<M17AccountsDbContext>
{
    private readonly IConfiguration _cfg;
    private readonly ITenantContext _tenant;
    public M17AccountsDbContext CreateDbContext()
    {
        var connStr = _cfg.GetConnectionString($"primary-{_tenant.Region}")
            ?? throw new InvalidOperationException($"no DB for region {_tenant.Region}");
        var opts = new DbContextOptionsBuilder<M17AccountsDbContext>()
            .UseMySql(connStr, ServerVersion.AutoDetect(connStr))
            .Options;
        return new M17AccountsDbContext(opts, _tenant);
    }
}
```

### Global query filter — extended in v2.0
The tenant filter is the same as v1.0; in v2.0 we also enforce that the `country_code` matches the active tenant's country (defence in depth, prevents accidental cross-country access if tenant_id is somehow bypassed):

```csharp
b.Entity<Invoice>().HasQueryFilter(e =>
    e.TenantId == _tenant.TenantId &&
    e.CountryCode == _tenant.CountryCode);
```

### Migration safety
- Adding a column: `ALTER TABLE ... ADD COLUMN ... NULLABLE DEFAULT ...` (additive; safe).
- Backfilling: chunked UPDATE jobs (Migration Runbook v2.0 §Phase 9 pattern), NOT inline.
- NOT-NULL enforcement: deferred to next release after backfill verifies completeness.
- Column drop: deferred to a release after all code paths stop reading/writing.
- FK addition: only after backfill finishes and orphan-row check returns zero.

### No `if (countryCode == "IN")` in repositories
Country-specific behaviour belongs in the plugin layer, NOT in the data layer. EF queries should be country-agnostic; only the data SHAPE varies by country (which is encoded in plugin schema, e.g., `m4in_*` vs `m4us_*` tables).

## See also (v2.0)
- `compliance-plugin-pattern` — for where country-specific logic actually lives.
- `multi-region-tenant-context` — for `ITenantContext` and region resolution.
- `money-type-multicurrency` — for the `Money` mapping pattern.
- `nodatime-luxon-timezone` — for `Instant` and `LocalDate` mappings.
- ULP_DBD_v2.0_DatabaseDesign.docx — full schema reference.
