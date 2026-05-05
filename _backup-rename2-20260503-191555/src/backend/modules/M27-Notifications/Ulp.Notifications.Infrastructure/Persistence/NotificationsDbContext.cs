using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Notifications.Domain.Entities;

namespace Ulp.Notifications.Infrastructure.Persistence;

public sealed class NotificationsDbContext(DbContextOptions<NotificationsDbContext> options) : DbContext(options)
{
    public DbSet<NotificationTemplate> Templates       => Set<NotificationTemplate>();
    public DbSet<RecipientPreference>  Preferences     => Set<RecipientPreference>();
    public DbSet<Notification>         Notifications   => Set<Notification>();
    public DbSet<NotificationRecipient> Recipients     => Set<NotificationRecipient>();
    public DbSet<SendAttempt>          Attempts        => Set<SendAttempt>();
    public DbSet<InAppMessage>         Inbox           => Set<InAppMessage>();
    public DbSet<WebhookEndpoint>      WebhookEndpoints => Set<WebhookEndpoint>();
    public DbSet<WebhookDelivery>      WebhookDeliveries => Set<WebhookDelivery>();
    public DbSet<ProviderConfig>       ProviderConfigs => Set<ProviderConfig>();
    // SCM Milestone 3 â€” auto-notification rules
    public DbSet<NotificationRule>     Rules           => Set<NotificationRule>();
    public DbSet<NotificationRuleRun>  RuleRuns        => Set<NotificationRuleRun>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<NotificationTemplate>(e =>
        {
            e.ToTable("m27_template");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(80);
            e.Property(x => x.Channel).HasColumnName("channel").HasConversion(ChannelToString, StringToChannel).HasMaxLength(10);
            e.Property(x => x.Locale).HasColumnName("locale").HasMaxLength(10);
            e.Property(x => x.Subject).HasColumnName("subject").HasMaxLength(255);
            e.Property(x => x.BodyTemplate).HasColumnName("body_template");
            e.Property(x => x.IsHtml).HasColumnName("is_html");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.Version).HasColumnName("version");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<RecipientPreference>(e =>
        {
            e.ToTable("m27_recipient_preference");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Category).HasColumnName("category").HasMaxLength(50);
            e.Property(x => x.Channel).HasColumnName("channel").HasConversion(ChannelToString, StringToChannel).HasMaxLength(10);
            e.Property(x => x.IsSubscribed).HasColumnName("is_subscribed");
            e.Property(x => x.DigestFrequency).HasColumnName("digest_frequency").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<Notification>(e =>
        {
            e.ToTable("m27_notification");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Ulid).HasColumnName("ulid").HasMaxLength(26).IsFixedLength();
            e.Property(x => x.SourceModule).HasColumnName("source_module").HasMaxLength(10);
            e.Property(x => x.SourceEvent).HasColumnName("source_event").HasMaxLength(80);
            e.Property(x => x.SourceEntityId).HasColumnName("source_entity_id");
            e.Property(x => x.Category).HasColumnName("category").HasMaxLength(50);
            e.Property(x => x.Priority).HasColumnName("priority").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.PayloadJson).HasColumnName("payload").HasColumnType("json");
            e.Property(x => x.CorrelationId).HasColumnName("correlation_id").HasMaxLength(36).IsFixedLength();
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.CompletedAt).HasColumnName("completed_at_utc").HasConversion(NullableInstant);
            e.HasIndex(x => x.Ulid).IsUnique();
        });

        b.Entity<NotificationRecipient>(e =>
        {
            e.ToTable("m27_recipient");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.NotificationId).HasColumnName("notification_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(255);
            e.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(30);
            e.Property(x => x.Channel).HasColumnName("channel").HasConversion(ChannelToString, StringToChannel).HasMaxLength(10);
            e.Property(x => x.Locale).HasColumnName("locale").HasMaxLength(10);
        });

        b.Entity<SendAttempt>(e =>
        {
            e.ToTable("m27_send_attempt");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.RecipientId).HasColumnName("recipient_id");
            e.Property(x => x.AttemptNumber).HasColumnName("attempt_number");
            e.Property(x => x.Provider).HasColumnName("provider").HasMaxLength(50);
            e.Property(x => x.ProviderRef).HasColumnName("provider_ref").HasMaxLength(255);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.ErrorCode).HasColumnName("error_code").HasMaxLength(50);
            e.Property(x => x.ErrorMessage).HasColumnName("error_message");
            e.Property(x => x.AttemptedAt).HasColumnName("attempted_at_utc").HasConversion(InstantConv);
            e.Property(x => x.DeliveredAt).HasColumnName("delivered_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ReadAt).HasColumnName("read_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.CostMicros).HasColumnName("cost_micros");
            e.Property(x => x.CostCurrency).HasColumnName("cost_currency").HasMaxLength(3).IsFixedLength();
        });

        b.Entity<InAppMessage>(e =>
        {
            e.ToTable("m27_in_app_inbox");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.NotificationId).HasColumnName("notification_id");
            e.Property(x => x.Title).HasColumnName("title").HasMaxLength(255);
            e.Property(x => x.Body).HasColumnName("body");
            e.Property(x => x.LinkUrl).HasColumnName("link_url").HasMaxLength(500);
            e.Property(x => x.Icon).HasColumnName("icon").HasMaxLength(50);
            e.Property(x => x.Category).HasColumnName("category").HasMaxLength(50);
            e.Property(x => x.IsRead).HasColumnName("is_read");
            e.Property(x => x.ReadAt).HasColumnName("read_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at_utc").HasConversion(NullableInstant);
        });

        b.Entity<WebhookEndpoint>(e =>
        {
            e.ToTable("m27_webhook_endpoint");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.Url).HasColumnName("url").HasMaxLength(500);
            e.Property(x => x.Secret).HasColumnName("secret").HasMaxLength(64);
            e.Property(x => x.EventFilterJson).HasColumnName("event_filter").HasColumnType("json");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<WebhookDelivery>(e =>
        {
            e.ToTable("m27_webhook_delivery");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EndpointId).HasColumnName("endpoint_id");
            e.Property(x => x.NotificationId).HasColumnName("notification_id");
            e.Property(x => x.AttemptNumber).HasColumnName("attempt_number");
            e.Property(x => x.HttpStatus).HasColumnName("http_status");
            e.Property(x => x.RequestBody).HasColumnName("request_body");
            e.Property(x => x.ResponseBody).HasColumnName("response_body");
            e.Property(x => x.DurationMs).HasColumnName("duration_ms");
            e.Property(x => x.AttemptedAt).HasColumnName("attempted_at_utc").HasConversion(InstantConv);
            e.Property(x => x.NextRetryAt).HasColumnName("next_retry_at_utc").HasConversion(NullableInstant);
        });

        b.Entity<ProviderConfig>(e =>
        {
            e.ToTable("m27_provider_config");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.Channel).HasColumnName("channel").HasConversion(ChannelToString, StringToChannel).HasMaxLength(10);
            e.Property(x => x.Provider).HasColumnName("provider").HasMaxLength(50);
            e.Property(x => x.ConfigEncryptedJson).HasColumnName("config_encrypted").HasColumnType("json");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        // SCM Milestone 3 â€” auto-notification rules
        b.Entity<NotificationRule>(e =>
        {
            e.ToTable("m27_notification_rule");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(50);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.QueryKind).HasColumnName("query_kind").HasConversion(QkToStr, StrToQk).HasMaxLength(30);
            e.Property(x => x.ThresholdDays).HasColumnName("threshold_days");
            e.Property(x => x.Channel).HasColumnName("channel").HasConversion(ChannelToString, StringToChannel).HasMaxLength(10);
            e.Property(x => x.TemplateCode).HasColumnName("template_code").HasMaxLength(80);
            e.Property(x => x.RecipientStrategy).HasColumnName("recipient_strategy").HasConversion(RsToStr, StrToRs).HasMaxLength(20);
            e.Property(x => x.CronExpression).HasColumnName("cron_expression").HasMaxLength(50);
            e.Property(x => x.IsEnabled).HasColumnName("is_enabled");
            e.Property(x => x.LastRunAt).HasColumnName("last_run_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.LastRunStatus).HasColumnName("last_run_status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.LastRunMatchCount).HasColumnName("last_run_match_count");
            e.Property(x => x.LastRunSentCount).HasColumnName("last_run_sent_count");
            e.Property(x => x.LastRunError).HasColumnName("last_run_error");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<NotificationRuleRun>(e =>
        {
            e.ToTable("m27_notification_rule_run");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RuleId).HasColumnName("rule_id");
            e.Property(x => x.StartedAt).HasColumnName("started_at_utc").HasConversion(InstantConv);
            e.Property(x => x.FinishedAt).HasColumnName("finished_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.MatchCount).HasColumnName("match_count");
            e.Property(x => x.SentCount).HasColumnName("sent_count");
            e.Property(x => x.Error).HasColumnName("error");
            e.Property(x => x.TriggeredBy).HasColumnName("triggered_by").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.TriggeredByUserId).HasColumnName("triggered_by_user_id");
        });
    }

    // SCM Milestone 3 enum mappers â€” SCREAMING_SNAKE in DB.
    private static System.Linq.Expressions.Expression<Func<RuleQueryKind, string>> QkToStr => k =>
        k == RuleQueryKind.ShipmentsOnHold          ? "SHIPMENTS_ON_HOLD" :
        k == RuleQueryKind.StatementOfAccount       ? "STATEMENT_OF_ACCOUNT" :
        k == RuleQueryKind.ShipmentsArriving        ? "SHIPMENTS_ARRIVING" :
        k == RuleQueryKind.ContainersNotReturned    ? "CONTAINERS_NOT_RETURNED" :
                                                      "CONTAINERS_READY_FOR_RETURN";
    private static System.Linq.Expressions.Expression<Func<string, RuleQueryKind>> StrToQk => s =>
        s == "SHIPMENTS_ON_HOLD"           ? RuleQueryKind.ShipmentsOnHold :
        s == "STATEMENT_OF_ACCOUNT"        ? RuleQueryKind.StatementOfAccount :
        s == "SHIPMENTS_ARRIVING"          ? RuleQueryKind.ShipmentsArriving :
        s == "CONTAINERS_NOT_RETURNED"     ? RuleQueryKind.ContainersNotReturned :
                                             RuleQueryKind.ContainersReadyForReturn;

    private static System.Linq.Expressions.Expression<Func<RecipientStrategy, string>> RsToStr => r =>
        r == RecipientStrategy.TenantAdmins    ? "TENANT_ADMINS" :
        r == RecipientStrategy.ShipmentOwner   ? "SHIPMENT_OWNER" :
        r == RecipientStrategy.CustomerParty   ? "CUSTOMER_PARTY" :
                                                 "PARTY_FROM_RESULT";
    private static System.Linq.Expressions.Expression<Func<string, RecipientStrategy>> StrToRs => s =>
        s == "TENANT_ADMINS"     ? RecipientStrategy.TenantAdmins :
        s == "SHIPMENT_OWNER"    ? RecipientStrategy.ShipmentOwner :
        s == "CUSTOMER_PARTY"    ? RecipientStrategy.CustomerParty :
                                   RecipientStrategy.PartyFromResult;

    // ENUM('EMAIL','SMS','WHATSAPP','IN_APP','WEBHOOK') â€” explicit string mapping because the C# enum
    // names ('Email','InApp') don't match the DB shorthand.
    private static System.Linq.Expressions.Expression<Func<NotificationChannel, string>> ChannelToString => c =>
        c == NotificationChannel.Email    ? "EMAIL"    :
        c == NotificationChannel.Sms      ? "SMS"      :
        c == NotificationChannel.Whatsapp ? "WHATSAPP" :
        c == NotificationChannel.InApp    ? "IN_APP"   :
                                            "WEBHOOK";

    private static System.Linq.Expressions.Expression<Func<string, NotificationChannel>> StringToChannel => s =>
        s == "EMAIL"    ? NotificationChannel.Email    :
        s == "SMS"      ? NotificationChannel.Sms      :
        s == "WHATSAPP" ? NotificationChannel.Whatsapp :
        s == "IN_APP"   ? NotificationChannel.InApp    :
                          NotificationChannel.Webhook;

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant, DateTime>
        InstantConv = new(
            v => v.ToDateTimeUtc(),
            v => Instant.FromDateTimeUtc(DateTime.SpecifyKind(v, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant?, DateTime?>
        NullableInstant = new(
            v => v == null ? null : v.Value.ToDateTimeUtc(),
            v => v == null ? null : Instant.FromDateTimeUtc(DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)));
}
