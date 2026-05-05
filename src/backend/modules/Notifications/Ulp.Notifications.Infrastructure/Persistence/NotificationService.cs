using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NodaTime;
using Ulp.Core.Abstractions.Notifications;
using Ulp.Core.Domain.Tenancy;
using Ulp.Notifications.Application;
using Ulp.Notifications.Domain.Entities;

namespace Ulp.Notifications.Infrastructure.Persistence;

/// <summary>
/// Phase 1 INotificationService â€” synchronous send via IEmailSender for EMAIL,
/// in-app fan-out for IN_APP. SMS/WhatsApp/Webhook channels are persisted as
/// recipients but their dispatch is deferred to Phase 2 (provider connectors
/// not yet wired). Outbox-via-MassTransit becomes a swap-in here too.
/// </summary>
public sealed class NotificationService(
    NotificationsDbContext db,
    IEmailSender email,
    ITenantContext tenant,
    IClock clock,
    ILogger<NotificationService> log) : INotificationService
{
    public async Task<string> EnqueueAsync(NotificationRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var ulid = global::System.Ulid.NewUlid().ToString();
        var now = clock.GetCurrentInstant();

        var notif = new Notification
        {
            TenantId       = tenantId,
            Ulid           = ulid,
            SourceModule   = req.SourceModule,
            SourceEvent    = req.SourceEvent,
            SourceEntityId = req.SourceEntityId,
            Category       = req.Category,
            Priority       = req.Priority,
            PayloadJson    = JsonSerializer.Serialize(req.Payload),
            CorrelationId  = req.CorrelationId,
            CreatedAt      = now,
            Status         = NotificationStatus.Queued,
        };
        db.Notifications.Add(notif);
        await db.SaveChangesAsync(ct);

        foreach (var r in req.Recipients)
        {
            db.Recipients.Add(new NotificationRecipient
            {
                TenantId       = tenantId,
                NotificationId = notif.Id,
                UserId         = r.UserId,
                Email          = r.Email,
                Phone          = r.Phone,
                Channel        = r.Channel,
                Locale         = r.Locale,
            });
        }
        await db.SaveChangesAsync(ct);
        return ulid;
    }

    public async Task<int> DispatchPendingAsync(CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var batch = await db.Notifications
            .Where(n => n.TenantId == tenantId && n.Status == NotificationStatus.Queued)
            .OrderBy(n => n.CreatedAt).Take(50).ToListAsync(ct);

        var sent = 0;
        foreach (var n in batch)
        {
            n.Status = NotificationStatus.Processing;
            await db.SaveChangesAsync(ct);

            var recipients = await db.Recipients.Where(r => r.NotificationId == n.Id).ToListAsync(ct);
            var payload    = JsonSerializer.Deserialize<Dictionary<string, string>>(n.PayloadJson) ?? new();

            foreach (var r in recipients)
            {
                try { await DispatchOneAsync(n, r, payload, ct); sent++; }
                catch (Exception ex) { log.LogError(ex, "send failed notif={Ulid} recipient={RecipId}", n.Ulid, r.Id); }
            }

            n.Status      = NotificationStatus.Completed;
            n.CompletedAt = clock.GetCurrentInstant();
            await db.SaveChangesAsync(ct);
        }
        return sent;
    }

    private async Task DispatchOneAsync(Notification n, NotificationRecipient r, IDictionary<string, string> payload, CancellationToken ct)
    {
        var attempt = new SendAttempt
        {
            TenantId      = n.TenantId,
            RecipientId   = r.Id,
            AttemptNumber = 1,
            Provider      = "stub",
            Status        = SendStatus.Pending,
            AttemptedAt   = clock.GetCurrentInstant(),
        };

        if (r.Channel == NotificationChannel.InApp && r.UserId.HasValue)
        {
            var (subject, body) = await ResolveAndRenderAsync(n, r, payload, ct);
            db.Inbox.Add(new InAppMessage
            {
                TenantId       = n.TenantId,
                UserId         = r.UserId.Value,
                NotificationId = n.Id,
                Title          = subject ?? n.SourceEvent,
                Body           = body,
                Category       = n.Category,
                CreatedAt      = clock.GetCurrentInstant(),
            });
            attempt.Provider = "in-app";
            attempt.Status   = SendStatus.Delivered;
            attempt.DeliveredAt = clock.GetCurrentInstant();
        }
        else if (r.Channel == NotificationChannel.Email && !string.IsNullOrEmpty(r.Email))
        {
            var (subject, body) = await ResolveAndRenderAsync(n, r, payload, ct);
            var result = await email.SendAsync(new EmailMessage(
                From: "noreply@ulp.local",
                FromName: "ULP",
                To: new[] { r.Email },
                Subject: subject ?? "(no subject)",
                Body: body,
                IsHtml: true), ct);
            attempt.Provider    = result.Provider;
            attempt.ProviderRef = result.MessageId;
            attempt.Status      = result.Success ? SendStatus.Sent : SendStatus.Failed;
            attempt.ErrorMessage = result.Error;
            if (result.Success) attempt.DeliveredAt = clock.GetCurrentInstant();
        }
        else
        {
            // SMS/WhatsApp/Webhook â€” Phase 2 provider connectors. Mark deferred.
            attempt.Provider     = "deferred";
            attempt.Status       = SendStatus.Failed;
            attempt.ErrorCode    = "phase2";
            attempt.ErrorMessage = $"channel {r.Channel} not yet wired";
        }

        db.Attempts.Add(attempt);
        await db.SaveChangesAsync(ct);
    }

    private async Task<(string? subject, string body)> ResolveAndRenderAsync(
        Notification n, NotificationRecipient r, IDictionary<string, string> payload, CancellationToken ct)
    {
        var locale  = r.Locale ?? tenant.Locale;
        var country = tenant.CountryCode.Value;
        var t = await db.Templates.AsNoTracking().FirstOrDefaultAsync(x =>
            x.Code == n.SourceEvent && x.Channel == r.Channel && x.IsActive
            && x.Locale == locale
            && (x.TenantId == n.TenantId || x.TenantId == null)
            && (x.CountryCode == country || x.CountryCode == null), ct);

        if (t is null)
            return (n.SourceEvent, JsonSerializer.Serialize(payload));

        return (Render(t.Subject, payload), Render(t.BodyTemplate, payload));
    }

    private static string Render(string? template, IDictionary<string, string> vars)
    {
        if (string.IsNullOrEmpty(template)) return "";
        // {{var}} substitution. No conditionals/loops in Phase 1 â€” Scriban arrives in Phase 2.
        return Regex.Replace(template, @"\{\{(\w+)\}\}", m =>
            vars.TryGetValue(m.Groups[1].Value, out var v) ? v : m.Value);
    }

    /* ---------- read-side ---------- */

    public async Task<IReadOnlyList<InboxItemDto>> GetInboxAsync(long userId, bool includeRead, int page, int pageSize, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var q = db.Inbox.AsNoTracking().Where(i => i.TenantId == tenantId && i.UserId == userId);
        if (!includeRead) q = q.Where(i => !i.IsRead);
        var p = Math.Max(page, 1);
        var ps = pageSize is <= 0 or > 200 ? 50 : pageSize;
        var rows = await q.OrderByDescending(i => i.CreatedAt).Skip((p - 1) * ps).Take(ps).ToListAsync(ct);
        return rows.Select(i => new InboxItemDto(
            i.Id, i.NotificationId, i.Title, i.Body, i.LinkUrl, i.Icon, i.Category,
            i.IsRead, i.ReadAt, i.CreatedAt, i.ExpiresAt)).ToList();
    }

    public async Task<bool> MarkReadAsync(long inboxId, long userId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var rows = await db.Inbox.Where(i => i.Id == inboxId && i.TenantId == tenantId && i.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.IsRead, true).SetProperty(i => i.ReadAt, clock.GetCurrentInstant()), ct);
        return rows > 0;
    }

    public async Task<int> MarkAllReadAsync(long userId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        return await db.Inbox.Where(i => i.TenantId == tenantId && i.UserId == userId && !i.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.IsRead, true).SetProperty(i => i.ReadAt, clock.GetCurrentInstant()), ct);
    }

    public async Task<IReadOnlyList<PreferenceDto>> GetPreferencesAsync(long userId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var rows = await db.Preferences.AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.UserId == userId).ToListAsync(ct);
        return rows.Select(p => new PreferenceDto(p.Category, p.Channel, p.IsSubscribed, p.DigestFrequency)).ToList();
    }

    public async Task<int> UpsertPreferenceAsync(long userId, PreferenceDto pref, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var now = clock.GetCurrentInstant();
        var existing = await db.Preferences.FirstOrDefaultAsync(p =>
            p.TenantId == tenantId && p.UserId == userId
            && p.Category == pref.Category && p.Channel == pref.Channel, ct);
        if (existing is null)
        {
            db.Preferences.Add(new RecipientPreference
            {
                TenantId = tenantId, UserId = userId,
                Category = pref.Category, Channel = pref.Channel,
                IsSubscribed = pref.IsSubscribed, DigestFrequency = pref.DigestFrequency,
                CreatedAt = now, ModifiedAt = now,
            });
            await db.SaveChangesAsync(ct);
            return 1;
        }
        existing.IsSubscribed    = pref.IsSubscribed;
        existing.DigestFrequency = pref.DigestFrequency;
        existing.ModifiedAt      = now;
        await db.SaveChangesAsync(ct);
        return 0;
    }

    public async Task<IReadOnlyList<TemplateDto>> ListTemplatesAsync(string? channel, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var q = db.Templates.AsNoTracking().Where(t => t.TenantId == tenantId || t.TenantId == null);
        if (Enum.TryParse<NotificationChannel>(channel, ignoreCase: true, out var ch))
            q = q.Where(t => t.Channel == ch);
        var rows = await q.OrderBy(t => t.Code).ThenBy(t => t.Locale).ToListAsync(ct);
        return rows.Select(t => new TemplateDto(t.Id, t.TenantId, t.CountryCode, t.Code,
            t.Channel, t.Locale, t.Subject, t.IsHtml, t.IsActive, t.Version)).ToList();
    }

    public async Task<EmailSendTestResult> SendTestEmailAsync(string to, CancellationToken ct)
    {
        var result = await email.SendAsync(new EmailMessage(
            From: "noreply@ulp.local",
            FromName: "ULP Test",
            To: new[] { to },
            Subject: "ULP test email",
            Body: $"<p>This is a test from ULP M27 at {clock.GetCurrentInstant()}.</p>",
            IsHtml: true), ct);
        return new EmailSendTestResult(result.Success, result.Provider, result.MessageId, result.Error);
    }
}
