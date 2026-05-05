using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.Sales.Application;
using Ulp.Sales.Domain.Entities;

namespace Ulp.Sales.Infrastructure.Persistence;

public sealed class CrmService(SalesDbContext db, ITenantContext tenant, IClock clock) : ICrmService
{
    private int Tid => int.Parse(tenant.TenantId.Value);

    /* ===== Leads ===== */

    public async Task<LeadDto> CreateLeadAsync(CreateLeadRequest req, CancellationToken ct)
    {
        var dup = await db.Leads.AnyAsync(l => l.TenantId == Tid && l.LeadNumber == req.LeadNumber, ct);
        if (dup) throw new InvalidOperationException($"lead '{req.LeadNumber}' already exists");

        var now = clock.GetCurrentInstant();
        var lead = new Lead
        {
            TenantId        = Tid,
            CountryCode     = req.CountryCode,
            LeadNumber      = req.LeadNumber,
            Source          = req.Source,
            ContactName     = req.ContactName,
            CompanyName     = req.CompanyName,
            Email           = req.Email,
            Phone           = req.Phone,
            Industry        = req.Industry,
            EstimatedVolume = req.EstimatedVolume,
            Stage           = LeadStage.New,
            CreatedAt       = now,
            ModifiedAt      = now,
        };
        db.Leads.Add(lead);
        await db.SaveChangesAsync(ct);
        return ToLeadDto(lead);
    }

    public async Task<LeadDto?> GetLeadAsync(long id, CancellationToken ct)
    {
        var l = await db.Leads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        return l is null ? null : ToLeadDto(l);
    }

    public async Task<IReadOnlyList<LeadDto>> ListLeadsAsync(LeadListQuery q, CancellationToken ct)
    {
        var query = db.Leads.AsNoTracking().Where(l => l.TenantId == Tid);
        if (q.Stage.HasValue)  query = query.Where(l => l.Stage == q.Stage.Value);
        if (q.Source.HasValue) query = query.Where(l => l.Source == q.Source.Value);
        if (!string.IsNullOrEmpty(q.CountryCode)) query = query.Where(l => l.CountryCode == q.CountryCode);
        var page = Math.Max(q.Page, 1);
        var ps = q.PageSize is <= 0 or > 200 ? 50 : q.PageSize;
        var rows = await query.OrderByDescending(l => l.CreatedAt).Skip((page - 1) * ps).Take(ps).ToListAsync(ct);
        return rows.Select(ToLeadDto).ToList();
    }

