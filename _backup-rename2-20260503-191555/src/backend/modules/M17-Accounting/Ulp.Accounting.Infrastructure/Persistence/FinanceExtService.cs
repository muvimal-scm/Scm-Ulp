using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.Accounting.Application;
using Ulp.Accounting.Domain.Entities;

namespace Ulp.Accounting.Infrastructure.Persistence;

public sealed class FinanceExtService(AccountingDbContext db, ITenantContext tenant, IClock clock) : IFinanceExtService
{
    private int Tid => int.Parse(tenant.TenantId.Value);

    /* ===== Settlement links ===== */
    public async Task<IReadOnlyList<SettlementLinkDto>> ListSettlementLinksAsync(SettlementLinkStatus? status, CancellationToken ct)
    {
        var q = db.SettlementLinks.AsNoTracking().Where(s => s.TenantId == Tid);
        if (status.HasValue) q = q.Where(s => s.Status == status.Value);
        var rows = await q.OrderByDescending(s => s.CreatedAt).Take(500).ToListAsync(ct);
        return rows.Select(ToSettlementLinkDto).ToList();
    }

    public async Task<SettlementLinkDto> CreateSettlementLinkAsync(CreateSettlementLinkRequest req, CancellationToken ct)
    {
        var s = new SettlementLink {
            TenantId = Tid, InvoiceLineId = req.InvoiceLineId, BillLineId = req.BillLineId,
            LinkedAmount = req.LinkedAmount, Currency = req.Currency, Notes = req.Notes,
            Status = SettlementLinkStatus.Active,
            CreatedAt = clock.GetCurrentInstant(), CreatedBy = 1,
        };
        db.SettlementLinks.Add(s);
        await db.SaveChangesAsync(ct);
        return ToSettlementLinkDto(s);
    }

    public async Task<SettlementLinkDto> ReverseSettlementLinkAsync(long id, ReverseSettlementRequest req, CancellationToken ct)
    {
        var s = await db.SettlementLinks.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException("settlement link not found");
        if (s.Status == SettlementLinkStatus.Reversed) return ToSettlementLinkDto(s);
        s.Status = SettlementLinkStatus.Reversed;
        s.ReversedAt = clock.GetCurrentInstant();
        s.ReversedBy = 1;
        s.ReversalReason = req.Reason;
        await db.SaveChangesAsync(ct);
        return ToSettlementLinkDto(s);
    }

    /* ===== Bank accounts ===== */
    public async Task<IReadOnlyList<BankAccountDto>> ListBankAccountsAsync(CancellationToken ct)
    {
        var rows = await db.BankAccounts.AsNoTracking().Where(a => a.TenantId == Tid)
            .OrderBy(a => a.AccountCode).ToListAsync(ct);
        return rows.Select(ToBankAccountDto).ToList();
    }

    /* ===== Deposits ===== */
    public async Task<IReadOnlyList<DepositDto>> ListDepositsAsync(CancellationToken ct)
    {
        var rows = await db.Deposits.AsNoTracking().Where(d => d.TenantId == Tid)
            .OrderByDescending(d => d.DepositDate).Take(200).ToListAsync(ct);
        return await EnrichDepositsAsync(rows, ct);
    }

    public async Task<DepositDto> CreateDepositAsync(CreateDepositRequest req, CancellationToken ct)
    {
        var now = clock.GetCurrentInstant();
        var d = new Deposit {
            TenantId = Tid, DepositNumber = req.DepositNumber, DepositDate = req.DepositDate,
            BankAccountId = req.BankAccountId, Amount = req.Amount, Currency = req.Currency,
            Source = req.Source, ReceiptId = req.ReceiptId, CustomerPartyId = req.CustomerPartyId,
            CheckNumber = req.CheckNumber, Notes = req.Notes,
            Status = DepositStatus.Pending,
            CreatedAt = now, ModifiedAt = now,
        };
        db.Deposits.Add(d);
        await db.SaveChangesAsync(ct);
        return (await EnrichDepositsAsync(new List<Deposit> { d }, ct)).Single();
    }

