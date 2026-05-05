using FluentAssertions;
using Ulp.M1.Application.Parties;
using Ulp.M1.Domain.Entities;
using Ulp.TestKit.Theories;
using Xunit;

namespace Ulp.M1.Tests;

/// <summary>
/// Validation tests for CreateParty/UpdateParty per LLD §3.
/// Country-aware via [CountryAwareData] — same rules apply for IN and US tenants.
/// </summary>
public class PartyValidatorTests
{
    [Theory]
    [CountryAwareData]
    public async Task Create_RequiresCountryAndLegalName(string country, string currency, string locale, string tz)
    {
        _ = (currency, locale, tz);
        var v = new CreatePartyValidator();

        var bad = new CreatePartyRequest("", PartyType.Customer, "", null, null, null, null, null, null, null, null);
        var r = await v.ValidateAsync(bad);
        r.IsValid.Should().BeFalse();
        r.Errors.Should().Contain(e => e.PropertyName == nameof(CreatePartyRequest.CountryCode));
        r.Errors.Should().Contain(e => e.PropertyName == nameof(CreatePartyRequest.LegalName));

        var good = new CreatePartyRequest(country, PartyType.Customer, "Acme Logistics " + country,
            null, null, null, null, null, null, null, null);
        var rg = await v.ValidateAsync(good);
        rg.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("ind")]
    [InlineData("USA")]
    [InlineData("X")]
    public async Task Create_RejectsBadCountryLength(string code)
    {
        var v = new CreatePartyValidator();
        var bad = new CreatePartyRequest(code, PartyType.Vendor, "Test", null, null, null, null, null, null, null, null);
        var r = await v.ValidateAsync(bad);
        r.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Create_RejectsBadCurrencyLength()
    {
        var v = new CreatePartyValidator();
        var bad = new CreatePartyRequest("IN", PartyType.Customer, "Acme", null, null, null, "INRX", null, null, null, null);
        var r = await v.ValidateAsync(bad);
        r.IsValid.Should().BeFalse();
        r.Errors.Should().Contain(e => e.PropertyName == nameof(CreatePartyRequest.PreferredCurrency));
    }

    [Fact]
    public async Task Create_AcceptsIdentifiers()
    {
        var v = new CreatePartyValidator();
        var req = new CreatePartyRequest(
            "IN", PartyType.Customer, "Acme", null, null, null, "INR", null, null, null,
            new[] {
                new CreatePartyIdentifierRequest("PAN",   "ABCDE1234F", true),
                new CreatePartyIdentifierRequest("GSTIN", "27ABCDE1234F1Z5", false),
            });
        var r = await v.ValidateAsync(req);
        r.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Update_RequiresLegalName()
    {
        var v = new UpdatePartyValidator();
        var bad = new UpdatePartyRequest(PartyType.Vendor, "", null, null, true, null, null, null, null, null);
        var r = await v.ValidateAsync(bad);
        r.IsValid.Should().BeFalse();
    }
}
