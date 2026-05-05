---
name: xunit-testing
description: xUnit + FluentAssertions + Testcontainers + NSubstitute test patterns for ULP. Use when writing unit tests, integration tests, contract tests, or property-based tests. Covers test naming, AAA pattern, integration testing with real MySQL via Testcontainers. Always write tests in the same PR as the code.
---

# xUnit Testing for ULP

## When this skill triggers
Writing any test - unit, integration, contract, or property-based. ULP test stack: xUnit + FluentAssertions + NSubstitute (mocking) + Testcontainers (real MySQL/Redis/RabbitMQ for integration tests) + FsCheck (property-based).

## Top 3 reference repos
1. **xunit/xunit** (https://github.com/xunit/xunit) - Official. Read `samples/` for fixture patterns.
2. **fluentassertions/fluentassertions** (https://github.com/fluentassertions/fluentassertions) - Authoritative assertion patterns. Read README for collection, exception, and async assertions.
3. **testcontainers/testcontainers-dotnet** (https://github.com/testcontainers/testcontainers-dotnet) - Spins up real MySQL/Redis/RabbitMQ in Docker for integration tests. Critical for ULP.

## Standard test naming and structure
```csharp
public class InvoiceServiceTests
{
    // Pattern: MethodName_Scenario_ExpectedOutcome
    
    [Fact]
    public async Task Approve_BelowAutoApprovalThreshold_AutoApproves()
    {
        // Arrange
        var invoice = new InvoiceBuilder().WithAmount(50_000m).Build();
        var svc = new InvoiceServiceBuilder().WithInvoice(invoice).Build();

        // Act
        await svc.ApproveAsync(invoice.Id, CancellationToken.None);

        // Assert
        invoice.Status.Should().Be(InvoiceStatus.Approved);
        invoice.ApprovedBy.Should().Be("system");
    }

    [Theory]
    [InlineData(499_999, true)]    // just below threshold
    [InlineData(500_000, false)]   // at threshold (rounds DOWN to workflow)
    [InlineData(500_001, false)]   // above threshold
    public async Task Approve_VariousAmounts_RoutesCorrectly(decimal amount, bool autoApproves)
    {
        var invoice = new InvoiceBuilder().WithAmount(amount).Build();
        var workflow = Substitute.For<IWorkflowService>();
        var svc = new InvoiceServiceBuilder().WithInvoice(invoice).WithWorkflow(workflow).Build();

        await svc.ApproveAsync(invoice.Id, CancellationToken.None);

        if (autoApproves) {
            await workflow.DidNotReceive().StartAsync(Arg.Any<string>(), Arg.Any<object>());
            invoice.Status.Should().Be(InvoiceStatus.Approved);
        } else {
            await workflow.Received(1).StartAsync("invoice-approval", Arg.Any<object>());
            invoice.Status.Should().Be(InvoiceStatus.PendingApproval);
        }
    }
}
```

## Builder pattern (mandatory in ULP)
```csharp
public class InvoiceBuilder
{
    private decimal _amount = 100m;
    private string _currency = "INR";
    private InvoiceStatus _status = InvoiceStatus.Draft;
    private Guid _tenantId = Guid.NewGuid();

    public InvoiceBuilder WithAmount(decimal a) { _amount = a; return this; }
    public InvoiceBuilder WithStatus(InvoiceStatus s) { _status = s; return this; }
    public InvoiceBuilder WithTenant(Guid t) { _tenantId = t; return this; }

    public Invoice Build() => new() {
        Id = Guid.NewGuid(),
        TenantId = _tenantId,
        Amount = _amount,
        Currency = _currency,
        Status = _status,
        CreatedAt = DateTimeOffset.UtcNow
    };
}
```

## Integration test with real MySQL via Testcontainers
```csharp
public class M17AccountsDbIntegrationTests : IAsyncLifetime
{
    private MySqlContainer _mysql = null!;
    private M17AccountsDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _mysql = new MySqlBuilder()
            .WithImage("mysql:8.0")
            .WithDatabase("ulp_test")
            .Build();
        await _mysql.StartAsync();

        var opts = new DbContextOptionsBuilder<M17AccountsDbContext>()
            .UseMySql(_mysql.GetConnectionString(), 
                ServerVersion.AutoDetect(_mysql.GetConnectionString()))
            .Options;

        _db = new M17AccountsDbContext(opts, new TestTenantContext());
        await _db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _mysql.DisposeAsync();
    }

    [Fact]
    public async Task SaveInvoice_PersistsAllFields()
    {
        var inv = new InvoiceBuilder().Build();
        _db.Invoices.Add(inv);
        await _db.SaveChangesAsync();

        var fromDb = await _db.Invoices.FindAsync(inv.Id);
        fromDb.Should().BeEquivalentTo(inv);
    }
}
```

## Property-based test (FsCheck)
```csharp
public class GlBalanceTests
{
    [Property]
    public Property Posting_RandomEntries_DebitsAlwaysEqualCredits(NonEmptyArray<JournalEntry> entries)
    {
        var je = JournalEntry.Compose(entries.Get);
        return (Math.Abs(je.TotalDebits - je.TotalCredits) < 0.01m).ToProperty();
    }
}
```

## Gotchas specific to ULP

1. **Test naming MUST be `Method_Scenario_Outcome`** - other patterns rejected in PR review.
2. **Use builder pattern, never raw `new` for entities** - prevents test fragility when entities gain new required fields.
3. **Integration tests use Testcontainers, NOT in-memory provider** - in-memory doesn't support MySQL-specific features (JSON queries, FK constraints).
4. **Mock ONLY direct dependencies** - don't mock `DbContext`. Use Testcontainers for DB tests.
5. **Tests must be deterministic** - no `DateTime.Now`, no `Guid.NewGuid()` outside builders, no random without seed.
6. **Test category attributes**:
   - `[Fact, Trait("Category", "Unit")]` - fast, in-process
   - `[Fact, Trait("Category", "Integration")]` - real DB/broker, slow
   - `[Fact, Trait("Category", "Contract")]` - external API contracts
7. **CI runs Unit on every PR; Integration on merge to main**.

## Test pyramid for ULP
- 70% Unit (fast, isolated)
- 25% Integration (Testcontainers)
- 5% E2E (full stack via Playwright)

## ULP companion docs
- Test strategy: `docs/ULP_DevelopmentGuide_v1.0.docx` Section 4.3


---

## v2.0 ADDENDUM — Multi-Region Test Patterns

The single most important rule in v2.0: **every business-logic test runs at least twice — once with `country_code = "IN"` and once with `country_code = "US"`**. The standard pattern is `[Theory]` + `[InlineData]`.

### Region-aware test pattern (mandatory for any business logic)

```csharp
[Theory]
[InlineData("IN", "INR", "Asia/Kolkata", "en-IN")]
[InlineData("US", "USD", "America/New_York", "en-US")]
public async Task CalculateInvoiceTotal_ProducesCorrectMoney(
    string country, string currency, string tz, string locale)
{
    var tenant = TestTenant.For(country, currency, tz, locale);
    var inv    = await _svc.CalculateAsync(tenant, _sampleLines);
    inv.Total.Currency.Should().Be(currency);
    inv.Total.Amount.Should().BeGreaterThan(0m);
}
```

### When logic genuinely diverges by country
Use separate `[Fact]` per country, named with the country suffix:
```csharp
[Fact] public async Task PostInvoice_GeneratesIrn_IN() { ... }      // IN-specific
[Fact] public async Task PostInvoice_CallsAvalara_US() { ... }      // US-specific
```

### Plugin contract test pattern (mandatory for IComplianceProvider/ITaxProvider/etc.)

Every plugin interface gets ONE shared abstract test suite. Each implementation inherits and runs the same assertions:

```csharp
public abstract class TaxProviderContractTests
{
    protected abstract ITaxProvider CreateProvider();

    [Fact] public async Task ComputeTax_ReturnsNonNegative()         { ... }
    [Fact] public async Task ComputeTax_HonorsExemption()             { ... }
    [Fact] public async Task ComputeTax_RoundsToCurrencyMinor()       { ... }
    [Fact] public async Task ComputeTax_IsIdempotent()                { ... }
    // ~22 shared assertions
}

public sealed class GstTaxProviderTests : TaxProviderContractTests {
    protected override ITaxProvider CreateProvider() => new GstTaxProvider(...);
}

public sealed class AvalaraSalesTaxProviderTests : TaxProviderContractTests {
    protected override ITaxProvider CreateProvider() => new AvalaraSalesTaxProvider(...);
}
```

If `GstTaxProviderTests` passes but `AvalaraSalesTaxProviderTests` fails, the implementation is wrong — the contract is the same.

### Test data builders for IN + US tenants
```csharp
public static class TestTenant
{
    public static TenantContext IN => For("IN", "INR", "Asia/Kolkata", "en-IN");
    public static TenantContext US => For("US", "USD", "America/New_York", "en-US");

    public static TenantContext For(string country, string currency, string tz, string locale)
        => new TenantContextBuilder()
              .WithCountryCode(country)
              .WithCurrencyCode(currency)
              .WithTimezone(tz)
              .WithLocale(locale)
              .Build();
}
```

### What to never do
- A test that runs only against IN tenant context for behaviour that is country-agnostic (Tier-A modules) — must run in both.
- A contract test asserting on IN-only behaviour — that's by definition not a contract test.
- Hardcoding "INR" or "USD" anywhere in test setup — derive from `tenant.CurrencyCode`.
- Testing plugin implementations without exercising the contract test suite.

### CI gate
Coverage threshold: `>= 80% line / >= 70% branch`, AND every business-logic test class must have at least one `[Theory]` with both IN+US `[InlineData]` rows OR explicit per-country `[Fact]`s, OR live in a country-specific test project (`*.IN.Tests` / `*.US.Tests`).

## See also (v2.0)
- `compliance-plugin-pattern` — defines the contracts being tested.
- `multi-region-tenant-context` — provides `ITenantContext` used in test fixtures.
- `money-type-multicurrency` — `Money` assertions instead of `decimal`.
- ULP_TestingStrategy_v2.0.docx — full test strategy reference.
