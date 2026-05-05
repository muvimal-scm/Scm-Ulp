using NodaTime;
using Ulp.Core.Domain.Entities;
using Ulp.Core.Domain.ValueObjects;

namespace Ulp.MasterData.Domain.Entities;

/// <summary>
/// Product master. Per ULP_LLD_M1_v2.0_MasterData.docx Â§5.
/// Classification fields (HS / HSN / HTSUS / Schedule B) coexist â€”
/// each tenant uses the ones relevant to its country / trade flow.
/// </summary>
public sealed class Product : IEntity, ITenantScoped
{
    public long Id { get; set; }
    public TenantId TenantId { get; set; }
    public CountryCode CountryCode { get; set; }      // nullable in DB; products can be country-agnostic
    public string ProductCode { get; set; } = "";     // unique per tenant
    public string ProductName { get; set; } = "";
    public string? ProductDescription { get; set; }
    public ProductType ProductType { get; set; }
    public string UomCode { get; set; } = "";         // FK â†’ m1_uom.code
    public decimal? WeightKg { get; set; }
    public decimal? VolumeCbm { get; set; }

    // Classification â€” multi-system per LLD Â§5.1
    public string? HsCode { get; set; }               // universal HS 6-digit (WCO)
    public string? HsnCode { get; set; }              // IN: HSN 8-digit (CBIC)
    public string? HtsusCode { get; set; }            // US: HTSUS 10-digit (USITC)
    public string? ScheduleBCode { get; set; }        // US export 10-digit (Census)

    public string? TaxClass { get; set; }
    public string? CountryOfOrigin { get; set; }      // ISO alpha-2

    // Compliance flags
    public bool IsHazmat { get; set; }
    public bool IsPerishable { get; set; }
    public bool IsTemperatureControlled { get; set; }
    public bool IsDualUse { get; set; }                // export-control flag

    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

/// <summary>Per LLD Â§5 â€” enumeration of product types.</summary>
public enum ProductType
{
    Goods,
    Service,
    Bundle,
}
