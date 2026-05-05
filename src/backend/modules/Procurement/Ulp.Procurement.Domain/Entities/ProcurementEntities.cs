using NodaTime;

namespace Ulp.Procurement.Domain.Entities;

/* ===================== Purchase request ===================== */
public sealed class PurchaseRequest
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    CountryCode { get; set; } = "";
    public string    PrNumber { get; set; } = "";
    public long?     RequestedBy { get; set; }
    public string?   Department { get; set; }
    public PrStatus  Status { get; set; } = PrStatus.Draft;
    public LocalDate? NeededBy { get; set; }
    public string?   Notes { get; set; }
    public Instant   CreatedAt { get; set; }
    public Instant   ModifiedAt { get; set; }
}

public enum PrStatus { Draft, Submitted, Approved, Rejected, Closed }

public sealed class PurchaseRequestLine
{
    public long     Id { get; set; }
    public long     PrId { get; set; }
    public int      LineNo { get; set; }
    public long?    ProductId { get; set; }
    public string   Description { get; set; } = "";
    public decimal? Quantity { get; set; }
    public string?  UomCode { get; set; }
    public decimal? EstimatedUnitPriceAmount { get; set; }
    public string?  EstimatedUnitPriceCurrency { get; set; }
}

/* ===================== RFQ (procurement-side) ===================== */
public sealed class Rfq
{
    public long       Id { get; set; }
    public int        TenantId { get; set; }
    public string     CountryCode { get; set; } = "";
    public string     RfqNumber { get; set; } = "";
    public LocalDate? DueDate { get; set; }
    public RfqStatus  Status { get; set; } = RfqStatus.Open;
    public long?      ScopePrId { get; set; }
    public string?    Notes { get; set; }
    public Instant    CreatedAt { get; set; }
}

public enum RfqStatus { Open, InResponse, Closed, Cancelled }

public sealed class RfqRecipient
{
    public long      Id { get; set; }
    public long      RfqId { get; set; }
    public long      VendorPartyId { get; set; }
    public Instant?  SentAt { get; set; }
    public RfqRecipientStatus ResponseStatus { get; set; } = RfqRecipientStatus.NotSent;
}

public enum RfqRecipientStatus { NotSent, Sent, Acknowledged, Responded, Declined, Expired }

public sealed class RfqResponse
{
    public long      Id { get; set; }
    public long      RfqId { get; set; }
    public long      VendorPartyId { get; set; }
    public decimal?  TotalAmount { get; set; }
    public string?   TotalCurrency { get; set; }
    public LocalDate? ValidUntil { get; set; }
    public long?     DocumentId { get; set; }
    public string?   Notes { get; set; }
    public Instant   ReceivedAt { get; set; }
    public bool      IsWinner { get; set; }
}

/* ===================== Purchase order ===================== */
public sealed class PurchaseOrder
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    CountryCode { get; set; } = "";
    public string    PoNumber { get; set; } = "";
    public long      VendorPartyId { get; set; }
    public long?     RfqId { get; set; }
    public PoStatus  Status { get; set; } = PoStatus.Draft;
    public decimal?  TotalAmount { get; set; }
    public string?   TotalCurrency { get; set; }
    public LocalDate? ExpectedDeliveryDate { get; set; }
    public string?   PaymentTerms { get; set; }
    public string?   Notes { get; set; }
    public Instant   CreatedAt { get; set; }
    public Instant   ModifiedAt { get; set; }
}

public enum PoStatus { Draft, Approved, Sent, PartialReceipt, Closed, Cancelled }

public sealed class PurchaseOrderLine
{
    public long     Id { get; set; }
    public long     PoId { get; set; }
    public int      LineNo { get; set; }
    public long?    ProductId { get; set; }
    public string   Description { get; set; } = "";
    public decimal? QuantityOrdered { get; set; }
    public decimal? QuantityReceived { get; set; }
    public string?  UomCode { get; set; }
    public decimal? UnitPriceAmount { get; set; }
    public string?  UnitPriceCurrency { get; set; }
}

/* ===================== Goods receipt ===================== */
public sealed class GoodsReceipt
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public long      PoId { get; set; }
    public string    GrnNumber { get; set; } = "";
    public Instant   ReceivedAt { get; set; }
    public long?     ReceivedBy { get; set; }
    public long?     M8GrnId { get; set; }
    public GrnStatus Status { get; set; } = GrnStatus.Draft;
    public string?   Remarks { get; set; }
}

public enum GrnStatus { Draft, Posted, Reversed }

public sealed class GoodsReceiptLine
{
    public long     Id { get; set; }
    public long     GrId { get; set; }
    public long     PoLineId { get; set; }
    public decimal  QuantityReceived { get; set; }
    public GoodsCondition Cond { get; set; } = GoodsCondition.Good;
    public string?  Remarks { get; set; }
}

public enum GoodsCondition { Good, Damaged, Short, Excess }

/* ===================== Invoice match ===================== */
public sealed class InvoiceMatch
{
    public long       Id { get; set; }
    public int        TenantId { get; set; }
    public long       PoId { get; set; }
    public long?      VendorInvoiceId { get; set; }
    public string?    VendorInvoiceNo { get; set; }
    public MatchStatus MatchStatus { get; set; }
    public decimal?   VarianceAmount { get; set; }
    public string?    VarianceCurrency { get; set; }
    public long?      MatchedBy { get; set; }
    public Instant    MatchedAt { get; set; }
    public string?    Notes { get; set; }
}

public enum MatchStatus { ThreeWayMatched, PriceVariance, QtyVariance, NoPO, Disputed }

/* ===================== Audit ===================== */
public sealed class M7Audit
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public M7EntityType EntityType { get; set; }
    public long    EntityId { get; set; }
    public string  Action { get; set; } = "";
    public long    PerformedBy { get; set; }
    public Instant PerformedAt { get; set; }
    public string? DetailsJson { get; set; }
}

public enum M7EntityType { Pr, Rfq, Po, Grn, InvoiceMatch }
