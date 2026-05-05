using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.ValueObjects;
using Ulp.Identity.Domain.Entities;

namespace Ulp.Identity.Infrastructure.Persistence;

/// <summary>
/// M26 DbContext â€” strictly per docs/lld/M26_RBAC_v1.0.md table shapes.
/// Note: tenant scoping is NOT done via global query filter here because
/// M26 itself drives the tenant resolution. The resolver runs before the
/// rest of the app's tenant filters take effect.
/// </summary>
public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options) : DbContext(options)
{
    public DbSet<TenantUser> Users { get; private set; } = null!;
    public DbSet<Role> Roles { get; private set; } = null!;
    public DbSet<Permission> Permissions { get; private set; } = null!;
    public DbSet<RolePermission> RolePermissions { get; private set; } = null!;
    public DbSet<UserRole> UserRoles { get; private set; } = null!;
    public DbSet<UserPermissionOverride> UserPermissionOverrides { get; private set; } = null!;
    public DbSet<TenantGroup> Groups { get; private set; } = null!;
    public DbSet<UserGroup> UserGroups { get; private set; } = null!;
    public DbSet<GroupRole> GroupRoles { get; private set; } = null!;
    public DbSet<UserSession> Sessions { get; private set; } = null!;
    public DbSet<ApiKey> ApiKeys { get; private set; } = null!;
    public DbSet<MfaEnrolment> MfaEnrolments { get; private set; } = null!;
    public DbSet<M26Audit> Audits { get; private set; } = null!;
    public DbSet<TenantRecord> Tenants { get; private set; } = null!;

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<TenantUser>(e =>
        {
            e.ToTable("m_user");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id").HasConversion(t => int.Parse(t.Value), v => new TenantId(v.ToString()));
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasConversion(c => c.Value, v => new CountryCode(v)).HasMaxLength(2).IsFixedLength();
            e.Property(x => x.KeycloakSubject).HasColumnName("keycloak_subject").HasMaxLength(36).IsFixedLength();
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(255);
            e.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(30);
            e.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(150);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.PreferredLocale).HasColumnName("preferred_locale").HasMaxLength(10);
            e.Property(x => x.PreferredTimezone).HasColumnName("preferred_timezone").HasMaxLength(50);
            e.Property(x => x.LastLoginAt).HasColumnName("last_login_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
            e.HasIndex(x => x.KeycloakSubject).IsUnique();
            e.HasIndex(x => new { x.TenantId, x.Email }).IsUnique();
        });

        b.Entity<Role>(e =>
        {
            e.ToTable("m26_role");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(50);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.IsSystem).HasColumnName("is_system");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
            e.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
        });

        b.Entity<Permission>(e =>
        {
            e.ToTable("m26_permission");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ModuleCode).HasColumnName("module_code").HasMaxLength(10);
            e.Property(x => x.Resource).HasColumnName("resource").HasMaxLength(50);
            e.Property(x => x.Action).HasColumnName("action").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.Scope).HasColumnName("scope").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.Description).HasColumnName("description");
            e.HasIndex(x => new { x.ModuleCode, x.Resource, x.Action, x.Scope }).IsUnique();
        });

        b.Entity<RolePermission>(e =>
        {
            e.ToTable("m26_role_permission");
            e.HasKey(x => new { x.RoleId, x.PermissionId });
            e.Property(x => x.RoleId).HasColumnName("role_id");
            e.Property(x => x.PermissionId).HasColumnName("permission_id");
            e.Property(x => x.GrantedAt).HasColumnName("granted_at_utc").HasConversion(InstantConv);
            e.Property(x => x.GrantedBy).HasColumnName("granted_by");
        });

        b.Entity<UserRole>(e =>
        {
            e.ToTable("m26_user_role");
            e.HasKey(x => new { x.UserId, x.RoleId });
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.RoleId).HasColumnName("role_id");
            e.Property(x => x.GrantedAt).HasColumnName("granted_at_utc").HasConversion(InstantConv);
            e.Property(x => x.GrantedBy).HasColumnName("granted_by");
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at_utc").HasConversion(NullableInstant);
        });

        b.Entity<UserPermissionOverride>(e =>
        {
            e.ToTable("m26_user_permission_override");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.PermissionId).HasColumnName("permission_id");
            e.Property(x => x.Effect).HasColumnName("effect").HasConversion<string>().HasMaxLength(5);
            e.Property(x => x.ScopeFilterJson).HasColumnName("scope_filter").HasColumnType("json");
            e.Property(x => x.GrantedBy).HasColumnName("granted_by");
            e.Property(x => x.GrantedAt).HasColumnName("granted_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at_utc").HasConversion(NullableInstant);
        });

        b.Entity<TenantGroup>(e =>
        {
            e.ToTable("m26_group");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(50);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.Description).HasColumnName("description");
        });

        b.Entity<UserGroup>(e =>
        {
            e.ToTable("m26_user_group");
            e.HasKey(x => new { x.UserId, x.GroupId });
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.GroupId).HasColumnName("group_id");
        });

        b.Entity<GroupRole>(e =>
        {
            e.ToTable("m26_group_role");
            e.HasKey(x => new { x.GroupId, x.RoleId });
            e.Property(x => x.GroupId).HasColumnName("group_id");
            e.Property(x => x.RoleId).HasColumnName("role_id");
        });

        b.Entity<UserSession>(e =>
        {
            e.ToTable("m26_session");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.RefreshJti).HasColumnName("refresh_jti").HasMaxLength(36).IsFixedLength();
            e.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
            e.Property(x => x.UserAgent).HasColumnName("user_agent").HasMaxLength(500);
            e.Property(x => x.IssuedAt).HasColumnName("issued_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at_utc").HasConversion(InstantConv);
            e.Property(x => x.LastSeenAt).HasColumnName("last_seen_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.RevokedAt).HasColumnName("revoked_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.RevokedReason).HasColumnName("revoked_reason").HasMaxLength(100);
            e.HasIndex(x => x.RefreshJti).IsUnique();
        });

        b.Entity<ApiKey>(e =>
        {
            e.ToTable("m26_api_key");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.KeyHash).HasColumnName("key_hash").HasMaxLength(64).IsFixedLength();
            e.Property(x => x.KeyPrefix).HasColumnName("key_prefix").HasMaxLength(8).IsFixedLength();
            e.Property(x => x.ScopesJson).HasColumnName("scopes").HasColumnType("json");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.LastUsedAt).HasColumnName("last_used_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.IsRevoked).HasColumnName("is_revoked");
            e.Property(x => x.RevokedAt).HasColumnName("revoked_at_utc").HasConversion(NullableInstant);
            e.HasIndex(x => x.KeyHash).IsUnique();
        });

        b.Entity<MfaEnrolment>(e =>
        {
            e.ToTable("m26_mfa_enrolment");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Factor).HasColumnName("factor").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.FactorLabel).HasColumnName("factor_label").HasMaxLength(100);
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.EnrolledAt).HasColumnName("enrolled_at_utc").HasConversion(InstantConv);
            e.Property(x => x.LastUsedAt).HasColumnName("last_used_at_utc").HasConversion(NullableInstant);
        });

        b.Entity<M26Audit>(e =>
        {
            e.ToTable("m26_audit");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ActorUserId).HasColumnName("actor_user_id");
            e.Property(x => x.Action).HasColumnName("action").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.TargetUserId).HasColumnName("target_user_id");
            e.Property(x => x.DetailsJson).HasColumnName("details").HasColumnType("json");
            e.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
            e.Property(x => x.OccurredAt).HasColumnName("occurred_at_utc").HasConversion(InstantConv);
        });

        b.Entity<TenantRecord>(e =>
        {
            e.ToTable("m_tenant");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(255);
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.PrimaryLocale).HasColumnName("primary_locale").HasMaxLength(10);
            e.Property(x => x.PrimaryTimezone).HasColumnName("primary_time_zone").HasMaxLength(50);
            e.Property(x => x.FunctionalCurrency).HasColumnName("functional_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Region).HasColumnName("region").HasMaxLength(20);
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(15);
        });
    }

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant, DateTime>
        InstantConv = new(
            v => v.ToDateTimeUtc(),
            v => Instant.FromDateTimeUtc(DateTime.SpecifyKind(v, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant?, DateTime?>
        NullableInstant = new(
            v => v == null ? null : v.Value.ToDateTimeUtc(),
            v => v == null ? null : Instant.FromDateTimeUtc(DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)));
}
