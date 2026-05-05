using FluentAssertions;
using Ulp.Core.Domain.ValueObjects;
using Ulp.M1.Domain.Entities;
using Ulp.TestKit.Tenants;
using Xunit;

namespace Ulp.M1.Tests;

/// <summary>
/// Entity-shape tests for Party / PartyIdentifier / Address / Product
/// per ULP_LLD_M1_v2.0_MasterData.docx. Verifies value-object usage
/// (Money for credit limit, CountryCode for country) and basic invariants.
/// </summary>
public class PartyEntityTests
{
    [Fact]
    public void Party_CanBeConstructed_WithMoneyCreditLimit()
    {
        var t = TenantFixtures.IndianTenant();
        var p = new Party
        {
            TenantId    = t.TenantId,
            CountryCode = CountryCode.India,
            PartyType   = PartyType.Customer,
            LegalName   = "Acme Logistics India Pvt Ltd",
            CreditLimit = new Money(500_000m, "INR"),
        };

        p.CreditLimit!.Value.Currency.Should().Be("INR");
        p.CreditLimit.Value.Amount.Should().Be(500_000m);
        p.CountryCode.Value.Should().Be("IN");
    }

    [Theory]
    [InlineData("Customer")]
    [InlineData("Vendor")]
    [InlineData("Carrier")]
    [InlineData("Broker")]
    [InlineData("Bank")]
    [InlineData("GovernmentAgency")]
    [InlineData("Employee")]
    [InlineData("Other")]
    public void PartyType_AcceptsAllLldValues(string type)
    {
        Enum.TryParse<PartyType>(type, out _).Should().BeTrue($"PartyType.{type} should exist per LLD §3");
    }

    [Fact]
    public void PartyIdentifier_DefaultsToPending()
    {
        var id = new PartyIdentifier
        {
            TenantId        = 1001,
            IdentifierType  = "PAN",
            IdentifierValue = "ABCDE1234F",
        };
        id.ValidationStatus.Should().Be(IdentifierValidationStatus.Pending);
    }

    [Fact]
    public void Address_RequiresCountryCode()
    {
        var t = TenantFixtures.UsTenant();
        var a = new Address
        {
            TenantId    = t.TenantId,
            CountryCode = CountryCode.UnitedStates,
            Line1       = "350 5th Ave",
            City        = "New York",
            StateOrProvince = "New York",
            StateOrProvinceCode = "NY",
            PostalCode  = "10118",
            AddressType = AddressType.Office,
        };
        a.CountryCode.Value.Should().Be("US");
        a.PostalCode.Should().Be("10118");
    }

    [Theory]
    [InlineData("Goods")]
    [InlineData("Service")]
    [InlineData("Bundle")]
    public void ProductType_AcceptsAllLldValues(string type)
    {
        Enum.TryParse<ProductType>(type, out _).Should().BeTrue($"ProductType.{type} should exist per LLD §5");
    }

    [Fact]
    public void Product_CarriesAllClassificationCodes()
    {
        var t = TenantFixtures.IndianTenant();
        var p = new Product
        {
            TenantId      = t.TenantId,
            CountryCode   = CountryCode.India,
            ProductCode   = "SKU-001",
            ProductName   = "Steel coil",
            ProductType   = ProductType.Goods,
            UomCode       = "TONM",
            HsCode        = "720839",
            HsnCode       = "72083990",      // IN 8-digit
            HtsusCode     = "7208.39.0000",  // US 10-digit
            ScheduleBCode = "7208390000",
        };
        p.HsCode.Should().Be("720839");
        p.HsnCode.Should().Be("72083990");
        p.HtsusCode.Should().Be("7208.39.0000");
        p.ScheduleBCode.Should().Be("7208390000");
    }

    [Theory]
    [InlineData("Billing")]
    [InlineData("Shipping")]
    [InlineData("Office")]
    [InlineData("Warehouse")]
    [InlineData("Mailing")]
    [InlineData("TaxRegistered")]
    public void AddressType_AcceptsAllLldValues(string type)
    {
        Enum.TryParse<AddressType>(type, out _).Should().BeTrue($"AddressType.{type} should exist per LLD §4");
    }
}
