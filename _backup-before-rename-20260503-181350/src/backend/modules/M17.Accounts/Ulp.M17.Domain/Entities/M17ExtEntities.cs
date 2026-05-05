using NodaTime;

namespace Ulp.M17.Domain.Entities;

// =====================================================================
// M17 finish — extension entities for SCM client Milestone 3 closure.
// Settlement links, bank reconciliation, multi-print batches, past-due
// notices, custom email templates, credit-card payments, general expense.
// =====================================================================

public sealed class SettlementLink
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long InvoiceLineId { get; set; }
    public long BillLineId { get; set; }
    public decimal LinkedAmount { get; set; }
    public string Currency { get; set; } = "INR";
    public string? Notes { get; set; }
    public SettlementLinkStatus Status { get; set; } = SettlementLinkStatus.Active;
    public Instant CreatedAt { get; set; }
    public long CreatedBy { get; set; }
    public Instant? ReversedAt { get; set; }
    public long? ReversedBy { get; set; }
    public string? ReversalReason { get; set; }
}

public enum SettlementLinkStatus { Active, Reversed }

public sealed class BankAccount
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string AccountCode { get; set; } = "";
    public string BankName { get; set; } = "";
    public string AccountNumberMasked { get; set; } = "";
    public BankAccountType AccountType { get; set; } = BankAccountType.Checking;
    public string Currency { get; set; } = "INR";
    public long? LedgerAccountId { get; set; }
    public string? RoutingNumber { get; set; }
    public string? SwiftCode { get; set; }
    public string? Iban { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal CurrentBalance { get; set; }
    public LocalDate? LastReconDate { get; set; }
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum BankAccountType { Checking, Savings, MoneyMarket, Cd, CreditLine }

public sealed class Deposit
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string DepositNumber { get; set; } = "";
    public LocalDate DepositDate { get; set; }
    public long BankAccountId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public DepositSource Source { get; set; }
    public long? ReceiptId { get; set; }
    public long? CustomerPartyId { get; set; }
    public string? CheckNumber { get; set; }
    public string? Notes { get; set; }
    public DepositStatus Status { get; set; } = DepositStatus.Pending;
    public Instant? ReversedAt { get; set; }
    public string? ReversalReason { get; set; }
    public Instant? ClearedAt { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum DepositSource { FromAr, Standalone }
public enum DepositStatus { Pending, Cleared, Reversed, Bounced }

public sealed class BankStatement
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long BankAccountId { get; set; }
    public string StatementPeriod { get; set; } = "";    // YYYY-MM
    public LocalDate StatementDate { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal ClosingBalance { get; set; }
    public decimal TotalDebits { get; set; }
    public decimal TotalCredits { get; set; }
    public BankStatementSource Source { get; set; } = BankStatementSource.Manual;
    public long? DocumentId { get; set; }
    public Instant UploadedAt { get; set; }
    public long UploadedBy { get; set; }
}

public enum BankStatementSource { Manual, Bai2, Ofx, Csv, Mt940 }

public sealed class BankStatementLine
{
    public long Id { get; set; }
    public long StatementId { get; set; }
    public LocalDate LineDate { get; set; }
    public string Description { get; set; } = "";
    public string? Reference { get; set; }
    public decimal Amount { get; set; }                    // negative=debit, positive=credit
    public decimal? RunningBalance { get; set; }
    public bool IsMatched { get; set; }
    public decimal? MatchConfidence { get; set; }
}

public sealed class BankRecon
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long BankAccountId { get; set; }
    public long StatementId { get; set; }
    public LocalDate ReconDate { get; set; }
    public BankReconStatus Status { get; set; } = BankReconStatus.Draft;
    public decimal BookBalance { get; set; }
    public decimal BankBalance { get; set; }
    public decimal Difference { get; set; }
    public int MatchedCount { get; set; }
    public int UnmatchedCount { get; set; }
    public string? Notes { get; set; }
    public Instant? CompletedAt { get; set; }
    public long? CompletedBy { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum BankReconStatus { Draft, InProgress, Completed, Discrepancy }

public sealed class BankReconMatch
{
    public long Id { get; set; }
    public long ReconId { get; set; }
    public long StatementLineId { get; set; }
    public BankReconTargetKind MatchTargetKind { get; set; }
    public long MatchTargetId { get; set; }
    public decimal MatchedAmount { get; set; }
    public bool IsAuto { get; set; }
    public Instant MatchedAt { get; set; }
    public long? MatchedBy { get; set; }
}

public enum BankReconTargetKind { Receipt, Payment, Deposit, Transfer, VoidedCheck, Adjustment }

public sealed class FundTransfer
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string TransferNumber { get; set; } = "";
    public LocalDate TransferDate { get; set; }
    public long FromBankId { get; set; }
    public long ToBankId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public decimal FxRate { get; set; } = 1m;
    public decimal ToAmount { get; set; }
    public string? BankReference { get; set; }
    public string? Notes { get; set; }
    public FundTransferStatus Status { get; set; } = FundTransferStatus.Pending;
    public long? PostedJournalId { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum FundTransferStatus { Pending, Sent, Cleared, Failed, Cancelled }

public sealed class VoidedCheck
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long BankAccountId { get; set; }
    public string CheckNumber { get; set; } = "";
    public LocalDate VoidDate { get; set; }
    public long? OriginalPaymentId { get; set; }
    public decimal? Amount { get; set; }
    public string? Payee { get; set; }
    public VoidReason VoidReason { get; set; } = VoidReason.Other;
    public string? Notes { get; set; }
    public long VoidedBy { get; set; }
    public Instant CreatedAt { get; set; }
}

public enum VoidReason { Misprint, Lost, Stale, PrintTest, UserVoid, Other }

public sealed class CheckPrintBatch
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string BatchNumber { get; set; } = "";
    public long BankAccountId { get; set; }
    public LocalDate PrintDate { get; set; }
    public string StartingCheckNo { get; set; } = "";
    public int CheckCount { get; set; }
    public decimal TotalAmount { get; set; }
    public string PaymentIdsJson { get; set; } = "[]";
    public CheckPrintBatchStatus Status { get; set; } = CheckPrintBatchStatus.Pending;
    public Instant? PrintedAt { get; set; }
    public long? PrintedBy { get; set; }
    public long? DocumentId { get; set; }
    public Instant CreatedAt { get; set; }
}

public enum CheckPrintBatchStatus { Pending, Printed, Cancelled }

public sealed class InvoicePrintBatch
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string BatchNumber { get; set; } = "";
    public LocalDate PrintDate { get; set; }
    public int InvoiceCount { get; set; }
    public string InvoiceIdsJson { get; set; } = "[]";
    public InvoicePrintBatchStatus Status { get; set; } = InvoicePrintBatchStatus.Pending;
    public PrintDeliveryMethod DeliveryMethod { get; set; } = PrintDeliveryMethod.Print;
    public Instant? PrintedAt { get; set; }
    public long? DocumentId { get; set; }
    public Instant CreatedAt { get; set; }
}

public enum InvoicePrintBatchStatus { Pending, Printed, Sent, Cancelled }
public enum PrintDeliveryMethod { Print, Email, Both }

public sealed class PastDueNotice
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string NoticeNumber { get; set; } = "";
    public long CustomerPartyId { get; set; }
    public PastDueLevel NoticeLevel { get; set; } = PastDueLevel.First;
    public decimal TotalOverdueAmount { get; set; }
    public string Currency { get; set; } = "INR";
    public int InvoiceCount { get; set; }
    public string InvoiceIdsJson { get; set; } = "[]";
    public LocalDate GeneratedAt { get; set; }
    public Instant? SentAt { get; set; }
    public PastDueDelivery DeliveryMethod { get; set; } = PastDueDelivery.Email;
    public PastDueStatus Status { get; set; } = PastDueStatus.Draft;
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum PastDueLevel    { First, Second, Final, LegalAction }
public enum PastDueDelivery { Email, Print, Both }
public enum PastDueStatus   { Draft, Sent, Acknowledged, Resolved }

public sealed class EmailTemplate
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string TemplateCode { get; set; } = "";
    public string TemplateName { get; set; } = "";
    public EmailTemplateCategory Category { get; set; }
    public string SubjectTemplate { get; set; } = "";
    public string BodyTemplate { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public bool IsPredefined { get; set; }
    public string? AvailablePlaceholdersJson { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum EmailTemplateCategory { Invoice, PastDue, Statement, Receipt, PaymentRemittance, Custom }

public sealed class CreditCardPayment
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long? ReceiptId { get; set; }
    public long? PaymentId { get; set; }
    public CardBrand CardBrand { get; set; }
    public string LastFour { get; set; } = "";
    public string? AuthorizationCode { get; set; }
    public string TransactionId { get; set; } = "";
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public CreditCardProofKind ProofKind { get; set; } = CreditCardProofKind.OnlineDocument;
    public long? ProofDocumentId { get; set; }
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
}

public enum CardBrand              { Visa, MasterCard, Amex, Discover, Other }
public enum CreditCardProofKind    { PhotoFromApp, OnlineDocument, PhysicalSlip }

public sealed class GeneralExpense
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string ExpenseNumber { get; set; } = "";
    public LocalDate ExpenseDate { get; set; }
    public GeneralExpenseKind ExpenseKind { get; set; }
    public string Description { get; set; } = "";
    public long ExpenseAccountId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public ExpenseRecurrence Recurrence { get; set; } = ExpenseRecurrence.OneTime;
    public LocalDate? NextRecurDate { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
    public long? PostedJournalId { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum GeneralExpenseKind { General, FixedGeneral }
public enum ExpenseRecurrence  { OneTime, Monthly, Quarterly, Yearly }