    public async Task<DepositDto> ReverseDepositAsync(long id, string reason, CancellationToken ct)
    {
        var d = await db.Deposits.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException("deposit not found");
        if (d.Status == DepositStatus.Reversed) return (await EnrichDepositsAsync(new List<Deposit> { d }, ct)).Single();
        d.Status = DepositStatus.Reversed;
        d.ReversedAt = clock.GetCurrentInstant();
        d.ReversalReason = reason;
        d.ModifiedAt = d.ReversedAt!.Value;
        await db.SaveChangesAsync(ct);
        return (await EnrichDepositsAsync(new List<Deposit> { d }, ct)).Single();
    }

    private async Task<IReadOnlyList<DepositDto>> EnrichDepositsAsync(List<Deposit> rows, CancellationToken ct)
    {
        var bankIds = rows.Select(r => r.BankAccountId).Distinct().ToList();
        var custIds = rows.Where(r => r.CustomerPartyId.HasValue).Select(r => r.CustomerPartyId!.Value).Distinct().ToList();
        var bankNames = await db.BankAccounts.AsNoTracking().Where(b => bankIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.BankName, ct);
        var custNames = custIds.Count == 0 ? new Dictionary<long, string>() :
            await db.PartyLookups.AsNoTracking().Where(p => p.TenantId == Tid && custIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.LegalName, ct);
        return rows.Select(d => new DepositDto(
            d.Id, d.DepositNumber, d.DepositDate, d.BankAccountId, bankNames.GetValueOrDefault(d.BankAccountId),
            d.Amount, d.Currency, d.Source,
            d.ReceiptId, d.CustomerPartyId, d.CustomerPartyId.HasValue ? custNames.GetValueOrDefault(d.CustomerPartyId.Value) : null,
            d.CheckNumber, d.Notes, d.Status, d.ClearedAt, d.ReversedAt, d.ReversalReason)).ToList();
    }

