namespace Ulp.MasterData.Domain.Entities;

/// <summary>
/// State/UT/province. Per ULP_LLD_M1_v2.0_MasterData.docx Â§6.
/// IN: 28 states + 8 UTs. US: 50 states + DC + 5 territories.
/// </summary>
public sealed class StateOrProvince
{
    public long Id { get; set; }
    public string CountryCode { get; set; } = "";
    public string Code { get; set; } = "";              // "MH" (IN), "CA" (US)
    public string Name { get; set; } = "";
    public bool IsSpecial { get; set; }                 // IN: UT vs state; US: territory vs state
    public string? CapitalCity { get; set; }
    public string? TimeZone { get; set; }
}
