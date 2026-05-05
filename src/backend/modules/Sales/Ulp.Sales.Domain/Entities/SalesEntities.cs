using NodaTime;

namespace Ulp.Sales.Domain.Entities;

/* ===================== Lead ===================== */
public sealed class Lead
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    CountryCode { get; set; } = "";
    public string    LeadNumber { get; set; } = "";
    public LeadSource Source { get; set; }
    public string    ContactName { get; set; } = "";
    public string?   CompanyName { get; set; }
    public string?   Email { get; set; }
    public string?   Phone { get; set; }
    public string?   Industry { get; set; }
    public string?   EstimatedVolume { get; set; }
    public LeadStage Stage { get; set; } = LeadStage.New;
    public long?     OwnerUserId { get; set; }
    public long?     ConvertedPartyId { get; set; }
    public Instant   CreatedAt { get; set; }
    public Instant   ModifiedAt { get; set; }
}

public enum LeadSource { Web, Referral, ColdCall, Event, Partner, ExistingCustomer, Other }
public enum LeadStage  { New, Contacted, Qualified, Disqualified, Converted }

/* ===================== Opportunity ===================== */
public sealed class Opportunity
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    CountryCode { get; set; } = "";
    public string    OppNumber { get; set; } = "";
    public long      PartyId { get; set; }
    public string    Title { get; set; } = "";
    public decimal?  EstimatedValue { get; set; }
    public string?   EstimatedCurrency { get; set; }
    public LocalDate? ExpectedClose { get; set; }
    public decimal?  ProbabilityPct { get; set; }
    public OppStage  Stage { get; set; } = OppStage.Prospecting;
    public long?     OwnerUserId { get; set; }
    public Instant   CreatedAt { get; set; }
    public Instant   ModifiedAt { get; set; }
}

public enum OppStage { Prospecting, Qualification, Proposal, Negotiation, ClosedWon, ClosedLost }

/* ===================== Activity ===================== */
public sealed class Activity
{
    public long          Id { get; set; }
    public int           TenantId { get; set; }
    public RelatedTo     RelatedTo { get; set; }
    public long          RelatedId { get; set; }
    public ActivityType  ActivityType { get; set; }
    public string?       Subject { get; set; }
    public Instant       OccurredAt { get; set; }
    public long?         OwnerUserId { get; set; }
    public string?       DetailsJson { get; set; }
}

public enum RelatedTo    { Lead, Opp, Party }
public enum ActivityType { Call, Email, Meeting, Note, Task }

/* ===================== Campaign ===================== */
public sealed class Campaign
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    Name { get; set; } = "";
    public CampaignChannel Channel { get; set; }
    public string?   AudienceFilterJson { get; set; }
    public string?   TemplateCode { get; set; }
    public Instant?  ScheduledAt { get; set; }
    public CampaignStatus Status { get; set; } = CampaignStatus.Draft;
    public int       SentCount { get; set; }
    public int       DeliveredCount { get; set; }
    public Instant   CreatedAt { get; set; }
}

public enum CampaignChannel { Email, Sms, Whatsapp }
public enum CampaignStatus  { Draft, Scheduled, Sending, Sent, Cancelled }

public sealed class CampaignTarget
{
    public long      Id { get; set; }
    public long      CampaignId { get; set; }
    public long      PartyId { get; set; }
    public CampaignTargetStatus Status { get; set; } = CampaignTargetStatus.Pending;
    public Instant?  SentAt { get; set; }
}

public enum CampaignTargetStatus { Pending, Sent, Delivered, Bounced, Failed }

/* ===================== RFQ ===================== */
public sealed class RfqRequest
{
    public long       Id { get; set; }
    public int        TenantId { get; set; }
    public string     RfqNumber { get; set; } = "";
    public long       PartyId { get; set; }
    public Instant    RequestedAt { get; set; }
    public LocalDate? DueDate { get; set; }
    public RfqStatus  Status { get; set; } = RfqStatus.Open;
    public string?    Notes { get; set; }
}

public enum RfqStatus { Open, InResponse, Closed, Cancelled }

public sealed class RfqLine
{
    public long     Id { get; set; }
    public long     RfqRequestId { get; set; }
    public int      LineNumber { get; set; }
    public string   Description { get; set; } = "";
    public decimal? Quantity { get; set; }
    public string?  UomCode { get; set; }
}

public sealed class RfqResponse
{
    public long      Id { get; set; }
    public long      RfqRequestId { get; set; }
    public long      VendorPartyId { get; set; }
    public decimal?  ResponseAmount { get; set; }
    public string?   ResponseCurrency { get; set; }
    public LocalDate? ValidUntil { get; set; }
    public string?   Notes { get; set; }
    public Instant   ReceivedAt { get; set; }
    public bool      IsWinner { get; set; }
}

/* ===================== Quote link ===================== */
public sealed class QuoteLink
{
    public long QuoteId { get; set; }
    public long OpportunityId { get; set; }
}

/* ===================== Pipeline stage ===================== */
public sealed class PipelineStage
{
    public long     Id { get; set; }
    public int      TenantId { get; set; }
    public string   Code { get; set; } = "";
    public string   Name { get; set; } = "";
    public int      Sequence { get; set; }
    public decimal? DefaultProbabilityPct { get; set; }
}

/* ===================== Forecast snapshot ===================== */
public sealed class ForecastSnapshot
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public long?   OwnerUserId { get; set; }
    public string  Period { get; set; } = "";
    public string  SnapshotJson { get; set; } = "";
    public Instant TakenAt { get; set; }
}

/* ===================== Audit ===================== */
public sealed class M2Audit
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public M2EntityType EntityType { get; set; }
    public long    EntityId { get; set; }
    public string  Action { get; set; } = "";
    public long    PerformedBy { get; set; }
    public Instant PerformedAt { get; set; }
    public string? DetailsJson { get; set; }
}

public enum M2EntityType { Lead, Opp, Activity, Campaign, Rfq }
