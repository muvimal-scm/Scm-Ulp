using NodaTime;

namespace Ulp.M21.Domain.Entities;

// All M21 entities — one file per LLD. Split if any grows non-trivial behaviour.

// LLD §3.1
public sealed class Document
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string Ulid { get; set; } = "";
    public long DocumentClassId { get; set; }
    public string ModuleCode { get; set; } = "";
    public string? ModuleEntityType { get; set; }
    public long? ModuleEntityId { get; set; }
    public string Filename { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public string ChecksumSha256 { get; set; } = "";
    public string StorageContainer { get; set; } = "";
    public string StorageObjectKey { get; set; } = "";
    public long? CurrentVersionId { get; set; }
    public bool IsImmutable { get; set; }
    public Instant? RetainUntil { get; set; }
    public bool IsDeleted { get; set; }
    public Instant? DeletedAt { get; set; }
    public long? DeletedBy { get; set; }
    public Instant CreatedAt { get; set; }
    public long CreatedBy { get; set; }
    public Instant ModifiedAt { get; set; }
    public long ModifiedBy { get; set; }
}

// LLD §3.2
public sealed class DocumentClass
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string CountryCode { get; set; } = "";
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string DefaultStorageContainer { get; set; } = "UserUploads";
    public bool DefaultImmutable { get; set; }
    public int? DefaultRetainYears { get; set; }
    public bool OcrEnabled { get; set; }
    public bool AiClassify { get; set; }
    public bool IsActive { get; set; } = true;
}

// LLD §3.3
public sealed class DocumentVersion
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long DocumentId { get; set; }
    public int VersionNumber { get; set; }
    public string Filename { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public string ChecksumSha256 { get; set; } = "";
    public string StorageObjectKey { get; set; } = "";
    public long UploadedBy { get; set; }
    public Instant UploadedAt { get; set; }
    public string? Comment { get; set; }
}

// LLD §3.4
public sealed class DocumentTag
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long DocumentId { get; set; }
    public string TagName { get; set; } = "";
    public string? TagValue { get; set; }
    public Instant CreatedAt { get; set; }
}

// LLD §3.5
public sealed class DocumentAcl
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long DocumentId { get; set; }
    public AclPrincipalType PrincipalType { get; set; }
    public long PrincipalId { get; set; }
    public AclPermission Permission { get; set; }
    public long GrantedBy { get; set; }
    public Instant GrantedAt { get; set; }
    public Instant? ExpiresAt { get; set; }
}
public enum AclPrincipalType { User, Role, Group, Tenant }
public enum AclPermission    { Read, Write, Delete, Share }

// LLD §3.6
public sealed class DocumentShare
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long DocumentId { get; set; }
    public string ShareToken { get; set; } = "";
    public string? RecipientEmail { get; set; }
    public Instant ExpiresAt { get; set; }
    public int? MaxDownloads { get; set; }
    public int DownloadCount { get; set; }
    public bool IsRevoked { get; set; }
    public long CreatedBy { get; set; }
    public Instant CreatedAt { get; set; }
}

// LLD §3.7
public sealed class DocumentAudit
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long DocumentId { get; set; }
    public long? UserId { get; set; }
    public DocAuditAction Action { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public Instant OccurredAt { get; set; }
    public string? DetailsJson { get; set; }
}
public enum DocAuditAction { Upload, Download, View, Update, Delete, Share, Restore }

// LLD §3.8
public sealed class ExtractedField
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long DocumentId { get; set; }
    public string FieldName { get; set; } = "";
    public string? FieldValue { get; set; }
    public decimal? Confidence { get; set; }
    public ExtractionSource Source { get; set; }
    public int? PageNumber { get; set; }
    public string? BboxJson { get; set; }
    public Instant ExtractedAt { get; set; }
    public long? ReviewedBy { get; set; }
    public Instant? ReviewedAt { get; set; }
}
public enum ExtractionSource { Ocr, Ai, Human }

// LLD §3.9
public sealed class SignatureRequest
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long DocumentId { get; set; }
    public SignatureProvider Provider { get; set; }
    public string? ExternalRef { get; set; }
    public SignatureStatus Status { get; set; }
    public long InitiatedBy { get; set; }
    public Instant InitiatedAt { get; set; }
    public Instant? CompletedAt { get; set; }
    public Instant? ExpiresAt { get; set; }
}
public enum SignatureProvider { Native, Docusign, AdobeSign, Other }
public enum SignatureStatus    { Draft, Sent, Viewed, Signed, Declined, Expired, Voided }

// LLD §3.10
public sealed class SignatureSigner
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long SignatureRequestId { get; set; }
    public string Email { get; set; } = "";
    public string? Name { get; set; }
    public int? SigningOrder { get; set; }
    public SignerStatus Status { get; set; }
    public Instant? SignedAt { get; set; }
    public string? IpAddress { get; set; }
}
public enum SignerStatus { Pending, Notified, Signed, Declined }

// LLD §3.11
public sealed class RetentionPolicy
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string? CountryCode { get; set; }
    public long? DocumentClassId { get; set; }
    public byte RetainYears { get; set; }
    public bool Worm { get; set; }
    public bool LegalHold { get; set; }
    public Instant EffectiveFrom { get; set; }
}

// LLD §3.12
public sealed class LegalHold
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string HoldName { get; set; } = "";
    public string? Reason { get; set; }
    public string? ScopeModule { get; set; }
    public long? ScopeClassId { get; set; }
    public string? ScopeQueryJson { get; set; }
    public bool IsActive { get; set; } = true;
    public Instant AppliedAt { get; set; }
    public Instant? ReleasedAt { get; set; }
    public long AppliedBy { get; set; }
    public long? ReleasedBy { get; set; }
}

// LLD §3.13
public sealed class DocumentLegalHold
{
    public long DocumentId { get; set; }
    public long LegalHoldId { get; set; }
    public Instant AppliedAt { get; set; }
}

// LLD §3.14
public sealed class StorageQuota
{
    public int TenantId { get; set; }
    public long BytesUsed { get; set; }
    public long BytesQuota { get; set; }
    public long DocumentsCount { get; set; }
    public Instant LastRecomputedAt { get; set; }
}
