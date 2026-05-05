namespace Ulp.MasterData.Domain.Entities;

/// <summary>
/// Port master. Per ULP_LLD_M1_v2.0_MasterData.docx Â§8.2.
/// Universal master keyed on UN/LOCODE; CBP Schedule D code captured
/// for US ports for customs filing.
/// </summary>
public sealed class Port
{
    public long Id { get; set; }
    public string UnLocode { get; set; } = "";        // unique
    public string CountryCode { get; set; } = "";
    public string Name { get; set; } = "";
    public PortType PortType { get; set; }
    public string? CbpScheduleD { get; set; }          // US-only
    public bool IsActive { get; set; } = true;
}

public enum PortType
{
    Sea,
    Air,
    Land,
    Rail,
    Multimodal,
}