    /* ===== Bank statements + recon ===== */
    public async Task<IReadOnlyList<BankStatementDto>> ListBankStatementsAsync(long? bankAccountId, CancellationToken ct)
    {
        var q = db.BankStatements.AsNoTracking().Where(s => s.TenantId == Tid);
        if (bankAccountId.HasValue) q = q.Where(s => s.BankAccountId == bankAccountId.Value);
        var rows = await q.OrderByDescending(s => s.StatementDate).Take(60).ToListAsync(ct);
        var stmtIds = rows.Select(r => r.Id).ToList();
        var bankIds = rows.Select(r => r.BankAccountId).Distinct().ToList();
        var lineCounts = await db.BankStatementLines.AsNoTracking()
            .Where(l => stmtIds.Contains(l.StatementId)).GroupBy(l => l.StatementId)
            .Select(g => new { Id = g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Id, x => x.N, ct);
        var bankNames = await db.BankAccounts.AsNoTracking().Where(b => bankIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.BankName, ct);
        return rows.Select(s => new BankStatementDto(
            s.Id, s.BankAccountId, bankNames.GetValueOrDefault(s.BankAccountId),
            s.StatementPeriod, s.StatementDate,
            s.OpeningBalance, s.ClosingBalance, s.TotalDebits, s.TotalCredits,
            s.Source, lineCounts.GetValueOrDefault(s.Id, 0), s.UploadedAt)).ToList();
    }

    public async Task<BankStatementDetailDto?> GetBankStatementAsync(long id, CancellationToken ct)
    {
        var s = await db.BankStatements.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (s is null) return null;
        var lines = await db.BankStatementLines.AsNoTracking().Where(l => l.StatementId == id)
            .OrderBy(l => l.LineDate).ThenBy(l => l.Id).ToListAsync(ct);
        var bankName = await db.BankAccounts.AsNoTracking().Where(b => b.Id == s.BankAccountId)
            .Select(b => b.BankName).FirstOrDefaultAsync(ct);
        var stmtDto = new BankStatementDto(s.Id, s.BankAccountId, bankName, s.StatementPeriod, s.StatementDate,
            s.OpeningBalance, s.ClosingBalance, s.TotalDebits, s.TotalCredits, s.Source, lines.Count, s.UploadedAt);
        return new BankStatementDetailDto(stmtDto, lines.Select(ToStatementLineDto).ToList());
    }

    public async Task<IReadOnlyList<BankReconDto>> ListBankReconsAsync(CancellationToken ct)
    {
        var rows = await db.BankRecons.AsNoTracking().Where(r => r.TenantId == Tid)
            .OrderByDescending(r => r.ReconDate).Take(100).ToListAsync(ct);
        var bankIds = rows.Select(r => r.BankAccountId).Distinct().ToList();
        var stmtIds = rows.Select(r => r.StatementId).Distinct().ToList();
        var bankNames = await db.BankAccounts.AsNoTracking().Where(b => bankIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.BankName, ct);
        var stmtPeriods = await db.BankStatements.AsNoTracking().Where(s => stmtIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.StatementPeriod, ct);
        return rows.Select(r => new BankReconDto(
            r.Id, r.BankAccountId, bankNames.GetValueOrDefault(r.BankAccountId),
            r.StatementId, stmtPeriods.GetValueOrDefault(r.StatementId, ""),
            r.ReconDate, r.Status,
            r.BookBalance, r.BankBalance, r.Difference,
            r.MatchedCount, r.UnmatchedCount, r.Notes, r.CompletedAt)).ToList();
    }

    public async Task<BankReconDetailDto?> GetBankReconAsync(long id, CancellationToken ct)
    {
        var r = await db.BankRecons.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (r is null) return null;
        var lines = await db.BankStatementLines.AsNoTracking().Where(l => l.StatementId == r.StatementId)
            .OrderBy(l => l.LineDate).ToListAsync(ct);
        var matches = await db.BankReconMatches.AsNoTracking().Where(m => m.ReconId == r.Id).ToListAsync(ct);
        var bankName = await db.BankAccounts.AsNoTracking().Where(b => b.Id == r.BankAccountId)
            .Select(b => b.BankName).FirstOrDefaultAsync(ct);
        var stmtPeriod = await db.BankStatements.AsNoTracking().Where(s => s.Id == r.StatementId)
            .Select(s => s.StatementPeriod).FirstOrDefaultAsync(ct);
        var reconDto = new BankReconDto(r.Id, r.BankAccountId, bankName, r.StatementId, stmtPeriod ?? "",
            r.ReconDate, r.Status, r.BookBalance, r.BankBalance, r.Difference,
            r.MatchedCount, r.UnmatchedCount, r.Notes, r.CompletedAt);
        return new BankReconDetailDto(reconDto,
            lines.Select(ToStatementLineDto).ToList(),
            matches.Select(m => new BankReconMatchDto(m.Id, m.ReconId, m.StatementLineId, m.MatchTargetKind,
                m.MatchTargetId, m.MatchedAmount, m.IsAuto, m.MatchedAt)).ToList());
    }

    /* ===== Fund transfers ===== */
    public async Task<IReadOnlyList<FundTransferDto>> ListFundTransfersAsync(CancellationToken ct)
    {
        var rows = await db.FundTransfers.AsNoTracking().Where(t => t.TenantId == Tid)
            .OrderByDescending(t => t.TransferDate).Take(200).ToListAsync(ct);
        var bankIds = rows.SelectMany(r => new[] { r.FromBankId, r.ToBankId }).Distinct().ToList();
        var bankNames = await db.BankAccounts.AsNoTracking().Where(b => bankIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.BankName, ct);
        return rows.Select(t => new FundTransferDto(
            t.Id, t.TransferNumber, t.TransferDate,
            t.FromBankId, bankNames.GetValueOrDefault(t.FromBankId),
            t.ToBankId, bankNames.GetValueOrDefault(t.ToBankId),
            t.Amount, t.Currency, t.FxRate, t.ToAmount,
            t.BankReference, t.Notes, t.Status)).ToList();
    }

    public async Task<FundTransferDto> CreateFundTransferAsync(CreateFundTransferRequest req, CancellationToken ct)
    {
        var now = clock.GetCurrentInstant();
        var t = new FundTransfer {
            TenantId = Tid, TransferNumber = req.TransferNumber, TransferDate = req.TransferDate,
            FromBankId = req.FromBankId, ToBankId = req.ToBankId,
            Amount = req.Amount, Currency = req.Currency, FxRate = req.FxRate, ToAmount = req.ToAmount,
            BankReference = req.BankReference, Notes = req.Notes,
            Status = FundTransferStatus.Pending,
            CreatedAt = now, ModifiedAt = now,
        };
        db.FundTransfers.Add(t);
        await db.SaveChangesAsync(ct);
        return (await ListFundTransfersAsync(ct)).First(x => x.Id == t.Id);
    }

    /* ===== Voided checks ===== */
    public async Task<IReadOnlyList<VoidedCheckDto>> ListVoidedChecksAsync(CancellationToken ct)
    {
        var rows = await db.VoidedChecks.AsNoTracking().Where(v => v.TenantId == Tid)
            .OrderByDescending(v => v.VoidDate).Take(200).ToListAsync(ct);
        var bankIds = rows.Select(r => r.BankAccountId).Distinct().ToList();
        var bankNames = await db.BankAccounts.AsNoTracking().Where(b => bankIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.BankName, ct);
        return rows.Select(v => new VoidedCheckDto(
            v.Id, v.BankAccountId, bankNames.GetValueOrDefault(v.BankAccountId),
            v.CheckNumber, v.VoidDate, v.OriginalPaymentId, v.Amount, v.Payee,
            v.VoidReason, v.Notes, v.CreatedAt)).ToList();
    }

    public async Task<VoidedCheckDto> CreateVoidedCheckAsync(CreateVoidedCheckRequest req, CancellationToken ct)
    {
        var v = new VoidedCheck {
            TenantId = Tid, BankAccountId = req.BankAccountId, CheckNumber = req.CheckNumber,
            VoidDate = req.VoidDate, OriginalPaymentId = req.OriginalPaymentId,
            Amount = req.Amount, Payee = req.Payee, VoidReason = req.VoidReason, Notes = req.Notes,
            VoidedBy = 1, CreatedAt = clock.GetCurrentInstant(),
        };
        db.VoidedChecks.Add(v);
        await db.SaveChangesAsync(ct);
        return (await ListVoidedChecksAsync(ct)).First(x => x.Id == v.Id);
    }

    /* ===== Print batches ===== */
    public async Task<IReadOnlyList<CheckPrintBatchDto>> ListCheckPrintBatchesAsync(CancellationToken ct)
    {
        var rows = await db.CheckPrintBatches.AsNoTracking().Where(b => b.TenantId == Tid)
            .OrderByDescending(b => b.PrintDate).Take(100).ToListAsync(ct);
        var bankIds = rows.Select(r => r.BankAccountId).Distinct().ToList();
        var bankNames = await db.BankAccounts.AsNoTracking().Where(b => bankIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.BankName, ct);
        return rows.Select(b => new CheckPrintBatchDto(
            b.Id, b.BatchNumber, b.BankAccountId, bankNames.GetValueOrDefault(b.BankAccountId),
            b.PrintDate, b.StartingCheckNo, b.CheckCount, b.TotalAmount,
            ParseLongList(b.PaymentIdsJson), b.Status, b.PrintedAt)).ToList();
    }

    public async Task<CheckPrintBatchDto> CreateCheckPrintBatchAsync(CreateCheckPrintBatchRequest req, CancellationToken ct)
    {
        var pays = await db.Payments.AsNoTracking().Where(p => p.TenantId == Tid && req.PaymentIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Amount }).ToListAsync(ct);
        var b = new CheckPrintBatch {
            TenantId = Tid, BatchNumber = req.BatchNumber, BankAccountId = req.BankAccountId,
            PrintDate = req.PrintDate, StartingCheckNo = req.StartingCheckNo,
            CheckCount = pays.Count, TotalAmount = pays.Sum(p => p.Amount),
            PaymentIdsJson = JsonSerializer.Serialize(req.PaymentIds),
            Status = CheckPrintBatchStatus.Pending,
            CreatedAt = clock.GetCurrentInstant(),
        };
        db.CheckPrintBatches.Add(b);
        await db.SaveChangesAsync(ct);
        return (await ListCheckPrintBatchesAsync(ct)).First(x => x.Id == b.Id);
    }

