using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Abstractions.Storage;
using Ulp.Core.Domain.Tenancy;
using Ulp.M21.Application;
using Ulp.M21.Domain.Entities;

namespace Ulp.M21.Infrastructure.Persistence;

/// <summary>
/// Per LLD §5: clients call upload-init to get a pre-signed PUT, upload directly
/// to MinIO, then call upload-complete to verify checksum + persist the row.
/// All object keys are tenant-scoped: <c>tenant-{id}/{module}/{entityType}/{yyyy}/{MM}/{dd}/{ulid}_{filename}</c>.
/// </summary>
public sealed class DocumentService(
    M21DbContext db,
    IStorageProvider storage,
    ITenantContext tenant,
    IClock clock) : IDocumentService
{
    private static readonly TimeSpan DefaultUploadExpiry   = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan DefaultDownloadExpiry = TimeSpan.FromMinutes(5);

    public async Task<UploadInitResponse> InitUploadAsync(UploadInitRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var classRow = await db.Classes.AsNoTracking().FirstOrDefaultAsync(
            c => c.TenantId == tenantId
              && c.CountryCode == tenant.CountryCode.Value
              && c.Code == req.ClassCode
              && c.IsActive, ct)
            ?? throw new InvalidOperationException($"Document class '{req.ClassCode}' not found for tenant {tenantId} ({tenant.CountryCode.Value})");

        var ulid = global::System.Ulid.NewUlid().ToString();
        var container = ParseContainer(classRow.DefaultStorageContainer);
        var now = clock.GetCurrentInstant();
        var dt  = now.InUtc();
        var key = $"tenant-{tenantId}/{req.ModuleCode.ToLowerInvariant()}"
                + (req.ModuleEntityType is null ? "" : $"/{req.ModuleEntityType.ToLowerInvariant()}")
                + $"/{dt.Year:0000}/{dt.Month:00}/{dt.Day:00}/{ulid}_{Sanitise(req.Filename)}";

        var url = await storage.GetPresignedUploadUrlAsync(container, key, DefaultUploadExpiry, ct);

        // Persist a row in 'incomplete' state so upload-complete can find it. The
        // metadata is the client's claim; upload-complete re-verifies via Stat.
        var doc = new Document
        {
            TenantId           = tenantId,
            Ulid               = ulid,
            DocumentClassId    = classRow.Id,
            ModuleCode         = req.ModuleCode,
            ModuleEntityType   = req.ModuleEntityType,
            ModuleEntityId     = req.ModuleEntityId,
            Filename           = req.Filename,
            ContentType        = req.ContentType,
            SizeBytes          = req.SizeBytes,
            ChecksumSha256     = req.ChecksumSha256,
            StorageContainer   = container.ToString(),
            StorageObjectKey   = key,
            CurrentVersionId   = null,
            IsImmutable        = classRow.DefaultImmutable,
            RetainUntil        = classRow.DefaultRetainYears.HasValue
                ? now.Plus(Duration.FromDays(365L * classRow.DefaultRetainYears.Value))
                : null,
            IsDeleted          = false,
            CreatedAt          = now,
            CreatedBy          = 0,                 // populated by middleware-scoped user when available
            ModifiedAt         = now,
            ModifiedBy         = 0,
        };
        db.Documents.Add(doc);
        await db.SaveChangesAsync(ct);

        return new UploadInitResponse(ulid, container, key, url, now.Plus(Duration.FromTimeSpan(DefaultUploadExpiry)));
    }

    public async Task<DocumentDto> CompleteUploadAsync(string ulid, UploadCompleteRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var doc = await db.Documents.FirstOrDefaultAsync(
            d => d.Ulid == ulid && d.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"document {ulid} not found");

        var info = await storage.StatAsync(ParseContainer(doc.StorageContainer), doc.StorageObjectKey, ct)
            ?? throw new InvalidOperationException("upload not found in storage");

        if (info.SizeBytes != req.SizeBytes)
            throw new InvalidOperationException($"size mismatch: claimed {req.SizeBytes}, actual {info.SizeBytes}");

        // Create version 1 row + point document.current_version at it.
        var now = clock.GetCurrentInstant();
        var v1 = new DocumentVersion
        {
            TenantId         = tenantId,
            DocumentId       = doc.Id,
            VersionNumber    = 1,
            Filename         = doc.Filename,
            ContentType      = doc.ContentType,
            SizeBytes        = info.SizeBytes,
            ChecksumSha256   = req.ChecksumSha256,
            StorageObjectKey = doc.StorageObjectKey,
            UploadedBy       = 0,
            UploadedAt       = now,
        };
        db.Versions.Add(v1);
        await db.SaveChangesAsync(ct);

        doc.CurrentVersionId = v1.Id;
        doc.SizeBytes        = info.SizeBytes;
        doc.ChecksumSha256   = req.ChecksumSha256;
        doc.ModifiedAt       = now;

        db.Audits.Add(new DocumentAudit
        {
            TenantId   = tenantId,
            DocumentId = doc.Id,
            Action     = DocAuditAction.Upload,
            OccurredAt = now,
        });

        // Quota tick.
        var quota = await db.Quotas.FirstOrDefaultAsync(q => q.TenantId == tenantId, ct);
        if (quota is not null)
        {
            quota.BytesUsed       += info.SizeBytes;
            quota.DocumentsCount  += 1;
            quota.LastRecomputedAt = now;
        }

        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(doc, ct);
    }

    public async Task<DocumentDto?> GetByUlidAsync(string ulid, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var doc = await db.Documents.AsNoTracking().FirstOrDefaultAsync(
            d => d.Ulid == ulid && d.TenantId == tenantId, ct);
        return doc is null ? null : await ToDtoAsync(doc, ct);
    }

    public async Task<IReadOnlyList<DocumentDto>> ListAsync(DocumentListQuery q, CancellationToken ct)
    {
        var query = ScopedQuery(q);
        var page  = Math.Max(q.Page, 1);
        var ps    = q.PageSize is <= 0 or > 200 ? 50 : q.PageSize;
        var rows  = await query.OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * ps).Take(ps).ToListAsync(ct);
        var dtos  = new List<DocumentDto>(rows.Count);
        foreach (var d in rows) dtos.Add(await ToDtoAsync(d, ct));
        return dtos;
    }

    public Task<long> CountAsync(DocumentListQuery q, CancellationToken ct) => ScopedQuery(q).LongCountAsync(ct);

    public async Task<Uri> CreateDownloadUrlAsync(string ulid, TimeSpan? expiry, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var doc = await db.Documents.AsNoTracking().FirstOrDefaultAsync(
            d => d.Ulid == ulid && d.TenantId == tenantId && !d.IsDeleted, ct)
            ?? throw new InvalidOperationException($"document {ulid} not found");

        db.Audits.Add(new DocumentAudit
        {
            TenantId   = tenantId,
            DocumentId = doc.Id,
            Action     = DocAuditAction.Download,
            OccurredAt = clock.GetCurrentInstant(),
        });
        await db.SaveChangesAsync(ct);

        return await storage.GetPresignedDownloadUrlAsync(
            ParseContainer(doc.StorageContainer), doc.StorageObjectKey, expiry ?? DefaultDownloadExpiry, ct);
    }

    public async Task<DocumentDto> AddVersionAsync(string ulid, UploadInitRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var doc = await db.Documents.FirstOrDefaultAsync(
            d => d.Ulid == ulid && d.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"document {ulid} not found");

        var nextNo = (await db.Versions.Where(v => v.DocumentId == doc.Id).MaxAsync(v => (int?)v.VersionNumber, ct) ?? 0) + 1;
        var now    = clock.GetCurrentInstant();
        var dt     = now.InUtc();
        var key    = $"tenant-{tenantId}/{doc.ModuleCode.ToLowerInvariant()}"
                   + (doc.ModuleEntityType is null ? "" : $"/{doc.ModuleEntityType.ToLowerInvariant()}")
                   + $"/{dt.Year:0000}/{dt.Month:00}/{dt.Day:00}/{ulid}_v{nextNo}_{Sanitise(req.Filename)}";

        var version = new DocumentVersion
        {
            TenantId         = tenantId,
            DocumentId       = doc.Id,
            VersionNumber    = nextNo,
            Filename         = req.Filename,
            ContentType      = req.ContentType,
            SizeBytes        = req.SizeBytes,
            ChecksumSha256   = req.ChecksumSha256,
            StorageObjectKey = key,
            UploadedBy       = 0,
            UploadedAt       = now,
        };
        db.Versions.Add(version);
        doc.CurrentVersionId = version.Id;
        doc.Filename         = req.Filename;
        doc.ContentType      = req.ContentType;
        doc.SizeBytes        = req.SizeBytes;
        doc.ChecksumSha256   = req.ChecksumSha256;
        doc.StorageObjectKey = key;
        doc.ModifiedAt       = now;
        await db.SaveChangesAsync(ct);

        return await ToDtoAsync(doc, ct);
    }

    public async Task<bool> SoftDeleteAsync(string ulid, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var doc = await db.Documents.FirstOrDefaultAsync(
            d => d.Ulid == ulid && d.TenantId == tenantId, ct);
        if (doc is null || doc.IsDeleted) return false;

        // Legal-hold check (LLD §3.13).
        var holdActive = await db.DocumentLegalHolds
            .Join(db.LegalHolds, dlh => dlh.LegalHoldId, h => h.Id, (dlh, h) => new { dlh, h })
            .AnyAsync(x => x.dlh.DocumentId == doc.Id && x.h.IsActive, ct);
        if (holdActive) throw new InvalidOperationException("document is under active legal hold");
        if (doc.IsImmutable && doc.RetainUntil is not null && doc.RetainUntil > clock.GetCurrentInstant())
            throw new InvalidOperationException("document is WORM-locked until " + doc.RetainUntil);

        var now = clock.GetCurrentInstant();
        doc.IsDeleted  = true;
        doc.DeletedAt  = now;
        doc.ModifiedAt = now;
        db.Audits.Add(new DocumentAudit
        {
            TenantId = tenantId, DocumentId = doc.Id, Action = DocAuditAction.Delete, OccurredAt = now,
        });
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> RestoreAsync(string ulid, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var doc = await db.Documents.FirstOrDefaultAsync(
            d => d.Ulid == ulid && d.TenantId == tenantId, ct);
        if (doc is null || !doc.IsDeleted) return false;

        var now = clock.GetCurrentInstant();
        doc.IsDeleted  = false;
        doc.DeletedAt  = null;
        doc.ModifiedAt = now;
        db.Audits.Add(new DocumentAudit
        {
            TenantId = tenantId, DocumentId = doc.Id, Action = DocAuditAction.Restore, OccurredAt = now,
        });
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<StorageQuotaDto> GetTenantQuotaAsync(CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var q = await db.Quotas.AsNoTracking().FirstOrDefaultAsync(x => x.TenantId == tenantId, ct);
        if (q is null) return new StorageQuotaDto(tenantId, 0, 0, 0, 0m, clock.GetCurrentInstant());
        var pct = q.BytesQuota == 0 ? 0m : Math.Round((decimal)q.BytesUsed / q.BytesQuota * 100m, 2);
        return new StorageQuotaDto(q.TenantId, q.BytesUsed, q.BytesQuota, q.DocumentsCount, pct, q.LastRecomputedAt);
    }

    /* ---------- helpers ---------- */

    private IQueryable<Document> ScopedQuery(DocumentListQuery q)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var query = db.Documents.AsNoTracking().Where(d => d.TenantId == tenantId);
        if (!q.IncludeDeleted) query = query.Where(d => !d.IsDeleted);
        if (!string.IsNullOrEmpty(q.ModuleCode))       query = query.Where(d => d.ModuleCode == q.ModuleCode);
        if (!string.IsNullOrEmpty(q.ModuleEntityType)) query = query.Where(d => d.ModuleEntityType == q.ModuleEntityType);
        if (q.ModuleEntityId.HasValue)                 query = query.Where(d => d.ModuleEntityId == q.ModuleEntityId);
        if (!string.IsNullOrEmpty(q.ClassCode))
        {
            query = from d in query
                    join c in db.Classes on d.DocumentClassId equals c.Id
                    where c.Code == q.ClassCode
                    select d;
        }
        return query;
    }

    private async Task<DocumentDto> ToDtoAsync(Document d, CancellationToken ct)
    {
        var classCode = await db.Classes.AsNoTracking()
            .Where(c => c.Id == d.DocumentClassId).Select(c => c.Code).FirstOrDefaultAsync(ct) ?? "";
        var versionNo = await db.Versions.AsNoTracking()
            .Where(v => v.Id == d.CurrentVersionId).Select(v => (int?)v.VersionNumber).FirstOrDefaultAsync(ct) ?? 0;

        return new DocumentDto(
            d.Ulid, d.Id, d.TenantId, classCode,
            d.Filename, d.ContentType, d.SizeBytes, d.ChecksumSha256,
            d.StorageContainer, d.StorageObjectKey, versionNo,
            d.IsImmutable, d.RetainUntil, d.IsDeleted,
            d.ModuleCode, d.ModuleEntityType, d.ModuleEntityId,
            d.CreatedAt, d.ModifiedAt);
    }

    private static StorageContainer ParseContainer(string s)
        => Enum.TryParse<StorageContainer>(s, ignoreCase: true, out var c)
            ? c : StorageContainer.UserUploads;

    private static string Sanitise(string filename)
    {
        var sb = new StringBuilder(filename.Length);
        foreach (var ch in filename)
            sb.Append(char.IsLetterOrDigit(ch) || ch is '.' or '-' or '_' ? ch : '_');
        return sb.ToString();
    }
}
