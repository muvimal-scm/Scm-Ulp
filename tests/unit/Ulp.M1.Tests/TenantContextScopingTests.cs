using FluentAssertions;
using Ulp.TestKit.Tenants;
using Xunit;

namespace Ulp.M1.Tests;

/// <summary>
/// Tenant context fixture sanity — confirms the fixtures used by all M1 tests
/// produce the expected IN/US tenant shape per ULP_DBD_v2.0 + Internationalization Guide.
/// Real tenant-scoped query-filter behaviour is verified by integration tests
/// against the docker MySQL stack (separate project, runs against real DB).
/// </summary>
public class TenantContextScopingTests
{
    [Fact]
    public void IndianTenant_HasCorrectShape()
    {
        var t = TenantFixtures.IndianTenant();
        t.CountryCode.Value.Should().Be("IN");
        t.CurrencyCode.Should().Be("INR");
        t.Timezone.Should().Be("Asia/Kolkata");
        t.Locale.Should().Be("en-IN");
        t.Region.Should().Be("in-central");
        t.CompliancePlugins.Should().Contain("india-customs");
        t.CompliancePlugins.Should().Contain("india-gst");
    }

    [Fact]
    public void UsTenant_HasCorrectShape()
    {
        var t = TenantFixtures.UsTenant();
        t.CountryCode.Value.Should().Be("US");
        t.CurrencyCode.Should().Be("USD");
        t.Timezone.Should().Be("America/New_York");
        t.Locale.Should().Be("en-US");
        t.Region.Should().Be("us-east");
        t.CompliancePlugins.Should().Contain("us-cbp-abi");
    }
}
