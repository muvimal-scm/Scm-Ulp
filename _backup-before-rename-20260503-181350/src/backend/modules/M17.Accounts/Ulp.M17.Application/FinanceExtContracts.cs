using NodaTime;
using Ulp.M17.Domain.Entities;

namespace Ulp.M17.Application;

// =====================================================================
// M17 finish — extension service contracts. Kept separate from
// IAccountsService to leave the sealed-LLD surface untouched.
// Closes SCM client Milestone 3 gaps.
// =====================================================================

public interface IFinanceExtService
{
    // Settlement links
    Task<IReadOnlyList<SettlementLinkDto>> ListSettlementLinksAsync(SettlementLinkStatus? status, CancellationToken ct);
    Task<SettlementLinkDto> CreateSettlementLinkAsync(CreateSettlementLinkRequest req, CancellationToken ct);
    Task<SettlementLinkDto> ReverseSettlementLinkAsync(long id, ReverseSettlementRequest req, CancellationToken ct);

    // Bank accounts
    Task<IReadOnlyList<BankAccountDto>> ListBankAccountsAsync(CancellationToken ct);

    // Deposits
    Task<IReadOnlyList<DepositDto>> ListDepositsAsync(CancellationToken ct);
    Task<DepositDto> CreateDepositAsync(CreateDepositRequest req, CancellationToken ct);
    Task<DepositDto> ReverseDepositAsync(long id, string reason, CancellationToken ct);

    // Bank statements + recon
    Task<IReadOnlyList<BankStatementDto>> ListBankStatementsAsync(long? bankAccountId, CancellationToken ct);
    Task<BankStatementDetailDto?> GetBankStatementAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<BankReconDto>> ListBankReconsAsync(CancellationToken ct);
    Task<BankReconDetailDto?> GetBankReconAsync(long id, CancellationToken ct);

    // Fund transfers
    Task<IReadOnlyList<FundTransferDto>> ListFundTransfersAsync(CancellationToken ct);
    Task<FundTransferDto> CreateFundTransferAsync(CreateFundTransferRequest req, CancellationToken ct);

    // Voided checks
    Task<IReadOnlyList<VoidedCheckDto>> ListVoidedChecksAsync(CancellationToken ct);
    Task<VoidedCheckDto> CreateVoidedCheckAsync(CreateVoidedCheckRequest req, CancellationToken ct);

    // Print batches
    Task<IReadOnlyList<CheckPrintBatchDto>>   ListCheckPrintBatchesAsync(CancellationToken ct);
    Task<IReadOnlyList<InvoicePrintBatchDto>> ListInvoicePrintBatchesAsync(CancellationToken ct);
    Task<CheckPrintBatchDto>   CreateCheckPrintBatchAsync(CreateCheckPrintBatchRequest req, CancellationToken ct);
    Task<InvoicePrintBatchDto> CreateInvoicePrintBatchAsync(CreateInvoicePrintBatchRequest req, CancellationToken ct);

    // Past-due notices
    Task<IReadOnlyList<PastDueNoticeDto>> ListPastDueNoticesAsync(PastDueStatus? status, CancellationToken ct);
    Task<PastDueNoticeDto> CreatePastDueNoticeAsync(CreatePastDueNoticeRequest req, CancellationToken ct);
    Task<PastDueNoticeDto> SendPastDueNoticeAsync(long id, CancellationToken ct);

    // Email templates
    Task<IReadOnlyList<EmailTemplateDto>> ListEmailTemplatesAsync(EmailTemplateCategory? category, CancellationToken ct);
    Task<EmailTemplateDto> UpsertEmailTemplateAsync(UpsertEmailTemplateRequest req, CancellationToken ct);

    // Credit-card payments
    Task<IReadOnlyList<CreditCardPaymentDto>> ListCreditCardPaymentsAsync(CancellationToken ct);
    Task<CreditCardPaymentDto> CreateCreditCardPaymentAsync(CreateCreditCardPaymentRequest req, CancellationToken ct);

    // General expenses
    Task<IReadOnlyList<GeneralExpenseDto>> ListGeneralExpensesAsync(GeneralExpenseKind? kind, CancellationToken ct);
    Task<GeneralExpenseDto> CreateGeneralExpenseAsync(CreateGeneralExpenseRequest req, CancellationToken ct);

