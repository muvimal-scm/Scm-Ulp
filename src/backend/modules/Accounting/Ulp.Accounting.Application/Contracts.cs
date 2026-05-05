using NodaTime;
using Ulp.Accounting.Domain.Entities;

namespace Ulp.Accounting.Application;

// =====================================================================
// M17 Accounts â€” application contract per sealed LLD Â§11 (REST surface).
// 18 endpoints split across: chart of accounts, periods, journals,
// invoices, bills, receipts, payments, reports.
// =====================================================================

public interface IAccountsService
{
    // --- Chart of Accounts ---
    Task<AccountDto>                CreateAccountAsync(CreateAccountRequest req, CancellationToken ct);
    Task<IReadOnlyList<AccountDto>> ListAccountsAsync(AccountListQuery q, CancellationToken ct);
    Task<AccountDto?>               GetAccountAsync(long id, CancellationToken ct);

    // --- Periods ---
    Task<IReadOnlyList<PeriodDto>>  ListPeriodsAsync(int? fiscalYear, CancellationToken ct);
    Task<PeriodDto?>                GetPeriodAsync(long id, CancellationToken ct);
    Task<PeriodDto>                 ClosePeriodAsync(long id, CancellationToken ct);
    Task<PeriodDto>                 ReopenPeriodAsync(long id, ReopenPeriodRequest req, CancellationToken ct);

    // --- AR Invoices ---
    Task<InvoiceDto>                CreateInvoiceAsync(CreateInvoiceRequest req, CancellationToken ct);
    Task<InvoiceDto?>               GetInvoiceAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<InvoiceDto>> ListInvoicesAsync(InvoiceListQuery q, CancellationToken ct);
    Task<InvoiceDto>                PostInvoiceAsync(long id, CancellationToken ct);
    Task<InvoiceDto>                VoidInvoiceAsync(long id, VoidInvoiceRequest req, CancellationToken ct);

    // --- AP Bills ---
    Task<BillDto>                   CreateBillAsync(CreateBillRequest req, CancellationToken ct);
    Task<BillDto?>                  GetBillAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<BillDto>>    ListBillsAsync(BillListQuery q, CancellationToken ct);
    Task<BillDto>                   PostBillAsync(long id, CancellationToken ct);

    // --- Receipts (AR) ---
    Task<ReceiptDto>                CreateReceiptAsync(CreateReceiptRequest req, CancellationToken ct);
    Task<IReadOnlyList<ReceiptDto>> ListReceiptsAsync(CancellationToken ct);
    Task<ReceiptDto>                MatchReceiptAsync(long receiptId, MatchReceiptRequest req, CancellationToken ct);

    // --- Payments (AP) ---
    Task<PaymentDto>                CreatePaymentAsync(CreatePaymentRequest req, CancellationToken ct);
    Task<IReadOnlyList<PaymentDto>> ListPaymentsAsync(CancellationToken ct);

    // --- Journals (manual GL) ---
    Task<JournalDto>                CreateJournalAsync(CreateJournalRequest req, CancellationToken ct);
    Task<IReadOnlyList<JournalDto>> ListJournalsAsync(JournalListQuery q, CancellationToken ct);

    // --- Reports ---
    Task<TrialBalanceDto>           TrialBalanceAsync(long periodId, CancellationToken ct);
    Task<IncomeStatementDto>        IncomeStatementAsync(long fromPeriodId, long toPeriodId, CancellationToken ct);
    Task<BalanceSheetDto>           BalanceSheetAsync(long asOfPeriodId, CancellationToken ct);
    Task<IReadOnlyList<AgingBucketDto>> ArAgingAsync(LocalDate asOf, CancellationToken ct);
    Task<IReadOnlyList<AgingBucketDto>> ApAgingAsync(LocalDate asOf, CancellationToken ct);
}

/* =========================================================
 * REQUEST DTOs
 * ========================================================= */

public sealed record CreateAccountRequest(
    string CountryCode, string AccountCode, string AccountName,
    AccountClass AccountClass, long? ParentAccountId,
    bool IsControlAccount, bool IsPostable, string DefaultCurrency);

public sealed record AccountListQuery(AccountClass? AccountClass, bool? IsActive, int Page, int PageSize);

public sealed record ReopenPeriodRequest(string Reason);

public sealed record CreateInvoiceRequest(
    string CountryCode, string InvoiceNumber, LocalDate InvoiceDate, LocalDate DueDate,
    long CustomerPartyId, string Currency, string FuncCurrency, decimal FxRate,
    string? PaymentTerms, string? Notes,
    IReadOnlyList<CreateInvoiceLineRequest> Lines,
    // Indian-specific (ignored for non-IN tenants):
    string? PlaceOfSupply, bool? IsExport, ExportType? ExportType);