    public async Task<IReadOnlyList<InvoicePrintBatchDto>> ListInvoicePrintBatchesAsync(CancellationToken ct)
    {
        var rows = await db.InvoicePrintBatches.AsNoTracking().Where(b => b.TenantId == Tid)
            .OrderByDescending(b => b.PrintDate).Take(100).ToListAsync(ct);
        return rows.Select(b => new InvoicePrintBatchDto(
            b.Id, b.BatchNumber, b.PrintDate, b.InvoiceCount,
            ParseLongList(b.InvoiceIdsJson), b.Status, b.DeliveryMethod, b.PrintedAt)).ToList();
    }

    public async Task<InvoicePrintBatchDto> CreateInvoicePrintBatchAsync(CreateInvoicePrintBatchRequest req, CancellationToken ct)
    {
        var b = new InvoicePrintBatch {
            TenantId = Tid, BatchNumber = req.BatchNumber, PrintDate = req.PrintDate,
            InvoiceCount = req.InvoiceIds.Count, InvoiceIdsJson = JsonSerializer.Serialize(req.InvoiceIds),
            Status = InvoicePrintBatchStatus.Pending, DeliveryMethod = req.DeliveryMethod,
            CreatedAt = clock.GetCurrentInstant(),
        };
        db.InvoicePrintBatches.Add(b);
        await db.SaveChangesAsync(ct);
        return (await ListInvoicePrintBatchesAsync(ct)).First(x => x.Id == b.Id);
    }

