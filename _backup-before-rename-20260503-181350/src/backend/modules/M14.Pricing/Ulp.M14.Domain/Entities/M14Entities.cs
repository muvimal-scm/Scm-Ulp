using NodaTime;

namespace Ulp.M14.Domain.Entities;

// LLD §2.1 — sell-side or buy-side rate card; multi-version.
public sealed class RateCard
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string CountryCode { get; set; } = "";
    public string CardNumber { get; set; } = "";
    public RateCardType CardType { get; set; }
    public RateCardScope Scope { get; set; }
    public long? PartyId { get; set; }
    public long? OriginPortId { get; set; }
    public long? DestinationPortId { get; set; }
    public string? ServiceType { get; set; }
    public LocalDate ValidFrom { get; set; }
    public LocalDate? ValidTo { get; set; }
    public string Currency { get; set; } = "INR";
    public RateCardStatus Status { get; set; } = RateCardStatus.Draft;
    public long? ApprovedBy { get; set; }
    public Instant? ApprovedAt { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum RateCardType   { Sell, Buy, InternalTransfer }
public enum RateCardScope  { General, Customer, Vendor, Lane, Service }
public enum RateCardStatus { Draft, Approved, Active, Expired, Cancelled }

// LLD §2.2
public sealed class RateCardLine
{
    public long Id { get; set; }
    public long RateCardId { get; set; }
    public int LineNumber { get; set; }
    public string ChargeCode { get; set; } = "";
    public string? Description { get; set; }
    public string UomCode { get; set; } = "";
    public decimal RateAmount { get; set; }
    public string RateCurrency { get; set; } = "";
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public bool IsTaxable { get; set; } = true;
    public string? TaxClass { get; set; }
}

// LLD §2.3
public sealed class RateBreakpoint
{
    public long Id { get; set; }
    public long RateLineId { get; set; }
    public decimal FromQty { get; set; }
    public decimal? ToQty { get; set; }
    public decimal RateAmount { get; set; }
    public string RateCurrency { get; set; } = "";
}

// LLD §2.4
public sealed class Surcharge
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public SurchargeType SurchargeType { get; set; }
    public decimal? Amount { get; set; }
    public string? Currency { get; set; }
    public decimal? Percent { get; set; }
    public LocalDate ValidFrom { get; set; }
    public LocalDate? ValidTo { get; set; }
    public long? OriginPortId { get; set; }
    public long? DestinationPortId { get; set; }
    public bool IsActive { get; set; } = true;
}

public enum SurchargeType { Fixed, PercentFreight, PerUnit }

// LLD §2.5
public sealed class Quote
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string QuoteNumber { get; set; } = "";
    public long CustomerPartyId { get; set; }
    public string? EnquiryRef { get; set; }
    public QuoteStatus Status { get; set; } = QuoteStatus.Draft;
    public long? OriginPortId { get; set; }
    public long? DestinationPortId { get; set; }
    public string? ServiceType { get; set; }
    public decimal? TotalAmount { get; set; }
    public string? TotalCurrency { get; set; }
    public LocalDate? ValidUntil { get; set; }
    public long? DocumentId { get; set; }
    public string? Notes { get; set; }
    public long CreatedBy { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum QuoteStatus { Draft, Sent, Accepted, Rejected, Expired, Converted }

// LLD §2.6
public sealed class QuoteLine
{
    public long Id { get; set; }
    public long QuoteId { get; set; }
    public int LineNumber { get; set; }
    public string ChargeCode { get; set; } = "";
    public string? Description { get; set; }
    public decimal? Quantity { get; set; }
    public string? UomCode { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? Amount { get; set; }
    public string? Currency { get; set; }
    public long? RateCardId { get; set; }
}

// LLD §2.7
public sealed class Contract
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string ContractNumber { get; set; } = "";
    public long CustomerPartyId { get; set; }
    public long? RateCardId { get; set; }
    public LocalDate StartDate { get; set; }
    public LocalDate? EndDate { get; set; }
    public bool AutoRenew { get; set; }
    public string? PaymentTerms { get; set; }
    public ContractStatus Status { get; set; } = ContractStatus.Draft;
    public long? DocumentId { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum ContractStatus { Draft, Active, Expiring, Expired, Terminated }

// LLD §2.8
public sealed class Lane
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long OriginPortId { get; set; }
    public long DestinationPortId { get; set; }
    public TransportMode Mode { get; set; }
    public int? TransitDays { get; set; }
    public string? Frequency { get; set; }
    public bool IsActive { get; set; } = true;
    public Instant CreatedAt { get; set; }
}

public enum TransportMode { OceanFcl, OceanLcl, Air, Road, Rail, Multimodal }

// LLD §2.9
public sealed class Zone
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string CountryCode { get; set; } = "";
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? PostalPattern { get; set; }
    public bool IsActive { get; set; } = true;
}

// LLD §2.10
public sealed class CurrencyFactor
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string BaseCurrency { get; set; } = "";
    public string QuoteCurrency { get; set; } = "";
    public decimal Factor { get; set; }
    public LocalDate ValidFrom { get; set; }
    public LocalDate? ValidTo { get; set; }
    public string? Source { get; set; }
}

// LLD §2.11
public sealed class QuoteRevision
{
    public long Id { get; set; }
    public long QuoteId { get; set; }
    public int RevisionNo { get; set; }
    public string SnapshotJson { get; set; } = "{}";
    public long CreatedBy { get; set; }
    public Instant CreatedAt { get; set; }
    public string? Notes { get; set; }
}

// LLD §2.12
public sealed class NegotiationRound
{
    public long Id { get; set; }
    public long QuoteId { get; set; }
    public int RoundNo { get; set; }
    public long PartyId { get; set; }
    public NegotiationAction Action { get; set; }
    public decimal? AmountOffered { get; set; }
    public string? Currency { get; set; }
    public string? Notes { get; set; }
    public Instant OccurredAt { get; set; }
}

public enum NegotiationAction { Offer, CounterOffer, Accept, Reject, Withdraw }

// LLD §2.13
public sealed class RateRequest
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string RequestNumber { get; set; } = "";
    public long? CustomerPartyId { get; set; }
    public long? OriginPortId { get; set; }
    public long? DestinationPortId { get; set; }
    public string? ServiceType { get; set; }
    public string? CargoDescription { get; set; }
    public Instant RequestedAt { get; set; }
    public LocalDate? DueDate { get; set; }
    public RateRequestStatus Status { get; set; } = RateRequestStatus.Open;
    public long CreatedBy { get; set; }
}

public enum RateRequestStatus { Open, Closed, Cancelled }

// LLD §2.14
public sealed class RateResponse
{
    public long Id { get; set; }
    public long RateRequestId { get; set; }
    public long VendorPartyId { get; set; }
    public decimal ResponseAmount { get; set; }
    public string ResponseCurrency { get; set; } = "";
    public LocalDate? ValidUntil { get; set; }
    public string? Notes { get; set; }
    public Instant ReceivedAt { get; set; }
    public bool IsWinner { get; set; }
}

// LLD §2.15
public sealed class M14Audit
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string EntityType { get; set; } = "";
    public long EntityId { get; set; }
    public string Action { get; set; } = "";
    public long PerformedBy { get; set; }
    public Instant PerformedAt { get; set; }
    public string? DetailsJson { get; set; }
}
