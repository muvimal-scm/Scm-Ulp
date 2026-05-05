using Ulp.Identity.Domain.Entities;

namespace Ulp.Identity.Application;

/// <summary>Tenant lookup â€” used by the real ITenantContextResolver replacing the dev stub.</summary>
public interface ITenantLookup
{
    Task<TenantRecord?> GetAsync(int tenantId, CancellationToken ct);
    Task<TenantRecord?> GetByCountryAsync(int tenantId, string countryClaim, CancellationToken ct);
    void InvalidateCache(int tenantId);
}

/// <summary>User lookup keyed by Keycloak `sub` claim.</summary>
public interface IUserLookup
{
    Task<TenantUser?> GetBySubjectAsync(string keycloakSubject, CancellationToken ct);
    Task<long> RecordLoginAsync(long userId, NodaTime.Instant at, string? ip, CancellationToken ct);
    void InvalidateCache(string keycloakSubject);
}

/// <summary>Permission resolution for the current user.</summary>
public interface IPermissionResolver
{
    Task<IReadOnlySet<string>> GetEffectivePermissionsAsync(long userId, CancellationToken ct);
}

/* ----- DTOs ----- */
public sealed record UserDto(long Id, int TenantId, string Email, string DisplayName, string CountryCode, string Status, IReadOnlyList<string> Roles, IReadOnlyList<string> Permissions);
public sealed record RoleDto(long Id, int? TenantId, string Code, string Name, string? Description, bool IsSystem, bool IsActive, IReadOnlyList<string> Permissions);
public sealed record PermissionDto(long Id, string Code, string Description);
public sealed record TenantDto(int Id, string Name, string CountryCode, string Region, string Status);
public sealed record InviteUserRequest(string Email, string DisplayName, string CountryCode, IReadOnlyList<long> RoleIds);
public sealed record CreateRoleRequest(string Code, string Name, string? Description, IReadOnlyList<long> PermissionIds);
public sealed record UpdateRolePermissionsRequest(IReadOnlyList<long> PermissionIds);
