using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Abstractions.Rendering;
using Ulp.Core.Domain.Tenancy;
using Ulp.M6.Application;
using Ulp.M6.Domain.Entities;
using RenderRequestEntity = Ulp.M6.Domain.Entities.RenderRequest;
using RendererRequest    = Ulp.Core.Abstractions.Rendering.RenderRequest;

namespace Ulp.M6.Infrastructure.Persistence;

/// <summary>
/// Phase 2.0 doc generation:
///   1. Resolve template by code (+ optional country variant) — fall back to system template (tenant_id=NULL)
///   2. Load latest version body
///   3. Render via Scriban
///   4. Persist render request row with the rendered body + status
///   5. Return inline body to caller
///
/// Phase 2.1 will: also write rendered output to M21 IStorageProvider, populate document_id,
/// add Hangfire-driven async rendering for templates >1MB output, and add QuestPDF for PDF.
/// </summary>
public sealed class DocGenService(
    M6DbContext db,
    IDocumentRenderer renderer,
    ITenantContext tenant,
    IClock clock) : IDocGenService
{
    public async Task<IReadOnlyList<TemplateDto>> ListTemplatesAsync(string? channel, CancellationToken ct)
    {
        // tenant + system templates; channel param reserved for future use.
        _ = channel;
        var tenantId = int.Parse(tenant.TenantId.Value);
        var rows = await db.Templates.AsNoTracking()
            .Where(t => t.IsActive && (t.TenantId == tenantId || t.TenantId == null))
            .OrderBy(t => t.Code).ThenBy(t => t.CountryCode)
            .ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<TemplateDetailDto?> GetTemplateAsync(long id, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var t = await db.Templates.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && (x.TenantId == tenantId || x.TenantId == null), ct);
        if (t is null) return null;

        var versions = await db.Versions.AsNoTracking()
            .Where(v => v.TemplateId == id)
            .OrderByDescending(v => v.VersionNumber).ToListAsync(ct);
        var fields = await db.Fields.AsNoTracking()
            .Where(f => f.TemplateId == id)
            .OrderBy(f => f.FieldName).ToListAsync(ct);

        return new TemplateDetailDto(
            ToDto(t),
            versions.Select(v => new TemplateVersionDto(
                v.Id, v.VersionNumber, v.Body, v.LayoutJson, v.CreatedBy, v.CreatedAt, v.Comment)).ToList(),
            fields.Select(f => new TemplateFieldDto(
                f.FieldName, f.FieldType, f.IsRequired, f.DefaultValue, f.SourceModule, f.SourcePath)).ToList());
    }

    public async Task<TemplateDto> CreateTemplateAsync(CreateTemplateRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var dup = await db.Templates.AnyAsync(t =>
            t.TenantId == tenantId && t.Code == req.Code && t.CountryCode == req.CountryCode, ct);
        if (dup) throw new InvalidOperationException($"template {req.Code} ({req.CountryCode}) already exists for this tenant");

        var now = clock.GetCurrentInstant();
        var template = new Template
        {
            TenantId        = tenantId,
            Code            = req.Code,
            CountryCode     = req.CountryCode,
            Name            = req.Name,
            Description     = req.Description,
            TemplateType    = req.TemplateType,
            RenderingEngine = req.RenderingEngine,
            IsActive        = true,
            Version         = 1,
            CreatedAt       = now,
            ModifiedAt      = now,
        };
        db.Templates.Add(template);
        await db.SaveChangesAsync(ct);

        db.Versions.Add(new TemplateVersion
        {
            TemplateId    = template.Id,
            VersionNumber = 1,
            Body          = req.Body,
            CreatedBy     = 0,
            CreatedAt     = now,
            Comment       = "initial",
        });
        await db.SaveChangesAsync(ct);
        return ToDto(template);
    }

    public async Task<TemplateVersionDto> AddTemplateVersionAsync(long templateId, AddVersionRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var template = await db.Templates.FirstOrDefaultAsync(t =>
            t.Id == templateId && (t.TenantId == tenantId || t.TenantId == null), ct)
            ?? throw new InvalidOperationException($"template {templateId} not found");
        if (template.TenantId is null)
            throw new InvalidOperationException("system templates cannot be edited directly — fork to a tenant template first");

        var nextVersionNumber = (await db.Versions.Where(v => v.TemplateId == templateId)
            .MaxAsync(v => (int?)v.VersionNumber, ct) ?? 0) + 1;
        var now = clock.GetCurrentInstant();
        var version = new TemplateVersion
        {
            TemplateId    = templateId,
            VersionNumber = nextVersionNumber,
            Body          = req.Body,
            LayoutJson    = req.LayoutJson,
            CreatedBy     = 0,
            CreatedAt     = now,
            Comment       = req.Comment,
        };
        db.Versions.Add(version);
        template.Version    = nextVersionNumber;
        template.ModifiedAt = now;
        await db.SaveChangesAsync(ct);
        return new TemplateVersionDto(
            version.Id, version.VersionNumber, version.Body, version.LayoutJson,
            version.CreatedBy, version.CreatedAt, version.Comment);
    }

    public async Task<RenderResponseDto> RenderAsync(RenderApiRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);

        // Resolve template: tenant-specific first, then system fallback. Country variant
        // matches first; country-agnostic (NULL) is the fallback.
        var template = await db.Templates.AsNoTracking().FirstOrDefaultAsync(t =>
            t.IsActive
            && t.Code == req.Code
            && (t.TenantId == tenantId || t.TenantId == null)
            && (t.CountryCode == req.CountryCode || t.CountryCode == null), ct);

        if (template is null)
        {
            var resp = await PersistFailureAsync(req, tenantId, $"template '{req.Code}' not found", ct);
            return resp;
        }

        var versionRow = await db.Versions.AsNoTracking()
            .Where(v => v.TemplateId == template.Id)
            .OrderByDescending(v => v.VersionNumber).FirstOrDefaultAsync(ct);
        if (versionRow is null)
        {
            return await PersistFailureAsync(req, tenantId, "template has no versions", ct);
        }

        var rr = new RenderRequestEntity
        {
            TenantId        = tenantId,
            Ulid            = global::System.Ulid.NewUlid().ToString(),
            TemplateId      = template.Id,
            TemplateVersion = versionRow.VersionNumber,
            SourceModule    = req.SourceModule,
            SourceEntityId  = req.SourceEntityId,
            PayloadJson     = JsonSerializer.Serialize(req.Payload),
            OutputFormat    = template.TemplateType,
            Status          = RenderStatus.Rendering,
            RequestedAt     = clock.GetCurrentInstant(),
        };
        db.RenderRequests.Add(rr);
        await db.SaveChangesAsync(ct);

        var engine = template.RenderingEngine.ToString().ToUpperInvariant();
        var result = await renderer.RenderAsync(
            new RendererRequest(versionRow.Body, engine, req.Payload), ct);

        rr.Status        = result.Success ? RenderStatus.Completed : RenderStatus.Failed;
        rr.RenderedBody  = result.Body;
        rr.ErrorMessage  = result.Error;
        rr.DurationMs    = result.DurationMs;
        rr.CompletedAt   = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);

        return new RenderResponseDto(
            rr.Ulid, rr.Status, rr.OutputFormat, result.Body, result.DurationMs, result.Error);
    }

    public async Task<IReadOnlyList<RenderRequestDto>> ListRenderRequestsAsync(int page, int pageSize, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var p = Math.Max(page, 1);
        var ps = pageSize is <= 0 or > 200 ? 50 : pageSize;
        var rows = await db.RenderRequests.AsNoTracking()
            .Where(r => r.TenantId == tenantId)
            .OrderByDescending(r => r.RequestedAt)
            .Skip((p - 1) * ps).Take(ps).ToListAsync(ct);
        return rows.Select(r => new RenderRequestDto(
            r.Id, r.Ulid, r.TemplateId, r.SourceModule, r.SourceEntityId,
            r.OutputFormat, r.Status, r.DurationMs, r.RequestedAt, r.CompletedAt)).ToList();
    }

    /* ---------- helpers ---------- */

    private async Task<RenderResponseDto> PersistFailureAsync(
        RenderApiRequest req, int tenantId, string error, CancellationToken ct)
    {
        var ulid = global::System.Ulid.NewUlid().ToString();
        var now  = clock.GetCurrentInstant();
        db.RenderRequests.Add(new RenderRequestEntity
        {
            TenantId        = tenantId,
            Ulid            = ulid,
            TemplateId      = 0,
            TemplateVersion = 0,
            SourceModule    = req.SourceModule,
            SourceEntityId  = req.SourceEntityId,
            PayloadJson     = JsonSerializer.Serialize(req.Payload),
            OutputFormat    = TemplateType.Html,
            Status          = RenderStatus.Failed,
            ErrorMessage    = error,
            RequestedAt     = now,
            CompletedAt     = now,
            DurationMs      = 0,
        });
        await db.SaveChangesAsync(ct);
        return new RenderResponseDto(ulid, RenderStatus.Failed, TemplateType.Html, null, 0, error);
    }

    private static TemplateDto ToDto(Template t) => new(
        t.Id, t.TenantId, t.Code, t.CountryCode, t.Name,
        t.Description, t.TemplateType, t.RenderingEngine,
        t.IsActive, t.Version, t.CreatedAt, t.ModifiedAt);
}
