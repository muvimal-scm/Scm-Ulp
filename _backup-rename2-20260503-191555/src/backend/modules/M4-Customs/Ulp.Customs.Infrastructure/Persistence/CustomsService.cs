using Microsoft.EntityFrameworkCore;
using Ulp.Core.Domain.Tenancy;
using Ulp.Customs.Application;
using Ulp.Customs.Domain.Entities;

namespace Ulp.Customs.Infrastructure.Persistence;

public sealed class CustomsService(CustomsDbContext db, ITenantContext tenant) : ICustomsService
{
    private int Tid => int.Parse(tenant.TenantId.Value);

    public async Task<IReadOnlyList<EntryDto>> ListEntriesAsync(EntryListQuery q, CancellationToken ct)
    {
        var query = db.Entries.AsNoTracking().Where(e => e.TenantId == Tid);
        if (q.Status.HasValue)            query = query.Where(e => e.AbiStatus == q.Status.Value);
        if (q.PgaHoldOnly == true)        query = query.Where(e => e.PgaHoldFlag);
        var rows = await query.OrderByDescending(e => e.EntryDate)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize).ToListAsync(ct);

        if (rows.Count == 0) return Array.Empty<EntryDto>();

        var ids = rows.Select(r => r.Id).ToList();
        var importerIds = rows.Select(r => r.ImporterOfRecordId).Distinct().ToList();

