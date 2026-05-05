---
name: money-type-multicurrency
description: ULP v2.0 Money type — strongly-typed monetary value (amount + currency) replacing bare decimal across all modules. Use whenever code touches money: invoice totals, tax amounts, payments, payroll, prices, fees. Money enforces same-currency operations, banker's rounding to currency-minor units, and proper API serialisation. NEVER use bare decimal for money in v2.0.
---

# Money Type and Multi-Currency for ULP v2.0

## When this skill triggers
Any code modelling, computing, persisting, serialising, or displaying monetary values. Replaces every `decimal` field that represented money in v1.0. Required across M17 Accounts, M18/M19/M20 (US), M2 Orders, M5/M6 Freight, M13 Transportation, and the API layer.

## Top 3 reference repos
1. **dotnet/runtime** (https://github.com/dotnet/runtime) — `System.Decimal` semantics; relevant for understanding precision and rounding.
2. **NodaMoney/NodaMoney** (https://github.com/NodaMoney/NodaMoney) — community library that aligns closely with our `Money` type design.
3. **JavaMoney/jsr354-api** (https://github.com/JavaMoney/jsr354-api) — JSR-354 reference; the design principles transfer directly.

## The type

```csharp
public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money Zero(string currency) => new(0m, currency);

    public Money Add(Money other)
    {
        if (other.Currency != Currency)
            throw new InvalidOperationException(
                $"cannot add Money in different currencies: {Currency} vs {other.Currency}");
        return new Money(Amount + other.Amount, Currency);
    }

    public Money Subtract(Money other)  { /* same-currency check */ }
    public Money Multiply(decimal factor) => new(Amount * factor, Currency);
    public Money Round() => new(Math.Round(Amount, MinorUnits[Currency], MidpointRounding.ToEven), Currency);

    public static readonly IReadOnlyDictionary<string, int> MinorUnits = new Dictionary<string, int>
    {
        ["INR"] = 2, ["USD"] = 2, ["EUR"] = 2, ["GBP"] = 2,
        ["JPY"] = 0, ["KRW"] = 0,
        ["BHD"] = 3, ["KWD"] = 3, ["OMR"] = 3
    };
}
```

Key design choices:
- `record struct` — value semantics, equality by amount + currency.
- `decimal` for amount — precise; never `double`/`float`.
- Currency as `string` (ISO 4217 alpha-3) — keeps it simple; validated at construction or at the API edge.
- Banker's rounding to currency minor units — `MidpointRounding.ToEven` for fairness over many transactions.
- Same-currency operation enforcement — throws on mismatch; conversion is an explicit step via `IFxRateProvider`.

## Database storage convention

```sql
-- v2.0 standard for money columns
ALTER TABLE invoice
  ADD COLUMN total_amount   DECIMAL(19, 4) NOT NULL,
  ADD COLUMN total_currency CHAR(3)        NOT NULL DEFAULT 'INR';
-- 19,4 gives headroom; the type rounds to currency minor units (2 dp for INR/USD).
```

Always pair `_amount` + `_currency`. EF Core configuration:

```csharp
modelBuilder.Entity<Invoice>(b =>
{
    b.Property(i => i.Total)
     .HasConversion(
        m => m.Amount,
        v => new Money(v, /* paired currency column */))   // see complex-type below
     .HasColumnName("total_amount")
     .HasPrecision(19, 4);

    b.Property<string>("TotalCurrency")
     .HasColumnName("total_currency").HasMaxLength(3);
});
// In .NET 8 EF, prefer ComplexProperty for cleaner mapping:
modelBuilder.Entity<Invoice>().ComplexProperty(i => i.Total, b => {
    b.Property(m => m.Amount).HasColumnName("total_amount").HasPrecision(19,4);
    b.Property(m => m.Currency).HasColumnName("total_currency").HasMaxLength(3);
});
```

## API serialisation

JSON convention (used in API Specification v2.0):

```json
{
  "subtotal": { "amount": "1000.00", "currency": "INR" },
  "tax":      { "amount": "180.00",  "currency": "INR" },
  "total":    { "amount": "1180.00", "currency": "INR" }
}
```

- `amount` is a **string** in JSON to preserve precision across JS clients (where numbers are double).
- Custom converter:

```csharp
public class MoneyJsonConverter : JsonConverter<Money>
{
    public override Money Read(ref Utf8JsonReader r, Type t, JsonSerializerOptions o)
    {
        using var doc = JsonDocument.ParseValue(ref r);
        var amt = decimal.Parse(doc.RootElement.GetProperty("amount").GetString()!,
                                CultureInfo.InvariantCulture);
        var ccy = doc.RootElement.GetProperty("currency").GetString()!;
        return new Money(amt, ccy);
    }
    public override void Write(Utf8JsonWriter w, Money value, JsonSerializerOptions o)
    {
        w.WriteStartObject();
        w.WriteString("amount", value.Amount.ToString("F" + Money.MinorUnits[value.Currency],
                                                     CultureInfo.InvariantCulture));
        w.WriteString("currency", value.Currency);
        w.WriteEndObject();
    }
}
```

## Locale-aware display

Server emits raw Money; client formats with locale:

```typescript
// Angular / TS
const formatted = new Intl.NumberFormat(tenant.locale, {
  style: 'currency', currency: money.currency
}).format(parseFloat(money.amount));
// → "₹1,180.00" for en-IN, "$1,180.00" for en-US
```

## DO and DON'T

| DO | DON'T |
|---|---|
| Use `Money` everywhere money flows | Don't introduce `decimal amount` fields ever |
| Store amount + currency as paired columns | Don't store amount without currency next to it |
| Serialise `amount` as JSON **string** | Don't serialise as JSON number (precision loss) |
| Round only at boundaries (display, posting) | Don't round at every intermediate calc |
| Use `MidpointRounding.ToEven` | Don't use default `Math.Round` (away-from-zero default differs across platforms) |
| Format with `Intl.NumberFormat(locale)` on the client | Don't format with `toFixed()` or hardcode currency symbol |

## FX conversions
Cross-currency operations are **explicit only**:

```csharp
public interface IFxRateProvider
{
    Task<Money> ConvertAsync(Money source, string targetCurrency, DateOnly asOf, CancellationToken ct);
}
```

Never auto-convert inside arithmetic. Conversion ALWAYS records the rate + as-of date for audit.

## Common pitfalls
- Forgetting to round before persistence → 1234.56789 stored, displays as something different elsewhere.
- Mixing currencies via implicit conversion → `Money` throws; that's the design.
- Using `double` anywhere — always `decimal`.
- API contract regressions: don't change `amount` from string to number in a non-breaking release.

## See also
- `compliance-plugin-pattern` — `ITaxProvider` returns `Money`, never `decimal`.
- `multi-region-tenant-context` — `tenant.CurrencyCode` is the default currency for new objects.
- `efcore-mysql-pomelo` — for the `ComplexProperty` mapping convention.
