using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.VendorManagement.Domain.Entities;

namespace Ulp.VendorManagement.Infrastructure.Persistence;

public sealed class VendorManagementDbContext(DbContextOptions<VendorManagementDbContext> options) : DbContext(options)
{
    public DbSet<Vendor>            Vendors    => Set<Vendor>();
    public DbSet<VendorCategory>    Categories => Set<VendorCategory>();
    public DbSet<VendorServiceOffering> Services => Set<VendorServiceOffering>();
    public DbSet<Agreement>         Agreements => Set<Agreement>();
    public DbSet<OnboardingStep>    OnboardingSteps => Set<OnboardingStep>();
    public DbSet<PerformanceScore>  Scores     => Set<PerformanceScore>();
    public DbSet<Ncr>               Ncrs       => Set<Ncr>();
    public DbSet<VendorContact>     Contacts   => Set<VendorContact>();
    public DbSet<VendorAudit>       Audits     => Set<VendorAudit>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Vendor>(e =>
        {
            e.ToTable("m3_vendor");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.PartyId).HasColumnName("party_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.VendorCode).HasColumnName("vendor_code").HasMaxLength(50);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(25);
            e.Property(x => x.OnboardingStartedAt).HasColumnName("onboarding_started_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ActivatedAt).HasColumnName("activated_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.PreferredLanguage).HasColumnName("preferred_language").HasMaxLength(10);
            e.Property(x => x.TdsApplicable).HasColumnName("tds_applicable");
            e.Property(x => x.TdsSection).HasColumnName("tds_section").HasMaxLength(20);
            e.Property(x => x.IsMsme).HasColumnName("is_msme");
            e.Property(x => x.MsmeUdyamNumber).HasColumnName("msme_udyam_number").HasMaxLength(50);
            e.Property(x => x.Is1099Reportable).HasColumnName("is_1099_reportable");
            e.Property(x => x.W9OnFile).HasColumnName("w9_on_file");
            e.Property(x => x.RiskTier).HasColumnName("risk_tier").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.SanctionsClear).HasColumnName("sanctions_clear");
            e.Property(x => x.SanctionsCheckedAt).HasColumnName("sanctions_checked_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<VendorCategory>(e =>
        {
            e.ToTable("m3_vendor_category");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.Category).HasColumnName("category").HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.IsPrimary).HasColumnName("is_primary");
        });

        b.Entity<VendorServiceOffering>(e =>
        {
            e.ToTable("m3_vendor_service");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.ServiceCode).HasColumnName("service_code").HasMaxLength(50);
            e.Property(x => x.ServiceName).HasColumnName("service_name").HasMaxLength(150);
            e.Property(x => x.ModuleCode).HasColumnName("module_code").HasMaxLength(10);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.IsActive).HasColumnName("is_active");
        });

        b.Entity<Agreement>(e =>
        {
            e.ToTable("m3_agreement");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.AgreementType).HasColumnName("agreement_type").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.AgreementNumber).HasColumnName("agreement_number").HasMaxLength(80);
            e.Property(x => x.Title).HasColumnName("title").HasMaxLength(255);
            e.Property(x => x.StartDate).HasColumnName("start_date").HasConversion(LocalDateConv);
            e.Property(x => x.EndDate).HasColumnName("end_date").HasConversion(NullableLocalDate);
            e.Property(x => x.AutoRenewal).HasColumnName("auto_renewal");
            e.Property(x => x.RenewalNoticeDays).HasColumnName("renewal_notice_days");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.SignedAt).HasColumnName("signed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<OnboardingStep>(e =>
        {
            e.ToTable("m3_onboarding_step");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.StepCode).HasColumnName("step_code").HasMaxLength(50);
            e.Property(x => x.StepName).HasColumnName("step_name").HasMaxLength(150);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Required).HasColumnName("required");
            e.Property(x => x.ResultJson).HasColumnName("result_json").HasColumnType("json");
            e.Property(x => x.PerformedBy).HasColumnName("performed_by");
            e.Property(x => x.PerformedAt).HasColumnName("performed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.Notes).HasColumnName("notes");
        });

        b.Entity<PerformanceScore>(e =>
        {
            e.ToTable("m3_performance_score");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.PeriodStart).HasColumnName("period_start").HasConversion(LocalDateConv);
            e.Property(x => x.PeriodEnd).HasColumnName("period_end").HasConversion(LocalDateConv);
            e.Property(x => x.OnTimeDeliveryPct).HasColumnName("on_time_delivery_pct").HasPrecision(5, 2);
            e.Property(x => x.QualityScore).HasColumnName("quality_score").HasPrecision(5, 2);
            e.Property(x => x.SlaBreachCount).HasColumnName("sla_breach_count");
            e.Property(x => x.NcrCount).HasColumnName("ncr_count");
            e.Property(x => x.InvoiceDisputeCount).HasColumnName("invoice_dispute_count");
            e.Property(x => x.OverallScore).HasColumnName("overall_score").HasPrecision(5, 2);
            e.Property(x => x.Rating).HasColumnName("rating").HasConversion<string>().HasMaxLength(1);
            e.Property(x => x.ComputedAt).HasColumnName("computed_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ComputedBy).HasColumnName("computed_by").HasConversion<string>().HasMaxLength(7);
            e.Property(x => x.Notes).HasColumnName("notes");
        });

        b.Entity<Ncr>(e =>
        {
            e.ToTable("m3_ncr");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.NcrNumber).HasColumnName("ncr_number").HasMaxLength(50);
            e.Property(x => x.RaisedAt).HasColumnName("raised_at_utc").HasConversion(InstantConv);
            e.Property(x => x.RaisedBy).HasColumnName("raised_by");
            e.Property(x => x.RelatedModule).HasColumnName("related_module").HasMaxLength(10);
            e.Property(x => x.RelatedEntityId).HasColumnName("related_entity_id");
            e.Property(x => x.Severity).HasColumnName("severity").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.Category).HasColumnName("category").HasMaxLength(80);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.RootCause).HasColumnName("root_cause");
            e.Property(x => x.CorrectiveAction).HasColumnName("corrective_action");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(25);
            e.Property(x => x.ClosedAt).HasColumnName("closed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ClosedBy).HasColumnName("closed_by");
        });

        b.Entity<VendorContact>(e =>
        {
            e.ToTable("m3_vendor_contact");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.ContactRole).HasColumnName("contact_role").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(150);
            e.Property(x => x.Designation).HasColumnName("designation").HasMaxLength(100);
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(255);
            e.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(30);
            e.Property(x => x.Language).HasColumnName("language").HasMaxLength(10);
            e.Property(x => x.IsPrimary).HasColumnName("is_primary");
            e.Property(x => x.IsActive).HasColumnName("is_active");
        });

        b.Entity<VendorAudit>(e =>
        {
            e.ToTable("m3_vendor_audit");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.Action).HasColumnName("action").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.PerformedBy).HasColumnName("performed_by");
            e.Property(x => x.PerformedAt).HasColumnName("performed_at_utc").HasConversion(InstantConv);
            e.Property(x => x.DetailsJson).HasColumnName("details").HasColumnType("json");
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

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<LocalDate, DateTime>
        LocalDateConv = new(
            v => new DateTime(v.Year, v.Month, v.Day),
            v => new LocalDate(v.Year, v.Month, v.Day));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<LocalDate?, DateTime?>
        NullableLocalDate = new(
            v => v == null ? null : new DateTime(v.Value.Year, v.Value.Month, v.Value.Day),
            v => v == null ? null : new LocalDate(v.Value.Year, v.Value.Month, v.Value.Day));
}
