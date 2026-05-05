using NodaTime;

namespace Ulp.MasterData.Domain.Entities;

/// <summary>
/// Generic catch-all for documents attached to a party that aren't a POA or
/// permit â€” agreements, tax filings, insurance certificates, bank docs, etc.
/// Per SCM Milestone 1 ("Misc Docs (agreements, additional info, etc)").
///
/// Schema: <c>m_party_misc_doc</c>. Backing file lives in M21 (DocumentId).
/// </summary>
public sealed class PartyMiscDoc
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public long      PartyId { get; set; }
    public MiscDocCategory DocCategory { get; set; } = MiscDocCategory.Other;
    public string    Title { get; set; } = "";
    public long?     DocumentId { get; set; }
    public LocalDate? EffectiveDate { get; set; }
    public LocalDate? ExpirationDate { get; set; }
    public string?   Notes { get; set; }
    public Instant   CreatedAt { get; set; }
}

public enum MiscDocCategory
{
    Agreement,
    Tax,
    Insurance,
    Bank,
    Other,
}