    // Comparative profit by year report
    Task<ComparativeProfitDto> ComparativeProfitAsync(int year, CancellationToken ct);
}

/* ----- request DTOs ----- */

public sealed record CreateSettlementLinkRequest(long InvoiceLineId, long BillLineId, decimal LinkedAmount, string Currency, string? Notes);
public sealed record ReverseSettlementRequest(string Reason);

public sealed record CreateDepositRequest(
    string DepositNumber, LocalDate DepositDate, long BankAccountId,
    decimal Amount, string Currency, DepositSource Source,
    long? ReceiptId, long? CustomerPartyId, string? CheckNumber, string? Notes);

public sealed record CreateFundTransferRequest(
    string TransferNumber, LocalDate TransferDate, long FromBankId, long ToBankId,
    decimal Amount, string Currency, decimal FxRate, decimal ToAmount,
    string? BankReference, string? Notes);

public sealed record CreateVoidedCheckRequest(
    long BankAccountId, string CheckNumber, LocalDate VoidDate,
    long? OriginalPaymentId, decimal? Amount, string? Payee,
    VoidReason VoidReason, string? Notes);

public sealed record CreateCheckPrintBatchRequest(
    string BatchNumber, long BankAccountId, LocalDate PrintDate,
    string StartingCheckNo, IReadOnlyList<long> PaymentIds);

public sealed record CreateInvoicePrintBatchRequest(
    string BatchNumber, LocalDate PrintDate,
    IReadOnlyList<long> InvoiceIds, PrintDeliveryMethod DeliveryMethod);

public sealed record CreatePastDueNoticeRequest(
    string NoticeNumber, long CustomerPartyId, PastDueLevel NoticeLevel,
    decimal TotalOverdueAmount, string Currency, IReadOnlyList<long> InvoiceIds,
    LocalDate GeneratedAt, PastDueDelivery DeliveryMethod, string? Notes);

public sealed record UpsertEmailTemplateRequest(
    string TemplateCode, string TemplateName, EmailTemplateCategory Category,
    string SubjectTemplate, string BodyTemplate, bool IsActive,
    IReadOnlyList<string>? AvailablePlaceholders);

public sealed record CreateCreditCardPaymentRequest(
    long? ReceiptId, long? PaymentId, CardBrand CardBrand, string LastFour,
    string? AuthorizationCode, string TransactionId, decimal Amount, string Currency,
    CreditCardProofKind ProofKind, long? ProofDocumentId, string? Notes);

public sealed record CreateGeneralExpenseRequest(
    string ExpenseNumber, LocalDate ExpenseDate, GeneralExpenseKind ExpenseKind,
    string Description, long ExpenseAccountId, decimal Amount, string Currency,
    ExpenseRecurrence Recurrence, LocalDate? NextRecurDate, string? Notes);

/* ----- response DTOs ----- */

public sealed record SettlementLinkDto(
    long Id, int TenantId, long InvoiceLineId, long BillLineId,
    decimal LinkedAmount, string Currency, string? Notes,
    SettlementLinkStatus Status, Instant CreatedAt, long CreatedBy,
    Instant? ReversedAt, long? ReversedBy, string? ReversalReason);

public sealed record BankAccountDto(
    long Id, string AccountCode, string BankName, string AccountNumberMasked,
    BankAccountType AccountType, string Currency, long? LedgerAccountId,
    string? RoutingNumber, string? SwiftCode, string? Iban,
    bool IsActive, decimal CurrentBalance, LocalDate? LastReconDate, string? Notes);

public sealed record DepositDto(
    long Id, string DepositNumber, LocalDate DepositDate, long BankAccountId, string? BankName,
    decimal Amount, string Currency, DepositSource Source,
    long? ReceiptId, long? CustomerPartyId, string? CustomerName, string? CheckNumber,
    string? Notes, DepositStatus Status, Instant? ClearedAt, Instant? ReversedAt, string? ReversalReason);

public sealed record BankStatementDto(
    long Id, long BankAccountId, string? BankName, string StatementPeriod,
    LocalDate StatementDate, decimal OpeningBalance, decimal ClosingBalance,
    decimal TotalDebits, decimal TotalCredits, BankStatementSource Source,
    int LineCount, Instant UploadedAt);

