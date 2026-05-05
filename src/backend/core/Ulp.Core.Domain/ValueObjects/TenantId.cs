namespace Ulp.Core.Domain.ValueObjects;

/// <summary>
/// Strongly-typed tenant identifier. Stored as ULID (lexicographically sortable, 26 chars).
/// Wrapping the ID prevents accidental cross-pollination with other identifiers.
/// </summary>
public readonly record struct TenantId
{
    public string Value { get; }

    public TenantId(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("tenant id must not be empty", nameof(value));
        Value = value;
    }

    public static TenantId New() => new(global::System.Ulid.NewUlid().ToString());

    public override string ToString() => Value;
    public static implicit operator string(TenantId t) => t.Value;
}
