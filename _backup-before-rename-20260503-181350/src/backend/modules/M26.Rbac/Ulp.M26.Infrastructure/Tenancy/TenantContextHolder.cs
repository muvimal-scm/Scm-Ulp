using Ulp.Core.Domain.Tenancy;
using Ulp.Core.Domain.ValueObjects;
using Ulp.M26.Domain.Entities;

namespace Ulp.M26.Infrastructure.Tenancy;

/// <summary>
/// Per-request mutable holder. The resolving middleware sets it once at the
/// start of the request; downstream services read it via <see cref="ITenantContext"/>.
/// </summary>
public sealed class TenantContextHolder
{
    public TenantRecord? Tenant { get; private set; }
    public long? UserId { get; private set; }
    public string? KeycloakSubject { get; private set; }

    public void Set(TenantRecord tenant, long? userId, string? sub)
    {
        Tenant = tenant;
        UserId = userId;
        KeycloakSubject = sub;
    }
}

/// <summary>
/// <see cref="ITenantContext"/> backed by <see cref="TenantContextHolder"/>.
/// Throws if accessed before resolution — callers should rely on the resolver
/// middleware running first (which it does, immediately after authentication).
/// </summary>
public sealed class ResolvedTenantContext(TenantContextHolder holder) : ITenantContext
{
    private TenantRecord T => holder.Tenant
        ?? throw new InvalidOperationException("Tenant context not yet resolved for this request");

    public TenantId TenantId   => new(T.Id.ToString());
    public CountryCode CountryCode => new(T.CountryCode);
    public string CurrencyCode => T.FunctionalCurrency;
    public string Timezone     => T.PrimaryTimezone;
    public string Locale       => T.PrimaryLocale;
    public string Region       => T.Region;
    public IReadOnlyList<string> CompliancePlugins => Array.Empty<string>();   // TODO: per-tenant plugins from m_tenant_plugin
}