    /* ===== Past-due notices ===== */
    public async Task<IReadOnlyList<PastDueNoticeDto>> ListPastDueNoticesAsync(PastDueStatus? status, CancellationToken ct)
    {
        var q = db.PastDueNotices.AsNoTracking().Where(p => p.TenantId == Tid);
        if (status.HasValue) q = q.Where(p => p.Status == status.Value);
        var rows = await q.OrderByDescending(p => p.GeneratedAt).Take(200).ToListAsync(ct);
        var custIds = rows.Select(r => r.CustomerPartyId).Distinct().ToList();
        var custNames = await db.PartyLookups.AsNoTracking().Where(p => p.TenantId == Tid && custIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.LegalName, ct);
        return rows.Select(p => new PastDueNoticeDto(
            p.Id, p.NoticeNumber, p.CustomerPartyId, custNames.GetValueOrDefault(p.CustomerPartyId),
            p.NoticeLevel, p.TotalOverdueAmount, p.Currency,
            p.InvoiceCount, ParseLongList(p.InvoiceIdsJson),
            p.GeneratedAt, p.SentAt, p.DeliveryMethod, p.Status, p.Notes)).ToList();
    }

    public async Task<PastDueNoticeDto> CreatePastDueNoticeAsync(CreatePastDueNoticeRequest req, CancellationToken ct)
    {
        var now = clock.GetCurrentInstant();
        var p = new PastDueNotice {
            TenantId = Tid, NoticeNumber = req.NoticeNumber, CustomerPartyId = req.CustomerPartyId,
            NoticeLevel = req.NoticeLevel, TotalOverdueAmount = req.TotalOverdueAmount,
            Currency = req.Currency, InvoiceCount = req.InvoiceIds.Count,
            InvoiceIdsJson = JsonSerializer.Serialize(req.InvoiceIds),
            GeneratedAt = req.GeneratedAt, DeliveryMethod = req.DeliveryMethod,
            Status = PastDueStatus.Draft, Notes = req.Notes,
            CreatedAt = now, ModifiedAt = now,
        };
        db.PastDueNotices.Add(p);
        await db.SaveChangesAsync(ct);
        return (await ListPastDueNoticesAsync(null, ct)).First(x => x.Id == p.Id);
    }

