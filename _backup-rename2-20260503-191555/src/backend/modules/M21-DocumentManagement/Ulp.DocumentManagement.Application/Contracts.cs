using NodaTime;
using Ulp.Core.Abstractions.Storage;
using Ulp.DocumentManagement.Domain.Entities;

namespace Ulp.DocumentManagement.Application;

/// <summary>Public document service used by other modules to attach docs to entities.</summary>
public interface IDocumentService
{
    Task<UploadInitResponse> InitUploadAsync(UploadInitRequest req, CancellationToken ct);
    Task<DocumentDto>        CompleteUploadAsync(string ulid, UploadCompleteRequest req, CancellationToken ct);
    Task<DocumentDto?>       GetByUlidAsync(string ulid, CancellationToken ct);
    Task<IReadOnlyList<DocumentDto>> ListAsync(DocumentListQuery query, CancellationToken ct);
    Task<long>               CountAsync(DocumentListQuery query, CancellationToken ct);
    Task<Uri>                CreateDownloadUrlAsync(string ulid, TimeSpan? expiry, CancellationToken ct);
    Task<DocumentDto>        AddVersionAsync(string ulid, UploadInitRequest req, CancellationToken ct);
    Task<bool>               SoftDeleteAsync(string ulid, CancellationToken ct);
    Task<bool>               RestoreAsync(string ulid, CancellationToken ct);
    Task<StorageQuotaDto>    GetTenantQuotaAsync(CancellationToken ct);
}

/* ----- request/response DTOs ----- */

public sealed record UploadInitRequest(
    string ClassCode,                  // "INVOICE", "BOE", "POD", â€¦
    string Filename,
    string ContentType,
    long   SizeBytes,
    string ChecksumSha256,
    string ModuleCode,                 // "M17", "M4"
    string? ModuleEntityType,          // "Invoice", "BillOfEntry"
    long?  ModuleEntityId);

public sealed record UploadInitResponse(
    string Ulid,
    StorageContainer Container,
    string ObjectKey,
    Uri    UploadUrl,
    Instant UploadUrlExpiresAt);

public sealed record UploadCompleteRequest(string ChecksumSha256, long SizeBytes);

public sealed record DocumentDto(
    string Ulid,
    long   Id,
    int    TenantId,
    string ClassCode,
    string Filename,
    string ContentType,
    long   SizeBytes,
    string ChecksumSha256,
    string Container,
    string ObjectKey,
    int    VersionNumber,
    bool   IsImmutable,
    Instant? RetainUntil,
    bool   IsDeleted,
    string ModuleCode,
    string? ModuleEntityType,
    long?  ModuleEntityId,
    Instant CreatedAt,
    Instant ModifiedAt);

public sealed record DocumentListQuery(
    string? ModuleCode = null,
    string? ModuleEntityType = null,
    long?   ModuleEntityId = null,
    string? ClassCode = null,
    bool    IncludeDeleted = false,
    int     Page = 1,
    int     PageSize = 50);

public sealed record StorageQuotaDto(
    int    TenantId,
    long   BytesUsed,
    long   BytesQuota,
    long   DocumentsCount,
    decimal PercentUsed,
    Instant LastRecomputedAt);
