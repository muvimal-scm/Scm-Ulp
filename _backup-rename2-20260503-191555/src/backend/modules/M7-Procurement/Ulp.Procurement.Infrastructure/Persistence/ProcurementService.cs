using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.Procurement.Application;
using Ulp.Procurement.Domain.Entities;

namespace Ulp.Procurement.Infrastructure.Persistence;

public sealed class ProcurementService(ProcurementDbContext db, ITenantContext tenant, IClock clock) : IProcurementService
{
    private int Tid => int.Parse(tenant.TenantId.Value);

    /* ===== Purchase Requests ===== */

    public async Task<PrDto> CreatePrAsync(CreatePrRequest req, CancellationToken ct)
    {
        var dup = await db.Prs.AnyAsync(p => p.TenantId == Tid && p.PrNumber == req.PrNumber, ct);
        if (dup) throw new InvalidOperationException($"PR '{req.PrNumber}' already exists");
        var now = clock.GetCurrentInstant();
        var pr = new PurchaseRequest
        {
            TenantId    = Tid, CountryCode = req.CountryCode, PrNumber = req.PrNumber,
            RequestedBy = req.RequestedBy, Department = req.Department,
            Status = PrStatus.Draft, NeededBy = req.NeededBy, Notes = req.Notes,
            CreatedAt = now, ModifiedAt = now,
        };
        db.Prs.Add(pr);
        await db.SaveChangesAsync(ct);
        return ToPrDtoSync(pr, 0);
    }

    public async Task<PrDetailDto?> GetPrAsync(long id, CancellationToken ct)
    {
        var pr = await db.Prs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (pr is null) return null;
        var lines = await db.PrLines.AsNoTracking().Where(l => l.PrId == id)
            .OrderBy(l => l.LineNo).ToListAsync(ct);
        return new PrDetailDto(ToPrDtoSync(pr, lines.Count), lines.Select(ToPrLineDto).ToList());
    }

    public async Task<IReadOnlyList<PrDto>> ListPrsAsync(PrListQuery q, CancellationToken ct)
    {
        var query = db.Prs.AsNoTracking().Where(p => p.TenantId == Tid);
        if (q.Status.HasValue) query = query.Where(p => p.Status == q.Status.Value);
        if (!string.IsNullOrEmpty(q.CountryCode)) query = query.Where(p => p.CountryCode == q.CountryCode);
        var page = Math.Max(q.Page, 1);
        var ps = q.PageSize is <= 0 or > 200 ? 50 : q.PageSize;
        var rows = await query.OrderByDescending(p => p.CreatedAt).Skip((page - 1) * ps).Take(ps).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var counts = await db.PrLines.AsNoTracking().Where(l => ids.Contains(l.PrId))
            .GroupBy(l => l.PrId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        return rows.Select(p => ToPrDtoSync(p, counts.GetValueOrDefault(p.Id))).ToList();
    }

    public async Task<PrDto> ChangePrStatusAsync(long id, PrStatus next, CancellationToken ct)
    {
        var pr = await db.Prs.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"PR {id} not found");
        pr.Status = next;
        pr.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        var n = await db.PrLines.AsNoTracking().CountAsync(l => l.PrId == id, ct);
        return ToPrDtoSync(pr, n);
    }

    public async Task<PrLineDto> AddPrLineAsync(long prId, CreatePrLineRequest req, CancellationToken ct)
    {
        var pr = await db.Prs.FirstOrDefaultAsync(x => x.Id == prId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"PR {prId} not found");
        var nextLine = (await db.PrLines.Where(l => l.PrId == prId)
            .MaxAsync(l => (int?)l.LineNo, ct) ?? 0) + 1;
        var line = new PurchaseRequestLine
        {
            PrId = prId, LineNo = nextLine,
            ProductId = req.ProductId, Description = req.Description,
            Quantity = req.Quantity, UomCode = req.UomCode,
            EstimatedUnitPriceAmount = req.EstimatedUnitPriceAmount,
            EstimatedUnitPriceCurrency = req.EstimatedUnitPriceCurrency,
        };
        db.PrLines.Add(line);
        pr.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return ToPrLineDto(line);
    }

