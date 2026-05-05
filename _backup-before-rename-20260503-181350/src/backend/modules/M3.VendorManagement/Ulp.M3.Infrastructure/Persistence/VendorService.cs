using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.M3.Application;
using Ulp.M3.Domain.Entities;

namespace Ulp.M3.Infrastructure.Persistence;

public sealed class VendorService(M3DbContext db, ITenantContext tenant, IClock clock) : IVendorService
{
    /* =====================================================================
     *  Vendor lifecycle
     * ===================================================================== */

    public async Task<VendorDto> CreateAsync(CreateVendorRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var dup = await db.Vendors.AnyAsync(
            v => v.TenantId == tenantId && v.VendorCode == req.VendorCode, ct);
        if (dup) throw new InvalidOperationException($"vendor_code '{req.VendorCode}' already exists");

        var existsForParty = await db.Vendors.AnyAsync(
            v => v.TenantId == tenantId && v.PartyId == req.PartyId, ct);
        if (existsForParty) throw new InvalidOperationException("party already has a vendor record");

        var now = clock.GetCurrentInstant();
        var vendor = new Vendor
        {
            TenantId         = tenantId,
            PartyId          = req.PartyId,
            CountryCode      = req.CountryCode,
            VendorCode       = req.VendorCode,
            Status           = VendorStatus.Prospect,
            TdsApplicable    = req.TdsApplicable,
            TdsSection       = req.TdsSection,
            IsMsme           = req.IsMsme,
            MsmeUdyamNumber  = req.MsmeUdyamNumber,
            Is1099Reportable = req.Is1099Reportable,
            W9OnFile         = req.W9OnFile,
            RiskTier         = req.RiskTier,
            CreatedAt        = now,
            ModifiedAt       = now,
        };
        db.Vendors.Add(vendor);
        await db.SaveChangesAsync(ct);

        if (req.Categories is { Count: > 0 })
        {
            var first = true;
            foreach (var c in req.Categories.Distinct())
            {
                db.Categories.Add(new VendorCategory
                {
                    TenantId  = tenantId, VendorId = vendor.Id,
                    Category  = c,        IsPrimary = first,
                });
                first = false;
            }
            await db.SaveChangesAsync(ct);
        }

        db.Audits.Add(new VendorAudit
        {
            TenantId = tenantId, VendorId = vendor.Id,
            Action = VendorAuditAction.Created, PerformedBy = 0, PerformedAt = now,
        });
        await db.SaveChangesAsync(ct);

        return await ToDtoAsync(vendor, ct);
    }

