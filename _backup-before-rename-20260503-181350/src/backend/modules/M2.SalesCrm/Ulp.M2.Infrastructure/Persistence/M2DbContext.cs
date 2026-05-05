using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.M2.Domain.Entities;

namespace Ulp.M2.Infrastructure.Persistence;

public sealed class M2DbContext(DbContextOptions<M2DbContext> options) : DbContext(options)
{
    public DbSet<Lead>             Leads      => Set<Lead>();
    public DbSet<Opportunity>      Opps       => Set<Opportunity>();
    public DbSet<Activity>         Activities => Set<Activity>();
    public DbSet<Campaign>         Campaigns  => Set<Campaign>();
    public DbSet<CampaignTarget>   Targets    => Set<CampaignTarget>();
    public DbSet<RfqRequest>       Rfqs       => Set<RfqRequest>();
    public DbSet<RfqLine>          RfqLines   => Set<RfqLine>();
    public DbSet<RfqResponse>      RfqResponses => Set<RfqResponse>();
    public DbSet<QuoteLink>        QuoteLinks => Set<QuoteLink>();
    public DbSet<PipelineStage>    Stages     => Set<PipelineStage>();
    public DbSet<ForecastSnapshot> Forecasts  => Set<ForecastSnapshot>();
    public DbSet<M2Audit>          Audits     => Set<M2Audit>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Lead>(e =>
        {
            e.ToTable("m2_lead");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.LeadNumber).HasColumnName("lead_number").HasMaxLength(50);
            e.Property(x => x.Source).HasColumnName("source").HasConversion(SourceToStr, StrToSource).HasMaxLength(20);
            e.Property(x => x.ContactName).HasColumnName("contact_name").HasMaxLength(150);
            e.Property(x => x.CompanyName).HasColumnName("company_name").HasMaxLength(200);
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(255);
            e.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(30);
            e.Property(x => x.Industry).HasColumnName("industry").HasMaxLength(100);
            e.Property(x => x.EstimatedVolume).HasColumnName("estimated_volume").HasMaxLength(100);
            e.Property(x => x.Stage).HasColumnName("stage").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.OwnerUserId).HasColumnName("owner_user_id");
            e.Property(x => x.ConvertedPartyId).HasColumnName("converted_party_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<Opportunity>(e =>
        {
            e.ToTable("m2_opportunity");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.OppNumber).HasColumnName("opp_number").HasMaxLength(50);
            e.Property(x => x.PartyId).HasColumnName("party_id");
            e.Property(x => x.Title).HasColumnName("title").HasMaxLength(255);
            e.Property(x => x.EstimatedValue).HasColumnName("estimated_value").HasPrecision(18, 4);
            e.Property(x => x.EstimatedCurrency).HasColumnName("estimated_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.ExpectedClose).HasColumnName("expected_close").HasConversion(NullableLocalDate);
            e.Property(x => x.ProbabilityPct).HasColumnName("probability_pct").HasPrecision(5, 2);
            e.Property(x => x.Stage).HasColumnName("stage").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.OwnerUserId).HasColumnName("owner_user_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<Activity>(e =>
        {
            e.ToTable("m2_activity");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.RelatedTo).HasColumnName("related_to").HasConversion(RelToStr, StrToRel).HasMaxLength(10);
            e.Property(x => x.RelatedId).HasColumnName("related_id");
            e.Property(x => x.ActivityType).HasColumnName("activity_type").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Subject).HasColumnName("subject").HasMaxLength(255);
            e.Property(x => x.OccurredAt).HasColumnName("occurred_at_utc").HasConversion(InstantConv);
            e.Property(x => x.OwnerUserId).HasColumnName("owner_user_id");
            e.Property(x => x.DetailsJson).HasColumnName("details").HasColumnType("json");
        });

        b.Entity<Campaign>(e =>
        {
            e.ToTable("m2_campaign");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(200);
            e.Property(x => x.Channel).HasColumnName("channel").HasConversion(ChannelToStr, StrToChannel).HasMaxLength(15);
            e.Property(x => x.AudienceFilterJson).HasColumnName("audience_filter").HasColumnType("json");
            e.Property(x => x.TemplateCode).HasColumnName("template_code").HasMaxLength(80);
            e.Property(x => x.ScheduledAt).HasColumnName("scheduled_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.SentCount).HasColumnName("sent_count");
            e.Property(x => x.DeliveredCount).HasColumnName("delivered_count");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<CampaignTarget>(e =>
        {
            e.ToTable("m2_campaign_target");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CampaignId).HasColumnName("campaign_id");
            e.Property(x => x.PartyId).HasColumnName("party_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.SentAt).HasColumnName("sent_at_utc").HasConversion(NullableInstant);
        });

        b.Entity<RfqRequest>(e =>
        {
            e.ToTable("m2_rfq_request");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.RfqNumber).HasColumnName("rfq_number").HasMaxLength(50);
            e.Property(x => x.PartyId).HasColumnName("party_id");
            e.Property(x => x.RequestedAt).HasColumnName("requested_at_utc").HasConversion(InstantConv);
            e.Property(x => x.DueDate).HasColumnName("due_date").HasConversion(NullableLocalDate);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Notes).HasColumnName("notes");
        });

        b.Entity<RfqLine>(e =>
        {
            e.ToTable("m2_rfq_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RfqRequestId).HasColumnName("rfq_request_id");
            e.Property(x => x.LineNumber).HasColumnName("line_number");
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
            e.Property(x => x.Quantity).HasColumnName("quantity").HasPrecision(12, 4);
            e.Property(x => x.UomCode).HasColumnName("uom_code").HasMaxLength(10);
        });

        b.Entity<RfqResponse>(e =>
        {
            e.ToTable("m2_rfq_response");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RfqRequestId).HasColumnName("rfq_request_id");
            e.Property(x => x.VendorPartyId).HasColumnName("vendor_party_id");
            e.Property(x => x.ResponseAmount).HasColumnName("response_amount").HasPrecision(18, 4);
            e.Property(x => x.ResponseCurrency).HasColumnName("response_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.ValidUntil).HasColumnName("valid_until").HasConversion(NullableLocalDate);
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.ReceivedAt).HasColumnName("received_at_utc").HasConversion(InstantConv);
            e.Property(x => x.IsWinner).HasColumnName("is_winner");
        });

        b.Entity<QuoteLink>(e =>
        {
            e.ToTable("m2_quote_link");
            e.HasKey(x => new { x.QuoteId, x.OpportunityId });
            e.Property(x => x.QuoteId).HasColumnName("quote_id");
            e.Property(x => x.OpportunityId).HasColumnName("opportunity_id");
        });

        b.Entity<PipelineStage>(e =>
        {
            e.ToTable("m2_pipeline_stage");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(30);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(100);
            e.Property(x => x.Sequence).HasColumnName("sequence");
            e.Property(x => x.DefaultProbabilityPct).HasColumnName("default_probability_pct").HasPrecision(5, 2);
        });

        b.Entity<ForecastSnapshot>(e =>
        {
            e.ToTable("m2_forecast_snapshot");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.OwnerUserId).HasColumnName("owner_user_id");
            e.Property(x => x.Period).HasColumnName("period").HasMaxLength(20);
            e.Property(x => x.SnapshotJson).HasColumnName("snapshot_json").HasColumnType("json");
            e.Property(x => x.TakenAt).HasColumnName("taken_at_utc").HasConversion(InstantConv);
        });

        b.Entity<M2Audit>(e =>
        {
            e.ToTable("m2_audit");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EntityType).HasColumnName("entity_type").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.EntityId).HasColumnName("entity_id");
            e.Property(x => x.Action).HasColumnName("action").HasMaxLength(50);
            e.Property(x => x.PerformedBy).HasColumnName("performed_by");
            e.Property(x => x.PerformedAt).HasColumnName("performed_at_utc").HasConversion(InstantConv);
            e.Property(x => x.DetailsJson).HasColumnName("details").HasColumnType("json");
        });
    }

    /* ===== explicit enum converters where SQL ENUM != C# ToString() ===== */

    // ENUM('WEB','REFERRAL','COLD_CALL','EVENT','PARTNER','EXISTING_CUSTOMER','OTHER')
    private static System.Linq.Expressions.Expression<Func<LeadSource, string>> SourceToStr => s =>
        s == LeadSource.Web              ? "WEB" :
        s == LeadSource.Referral         ? "REFERRAL" :
        s == LeadSource.ColdCall         ? "COLD_CALL" :
        s == LeadSource.Event            ? "EVENT" :
        s == LeadSource.Partner          ? "PARTNER" :
        s == LeadSource.ExistingCustomer ? "EXISTING_CUSTOMER" :
                                           "OTHER";

    private static System.Linq.Expressions.Expression<Func<string, LeadSource>> StrToSource => s =>
        s == "WEB"               ? LeadSource.Web :
        s == "REFERRAL"          ? LeadSource.Referral :
        s == "COLD_CALL"         ? LeadSource.ColdCall :
        s == "EVENT"             ? LeadSource.Event :
        s == "PARTNER"           ? LeadSource.Partner :
        s == "EXISTING_CUSTOMER" ? LeadSource.ExistingCustomer :
                                   LeadSource.Other;

    // ENUM('LEAD','OPP','PARTY')
    private static System.Linq.Expressions.Expression<Func<RelatedTo, string>> RelToStr => r =>
        r == RelatedTo.Lead  ? "LEAD" :
        r == RelatedTo.Opp   ? "OPP" :
                               "PARTY";

    private static System.Linq.Expressions.Expression<Func<string, RelatedTo>> StrToRel => s =>
        s == "LEAD"  ? RelatedTo.Lead :
        s == "OPP"   ? RelatedTo.Opp :
                       RelatedTo.Party;

    // ENUM('EMAIL','SMS','WHATSAPP')
    private static System.Linq.Expressions.Expression<Func<CampaignChannel, string>> ChannelToStr => c =>
        c == CampaignChannel.Email    ? "EMAIL" :
        c == CampaignChannel.Sms      ? "SMS" :
                                        "WHATSAPP";

    private static System.Linq.Expressions.Expression<Func<string, CampaignChannel>> StrToChannel => s =>
        s == "EMAIL" ? CampaignChannel.Email :
        s == "SMS"   ? CampaignChannel.Sms :
                       CampaignChannel.Whatsapp;

    /* ===== shared NodaTime converters ===== */

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant, DateTime>
        InstantConv = new(
            v => v.ToDateTimeUtc(),
            v => Instant.FromDateTimeUtc(DateTime.SpecifyKind(v, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant?, DateTime?>
        NullableInstant = new(
            v => v == null ? null : v.Value.ToDateTimeUtc(),
            v => v == null ? null : Instant.FromDateTimeUtc(DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<LocalDate?, DateTime?>
        NullableLocalDate = new(
            v => v == null ? null : new DateTime(v.Value.Year, v.Value.Month, v.Value.Day),
            v => v == null ? null : new LocalDate(v.Value.Year, v.Value.Month, v.Value.Day));
}
