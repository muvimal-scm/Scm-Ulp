namespace Ulp.M1.Domain.Entities;

/// <summary>
/// ISO 4217 currency. Per ULP_LLD_M1_v2.0_MasterData.docx §7.
/// </summary>
public sealed class Currency
{
    public string Code { get; set; } = "";          // alpha-3 (PK)
    public short? NumericCode { get; set; }
    public string Name { get; set; } = "";
    public string? Symbol { get; set; }              // ₹, $, €, £
    public byte DecimalDigits { get; set; }          // 2 for INR/USD; 0 for JPY
    public string? DefaultCountry { get; set; }
    public bool IsActive { get; set; }
}
