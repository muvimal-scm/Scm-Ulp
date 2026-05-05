using NodaTime;

namespace Ulp.M1.Domain.Entities;

/// <summary>
/// Power of Attorney granted by a party (typically a customer / shipper) to a
/// broker / forwarder / agent. Required by SCM Milestone 1 for the Profiles
/// section so an operator can see at a glance which POAs are about to expire
/// or are still incomplete.
///
/// Schema: <c>m_party_poa</c> (cross-cutting, not module-prefixed because it
/// applies to any tenant party regardless of module ownership).
/// </summary>
public sealed class PartyPoa
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public long      PartyId { get; set; }
    public string?   PoaNumber { get; set; }
    public string?   GrantedTo { get; set; }
    public LocalDate? EffectiveDate { get; set; }
    public LocalDate? ExpirationDate { get; set; }
    public PoaStatus Status { get; set; } = PoaStatus.Incomplete;
    public long?     DocumentId { get; set; }
    public string?   Notes { get; set; }
    public Instant   CreatedAt { get; set; }
    public Instant   ModifiedAt { get; set; }
}

public enum PoaStatus
{
    Incomplete,
    Pending,
    Complete,
    Expired,
    Revoked,
}
