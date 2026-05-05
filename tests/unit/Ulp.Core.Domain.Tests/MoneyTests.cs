using FluentAssertions;
using Ulp.Core.Domain.ValueObjects;
using Xunit;

namespace Ulp.Core.Domain.Tests;

public class MoneyTests
{
    [Fact]
    public void Add_SameCurrency_Sums()
    {
        var a = new Money(100m, "INR");
        var b = new Money(50m, "INR");
        (a + b).Should().Be(new Money(150m, "INR"));
    }

    [Fact]
    public void Add_DifferentCurrencies_Throws()
    {
        var inr = new Money(100m, "INR");
        var usd = new Money(50m, "USD");
        var act = () => inr.Add(usd);
        act.Should().Throw<InvalidOperationException>().WithMessage("*INR vs USD*");
    }

    [Theory]
    [InlineData("INR", 100.555, 100.56)]   // banker's rounding to 2dp
    [InlineData("USD", 100.555, 100.56)]
    [InlineData("JPY", 100.6, 101)]         // 0dp currency
    [InlineData("BHD", 100.5555, 100.556)]  // 3dp currency
    public void Round_AppliesBankersRoundingToCurrencyMinor(string ccy, decimal input, decimal expected)
    {
        new Money(input, ccy).Round().Amount.Should().Be(expected);
    }

    [Fact]
    public void Multiply_ScalesAmount_KeepsCurrency()
    {
        var m = new Money(100m, "USD") * 1.25m;
        m.Should().Be(new Money(125m, "USD"));
    }

    [Fact]
    public void Negate_Inverts()
    {
        (-new Money(100m, "INR")).Should().Be(new Money(-100m, "INR"));
    }
}