    /* ===== RFQs ===== */

    public async Task<RfqDto> CreateRfqAsync(CreateRfqRequest req, CancellationToken ct)
    {
        var dup = await db.Rfqs.AnyAsync(r => r.TenantId == Tid && r.RfqNumber == req.RfqNumber, ct);
        if (dup) throw new InvalidOperationException($"RFQ '{req.RfqNumber}' already exists");
        var r = new Rfq
        {
            TenantId = Tid, CountryCode = req.CountryCode, RfqNumber = req.RfqNumber,
            DueDate = req.DueDate, Status = RfqStatus.Open, ScopePrId = req.ScopePrId,
            Notes = req.Notes, CreatedAt = clock.GetCurrentInstant(),
        };
        db.Rfqs.Add(r);
        await db.SaveChangesAsync(ct);
        return ToRfqDtoSync(r, 0, 0);
    }

    public async Task<RfqDetailDto?> GetRfqAsync(long id, CancellationToken ct)
    {
        var r = await db.Rfqs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (r is null) return null;
        var recipients = await db.RfqRecipients.AsNoTracking().Where(rc => rc.RfqId == id).ToListAsync(ct);
        var responses = await db.RfqResponses.AsNoTracking().Where(rs => rs.RfqId == id)
            .OrderByDescending(rs => rs.ReceivedAt).ToListAsync(ct);
        return new RfqDetailDto(
            ToRfqDtoSync(r, recipients.Count, responses.Count),
            recipients.Select(ToRecipDto).ToList(),
            responses.Select(ToRfqRespDto).ToList());
    }

