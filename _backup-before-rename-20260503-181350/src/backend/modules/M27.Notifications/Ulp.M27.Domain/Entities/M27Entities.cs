using NodaTime;

namespace Ulp.M27.Domain.Entities;

// LLD §3.1
public sealed class NotificationTemplate
{
    public long Id { get; set; }
    public int? TenantId { get; set; }              // null = system default
    public string? CountryCode { get; set; }
    public string Code { get; set; } = "";
    public NotificationChannel Channel { get; set; }
    public string Locale { get; set; } = "en-IN";
    public string? Subject { get; set; }
    public string BodyTemplate { get; set; } = "";
    public bool IsHtml { get; set; }
    public bool IsActive { get; set; } = true;
    public int Version { get; set; } = 1;
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum NotificationChannel { Email, Sms, Whatsapp, InApp, Webhook }

// LLD §3.2
public sealed class RecipientPreference
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long UserId { get; set; }
    public string Category { get; set; } = "";
    public NotificationChannel Channel { get; set; }
    public bool IsSubscribed { get; set; } = true;
    public DigestFrequency DigestFrequency { get; set; } = DigestFrequency.Immediate;
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}
public enum DigestFrequency { Immediate, Hourly, Daily, Weekly, Off }

// LLD §3.3
public sealed class Notification
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string Ulid { get; set; } = "";
    public string SourceModule { get; set; } = "";
    public string SourceEvent { get; set; } = "";
    public long? SourceEntityId { get; set; }
    public string Category { get; set; } = "";
    public NotificationPriority Priority { get; set; } = NotificationPriority.Normal;
    public string PayloadJson { get; set; } = "{}";
    public string? CorrelationId { get; set; }
    public Instant CreatedAt { get; set; }
    public NotificationStatus Status { get; set; } = NotificationStatus.Queued;
    public Instant? CompletedAt { get; set; }
}
public enum NotificationPriority { Low, Normal, High, Urgent }
public enum NotificationStatus { Queued, Processing, Completed, Failed, Cancelled }

// LLD §3.4
public sealed class NotificationRecipient
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long NotificationId { get; set; }
    public long? UserId { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public NotificationChannel Channel { get; set; }
    public string? Locale { get; set; }
}

// LLD §3.5
public sealed class SendAttempt
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long RecipientId { get; set; }
    public int AttemptNumber { get; set; }
    public string Provider { get; set; } = "";
    public string? ProviderRef { get; set; }
    public SendStatus Status { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public Instant AttemptedAt { get; set; }
    public Instant? DeliveredAt { get; set; }
    public Instant? ReadAt { get; set; }
    public long? CostMicros { get; set; }
    public string? CostCurrency { get; set; }
}
public enum SendStatus { Pending, Sent, Delivered, Bounced, Failed, Read }

// LLD §3.6
public sealed class InAppMessage
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long UserId { get; set; }
    public long? NotificationId { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string? LinkUrl { get; set; }
    public string? Icon { get; set; }
    public string? Category { get; set; }
    public bool IsRead { get; set; }
    public Instant? ReadAt { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant? ExpiresAt { get; set; }
}

// LLD §3.7
public sealed class WebhookEndpoint
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string Name { get; set; } = "";
    public string Url { get; set; } = "";
    public string Secret { get; set; } = "";
    public string EventFilterJson { get; set; } = "[]";
    public bool IsActive { get; set; } = true;
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

// LLD §3.8
public sealed class WebhookDelivery
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long EndpointId { get; set; }
    public long NotificationId { get; set; }
    public int AttemptNumber { get; set; }
    public short? HttpStatus { get; set; }
    public string? RequestBody { get; set; }
    public string? ResponseBody { get; set; }
    public int? DurationMs { get; set; }
    public Instant AttemptedAt { get; set; }
    public Instant? NextRetryAt { get; set; }
}

// LLD §3.9
public sealed class ProviderConfig
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string? CountryCode { get; set; }
    public NotificationChannel Channel { get; set; }
    public string Provider { get; set; } = "";
    public string ConfigEncryptedJson { get; set; } = "{}";
    public bool IsActive { get; set; } = true;
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

// =====================================================================
// SCM Milestone 3 — auto-notification rules.
// Schema: m27_notification_rule + m27_notification_rule_run.
// Phase 1: triggered on demand via API. Phase 5: Hangfire reads
// `cron_expression` and fires the same handler.
// =====================================================================
public sealed class NotificationRule
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    Code { get; set; } = "";
    public string    Name { get; set; } = "";
    public string?   Description { get; set; }
    public RuleQueryKind QueryKind { get; set; }
    public int?      ThresholdDays { get; set; }
    public NotificationChannel Channel { get; set; } = NotificationChannel.Email;
    public string?   TemplateCode { get; set; }
    public RecipientStrategy RecipientStrategy { get; set; } = RecipientStrategy.TenantAdmins;
    public string?   CronExpression { get; set; }
    public bool      IsEnabled { get; set; } = true;
    public Instant?  LastRunAt { get; set; }
    public RuleRunStatus? LastRunStatus { get; set; }
    public int?      LastRunMatchCount { get; set; }
    public int?      LastRunSentCount { get; set; }
    public string?   LastRunError { get; set; }
    public Instant   CreatedAt { get; set; }
    public Instant   ModifiedAt { get; set; }
}

public sealed class NotificationRuleRun
{
    public long      Id { get; set; }
    public long      RuleId { get; set; }
    public Instant   StartedAt { get; set; }
    public Instant?  FinishedAt { get; set; }
    public RuleRunStatus Status { get; set; } = RuleRunStatus.Running;
    public int?      MatchCount { get; set; }
    public int?      SentCount { get; set; }
    public string?   Error { get; set; }
    public RuleRunTrigger TriggeredBy { get; set; } = RuleRunTrigger.Manual;
    public long?     TriggeredByUserId { get; set; }
}

public enum RuleQueryKind
{
    ShipmentsOnHold,
    StatementOfAccount,
    ShipmentsArriving,
    ContainersNotReturned,
    ContainersReadyForReturn,
}

public enum RecipientStrategy
{
    TenantAdmins,
    ShipmentOwner,
    CustomerParty,
    PartyFromResult,
}

public enum RuleRunStatus    { Running, Success, PartialFailure, Failed }
public enum RuleRunTrigger   { Scheduler, Manual, Api }
