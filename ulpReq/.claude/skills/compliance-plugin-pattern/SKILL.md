---
name: compliance-plugin-pattern
description: ULP v2.0 Compliance Plugin Pattern — IComplianceProvider, ITaxProvider, ICustomsProvider, IBankingProvider, IPayrollProvider, IIdentifierValidator, IStateTaxProvider. Use whenever country-specific behaviour is needed (GST vs Sales Tax, NACH vs ACH, GSTIN vs EIN, IRN vs e-file 1099). Core code calls the interface; the IN-Plugin and US-Plugin packages provide implementations resolved by tenant.country_code via DI. NEVER write `if (country == "IN")` in core — that's the smell this skill prevents.
---

# Compliance Plugin Pattern for ULP v2.0

## When this skill triggers
Any time module logic depends on country-specific rules: tax computation, customs filing, banking format, payroll withholding, identifier validation (PAN/EIN/SSN/GSTIN), regulatory document numbering. The pattern is mandatory for Tier-B modules (M4, M13, M17, M19, M20, M22, M24) and required for any new behaviour that diverges between IN and US.

## Top 3 reference repos
1. **dotnet/runtime** (https://github.com/dotnet/runtime) — DI container patterns; `Microsoft.Extensions.DependencyInjection.Abstractions` for interface registration.
2. **App-vNext/Polly** (https://github.com/App-vNext/Polly) — example of named-strategy DI resolution that we mirror for plugins.
3. **dotnet/aspnetcore** (https://github.com/dotnet/aspnetcore) — `Options` and `Keyed Services` (.NET 8) patterns we use for tenant-scoped resolution.

## The seven plugin interfaces
| Interface | Purpose | IN Implementation | US Implementation |
|---|---|---|---|
| `IComplianceProvider` | Cross-cutting compliance rules per tenant country | `IndiaComplianceProvider` | `UsComplianceProvider` |
| `ITaxProvider` | Tax computation on a transaction | `GstTaxProvider` | `AvalaraSalesTaxProvider` |
| `ICustomsProvider` | Customs filing | `CHACustomsProvider` (ICEGATE/SCMTR/DGFT) | `CbpAbiCustomsProvider` (CBP ABI/AES/ISF) |
| `IBankingProvider` | Bank file format + remittance | `NachBankingProvider` (NACH/IMPS/RTGS/UPI) | `AchBankingProvider` (NACHA/Plaid/BAI2) |
| `IPayrollProvider` | Payroll computation + statutory filings | `IndiaPayrollProvider` (PF/ESI/Form 24Q) | `UsPayrollProvider` (FICA/941/W-2) |
| `IIdentifierValidator` | Validate country-specific IDs | `IndiaIdValidator` (PAN/GSTIN/Aadhaar) | `UsIdValidator` (EIN/SSN/ITIN) |
| `IStateTaxProvider` | State-level tax with state-specific rules | `IndiaStateTaxProvider` (Prof Tax) | `UsStateTaxProvider` (50-state SUTA) |

## Standard interface shape

```csharp
// Core defines the contract; lives in ULP.Core.Plugins
public interface ITaxProvider
{
    Task<TaxResult> ComputeAsync(TaxRequest req, CancellationToken ct);
    Task<TaxFilingResult> FileReturnAsync(TaxFilingRequest req, CancellationToken ct);
    Task<bool> SupportsAsync(string country, CancellationToken ct);
}

public sealed record TaxRequest(
    string Country,           // "IN" | "US"
    Money Amount,             // Money type — never bare decimal
    string CustomerId,
    IReadOnlyList<TaxLineInput> Lines,
    string? StateCode);       // US: "CA"; IN: "29" (Karnataka)

public sealed record TaxResult(
    Money Total,
    IReadOnlyList<TaxLine> Lines,
    string ProviderRef);
```

## Tenant-scoped DI resolution (the core trick)

```csharp
// In Startup.cs / Program.cs of the host service
builder.Services.AddKeyedScoped<ITaxProvider, GstTaxProvider>("IN");
builder.Services.AddKeyedScoped<ITaxProvider, AvalaraSalesTaxProvider>("US");

// Resolver — called per request after tenant context established
builder.Services.AddScoped<ITaxProvider>(sp =>
{
    var tenant = sp.GetRequiredService<ITenantContext>();
    return sp.GetRequiredKeyedService<ITaxProvider>(tenant.CountryCode);
});
```

Now any call site simply asks for `ITaxProvider` and receives the right implementation:

```csharp
public class InvoicePostingService(ITaxProvider tax, ITenantContext tenant)
{
    public async Task<Invoice> PostAsync(InvoiceDraft d, CancellationToken ct)
    {
        // No `if` on country. Plugin is already the right one for this tenant.
        var taxResult = await tax.ComputeAsync(
            new TaxRequest(tenant.CountryCode, d.Subtotal, d.CustomerId, d.Lines, d.StateCode),
            ct);
        // ...
    }
}
```

## DO and DON'T

| DO | DON'T |
|---|---|
| Define small, cohesive interfaces in `ULP.Core.Plugins` | Don't put implementation details in the interface |
| Implement `IN-Plugin` and `US-Plugin` in separate NuGet packages | Don't merge plugin code into core |
| Resolve via keyed DI per request | Don't `if (country == "IN")` in core code |
| Write contract tests once, run against every implementation | Don't duplicate tests per country |
| Honour the `Money` type for any monetary input/output | Don't pass bare `decimal` for money |
| Pass `country_code` only at the resolver edge; downstream uses interface | Don't propagate country_code into business logic |

## Plugin contract test pattern (mandatory)

```csharp
public abstract class TaxProviderContractTests
{
    protected abstract ITaxProvider CreateProvider();

    [Fact] public async Task Compute_ReturnsNonNegative() { ... }
    [Fact] public async Task Compute_HonorsExemption() { ... }
    [Fact] public async Task Compute_RoundsToCurrencyMinor() { ... }
    [Fact] public async Task File_IsIdempotent() { ... }
    // ~22 shared assertions per interface
}

public sealed class GstTaxProviderTests : TaxProviderContractTests {
    protected override ITaxProvider CreateProvider() => new GstTaxProvider(...);
}

public sealed class AvalaraSalesTaxProviderTests : TaxProviderContractTests {
    protected override ITaxProvider CreateProvider() => new AvalaraSalesTaxProvider(...);
}
```

Both implementations must pass the same assertions. If one fails, the contract is wrong or the implementation is broken — never both true.

## Adding a new plugin (process)
1. Define / extend the interface in `ULP.Core.Plugins` (semantic versioning).
2. Add contract tests covering the new behaviour.
3. Implement in IN-Plugin and US-Plugin (or only the relevant one if behaviour is country-specific).
4. Register in DI for the country code(s).
5. Update the ADR if the plugin contract changes (this is an ADR-level decision).
6. Update Vendor Integration Catalog if the plugin wraps a third-party (Avalara, Plaid, etc.).

## Common smells (review-time gates)
- `if (tenant.CountryCode == "IN")` in core code → reject, push behind interface.
- `decimal taxAmount` parameter → reject, use `Money`.
- Plugin reaching into core DbContext → reject, plugin should only know its own provider boundary.
- Contract test only asserting on IN behaviour → reject, contract test is shared by definition.
- Hardcoded GSTIN/EIN regex anywhere outside `IIdentifierValidator` → reject, route through validator.

## See also
- `multi-region-tenant-context` — for tenant context resolution details.
- `money-type-multicurrency` — for the `Money` type used in every plugin signature.
- `xunit-testing` — for the contract test runner pattern.
