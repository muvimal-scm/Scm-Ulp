using Ulp.Core.Domain.Tenancy;
using Ulp.Core.Domain.ValueObjects;

namespace Ulp.TestKit.Tenants;

/// <summary>Canonical IN + US tenant fixtures used by every country-aware test.</summary>
public static class TenantFixtures
{
    public static ITenantContext IndianTenant(string? tenantId = null) =>
        new FakeTenantContext
        {
            TenantId = new TenantId(tenantId ?? "01HQ-IN-DEV-FIXTURE"),
            CountryCode = CountryCode.India,
            CurrencyCode = "INR",
            Timezone = "Asia/Kolkata",
            Locale = "en-IN",
            Region = Region.IndiaCentral,
            CompliancePlugins = new[] { "india-customs", "india-gst", "india-ewb", "india-tds" },
        };

    public static ITenantContext UsTenant(string? tenantId = null) =>
        new FakeTenantContext
        {
            TenantId = new TenantId(tenantId ?? "01HQ-US-DEV-FIXTURE"),
            CountryCode = CountryCode.UnitedStates,
            CurrencyCode = "USD",
            Timezone = "America/New_York",
            Locale = "en-US",
            Region = Region.UsEast,
            CompliancePlugins = new[] { "us-cbp-abi", "us-aes", "us-sales-tax", "us-1099" },
        };
}

internal sealed class FakeTenantContext : ITenantContext
{
    public TenantId TenantId { get; init; }
    public CountryCode CountryCode { get; init; }
    public string CurrencyCode { get; init; } = "INR";
    public string Timezone { get; init; } = "Asia/Kolkata";
    public string Locale { get; init; } = "en-IN";
    public string Region { get; init; } = Ulp.Core.Domain.Tenancy.Region.IndiaCentral;
    public IReadOnlyList<string> CompliancePlugins { get; init; } = Array.Empty<string>();
}
