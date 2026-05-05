namespace Ulp.Core.Abstractions.Storage;

/// <summary>
/// Blob storage abstraction per .claude/skills/minio-blob-storage/SKILL.md.
/// MinIO in dev, Azure Blob in prod — single swap point.
/// Object keys are always tenant-scoped at the adapter layer; callers never
/// see direct bucket URLs — only pre-signed PUT/GET URLs.
/// </summary>
public interface IStorageProvider
{
    /// <summary>Upload a stream directly (small/server-driven uploads).</summary>
    Task<StorageObjectId> PutAsync(
        StorageContainer container,
        string objectKey,
        Stream content,
        string contentType,
        IDictionary<string, string>? metadata = null,
        CancellationToken ct = default);

    /// <summary>Read a stream (small/server-driven downloads).</summary>
    Task<Stream> GetAsync(StorageContainer container, string objectKey, CancellationToken ct = default);

    /// <summary>Pre-signed PUT URL — client uploads directly to bucket.</summary>
    Task<Uri> GetPresignedUploadUrlAsync(
        StorageContainer container, string objectKey, TimeSpan validity, CancellationToken ct = default);

    /// <summary>Pre-signed GET URL — short-lived download link.</summary>
    Task<Uri> GetPresignedDownloadUrlAsync(
        StorageContainer container, string objectKey, TimeSpan validity, CancellationToken ct = default);

    /// <summary>Object metadata after upload — used to verify checksum + size.</summary>
    Task<StoredObjectInfo?> StatAsync(StorageContainer container, string objectKey, CancellationToken ct = default);

    /// <summary>Server-side copy — used for versioning + folder reorganisation.</summary>
    Task CopyAsync(
        StorageContainer sourceContainer, string sourceKey,
        StorageContainer destContainer, string destKey,
        CancellationToken ct = default);

    /// <summary>Hard-delete an object. Caller is responsible for soft-delete + WORM/legal-hold checks.</summary>
    Task DeleteAsync(StorageContainer container, string objectKey, CancellationToken ct = default);

    /// <summary>Apply WORM retain-until policy on an object (Azure immutability / MinIO retention).</summary>
    Task SetImmutableAsync(StorageContainer container, string objectKey, DateTimeOffset retainUntil, CancellationToken ct = default);
}

/// <summary>Logical containers; bucket/account names resolved per environment.</summary>
public enum StorageContainer
{
    Invoices,           // WORM 8 years
    AuditLogs,          // WORM permanent
    PodPhotos,          // 1-year lifecycle
    CustomsDocuments,   // WORM 5 years
    Exports,            // 30-day lifecycle
    UserUploads,        // tenant-controlled
}

public sealed record StorageObjectId(StorageContainer Container, string ObjectKey);

public sealed record StoredObjectInfo(
    long SizeBytes,
    string ContentType,
    string ETag,
    DateTimeOffset LastModified,
    string? ChecksumSha256);
