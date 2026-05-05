namespace Ulp.Core.Domain.ValueObjects;

/// <summary>ISO 3166-1 alpha-2 country code. Validated at construction.</summary>
public readonly record struct CountryCode
{
    public string Value { get; }

    public CountryCode(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length != 2)
            throw new ArgumentException($"country code must be ISO 3166-1 alpha-2 (2 letters), got '{value}'", nameof(value));
        Value = value.ToUpperInvariant();
    }

    public static readonly CountryCode India = new("IN");
    public static readonly CountryCode UnitedStates = new("US");

    public override string ToString() => Value;
    public static implicit operator string(CountryCode c) => c.Value;
}
