using NodaTime;

namespace Ulp.M6.Domain.Entities;

// LLD §3.1
public sealed class Template
{
    public long Id { get; set; }
    public int? TenantId { get; set; }                  // null = system
    public string Code { get; set; } = "";
    public string? CountryCode { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public TemplateType TemplateType { get; set; }
    public RenderingEngine RenderingEngine { get; set; }
    public bool IsActive { get; set; } = true;
    public int Version { get; set; } = 1;
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum TemplateType    { Pdf, Html, Docx, Text }
public enum RenderingEngine { Scriban, Questpdf, Handlebars }

// LLD §3.2
public sealed class TemplateVersion
{
    public long Id { get; set; }
    public long TemplateId { get; set; }
    public int VersionNumber { get; set; }
    public string Body { get; set; } = "";
    public string? LayoutJson { get; set; }
    public long CreatedBy { get; set; }
    public Instant CreatedAt { get; set; }
    public string? Comment { get; set; }
}

// LLD §3.3
public sealed class TemplateField
{
    public long Id { get; set; }
    public long TemplateId { get; set; }
    public string FieldName { get; set; } = "";
    public TemplateFieldType FieldType { get; set; }
    public bool IsRequired { get; set; }
    public string? DefaultValue { get; set; }
    public string? SourceModule { get; set; }
    public string? SourcePath { get; set; }
}

public enum TemplateFieldType { Text, Number, Date, Money, Boolean, List, Object }

// LLD §3.4
public sealed class RenderRequest
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string Ulid { get; set; } = "";
    public long TemplateId { get; set; }
    public int TemplateVersion { get; set; }
    public string SourceModule { get; set; } = "";
    public long? SourceEntityId { get; set; }
    public string PayloadJson { get; set; } = "{}";
    public TemplateType OutputFormat { get; set; }
    public RenderStatus Status { get; set; } = RenderStatus.Queued;
    public long? DocumentId { get; set; }
    public string? RenderedBody { get; set; }
    public string? ErrorMessage { get; set; }
    public Instant RequestedAt { get; set; }
    public Instant? CompletedAt { get; set; }
    public int? DurationMs { get; set; }
}

public enum RenderStatus { Queued, Rendering, Completed, Failed }

// LLD §3.5
public sealed class TemplateAsset
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public AssetType AssetType { get; set; }
    public string Name { get; set; } = "";
    public long DocumentId { get; set; }
    public bool IsDefault { get; set; }
}

public enum AssetType { Logo, Signature, Stamp, Watermark, HeaderImg, FooterImg }

// LLD §3.6
public sealed class TextOverlay
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long TemplateId { get; set; }
    public string Text { get; set; } = "";
    public int? Page { get; set; }
    public decimal? PositionX { get; set; }
    public decimal? PositionY { get; set; }
    public decimal? FontSize { get; set; }
    public string? FontColor { get; set; }
    public decimal? RotationDeg { get; set; }
    public decimal? Opacity { get; set; }
}

// LLD §3.7
public sealed class PrintLog
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long DocumentId { get; set; }
    public long PrintedBy { get; set; }
    public Instant PrintedAt { get; set; }
    public int Copies { get; set; } = 1;
    public string? PrinterName { get; set; }
    public string? IpAddress { get; set; }
}

// LLD §3.8
public sealed class EmailBatch
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string? TemplateCode { get; set; }
    public int? BatchSize { get; set; }
    public EmailBatchStatus Status { get; set; } = EmailBatchStatus.Queued;
    public Instant CreatedAt { get; set; }
}

public enum EmailBatchStatus { Queued, Sending, Completed, Failed }
