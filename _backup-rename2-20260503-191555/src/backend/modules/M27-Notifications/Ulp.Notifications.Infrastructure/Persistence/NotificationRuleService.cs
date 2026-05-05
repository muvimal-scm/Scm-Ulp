using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NodaTime;
using Ulp.Core.Abstractions.Notifications;
using Ulp.Core.Domain.Tenancy;
using Ulp.Notifications.Application;
using Ulp.Notifications.Domain.Entities;

namespace Ulp.Notifications.Infrastructure.Persistence;

/// <summary>
/// SCM Milestone 3 â€” auto-notification rules.
///
/// Phase-1 implementation:
///   - List / get / toggle rules per tenant.
///   - On-demand `RunRuleAsync` executes the rule synchronously, persists a
///     run record, updates `LastRun*` summary fields on the rule, and dispatches
///     emails via the existing IEmailSender to a tenant-wide mailbox.
///
/// Phase-1 limitation honestly flagged:
///   The rule's "match query" against m5_shipment / m5_container is currently
///   a STUB returning a deterministic count derived from the rule code so the
///   UI/email loop is verifiable end-to-end. Real predicates (`shipments with
///   eta &lt;= today + N`, `containers gated_out > today - 5d`, etc.) are a
///   follow-up that requires either a cross-module read interface from M5 or
///   raw queries against the m5_* tables. Both are deferred to Phase 5
///   when the production scheduler also lands.
/// </summary>
public sealed class NotificationRuleService(
    NotificationsDbContext db,
    IEmailSender email,
    ITenantContext tenant,
    IClock clock,
    ILogger<NotificationRuleService> log) : INotificationRuleService
{
    private int Tid => int.Parse(tenant.TenantId.Value);

    public async Task<IReadOnlyList<RuleDto>> ListRulesAsync(CancellationToken ct)
    {
        var rows = await db.Rules.AsNoTracking()
            .Where(r => r.TenantId == Tid)
            .OrderBy(r => r.Code)
            .ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<RuleDto?> GetRuleAsync(long id, CancellationToken ct)
    {
        var r = await db.Rules.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        return r is null ? null : ToDto(r);
    }

    public async Task<RuleDto> ToggleRuleAsync(long id, bool enabled, CancellationToken ct)
    {
        var r = await db.Rules.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"rule {id} not found");
        r.IsEnabled = enabled;
        r.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return ToDto(r);
    }

    public async Task<IReadOnlyList<RuleRunDto>> ListRunsAsync(long ruleId, int page, int pageSize, CancellationToken ct)
    {
        var p = Math.Max(page, 1);
        var ps = pageSize is <= 0 or > 100 ? 25 : pageSize;
        // Tenant-scope via the rule join.
        var ruleExists = await db.Rules.AsNoTracking().AnyAsync(x => x.Id == ruleId && x.TenantId == Tid, ct);
        if (!ruleExists) return Array.Empty<RuleRunDto>();
        var rows = await db.RuleRuns.AsNoTracking()
            .Where(r => r.RuleId == ruleId)
            .OrderByDescending(r => r.StartedAt)
            .Skip((p - 1) * ps).Take(ps).ToListAsync(ct);
        return rows.Select(r => new RuleRunDto(
            r.Id, r.RuleId, r.StartedAt, r.FinishedAt, r.Status,
            r.MatchCount, r.SentCount, r.Error, r.TriggeredBy, r.TriggeredByUserId)).ToList();
    }

    public async Task<RuleRunResultDto> RunRuleAsync(long id, RuleRunTrigger trigger, long? triggeredByUserId, CancellationToken ct)
    {
        var rule = await db.Rules.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"rule {id} not found");

        var startedAt = clock.GetCurrentInstant();
        var run = new NotificationRuleRun
        {
            RuleId = rule.Id, StartedAt = startedAt,
            Status = RuleRunStatus.Running,
            TriggeredBy = trigger, TriggeredByUserId = triggeredByUserId,
        };
        db.RuleRuns.Add(run);
        await db.SaveChangesAsync(ct);

        var status = RuleRunStatus.Success;
        string? errorMsg = null;
        var matchCount = 0;
        var sentCount = 0;

        try
        {
            // STUB matcher â€” returns a small deterministic count so the loop
            // exercises both the persistence layer and the email pipeline. Real
            // predicates against m5_* deferred per the class doc.
            matchCount = StubMatchCount(rule.QueryKind, rule.ThresholdDays);

            if (matchCount > 0 && rule.Channel == NotificationChannel.Email)
            {
                // Tenant-admin mailbox for now; PARTY_FROM_RESULT/CUSTOMER_PARTY
                // would loop per match in the real implementation.
                var to      = $"ops+tenant{Tid}@example.test";
                var subject = $"[ULP] {rule.Name} â€” {matchCount} item(s) flagged";
                var body    = BuildEmailBody(rule, matchCount);
                var msg     = new EmailMessage(
                    From: "noreply@ulp.local", FromName: "ULP Auto-Notify",
                    To: new[] { to }, Subject: subject, Body: body, IsHtml: true);
                var result  = await email.SendAsync(msg, ct);
                sentCount = result.Success ? 1 : 0;
                if (!result.Success) errorMsg = result.Error;
            }
            else if (rule.Channel != NotificationChannel.Email)
            {
                // Non-email channels not wired in Phase 1; still mark success but 0 sent.
                log.LogInformation("Rule {Code} channel {Channel} skipped (no provider in Phase 1)", rule.Code, rule.Channel);
            }
        }
        catch (Exception ex)
        {
            status   = RuleRunStatus.Failed;
            errorMsg = ex.Message;
            log.LogError(ex, "Rule {Code} run failed", rule.Code);
        }

        var finishedAt = clock.GetCurrentInstant();
        run.Status      = status;
        run.MatchCount  = matchCount;
        run.SentCount   = sentCount;
        run.Error       = errorMsg;
        run.FinishedAt  = finishedAt;

        rule.LastRunAt          = finishedAt;
        rule.LastRunStatus      = status;
        rule.LastRunMatchCount  = matchCount;
        rule.LastRunSentCount   = sentCount;
        rule.LastRunError       = errorMsg;
        rule.ModifiedAt         = finishedAt;

        await db.SaveChangesAsync(ct);
        return new RuleRunResultDto(rule.Id, run.Id, status, matchCount, sentCount, errorMsg, finishedAt);
    }

    /// <summary>
    /// PHASE 1 STUB. Returns a deterministic per-rule-kind count so the rest
    /// of the pipeline (persistence + email send + UI roll-up) is testable
    /// end-to-end. Replace with real m5_* / m17_* queries in Phase 5.
    /// </summary>
    private static int StubMatchCount(RuleQueryKind kind, int? thresholdDays) => kind switch
    {
        RuleQueryKind.ShipmentsOnHold          => 2,
        RuleQueryKind.StatementOfAccount       => 7,    // 7 customers with outstanding A/R
        RuleQueryKind.ShipmentsArriving        => 4,
        RuleQueryKind.ContainersNotReturned    => 1,
        RuleQueryKind.ContainersReadyForReturn => 3,
        _                                      => 0,
    };

    private static string BuildEmailBody(NotificationRule r, int matchCount)
    {
        var threshold = r.ThresholdDays.HasValue ? $" (threshold: {r.ThresholdDays.Value} days)" : "";
        return $$"""
            <html><body style="font-family:system-ui;color:#1A1A33;">
            <h2 style="color:#3F2D7C;margin:0 0 8px;">{{r.Name}}</h2>
            <p style="color:#6B5BA0;margin:0 0 16px;">{{r.Description}}{{threshold}}</p>
            <p>This rule flagged <strong>{{matchCount}}</strong> item(s) for review.</p>
            <p>Open the SCMCube Control Tower for details and to action each item.</p>
            <p style="color:#9A9AA3;font-size:11px;margin-top:32px;">Rule code: {{r.Code}} Â· sent by ULP auto-notification engine.</p>
            </body></html>
            """;
    }

    private static RuleDto ToDto(NotificationRule r) => new(
        r.Id, r.Code, r.Name, r.Description,
        r.QueryKind, r.ThresholdDays,
        r.Channel, r.TemplateCode,
        r.RecipientStrategy, r.CronExpression,
        r.IsEnabled,
        r.LastRunAt, r.LastRunStatus,
        r.LastRunMatchCount, r.LastRunSentCount, r.LastRunError);
}
