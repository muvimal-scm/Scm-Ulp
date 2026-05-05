namespace Ulp.Core.Abstractions.Notifications;

/// <summary>
/// Email egress abstraction. MailHog (SMTP) in dev, Azure Communication Services in prod.
/// Per .claude/skills/mailhog-acs-email/SKILL.md — never call SMTP/ACS SDK from business code.
/// </summary>
public interface IEmailSender
{
    /// <summary>Send an email. Returns provider message id (MailHog returns synthetic id).</summary>
    Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken ct = default);
}

public sealed record EmailMessage(
    string From,
    string FromName,
    IReadOnlyList<string> To,
    string Subject,
    string Body,
    bool IsHtml = false,
    IReadOnlyList<string>? Cc = null,
    IReadOnlyList<string>? Bcc = null,
    string? ReplyTo = null,
    IReadOnlyDictionary<string, string>? Headers = null);

public sealed record EmailSendResult(string MessageId, string Provider, bool Success, string? Error = null);
