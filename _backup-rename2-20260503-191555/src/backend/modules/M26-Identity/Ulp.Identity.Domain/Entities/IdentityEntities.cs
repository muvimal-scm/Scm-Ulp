using NodaTime;
using Ulp.Core.Domain.Entities;
using Ulp.Core.Domain.ValueObjects;

namespace Ulp.Identity.Domain.Entities;

/// <summary>
/// All M26 RBAC entities â€” strictly per docs/lld/M26_RBAC_v1.0.md.
/// Bundled in one file to keep the module surface tight; split if any
/// entity grows non-trivial behaviour.
/// </summary>

// LLD Â§3.2 - m_user
public sealed class TenantUser : IEntity, ITenantScoped
{
    public long Id { get; set; }
    public TenantId TenantId { get; set; }
    public CountryCode CountryCode { get; set; }
    public string KeycloakSubject { get; set; } = "";   // Keycloak `sub` claim
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string DisplayName { get; set; } = "";
    public UserStatus Status { get; set; } = UserStatus.Active;
    public string? PreferredLocale { get; set; }
    public string? PreferredTimezone { get; set; }
    public Instant? LastLoginAt { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum UserStatus { Active, Invited, Suspended, Deactivated }

// LLD Â§3.3 - m26_role  (tenant_id nullable for system roles)
public sealed class Role
{
    public long Id { get; set; }
    public int? TenantId { get; set; }                  // null = system role
    public string? CountryCode { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; } = true;
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

// LLD Â§3.4 - m26_permission
public sealed class Permission
{
    public long Id { get; set; }
    public string ModuleCode { get; set; } = "";        // "m1","m17","m21"
    public string Resource { get; set; } = "";          // "party","invoice","document"
    public PermissionAction Action { get; set; }
    public PermissionScope Scope { get; set; }
    public string? Description { get; set; }

    public string ToCode() => $"{ModuleCode}.{Resource}.{Action.ToString().ToLowerInvariant()}";
}

public enum PermissionAction { Read, Write, Create, Update, Delete, Approve, Export, Share }
public enum PermissionScope { Module, Entity, Field }

// LLD Â§3.5 - m26_role_permission
public sealed class RolePermission
{
    public long RoleId { get; set; }
    public long PermissionId { get; set; }
    public Instant GrantedAt { get; set; }
    public long GrantedBy { get; set; }
}

// LLD Â§3.6 - m26_user_role
public sealed class UserRole
{
    public long UserId { get; set; }
    public long RoleId { get; set; }
    public Instant GrantedAt { get; set; }
    public long GrantedBy { get; set; }
    public Instant? ExpiresAt { get; set; }
}

// LLD Â§3.7 - m26_user_permission_override
public sealed class UserPermissionOverride
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long UserId { get; set; }
    public long PermissionId { get; set; }
    public OverrideEffect Effect { get; set; }
    public string? ScopeFilterJson { get; set; }
    public long GrantedBy { get; set; }
    public Instant GrantedAt { get; set; }
    public Instant? ExpiresAt { get; set; }
}

public enum OverrideEffect { Grant, Deny }

// LLD Â§3.8 - m26_group
public sealed class TenantGroup
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
}

// LLD Â§3.9 - m26_user_group + m26_group_role  (relation rows)
public sealed class UserGroup { public long UserId { get; set; } public long GroupId { get; set; } }
public sealed class GroupRole { public long GroupId { get; set; } public long RoleId { get; set; } }

// LLD Â§3.10 - m26_session
public sealed class UserSession
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long UserId { get; set; }
    public string RefreshJti { get; set; } = "";
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public Instant IssuedAt { get; set; }
    public Instant ExpiresAt { get; set; }
    public Instant? LastSeenAt { get; set; }
    public Instant? RevokedAt { get; set; }
    public string? RevokedReason { get; set; }
}

// LLD Â§3.11 - m26_api_key
public sealed class ApiKey
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string Name { get; set; } = "";
    public string KeyHash { get; set; } = "";           // sha256 of raw key
    public string KeyPrefix { get; set; } = "";         // visible prefix in UI
    public string ScopesJson { get; set; } = "[]";
    public long CreatedBy { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant? ExpiresAt { get; set; }
    public Instant? LastUsedAt { get; set; }
    public bool IsRevoked { get; set; }
    public Instant? RevokedAt { get; set; }
}

// LLD Â§3.12 - m26_mfa_enrolment
public sealed class MfaEnrolment
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long UserId { get; set; }
    public MfaFactor Factor { get; set; }
    public string? FactorLabel { get; set; }
    public bool IsActive { get; set; } = true;
    public Instant EnrolledAt { get; set; }
    public Instant? LastUsedAt { get; set; }
}

public enum MfaFactor { Totp, Fido2, Sms, Email }

// LLD Â§3.13 - m26_audit
public sealed class M26Audit
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long? ActorUserId { get; set; }
    public AuditAction Action { get; set; }
    public long? TargetUserId { get; set; }
    public string? DetailsJson { get; set; }
    public string? IpAddress { get; set; }
    public Instant OccurredAt { get; set; }
}

public enum AuditAction
{
    Login, Logout, GrantRole, RevokeRole, GrantPerm, RevokePerm,
    CreateUser, DeactivateUser, EnrollMfa, UnenrollMfa,
    CreateApiKey, RevokeApiKey, TenantSuspend, TenantActivate,
}

// Tenant â€” already in m_tenant; expose a thin read entity for M26 lookups
public sealed class TenantRecord
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string CountryCode { get; set; } = "";
    public string PrimaryLocale { get; set; } = "";
    public string PrimaryTimezone { get; set; } = "";
    public string FunctionalCurrency { get; set; } = "";
    public string Region { get; set; } = "";            // for region-pinning resolver
    public string Status { get; set; } = "Active";
}