    public async Task<PastDueNoticeDto> SendPastDueNoticeAsync(long id, CancellationToken ct)
    {
        var p = await db.PastDueNotices.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException("notice not found");
        p.Status = PastDueStatus.Sent;
        p.SentAt = clock.GetCurrentInstant();
        p.ModifiedAt = p.SentAt!.Value;
        await db.SaveChangesAsync(ct);
        return (await ListPastDueNoticesAsync(null, ct)).First(x => x.Id == p.Id);
    }

    /* ===== Email templates ===== */
    public async Task<IReadOnlyList<EmailTemplateDto>> ListEmailTemplatesAsync(EmailTemplateCategory? category, CancellationToken ct)
    {
        var q = db.EmailTemplates.AsNoTracking().Where(t => t.TenantId == Tid);
        if (category.HasValue) q = q.Where(t => t.Category == category.Value);
        var rows = await q.OrderBy(t => t.Category).ThenBy(t => t.TemplateCode).ToListAsync(ct);
        return rows.Select(t => new EmailTemplateDto(
            t.Id, t.TemplateCode, t.TemplateName, t.Category,
            t.SubjectTemplate, t.BodyTemplate, t.IsActive, t.IsPredefined,
            t.AvailablePlaceholdersJson is null ? null :
                JsonSerializer.Deserialize<List<string>>(t.AvailablePlaceholdersJson))).ToList();
    }

    public async Task<EmailTemplateDto> UpsertEmailTemplateAsync(UpsertEmailTemplateRequest req, CancellationToken ct)
    {
        var now = clock.GetCurrentInstant();
        var t = await db.EmailTemplates.FirstOrDefaultAsync(x => x.TenantId == Tid && x.TemplateCode == req.TemplateCode, ct);
        if (t is null)
        {
            t = new EmailTemplate {
                TenantId = Tid, TemplateCode = req.TemplateCode, TemplateName = req.TemplateName,
                Category = req.Category, SubjectTemplate = req.SubjectTemplate, BodyTemplate = req.BodyTemplate,
                IsActive = req.IsActive, IsPredefined = false,
                AvailablePlaceholdersJson = req.AvailablePlaceholders is null ? null : JsonSerializer.Serialize(req.AvailablePlaceholders),
                CreatedAt = now, ModifiedAt = now,
            };
            db.EmailTemplates.Add(t);
        }
        else
        {
            t.TemplateName = req.TemplateName;
            t.Category = req.Category;
            t.SubjectTemplate = req.SubjectTemplate;
            t.BodyTemplate = req.BodyTemplate;
            t.IsActive = req.IsActive;
            t.AvailablePlaceholdersJson = req.AvailablePlaceholders is null ? null : JsonSerializer.Serialize(req.AvailablePlaceholders);
            t.ModifiedAt = now;
        }
        await db.SaveChangesAsync(ct);
        return new EmailTemplateDto(t.Id, t.TemplateCode, t.TemplateName, t.Category,
            t.SubjectTemplate, t.BodyTemplate, t.IsActive, t.IsPredefined,
            req.AvailablePlaceholders);
    }

    /* ===== Credit-card payments ===== */
    public async Task<IReadOnlyList<CreditCardPaymentDto>> ListCreditCardPaymentsAsync(CancellationToken ct)
    {
        var rows = await db.CreditCardPayments.AsNoTracking().Where(c => c.TenantId == Tid)
            .OrderByDescending(c => c.CreatedAt).Take(200).ToListAsync(ct);
        return rows.Select(c => new CreditCardPaymentDto(
            c.Id, c.ReceiptId, c.PaymentId, c.CardBrand, c.LastFour,
            c.AuthorizationCode, c.TransactionId, c.Amount, c.Currency,
            c.ProofKind, c.ProofDocumentId, c.Notes, c.CreatedAt)).ToList();
    }

