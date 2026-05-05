using NodaTime;

namespace Ulp.MasterData.Domain.Entities;

/// <summary>
/// Permit attached to a party â€” either at the company level (e.g., import/export
/// licence, FSSAI registration) or at the commodity level (commodity-specific
/// authorisation, often tied to an HS code or product). Per SCM Milestone 1.
///
/// Schema: <c>m_party_permit</c>. The two flavours share one table; the
/// <see cref="Kind"/> discriminator + nullable <see cref="HsCode"/> +
/// <see cref="ProductId"/> mark commodity permits.
/// </summary>
public sealed class PartyPermit
{
    public long       Id { get; set; }
    public int        TenantId { get; set; }
    public long       PartyId { get; set; }
    public PermitKind Kind { get; set; }
    public string     PermitCode { get; set; } = "";
    public string     PermitName { get; set; } = "";
    public string?    IssuingAuthority { get; set; }
    public string?    HsCode { get; set; }
    public long?      ProductId { get; set; }
    public LocalDate? EffectiveDate { get; set; }
    public LocalDate? ExpirationDate { get; set; }
    public PermitStatus Status { get; set; } = PermitStatus.Active;
    public long?      DocumentId { get; set; }
    public string?    Notes { get; set; }
    public Instant    CreatedAt { get; set; }
    public Instant    ModifiedAt { get; set; }
}

public enum PermitKind
{
    Company,
    Commodity,
}

public enum PermitStatus
{
    Active,
    Expiring,
    Expired,
    Suspended,
}
