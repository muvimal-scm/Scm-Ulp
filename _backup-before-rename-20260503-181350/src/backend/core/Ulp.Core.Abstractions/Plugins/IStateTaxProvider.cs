using Ulp.Core.Domain.ValueObjects;

namespace Ulp.Core.Abstractions.Plugins;

/// <summary>
/// State-level tax with state-specific rules.
/// IN: Profession Tax. US: 50-state SUTA + sales-tax variations.
/// </summary>
public interface IStateTaxProvider
{
    Task<StateTaxResult> ComputeAsync(StateTaxRequest req, CancellationToken ct);
    Task<bool> SupportsAsync(string country, string stateCode, CancellationToken ct);
}

public sealed record StateTaxRequest(string Country, string StateCode, Money Amount, string TaxKind);

public sealed record StateTaxResult(Money Tax, decimal Rate, string ProviderRef);
