namespace Ulp.Core.Domain.ValueObjects;

/// <summary>
/// Strongly-typed monetary value (amount + ISO 4217 currency).
/// Replaces every bare <c>decimal</c> that represented money in v1.0.
/// Same-currency operations are enforced; cross-currency requires explicit FX conversion.
/// </summary>
public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money Zero(string currency) => new(0m, currency);

    public Money Add(Money other) => SameCurrency(other, "add") with { Amount = Amount + other.Amount };

    public Money Subtract(Money other) => SameCurrency(other, "subtract") with { Amount = Amount - other.Amount };

    public Money Multiply(decimal factor) => new(Amount * factor, Currency);

    public Money Negate() => new(-Amount, Currency);

    public Money Round() => new(decimal.Round(Amount, MinorUnits[Currency], MidpointRounding.ToEven), Currency);

    public static Money operator +(Money a, Money b) => a.Add(b);
    public static Money operator -(Money a, Money b) => a.Subtract(b);
    public static Money operator -(Money a) => a.Negate();
    public static Money operator *(Money a, decimal f) => a.Multiply(f);

    private Money SameCurrency(Money other, string op)
    {
        if (other.Currency != Currency)
            throw new InvalidOperationException(
                $"cannot {op} Money in different currencies: {Currency} vs {other.Currency}");
        return this;
    }

    /// <summary>Minor-unit precision for ISO 4217 currencies used by ULP. Banker's rounding is applied.</summary>
    public static readonly IReadOnlyDictionary<string, int> MinorUnits = new Dictionary<string, int>
    {
        ["INR"] = 2, ["USD"] = 2, ["EUR"] = 2, ["GBP"] = 2, ["CAD"] = 2, ["AUD"] = 2, ["SGD"] = 2,
        ["JPY"] = 0, ["KRW"] = 0,
        ["BHD"] = 3, ["KWD"] = 3, ["OMR"] = 3,
    };
}