    public async Task<LeadDto> ChangeLeadStageAsync(long id, LeadStage next, CancellationToken ct)
    {
        var l = await db.Leads.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"lead {id} not found");
        l.Stage = next;
        l.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return ToLeadDto(l);
    }

    public async Task<LeadDto> UpdateLeadAsync(long id, UpdateLeadRequest req, CancellationToken ct)
    {
        var l = await db.Leads.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"lead {id} not found");
        l.CountryCode     = req.CountryCode;
        l.Source          = req.Source;
        l.ContactName     = req.ContactName;
        l.CompanyName     = req.CompanyName;
        l.Email           = req.Email;
        l.Phone           = req.Phone;
        l.Industry        = req.Industry;
        l.EstimatedVolume = req.EstimatedVolume;
        l.ModifiedAt      = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return ToLeadDto(l);
    }

    public async Task<bool> DeleteLeadAsync(long id, CancellationToken ct)
    {
        var l = await db.Leads.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (l is null) return false;
        // Block delete if lead has been converted to a party — preserves the audit chain.
        if (l.ConvertedPartyId is not null)
            throw new InvalidOperationException($"lead {id} has been converted to party {l.ConvertedPartyId}; cannot delete");
        db.Leads.Remove(l);
        await db.SaveChangesAsync(ct);
        return true;
    }

    /* ===== Opportunities ===== */

    public async Task<OpportunityDto> CreateOpportunityAsync(CreateOpportunityRequest req, CancellationToken ct)
    {
        var dup = await db.Opps.AnyAsync(o => o.TenantId == Tid && o.OppNumber == req.OppNumber, ct);
        if (dup) throw new InvalidOperationException($"opportunity '{req.OppNumber}' already exists");

        var now = clock.GetCurrentInstant();
        var o = new Opportunity
        {
            TenantId          = Tid,
            CountryCode       = req.CountryCode,
            OppNumber         = req.OppNumber,
            PartyId           = req.PartyId,
            Title             = req.Title,
            EstimatedValue    = req.EstimatedValue,
            EstimatedCurrency = req.EstimatedCurrency,
            ExpectedClose     = req.ExpectedClose,
            ProbabilityPct    = req.ProbabilityPct,
            Stage             = OppStage.Prospecting,
            CreatedAt         = now,
            ModifiedAt        = now,
        };
        db.Opps.Add(o);
        await db.SaveChangesAsync(ct);
        return ToOppDtoSync(o, 0);
    }

    public async Task<OpportunityDetailDto?> GetOpportunityAsync(long id, CancellationToken ct)
    {
        var o = await db.Opps.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (o is null) return null;
        var acts = await db.Activities.AsNoTracking()
            .Where(a => a.RelatedTo == RelatedTo.Opp && a.RelatedId == id && a.TenantId == Tid)
            .OrderByDescending(a => a.OccurredAt).ToListAsync(ct);
        var quoteIds = await db.QuoteLinks.AsNoTracking()
            .Where(q => q.OpportunityId == id).Select(q => q.QuoteId).ToListAsync(ct);
        return new OpportunityDetailDto(
            ToOppDtoSync(o, acts.Count),
            acts.Select(ToActivityDto).ToList(),
            quoteIds);
    }

    public async Task<IReadOnlyList<OpportunityDto>> ListOpportunitiesAsync(OpportunityListQuery q, CancellationToken ct)
    {
        var query = db.Opps.AsNoTracking().Where(o => o.TenantId == Tid);
        if (q.Stage.HasValue)   query = query.Where(o => o.Stage == q.Stage.Value);
        if (q.PartyId.HasValue) query = query.Where(o => o.PartyId == q.PartyId.Value);
        if (!string.IsNullOrEmpty(q.CountryCode)) query = query.Where(o => o.CountryCode == q.CountryCode);
        var page = Math.Max(q.Page, 1);
        var ps = q.PageSize is <= 0 or > 200 ? 50 : q.PageSize;
        var rows = await query.OrderByDescending(o => o.CreatedAt).Skip((page - 1) * ps).Take(ps).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var counts = await db.Activities.AsNoTracking()
            .Where(a => a.RelatedTo == RelatedTo.Opp && ids.Contains(a.RelatedId) && a.TenantId == Tid)
            .GroupBy(a => a.RelatedId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        return rows.Select(o => ToOppDtoSync(o, counts.GetValueOrDefault(o.Id))).ToList();
    }

    public async Task<OpportunityDto> ChangeOpportunityStageAsync(long id, OppStage next, CancellationToken ct)
    {
        var o = await db.Opps.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"opportunity {id} not found");
        o.Stage = next;
        o.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        var n = await db.Activities.AsNoTracking().CountAsync(a => a.RelatedTo == RelatedTo.Opp && a.RelatedId == id && a.TenantId == Tid, ct);
        return ToOppDtoSync(o, n);
    }

    public async Task<OpportunityDto> UpdateOpportunityAsync(long id, UpdateOpportunityRequest req, CancellationToken ct)
    {
        var o = await db.Opps.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"opportunity {id} not found");
        o.CountryCode       = req.CountryCode;
        o.PartyId           = req.PartyId;
        o.Title             = req.Title;
        o.EstimatedValue    = req.EstimatedValue;
        o.EstimatedCurrency = req.EstimatedCurrency;
        o.ExpectedClose     = req.ExpectedClose;
        o.ProbabilityPct    = req.ProbabilityPct;
        o.ModifiedAt        = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        var n = await db.Activities.AsNoTracking().CountAsync(a => a.RelatedTo == RelatedTo.Opp && a.RelatedId == id && a.TenantId == Tid, ct);
        return ToOppDtoSync(o, n);
    }

    public async Task<bool> DeleteOpportunityAsync(long id, CancellationToken ct)
    {
        var o = await db.Opps.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (o is null) return false;
        // Block delete if opportunity has linked quotes — preserves the audit chain.
        var hasQuotes = await db.QuoteLinks.AsNoTracking().AnyAsync(q => q.OpportunityId == id, ct);
        if (hasQuotes)
            throw new InvalidOperationException($"opportunity {id} has linked quotes; cannot delete");
        // Best-effort: remove activities tied to this opportunity (preserves DB integrity).
        var acts = await db.Activities.Where(a => a.RelatedTo == RelatedTo.Opp && a.RelatedId == id && a.TenantId == Tid).ToListAsync(ct);
        if (acts.Count > 0) db.Activities.RemoveRange(acts);
        db.Opps.Remove(o);
        await db.SaveChangesAsync(ct);
        return true;
    }

    /* ===== Activities ===== */

    public async Task<ActivityDto> AddActivityAsync(CreateActivityRequest req, CancellationToken ct)
    {
        var a = new Activity
        {
            TenantId     = Tid,
            RelatedTo    = req.RelatedTo,
            RelatedId    = req.RelatedId,
            ActivityType = req.ActivityType,
            Subject      = req.Subject,
            OccurredAt   = req.OccurredAt,
            OwnerUserId  = req.OwnerUserId,
            DetailsJson  = req.DetailsJson,
        };
        db.Activities.Add(a);
        await db.SaveChangesAsync(ct);
        return ToActivityDto(a);
    }

    public async Task<IReadOnlyList<ActivityDto>> ListActivitiesAsync(RelatedTo? relatedTo, long? relatedId, int page, int pageSize, CancellationToken ct)
    {
        var query = db.Activities.AsNoTracking().Where(a => a.TenantId == Tid);
        if (relatedTo.HasValue) query = query.Where(a => a.RelatedTo == relatedTo.Value);
        if (relatedId.HasValue) query = query.Where(a => a.RelatedId == relatedId.Value);
        var p = Math.Max(page, 1);
        var ps = pageSize is <= 0 or > 200 ? 50 : pageSize;
        var rows = await query.OrderByDescending(a => a.OccurredAt).Skip((p - 1) * ps).Take(ps).ToListAsync(ct);
        return rows.Select(ToActivityDto).ToList();
    }

    /* ===== Campaigns ===== */

    public async Task<CampaignDto> CreateCampaignAsync(CreateCampaignRequest req, CancellationToken ct)
    {
        var c = new Campaign
        {
            TenantId           = Tid,
            Name               = req.Name,
            Channel            = req.Channel,
            AudienceFilterJson = req.AudienceFilterJson,
            TemplateCode       = req.TemplateCode,
            ScheduledAt        = req.ScheduledAt,
            Status             = req.ScheduledAt is null ? CampaignStatus.Draft : CampaignStatus.Scheduled,
            CreatedAt          = clock.GetCurrentInstant(),
        };
        db.Campaigns.Add(c);
        await db.SaveChangesAsync(ct);
        return ToCampaignDtoSync(c, 0);
    }

    public async Task<IReadOnlyList<CampaignDto>> ListCampaignsAsync(CancellationToken ct)
    {
        var rows = await db.Campaigns.AsNoTracking().Where(c => c.TenantId == Tid)
            .OrderByDescending(c => c.CreatedAt).Take(200).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var counts = await db.Targets.AsNoTracking().Where(t => ids.Contains(t.CampaignId))
            .GroupBy(t => t.CampaignId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        return rows.Select(c => ToCampaignDtoSync(c, counts.GetValueOrDefault(c.Id))).ToList();
    }

    public async Task<CampaignDto> ChangeCampaignStatusAsync(long id, CampaignStatus next, CancellationToken ct)
    {
        var c = await db.Campaigns.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"campaign {id} not found");
        c.Status = next;
        await db.SaveChangesAsync(ct);
        var n = await db.Targets.AsNoTracking().CountAsync(t => t.CampaignId == id, ct);
        return ToCampaignDtoSync(c, n);
    }

    /* ===== RFQs ===== */

    public async Task<RfqRequestDto> CreateRfqAsync(CreateRfqRequest req, CancellationToken ct)
    {
        var dup = await db.Rfqs.AnyAsync(r => r.TenantId == Tid && r.RfqNumber == req.RfqNumber, ct);
        if (dup) throw new InvalidOperationException($"RFQ '{req.RfqNumber}' already exists");
        var r = new RfqRequest
        {
            TenantId    = Tid,
            RfqNumber   = req.RfqNumber,
            PartyId     = req.PartyId,
            RequestedAt = req.RequestedAt,
            DueDate     = req.DueDate,
            Status      = RfqStatus.Open,
            Notes       = req.Notes,
        };
        db.Rfqs.Add(r);
        await db.SaveChangesAsync(ct);
        return ToRfqDtoSync(r, 0, 0);
    }

    public async Task<RfqRequestDetailDto?> GetRfqAsync(long id, CancellationToken ct)
    {
        var r = await db.Rfqs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (r is null) return null;
        var lines = await db.RfqLines.AsNoTracking().Where(l => l.RfqRequestId == id)
            .OrderBy(l => l.LineNumber).ToListAsync(ct);
        var resps = await db.RfqResponses.AsNoTracking().Where(rsp => rsp.RfqRequestId == id)
            .OrderByDescending(rsp => rsp.ReceivedAt).ToListAsync(ct);
        return new RfqRequestDetailDto(
            ToRfqDtoSync(r, lines.Count, resps.Count),
            lines.Select(ToRfqLineDto).ToList(),
            resps.Select(ToRfqRespDto).ToList());
    }

    public async Task<IReadOnlyList<RfqRequestDto>> ListRfqsAsync(CancellationToken ct)
    {
        var rows = await db.Rfqs.AsNoTracking().Where(r => r.TenantId == Tid)
            .OrderByDescending(r => r.RequestedAt).Take(200).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var lineCounts = await db.RfqLines.AsNoTracking().Where(l => ids.Contains(l.RfqRequestId))
            .GroupBy(l => l.RfqRequestId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        var respCounts = await db.RfqResponses.AsNoTracking().Where(r => ids.Contains(r.RfqRequestId))
            .GroupBy(r => r.RfqRequestId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        return rows.Select(r => ToRfqDtoSync(r, lineCounts.GetValueOrDefault(r.Id), respCounts.GetValueOrDefault(r.Id))).ToList();
    }

    public async Task<RfqLineDto> AddRfqLineAsync(long rfqId, CreateRfqLineRequest req, CancellationToken ct)
    {
        var r = await db.Rfqs.FirstOrDefaultAsync(x => x.Id == rfqId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"RFQ {rfqId} not found");
        var nextLine = (await db.RfqLines.Where(l => l.RfqRequestId == rfqId)
            .MaxAsync(l => (int?)l.LineNumber, ct) ?? 0) + 1;
        var line = new RfqLine
        {
            RfqRequestId = rfqId,
            LineNumber   = nextLine,
            Description  = req.Description,
            Quantity     = req.Quantity,
            UomCode      = req.UomCode,
        };
        db.RfqLines.Add(line);
        await db.SaveChangesAsync(ct);
        return ToRfqLineDto(line);
    }

    public async Task<RfqResponseDto> AddRfqResponseAsync(long rfqId, CreateRfqResponseRequest req, CancellationToken ct)
    {
        var r = await db.Rfqs.FirstOrDefaultAsync(x => x.Id == rfqId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"RFQ {rfqId} not found");
        var resp = new RfqResponse
        {
            RfqRequestId     = rfqId,
            VendorPartyId    = req.VendorPartyId,
            ResponseAmount   = req.ResponseAmount,
            ResponseCurrency = req.ResponseCurrency,
            ValidUntil       = req.ValidUntil,
            Notes            = req.Notes,
            ReceivedAt       = clock.GetCurrentInstant(),
            IsWinner         = false,
        };
        db.RfqResponses.Add(resp);
        if (r.Status == RfqStatus.Open) r.Status = RfqStatus.InResponse;
        await db.SaveChangesAsync(ct);
        return ToRfqRespDto(resp);
    }

    /* ===== Pipeline + forecast ===== */

    public async Task<IReadOnlyList<PipelineStageDto>> ListPipelineStagesAsync(CancellationToken ct) =>
        (await db.Stages.AsNoTracking().Where(s => s.TenantId == Tid)
            .OrderBy(s => s.Sequence).ToListAsync(ct))
            .Select(s => new PipelineStageDto(s.Id, s.Code, s.Name, s.Sequence, s.DefaultProbabilityPct)).ToList();

    public async Task<IReadOnlyList<ForecastSnapshotDto>> ListForecastsAsync(string? period, CancellationToken ct)
    {
        var q = db.Forecasts.AsNoTracking().Where(f => f.TenantId == Tid);
        if (!string.IsNullOrEmpty(period)) q = q.Where(f => f.Period == period);
        var rows = await q.OrderByDescending(f => f.TakenAt).Take(100).ToListAsync(ct);
        return rows.Select(f => new ForecastSnapshotDto(f.Id, f.OwnerUserId, f.Period, f.SnapshotJson, f.TakenAt)).ToList();
    }

    /* ===== mappers ===== */

    private static LeadDto ToLeadDto(Lead l) => new(
        l.Id, l.TenantId, l.CountryCode, l.LeadNumber, l.Source,
        l.ContactName, l.CompanyName, l.Email, l.Phone, l.Industry, l.EstimatedVolume,
        l.Stage, l.OwnerUserId, l.ConvertedPartyId, l.CreatedAt, l.ModifiedAt);

    private static OpportunityDto ToOppDtoSync(Opportunity o, int activityCount) => new(
        o.Id, o.TenantId, o.CountryCode, o.OppNumber, o.PartyId, o.Title,
        o.EstimatedValue, o.EstimatedCurrency, o.ExpectedClose, o.ProbabilityPct,
        o.Stage, o.OwnerUserId, activityCount, o.CreatedAt, o.ModifiedAt);

    private static ActivityDto ToActivityDto(Activity a) => new(
        a.Id, a.RelatedTo, a.RelatedId, a.ActivityType, a.Subject,
        a.OccurredAt, a.OwnerUserId, a.DetailsJson);

    private static CampaignDto ToCampaignDtoSync(Campaign c, int targetCount) => new(
        c.Id, c.Name, c.Channel, c.TemplateCode, c.ScheduledAt, c.Status,
        c.SentCount, c.DeliveredCount, targetCount, c.CreatedAt);

    private static RfqRequestDto ToRfqDtoSync(RfqRequest r, int lineCount, int respCount) => new(
        r.Id, r.RfqNumber, r.PartyId, r.RequestedAt, r.DueDate, r.Status, r.Notes, lineCount, respCount);

    private static RfqLineDto ToRfqLineDto(RfqLine l) => new(
        l.Id, l.RfqRequestId, l.LineNumber, l.Description, l.Quantity, l.UomCode);

    private static RfqResponseDto ToRfqRespDto(RfqResponse r) => new(
        r.Id, r.RfqRequestId, r.VendorPartyId,
        r.ResponseAmount, r.ResponseCurrency, r.ValidUntil, r.Notes, r.ReceivedAt, r.IsWinner);
}
