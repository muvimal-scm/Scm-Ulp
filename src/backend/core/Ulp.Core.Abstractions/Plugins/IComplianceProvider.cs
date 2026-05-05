namespace Ulp.Core.Abstractions.Plugins;

/// <summary>Cross-cutting compliance rules per tenant country.</summary>
public interface IComplianceProvider
{
    Task<ComplianceCheckResult> CheckAsync(ComplianceCheckRequest req, CancellationToken ct);
    Task<bool> SupportsAsync(string country, CancellationToken ct);
}

public sealed record ComplianceCheckRequest(string Country, string EntityKind, string EntityId);

public sealed record ComplianceCheckResult(bool Passed, IReadOnlyList<ComplianceIssue> Issues);

public sealed record ComplianceIssue(string Code, string Message, ComplianceSeverity Severity);

public enum ComplianceSeverity { Info, Warning, Error }
