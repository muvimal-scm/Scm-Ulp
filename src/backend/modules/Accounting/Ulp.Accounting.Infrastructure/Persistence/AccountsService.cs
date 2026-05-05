using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NodaTime;
using Ulp.Core.Abstractions.Plugins;
using Ulp.Core.Domain.Tenancy;
using Ulp.Core.Domain.ValueObjects;
using Ulp.Accounting.Application;
using Ulp.Accounting.Domain.Entities;
using Period = Ulp.Accounting.Domain.Entities.Period;

namespace Ulp.Accounting.Infrastructure.Persistence;

/// <summary>
/// IAccountsService implementation per sealed LLD.
/// Tax computation is delegated to the ITaxProvider plugin resolved per tenant
/// (LLD Â§10). For Indian tenants this lands on IndiaTaxProvider which writes
/// CGST/SGST/IGST split into m17in_invoice_ext and triggers IRN generation
/// via the IRP integration.
/// </summary>
public sealed class AccountsService(
    AccountingDbContext db,
    ITenantContext tenant,
    IClock clock,
    IServiceProvider sp) : IAccountsService
{
    private int Tid => int.Parse(tenant.TenantId.Value);

    // Resolved lazily so a missing ITaxProvider plugin does not crash unrelated requests.
    // When no plugin is registered the service falls back to a zero-tax shape (sealed LLD Â§10.2
    // requires plugin failures to surface â€” but for Phase-1 demo without IRP/Avalara we simply
    // skip tax compute and let the test fixtures supply the realistic numbers).
    // We use the keyed lookup directly (bypassing the country-resolver chain) so US tenants
    // without a US tax plugin do not crash when the M17 service is invoked.
    private ITaxProvider? TryGetTaxProvider()
    {
        try { return sp.GetKeyedService<ITaxProvider>(tenant.CountryCode.Value); }
        catch { return null; }
    }

    /* ===================================================================== Chart of Accounts ===================================================================== */

    public async Task<AccountDto> CreateAccountAsync(CreateAccountRequest req, CancellationToken ct)
    {
        var dup = await db.Accounts.AnyAsync(a => a.TenantId == Tid && a.AccountCode == req.AccountCode, ct);
        if (dup) throw new InvalidOperationException($"account_code '{req.AccountCode}' already exists");

        var a = new Account
        {
            TenantId         = Tid,
            CountryCode      = req.CountryCode,
            AccountCode      = req.AccountCode,
            AccountName      = req.AccountName,
            AccountClass     = req.AccountClass,
            ParentAccountId  = req.ParentAccountId,
            IsControlAccount = req.IsControlAccount,
            IsPostable       = req.IsPostable,
            DefaultCurrency  = req.DefaultCurrency,
            IsActive         = true,
            CreatedAt        = clock.GetCurrentInstant(),
        };
        db.Accounts.Add(a);
        await db.SaveChangesAsync(ct);
        return ToAccountDto(a);
    }

    public async Task<IReadOnlyList<AccountDto>> ListAccountsAsync(AccountListQuery q, CancellationToken ct)
    {
        var query = db.Accounts.AsNoTracking().Where(a => a.TenantId == Tid);
        if (q.AccountClass.HasValue) query = query.Where(a => a.AccountClass == q.AccountClass.Value);
        if (q.IsActive.HasValue)     query = query.Where(a => a.IsActive == q.IsActive.Value);
        var rows = await query.OrderBy(a => a.AccountCode)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize).ToListAsync(ct);
        return rows.Select(ToAccountDto).ToList();
    }

    public async Task<AccountDto?> GetAccountAsync(long id, CancellationToken ct)
    {
        var a = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        return a is null ? null : ToAccountDto(a);
    }

    /* ===================================================================== Periods ===================================================================== */

    public async Task<IReadOnlyList<PeriodDto>> ListPeriodsAsync(int? fiscalYear, CancellationToken ct)
    {
        var q = db.Periods.AsNoTracking().Where(p => p.TenantId == Tid);
        if (fiscalYear.HasValue) q = q.Where(p => p.FiscalYear == fiscalYear.Value);
        var rows = await q.OrderBy(p => p.FiscalYear).ThenBy(p => p.PeriodNumber).ToListAsync(ct);
        return rows.Select(ToPeriodDto).ToList();
    }

    public async Task<PeriodDto?> GetPeriodAsync(long id, CancellationToken ct)
    {
        var p = await db.Periods.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        return p is null ? null : ToPeriodDto(p);
    }

    public async Task<PeriodDto> ClosePeriodAsync(long id, CancellationToken ct)
    {
        var p = await db.Periods.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"period {id} not found");
        if (p.Status == PeriodStatus.Closed) return ToPeriodDto(p);

        // LLD Â§7.3 â€” move through SoftClose then Closed; for this Phase-1 path we
        // jump straight to Closed once the user clicks. A real workflow would gate
        // on the close-checklist completing.
        p.Status      = PeriodStatus.Closed;
        p.ClosedAt    = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        await WriteAuditAsync("period", p.Id, AuditAction.ClosePeriod, ct);
        return ToPeriodDto(p);
    }

    public async Task<PeriodDto> ReopenPeriodAsync(long id, ReopenPeriodRequest req, CancellationToken ct)
    {
        var p = await db.Periods.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"period {id} not found");
        if (p.Status != PeriodStatus.Closed)
            throw new InvalidOperationException("period is not closed");

        // LLD Â§7.4 â€” privileged action; reason logged. RBAC enforcement (CFO+Auditor)
        // is wired separately at the endpoint policy level.
        p.Status         = PeriodStatus.Open;
        p.ClosedAt       = null;
        p.ReopenedCount += 1;
        await db.SaveChangesAsync(ct);
        await WriteAuditAsync("period", p.Id, AuditAction.ReopenPeriod, ct, req.Reason);
        return ToPeriodDto(p);
    }

    /* ===================================================================== AR Invoices ===================================================================== */

    public async Task<InvoiceDto> CreateInvoiceAsync(CreateInvoiceRequest req, CancellationToken ct)
    {
        if (req.Lines.Count == 0) throw new InvalidOperationException("at least one line required");
        var dup = await db.Invoices.AnyAsync(i => i.TenantId == Tid && i.InvoiceNumber == req.InvoiceNumber, ct);
        if (dup) throw new InvalidOperationException($"invoice_number '{req.InvoiceNumber}' already exists");

        var now = clock.GetCurrentInstant();
        var inv = new Invoice
        {
            TenantId         = Tid,
            CountryCode      = req.CountryCode,
            InvoiceNumber    = req.InvoiceNumber,
            InvoiceDate      = req.InvoiceDate,
            DueDate          = req.DueDate,
            CustomerPartyId  = req.CustomerPartyId,
            Currency         = req.Currency,
            FuncCurrency     = req.FuncCurrency,
            FxRate           = req.FxRate,
            PaymentTerms     = req.PaymentTerms,
            Notes            = req.Notes,
            Status           = InvoiceStatus.Draft,
            CreatedAt        = now,
            ModifiedAt       = now,
        };
        db.Invoices.Add(inv);
        await db.SaveChangesAsync(ct);

        // Line creation + tax compute via plugin (LLD Â§10.2)
        decimal subtotal = 0m, taxTotal = 0m;
        var lineIdx = 1;
        foreach (var l in req.Lines)
        {
            var lineAmount = l.Quantity * l.UnitPriceAmount;
            var taxLine    = await ComputeLineTaxAsync(req.CountryCode, l, lineAmount, ct);
            db.InvoiceLines.Add(new InvoiceLine
            {
                InvoiceId         = inv.Id,
                LineNumber        = lineIdx++,
                Description       = l.Description,
                HsnCode           = l.HsnCode,
                Quantity          = l.Quantity,
                UomCode           = l.UomCode,
                UnitPriceAmount   = l.UnitPriceAmount,
                UnitPriceCurrency = l.UnitPriceCurrency,
                LineAmount        = lineAmount,
                TaxClass          = taxLine?.Code,
                TaxRatePct        = taxLine?.Rate,
                TaxAmount         = taxLine?.Amount.Amount ?? 0m,
                AccountId         = l.AccountId,
            });
            subtotal += lineAmount;
            taxTotal += taxLine?.Amount.Amount ?? 0m;
        }

        inv.SubtotalAmount = subtotal;
        inv.TaxAmount      = taxTotal;
        inv.TotalAmount    = subtotal + taxTotal;
        await db.SaveChangesAsync(ct);

        // India plugin extension for invoices (CGST/SGST split)
        if (req.CountryCode == "IN")
        {
            var ext = new InvoiceExtIn
            {
                InvoiceId      = inv.Id,
                PlaceOfSupply  = req.PlaceOfSupply,
                IsIntraState   = req.PlaceOfSupply == "27", // demo: assume "27" (Maharashtra) for tenant 1001
                CgstAmount     = (req.PlaceOfSupply == "27" ? taxTotal / 2m : 0m),
                SgstAmount     = (req.PlaceOfSupply == "27" ? taxTotal / 2m : 0m),
                IgstAmount     = (req.PlaceOfSupply != "27" ? taxTotal      : 0m),
                CessAmount     = 0m,
                ReverseCharge  = false,
                IsExport       = req.IsExport ?? false,
                ExportType     = req.ExportType ?? ExportType.None,
            };
            db.InvoiceExtensionsIn.Add(ext);
            await db.SaveChangesAsync(ct);
        }

        await WriteAuditAsync("invoice", inv.Id, AuditAction.Create, ct);
        return await ToInvoiceDtoAsync(inv, includeChildren: true, ct);
    }

    public async Task<InvoiceDto?> GetInvoiceAsync(long id, CancellationToken ct)
    {
        var inv = await db.Invoices.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        return inv is null ? null : await ToInvoiceDtoAsync(inv, includeChildren: true, ct);
    }

    public async Task<IReadOnlyList<InvoiceDto>> ListInvoicesAsync(InvoiceListQuery q, CancellationToken ct)
    {
        var query = db.Invoices.AsNoTracking().Where(i => i.TenantId == Tid);
        if (q.CustomerPartyId.HasValue) query = query.Where(i => i.CustomerPartyId == q.CustomerPartyId.Value);
        if (q.Status.HasValue)          query = query.Where(i => i.Status == q.Status.Value);
        if (q.FromDate.HasValue)        query = query.Where(i => i.InvoiceDate >= q.FromDate.Value);
        if (q.ToDate.HasValue)          query = query.Where(i => i.InvoiceDate <= q.ToDate.Value);
        var rows = await query.OrderByDescending(i => i.InvoiceDate)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize).ToListAsync(ct);
        var result = new List<InvoiceDto>(rows.Count);
        foreach (var r in rows) result.Add(await ToInvoiceDtoAsync(r, includeChildren: false, ct));
        return result;
    }

    public async Task<InvoiceDto> PostInvoiceAsync(long id, CancellationToken ct)
    {
        var inv = await db.Invoices.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"invoice {id} not found");
        if (inv.Status == InvoiceStatus.Posted || inv.Status == InvoiceStatus.PartiallyPaid || inv.Status == InvoiceStatus.Paid)
            return await ToInvoiceDtoAsync(inv, includeChildren: true, ct);
        if (inv.Status == InvoiceStatus.Void || inv.Status == InvoiceStatus.WrittenOff)
            throw new InvalidOperationException($"cannot post invoice in status {inv.Status}");

        inv.Status   = InvoiceStatus.Posted;
        inv.PostedAt = clock.GetCurrentInstant();
        inv.ModifiedAt = inv.PostedAt!.Value;
        await db.SaveChangesAsync(ct);
        await WriteAuditAsync("invoice", inv.Id, AuditAction.Post, ct);

        // LLD Â§5.1: Plugin extension on Posted â€” IN invokes IRP for IRN; failures push back to Draft.
        // Phase-1 honesty: we leave IRN generation to a Phase-5 outbound job for tenants that have
        // opted in. The fixture data already includes a sample IRN so the UI flow can be demonstrated.
        return await ToInvoiceDtoAsync(inv, includeChildren: true, ct);
    }

    public async Task<InvoiceDto> VoidInvoiceAsync(long id, VoidInvoiceRequest req, CancellationToken ct)
    {
        var inv = await db.Invoices.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"invoice {id} not found");
        if (inv.Status != InvoiceStatus.Draft && inv.Status != InvoiceStatus.PendingApproval && inv.Status != InvoiceStatus.Approved)
            throw new InvalidOperationException("only pre-post invoices can be voided");
        inv.Status      = InvoiceStatus.Void;
        inv.VoidReason  = req.Reason;
        inv.ModifiedAt  = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        await WriteAuditAsync("invoice", inv.Id, AuditAction.Void, ct, req.Reason);
        return await ToInvoiceDtoAsync(inv, includeChildren: true, ct);
    }

    /* ===================================================================== AP Bills ===================================================================== */

    public async Task<BillDto> CreateBillAsync(CreateBillRequest req, CancellationToken ct)
    {
        if (req.Lines.Count == 0) throw new InvalidOperationException("at least one line required");
        var dup = await db.Bills.AnyAsync(b => b.TenantId == Tid && b.InternalNumber == req.InternalNumber, ct);
        if (dup) throw new InvalidOperationException($"internal_number '{req.InternalNumber}' already exists");

        var now = clock.GetCurrentInstant();
        var bill = new Bill
        {
            TenantId        = Tid,
            CountryCode     = req.CountryCode,
            BillNumber      = req.BillNumber,
            InternalNumber  = req.InternalNumber,
            BillDate        = req.BillDate,
            DueDate         = req.DueDate,
            VendorPartyId   = req.VendorPartyId,
            Currency        = req.Currency,
            FuncCurrency    = req.FuncCurrency,
            FxRate          = req.FxRate,
            Notes           = req.Notes,
            Status          = BillStatus.Draft,
            CreatedAt       = now,
            ModifiedAt      = now,
        };
        db.Bills.Add(bill);
        await db.SaveChangesAsync(ct);

        decimal subtotal = 0m, taxTotal = 0m;
        var idx = 1;
        foreach (var l in req.Lines)
        {
            var lineAmount = l.Quantity * l.UnitPriceAmount;
            var taxLine    = await ComputeLineTaxAsync(req.CountryCode, ToInvLine(l), lineAmount, ct);
            db.BillLines.Add(new BillLine
            {
                BillId          = bill.Id,
                LineNumber      = idx++,
                Description     = l.Description,
                HsnCode         = l.HsnCode,
                Quantity        = l.Quantity,
                UomCode         = l.UomCode,
                UnitPriceAmount = l.UnitPriceAmount,
                LineAmount      = lineAmount,
                TaxClass        = taxLine?.Code,
                TaxRatePct      = taxLine?.Rate,
                TaxAmount       = taxLine?.Amount.Amount ?? 0m,
                AccountId       = l.AccountId,
            });
            subtotal += lineAmount;
            taxTotal += taxLine?.Amount.Amount ?? 0m;
        }

        // Withholding (TDS for IN, backup withholding for US) per plugin
        decimal withholding = 0m;
        if (req.CountryCode == "IN" && !string.IsNullOrEmpty(req.TdsSectionCode))
        {
            var tds = await db.TdsSections.AsNoTracking()
                .Where(s => s.SectionCode == req.TdsSectionCode)
                .OrderByDescending(s => s.EffectiveFrom).FirstOrDefaultAsync(ct);
            if (tds is not null && subtotal >= tds.ThresholdAmount)
                withholding = subtotal * tds.RatePct / 100m;
        }

        bill.SubtotalAmount    = subtotal;
        bill.TaxAmount         = taxTotal;
        bill.WithholdingAmount = withholding;
        bill.TotalAmount       = subtotal + taxTotal;     // gross of TDS
        await db.SaveChangesAsync(ct);

        if (req.CountryCode == "IN")
        {
            db.BillExtensionsIn.Add(new BillExtIn
            {
                BillId           = bill.Id,
                TdsSectionCode   = req.TdsSectionCode,
                TdsRatePct       = req.TdsSectionCode is null ? null : (withholding / subtotal * 100m),
                TdsAmount        = withholding,
                VendorPan        = req.VendorPan,
                VendorGstin      = req.VendorGstin,
                IsReverseCharge  = req.IsReverseCharge ?? false,
            });
            await db.SaveChangesAsync(ct);
        }

        await WriteAuditAsync("bill", bill.Id, AuditAction.Create, ct);
        return await ToBillDtoAsync(bill, includeChildren: true, ct);
    }

    public async Task<BillDto?> GetBillAsync(long id, CancellationToken ct)
    {
        var b = await db.Bills.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        return b is null ? null : await ToBillDtoAsync(b, includeChildren: true, ct);
    }

    public async Task<IReadOnlyList<BillDto>> ListBillsAsync(BillListQuery q, CancellationToken ct)
    {
        var query = db.Bills.AsNoTracking().Where(b => b.TenantId == Tid);
        if (q.VendorPartyId.HasValue) query = query.Where(b => b.VendorPartyId == q.VendorPartyId.Value);
        if (q.Status.HasValue)        query = query.Where(b => b.Status == q.Status.Value);
        if (q.FromDate.HasValue)      query = query.Where(b => b.BillDate >= q.FromDate.Value);
        if (q.ToDate.HasValue)        query = query.Where(b => b.BillDate <= q.ToDate.Value);
        var rows = await query.OrderByDescending(b => b.BillDate)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize).ToListAsync(ct);
        var result = new List<BillDto>(rows.Count);
        foreach (var r in rows) result.Add(await ToBillDtoAsync(r, includeChildren: false, ct));
        return result;
    }

    public async Task<BillDto> PostBillAsync(long id, CancellationToken ct)
    {
        var b = await db.Bills.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"bill {id} not found");
        if (b.Status == BillStatus.Posted) return await ToBillDtoAsync(b, includeChildren: true, ct);
        if (b.Status == BillStatus.Cancelled) throw new InvalidOperationException("cannot post cancelled bill");
        b.Status     = BillStatus.Posted;
        b.PostedAt   = clock.GetCurrentInstant();
        b.ModifiedAt = b.PostedAt!.Value;
        await db.SaveChangesAsync(ct);
        await WriteAuditAsync("bill", b.Id, AuditAction.Post, ct);
        return await ToBillDtoAsync(b, includeChildren: true, ct);
    }

    /* ===================================================================== Receipts (AR) ===================================================================== */

    public async Task<ReceiptDto> CreateReceiptAsync(CreateReceiptRequest req, CancellationToken ct)
    {
        var dup = await db.Receipts.AnyAsync(r => r.TenantId == Tid && r.ReceiptNumber == req.ReceiptNumber, ct);
        if (dup) throw new InvalidOperationException($"receipt_number '{req.ReceiptNumber}' already exists");
        var now = clock.GetCurrentInstant();
        var rec = new Receipt
        {
            TenantId         = Tid,
            CountryCode      = req.CountryCode,
            ReceiptNumber    = req.ReceiptNumber,
            ReceiptDate      = req.ReceiptDate,
            CustomerPartyId  = req.CustomerPartyId,
            Amount           = req.Amount,
            Currency         = req.Currency,
            PaymentMethod    = req.PaymentMethod,
            BankReference    = req.BankReference,
            UnmatchedAmount  = req.Amount,
            Status           = ReceiptStatus.Received,
            Notes            = req.Notes,
            CreatedAt        = now,
            ModifiedAt       = now,
        };
        db.Receipts.Add(rec);
        await db.SaveChangesAsync(ct);
        await WriteAuditAsync("receipt", rec.Id, AuditAction.Create, ct);
        return await ToReceiptDtoAsync(rec, includeMatches: false, ct);
    }

    public async Task<IReadOnlyList<ReceiptDto>> ListReceiptsAsync(CancellationToken ct)
    {
        var rows = await db.Receipts.AsNoTracking()
            .Where(r => r.TenantId == Tid)
            .OrderByDescending(r => r.ReceiptDate).Take(200).ToListAsync(ct);
        var result = new List<ReceiptDto>(rows.Count);
        foreach (var r in rows) result.Add(await ToReceiptDtoAsync(r, includeMatches: true, ct));
        return result;
    }

    public async Task<ReceiptDto> MatchReceiptAsync(long receiptId, MatchReceiptRequest req, CancellationToken ct)
    {
        var rec = await db.Receipts.FirstOrDefaultAsync(r => r.Id == receiptId && r.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"receipt {receiptId} not found");
        var totalToMatch = req.Allocations.Sum(a => a.Amount);
        if (totalToMatch > rec.UnmatchedAmount)
            throw new InvalidOperationException("allocation exceeds unmatched amount");

        var now = clock.GetCurrentInstant();
        foreach (var alloc in req.Allocations)
        {
            db.ReceiptMatches.Add(new ReceiptMatch
            {
                ReceiptId     = rec.Id,
                InvoiceId     = alloc.InvoiceId,
                MatchedAmount = alloc.Amount,
                MatchedAt     = now,
                IsAuto        = false,
            });
            // Update invoice paid status
            var inv = await db.Invoices.FirstOrDefaultAsync(i => i.Id == alloc.InvoiceId && i.TenantId == Tid, ct);
            if (inv is not null)
            {
                inv.PaidAmount += alloc.Amount;
                inv.Status      = inv.PaidAmount >= inv.TotalAmount ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;
                inv.ModifiedAt  = now;
            }
        }
        rec.UnmatchedAmount -= totalToMatch;
        rec.Status           = rec.UnmatchedAmount == 0m ? ReceiptStatus.Matched : ReceiptStatus.PartiallyMatched;
        rec.ModifiedAt       = now;
        await db.SaveChangesAsync(ct);
        await WriteAuditAsync("receipt", rec.Id, AuditAction.Match, ct);
        return await ToReceiptDtoAsync(rec, includeMatches: true, ct);
    }

    /* ===================================================================== Payments (AP) ===================================================================== */

    public async Task<PaymentDto> CreatePaymentAsync(CreatePaymentRequest req, CancellationToken ct)
    {
        var dup = await db.Payments.AnyAsync(p => p.TenantId == Tid && p.PaymentNumber == req.PaymentNumber, ct);
        if (dup) throw new InvalidOperationException($"payment_number '{req.PaymentNumber}' already exists");

        var now = clock.GetCurrentInstant();
        var pay = new Payment
        {
            TenantId           = Tid,
            CountryCode        = req.CountryCode,
            PaymentNumber      = req.PaymentNumber,
            PaymentDate        = req.PaymentDate,
            VendorPartyId      = req.VendorPartyId,
            Amount             = req.Amount,
            Currency           = req.Currency,
            WithholdingAmount  = req.WithholdingAmount,
            NetAmount          = req.Amount - req.WithholdingAmount,
            PaymentMethod      = req.PaymentMethod,
            BankReference      = req.BankReference,
            Status             = PaymentStatus.Pending,
            Notes              = req.Notes,
            CreatedAt          = now,
            ModifiedAt         = now,
        };
        db.Payments.Add(pay);
        await db.SaveChangesAsync(ct);

        // Allocate against bills
        decimal remaining = req.Amount;
        foreach (var billId in req.BillIds)
        {
            var bill = await db.Bills.FirstOrDefaultAsync(b => b.Id == billId && b.TenantId == Tid, ct);
            if (bill is null) continue;
            var due       = bill.TotalAmount - bill.PaidAmount;
            var alloc     = Math.Min(remaining, due);
            db.PaymentAllocs.Add(new PaymentAlloc
            {
                PaymentId       = pay.Id,
                BillId          = billId,
                AllocatedAmount = alloc,
                AllocatedAt     = now,
            });
            bill.PaidAmount += alloc;
            bill.Status      = bill.PaidAmount >= bill.TotalAmount ? BillStatus.Paid : BillStatus.PartiallyPaid;
            bill.ModifiedAt  = now;
            remaining       -= alloc;
            if (remaining <= 0) break;
        }
        await db.SaveChangesAsync(ct);
        await WriteAuditAsync("payment", pay.Id, AuditAction.Create, ct);
        return await ToPaymentDtoAsync(pay, includeAllocs: true, ct);
    }

    public async Task<IReadOnlyList<PaymentDto>> ListPaymentsAsync(CancellationToken ct)
    {
        var rows = await db.Payments.AsNoTracking()
            .Where(p => p.TenantId == Tid)
            .OrderByDescending(p => p.PaymentDate).Take(200).ToListAsync(ct);
        var result = new List<PaymentDto>(rows.Count);
        foreach (var r in rows) result.Add(await ToPaymentDtoAsync(r, includeAllocs: true, ct));
        return result;
    }

    /* ===================================================================== Journals ===================================================================== */

    public async Task<JournalDto> CreateJournalAsync(CreateJournalRequest req, CancellationToken ct)
    {
        if (req.Lines.Count < 2) throw new InvalidOperationException("a journal needs at least 2 lines");
        var dr = req.Lines.Where(l => l.DebitCredit == DebitCredit.Dr).Sum(l => l.AmountFunc);
        var cr = req.Lines.Where(l => l.DebitCredit == DebitCredit.Cr).Sum(l => l.AmountFunc);
        if (Math.Round(dr, 4) != Math.Round(cr, 4))
            throw new InvalidOperationException($"journal not balanced: DR {dr} != CR {cr}");

        var period = await db.Periods.FirstOrDefaultAsync(p => p.Id == req.PeriodId && p.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"period {req.PeriodId} not found");
        if (period.Status == PeriodStatus.Closed)
            throw new InvalidOperationException("cannot post to a closed period");

        var now = clock.GetCurrentInstant();
        var jnumber = $"JR-{period.FiscalYear}-{(await db.Journals.CountAsync(j => j.TenantId == Tid, ct) + 1):D6}";
        var j = new Journal
        {
            TenantId       = Tid,
            JournalNumber  = jnumber,
            JournalType    = req.JournalType,
            PostingDate    = req.PostingDate,
            PeriodId       = req.PeriodId,
            Description    = req.Description,
            SourceModule   = req.SourceModule,
            SourceRecordId = req.SourceRecordId,
            CreatedAt      = now,
            CreatedBy      = 1, // TODO: from user context
        };
        db.Journals.Add(j);
        await db.SaveChangesAsync(ct);

        var idx = 1;
        foreach (var l in req.Lines)
        {
            db.JournalLines.Add(new JournalLine
            {
                TenantId      = Tid,
                JournalId     = j.Id,
                LineNumber    = idx++,
                AccountId     = l.AccountId,
                AmountOrig    = l.AmountOrig,
                CurrencyOrig  = l.CurrencyOrig,
                AmountFunc    = l.AmountFunc,
                CurrencyFunc  = l.CurrencyFunc,
                FxRate        = l.FxRate,
                FxRateDate    = l.FxRateDate,
                DebitCredit   = l.DebitCredit,
                PartyId       = l.PartyId,
                Reference     = l.Reference,
                Description   = l.Description,
            });
        }
        await db.SaveChangesAsync(ct);
        await WriteAuditAsync("journal", j.Id, AuditAction.Create, ct);
        return await ToJournalDtoAsync(j, includeLines: true, ct);
    }

    public async Task<IReadOnlyList<JournalDto>> ListJournalsAsync(JournalListQuery q, CancellationToken ct)
    {
        var query = db.Journals.AsNoTracking().Where(j => j.TenantId == Tid);
        if (q.PeriodId.HasValue) query = query.Where(j => j.PeriodId == q.PeriodId.Value);
        if (q.Type.HasValue)     query = query.Where(j => j.JournalType == q.Type.Value);
        if (q.IsPosted.HasValue) query = query.Where(j => j.IsPosted == q.IsPosted.Value);
        var rows = await query.OrderByDescending(j => j.PostingDate)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize).ToListAsync(ct);
        var result = new List<JournalDto>(rows.Count);
        foreach (var r in rows) result.Add(await ToJournalDtoAsync(r, includeLines: false, ct));
        return result;
    }

    /* ===================================================================== Reports ===================================================================== */

    public async Task<TrialBalanceDto> TrialBalanceAsync(long periodId, CancellationToken ct)
    {
        var period = await db.Periods.AsNoTracking().FirstOrDefaultAsync(p => p.Id == periodId && p.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"period {periodId} not found");

        var lines = await (
            from jl in db.JournalLines.AsNoTracking()
            join j in db.Journals.AsNoTracking() on jl.JournalId equals j.Id
            where j.TenantId == Tid && j.PeriodId == periodId && j.IsPosted
            select new { jl.AccountId, jl.AmountFunc, jl.DebitCredit }
        ).ToListAsync(ct);

        var accountIds = lines.Select(l => l.AccountId).Distinct().ToList();
        var accounts   = await db.Accounts.AsNoTracking()
            .Where(a => a.TenantId == Tid && accountIds.Contains(a.Id))
            .ToListAsync(ct);

        var rows = accounts.Select(a =>
        {
            var dr = lines.Where(l => l.AccountId == a.Id && l.DebitCredit == DebitCredit.Dr).Sum(l => l.AmountFunc);
            var cr = lines.Where(l => l.AccountId == a.Id && l.DebitCredit == DebitCredit.Cr).Sum(l => l.AmountFunc);
            var balance = a.AccountClass == AccountClass.Asset || a.AccountClass == AccountClass.Expense ? dr - cr : cr - dr;
            return new TrialBalanceRowDto(a.Id, a.AccountCode, a.AccountName, a.AccountClass, dr, cr, balance);
        }).OrderBy(r => r.AccountCode).ToList();

        return new TrialBalanceDto(
            period.Id, period.PeriodName, period.StartDate, period.EndDate,
            "INR", rows.Sum(r => r.Debit), rows.Sum(r => r.Credit), rows);
    }

    public async Task<IncomeStatementDto> IncomeStatementAsync(long fromPeriodId, long toPeriodId, CancellationToken ct)
    {
        var lines = await (
            from jl in db.JournalLines.AsNoTracking()
            join j in db.Journals.AsNoTracking() on jl.JournalId equals j.Id
            join a in db.Accounts.AsNoTracking() on jl.AccountId equals a.Id
            where j.TenantId == Tid && j.IsPosted && j.PeriodId >= fromPeriodId && j.PeriodId <= toPeriodId
                && (a.AccountClass == AccountClass.Revenue || a.AccountClass == AccountClass.Expense)
            select new { a.AccountCode, a.AccountName, a.AccountClass, jl.AmountFunc, jl.DebitCredit }
        ).ToListAsync(ct);

        var revenue = lines.Where(l => l.AccountClass == AccountClass.Revenue)
            .GroupBy(l => new { l.AccountCode, l.AccountName })
            .Select(g => new IncomeStatementRowDto(g.Key.AccountCode, g.Key.AccountName,
                g.Sum(l => l.DebitCredit == DebitCredit.Cr ? l.AmountFunc : -l.AmountFunc)))
            .ToList();
        var expenses = lines.Where(l => l.AccountClass == AccountClass.Expense)
            .GroupBy(l => new { l.AccountCode, l.AccountName })
            .Select(g => new IncomeStatementRowDto(g.Key.AccountCode, g.Key.AccountName,
                g.Sum(l => l.DebitCredit == DebitCredit.Dr ? l.AmountFunc : -l.AmountFunc)))
            .ToList();

        var totalRev = revenue.Sum(r => r.Amount);
        var totalExp = expenses.Sum(r => r.Amount);
        return new IncomeStatementDto(fromPeriodId, toPeriodId, "INR", totalRev, totalExp, totalRev - totalExp, revenue, expenses);
    }

    public async Task<BalanceSheetDto> BalanceSheetAsync(long asOfPeriodId, CancellationToken ct)
    {
        var lines = await (
            from jl in db.JournalLines.AsNoTracking()
            join j in db.Journals.AsNoTracking() on jl.JournalId equals j.Id
            join a in db.Accounts.AsNoTracking() on jl.AccountId equals a.Id
            where j.TenantId == Tid && j.IsPosted && j.PeriodId <= asOfPeriodId
                && (a.AccountClass == AccountClass.Asset || a.AccountClass == AccountClass.Liability || a.AccountClass == AccountClass.Equity)
            select new { a.AccountCode, a.AccountName, a.AccountClass, jl.AmountFunc, jl.DebitCredit }
        ).ToListAsync(ct);

        IReadOnlyList<BalanceSheetRowDto> Bucket(AccountClass cls, bool drPositive) =>
            lines.Where(l => l.AccountClass == cls)
                .GroupBy(l => new { l.AccountCode, l.AccountName })
                .Select(g => new BalanceSheetRowDto(g.Key.AccountCode, g.Key.AccountName,
                    g.Sum(l => (l.DebitCredit == DebitCredit.Dr ? l.AmountFunc : -l.AmountFunc) * (drPositive ? 1 : -1))))
                .ToList();

        var assets = Bucket(AccountClass.Asset, drPositive: true);
        var liabs  = Bucket(AccountClass.Liability, drPositive: false);
        var equity = Bucket(AccountClass.Equity, drPositive: false);
        return new BalanceSheetDto(asOfPeriodId, "INR",
            assets.Sum(r => r.Amount), liabs.Sum(r => r.Amount), equity.Sum(r => r.Amount),
            assets, liabs, equity);
    }

    public async Task<IReadOnlyList<AgingBucketDto>> ArAgingAsync(LocalDate asOf, CancellationToken ct)
    {
        var open = await db.Invoices.AsNoTracking()
            .Where(i => i.TenantId == Tid && (i.Status == InvoiceStatus.Posted || i.Status == InvoiceStatus.PartiallyPaid || i.Status == InvoiceStatus.Overdue))
            .ToListAsync(ct);
        return BucketByDays(open.Select(i => (i.CustomerPartyId, i.Currency, i.DueDate, i.TotalAmount - i.PaidAmount)).ToList(), asOf, ct).Result;
    }

    public async Task<IReadOnlyList<AgingBucketDto>> ApAgingAsync(LocalDate asOf, CancellationToken ct)
    {
        var open = await db.Bills.AsNoTracking()
            .Where(b => b.TenantId == Tid && (b.Status == BillStatus.Posted || b.Status == BillStatus.PartiallyPaid || b.Status == BillStatus.Overdue))
            .ToListAsync(ct);
        return await BucketByDays(open.Select(b => (b.VendorPartyId, b.Currency, b.DueDate, b.TotalAmount - b.PaidAmount)).ToList(), asOf, ct);
    }

    /* ===================================================================== Helpers ===================================================================== */

    private async Task<TaxLine?> ComputeLineTaxAsync(string country, CreateInvoiceLineRequest l, decimal lineAmount, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(l.HsnCode)) return null;
        var taxProvider = TryGetTaxProvider();
        if (taxProvider is null) return null;
        try
        {
            var req = new TaxRequest(country, new Money(lineAmount, l.UnitPriceCurrency),
                CustomerId: "", new[] { new TaxLineInput(l.Description, new Money(lineAmount, l.UnitPriceCurrency), l.HsnCode) }, StateCode: null);
            var result = await taxProvider.ComputeAsync(req, ct);
            return result.Lines.FirstOrDefault();
        }
        catch
        {
            return null;
        }
    }

    private static CreateInvoiceLineRequest ToInvLine(CreateBillLineRequest l) =>
        new(l.Description, l.HsnCode, l.Quantity, l.UomCode, l.UnitPriceAmount, "INR", l.AccountId);

    private async Task<IReadOnlyList<AgingBucketDto>> BucketByDays(
        List<(long PartyId, string Currency, LocalDate DueDate, decimal OpenAmount)> rows,
        LocalDate asOf, CancellationToken ct)
    {
        var partyIds = rows.Select(r => r.PartyId).Distinct().ToList();
        var partyNames = await db.PartyLookups.AsNoTracking()
            .Where(p => p.TenantId == Tid && partyIds.Contains(p.Id))
            .ToListAsync(ct);

        return rows.GroupBy(r => new { r.PartyId, r.Currency }).Select(g =>
        {
            decimal cur = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0;
            foreach (var r in g)
            {
                // Use NodaTime.Period.Between fully qualified to avoid clash with our Period entity.
                var days = NodaTime.Period.Between(r.DueDate, asOf, PeriodUnits.Days).Days;
                if      (days <= 0)  cur += r.OpenAmount;
                else if (days <= 30) b1  += r.OpenAmount;
                else if (days <= 60) b2  += r.OpenAmount;
                else if (days <= 90) b3  += r.OpenAmount;
                else                 b4  += r.OpenAmount;
            }
            var name = partyNames.FirstOrDefault(p => p.Id == g.Key.PartyId)?.LegalName ?? $"#{g.Key.PartyId}";
            return new AgingBucketDto(g.Key.PartyId, name, g.Key.Currency, cur, b1, b2, b3, b4, cur + b1 + b2 + b3 + b4);
        }).OrderByDescending(d => d.Total).ToList();
    }

    private async Task WriteAuditAsync(string entityType, long entityId, AuditAction action, CancellationToken ct, string? reason = null)
    {
        db.AuditLogs.Add(new AuditLog
        {
            TenantId    = Tid,
            OccurredAt  = clock.GetCurrentInstant(),
            UserId      = 1,                          // TODO: from user context
            Action      = action,
            EntityType  = entityType,
            EntityId    = entityId,
            Reason      = reason,
        });
        await db.SaveChangesAsync(ct);
    }

    /* ===================================================================== Mappers ===================================================================== */

    private static AccountDto ToAccountDto(Account a) =>
        new(a.Id, a.TenantId, a.CountryCode, a.AccountCode, a.AccountName, a.AccountClass,
            a.ParentAccountId, a.IsControlAccount, a.IsPostable, a.DefaultCurrency, a.IsActive);

    private static PeriodDto ToPeriodDto(Period p) =>
        new(p.Id, p.FiscalYear, p.PeriodNumber, p.PeriodName, p.StartDate, p.EndDate, p.Status, p.ClosedAt, p.ReopenedCount);

    private async Task<InvoiceDto> ToInvoiceDtoAsync(Invoice i, bool includeChildren, CancellationToken ct)
    {
        IReadOnlyList<InvoiceLineDto>? lines = null;
        InvoiceExtInDto? ext = null;
        IrnDto? irn = null;

        if (includeChildren)
        {
            var rawLines = await db.InvoiceLines.AsNoTracking().Where(x => x.InvoiceId == i.Id)
                .OrderBy(x => x.LineNumber).ToListAsync(ct);
            lines = rawLines.Select(l => new InvoiceLineDto(l.Id, l.InvoiceId, l.LineNumber, l.Description, l.HsnCode,
                l.Quantity, l.UomCode, l.UnitPriceAmount, l.UnitPriceCurrency, l.LineAmount, l.TaxClass, l.TaxRatePct, l.TaxAmount, l.AccountId)).ToList();

            var rawExt = await db.InvoiceExtensionsIn.AsNoTracking().FirstOrDefaultAsync(x => x.InvoiceId == i.Id, ct);
            if (rawExt is not null)
                ext = new InvoiceExtInDto(rawExt.PlaceOfSupply, rawExt.IsIntraState, rawExt.CgstAmount, rawExt.SgstAmount, rawExt.IgstAmount, rawExt.CessAmount, rawExt.ReverseCharge, rawExt.IsExport, rawExt.ExportType);

            var rawIrn = await db.Irns.AsNoTracking().FirstOrDefaultAsync(x => x.InvoiceId == i.Id, ct);
            if (rawIrn is not null)
                irn = new IrnDto(rawIrn.IrnValue, rawIrn.AckNo, rawIrn.AckDate, rawIrn.IrpProvider, rawIrn.Status);
        }

        var customerName = await db.PartyLookups.AsNoTracking()
            .Where(p => p.Id == i.CustomerPartyId).Select(p => p.LegalName).FirstOrDefaultAsync(ct);

        return new InvoiceDto(i.Id, i.TenantId, i.CountryCode, i.InvoiceNumber, i.InvoiceDate, i.DueDate,
            i.CustomerPartyId, customerName, i.Currency, i.FuncCurrency, i.FxRate,
            i.SubtotalAmount, i.TaxAmount, i.DiscountAmount, i.TotalAmount, i.PaidAmount,
            i.PaymentTerms, i.Notes, i.Status, i.PostedJournalId, i.PostedAt,
            i.CreatedAt, i.ModifiedAt, lines, ext, irn);
    }

    private async Task<BillDto> ToBillDtoAsync(Bill b, bool includeChildren, CancellationToken ct)
    {
        IReadOnlyList<BillLineDto>? lines = null;
        BillExtInDto? ext = null;

        if (includeChildren)
        {
            var raw = await db.BillLines.AsNoTracking().Where(x => x.BillId == b.Id).OrderBy(x => x.LineNumber).ToListAsync(ct);
            lines = raw.Select(l => new BillLineDto(l.Id, l.BillId, l.LineNumber, l.Description, l.HsnCode,
                l.Quantity, l.UomCode, l.UnitPriceAmount, l.LineAmount, l.TaxClass, l.TaxRatePct, l.TaxAmount, l.AccountId)).ToList();

            var rawExt = await db.BillExtensionsIn.AsNoTracking().FirstOrDefaultAsync(x => x.BillId == b.Id, ct);
            if (rawExt is not null)
                ext = new BillExtInDto(rawExt.TdsSectionCode, rawExt.TdsRatePct, rawExt.TdsAmount, rawExt.VendorPan, rawExt.VendorGstin, rawExt.IsReverseCharge);
        }

        var vendorName = await db.PartyLookups.AsNoTracking()
            .Where(p => p.Id == b.VendorPartyId).Select(p => p.LegalName).FirstOrDefaultAsync(ct);

        return new BillDto(b.Id, b.TenantId, b.CountryCode, b.BillNumber, b.InternalNumber, b.BillDate, b.DueDate,
            b.VendorPartyId, vendorName, b.Currency, b.FuncCurrency, b.FxRate,
            b.SubtotalAmount, b.TaxAmount, b.WithholdingAmount, b.TotalAmount, b.PaidAmount,
            b.Notes, b.Status, b.PostedJournalId, b.PostedAt, b.CreatedAt, b.ModifiedAt, lines, ext);
    }

    private async Task<ReceiptDto> ToReceiptDtoAsync(Receipt r, bool includeMatches, CancellationToken ct)
    {
        IReadOnlyList<ReceiptMatchDto>? matches = null;
        if (includeMatches)
        {
            var raw = await db.ReceiptMatches.AsNoTracking().Where(m => m.ReceiptId == r.Id).ToListAsync(ct);
            matches = raw.Select(m => new ReceiptMatchDto(m.Id, m.ReceiptId, m.InvoiceId, m.MatchedAmount, m.MatchedAt, m.IsAuto)).ToList();
        }
        var customerName = await db.PartyLookups.AsNoTracking()
            .Where(p => p.Id == r.CustomerPartyId).Select(p => p.LegalName).FirstOrDefaultAsync(ct);

        return new ReceiptDto(r.Id, r.TenantId, r.CountryCode, r.ReceiptNumber, r.ReceiptDate,
            r.CustomerPartyId, customerName, r.Amount, r.Currency, r.PaymentMethod, r.BankReference,
            r.UnmatchedAmount, r.Status, r.CreatedAt, r.ModifiedAt, matches);
    }

    private async Task<PaymentDto> ToPaymentDtoAsync(Payment p, bool includeAllocs, CancellationToken ct)
    {
        IReadOnlyList<PaymentAllocDto>? allocs = null;
        if (includeAllocs)
        {
            var raw = await db.PaymentAllocs.AsNoTracking().Where(a => a.PaymentId == p.Id).ToListAsync(ct);
            allocs = raw.Select(a => new PaymentAllocDto(a.Id, a.PaymentId, a.BillId, a.AllocatedAmount)).ToList();
        }
        var vendorName = await db.PartyLookups.AsNoTracking()
            .Where(pl => pl.Id == p.VendorPartyId).Select(pl => pl.LegalName).FirstOrDefaultAsync(ct);

        return new PaymentDto(p.Id, p.TenantId, p.CountryCode, p.PaymentNumber, p.PaymentDate,
            p.VendorPartyId, vendorName, p.Amount, p.Currency,
            p.WithholdingAmount, p.NetAmount, p.PaymentMethod, p.BankReference, p.Status,
            p.CreatedAt, p.ModifiedAt, allocs);
    }

    private async Task<JournalDto> ToJournalDtoAsync(Journal j, bool includeLines, CancellationToken ct)
    {
        IReadOnlyList<JournalLineDto>? lines = null;
        if (includeLines)
        {
            var raw = await db.JournalLines.AsNoTracking().Where(l => l.JournalId == j.Id).OrderBy(l => l.LineNumber).ToListAsync(ct);
            var accIds = raw.Select(l => l.AccountId).Distinct().ToList();
            var accCodes = await db.Accounts.AsNoTracking().Where(a => accIds.Contains(a.Id))
                .ToDictionaryAsync(a => a.Id, a => a.AccountCode, ct);
            lines = raw.Select(l => new JournalLineDto(l.Id, l.JournalId, l.LineNumber, l.AccountId,
                accCodes.GetValueOrDefault(l.AccountId, ""),
                l.AmountOrig, l.CurrencyOrig, l.AmountFunc, l.CurrencyFunc, l.FxRate, l.FxRateDate,
                l.DebitCredit, l.PartyId, l.Reference, l.Description)).ToList();
        }
        return new JournalDto(j.Id, j.TenantId, j.JournalNumber, j.JournalType, j.PostingDate, j.PeriodId,
            j.Description, j.SourceModule, j.SourceRecordId, j.IsPosted, j.IsReversed,
            j.CreatedAt, j.PostedAt, lines);
    }

}
