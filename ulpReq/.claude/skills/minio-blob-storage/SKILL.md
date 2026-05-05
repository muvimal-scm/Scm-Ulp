---
name: minio-blob-storage
description: MinIO (MVP) and Azure Blob Storage (production) patterns for ULP via the IStorageProvider abstraction. Use when uploading/downloading files (invoices, exports, customs docs, POD images), generating pre-signed URLs, configuring S3-compatible buckets, or implementing WORM (write-once-read-many) compliance for invoices and audit. Always use IStorageProvider interface; never hard-code MinIO or Azure SDKs in business code.
---

# MinIO + Azure Blob Storage for ULP

## When this skill triggers
Working on file upload/download endpoints, generating pre-signed URLs for client-side uploads (POD photos, customs docs), implementing WORM retention for invoices/audit logs, configuring storage buckets/containers, or writing/modifying `IStorageProvider` implementations.

## Top 3 reference repos
1. **minio/minio** (https://github.com/minio/minio) — Official MinIO server. Read `docs/distributed/` for prod-grade self-hosted setups and `docs/orchestration/docker-compose/` for the dev container.
2. **minio/minio-dotnet** (https://github.com/minio/minio-dotnet) — Official .NET SDK. README has all canonical patterns. Critical methods: `PutObjectAsync`, `GetObjectAsync`, `PresignedGetObjectAsync`, `PresignedPutObjectAsync`.
3. **Azure/azure-sdk-for-net** (https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/storage/Azure.Storage.Blobs) — Official Azure Blob SDK. Read `samples/` for blob client usage, especially `Sample02_Auth.cs` (managed identity) and `Sample05_AccessConditions.cs` (immutability).

## Critical ULP patterns

### IStorageProvider abstraction (mandatory)
```csharp
// Backend/Common/Storage/IStorageProvider.cs
public interface IStorageProvider
{
    Task<StorageObjectId> PutAsync(
        StorageContainer container,
        string objectKey,
        Stream content,
        string contentType,
        StorageMetadata? metadata = null,
        CancellationToken ct = default);

    Task<Stream> GetAsync(StorageContainer container, string objectKey, CancellationToken ct = default);

    Task<Uri> GetPresignedDownloadUrlAsync(
        StorageContainer container,
        string objectKey,
        TimeSpan validity,
        CancellationToken ct = default);

    Task<Uri> GetPresignedUploadUrlAsync(
        StorageContainer container,
        string objectKey,
        TimeSpan validity,
        CancellationToken ct = default);

    Task SetImmutableAsync(
        StorageContainer container,
        string objectKey,
        DateTimeOffset retainUntil,
        CancellationToken ct = default);
}

// Container enum maps to bucket/container per environment
public enum StorageContainer
{
    Invoices,           // WORM - 8-year retention
    AuditLogs,          // WORM - permanent
    PodPhotos,          // 1-year retention
    CustomsDocuments,   // WORM - 5-year retention
    Exports,            // 30-day retention
    UserUploads,        // tenant-controlled
}
```

### MinIO implementation (MVP)
```csharp
// Backend/Common/Storage/MinIO/MinioStorageProvider.cs
public class MinioStorageProvider : IStorageProvider
{
    private readonly IMinioClient _client;
    private readonly StorageOptions _opts;
    private readonly ITenantContext _tenant;

    public async Task<StorageObjectId> PutAsync(
        StorageContainer container, string objectKey, Stream content,
        string contentType, StorageMetadata? metadata, CancellationToken ct)
    {
        var bucket = ResolveBucket(container);
        var key = TenantScoped(objectKey);    // ulp/tenant-{id}/{key}

        await EnsureBucketAsync(bucket, ct);

        var args = new PutObjectArgs()
            .WithBucket(bucket)
            .WithObject(key)
            .WithStreamData(content)
            .WithObjectSize(content.Length)
            .WithContentType(contentType);
        if (metadata is not null)
            args = args.WithHeaders(metadata.ToDictionary());

        await _client.PutObjectAsync(args, ct);
        return new StorageObjectId(bucket, key);
    }

    public async Task<Uri> GetPresignedDownloadUrlAsync(
        StorageContainer container, string objectKey, TimeSpan validity, CancellationToken ct)
    {
        var bucket = ResolveBucket(container);
        var key = TenantScoped(objectKey);
        var args = new PresignedGetObjectArgs()
            .WithBucket(bucket).WithObject(key)
            .WithExpiry((int)validity.TotalSeconds);
        var url = await _client.PresignedGetObjectAsync(args);
        return new Uri(url);
    }

    private string TenantScoped(string key) => $"tenant-{_tenant.TenantId}/{key.TrimStart('/')}";
}
```

### Azure Blob implementation (production)
```csharp
// Backend/Common/Storage/AzureBlob/AzureBlobStorageProvider.cs
public class AzureBlobStorageProvider : IStorageProvider
{
    private readonly BlobServiceClient _service;
    private readonly ITenantContext _tenant;

    public async Task<StorageObjectId> PutAsync(
        StorageContainer container, string objectKey, Stream content,
        string contentType, StorageMetadata? metadata, CancellationToken ct)
    {
        var containerName = ResolveContainer(container);
        var key = TenantScoped(objectKey);
        var blobClient = _service.GetBlobContainerClient(containerName).GetBlobClient(key);
        var headers = new BlobHttpHeaders { ContentType = contentType };
        var meta = metadata?.ToDictionary() ?? new Dictionary<string, string>();
        meta["TenantId"] = _tenant.TenantId.ToString();

        await blobClient.UploadAsync(content,
            new BlobUploadOptions { HttpHeaders = headers, Metadata = meta },
            ct);
        return new StorageObjectId(containerName, key);
    }

    public async Task SetImmutableAsync(
        StorageContainer container, string objectKey, DateTimeOffset retainUntil, CancellationToken ct)
    {
        var blobClient = _service.GetBlobContainerClient(ResolveContainer(container))
            .GetBlobClient(TenantScoped(objectKey));
        // Requires version-level immutability policy to be enabled on container
        await blobClient.SetImmutabilityPolicyAsync(
            new BlobImmutabilityPolicy
            {
                ExpiresOn = retainUntil,
                PolicyMode = BlobImmutabilityPolicyMode.Locked
            }, cancellationToken: ct);
    }

    public async Task<Uri> GetPresignedDownloadUrlAsync(
        StorageContainer container, string objectKey, TimeSpan validity, CancellationToken ct)
    {
        var blobClient = _service.GetBlobContainerClient(ResolveContainer(container))
            .GetBlobClient(TenantScoped(objectKey));
        // Use User Delegation SAS (Azure AD-issued; no account-key exposure)
        var userDelegationKey = await _service.GetUserDelegationKeyAsync(
            DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.Add(validity), ct);
        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = ResolveContainer(container),
            BlobName = TenantScoped(objectKey),
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(validity)
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);
        var sasUri = blobClient.GenerateSasUri(sasBuilder);
        return sasUri;
    }
}
```

### Object key naming convention (ULP standard)
```
{module}/{entity-type}/{yyyy}/{MM}/{dd}/{entity-id}_{purpose}.{ext}

Examples:
m17/invoice/2026/04/15/INV-2026-04-001234_original.pdf
m17/invoice/2026/04/15/INV-2026-04-001234_irp_signed.json
m4/bill-of-entry/2026/04/12/BOE-2026-3456_filed.xml
m13/pod/2026/04/15/TRIP-2026-04-789_signature.png
m13/pod/2026/04/15/TRIP-2026-04-789_photo_001.jpg
m21/audit/2026/04/15/AUDIT-2026-04-001234.json
```

## Critical gotchas

### NEVER expose direct bucket/blob URLs to users
- Always issue pre-signed URLs (MinIO `PresignedGetObjectAsync` / Azure SAS).
- Validity: 5 min for sensitive (invoice PDFs), up to 1 hour for low-risk (POD photos).

### WORM compliance for invoices + audit
- M17 (Accounts) and M21 (Audit) require write-once-read-many storage.
- MVP MinIO: enable object locking on bucket, set retention period.
- Production Azure Blob: enable version-level immutability policy on container; set per-blob via `SetImmutabilityPolicyAsync`.
- 8-year retention for tax invoices (Income Tax Act §44AA + GST Section 35).

### Tenant scoping
- ALWAYS prefix keys with `tenant-{id}/` to prevent cross-tenant leakage.
- Even with bucket-level isolation, code must enforce.

### Multipart uploads for large files
- Files > 100 MB: use multipart upload (both MinIO and Azure support).
- MinIO: `PutObjectArgs.WithStreamData` handles multipart automatically when stream length > 64 MB.

### Content-Type matters
- Set Content-Type explicitly on upload (e.g., `application/pdf`, `image/jpeg`).
- Browsers behave differently if content-type is `application/octet-stream`.

### MVP -> Production migration
- MVP MinIO: `Endpoint: http://localhost:9000, AccessKey: ulp, SecretKey: dev_password_min8`
- Prod Azure: `Endpoint: https://stulpprodcin.blob.core.windows.net, ManagedIdentity: true`
- Code change: NONE — DI swaps `IStorageProvider` implementation.
- Bucket migration: one-time `aws s3 sync s3://ulp-mvp s3://ulp-prod` (MinIO supports S3 protocol).

### Local MinIO bucket creation
- MinIO doesn't auto-create buckets on first PutObject.
- Always call `BucketExistsAsync` + `MakeBucketAsync` before first upload (or seed via init script).

## ULP companion docs
- ULP_HLD_v1.0_HighLevelDesign.docx Section 7 (Cross-cutting - storage)
- ULP_LLD_M17_v1.0_Accounts.docx (WORM retention requirements)
- ULP_DevelopmentGuide_v1.0.docx Section 6.2 (MVP -> Prod migration)
