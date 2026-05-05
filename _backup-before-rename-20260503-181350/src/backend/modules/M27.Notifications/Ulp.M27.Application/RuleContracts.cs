using NodaTime;
using Ulp.M27.Domain.Entities;

namespace Ulp.M27.Application;

/// <summary>
/// SCM Milestone 3 — auto-notification rules.
/// Phase-1: rules can be listed, toggled, and run-on-demand.
/// Phase-5: a Hangfire scheduler will fire `RunAsync` on cron triggers; the
/// service contract stays the same, only the trigger source changes.
/// </summary>
public interface INotificationRuleService
{
    Task<IReadOnlyList<RuleDto>>      ListRulesAsync(CancellationToken ct);
    Task<RuleDto?>                    GetRuleAsync(long id, CancellationToken ct);
    Task<RuleRunResultDto>            RunRuleAsync(long id, RuleRunTrigger trigger, long? triggeredByUserId, CancellationToken ct);
    Task<RuleDto>                     ToggleRuleAsync(long id, bool enabled, CancellationToken ct);
    Task<IReadOnlyList<RuleRunDto>>   ListRunsAsync(long ruleId, int page, int pageSize, CancellationToken ct);
}

public sealed record RuleDto(
    long Id, string Code, string Name, string? Description,
    RuleQueryKind QueryKind, int? ThresholdDays,
    NotificationChannel Channel, string? TemplateCode,
    RecipientStrategy RecipientStrategy, string? CronExpression,
    bool IsEnabled,
    Instant? LastRunAt, RuleRunStatus? LastRunStatus,
    int? LastRunMatchCount, int? LastRunSentCount, string? LastRunError);

public sealed record RuleRunDto(
    long Id, long RuleId, Instant StartedAt, Instant? FinishedAt,
    RuleRunStatus Status, int? MatchCount, int? SentCount,
    string? Error, RuleRunTrigger TriggeredBy, long? TriggeredByUserId);

public sealed record RuleRunResultDto(
    long RuleId, long RunId, RuleRunStatus Status,
    int MatchCount, int SentCount, string? Error, Instant FinishedAt);
