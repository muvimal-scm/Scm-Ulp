using Ulp.Core.Domain.ValueObjects;

namespace Ulp.Core.Domain.Tenancy;

/// <summary>
/// Per-request tenant context. Resolved at the API boundary from the JWT
/// <c>tenant_id</c> claim and looked up against the admin DB.
/// Every service in the request scope receives the same instance.
/// Source of truth for country / currency / timezone / locale / region — drives
/// plugin DI resolution, DB connection-string selection, and log enrichment.
/// </summary>
public interface ITenantContext
{
    TenantId TenantId { get; }
    CountryCode CountryCode { get; }

    /// <summary>ISO 4217 alpha-3 (e.g., "INR", "USD"). Tenant's functional currency.</summary>
    string CurrencyCode { get; }

    /// <summary>IANA tz database id (e.g., "Asia/Kolkata", "America/New_York").</summary>
    string Timezone { get; }

    /// <summary>BCP 47 locale (e.g., "en-IN", "en-US").</summary>
    string Locale { get; }

    /// <summary>Region key — drives connection string selection (e.g., "in-central", "us-east").</summary>
    string Region { get; }

    /// <summary>Plugin codes loaded for this tenant (e.g., ["india-customs", "india-gst"]).</summary>
    IReadOnlyList<string> CompliancePlugins { get; }
}
