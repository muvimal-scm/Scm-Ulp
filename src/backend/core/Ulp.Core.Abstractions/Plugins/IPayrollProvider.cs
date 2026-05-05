using Ulp.Core.Domain.ValueObjects;

namespace Ulp.Core.Abstractions.Plugins;

/// <summary>Payroll computation + statutory filings. IN: PF/ESI/Form 24Q. US: FICA/941/W-2.</summary>
public interface IPayrollProvider
{
    Task<PayrollRunResult> RunAsync(PayrollRunRequest req, CancellationToken ct);
    Task<PayrollFilingResult> FileAsync(PayrollFilingRequest req, CancellationToken ct);
    Task<bool> SupportsAsync(string country, CancellationToken ct);
}

public sealed record PayrollRunRequest(string Country, string Period, IReadOnlyList<EmployeePayInput> Employees);

public sealed record EmployeePayInput(string EmployeeId, Money Gross, IReadOnlyDictionary<string, string> Attributes);

public sealed record PayrollRunResult(IReadOnlyList<EmployeePayLine> Lines);

public sealed record EmployeePayLine(string EmployeeId, Money Gross, Money Net, IReadOnlyList<DeductionLine> Deductions);

public sealed record DeductionLine(string Code, Money Amount);

public sealed record PayrollFilingRequest(string Country, string FormCode, string Period);

public sealed record PayrollFilingResult(string FilingRef, bool Accepted, string? Message);
