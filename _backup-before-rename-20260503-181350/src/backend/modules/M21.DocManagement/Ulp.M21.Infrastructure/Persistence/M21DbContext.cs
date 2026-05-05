using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.M21.Domain.Entities;

namespace Ulp.M21.Infrastructure.Persistence;

/// <summary>M21 DbContext — strictly per docs/lld/M21_DocManagement_v1.0.md table shapes.</summary>
public sealed class M21DbContext(DbContextOptions<M21DbContext> options) : DbContext(options)
{
    public DbSet<Document>          Documents       => Set<Document>();
    public DbSet<DocumentClass>     Classes         => Set<DocumentClass>();
    public DbSet<DocumentVersion>   Versions        => Set<DocumentVersion>();
    public DbSet<DocumentTag>       Tags            => Set<DocumentTag>();
    public DbSet<DocumentAcl>       Acls            => Set<DocumentAcl>();
    public DbSet<DocumentShare>     Shares          => Set<DocumentShare>();
    public DbSet<DocumentAudit>     Audits          => Set<DocumentAudit>();
    public DbSet<ExtractedField>    ExtractedFields => Set<ExtractedField>();
    public DbSet<SignatureRequest>  SignatureRequests => Set<SignatureRequest>();
    public DbSet<SignatureSigner>   SignatureSigners  => Set<SignatureSigner>();
    public DbSet<RetentionPolicy>   RetentionPolicies => Set<RetentionPolicy>();
    public DbSet<LegalHold>         LegalHolds      => Set<LegalHold>();
    public DbSet<DocumentLegalHold> DocumentLegalHolds => Set<DocumentLegalHold>();
    public DbSet<StorageQuota>      Quotas          => Set<StorageQuota>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Document>(e =>
        {
            e.ToTable("m21_document");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Ulid).HasColumnName("ulid").HasMaxLength(26).IsFixedLength();
            e.Property(x => x.DocumentClassId).HasColumnName("document_class_id");
            e.Property(x => x.ModuleCode).HasColumnName("module_code").HasMaxLength(10);
            e.Property(x => x.ModuleEntityType).HasColumnName("module_entity_type").HasMaxLength(50);
            e.Property(x => x.ModuleEntityId).HasColumnName("module_entity_id");
            e.Property(x => x.Filename).HasColumnName("filename").HasMaxLength(255);
            e.Property(x => x.ContentType).HasColumnName("content_type").HasMaxLength(100);
            e.Property(x => x.SizeBytes).HasColumnName("size_bytes");
            e.Property(x => x.ChecksumSha256).HasColumnName("checksum_sha256").HasMaxLength(64).IsFixedLength();
            e.Property(x => x.StorageContainer).HasColumnName("storage_container").HasMaxLength(50);
            e.Property(x => x.StorageObjectKey).HasColumnName("storage_object_key").HasMaxLength(500);
            e.Property(x => x.CurrentVersionId).HasColumnName("current_version_id");
            e.Property(x => x.IsImmutable).HasColumnName("is_immutable");
            e.Property(x => x.RetainUntil).HasColumnName("retain_until_utc").HasConversion(NullableInstant);
            e.Property(x => x.IsDeleted).HasColumnName("is_deleted");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.DeletedBy).HasColumnName("deleted_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedBy).HasColumnName("modified_by");
            e.HasIndex(x => x.Ulid).IsUnique();
        });

        b.Entity<DocumentClass>(e =>
        {
            e.ToTable("m21_document_class");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(50);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.DefaultStorageContainer).HasColumnName("default_storage_container").HasMaxLength(50);
            e.Property(x => x.DefaultImmutable).HasColumnName("default_immutable");
            e.Property(x => x.DefaultRetainYears).HasColumnName("default_retain_years");
            e.Property(x => x.OcrEnabled).HasColumnName("ocr_enabled");
            e.Property(x => x.AiClassify).HasColumnName("ai_classify");
            e.Property(x => x.IsActive).HasColumnName("is_active");
        });

        b.Entity<DocumentVersion>(e =>
        {
            e.ToTable("m21_document_version");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.VersionNumber).HasColumnName("version_number");
            e.Property(x => x.Filename).HasColumnName("filename").HasMaxLength(255);
            e.Property(x => x.ContentType).HasColumnName("content_type").HasMaxLength(100);
            e.Property(x => x.SizeBytes).HasColumnName("size_bytes");
            e.Property(x => x.ChecksumSha256).HasColumnName("checksum_sha256").HasMaxLength(64).IsFixedLength();
            e.Property(x => x.StorageObjectKey).HasColumnName("storage_object_key").HasMaxLength(500);
            e.Property(x => x.UploadedBy).HasColumnName("uploaded_by");
            e.Property(x => x.UploadedAt).HasColumnName("uploaded_at_utc").HasConversion(InstantConv);
            e.Property(x => x.Comment).HasColumnName("comment").HasMaxLength(500);
        });

        b.Entity<DocumentTag>(e =>
        {
            e.ToTable("m21_document_tag");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.TagName).HasColumnName("tag_name").HasMaxLength(50);
            e.Property(x => x.TagValue).HasColumnName("tag_value").HasMaxLength(255);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<DocumentAcl>(e =>
        {
            e.ToTable("m21_document_acl");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.PrincipalType).HasColumnName("principal_type").HasConversion<string>().HasMaxLength(7);
            e.Property(x => x.PrincipalId).HasColumnName("principal_id");
            e.Property(x => x.Permission).HasColumnName("permission").HasConversion<string>().HasMaxLength(6);
            e.Property(x => x.GrantedBy).HasColumnName("granted_by");
            e.Property(x => x.GrantedAt).HasColumnName("granted_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at_utc").HasConversion(NullableInstant);
        });

        b.Entity<DocumentShare>(e =>
        {
            e.ToTable("m21_document_share");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.ShareToken).HasColumnName("share_token").HasMaxLength(64).IsFixedLength();
            e.Property(x => x.RecipientEmail).HasColumnName("recipient_email").HasMaxLength(255);
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at_utc").HasConversion(InstantConv);
            e.Property(x => x.MaxDownloads).HasColumnName("max_downloads");
            e.Property(x => x.DownloadCount).HasColumnName("download_count");
            e.Property(x => x.IsRevoked).HasColumnName("is_revoked");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.HasIndex(x => x.ShareToken).IsUnique();
        });

        b.Entity<DocumentAudit>(e =>
        {
            e.ToTable("m21_document_audit");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Action).HasColumnName("action").HasConversion<string>().HasMaxLength(8);
            e.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
            e.Property(x => x.UserAgent).HasColumnName("user_agent").HasMaxLength(500);
            e.Property(x => x.OccurredAt).HasColumnName("occurred_at_utc").HasConversion(InstantConv);
            e.Property(x => x.DetailsJson).HasColumnName("details").HasColumnType("json");
        });

        b.Entity<ExtractedField>(e =>
        {
            e.ToTable("m21_extracted_field");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.FieldName).HasColumnName("field_name").HasMaxLength(100);
            e.Property(x => x.FieldValue).HasColumnName("field_value");
            e.Property(x => x.Confidence).HasColumnName("confidence").HasPrecision(5, 4);
            e.Property(x => x.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(5);
            e.Property(x => x.PageNumber).HasColumnName("page_number");
            e.Property(x => x.BboxJson).HasColumnName("bbox_json").HasColumnType("json");
            e.Property(x => x.ExtractedAt).HasColumnName("extracted_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ReviewedBy).HasColumnName("reviewed_by");
            e.Property(x => x.ReviewedAt).HasColumnName("reviewed_at_utc").HasConversion(NullableInstant);
        });

        b.Entity<SignatureRequest>(e =>
        {
            e.ToTable("m21_signature_request");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.Provider).HasColumnName("provider").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.ExternalRef).HasColumnName("external_ref").HasMaxLength(255);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.InitiatedBy).HasColumnName("initiated_by");
            e.Property(x => x.InitiatedAt).HasColumnName("initiated_at_utc").HasConversion(InstantConv);
            e.Property(x => x.CompletedAt).HasColumnName("completed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at_utc").HasConversion(NullableInstant);
        });

        b.Entity<SignatureSigner>(e =>
        {
            e.ToTable("m21_signature_signer");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.SignatureRequestId).HasColumnName("signature_request_id");
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(255);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(255);
            e.Property(x => x.SigningOrder).HasColumnName("signing_order");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.SignedAt).HasColumnName("signed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
        });

        b.Entity<RetentionPolicy>(e =>
        {
            e.ToTable("m21_retention_policy");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.DocumentClassId).HasColumnName("document_class_id");
            e.Property(x => x.RetainYears).HasColumnName("retain_years");
            e.Property(x => x.Worm).HasColumnName("worm");
            e.Property(x => x.LegalHold).HasColumnName("legal_hold");
            e.Property(x => x.EffectiveFrom).HasColumnName("effective_from_utc").HasConversion(InstantConv);
        });

        b.Entity<LegalHold>(e =>
        {
            e.ToTable("m21_legal_hold");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.HoldName).HasColumnName("hold_name").HasMaxLength(150);
            e.Property(x => x.Reason).HasColumnName("reason");
            e.Property(x => x.ScopeModule).HasColumnName("scope_module").HasMaxLength(10);
            e.Property(x => x.ScopeClassId).HasColumnName("scope_class_id");
            e.Property(x => x.ScopeQueryJson).HasColumnName("scope_query").HasColumnType("json");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.AppliedAt).HasColumnName("applied_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ReleasedAt).HasColumnName("released_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.AppliedBy).HasColumnName("applied_by");
            e.Property(x => x.ReleasedBy).HasColumnName("released_by");
        });

        b.Entity<DocumentLegalHold>(e =>
        {
            e.ToTable("m21_document_legal_hold");
            e.HasKey(x => new { x.DocumentId, x.LegalHoldId });
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.LegalHoldId).HasColumnName("legal_hold_id");
            e.Property(x => x.AppliedAt).HasColumnName("applied_at_utc").HasConversion(InstantConv);
        });

        b.Entity<StorageQuota>(e =>
        {
            e.ToTable("m21_storage_quota");
            e.HasKey(x => x.TenantId);
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BytesUsed).HasColumnName("bytes_used");
            e.Property(x => x.BytesQuota).HasColumnName("bytes_quota");
            e.Property(x => x.DocumentsCount).HasColumnName("documents_count");
            e.Property(x => x.LastRecomputedAt).HasColumnName("last_recomputed_utc").HasConversion(InstantConv);
        });
    }

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant, DateTime>
        InstantConv = new(
            v => v.ToDateTimeUtc(),
            v => Instant.FromDateTimeUtc(DateTime.SpecifyKind(v, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant?, DateTime?>
        NullableInstant = new(
            v => v == null ? null : v.Value.ToDateTimeUtc(),
            v => v == null ? null : Instant.FromDateTimeUtc(DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)));
}