public sealed record BankStatementLineDto(
    long Id, long StatementId, LocalDate LineDate, string Description,
    string? Reference, decimal Amount, decimal? RunningBalance,
    bool IsMatched, decimal? MatchConfidence);

public sealed record BankStatementDetailDto(BankStatementDto Statement, IReadOnlyList<BankStatementLineDto> Lines);

public sealed record BankReconDto(
    long Id, long BankAccountId, string? BankName, long StatementId, string StatementPeriod,
    LocalDate ReconDate, BankReconStatus Status,
    decimal BookBalance, decimal BankBalance, decimal Difference,
    int MatchedCount, int UnmatchedCount, string? Notes, Instant? CompletedAt);

public sealed record BankReconMatchDto(
    long Id, long ReconId, long StatementLineId, BankReconTargetKind MatchTargetKind,
    long MatchTargetId, decimal MatchedAmount, bool IsAuto, Instant MatchedAt);

public sealed record BankReconDetailDto(
    BankReconDto Recon,
    IReadOnlyList<BankStatementLineDto> StatementLines,
    IReadOnlyList<BankReconMatchDto> Matches);

public sealed record FundTransferDto(
    long Id, string TransferNumber, LocalDate TransferDate,
    long FromBankId, string? FromBankName, long ToBankId, string? ToBankName,
    decimal Amount, string Currency, decimal FxRate, decimal ToAmount,
    string? BankReference, string? Notes, FundTransferStatus Status);

public sealed record VoidedCheckDto(
    long Id, long BankAccountId, string? BankName, string CheckNumber, LocalDate VoidDate,
    long? OriginalPaymentId, decimal? Amount, string? Payee,
    VoidReason VoidReason, string? Notes, Instant CreatedAt);

public sealed record CheckPrintBatchDto(
    long Id, string BatchNumber, long BankAccountId, string? BankName,
    LocalDate PrintDate, string StartingCheckNo, int CheckCount,
    decimal TotalAmount, IReadOnlyList<long> PaymentIds,
    CheckPrintBatchStatus Status, Instant? PrintedAt);

public sealed record InvoicePrintBatchDto(
    long Id, string BatchNumber, LocalDate PrintDate, int InvoiceCount,
    IReadOnlyList<long> InvoiceIds, InvoicePrintBatchStatus Status,
    PrintDeliveryMethod DeliveryMethod, Instant? PrintedAt);

public sealed record PastDueNoticeDto(
    long Id, string NoticeNumber, long CustomerPartyId, string? CustomerName,
    PastDueLevel NoticeLevel, decimal TotalOverdueAmount, string Currency,
    int InvoiceCount, IReadOnlyList<long> InvoiceIds,
    LocalDate GeneratedAt, Instant? SentAt, PastDueDelivery DeliveryMethod,
    PastDueStatus Status, string? Notes);

public sealed record EmailTemplateDto(
    long Id, string TemplateCode, string TemplateName, EmailTemplateCategory Category,
    string SubjectTemplate, string BodyTemplate, bool IsActive, bool IsPredefined,
    IReadOnlyList<string>? AvailablePlaceholders);

public sealed record CreditCardPaymentDto(
    long Id, long? ReceiptId, long? PaymentId, CardBrand CardBrand, string LastFour,
    string? AuthorizationCode, string TransactionId, decimal Amount, string Currency,
    CreditCardProofKind ProofKind, long? ProofDocumentId, string? Notes, Instant CreatedAt);

public sealed record GeneralExpenseDto(
    long Id, string ExpenseNumber, LocalDate ExpenseDate, GeneralExpenseKind ExpenseKind,
    string Description, long ExpenseAccountId, string? AccountCode,
    decimal Amount, string Currency, ExpenseRecurrence Recurrence,
    LocalDate? NextRecurDate, bool IsActive, string? Notes);

public sealed record ComparativeProfitDto(
    int Year, string FuncCurrency,
    decimal[] RevenuePerMonth, decimal[] ExpensePerMonth, decimal[] ProfitPerMonth,
    decimal TotalRevenue, decimal TotalExpenses, decimal TotalProfit,
    decimal? PriorYearRevenue, decimal? PriorYearExpenses, decimal? PriorYearProfit);
