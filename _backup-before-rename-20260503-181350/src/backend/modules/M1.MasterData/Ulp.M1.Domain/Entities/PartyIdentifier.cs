using NodaTime;

namespace Ulp.M1.Domain.Entities;

/// <summary>
/// Country-specific identifier attached to a <see cref="Party"/>.
/// Per ULP_LLD_M1_v2.0_MasterData.docx §3.1 — pluggable per country.
/// IN: PAN, GSTIN, TAN, CIN, IEC, AADHAAR.
/// US: EIN, SSN_LAST4, DUNS, ITIN, TIN.
/// Universal: DUNS, VAT, SCAC.
/// Validators (PanValidator, EinValidator, …) live in country plugins (Phase 3).
/// In Phase 1 records are stored with <see cref="IdentifierValidationStatus.Pending"/>.
/// </summary>
public sealed class PartyIdentifier
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long PartyId { get; set; }
    public string IdentifierType { get; set; } = "";  // "PAN" | "GSTIN" | "EIN" | …
    public string IdentifierValue { get; set; } = "";
    public bool IsPrimary { get; set; }
    public Instant? ValidatedAt { get; set; }
    public string? ValidationSource { get; set; }     // "GSTN" | "IRS_TIN_MATCH" | "manual"
    public IdentifierValidationStatus ValidationStatus { get; set; } = IdentifierValidationStatus.Pending;
    public Instant? ExpiresAt { get; set; }
    public byte[]? EncryptedValue { get; set; }       // for SSN, encrypted at rest
}

public enum IdentifierValidationStatus
{
    Pending,
    Valid,
    Invalid,
    Expired,
}
