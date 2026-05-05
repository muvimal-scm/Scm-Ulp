using FluentAssertions;
using Ulp.Core.Domain.ValueObjects;
using Xunit;

namespace Ulp.Core.Domain.Tests;

public class CountryCodeTests
{
    [Theory]
    [InlineData("IN")]
    [InlineData("US")]
    [InlineData("us")]
    public void Construct_NormalisesToUpper(string input)
    {
        new CountryCode(input).Value.Should().Be(input.ToUpperInvariant());
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("USA")]
    [InlineData("I")]
    public void Construct_RejectsBadValues(string input)
    {
        var act = () => new CountryCode(input);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Constants_ReturnExpected()
    {
        CountryCode.India.Value.Should().Be("IN");
        CountryCode.UnitedStates.Value.Should().Be("US");
    }
}
