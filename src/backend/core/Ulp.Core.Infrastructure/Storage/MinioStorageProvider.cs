using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using Ulp.Core.Abstractions.Storage;

namespace Ulp.Core.Infrastructure.Storage;

/// <summary>
/// MinIO adapter for <see cref="IStorageProvider"/>. Container→bucket map is
/// fixed per skill; bucket setup happens in infra/docker/_dev/minio/buckets/init-buckets.sh.
/// </summary>
public sealed class MinioStorageProvider(
    IMinioClient client,
    IOptions<StorageOptions> opts,
    ILogger<MinioStorageProvider> log) : IStorageProvider
{
    private readonly IMinioClient _client = client;
    private readonly StorageOptions _opts = opts.Value;
    private readonly ILogger<MinioStorageProvider> _log = log;

    public async Task<StorageObjectId> PutAsync(
        StorageContainer container, string objectKey, Stream content,
        string contentType, IDictionary<string, string>? metadata, CancellationToken ct)
    {
        var bucket = ResolveBucket(container);
        var args = new PutObjectArgs()
            .WithBucket(bucket)
            .WithObject(objectKey)
            .WithStreamData(content)
            .WithObjectSize(content.Length)
            .WithContentType(contentType);
        if (metadata is { Count: > 0 }) args = args.WithHeaders(metadata);

        await _client.PutObjectAsync(args, ct);
        _log.LogInformation("PUT {Container}/{Key} ({Size}B)", container, objectKey, content.Length);
        return new StorageObjectId(container, objectKey);
    }

    public async Task<Stream> GetAsync(StorageContainer container, string objectKey, CancellationToken ct)
    {
        var bucket = ResolveBucket(container);
        var ms = new MemoryStream();
        var args = new GetObjectArgs()
            .WithBucket(bucket)
            .WithObject(objectKey)
            .WithCallbackStream(s => s.CopyTo(ms));
        await _client.GetObjectAsync(args, ct);
        ms.Position = 0;
        return ms;
    }

    public async Task<Uri> GetPresignedUploadUrlAsync(
        StorageContainer container, string objectKey, TimeSpan validity, CancellationToken ct)
    {
        var bucket = ResolveBucket(container);
        var seconds = (int)Math.Clamp(validity.TotalSeconds, 60, 7 * 24 * 3600);
        var url = await _client.PresignedPutObjectAsync(new PresignedPutObjectArgs()
            .WithBucket(bucket).WithObject(objectKey).WithExpiry(seconds));
        return new Uri(url);
    }

    public async Task<Uri> GetPresignedDownloadUrlAsync(
        StorageContainer container, string objectKey, TimeSpan validity, CancellationToken ct)
    {
        var bucket = ResolveBucket(container);
        var seconds = (int)Math.Clamp(validity.TotalSeconds, 60, 7 * 24 * 3600);
        var url = await _client.PresignedGetObjectAsync(new PresignedGetObjectArgs()
            .WithBucket(bucket).WithObject(objectKey).WithExpiry(seconds));
        return new Uri(url);
    }

    public async Task<StoredObjectInfo?> StatAsync(StorageContainer container, string objectKey, CancellationToken ct)
    {
        var bucket = ResolveBucket(container);
        try
        {
            var stat = await _client.StatObjectAsync(new StatObjectArgs()
                .WithBucket(bucket).WithObject(objectKey), ct);
            return new StoredObjectInfo(
                stat.Size,
                stat.ContentType ?? "application/octet-stream",
                stat.ETag ?? "",
                stat.LastModified,
                stat.MetaData?.GetValueOrDefault("x-amz-checksum-sha256"));
        }
        catch (Minio.Exceptions.ObjectNotFoundException) { return null; }
    }

    public async Task CopyAsync(
        StorageContainer sourceContainer, string sourceKey,
        StorageContainer destContainer, string destKey, CancellationToken ct)
    {
        var srcBucket = ResolveBucket(sourceContainer);
        var dstBucket = ResolveBucket(destContainer);
        var copy = new CopySourceObjectArgs()
            .WithBucket(srcBucket).WithObject(sourceKey);
        await _client.CopyObjectAsync(new CopyObjectArgs()
            .WithBucket(dstBucket).WithObject(destKey).WithCopyObjectSource(copy), ct);
    }

    public async Task DeleteAsync(StorageContainer container, string objectKey, CancellationToken ct)
    {
        var bucket = ResolveBucket(container);
        await _client.RemoveObjectAsync(new RemoveObjectArgs()
            .WithBucket(bucket).WithObject(objectKey), ct);
    }

    public Task SetImmutableAsync(StorageContainer container, string objectKey, DateTimeOffset retainUntil, CancellationToken ct)
    {
        // MinIO supports object retention via legal-hold + retention API. The dev stack
        // attempts WORM at bucket-init time (init-buckets.sh); per-object enforcement is
        // a Phase 2 hardening. Log and continue so callers see the intent.
        _log.LogInformation("SetImmutable {Container}/{Key} until {Until} (no-op in dev MinIO)",
            container, objectKey, retainUntil);
        return Task.CompletedTask;
    }

    private string ResolveBucket(StorageContainer container) => container switch
    {
        StorageContainer.Invoices         => _opts.BucketInvoices,
        StorageContainer.AuditLogs        => _opts.BucketAuditLogs,
        StorageContainer.PodPhotos        => _opts.BucketPodPhotos,
        StorageContainer.CustomsDocuments => _opts.BucketCustomsDocuments,
        StorageContainer.Exports          => _opts.BucketExports,
        StorageContainer.UserUploads      => _opts.BucketUserUploads,
        _ => throw new ArgumentOutOfRangeException(nameof(container), container, "unknown container"),
    };
}

/// <summary>Bound to <c>MinIO</c> section of appsettings.json; bucket names default to ULP convention.</summary>
public sealed class StorageOptions
{
    public string Endpoint  { get; set; } = "http://localhost:9000";
    public string AccessKey { get; set; } = "ulp";
    public string SecretKey { get; set; } = "dev_password_min8";
    public bool   UseSSL    { get; set; } = false;

    public string BucketInvoices         { get; set; } = "ulp-invoices";
    public string BucketAuditLogs        { get; set; } = "ulp-audit-logs";
    public string BucketPodPhotos        { get; set; } = "ulp-pod-photos";
    public string BucketCustomsDocuments { get; set; } = "ulp-customs-documents";
    public string BucketExports          { get; set; } = "ulp-exports";
    public string BucketUserUploads      { get; set; } = "ulp-user-uploads";
}

public static class StorageRegistration
{
    public static IServiceCollection AddMinioStorage(this IServiceCollection services, IConfiguration cfg)
    {
        services.Configure<StorageOptions>(cfg.GetSection("MinIO"));
        services.AddSingleton<IMinioClient>(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<StorageOptions>>().Value;
            var endpointHost = new Uri(opts.Endpoint).Authority;
            return new MinioClient()
                .WithEndpoint(endpointHost)
                .WithCredentials(opts.AccessKey, opts.SecretKey)
                .WithSSL(opts.UseSSL)
                .Build();
        });
        services.AddScoped<IStorageProvider, MinioStorageProvider>();
        return services;
    }
}
