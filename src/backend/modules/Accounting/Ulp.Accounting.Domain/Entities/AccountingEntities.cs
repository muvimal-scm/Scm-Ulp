using NodaTime;

namespace Ulp.Accounting.Domain.Entities;

// =====================================================================
// M17 Accounts — Core domain entities (per sealed LLD §3 + §5 + §6 + §7 + §8)
// Plugin extension entities (m17in_*) are in AccountingInEntities.cs.
// =====================================================================

// LLD §3.1 — Chart of Accounts
public sealed class Account
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string CountryCode { get; set; } = "";
    public string AccountCode { get; set; } = "";
    public string AccountName { get; set; } = "";
    public AccountClass AccountClass { get; set; }
    public long? ParentAccountId { get; set; }
    public bool IsControlAccount { get; set; }
    public bool IsPostable { get; set; } = true;
    public string DefaultCurrency { get; set; } = "INR";
    public bool IsActive { get; set; } = true;
    public Instant CreatedAt { get; set; }
}

public enum AccountClass { Asset, Liability, Equity, Revenue, Expense }

// LLD §3.3 — Period management
public sealed class Period
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public int FiscalYear { get; set; }
    public int PeriodNumber { get; set; }
    public string PeriodName { get; set; } = "";
    public LocalDate StartDate { get; set; }
    public LocalDate EndDate { get; set; }
    public PeriodStatus Status { get; set; } = PeriodStatus.Future;
    public Instant? ClosedAt { get; set; }
    public long? ClosedBy { get; set; }
    public int ReopenedCount { get; set; }
}

public enum PeriodStatus { Future, Open, SoftClose, Closed }

// LLD §4 — multi-currency FX rates (RBI for IN, FED for US)
public sealed class FxRate
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string FromCurrency { get; set; } = "";
    public string ToCurrency { get; set; } = "";
    public LocalDate RateDate { get; set; }
    public decimal Rate { get; set; }
    public string RateSource { get; set; } = "";
    public bool IsPeriodEnd { get; set; }
    public Instant CreatedAt { get; set; }
}

// LLD §3.2 — Journal header
public sealed class Journal
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string JournalNumber { get; set; } = "";
    public JournalType JournalType { get; set; }
    public LocalDate PostingDate { get; set; }
    public long PeriodId { get; set; }
    public string? Description { get; set; }
    public string? SourceModule { get; set; }
    public long? SourceRecordId { get; set; }
    public bool IsPosted { get; set; }
    public bool IsReversed { get; set; }
    public long? ReversalJournalId { get; set; }
    public Instant CreatedAt { get; set; }
    public long CreatedBy { get; set; }
    public Instant? PostedAt { get; set; }
    public long? PostedBy { get; set; }
}

public enum JournalType
{
    General, ArInvoice, ApBill, Payment, Receipt,
    PeriodClose, FxReval, OpeningBalance, Adjustment
}

// LLD §3.2 — Journal line
public sealed class JournalLine
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long JournalId { get; set; }
    public int LineNumber { get; set; }
    public long AccountId { get; set; }
    public decimal AmountOrig { get; set; }
    public string CurrencyOrig { get; set; } = "";
    public decimal AmountFunc { get; set; }
    public string CurrencyFunc { get; set; } = "";
    public decimal FxRate { get; set; }
    public LocalDate FxRateDate { get; set; }
    public DebitCredit DebitCredit { get; set; }
    public long? CostCenterId { get; set; }
    public long? ProjectId { get; set; }
    public long? PartyId { get; set; }
    public string? Reference { get; set; }
    public string? Description { get; set; }
}

public enum DebitCredit { Dr, Cr }