public sealed record CreateInvoiceLineRequest(
    string Description, string? HsnCode, decimal Quantity, string? UomCode,
    decimal UnitPriceAmount, string UnitPriceCurrency, long? AccountId);

public sealed record VoidInvoiceRequest(string Reason);

public sealed record InvoiceListQuery(
    long? CustomerPartyId, InvoiceStatus? Status,
    LocalDate? FromDate, LocalDate? ToDate,
    int Page, int PageSize);

public sealed record CreateBillRequest(
    string CountryCode, string BillNumber, string InternalNumber,
    LocalDate BillDate, LocalDate DueDate, long VendorPartyId,
    string Currency, string FuncCurrency, decimal FxRate, string? Notes,
    IReadOnlyList<CreateBillLineRequest> Lines,
    // India-specific TDS:
    string? TdsSectionCode, string? VendorPan, string? VendorGstin, bool? IsReverseCharge);

public sealed record CreateBillLineRequest(
    string Description, string? HsnCode, decimal Quantity, string? UomCode,
    decimal UnitPriceAmount, long? AccountId);

public sealed record BillListQuery(
    long? VendorPartyId, BillStatus? Status,
    LocalDate? FromDate, LocalDate? ToDate, int Page, int PageSize);

public sealed record CreateReceiptRequest(
    string CountryCode, string ReceiptNumber, LocalDate ReceiptDate,
    long CustomerPartyId, decimal Amount, string Currency,
    PaymentMethod PaymentMethod, string? BankReference, string? Notes);

public sealed record MatchReceiptRequest(IReadOnlyList<MatchAlloc> Allocations);
public sealed record MatchAlloc(long InvoiceId, decimal Amount);

public sealed record CreatePaymentRequest(
    string CountryCode, string PaymentNumber, LocalDate PaymentDate,
    long VendorPartyId, decimal Amount, string Currency,
    decimal WithholdingAmount, PaymentMethod PaymentMethod,
    string? BankReference, string? Notes,
    IReadOnlyList<long> BillIds);

public sealed record CreateJournalRequest(
    JournalType JournalType, LocalDate PostingDate, long PeriodId,
    string? Description, string? SourceModule, long? SourceRecordId,
    IReadOnlyList<CreateJournalLineRequest> Lines);

public sealed record CreateJournalLineRequest(
    long AccountId, decimal AmountOrig, string CurrencyOrig,
    decimal AmountFunc, string CurrencyFunc, decimal FxRate, LocalDate FxRateDate,
    DebitCredit DebitCredit, long? PartyId, string? Reference, string? Description);

public sealed record JournalListQuery(long? PeriodId, JournalType? Type, bool? IsPosted, int Page, int PageSize);

/* =========================================================
 * RESPONSE DTOs
 * ========================================================= */

public sealed record AccountDto(
    long Id, int TenantId, string CountryCode, string AccountCode, string AccountName,
    AccountClass AccountClass, long? ParentAccountId, bool IsControlAccount, bool IsPostable,
    string DefaultCurrency, bool IsActive);

public sealed record PeriodDto(
    long Id, int FiscalYear, int PeriodNumber, string PeriodName,
    LocalDate StartDate, LocalDate EndDate, PeriodStatus Status,
    Instant? ClosedAt, int ReopenedCount);

public sealed record InvoiceDto(
    long Id, int TenantId, string CountryCode, string InvoiceNumber,
    LocalDate InvoiceDate, LocalDate DueDate, long CustomerPartyId, string? CustomerName,
    string Currency, string FuncCurrency, decimal FxRate,
    decimal SubtotalAmount, decimal TaxAmount, decimal DiscountAmount,
    decimal TotalAmount, decimal PaidAmount,
    string? PaymentTerms, string? Notes, InvoiceStatus Status,
    long? PostedJournalId, Instant? PostedAt,
    Instant CreatedAt, Instant ModifiedAt,
    IReadOnlyList<InvoiceLineDto>? Lines,
    InvoiceExtInDto? IndiaExt, IrnDto? Irn);

public sealed record InvoiceLineDto(
    long Id, long InvoiceId, int LineNumber, string Description, string? HsnCode,
    decimal Quantity, string? UomCode, decimal UnitPriceAmount, string UnitPriceCurrency,
    decimal LineAmount, string? TaxClass, decimal? TaxRatePct, decimal TaxAmount, long? AccountId);

public sealed record InvoiceExtInDto(
    string? PlaceOfSupply, bool IsIntraState,
    decimal CgstAmount, decimal SgstAmount, decimal IgstAmount, decimal CessAmount,
    bool ReverseCharge, bool IsExport, ExportType ExportType);

public sealed record IrnDto(
    string IrnValue, string AckNo, Instant AckDate, string IrpProvider, IrnStatus Status);