    public async Task<VendorDto?> GetAsync(long vendorId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var v = await db.Vendors.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == vendorId && x.TenantId == tenantId, ct);
        return v is null ? null : await ToDtoAsync(v, ct);
    }

    public async Task<IReadOnlyList<VendorDto>> ListAsync(VendorListQuery q, CancellationToken ct)
    {
        var rows = await ScopedQuery(q)
            .OrderBy(v => v.VendorCode)
            .Skip((Math.Max(q.Page, 1) - 1) * Math.Min(q.PageSize is <= 0 or > 200 ? 50 : q.PageSize, 200))
            .Take(q.PageSize is <= 0 or > 200 ? 50 : q.PageSize)
            .ToListAsync(ct);
        var dtos = new List<VendorDto>(rows.Count);
        foreach (var v in rows) dtos.Add(await ToDtoAsync(v, ct));
        return dtos;
    }

    public Task<long> CountAsync(VendorListQuery q, CancellationToken ct) => ScopedQuery(q).LongCountAsync(ct);

    public async Task<VendorDto> UpdateAsync(long vendorId, UpdateVendorRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var v = await db.Vendors.FirstOrDefaultAsync(x => x.Id == vendorId && x.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"vendor {vendorId} not found");

        if (req.TdsApplicable.HasValue)    v.TdsApplicable    = req.TdsApplicable.Value;
        if (req.TdsSection is not null)    v.TdsSection       = req.TdsSection;
        if (req.IsMsme.HasValue)           v.IsMsme           = req.IsMsme.Value;
        if (req.MsmeUdyamNumber is not null) v.MsmeUdyamNumber = req.MsmeUdyamNumber;
        if (req.Is1099Reportable.HasValue) v.Is1099Reportable = req.Is1099Reportable.Value;
        if (req.W9OnFile.HasValue)         v.W9OnFile         = req.W9OnFile.Value;
        if (req.RiskTier.HasValue)         v.RiskTier         = req.RiskTier.Value;
        if (req.PreferredLanguage is not null) v.PreferredLanguage = req.PreferredLanguage;
        v.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(v, ct);
    }

    public async Task<bool> ActivateAsync(long vendorId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var v = await db.Vendors.FirstOrDefaultAsync(x => x.Id == vendorId && x.TenantId == tenantId, ct);
        if (v is null) return false;
        var now = clock.GetCurrentInstant();
        v.Status      = VendorStatus.Active;
        v.ActivatedAt = now;
        v.ModifiedAt  = now;
        db.Audits.Add(new VendorAudit
        {
            TenantId = tenantId, VendorId = v.Id,
            Action = VendorAuditAction.Activated, PerformedBy = 0, PerformedAt = now,
        });
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SuspendAsync(long vendorId, string reason, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var v = await db.Vendors.FirstOrDefaultAsync(x => x.Id == vendorId && x.TenantId == tenantId, ct);
        if (v is null) return false;
        var now = clock.GetCurrentInstant();
        v.Status     = VendorStatus.Suspended;
        v.ModifiedAt = now;
        db.Audits.Add(new VendorAudit
        {
            TenantId = tenantId, VendorId = v.Id,
            Action = VendorAuditAction.Suspended, PerformedBy = 0, PerformedAt = now,
            DetailsJson = JsonSerializer.Serialize(new { reason }),
        });
        await db.SaveChangesAsync(ct);
        return true;
    }

    /* =====================================================================
     *  Onboarding workflow (LLD §4) — synchronous Phase 1; Hangfire pipeline Phase 2
     * ===================================================================== */

    private static readonly (string Code, string Name, bool Required)[] OnboardingTemplate =
    {
        ("KYC_DOCS",            "Collect KYC documents",         true ),
        ("IDENTIFIER_VALIDATE", "Validate GSTIN/PAN or EIN/W-9", true ),
        ("SANCTIONS_SCREEN",    "Sanctions screening",           true ),
        ("BANK_VERIFY",         "Bank account verification",     true ),
        ("CREDIT_CHECK",        "Credit bureau check",           false),
        ("AGREEMENT_SIGN",      "MSA / agreement signed",        true ),
        ("ACTIVATE",            "Activate vendor",               true ),
    };

    public async Task<IReadOnlyList<OnboardingStepDto>> StartOnboardingAsync(long vendorId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var v = await db.Vendors.FirstOrDefaultAsync(x => x.Id == vendorId && x.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"vendor {vendorId} not found");

        var existing = await db.OnboardingSteps.AnyAsync(s => s.VendorId == vendorId, ct);
        if (!existing)
        {
            foreach (var s in OnboardingTemplate)
            {
                db.OnboardingSteps.Add(new OnboardingStep
                {
                    TenantId = tenantId, VendorId = vendorId,
                    StepCode = s.Code, StepName = s.Name, Required = s.Required,
                    Status   = OnboardingStatus.Pending,
                });
            }
        }

        var now = clock.GetCurrentInstant();
        v.Status              = VendorStatus.OnboardingInProgress;
        v.OnboardingStartedAt = now;
        v.ModifiedAt          = now;
        await db.SaveChangesAsync(ct);

        return await GetOnboardingStepsAsync(vendorId, ct);
    }

    public async Task<bool> CompleteStepAsync(long vendorId, string stepCode, CompleteStepRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var step = await db.OnboardingSteps.FirstOrDefaultAsync(
            s => s.TenantId == tenantId && s.VendorId == vendorId && s.StepCode == stepCode, ct);
        if (step is null) return false;

        var now = clock.GetCurrentInstant();
        step.Status       = OnboardingStatus.Completed;
        step.PerformedAt  = now;
        step.Notes        = req.Notes;
        step.ResultJson   = req.ResultJson;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<OnboardingStepDto>> GetOnboardingStepsAsync(long vendorId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var rows = await db.OnboardingSteps.AsNoTracking()
            .Where(s => s.TenantId == tenantId && s.VendorId == vendorId)
            .OrderBy(s => s.Id).ToListAsync(ct);
        return rows.Select(s => new OnboardingStepDto(
            s.StepCode, s.StepName, s.Status, s.Required, s.PerformedAt, s.Notes)).ToList();
    }

    /* =====================================================================
     *  Agreements + performance + NCRs
     * ===================================================================== */

    public async Task<IReadOnlyList<AgreementDto>> ListAgreementsAsync(long vendorId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var rows = await db.Agreements.AsNoTracking()
            .Where(a => a.TenantId == tenantId && a.VendorId == vendorId)
            .OrderByDescending(a => a.StartDate).ToListAsync(ct);
        return rows.Select(a => new AgreementDto(
            a.Id, a.AgreementType, a.AgreementNumber, a.Title,
            a.StartDate, a.EndDate, a.AutoRenewal, a.Status, a.DocumentId, a.SignedAt)).ToList();
    }

    public async Task<AgreementDto> CreateAgreementAsync(long vendorId, CreateAgreementRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var dup = await db.Agreements.AnyAsync(
            a => a.TenantId == tenantId && a.AgreementNumber == req.AgreementNumber, ct);
        if (dup) throw new InvalidOperationException($"agreement_number '{req.AgreementNumber}' already exists");

        var now = clock.GetCurrentInstant();
        var a = new Agreement
        {
            TenantId          = tenantId,
            VendorId          = vendorId,
            AgreementType     = req.AgreementType,
            AgreementNumber   = req.AgreementNumber,
            Title             = req.Title,
            StartDate         = req.StartDate,
            EndDate           = req.EndDate,
            AutoRenewal       = req.AutoRenewal,
            RenewalNoticeDays = req.RenewalNoticeDays,
            Status            = AgreementStatus.Draft,
            DocumentId        = req.DocumentId,
            CreatedAt         = now,
            ModifiedAt        = now,
        };
        db.Agreements.Add(a);
        await db.SaveChangesAsync(ct);
        return new AgreementDto(a.Id, a.AgreementType, a.AgreementNumber, a.Title,
            a.StartDate, a.EndDate, a.AutoRenewal, a.Status, a.DocumentId, a.SignedAt);
    }

    public async Task<IReadOnlyList<PerformanceScoreDto>> GetPerformanceAsync(long vendorId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var rows = await db.Scores.AsNoTracking()
            .Where(s => s.TenantId == tenantId && s.VendorId == vendorId)
            .OrderByDescending(s => s.PeriodEnd).ToListAsync(ct);
        return rows.Select(s => new PerformanceScoreDto(
            s.Id, s.PeriodStart, s.PeriodEnd, s.OnTimeDeliveryPct, s.QualityScore,
            s.SlaBreachCount, s.NcrCount, s.OverallScore, s.Rating, s.ComputedAt)).ToList();
    }

    public async Task<IReadOnlyList<NcrDto>> ListNcrsAsync(long vendorId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var rows = await db.Ncrs.AsNoTracking()
            .Where(n => n.TenantId == tenantId && n.VendorId == vendorId)
            .OrderByDescending(n => n.RaisedAt).ToListAsync(ct);
        return rows.Select(ToNcrDto).ToList();
    }

    public async Task<NcrDto> RaiseNcrAsync(RaiseNcrRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var dup = await db.Ncrs.AnyAsync(
            n => n.TenantId == tenantId && n.NcrNumber == req.NcrNumber, ct);
        if (dup) throw new InvalidOperationException($"ncr_number '{req.NcrNumber}' already exists");

        var now = clock.GetCurrentInstant();
        var ncr = new Ncr
        {
            TenantId        = tenantId,
            VendorId        = req.VendorId,
            NcrNumber       = req.NcrNumber,
            RaisedAt        = now,
            RaisedBy        = 0,
            RelatedModule   = req.RelatedModule,
            RelatedEntityId = req.RelatedEntityId,
            Severity        = req.Severity,
            Category        = req.Category,
            Description     = req.Description,
            Status          = NcrStatus.Open,
        };
        db.Ncrs.Add(ncr);
        db.Audits.Add(new VendorAudit
        {
            TenantId = tenantId, VendorId = req.VendorId,
            Action = VendorAuditAction.NcrRaised, PerformedBy = 0, PerformedAt = now,
            DetailsJson = JsonSerializer.Serialize(new { req.NcrNumber, severity = req.Severity.ToString() }),
        });
        await db.SaveChangesAsync(ct);
        return ToNcrDto(ncr);
    }

    public async Task<NcrDto> UpdateNcrAsync(long ncrId, UpdateNcrRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var n = await db.Ncrs.FirstOrDefaultAsync(x => x.Id == ncrId && x.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"ncr {ncrId} not found");
        if (req.RootCause is not null)        n.RootCause        = req.RootCause;
        if (req.CorrectiveAction is not null) n.CorrectiveAction = req.CorrectiveAction;
        if (req.Status.HasValue)
        {
            n.Status = req.Status.Value;
            if (n.Status == NcrStatus.Closed)
            {
                var now = clock.GetCurrentInstant();
                n.ClosedAt = now;
                n.ClosedBy = 0;
                db.Audits.Add(new VendorAudit
                {
                    TenantId = tenantId, VendorId = n.VendorId,
                    Action = VendorAuditAction.NcrClosed, PerformedBy = 0, PerformedAt = now,
                    DetailsJson = JsonSerializer.Serialize(new { n.NcrNumber }),
                });
            }
        }
        await db.SaveChangesAsync(ct);
        return ToNcrDto(n);
    }

    /* =====================================================================
     *  Helpers
     * ===================================================================== */

    private IQueryable<Vendor> ScopedQuery(VendorListQuery q)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var query = db.Vendors.AsNoTracking().Where(v => v.TenantId == tenantId);
        if (q.Status.HasValue)  query = query.Where(v => v.Status == q.Status.Value);
        if (!string.IsNullOrEmpty(q.CountryCode)) query = query.Where(v => v.CountryCode == q.CountryCode);
        if (q.Category.HasValue)
        {
            query = from v in query
                    join c in db.Categories on v.Id equals c.VendorId
                    where c.Category == q.Category.Value
                    select v;
        }
        return query;
    }

    private async Task<VendorDto> ToDtoAsync(Vendor v, CancellationToken ct)
    {
        var cats = await db.Categories.AsNoTracking()
            .Where(c => c.VendorId == v.Id).Select(c => c.Category).ToListAsync(ct);
        return new VendorDto(
            v.Id, v.TenantId, v.PartyId, v.CountryCode, v.VendorCode,
            v.Status, v.ActivatedAt,
            v.TdsApplicable, v.TdsSection, v.IsMsme, v.MsmeUdyamNumber,
            v.Is1099Reportable, v.W9OnFile,
            v.RiskTier, v.SanctionsClear,
            cats, v.CreatedAt, v.ModifiedAt);
    }

    private static NcrDto ToNcrDto(Ncr n) => new(
        n.Id, n.VendorId, n.NcrNumber, n.Severity, n.Status,
        n.Description, n.Category, n.RaisedAt, n.ClosedAt);
}