        var lineCounts = await db.Lines.AsNoTracking()
            .Where(l => ids.Contains(l.EntryId))
            .GroupBy(l => l.EntryId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        var pgaCounts = await db.PgaHolds.AsNoTracking()
            .Where(p => ids.Contains(p.EntryId) && p.Status == PgaHoldStatus.Active)
            .GroupBy(p => p.EntryId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        var holdExamCounts = await db.HoldExams.AsNoTracking()
            .Where(h => ids.Contains(h.EntryId) && h.Status == HoldExamStatus.Open)
            .GroupBy(h => h.EntryId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        var importerNames = await db.PartyLookups.AsNoTracking()
            .Where(p => p.TenantId == Tid && importerIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.LegalName, ct);

        return rows.Select(e => ToEntryDto(e,
            importerNames.GetValueOrDefault(e.ImporterOfRecordId),
            lineCounts.GetValueOrDefault(e.Id, 0),
            pgaCounts.GetValueOrDefault(e.Id, 0),
            holdExamCounts.GetValueOrDefault(e.Id, 0))).ToList();
    }

    public async Task<EntryDetailDto?> GetEntryAsync(long id, CancellationToken ct)
    {
        var e = await db.Entries.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (e is null) return null;

        var lines     = await db.Lines.AsNoTracking().Where(l => l.EntryId == id).OrderBy(l => l.LineNumber).ToListAsync(ct);
        var pgaHolds  = await db.PgaHolds.AsNoTracking().Where(p => p.EntryId == id).OrderByDescending(p => p.RaisedAt).ToListAsync(ct);
        var holdExams = await db.HoldExams.AsNoTracking().Where(h => h.EntryId == id).OrderByDescending(h => h.RaisedAt).ToListAsync(ct);
        var releaseOrders = await db.ReleaseOrders.AsNoTracking().Where(r => r.EntryId == id).OrderBy(r => r.IssuedAt).ToListAsync(ct);
        var abiMsgs   = await db.AbiMessages.AsNoTracking().Where(m => m.EntryId == id).OrderBy(m => m.CreatedAt).ToListAsync(ct);

        var importerName = await db.PartyLookups.AsNoTracking()
            .Where(p => p.Id == e.ImporterOfRecordId).Select(p => p.LegalName).FirstOrDefaultAsync(ct);

        BondDto? bond = null;
        if (e.BondId.HasValue)
        {
            var b = await db.Bonds.AsNoTracking().FirstOrDefaultAsync(x => x.Id == e.BondId.Value, ct);
            if (b is not null)
                bond = ToBondDto(b, importerName);
        }

        var entryDto = ToEntryDto(e, importerName, lines.Count,
            pgaHolds.Count(p => p.Status == PgaHoldStatus.Active),
            holdExams.Count(h => h.Status == HoldExamStatus.Open));

        return new EntryDetailDto(entryDto,
            lines.Select(ToLineDto).ToList(),
            pgaHolds.Select(p => ToPgaHoldDto(p, e.EntryNumber)).ToList(),
            holdExams.Select(h => ToHoldExamDto(h, e.EntryNumber)).ToList(),
            releaseOrders.Select(ToReleaseOrderDto).ToList(),
            abiMsgs.Select(ToAbiMessageDto).ToList(),
            bond);
    }

    public async Task<IReadOnlyList<BondDto>> ListBondsAsync(CancellationToken ct)
    {
        var bonds = await db.Bonds.AsNoTracking().Where(b => b.TenantId == Tid)
            .OrderByDescending(b => b.EffectiveFrom).ToListAsync(ct);
        var importerIds = bonds.Select(b => b.ImporterPartyId).Distinct().ToList();
        var names = await db.PartyLookups.AsNoTracking()
            .Where(p => p.TenantId == Tid && importerIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.LegalName, ct);
        return bonds.Select(b => ToBondDto(b, names.GetValueOrDefault(b.ImporterPartyId))).ToList();
    }

    public async Task<IReadOnlyList<AtmDto>> ListAtmAsync(CancellationToken ct)
    {
        var atms = await db.Atms.AsNoTracking().Where(a => a.TenantId == Tid)
            .OrderByDescending(a => a.SignedAt).ToListAsync(ct);
        var importerIds = atms.Select(a => a.ImporterPartyId).Distinct().ToList();
        var names = await db.PartyLookups.AsNoTracking()
            .Where(p => p.TenantId == Tid && importerIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.LegalName, ct);
        return atms.Select(a => new AtmDto(
            a.Id, a.ImporterPartyId, names.GetValueOrDefault(a.ImporterPartyId),
            a.BrokerFilerCode, a.CombinedWithPoa,
            a.SignedAt, a.EffectiveFrom, a.EffectiveTo,
            a.SignerName, a.SignerTitle, a.Status, a.Notes)).ToList();
    }

    public async Task<IReadOnlyList<ReleaseOrderDto>> ListReleaseOrdersAsync(long? entryId, CancellationToken ct)
    {
        var query = db.ReleaseOrders.AsNoTracking().Where(r => r.TenantId == Tid);
        if (entryId.HasValue) query = query.Where(r => r.EntryId == entryId.Value);
        var rows = await query.OrderByDescending(r => r.IssuedAt).Take(200).ToListAsync(ct);
        return rows.Select(ToReleaseOrderDto).ToList();
    }

    public async Task<IReadOnlyList<IsfDto>> ListIsfAsync(CancellationToken ct)
    {
        var rows = await db.Isfs.AsNoTracking().Where(i => i.TenantId == Tid)
            .OrderByDescending(i => i.CreatedAt).Take(200).ToListAsync(ct);
        var importerIds = rows.Select(r => r.ImporterOfRecordId).Distinct().ToList();
        var names = await db.PartyLookups.AsNoTracking()
            .Where(p => p.TenantId == Tid && importerIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.LegalName, ct);
        return rows.Select(r => new IsfDto(
            r.Id, r.ShipmentId, r.ImporterOfRecordId, names.GetValueOrDefault(r.ImporterOfRecordId),
            r.ImporterNumber, r.SellerName, r.BuyerName, r.ShipToName,
            r.ManufacturerName, r.CountryOfOrigin, r.Hts6,
            r.ContainerStuffingLocation, r.ConsolidatorName,
            r.FilingStatus, r.FiledAt, r.VesselLoadCutoff, r.BondId)).ToList();
    }

    public async Task<IReadOnlyList<PgaHoldDto>> ListPgaHoldsAsync(bool activeOnly, CancellationToken ct)
    {
        var query = db.PgaHolds.AsNoTracking().Where(p => p.TenantId == Tid);
        if (activeOnly) query = query.Where(p => p.Status == PgaHoldStatus.Active);
        var rows = await query.OrderByDescending(p => p.RaisedAt).Take(500).ToListAsync(ct);
        var entryIds = rows.Select(r => r.EntryId).Distinct().ToList();
        var entryNums = await db.Entries.AsNoTracking()
            .Where(e => entryIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, e => e.EntryNumber, ct);
        return rows.Select(p => ToPgaHoldDto(p, entryNums.GetValueOrDefault(p.EntryId))).ToList();
    }

    public async Task<IReadOnlyList<HoldExamDto>> ListHoldExamsAsync(bool openOnly, CancellationToken ct)
    {
        var query = db.HoldExams.AsNoTracking().Where(h => h.TenantId == Tid);
        if (openOnly) query = query.Where(h => h.Status == HoldExamStatus.Open);
        var rows = await query.OrderByDescending(h => h.RaisedAt).Take(500).ToListAsync(ct);
        var entryIds = rows.Select(r => r.EntryId).Distinct().ToList();
        var entryNums = await db.Entries.AsNoTracking()
            .Where(e => entryIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, e => e.EntryNumber, ct);
        return rows.Select(h => ToHoldExamDto(h, entryNums.GetValueOrDefault(h.EntryId))).ToList();
    }

    public async Task<IReadOnlyList<InBondDto>> ListInBondMovesAsync(CancellationToken ct)
    {
        var rows = await db.InBondMoves.AsNoTracking().Where(i => i.TenantId == Tid)
            .OrderByDescending(i => i.InitiatedAt).Take(200).ToListAsync(ct);
        return rows.Select(i => new InBondDto(
            i.Id, i.EntryId, i.InBondNumber, i.InBondType,
            i.CarrierScac, i.OriginPortCode, i.DestinationPortCode,
            i.InitiatedAt, i.ArrivedAt, i.Status, i.Notes)).ToList();
    }

    public async Task<IReadOnlyList<AbiMessageDto>> ListAbiMessagesAsync(long? entryId, int max, CancellationToken ct)
    {
        var query = db.AbiMessages.AsNoTracking().Where(m => m.TenantId == Tid);
        if (entryId.HasValue) query = query.Where(m => m.EntryId == entryId.Value);
        var rows = await query.OrderByDescending(m => m.CreatedAt).Take(max).ToListAsync(ct);
        return rows.Select(ToAbiMessageDto).ToList();
    }

    /* ----- mappers ----- */

    private static EntryDto ToEntryDto(CustomsEntry e, string? importerName, int lineCount, int pgaCount, int holdExamCount) =>
        new(e.Id, e.TenantId, e.ShipmentId, e.EntryNumber,
            e.FilerCode, e.EntryType, e.EntryTypeDescription,
            e.ImporterOfRecordId, importerName, e.ImporterEin,
            e.BondId,
            e.CarrierScac, e.VesselName, e.VoyageNumber,
            e.PortOfUnladingCode, e.PortOfEntryCode, e.FirmsCode,
            e.EntryDate, e.ImportDate, e.ReleaseDate,
            e.BillOfLading, e.AbiStatus, e.CbpStatusMessage,
            e.PgaHoldFlag, e.ExamType,
            e.TotalValueUsd, e.DutyAmountUsd, e.MpfUsd, e.HmfUsd, e.TotalFeesUsd,
            lineCount, pgaCount, holdExamCount,
            e.CreatedAt, e.SubmittedAt, e.ReleasedAt);

    private static EntryLineDto ToLineDto(CustomsEntryLine l) =>
        new(l.Id, l.EntryId, l.LineNumber, l.HtsNumber, l.Description,
            l.CountryOfOrigin, l.Quantity, l.UnitOfMeasure, l.NetWeightKg,
            l.InvoiceValueUsd, l.InvoiceCurrency, l.InvoiceValueOrig, l.FxRate,
            l.DutyRatePct, l.DutyAmountUsd,
            l.AddCaseNumber, l.CvdCaseNumber, l.AddRatePct, l.CvdRatePct,
            l.SpecialProgram,
            l.FdaRequired, l.UsdaRequired, l.EpaRequired, l.FccRequired,
            l.ManufacturerIdCode);

    private static BondDto ToBondDto(CustomsBond b, string? importerName) =>
        new(b.Id, b.BondNumber, b.BondType, b.SuretyCode, b.SuretyName,
            b.ImporterPartyId, importerName,
            b.AmountUsd, b.EffectiveFrom, b.EffectiveTo,
            b.Status, b.UtilizationPct, b.Notes);

    private static PgaHoldDto ToPgaHoldDto(PgaHold p, string? entryNumber) =>
        new(p.Id, p.EntryId, entryNumber,
            p.PgaCode, p.HoldReasonCode, p.HoldReasonText,
            p.Status, p.RaisedAt, p.ReleasedAt, p.ResolutionNote);

    private static HoldExamDto ToHoldExamDto(CustomsHoldExam h, string? entryNumber) =>
        new(h.Id, h.EntryId, entryNumber,
            h.NoticeType, h.ExamType, h.HoldReasonCode, h.HoldReasonText,
            h.ExamSite, h.ExamAppointmentAt,
            h.Status, h.RaisedAt, h.ResolvedAt, h.ResolutionNote);

    private static ReleaseOrderDto ToReleaseOrderDto(ReleaseOrder r) =>
        new(r.Id, r.EntryId, r.OrderType, r.ReferenceNumber,
            r.CarrierPartyId, r.WarehousePartyId,
            r.IssuedAt, r.CargoPickupAt, r.Status, r.Notes);

    private static AbiMessageDto ToAbiMessageDto(AbiMessage m) =>
        new(m.Id, m.EntryId, m.MessageCode, m.Direction,
            m.Status, m.AttemptCount, m.CbpReference,
            m.CreatedAt, m.SentAt, m.AcknowledgedAt, m.FailureReason);
}
