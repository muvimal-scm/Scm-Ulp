---
name: us-payroll-fica-w2-941
description: ULP v2.0 US payroll — W-4 federal withholding, FICA (SS + Medicare), FUTA, SUTA per state, 941 quarterly + 940 annual employer returns, W-2 + 1095-C + 1094-C year-end, ACA ALE tracking, I-9 + E-Verify employment eligibility. Use when implementing M20-US Payroll workflows. Implements IPayrollProvider for US tenants. Parallel to indian-accounts-period-close payroll for IN. Tax tables refresh annually with IRS Pub 15-T.
---

# US Payroll — FICA / W-2 / 941 / ACA for ULP v2.0

## When this skill triggers
Implementing US payroll computation, withholding, year-end statements, and employer tax filings. Module M20-US.

## Top 3 reference repos
1. **IRS Publication 15-T** (https://www.irs.gov/pub/irs-pdf/p15t.pdf) — Federal income-tax withholding tables (refreshed annually). Authoritative.
2. **IRS Publication 15** (Circular E) (https://www.irs.gov/pub/irs-pdf/p15.pdf) — Employer's tax guide; FICA/FUTA rates and rules.
3. **moov-io/wire** + state-specific portal docs — There's no canonical US payroll OSS reference; treat IRS publications as the spec.

## Tax stack overview

| Tax | Who pays | Rate (2026 — verify annually) | Wage base |
|---|---|---|---|
| Federal income tax | Employee | Per IRS Pub 15-T tables | All wages |
| Social Security (FICA-OASDI) | Both | 6.2% each | Up to $168,600 (2024 — verify) |
| Medicare (FICA-HI) | Both | 1.45% each | All wages |
| Additional Medicare | Employee only | 0.9% | Wages > $200k single / $250k joint |
| FUTA (federal unemployment) | Employer | 6.0% (with credit for SUTA, net 0.6%) | First $7,000 |
| SUTA (state unemployment) | Employer | Varies per state | Varies per state |
| State income tax | Employee | Per state | Per state |
| Local income tax (where applicable) | Employee | Per locality | Per locality |

**Tax tables refresh annually.** ULP loads new tables every January from IRS Pub 15-T.

## IPayrollProvider implementation outline (US)

```csharp
public sealed class UsPayrollProvider : IPayrollProvider
{
    private readonly IFedWithholdingEngine _fed;
    private readonly IFicaEngine _fica;
    private readonly IStateWithholdingEngine _state;
    private readonly ISutaEngine _suta;
    private readonly IFutaEngine _futa;
    private readonly ILogger<UsPayrollProvider> _log;

    public async Task<PayrollRunResult> ComputeRunAsync(PayrollRun run, CancellationToken ct)
    {
        var lines = new List<PayrollLine>();
        foreach (var emp in run.Employees)
        {
            var gross    = ComputeGross(emp, run.PeriodStart, run.PeriodEnd);
            var fed      = _fed.Compute(gross, emp.W4);
            var fica     = _fica.Compute(gross, emp.YtdWages);
            var state    = _state.Compute(gross, emp.State, emp.StateWithholdingForm);
            var local    = _state.ComputeLocal(gross, emp.LocalityCode);
            var preTax   = SumPreTaxDeductions(emp);
            var postTax  = SumPostTaxDeductions(emp);
            var net      = gross.Subtract(fed).Subtract(fica.EmployeeShare)
                                .Subtract(state).Subtract(local)
                                .Subtract(preTax).Subtract(postTax);

            lines.Add(new PayrollLine(emp.Id, gross, fed, fica, state, local, preTax, postTax, net));
        }
        return new PayrollRunResult(run.Id, lines);
    }

    public Task<TaxFilingResult> FileQuarterly941Async(int year, int quarter, CancellationToken ct) { ... }
    public Task<TaxFilingResult> FileAnnual940Async(int year, CancellationToken ct) { ... }
    public Task<W2Batch> GenerateW2sAsync(int year, CancellationToken ct) { ... }
    public Task<bool> SupportsAsync(string country, CancellationToken ct)
        => Task.FromResult(country == "US");
}
```

## W-4 federal withholding (post-2020 form)

Per IRS Pub 15-T, two methods:
- **Percentage Method** — preferred; supports any frequency.
- **Wage Bracket Method** — older; ULP supports for cross-validation but defaults to Percentage.

W-4 inputs (post-2020):
- Step 1: Filing status (Single / MFJ / Head of Household)
- Step 2: Multiple jobs / spouse works adjustment
- Step 3: Dependents claim ($2,000 per qualifying child + $500 per other)
- Step 4(a): Other income
- Step 4(b): Deductions
- Step 4(c): Extra withholding per pay period

## FICA computation

```csharp
public sealed class FicaEngine : IFicaEngine
{
    public FicaResult Compute(Money gross, Money ytdWages /* prior to this run */)
    {
        // Social Security cap
        var ssRemaining = MaxOf(SocialSecurityWageBase[year].Subtract(ytdWages), Money.Zero("USD"));
        var ssTaxable   = MinOf(gross, ssRemaining);
        var ssEmployee  = ssTaxable.Multiply(0.062m).Round();
        var ssEmployer  = ssTaxable.Multiply(0.062m).Round();

        // Medicare — no cap
        var medicareEmployee = gross.Multiply(0.0145m).Round();
        var medicareEmployer = gross.Multiply(0.0145m).Round();

        // Additional Medicare — only on YTD wages above threshold (filing-status-dependent)
        var addlMedicareThreshold = AdditionalMedicareThreshold[employeeFilingStatus];
        var ytdAfterRun           = ytdWages.Add(gross);
        var addlMedicareBase      = MaxOf(ytdAfterRun.Subtract(addlMedicareThreshold), Money.Zero("USD"));
        var priorAddlBase         = MaxOf(ytdWages.Subtract(addlMedicareThreshold), Money.Zero("USD"));
        var addlMedicareThisRun   = addlMedicareBase.Subtract(priorAddlBase).Multiply(0.009m).Round();

        return new FicaResult(
            EmployeeShare:  ssEmployee.Add(medicareEmployee).Add(addlMedicareThisRun),
            EmployerShare:  ssEmployer.Add(medicareEmployer));
    }
}
```

## FUTA / SUTA (employer-only)

- **FUTA**: 6.0% of first $7,000 per employee; full SUTA-paying employer gets 5.4% credit → net 0.6%. ULP tracks per-employee YTD wages to apply cap.
- **SUTA**: per-state rate + per-state wage base; rates vary by employer experience. Tenant onboarding captures SUTA rate per state of operations.

```csharp
// FUTA
var futaWageBase  = 7_000m;  // per-employee, per-year
var futaTaxable   = MinOf(yearWages, new Money(futaWageBase, "USD")).Subtract(yearFutaTaxedSoFar);
var futaTax       = futaTaxable.Multiply(0.006m);  // net rate after SUTA credit

// SUTA via IStateTaxProvider
var sutaTax = await _suta.ComputeAsync(employee.State, yearWages, employer.SutaRate, ct);
```

## Quarterly 941 + Annual 940

941 (quarterly federal employer return):
- Total wages, federal withholding, employer FICA, employee FICA, additional Medicare.
- Adjustments for sick pay, tips, fractions of cents.
- Schedule B if semi-weekly depositor.

940 (annual federal unemployment):
- Total FUTA wages, FUTA tax, credit reductions for credit-reduction states.

ULP submits both via IRS e-file MeF (Modernized e-File) with vendor partner (e.g., 1099-Etc / Tax1099 / etc.).

## Year-end statements

| Form | Purpose | Deadline |
|---|---|---|
| W-2 | Employee wage + tax statement | By Jan 31 to employee + SSA |
| W-3 | Transmittal of W-2 (paper only) | By Jan 31 |
| 1099-NEC | Non-employee compensation $600+ | By Jan 31 to recipient + IRS |
| 1099-MISC | Other income (rents, prizes) | Mar 31 (e-file) |
| 1099-K | Payment-card / third-party network | Mar 31 (e-file) |
| 1095-C | ACA employer-provided insurance | By Jan 31 to employee, Feb 28 (paper) / Mar 31 (e-file) IRS |
| 1094-C | Transmittal of 1095-C | Mar 31 (e-file) |

## ACA ALE (Applicable Large Employer) tracking

If tenant has 50+ FTE-equivalents, must:
- Offer minimum-essential coverage to 95%+ of full-time employees.
- File 1095-C per full-time employee + 1094-C transmittal.
- Tracks via M20-US's ACA tracker (uses look-back measurement period, 3-12 months).

## I-9 + E-Verify
- I-9 captured at hire (Section 1 by employee, Section 2 by employer within 3 business days).
- E-Verify (federal database) verification within 3 business days of hire — required for federal contractors + ~25 states' state-contractor employees.
- ULP stores I-9 + E-Verify case number; never copies of identity documents (privacy/security).

## DO and DON'T

| DO | DON'T |
|---|---|
| Refresh Pub 15-T tables every January | Don't hardcode rates |
| Use `Money` everywhere | Don't use `decimal` for any money |
| Track YTD per employee per company per year | Don't reset YTD on tenant restructure |
| Compute Additional Medicare incrementally | Don't recalc from year start each run |
| Honor W-4 step 4(c) extra withholding | Don't ignore the field |
| Mask SSN in logs (last 4 only) | Don't log full SSN |
| Encrypt SSN at rest with separate KEK | Don't store plain SSN |
| File 941 quarterly even if no wages | Don't skip "zero" filings |

## Multi-state employees
- Employee working in multiple states → reciprocity agreements apply (e.g., NJ-PA, KY-OH, MI-IN, etc.).
- Tax to state of residence (with credit for state of work) OR state of work, depending on agreement.
- ULP's `m20us_state_reciprocity` table captures pairs; engine applies correctly.

## Common pitfalls
- Forgetting Social Security wage-base cap mid-year (some employees suddenly stop withholding when they hit the cap).
- Additional Medicare threshold is on employee filing status, but employer withholds at $200k regardless of marital status (employee reconciles on Form 1040).
- Mishandling supplemental wages (bonuses, commissions) — flat 22% federal vs aggregate method.
- ACA look-back / stability periods miscalculated; results in penalty assessment.
- I-9 retention: 3 years after hire OR 1 year after termination, whichever is later.

## Integration with IPayrollProvider contract tests

Both `IndiaPayrollProvider` (IN) and `UsPayrollProvider` (US) inherit `PayrollProviderContractTests`:
```csharp
[Fact] public async Task Compute_NetEqualsGrossMinusDeductions() { ... }
[Fact] public async Task Compute_HonorsWageBaseCaps() { ... }
[Fact] public async Task Compute_ProducesAuditableLines() { ... }
[Fact] public async Task FileQuarterly_PersistsAcknowledgement() { ... }
[Fact] public async Task GenerateYearEndStatements_BalancesToYearTotals() { ... }
// ~20 shared assertions
```

## See also
- `compliance-plugin-pattern` — `IPayrollProvider` contract.
- `indian-accounts-period-close` — IN counterpart (PF/ESI/Form 24Q).
- `money-type-multicurrency` — for all monetary fields.
- `us-banking-ach-plaid` — payroll triggers ACH disbursement.
- `us-accounts-gaap-1099` — payroll posts to GL.
- ULP_LLD_M20_US_HRPayroll_v1.0.docx — full LLD reference.
