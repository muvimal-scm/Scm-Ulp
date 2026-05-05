using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.M6.Domain.Entities;

namespace Ulp.M6.Infrastructure.Persistence;

public sealed class M6DbContext(DbContextOptions<M6DbContext> options) : DbContext(options)
{
    public DbSet<Template>        Templates       => Set<Template>();
    public DbSet<TemplateVersion> Versions        => Set<TemplateVersion>();
    public DbSet<TemplateField>   Fields          => Set<TemplateField>();
    public DbSet<RenderRequest>   RenderRequests  => Set<RenderRequest>();
    public DbSet<TemplateAsset>   Assets          => Set<TemplateAsset>();
    public DbSet<TextOverlay>     Overlays        => Set<TextOverlay>();
    public DbSet<PrintLog>        PrintLogs       => Set<PrintLog>();
    public DbSet<EmailBatch>      EmailBatches    => Set<EmailBatch>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Template>(e =>
        {
            e.ToTable("m6_template");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(80);
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.TemplateType).HasColumnName("template_type")
                .HasConversion(t => t.ToString().ToUpperInvariant(),
                               s => Enum.Parse<TemplateType>(s, true)).HasMaxLength(8);
            e.Property(x => x.RenderingEngine).HasColumnName("rendering_engine")
                .HasConversion(t => t.ToString().ToUpperInvariant(),
                               s => Enum.Parse<RenderingEngine>(s, true)).HasMaxLength(15);
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.Version).HasColumnName("version");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<TemplateVersion>(e =>
        {
            e.ToTable("m6_template_version");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TemplateId).HasColumnName("template_id");
            e.Property(x => x.VersionNumber).HasColumnName("version_number");
            e.Property(x => x.Body).HasColumnName("body").HasColumnType("LONGTEXT");
            e.Property(x => x.LayoutJson).HasColumnName("layout_json").HasColumnType("json");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.Comment).HasColumnName("comment").HasMaxLength(500);
        });

        b.Entity<TemplateField>(e =>
        {
            e.ToTable("m6_template_field");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TemplateId).HasColumnName("template_id");
            e.Property(x => x.FieldName).HasColumnName("field_name").HasMaxLength(100);
            e.Property(x => x.FieldType).HasColumnName("field_type")
                .HasConversion(t => t.ToString().ToUpperInvariant(),
                               s => Enum.Parse<TemplateFieldType>(s, true)).HasMaxLength(10);
            e.Property(x => x.IsRequired).HasColumnName("is_required");
            e.Property(x => x.DefaultValue).HasColumnName("default_value").HasMaxLength(255);
            e.Property(x => x.SourceModule).HasColumnName("source_module").HasMaxLength(10);
            e.Property(x => x.SourcePath).HasColumnName("source_path").HasMaxLength(255);
        });

        b.Entity<RenderRequest>(e =>
        {
            e.ToTable("m6_render_request");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Ulid).HasColumnName("ulid").HasMaxLength(26);
            e.Property(x => x.TemplateId).HasColumnName("template_id");
            e.Property(x => x.TemplateVersion).HasColumnName("template_version");
            e.Property(x => x.SourceModule).HasColumnName("source_module").HasMaxLength(10);
            e.Property(x => x.SourceEntityId).HasColumnName("source_entity_id");
            e.Property(x => x.PayloadJson).HasColumnName("payload").HasColumnType("json");
            e.Property(x => x.OutputFormat).HasColumnName("output_format")
                .HasConversion(t => t.ToString().ToUpperInvariant(),
                               s => Enum.Parse<TemplateType>(s, true)).HasMaxLength(8);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.RenderedBody).HasColumnName("rendered_body").HasColumnType("LONGTEXT");
            e.Property(x => x.ErrorMessage).HasColumnName("error_message");
            e.Property(x => x.RequestedAt).HasColumnName("requested_at_utc").HasConversion(InstantConv);
            e.Property(x => x.CompletedAt).HasColumnName("completed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.DurationMs).HasColumnName("duration_ms");
            e.HasIndex(x => x.Ulid).IsUnique();
        });

        b.Entity<TemplateAsset>(e =>
        {
            e.ToTable("m6_template_asset");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.AssetType).HasColumnName("asset_type")
                .HasConversion(AssetTypeToString, StringToAssetType).HasMaxLength(15);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.IsDefault).HasColumnName("is_default");
        });

        b.Entity<TextOverlay>(e =>
        {
            e.ToTable("m6_text_overlay");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.TemplateId).HasColumnName("template_id");
            e.Property(x => x.Text).HasColumnName("text").HasMaxLength(255);
            e.Property(x => x.Page).HasColumnName("page");
            e.Property(x => x.PositionX).HasColumnName("position_x").HasPrecision(8, 4);
            e.Property(x => x.PositionY).HasColumnName("position_y").HasPrecision(8, 4);
            e.Property(x => x.FontSize).HasColumnName("font_size").HasPrecision(5, 2);
            e.Property(x => x.FontColor).HasColumnName("font_color").HasMaxLength(7);
            e.Property(x => x.RotationDeg).HasColumnName("rotation_deg").HasPrecision(5, 2);
            e.Property(x => x.Opacity).HasColumnName("opacity").HasPrecision(3, 2);
        });

        b.Entity<PrintLog>(e =>
        {
            e.ToTable("m6_print_log");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.PrintedBy).HasColumnName("printed_by");
            e.Property(x => x.PrintedAt).HasColumnName("printed_at_utc").HasConversion(InstantConv);
            e.Property(x => x.Copies).HasColumnName("copies");
            e.Property(x => x.PrinterName).HasColumnName("printer_name").HasMaxLength(100);
            e.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
        });

        b.Entity<EmailBatch>(e =>
        {
            e.ToTable("m6_email_batch");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.TemplateCode).HasColumnName("template_code").HasMaxLength(80);
            e.Property(x => x.BatchSize).HasColumnName("batch_size");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });
    }

    // ENUM('LOGO','SIGNATURE','STAMP','WATERMARK','HEADER_IMG','FOOTER_IMG')
    private static System.Linq.Expressions.Expression<Func<AssetType, string>> AssetTypeToString => t =>
        t == AssetType.Logo       ? "LOGO" :
        t == AssetType.Signature  ? "SIGNATURE" :
        t == AssetType.Stamp      ? "STAMP" :
        t == AssetType.Watermark  ? "WATERMARK" :
        t == AssetType.HeaderImg  ? "HEADER_IMG" :
                                    "FOOTER_IMG";

    private static System.Linq.Expressions.Expression<Func<string, AssetType>> StringToAssetType => s =>
        s == "LOGO"       ? AssetType.Logo :
        s == "SIGNATURE"  ? AssetType.Signature :
        s == "STAMP"      ? AssetType.Stamp :
        s == "WATERMARK"  ? AssetType.Watermark :
        s == "HEADER_IMG" ? AssetType.HeaderImg :
                            AssetType.FooterImg;

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant, DateTime>
        InstantConv = new(
            v => v.ToDateTimeUtc(),
            v => Instant.FromDateTimeUtc(DateTime.SpecifyKind(v, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant?, DateTime?>
        NullableInstant = new(
            v => v == null ? null : v.Value.ToDateTimeUtc(),
            v => v == null ? null : Instant.FromDateTimeUtc(DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)));
}
