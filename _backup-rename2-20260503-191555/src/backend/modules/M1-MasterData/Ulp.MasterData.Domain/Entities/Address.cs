using NodaTime;
using Ulp.Core.Domain.Entities;
using Ulp.Core.Domain.ValueObjects;

namespace Ulp.MasterData.Domain.Entities;

/// <summary>
/// Universal address. Per ULP_LLD_M1_v2.0_MasterData.docx Â§4.
/// IN: PIN code 6-digit, state name. US: ZIP 5/9-digit, state code.
/// Country-specific validation lives in plugins; Phase 1 stores only.
/// </summary>
public sealed class Address : IEntity, ITenantScoped
{
    public long Id { get; set; }
    public TenantId TenantId { get; set; }
    public long? PartyId { get; set; }                // nullable for one-off addresses
    public CountryCode CountryCode { get; set; }
    public string Line1 { get; set; } = "";
    public string? Line2 { get; set; }
    public string? Line3 { get; set; }
    public string City { get; set; } = "";
    public string StateOrProvince { get; set; } = "";
    public string? StateOrProvinceCode { get; set; }
    public string? PostalCode { get; set; }
    public string? CountyOrDistrict { get; set; }

    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? GeocodeSource { get; set; }
    public string? GeocodeQuality { get; set; }

    public Instant? VerifiedAt { get; set; }
    public string? VerificationSource { get; set; }

    public AddressType AddressType { get; set; }
    public bool IsPrimary { get; set; }

    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

/// <summary>Per LLD Â§4 â€” enumeration of address types.</summary>
public enum AddressType
{
    Billing,
    Shipping,
    Office,
    Warehouse,
    Mailing,
    TaxRegistered,
}