public sealed record BillDto(
    long Id, int TenantId, string CountryCode, string BillNumber, string InternalNumber,
    LocalDate BillDate, LocalDate DueDate, long VendorPartyId, string? VendorName,
    string Currency, string FuncCurrency, decimal FxRate,
    decimal SubtotalAmount, decimal TaxAmount, decimal WithholdingAmount,
    decimal TotalAmount, decimal PaidAmount,
    string? Notes, BillStatus Status, long? PostedJournalId, Instant? PostedAt,
    Instant CreatedAt, Instant ModifiedAt,
    IReadOnlyList<BillLineDto>? Lines,
    BillExtInDto? IndiaExt);

public sealed record BillLineDto(
    long Id, long BillId, int LineNumber, string Description, string? HsnCode,
    decimal Quantity, string? UomCode, decimal UnitPriceAmount,
    decimal LineAmount, string? TaxClass, decimal? TaxRatePct, decimal TaxAmount, long? AccountId);

public sealed record BillExtInDto(
    string? TdsSectionCode, decimal? TdsRatePct, decimal TdsAmount,
    string? VendorPan, string? VendorGstin, bool IsReverseCharge);

public sealed record ReceiptDto(
    long Id, int TenantId, string CountryCode, string ReceiptNumber, LocalDate ReceiptDate,
    long CustomerPartyId, string? CustomerName,
    decimal Amount, string Currency, PaymentMethod PaymentMethod, string? BankReference,
    decimal UnmatchedAmount, ReceiptStatus Status,
    Instant CreatedAt, Instant ModifiedAt,
    IReadOnlyList<ReceiptMatchDto>? Matches);

public sealed record ReceiptMatchDto(
    long Id, long ReceiptId, long InvoiceId, decimal MatchedAmount, Instant MatchedAt, bool IsAuto);

public sealed record PaymentDto(
    long Id, int TenantId, string CountryCode, string PaymentNumber, LocalDate PaymentDate,
    long VendorPartyId, string? VendorName,
    decimal Amount, string Currency,
    decimal WithholdingAmount, decimal NetAmount,
    PaymentMethod PaymentMethod, string? BankReference, PaymentStatus Status,
    Instant CreatedAt, Instant ModifiedAt,
    IReadOnlyList<PaymentAllocDto>? Allocations);

public sealed record PaymentAllocDto(long Id, long PaymentId, long BillId, decimal AllocatedAmount);

public sealed record JournalDto(
    long Id, int TenantId, string JournalNumber, JournalType JournalType,
    LocalDate PostingDate, long PeriodId, string? Description,
    string? SourceModule, long? SourceRecordId,
    bool IsPosted, bool IsReversed,
    Instant CreatedAt, Instant? PostedAt,
    IReadOnlyList<JournalLineDto>? Lines);

public sealed record JournalLineDto(
    long Id, long JournalId, int LineNumber, long AccountId, string AccountCode,
    decimal AmountOrig, string CurrencyOrig, decimal AmountFunc, string CurrencyFunc,
    decimal FxRate, LocalDate FxRateDate, DebitCredit DebitCredit,
    long? PartyId, string? Reference, string? Description);

public sealed record TrialBalanceDto(
    long PeriodId, string PeriodName, LocalDate StartDate, LocalDate EndDate,
    string FuncCurrency, decimal TotalDebits, decimal TotalCredits,
    IReadOnlyList<TrialBalanceRowDto> Rows);

public sealed record TrialBalanceRowDto(
    long AccountId, string AccountCode, string AccountName, AccountClass AccountClass,
    decimal Debit, decimal Credit, decimal Balance);

public sealed record IncomeStatementDto(
    long FromPeriodId, long ToPeriodId, string FuncCurrency,
    decimal TotalRevenue, decimal TotalExpenses, decimal NetIncome,
    IReadOnlyList<IncomeStatementRowDto> Revenue,
    IReadOnlyList<IncomeStatementRowDto> Expenses);

public sealed record IncomeStatementRowDto(string AccountCode, string AccountName, decimal Amount);

public sealed record BalanceSheetDto(
    long AsOfPeriodId, string FuncCurrency,
    decimal TotalAssets, decimal TotalLiabilities, decimal TotalEquity,
    IReadOnlyList<BalanceSheetRowDto> Assets,
    IReadOnlyList<BalanceSheetRowDto> Liabilities,
    IReadOnlyList<BalanceSheetRowDto> Equity);

public sealed record BalanceSheetRowDto(string AccountCode, string AccountName, decimal Amount);

public sealed record AgingBucketDto(
    long PartyId, string PartyName, string Currency,
    decimal Current, decimal Bucket1To30, decimal Bucket31To60, decimal Bucket61To90, decimal BucketOver90,
    decimal Total);