    public async Task<CreditCardPaymentDto> CreateCreditCardPaymentAsync(CreateCreditCardPaymentRequest req, CancellationToken ct)
    {
        var c = new CreditCardPayment {
            TenantId = Tid, ReceiptId = req.ReceiptId, PaymentId = req.PaymentId,
            CardBrand = req.CardBrand, LastFour = req.LastFour,
            AuthorizationCode = req.AuthorizationCode, TransactionId = req.TransactionId,
            Amount = req.Amount, Currency = req.Currency,
            ProofKind = req.ProofKind, ProofDocumentId = req.ProofDocumentId, Notes = req.Notes,
            CreatedAt = clock.GetCurrentInstant(),
        };
        db.CreditCardPayments.Add(c);
        await db.SaveChangesAsync(ct);
        return new CreditCardPaymentDto(c.Id, c.ReceiptId, c.PaymentId, c.CardBrand, c.LastFour,
            c.AuthorizationCode, c.TransactionId, c.Amount, c.Currency,
            c.ProofKind, c.ProofDocumentId, c.Notes, c.CreatedAt);
    }

    /* ===== General expenses ===== */
    public async Task<IReadOnlyList<GeneralExpenseDto>> ListGeneralExpensesAsync(GeneralExpenseKind? kind, CancellationToken ct)
    {
        var q = db.GeneralExpenses.AsNoTracking().Where(g => g.TenantId == Tid);
        if (kind.HasValue) q = q.Where(g => g.ExpenseKind == kind.Value);
        var rows = await q.OrderByDescending(g => g.ExpenseDate).Take(200).ToListAsync(ct);
        var acctIds = rows.Select(r => r.ExpenseAccountId).Distinct().ToList();
        var acctCodes = await db.Accounts.AsNoTracking().Where(a => acctIds.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id, a => a.AccountCode, ct);
        return rows.Select(g => new GeneralExpenseDto(
            g.Id, g.ExpenseNumber, g.ExpenseDate, g.ExpenseKind, g.Description,
            g.ExpenseAccountId, acctCodes.GetValueOrDefault(g.ExpenseAccountId),
            g.Amount, g.Currency, g.Recurrence, g.NextRecurDate, g.IsActive, g.Notes)).ToList();
    }

    public async Task<GeneralExpenseDto> CreateGeneralExpenseAsync(CreateGeneralExpenseRequest req, CancellationToken ct)
    {
        var now = clock.GetCurrentInstant();
        var g = new GeneralExpense {
            TenantId = Tid, ExpenseNumber = req.ExpenseNumber, ExpenseDate = req.ExpenseDate,
            ExpenseKind = req.ExpenseKind, Description = req.Description,
            ExpenseAccountId = req.ExpenseAccountId, Amount = req.Amount, Currency = req.Currency,
            Recurrence = req.Recurrence, NextRecurDate = req.NextRecurDate,
            IsActive = true, Notes = req.Notes,
            CreatedAt = now, ModifiedAt = now,
        };
        db.GeneralExpenses.Add(g);
        await db.SaveChangesAsync(ct);
        return (await ListGeneralExpensesAsync(null, ct)).First(x => x.Id == g.Id);
    }

