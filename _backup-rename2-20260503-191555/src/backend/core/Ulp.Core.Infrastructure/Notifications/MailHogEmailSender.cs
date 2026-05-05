using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Ulp.Core.Abstractions.Notifications;

namespace Ulp.Core.Infrastructure.Notifications;

/// <summary>
/// MailHog adapter — plain SMTP to localhost:1025 (no auth, no TLS) per
/// .claude/skills/mailhog-acs-email/SKILL.md. Production swap: AzureCommunicationServicesEmailSender.
/// </summary>
public sealed class MailHogEmailSender(
    IOptions<MailOptions> opts,
    ILogger<MailHogEmailSender> log) : IEmailSender
{
    private readonly MailOptions _opts = opts.Value;
    private readonly ILogger<MailHogEmailSender> _log = log;

    public async Task<EmailSendResult> SendAsync(EmailMessage m, CancellationToken ct)
    {
        try
        {
            using var client = new SmtpClient(_opts.Host, _opts.Port)
            {
                Credentials = string.IsNullOrEmpty(_opts.Username) ? null : new NetworkCredential(_opts.Username, _opts.Password),
                EnableSsl   = _opts.UseSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
            };

            using var msg = new MailMessage
            {
                From       = new MailAddress(m.From, m.FromName),
                Subject    = m.Subject,
                Body       = m.Body,
                IsBodyHtml = m.IsHtml,
            };
            foreach (var to in m.To)        msg.To.Add(to);
            if (m.Cc is not null)  foreach (var cc in m.Cc)   msg.CC.Add(cc);
            if (m.Bcc is not null) foreach (var bcc in m.Bcc) msg.Bcc.Add(bcc);
            if (!string.IsNullOrEmpty(m.ReplyTo)) msg.ReplyToList.Add(m.ReplyTo);
            if (m.Headers is not null)
                foreach (var kv in m.Headers) msg.Headers.Add(kv.Key, kv.Value);

            await client.SendMailAsync(msg, ct);

            // MailHog assigns its own ID via the Message-ID header; not returned by SmtpClient.
            // Synthesize one so the audit row has something to reference.
            var msgId = $"mailhog-{Guid.NewGuid():N}";
            _log.LogInformation("Sent email via MailHog to {ToCount} recipient(s) subject='{Subject}' msgId={MsgId}",
                m.To.Count, m.Subject, msgId);
            return new EmailSendResult(msgId, "MailHog", Success: true);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "MailHog send failed subject='{Subject}'", m.Subject);
            return new EmailSendResult("", "MailHog", Success: false, Error: ex.Message);
        }
    }
}

/// <summary>Bound to <c>Mail</c> section of appsettings.json.</summary>
public sealed class MailOptions
{
    public string Provider { get; set; } = "MailHog";
    public string Host     { get; set; } = "localhost";
    public int    Port     { get; set; } = 1025;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public bool   UseSsl   { get; set; } = false;
    public string DefaultFrom     { get; set; } = "noreply@ulp.local";
    public string DefaultFromName { get; set; } = "ULP Notifications";
}

public static class EmailRegistration
{
    public static IServiceCollection AddMailHogEmail(this IServiceCollection services, IConfiguration cfg)
    {
        services.Configure<MailOptions>(cfg.GetSection("Mail"));
        services.AddSingleton<IEmailSender, MailHogEmailSender>();
        return services;
    }
}
