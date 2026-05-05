namespace Ulp.M1.Domain.Entities;

/// <summary>
/// Reference: ISO 3166-1 country.
/// Per ULP_LLD_M1_v2.0_MasterData.docx §6.
/// Pre-populated by ulpReq/ULP_DBD_v2.0_Schema.sql (IN, US, GB, AE, SG).
/// </summary>
public sealed class Country
{
    public string Code { get; set; } = "";          // alpha-2 (PK)
    public string Code3 { get; set; } = "";          // alpha-3
    public short NumericCode { get; set; }
    public string Name { get; set; } = "";
    public string? Region { get; set; }
    public string DefaultCurrency { get; set; } = "";
    public string DefaultLocale { get; set; } = "";
    public string DefaultTimeZone { get; set; } = "";
    public bool IsSupported { get; set; }
}