    public async Task<IReadOnlyList<RfqDto>> ListRfqsAsync(CancellationToken ct)
    {
        var rows = await db.Rfqs.AsNoTracking().Where(r => r.TenantId == Tid)
            .OrderByDescending(r => r.CreatedAt).Take(200).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var rcCounts = await db.RfqRecipients.AsNoTracking().Where(rc => ids.Contains(rc.RfqId))
            .GroupBy(rc => rc.RfqId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        var rsCounts = await db.RfqResponses.AsNoTracking().Where(rs => ids.Contains(rs.RfqId))
            .GroupBy(rs => rs.RfqId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        return rows.Select(r => ToRfqDtoSync(r, rcCounts.GetValueOrDefault(r.Id), rsCounts.GetValueOrDefault(r.Id))).ToList();
    }

    public async Task<RfqRecipientDto> AddRfqRecipientAsync(long rfqId, long vendorPartyId, CancellationToken ct)
    {
        var r = await db.Rfqs.FirstOrDefaultAsync(x => x.Id == rfqId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"RFQ {rfqId} not found");
        var rc = new RfqRecipient
        {
            RfqId = rfqId, VendorPartyId = vendorPartyId,
            SentAt = clock.GetCurrentInstant(),
            ResponseStatus = RfqRecipientStatus.Sent,
        };
        db.RfqRecipients.Add(rc);
        await db.SaveChangesAsync(ct);
        return ToRecipDto(rc);
    }

    public async Task<RfqResponseDto> AddRfqResponseAsync(long rfqId, CreateRfqResponseRequest req, CancellationToken ct)
    {
        var r = await db.Rfqs.FirstOrDefaultAsync(x => x.Id == rfqId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"RFQ {rfqId} not found");
        var resp = new RfqResponse
        {
            RfqId = rfqId, VendorPartyId = req.VendorPartyId,
            TotalAmount = req.TotalAmount, TotalCurrency = req.TotalCurrency,
            ValidUntil = req.ValidUntil, DocumentId = req.DocumentId, Notes = req.Notes,
            ReceivedAt = clock.GetCurrentInstant(), IsWinner = false,
        };
        db.RfqResponses.Add(resp);
        if (r.Status == RfqStatus.Open) r.Status = RfqStatus.InResponse;
        await db.SaveChangesAsync(ct);
        return ToRfqRespDto(resp);
    }

    /* ===== POs ===== */

    public async Task<PoDto> CreatePoAsync(CreatePoRequest req, CancellationToken ct)
    {
        var dup = await db.Pos.AnyAsync(p => p.TenantId == Tid && p.PoNumber == req.PoNumber, ct);
        if (dup) throw new InvalidOperationException($"PO '{req.PoNumber}' already exists");
        var now = clock.GetCurrentInstant();
        var po = new PurchaseOrder
        {
            TenantId = Tid, CountryCode = req.CountryCode, PoNumber = req.PoNumber,
            VendorPartyId = req.VendorPartyId, RfqId = req.RfqId,
            Status = PoStatus.Draft,
            TotalAmount = req.TotalAmount, TotalCurrency = req.TotalCurrency,
            ExpectedDeliveryDate = req.ExpectedDeliveryDate,
            PaymentTerms = req.PaymentTerms, Notes = req.Notes,
            CreatedAt = now, ModifiedAt = now,
        };
        db.Pos.Add(po);
        await db.SaveChangesAsync(ct);
        return ToPoDtoSync(po, 0, 0);
    }

    public async Task<PoDetailDto?> GetPoAsync(long id, CancellationToken ct)
    {
        var po = await db.Pos.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (po is null) return null;
        var lines = await db.PoLines.AsNoTracking().Where(l => l.PoId == id)
            .OrderBy(l => l.LineNo).ToListAsync(ct);
        var grns = await db.Grns.AsNoTracking().Where(g => g.PoId == id)
            .OrderByDescending(g => g.ReceivedAt).ToListAsync(ct);
        var matches = await db.Matches.AsNoTracking().Where(m => m.PoId == id)
            .OrderByDescending(m => m.MatchedAt).ToListAsync(ct);
        var grnIds = grns.Select(g => g.Id).ToList();
        var grnLineCounts = await db.GrnLines.AsNoTracking().Where(gl => grnIds.Contains(gl.GrId))
            .GroupBy(gl => gl.GrId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        return new PoDetailDto(
            ToPoDtoSync(po, lines.Count, grns.Count),
            lines.Select(ToPoLineDto).ToList(),
            grns.Select(g => ToGrnDtoSync(g, grnLineCounts.GetValueOrDefault(g.Id))).ToList(),
            matches.Select(ToMatchDto).ToList());
    }

    public async Task<IReadOnlyList<PoDto>> ListPosAsync(PoListQuery q, CancellationToken ct)
    {
        var query = db.Pos.AsNoTracking().Where(p => p.TenantId == Tid);
        if (q.Status.HasValue) query = query.Where(p => p.Status == q.Status.Value);
        if (q.VendorPartyId.HasValue) query = query.Where(p => p.VendorPartyId == q.VendorPartyId.Value);
        if (!string.IsNullOrEmpty(q.CountryCode)) query = query.Where(p => p.CountryCode == q.CountryCode);
        var page = Math.Max(q.Page, 1);
        var ps = q.PageSize is <= 0 or > 200 ? 50 : q.PageSize;
        var rows = await query.OrderByDescending(p => p.CreatedAt).Skip((page - 1) * ps).Take(ps).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var lineCounts = await db.PoLines.AsNoTracking().Where(l => ids.Contains(l.PoId))
            .GroupBy(l => l.PoId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        var grnCounts = await db.Grns.AsNoTracking().Where(g => ids.Contains(g.PoId))
            .GroupBy(g => g.PoId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        return rows.Select(p => ToPoDtoSync(p, lineCounts.GetValueOrDefault(p.Id), grnCounts.GetValueOrDefault(p.Id))).ToList();
    }

    public async Task<PoDto> ChangePoStatusAsync(long id, PoStatus next, CancellationToken ct)
    {
        var po = await db.Pos.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"PO {id} not found");
        po.Status = next;
        po.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        var lc = await db.PoLines.AsNoTracking().CountAsync(l => l.PoId == id, ct);
        var gc = await db.Grns.AsNoTracking().CountAsync(g => g.PoId == id, ct);
        return ToPoDtoSync(po, lc, gc);
    }

    public async Task<PoLineDto> AddPoLineAsync(long poId, CreatePoLineRequest req, CancellationToken ct)
    {
        var po = await db.Pos.FirstOrDefaultAsync(x => x.Id == poId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"PO {poId} not found");
        var nextLine = (await db.PoLines.Where(l => l.PoId == poId)
            .MaxAsync(l => (int?)l.LineNo, ct) ?? 0) + 1;
        var line = new PurchaseOrderLine
        {
            PoId = poId, LineNo = nextLine,
            ProductId = req.ProductId, Description = req.Description,
            QuantityOrdered = req.QuantityOrdered, QuantityReceived = 0, UomCode = req.UomCode,
            UnitPriceAmount = req.UnitPriceAmount, UnitPriceCurrency = req.UnitPriceCurrency,
        };
        db.PoLines.Add(line);
        po.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return ToPoLineDto(line);
    }

    /* ===== GRNs ===== */

    public async Task<GrnDto> CreateGrnAsync(CreateGrnRequest req, CancellationToken ct)
    {
        var po = await db.Pos.FirstOrDefaultAsync(x => x.Id == req.PoId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"PO {req.PoId} not found");
        var dup = await db.Grns.AnyAsync(g => g.TenantId == Tid && g.GrnNumber == req.GrnNumber, ct);
        if (dup) throw new InvalidOperationException($"GRN '{req.GrnNumber}' already exists");
        var grn = new GoodsReceipt
        {
            TenantId = Tid, PoId = req.PoId, GrnNumber = req.GrnNumber,
            ReceivedAt = req.ReceivedAt, ReceivedBy = req.ReceivedBy,
            M8GrnId = req.M8GrnId, Status = GrnStatus.Posted, Remarks = req.Remarks,
        };
        db.Grns.Add(grn);
        if (po.Status == PoStatus.Approved || po.Status == PoStatus.Sent)
            po.Status = PoStatus.PartialReceipt;
        await db.SaveChangesAsync(ct);
        return ToGrnDtoSync(grn, 0);
    }

    public async Task<GrnDetailDto?> GetGrnAsync(long id, CancellationToken ct)
    {
        var grn = await db.Grns.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (grn is null) return null;
        var lines = await db.GrnLines.AsNoTracking().Where(l => l.GrId == id).ToListAsync(ct);
        return new GrnDetailDto(ToGrnDtoSync(grn, lines.Count), lines.Select(ToGrnLineDto).ToList());
    }

    public async Task<IReadOnlyList<GrnDto>> ListGrnsAsync(long? poId, CancellationToken ct)
    {
        var q = db.Grns.AsNoTracking().Where(g => g.TenantId == Tid);
        if (poId.HasValue) q = q.Where(g => g.PoId == poId.Value);
        var rows = await q.OrderByDescending(g => g.ReceivedAt).Take(200).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var counts = await db.GrnLines.AsNoTracking().Where(l => ids.Contains(l.GrId))
            .GroupBy(l => l.GrId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        return rows.Select(g => ToGrnDtoSync(g, counts.GetValueOrDefault(g.Id))).ToList();
    }

    /* ===== Invoice match ===== */

    public async Task<InvoiceMatchDto> RecordMatchAsync(CreateMatchRequest req, CancellationToken ct)
    {
        var po = await db.Pos.FirstOrDefaultAsync(x => x.Id == req.PoId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"PO {req.PoId} not found");
        var m = new InvoiceMatch
        {
            TenantId = Tid, PoId = req.PoId,
            VendorInvoiceId = req.VendorInvoiceId, VendorInvoiceNo = req.VendorInvoiceNo,
            MatchStatus = req.Status,
            VarianceAmount = req.VarianceAmount, VarianceCurrency = req.VarianceCurrency,
            MatchedBy = 0, MatchedAt = clock.GetCurrentInstant(),
            Notes = req.Notes,
        };
        db.Matches.Add(m);
        await db.SaveChangesAsync(ct);
        return ToMatchDto(m);
    }

    public async Task<IReadOnlyList<InvoiceMatchDto>> ListMatchesAsync(long? poId, CancellationToken ct)
    {
        var q = db.Matches.AsNoTracking().Where(m => m.TenantId == Tid);
        if (poId.HasValue) q = q.Where(m => m.PoId == poId.Value);
        var rows = await q.OrderByDescending(m => m.MatchedAt).Take(200).ToListAsync(ct);
        return rows.Select(ToMatchDto).ToList();
    }

    /* ===== mappers ===== */

    private static PrDto ToPrDtoSync(PurchaseRequest p, int lineCount) => new(
        p.Id, p.TenantId, p.CountryCode, p.PrNumber, p.RequestedBy,
        p.Department, p.Status, p.NeededBy, p.Notes,
        lineCount, p.CreatedAt, p.ModifiedAt);

    private static PrLineDto ToPrLineDto(PurchaseRequestLine l) => new(
        l.Id, l.PrId, l.LineNo, l.ProductId, l.Description,
        l.Quantity, l.UomCode,
        l.EstimatedUnitPriceAmount, l.EstimatedUnitPriceCurrency);

    private static RfqDto ToRfqDtoSync(Rfq r, int recipCount, int respCount) => new(
        r.Id, r.CountryCode, r.RfqNumber, r.DueDate, r.Status, r.ScopePrId, r.Notes,
        recipCount, respCount, r.CreatedAt);

    private static RfqRecipientDto ToRecipDto(RfqRecipient rc) => new(
        rc.Id, rc.RfqId, rc.VendorPartyId, rc.SentAt, rc.ResponseStatus);

    private static RfqResponseDto ToRfqRespDto(RfqResponse r) => new(
        r.Id, r.RfqId, r.VendorPartyId,
        r.TotalAmount, r.TotalCurrency, r.ValidUntil,
        r.DocumentId, r.Notes, r.ReceivedAt, r.IsWinner);

    private static PoDto ToPoDtoSync(PurchaseOrder p, int lineCount, int grnCount) => new(
        p.Id, p.TenantId, p.CountryCode, p.PoNumber, p.VendorPartyId, p.RfqId,
        p.Status, p.TotalAmount, p.TotalCurrency,
        p.ExpectedDeliveryDate, p.PaymentTerms,
        lineCount, grnCount, p.CreatedAt, p.ModifiedAt);

    private static PoLineDto ToPoLineDto(PurchaseOrderLine l) => new(
        l.Id, l.PoId, l.LineNo, l.ProductId, l.Description,
        l.QuantityOrdered, l.QuantityReceived, l.UomCode,
        l.UnitPriceAmount, l.UnitPriceCurrency);

    private static GrnDto ToGrnDtoSync(GoodsReceipt g, int lineCount) => new(
        g.Id, g.PoId, g.GrnNumber, g.ReceivedAt, g.ReceivedBy,
        g.M8GrnId, g.Status, g.Remarks, lineCount);

    private static GrnLineDto ToGrnLineDto(GoodsReceiptLine l) => new(
        l.Id, l.GrId, l.PoLineId, l.QuantityReceived, l.Cond, l.Remarks);

    private static InvoiceMatchDto ToMatchDto(InvoiceMatch m) => new(
        m.Id, m.PoId, m.VendorInvoiceId, m.VendorInvoiceNo,
        m.MatchStatus, m.VarianceAmount, m.VarianceCurrency,
        m.MatchedBy, m.MatchedAt, m.Notes);
}
