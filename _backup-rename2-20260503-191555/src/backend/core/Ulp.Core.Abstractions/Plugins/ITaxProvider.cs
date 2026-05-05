using Ulp.Core.Domain.ValueObjects;

namespace Ulp.Core.Abstractions.Plugins;

/// <summary>Country tax computation + filing. IN: GST. US: Sales Tax (Avalara), 1099.</summary>
public interface ITaxProvider
{
    Task<TaxResult> ComputeAsync(TaxRequest req, CancellationToken ct);
    Task<TaxFilingResult> FileReturnAsync(TaxFilingRequest req, CancellationToken ct);
    Task<bool> SupportsAsync(string country, CancellationToken ct);
}

public sealed record TaxRequest(
    string Country,
    Money Amount,
    string CustomerId,
    IReadOnlyList<TaxLineInput> Lines,
    string? StateCode);

public sealed record TaxLineInput(string ItemCode, Money LineAmount, string? HsnCode);

public sealed record TaxResult(Money Total, IReadOnlyList<TaxLine> Lines, string ProviderRef);

public sealed record TaxLine(string Code, decimal Rate, Money Amount);

public sealed record TaxFilingRequest(string Country, string Period, IReadOnlyList<string> InvoiceIds);

public sealed record TaxFilingResult(string FilingRef, bool Accepted, string? Message);