// LLD §5 — AR Invoice (state machine: Draft → PendingApproval → Approved → Posted → ...)
public sealed class Invoice
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string CountryCode { get; set; } = "";
    public string InvoiceNumber { get; set; } = "";
    public LocalDate InvoiceDate { get; set; }
    public LocalDate DueDate { get; set; }
    public long CustomerPartyId { get; set; }
    public string? BillToAddress { get; set; }
    public string? ShipToAddress { get; set; }
    public string Currency { get; set; } = "INR";
    public string FuncCurrency { get; set; } = "INR";
    public decimal FxRate { get; set; } = 1m;
    public decimal SubtotalAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string? PaymentTerms { get; set; }
    public string? Notes { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public long? PostedJournalId { get; set; }
    public Instant? PostedAt { get; set; }
    public long? PostedBy { get; set; }
    public string? VoidReason { get; set; }
    public string? SourceModule { get; set; }
    public long? SourceRecordId { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum InvoiceStatus
{
    Draft, PendingApproval, Approved, Posted,
    PartiallyPaid, Paid, Overdue, WrittenOff, Void
}

public sealed class InvoiceLine
{
    public long Id { get; set; }
    public long InvoiceId { get; set; }
    public int LineNumber { get; set; }
    public string Description { get; set; } = "";
    public string? HsnCode { get; set; }
    public decimal Quantity { get; set; } = 1m;
    public string? UomCode { get; set; }
    public decimal UnitPriceAmount { get; set; }
    public string UnitPriceCurrency { get; set; } = "INR";
    public decimal LineAmount { get; set; }
    public string? TaxClass { get; set; }
    public decimal? TaxRatePct { get; set; }
    public decimal TaxAmount { get; set; }
    public long? AccountId { get; set; }
    public long? CostCenterId { get; set; }
    public long? ProjectId { get; set; }
}

// LLD §5.3 — Receipts and matching
public sealed class Receipt
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string CountryCode { get; set; } = "";
    public string ReceiptNumber { get; set; } = "";
    public LocalDate ReceiptDate { get; set; }
    public long CustomerPartyId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public PaymentMethod PaymentMethod { get; set; }
    public string? BankReference { get; set; }
    public decimal UnmatchedAmount { get; set; }
    public ReceiptStatus Status { get; set; } = ReceiptStatus.Received;
    public long? PostedJournalId { get; set; }
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum PaymentMethod { Cash, Cheque, BankTransfer, Card, Upi, Neft, Rtgs, Imps, Nach, Ach, Wire, Other }
public enum ReceiptStatus { Received, PartiallyMatched, Matched, Refunded }

public sealed class ReceiptMatch
{
    public long Id { get; set; }
    public long ReceiptId { get; set; }
    public long InvoiceId { get; set; }
    public decimal MatchedAmount { get; set; }
    public Instant MatchedAt { get; set; }
    public long? MatchedBy { get; set; }
    public bool IsAuto { get; set; }
}

// LLD §6 — AP Bill
public sealed class Bill
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string CountryCode { get; set; } = "";
    public string BillNumber { get; set; } = "";       // vendor's invoice ref
    public string InternalNumber { get; set; } = "";   // our internal AP ref
    public LocalDate BillDate { get; set; }
    public LocalDate DueDate { get; set; }
    public long VendorPartyId { get; set; }
    public string Currency { get; set; } = "INR";
    public string FuncCurrency { get; set; } = "INR";
    public decimal FxRate { get; set; } = 1m;
    public decimal SubtotalAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal WithholdingAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Notes { get; set; }
    public BillStatus Status { get; set; } = BillStatus.Draft;
    public long? PostedJournalId { get; set; }
    public Instant? PostedAt { get; set; }
    public long? PostedBy { get; set; }
    public string? SourceModule { get; set; }
    public long? SourceRecordId { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum BillStatus
{
    Draft, PendingApproval, Approved, Posted,
    PartiallyPaid, Paid, Overdue, Disputed, Cancelled
}

public sealed class BillLine
{
    public long Id { get; set; }
    public long BillId { get; set; }
    public int LineNumber { get; set; }
    public string Description { get; set; } = "";
    public string? HsnCode { get; set; }
    public decimal Quantity { get; set; } = 1m;
    public string? UomCode { get; set; }
    public decimal UnitPriceAmount { get; set; }
    public decimal LineAmount { get; set; }
    public string? TaxClass { get; set; }
    public decimal? TaxRatePct { get; set; }
    public decimal TaxAmount { get; set; }
    public long? AccountId { get; set; }
    public long? CostCenterId { get; set; }
    public long? ProjectId { get; set; }
}

// LLD §6.3 — AP payments
public sealed class Payment
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string CountryCode { get; set; } = "";
    public string PaymentNumber { get; set; } = "";
    public LocalDate PaymentDate { get; set; }
    public long VendorPartyId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public decimal WithholdingAmount { get; set; }
    public decimal NetAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string? BankReference { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public long? ApprovedBy { get; set; }
    public Instant? ApprovedAt { get; set; }
    public long? PostedJournalId { get; set; }
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum PaymentStatus { Pending, Approved, Sent, Cleared, Failed, Cancelled }

public sealed class PaymentAlloc
{
    public long Id { get; set; }
    public long PaymentId { get; set; }
    public long BillId { get; set; }
    public decimal AllocatedAmount { get; set; }
    public Instant AllocatedAt { get; set; }
}

// LLD §7.2 — Period close checklist (universal + plugin-injected items)
public sealed class CloseChecklist
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long PeriodId { get; set; }
    public CloseChecklistStatus Status { get; set; } = CloseChecklistStatus.NotStarted;
    public Instant? StartedAt { get; set; }
    public Instant? CompletedAt { get; set; }
    public long? StartedBy { get; set; }
    public long? CompletedBy { get; set; }
}

public enum CloseChecklistStatus { NotStarted, InProgress, Completed, Cancelled }

public sealed class CloseChecklistItem
{
    public long Id { get; set; }
    public long ChecklistId { get; set; }
    public int SeqNo { get; set; }
    public string ItemCode { get; set; } = "";
    public string ItemLabel { get; set; } = "";
    public bool IsPluginInjected { get; set; }
    public CloseItemStatus Status { get; set; } = CloseItemStatus.Pending;
    public Instant? DoneAt { get; set; }
    public long? DoneBy { get; set; }
    public string? Notes { get; set; }
}

public enum CloseItemStatus { Pending, Done, Skipped }

// LLD §8.2 — append-only audit log
public sealed class AuditLog
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public Instant OccurredAt { get; set; }
    public long UserId { get; set; }
    public AuditAction Action { get; set; }
    public string EntityType { get; set; } = "";
    public long EntityId { get; set; }
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
    public string? Reason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}

public enum AuditAction
{
    Create, Update, Post, Reverse, Void, Delete,
    ClosePeriod, ReopenPeriod, Match, Unmatch, Approve, Reject
}
