---
name: mailhog-acs-email
description: Email patterns for ULP using MailHog (MVP local capture) and Azure Communication Services (production), plus SMS (MSG91/Twilio) and WhatsApp (Gupshup) abstractions. Use when sending invoices, OTPs, order confirmations, password resets, audit reports, or any code in Backend/*/Notifications/. Always use IEmailSender/ISmsSender/IWhatsAppSender abstractions; never inject SMTP or vendor SDKs directly into business code. Covers idempotent send, retry-with-backoff, template management, attachment handling, bounce/delivery webhooks.
---

# Email + SMS + WhatsApp Notifications for ULP

## When this skill triggers
Working on email/SMS/WhatsApp send code, debugging delivery issues, integrating notification templates, configuring SMTP or vendor APIs, or anywhere in `Backend/*/Notifications/`, `Backend/M27.Notifications/*`. Trigger on `IEmailSender`, `ISmsSender`, `MimeMessage`, `MailKit`, `Azure.Communication.Email`.

## Top 3 reference repos
1. **mailhog/MailHog** (https://github.com/mailhog/MailHog) — Official MailHog. Captures all SMTP locally with web UI at http://localhost:8025. Read README for SMTP listening config.
2. **jstedfast/MailKit** (https://github.com/jstedfast/MailKit) — The .NET SMTP client. README has all canonical patterns. Used by MailHog adapter (port 1025) and any SMTP relay.
3. **Azure/azure-sdk-for-net** (https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/communication/Azure.Communication.Email) — Azure Communication Services Email SDK. Read samples for transactional email + bounce handling.

## Critical ULP patterns

### Multi-channel notification abstraction
```csharp
// Backend/Common/Notifications/IEmailSender.cs
public interface IEmailSender
{
    Task<EmailSendResult> SendAsync(EmailMessage msg, CancellationToken ct);
}

public interface ISmsSender
{
    Task<SmsSendResult> SendAsync(SmsMessage msg, CancellationToken ct);
}

public interface IWhatsAppSender
{
    Task<WhatsAppSendResult> SendAsync(WhatsAppMessage msg, CancellationToken ct);
}

public record EmailMessage(
    string To,
    string Subject,
    string HtmlBody,
    string? PlainTextBody = null,
    IReadOnlyList<EmailAttachment>? Attachments = null,
    string? ReplyTo = null,
    string? IdempotencyKey = null);  // mandatory for retries
```

### MVP: MailHog SMTP via MailKit
```csharp
// Backend/Common/Notifications/MailHog/MailHogEmailSender.cs
public class MailHogEmailSender : IEmailSender
{
    private readonly EmailOptions _opts;
    private readonly ILogger<MailHogEmailSender> _logger;

    public async Task<EmailSendResult> SendAsync(EmailMessage msg, CancellationToken ct)
    {
        var mime = new MimeMessage();
        mime.From.Add(MailboxAddress.Parse(_opts.FromAddress));
        mime.To.Add(MailboxAddress.Parse(msg.To));
        mime.Subject = msg.Subject;
        if (!string.IsNullOrEmpty(msg.IdempotencyKey))
            mime.MessageId = msg.IdempotencyKey;

        var builder = new BodyBuilder
        {
            HtmlBody = msg.HtmlBody,
            TextBody = msg.PlainTextBody ?? StripHtml(msg.HtmlBody)
        };
        foreach (var att in msg.Attachments ?? Array.Empty<EmailAttachment>())
            builder.Attachments.Add(att.FileName, att.Content, ContentType.Parse(att.ContentType));

        mime.Body = builder.ToMessageBody();

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(_opts.Host, _opts.Port, MailKit.Security.SecureSocketOptions.None, ct);
        await smtp.SendAsync(mime, ct);
        await smtp.DisconnectAsync(true, ct);

        _logger.LogInformation("Email sent via MailHog: {MessageId} -> {To}", mime.MessageId, msg.To);
        return new EmailSendResult(true, mime.MessageId, null);
    }
}
```

### Production: Azure Communication Services
```csharp
// Backend/Common/Notifications/Acs/AcsEmailSender.cs
public class AcsEmailSender : IEmailSender
{
    private readonly EmailClient _client;
    private readonly EmailOptions _opts;

    public async Task<EmailSendResult> SendAsync(EmailMessage msg, CancellationToken ct)
    {
        var emailMsg = new Azure.Communication.Email.EmailMessage(
            senderAddress: _opts.FromAddress,
            recipients: new EmailRecipients(new[] { new EmailAddress(msg.To) }),
            content: new EmailContent(msg.Subject)
            {
                Html = msg.HtmlBody,
                PlainText = msg.PlainTextBody ?? StripHtml(msg.HtmlBody)
            });
        if (!string.IsNullOrEmpty(msg.ReplyTo))
            emailMsg.ReplyTo.Add(new EmailAddress(msg.ReplyTo));
        foreach (var att in msg.Attachments ?? Array.Empty<EmailAttachment>())
            emailMsg.Attachments.Add(new EmailAttachment(att.FileName, att.ContentType, BinaryData.FromBytes(att.Content)));

        var operation = await _client.SendAsync(WaitUntil.Completed, emailMsg, ct);
        return new EmailSendResult(
            Success: operation.Value.Status == EmailSendStatus.Succeeded,
            ProviderMessageId: operation.Id,
            Error: operation.Value.Error?.Message);
    }
}
```

### SMS: MSG91 (India) primary, Twilio (international) fallback
```csharp
// Backend/Common/Notifications/Sms/Msg91SmsSender.cs
public class Msg91SmsSender : ISmsSender
{
    private readonly HttpClient _http;
    private readonly SmsOptions _opts;

    public async Task<SmsSendResult> SendAsync(SmsMessage msg, CancellationToken ct)
    {
        // MSG91 Flow API for transactional templates (DLT-registered)
        var payload = new
        {
            template_id = msg.DltTemplateId,
            sender = _opts.SenderId,            // 6-char DLT-approved
            short_url = "0",
            recipients = new[]
            {
                new
                {
                    mobiles = msg.ToE164.TrimStart('+'),  // "919876543210"
                    var1 = msg.Variables.GetValueOrDefault("var1"),
                    var2 = msg.Variables.GetValueOrDefault("var2"),
                }
            }
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://control.msg91.com/api/v5/flow/");
        req.Headers.Add("authkey", _opts.AuthKey);
        req.Content = JsonContent.Create(payload);
        var resp = await _http.SendAsync(req, ct);
        var body = await resp.Content.ReadAsStringAsync(ct);
        return new SmsSendResult(resp.IsSuccessStatusCode, body, null);
    }
}
```

### Idempotent send with outbox pattern
```csharp
// Backend/M27.Notifications/Services/NotificationDispatcher.cs
// MUST use outbox to ensure exactly-once-ish delivery
public class NotificationDispatcher
{
    public async Task DispatchAsync(NotificationOutboxRecord rec, CancellationToken ct)
    {
        // Idempotency: provider message ID stored on success; skip if already sent
        if (rec.Status == NotificationStatus.Sent) return;

        try
        {
            var result = rec.Channel switch
            {
                NotificationChannel.Email => await _email.SendAsync(BuildEmail(rec), ct),
                NotificationChannel.Sms   => await _sms.SendAsync(BuildSms(rec), ct),
                NotificationChannel.WhatsApp => await _whatsApp.SendAsync(BuildWa(rec), ct),
                _ => throw new InvalidOperationException()
            };

            if (result.Success)
            {
                rec.Status = NotificationStatus.Sent;
                rec.ProviderMessageId = result.ProviderMessageId;
                rec.SentAt = DateTimeOffset.UtcNow;
            }
            else
            {
                rec.RetryCount++;
                rec.LastError = result.Error;
                rec.Status = rec.RetryCount >= 5 ? NotificationStatus.Failed : NotificationStatus.Pending;
            }
        }
        catch (Exception ex) when (rec.RetryCount < 5)
        {
            rec.RetryCount++;
            rec.LastError = ex.Message;
            rec.Status = NotificationStatus.Pending;
        }
    }
}
```

## Critical gotchas

### India SMS DLT compliance (mandatory)
- All transactional SMS to Indian numbers MUST use DLT-registered template + sender ID.
- Without DLT: SMS gets blocked by telecom operators within seconds.
- Register sender ID + each template ID on https://www.trai.gov.in (MSG91/Gupshup walk you through).
- Validate: `RuleFor(x => x.SenderId).Length(6).Matches("^[A-Z0-9]{6}$")`.

### WhatsApp Business via Gupshup
- WhatsApp Business templates require approval from Meta (24-72 hour review).
- Cannot send free-form messages to users who haven't messaged you in last 24h - must use approved template.
- DLT registration also applies for India.

### Email FROM address
- Production ACS: must verify sender domain in Azure portal (DNS TXT records).
- Use `noreply@<env>.ulp.com` for transactional; `support@ulp.com` for replies.

### Attachments - size limits
- ACS: 10 MB total per email.
- MailHog: no limit (it's local).
- For invoices >5MB: use pre-signed URL link instead of attachment.

### Bounce handling
- ACS sends bounce events to a configured Event Grid topic.
- Subscribe via webhook to update `notification_outbox.status = 'Bounced'`.
- After 3 bounces to same address: mark contact as `email_undeliverable = true`, stop sending.

### Email rendering
- Always include plain-text fallback (`PlainTextBody`).
- HTML emails should use inline CSS (Outlook strips `<style>` tags).
- Test with major clients: Gmail web/mobile, Outlook desktop, iOS Mail.

### MVP -> Production migration
- MVP: `Email:Provider=MailHog Email:Host=localhost Email:Port=1025`
- Prod: `Email:Provider=AzureCommunicationServices Email:ConnectionString=<KV>`
- Code change: NONE — DI swaps `IEmailSender` impl.
- Migration test: send to test mailbox, verify delivery + DKIM/SPF pass.

### Rate limits
- ACS: 10 RPS default; can increase via support ticket.
- MSG91: 100 RPS on standard plans.
- Use `Polly` rate limiter on `IEmailSender` registration.

## ULP companion docs
- ULP_LLD_M27_v1.0_Notifications.docx (when exists)
- ULP_HLD_v1.0_HighLevelDesign.docx Section 7 (Cross-cutting - notifications)
- ULP_DevelopmentGuide_v1.0.docx Section 6.2 (MVP -> Prod migration)
