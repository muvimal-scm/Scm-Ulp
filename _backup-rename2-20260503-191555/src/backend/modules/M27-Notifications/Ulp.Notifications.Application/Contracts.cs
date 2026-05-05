using NodaTime;
using Ulp.Notifications.Domain.Entities;

namespace Ulp.Notifications.Application;

/// <summary>
/// Public notification service. Other modules call <see cref="EnqueueAsync"/>
/// to request a notification; M27 resolves recipients + templates + sends.
/// In Phase 2 this becomes a MassTransit consumer of `NotificationRequested`
/// events; for Phase 1 callers invoke directly.
/// </summary>
public interface INotificationService
{
    Task<string> EnqueueAsync(NotificationRequest req, CancellationToken ct);
    Task<int>    DispatchPendingAsync(CancellationToken ct);     // pulls Queued, sends, updates status

    Task<IReadOnlyList<InboxItemDto>> GetInboxAsync(long userId, bool includeRead, int page, int pageSize, CancellationToken ct);
    Task<bool>   MarkReadAsync(long inboxId, long userId, CancellationToken ct);
    Task<int>    MarkAllReadAsync(long userId, CancellationToken ct);

    Task<IReadOnlyList<PreferenceDto>> GetPreferencesAsync(long userId, CancellationToken ct);
    Task<int>    UpsertPreferenceAsync(long userId, PreferenceDto pref, CancellationToken ct);

    Task<IReadOnlyList<TemplateDto>>   ListTemplatesAsync(string? channel, CancellationToken ct);
    Task<EmailSendTestResult>          SendTestEmailAsync(string to, CancellationToken ct);
}

public sealed record NotificationRequest(
    string SourceModule,
    string SourceEvent,
    long?  SourceEntityId,
    string Category,
    NotificationPriority Priority,
    IReadOnlyDictionary<string, string> Payload,
    IReadOnlyList<RecipientSpec> Recipients,
    string? CorrelationId = null);

public sealed record RecipientSpec(
    long? UserId,
    string? Email,
    string? Phone,
    NotificationChannel Channel,
    string? Locale = null);

public sealed record InboxItemDto(
    long Id, long? NotificationId, string Title, string Body,
    string? LinkUrl, string? Icon, string? Category,
    bool IsRead, Instant? ReadAt, Instant CreatedAt, Instant? ExpiresAt);

public sealed record PreferenceDto(
    string Category, NotificationChannel Channel, bool IsSubscribed, DigestFrequency DigestFrequency);

public sealed record TemplateDto(
    long Id, int? TenantId, string? CountryCode, string Code,
    NotificationChannel Channel, string Locale, string? Subject, bool IsHtml, bool IsActive, int Version);

public sealed record EmailSendTestResult(bool Success, string Provider, string? MessageId, string? Error);
