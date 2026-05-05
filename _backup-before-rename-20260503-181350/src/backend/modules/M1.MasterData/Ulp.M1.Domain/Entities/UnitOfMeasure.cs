namespace Ulp.M1.Domain.Entities;

/// <summary>
/// Unit of measure. Per ULP_LLD_M1_v2.0_MasterData.docx §8.3.
/// Universal — no tenant scope. Pre-seeded with length, weight, volume,
/// container, and counting units.
/// </summary>
public sealed class UnitOfMeasure
{
    public string Code { get; set; } = "";        // PK e.g. "KG", "TEU"
    public string Name { get; set; } = "";
    public UomCategory Category { get; set; }
    public decimal? BaseFactor { get; set; }       // multiplier to base unit (e.g., 0.001 from G to KG)
    public string? BaseUomCode { get; set; }       // base unit reference
    public bool IsActive { get; set; } = true;
}

public enum UomCategory
{
    Length,
    Weight,
    Volume,
    Container,
    Count,
    Time,
    Other,
}
