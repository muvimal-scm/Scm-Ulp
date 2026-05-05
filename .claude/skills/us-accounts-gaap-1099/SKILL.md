---
name: us-accounts-gaap-1099
description: ULP v2.0 US accounting — US GAAP under ASC 606 (revenue) + ASC 842 (leases), 1099-NEC/MISC/K issuance, W-9 capture, accruals + period close, GL posting per chart of accounts. Use when implementing M17-US Accounts. Differs from Ind AS in revenue timing, lease classification, and statement presentation. Parallel to indian-accounts-period-close for IN tenants.
---

# US Accounts (GAAP / 1099 / W-9) for ULP v2.0

## When this skill triggers
Implementing US GAAP financial accounting, period close, and US-specific tax filings (1099 family, W-9 capture). Module M17-US.

## Top 3 reference repos
1. **FASB Codification** (https://asc.fasb.org/) — Authoritative source for US GAAP. Public access requires registration; XBRL taxonomy referenced in our COA mapping.
2. **IRS Form 1099 instructions** (https://www.irs.gov/forms-pubs) — Annual updates per form type.
3. **xbrl-us/us-gaap-taxonomy** (https://github.com/xbrl-us/us-gaap-taxonomy) — XBRL taxonomy useful for GL element mapping if XBRL output is in scope.

## Key GAAP standards in scope

| Standard | Purpose | ULP touchpoint |
|---|---|---|
| ASC 606 | Revenue from contracts with customers | Sales invoice posting timing |
| ASC 842 | Leases | M13 fleet leases; warehouse leases |
| ASC 740 | Income taxes | Period close tax provision |
| ASC 326 | Credit losses (CECL) | AR allowance for doubtful accounts |
| ASC 350 | Goodwill / intangibles | Annual impairment testing |
| Reg S-X (if SEC) | Statement presentation | Out of scope unless tenant goes public |

## US GAAP vs Ind AS — quick contrast

| Topic | US GAAP | Ind AS / India |
|---|---|---|
| Revenue recognition | ASC 606 — 5-step model | Ind AS 115 (similar but minor differences) |
| Inventory | LIFO permitted | LIFO prohibited |
| Goodwill | Annual impairment test | Annual impairment test (similar) |
| R&D | Expense as incurred | Capitalize after technical feasibility |
| Lease classification | ASC 842 (Operating + Finance) | Ind AS 116 (lessee single-model) |
| Statement presentation | Single-step or multi-step income | Schedule III prescribed |
| Currency | USD functional | INR functional |
| Filings | Federal + state | MCA + GST + IT |

ULP doesn't try to unify these — each tenant has the chart of accounts and presentation conforming to its country, served by the country's plugin.

## Standard ULP US chart of accounts (excerpt)

| Account # | Name | Type |
|---|---|---|
| 1010 | Cash — Operating | Asset |
| 1020 | Cash — Payroll | Asset |
| 1100 | Accounts Receivable | Asset |
| 1110 | Allowance for Doubtful Accounts | Asset (contra) |
| 1200 | Inventory — Raw | Asset |
| 1210 | Inventory — WIP | Asset |
| 1220 | Inventory — Finished | Asset |
| 1500 | PP&E — Equipment | Asset |
| 1510 | Accumulated Depreciation | Asset (contra) |
| 1700 | Right-of-Use Asset (ASC 842) | Asset |
| 2010 | Accounts Payable | Liability |
| 2050 | Accrued Liabilities | Liability |
| 2100 | Sales Tax Payable | Liability |
| 2110 | Federal Income Tax Withholding Payable | Liability |
| 2120 | FICA Payable | Liability |
| 2130 | FUTA Payable | Liability |
| 2140 | SUTA Payable | Liability |
| 2200 | Lease Liability (ASC 842) | Liability |
| 3010 | Common Stock | Equity |
| 3020 | Retained Earnings | Equity |
| 4000 | Sales Revenue | Revenue |
| 5000 | Cost of Goods Sold | Expense |
| 6000 | Salaries + Wages | Expense |
| 6010 | Employer FICA | Expense |
| 6020 | Employer FUTA | Expense |
| 6030 | Employer SUTA | Expense |
| 7000 | Operating Expenses | Expense |
| 7500 | Depreciation Expense | Expense |
| 8000 | Lease Expense | Expense |
| 9000 | Income Tax Expense | Expense |

## Standard sale flow (US tenant)

```
M2 Order created → M5/M6 ship → M17-US recognises revenue per ASC 606
  Per line:
    DR  Accounts Receivable
        CR Sales Revenue
        CR Sales Tax Payable          (per Avalara calc)
  COGS:
    DR  Cost of Goods Sold
        CR Inventory — Finished

Customer pays via ACH (M19-US) →
    DR  Cash — Operating
        CR Accounts Receivable
```

## 1099 family (year-end vendor statements)

| Form | Threshold | Use |
|---|---|---|
| 1099-NEC | ≥ $600 in nonemployee compensation | Independent contractors |
| 1099-MISC Box 1 | ≥ $600 rent | Real-estate rent |
| 1099-MISC Box 2 | ≥ $10 royalties | Royalties |
| 1099-MISC Box 3 | ≥ $600 other income | Prizes, awards, taxable damages |
| 1099-K | ≥ $5,000 (2024 threshold; was lower) | Payment-card / third-party network |
| 1099-INT | ≥ $10 interest | Banks issue |
| 1099-DIV | ≥ $10 dividends | Brokerages |

ULP focuses on 1099-NEC, 1099-MISC, and 1099-K (if tenant operates a marketplace).

## W-9 capture flow

```
Vendor onboarding (M11) →
  - Tenant requests W-9 from vendor
  - Vendor submits via secure portal (form 1099 elections, EIN/SSN)
  - ULP validates EIN/SSN structure via IIdentifierValidator
  - Vendor record marked W-9 on file with effective date
  - 1099 reportable flag set on vendor based on vendor type
```

W-9 expires effectively when vendor's information changes; ULP requests refresh annually for active vendors.

## Backup withholding

If a vendor:
- Fails to provide a TIN, OR
- Provides invalid TIN (per IRS TIN matching), OR
- Is notified of underreporting,

then ULP must apply 24% backup withholding on payments. M17-US tracks backup withholding flag per vendor and reports it on 1099 + 945 annual return.

## Period close (US)

| Step | Description | Owner |
|---|---|---|
| 1. Sales cutoff | All shipments per ASC 606 recognised | M17-US AR |
| 2. AP cutoff | All vendor invoices accrued | M17-US AP |
| 3. Bank reconciliation | Per-account reconciliation against BAI2 | M19-US |
| 4. Inventory reconciliation | Cycle counts vs perpetual | M3 |
| 5. Payroll accruals | Wages earned but not paid | M20-US |
| 6. Depreciation | Per fixed-asset schedule | M17-US fixed assets |
| 7. Lease entries | ASC 842 ROU + lease liability amortisation | M17-US leases |
| 8. Tax provision (ASC 740) | Federal + state income tax provision | M17-US |
| 9. Trial balance | Reviewed by Controller | Controller |
| 10. Statements | Income, Balance Sheet, Cash Flow | M17-US |
| 11. Period lock | Prevents back-posting | M17-US |

## DO and DON'T

| DO | DON'T |
|---|---|
| Use `Money` everywhere | Don't use `decimal` |
| Apply ASC 606 5-step recognition (control-transfer point) | Don't recognize revenue at order or invoice if control hasn't transferred |
| Capture W-9 before any reportable payment | Don't pay first, get W-9 later |
| TIN-match via IRS TIN matching service before issuing 1099 | Don't issue with unverified TIN |
| Apply 24% backup withholding on missing/invalid TIN | Don't skip — penalty per payment |
| Roll forward retained earnings on year-end | Don't forget the closing entry |
| Lock period after close; re-open requires audit trail | Don't allow back-posting silently |
| Use chart-of-accounts mapping per tenant subscription tier | Don't hardcode account numbers |

## Common pitfalls
- ASC 606 revenue timing — gross vs net (principal vs agent). Tenant role matters.
- ASC 842 — operating leases are now on balance sheet (ROU + liability); easy to miss.
- 1099-K reporting threshold has changed multiple times; verify annually.
- Backup withholding compounds with FATCA/QI on foreign payees.
- US-source vs non-US-source income for 1042/1042-S (foreign-vendor scenario).

## Integration with IComplianceProvider
US tenant accounting plugin returns US GAAP statements + 1099 batch from `IComplianceProvider.GeneratePeriodCloseAsync(...)`. Counterpart for IN tenant returns Schedule III + GST 3B.

## See also
- `compliance-plugin-pattern` — for the plugin architecture.
- `indian-accounts-period-close` — IN counterpart.
- `us-sales-tax-avalara` — generates the sales-tax payable lines.
- `us-banking-ach-plaid` — settles AR/AP.
- `us-payroll-fica-w2-941` — generates payroll-related GL postings.
- `money-type-multicurrency` — money handling.
- ULP_LLD_M17_US_Accounts_GAAP_v1.0.docx — full LLD reference.