    /* ===== Comparative profit ===== */
    public async Task<ComparativeProfitDto> ComparativeProfitAsync(int year, CancellationToken ct)
    {
        // Current year periods
        var periods = await db.Periods.AsNoTracking().Where(p => p.TenantId == Tid && p.FiscalYear == year)
            .OrderBy(p => p.PeriodNumber).ToListAsync(ct);
        var periodIds = periods.Select(p => p.Id).ToList();

        var lines = periodIds.Count == 0
            ? new List<ProfitLine>()
            : await (from jl in db.JournalLines.AsNoTracking()
                     join j  in db.Journals.AsNoTracking()  on jl.JournalId equals j.Id
                     join a  in db.Accounts.AsNoTracking()  on jl.AccountId equals a.Id
                     where j.TenantId == Tid && j.IsPosted && periodIds.Contains(j.PeriodId)
                         && (a.AccountClass == AccountClass.Revenue || a.AccountClass == AccountClass.Expense)
                     select new ProfitLine(j.PeriodId, a.AccountClass, jl.AmountFunc, jl.DebitCredit))
                    .ToListAsync(ct);

        var revenuePerMonth = new decimal[12];
        var expensePerMonth = new decimal[12];
        foreach (var p in periods)
        {
            var idx = (p.PeriodNumber - 1) % 12;
            revenuePerMonth[idx] = lines
                .Where(l => l.PeriodId == p.Id && l.AccountClass == AccountClass.Revenue)
                .Sum(l => l.DebitCredit == DebitCredit.Cr ? l.AmountFunc : -l.AmountFunc);
            expensePerMonth[idx] = lines
                .Where(l => l.PeriodId == p.Id && l.AccountClass == AccountClass.Expense)
                .Sum(l => l.DebitCredit == DebitCredit.Dr ? l.AmountFunc : -l.AmountFunc);
        }
        var profitPerMonth = new decimal[12];
        for (int i = 0; i < 12; i++) profitPerMonth[i] = revenuePerMonth[i] - expensePerMonth[i];

        var totalRev = revenuePerMonth.Sum();
        var totalExp = expensePerMonth.Sum();

        // Prior year total
        var priorPeriods = await db.Periods.AsNoTracking().Where(p => p.TenantId == Tid && p.FiscalYear == year - 1)
            .Select(p => p.Id).ToListAsync(ct);
        decimal? priorRev = null, priorExp = null;
        if (priorPeriods.Count > 0)
        {
            var priorLines = await (from jl in db.JournalLines.AsNoTracking()
                                    join j  in db.Journals.AsNoTracking()  on jl.JournalId equals j.Id
                                    join a  in db.Accounts.AsNoTracking()  on jl.AccountId equals a.Id
                                    where j.TenantId == Tid && j.IsPosted && priorPeriods.Contains(j.PeriodId)
                                        && (a.AccountClass == AccountClass.Revenue || a.AccountClass == AccountClass.Expense)
                                    select new { a.AccountClass, jl.AmountFunc, jl.DebitCredit }).ToListAsync(ct);
            priorRev = priorLines.Where(l => l.AccountClass == AccountClass.Revenue)
                .Sum(l => l.DebitCredit == DebitCredit.Cr ? l.AmountFunc : -l.AmountFunc);
            priorExp = priorLines.Where(l => l.AccountClass == AccountClass.Expense)
                .Sum(l => l.DebitCredit == DebitCredit.Dr ? l.AmountFunc : -l.AmountFunc);
        }

        return new ComparativeProfitDto(year, "INR",
            revenuePerMonth, expensePerMonth, profitPerMonth,
            totalRev, totalExp, totalRev - totalExp,
            priorRev, priorExp, priorRev.HasValue && priorExp.HasValue ? priorRev - priorExp : null);
    }

    /* ===== helpers ===== */

    private static IReadOnlyList<long> ParseLongList(string? json) =>
        string.IsNullOrEmpty(json) ? Array.Empty<long>() :
            JsonSerializer.Deserialize<List<long>>(json) ?? new List<long>();

    private static SettlementLinkDto ToSettlementLinkDto(SettlementLink s) =>
        new(s.Id, s.TenantId, s.InvoiceLineId, s.BillLineId,
            s.LinkedAmount, s.Currency, s.Notes,
            s.Status, s.CreatedAt, s.CreatedBy,
            s.ReversedAt, s.ReversedBy, s.ReversalReason);

    private static BankAccountDto ToBankAccountDto(BankAccount a) =>
        new(a.Id, a.AccountCode, a.BankName, a.AccountNumberMasked,
            a.AccountType, a.Currency, a.LedgerAccountId,
            a.RoutingNumber, a.SwiftCode, a.Iban,
            a.IsActive, a.CurrentBalance, a.LastReconDate, a.Notes);

    private static BankStatementLineDto ToStatementLineDto(BankStatementLine l) =>
        new(l.Id, l.StatementId, l.LineDate, l.Description, l.Reference,
            l.Amount, l.RunningBalance, l.IsMatched, l.MatchConfidence);

    // Local record used only by ComparativeProfitAsync to keep LINQ query strongly-typed.
    private sealed record ProfitLine(long PeriodId, AccountClass AccountClass, decimal AmountFunc, DebitCredit DebitCredit);
}
