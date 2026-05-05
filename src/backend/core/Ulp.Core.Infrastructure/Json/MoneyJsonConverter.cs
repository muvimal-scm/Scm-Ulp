using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Ulp.Core.Domain.ValueObjects;

namespace Ulp.Core.Infrastructure.Json;

/// <summary>
/// Serialises <see cref="Money"/> as <c>{ "amount": "1180.00", "currency": "INR" }</c>.
/// <c>amount</c> is a JSON string to preserve precision across JS clients
/// (where numbers are double-precision and will lose trailing zeros / round at >15 sig digits).
/// </summary>
public sealed class MoneyJsonConverter : JsonConverter<Money>
{
    public override Money Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var doc = JsonDocument.ParseValue(ref reader);
        var amt = decimal.Parse(
            doc.RootElement.GetProperty("amount").GetString()!,
            NumberStyles.Number,
            CultureInfo.InvariantCulture);
        var ccy = doc.RootElement.GetProperty("currency").GetString()!;
        return new Money(amt, ccy);
    }

    public override void Write(Utf8JsonWriter writer, Money value, JsonSerializerOptions options)
    {
        var minor = Money.MinorUnits.TryGetValue(value.Currency, out var m) ? m : 2;
        writer.WriteStartObject();
        writer.WriteString("amount", value.Amount.ToString("F" + minor, CultureInfo.InvariantCulture));
        writer.WriteString("currency", value.Currency);
        writer.WriteEndObject();
    }
}
