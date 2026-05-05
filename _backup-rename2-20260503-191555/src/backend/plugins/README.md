# src/backend/plugins/

Country compliance plugins. Each plugin implements one or more interfaces from `Ulp.Core.Abstractions` and is loaded at runtime based on `tenant.country_code` and `tenant.compliance_plugins`.

## Plugin interfaces (7)

Defined in [../core/Ulp.Core.Abstractions/](../core/Ulp.Core.Abstractions/):

- `IComplianceProvider` — high-level compliance checks
- `ITaxProvider` — tax computation + filing
- `ICustomsProvider` — customs filing (BOE/SB for IN; CBP/AES for US)
- `IBankingProvider` — payment file formats (NACH for IN; ACH/NACHA for US)
- `IPayrollProvider` — payroll calculations + filings
- `IIdentifierValidator` — country-specific ID validators (one per ID type)
- `IStateTaxProvider` — state-level tax (US only — IN uses national GST)

## Indian plugins ([india/](india/))

Phase 3a, months 5–6.

| Project | Module | Implements |
|---|---|---|
| `Ulp.Plugin.India.Customs` | M4-IN | `ICustomsProvider` (ICEGATE BOE/SB) |
| `Ulp.Plugin.India.Tax` | M17-IN | `ITaxProvider` (GST CGST/SGST/IGST), `IComplianceProvider` |
| `Ulp.Plugin.India.Ewb` | M13-IN | `IComplianceProvider` (e-Way Bill) |
| `Ulp.Plugin.India.Dgft` | M15 | `IComplianceProvider` (RoDTEP, EPCG, EODC) |
| `Ulp.Plugin.India.Scmtr` | M20 | `ICustomsProvider` (Sea Cargo Manifest) |
| `Ulp.Plugin.India.GstReturns` | M18 | `ITaxProvider` (GSTR-1/3B/9) |
| `Ulp.Plugin.India.TdsTcs` | M19 | `ITaxProvider` (TDS/TCS) |
| `Ulp.Plugin.India.Identifiers` | — | `IIdentifierValidator` × 4 (PAN, GSTIN, IFSC, IEC) |

## US plugins ([us/](us/))

Phase 3b, months 5–6 (parallel with 3a).

| Project | Module | Implements |
|---|---|---|
| `Ulp.Plugin.Us.Customs` | M4-US | `ICustomsProvider` (CBP ABI, AES, ISF, PGA) |
| `Ulp.Plugin.Us.SalesTax` | M18-US | `ITaxProvider`, `IStateTaxProvider` (Avalara) |
| `Ulp.Plugin.Us.Banking` | M19-US | `IBankingProvider` (ACH, Plaid, BAI2, NACHA) |
| `Ulp.Plugin.Us.Payroll` | M20-US | `IPayrollProvider` (W-4, FICA, 941, W-2) |
| `Ulp.Plugin.Us.Accounts` | M17-US | `ITaxProvider` (1099-NEC/MISC/K), `IComplianceProvider` (GAAP) |
| `Ulp.Plugin.Us.Transportation` | M13-US | `IComplianceProvider` (DOT, ELD, HOS, IFTA) |
| `Ulp.Plugin.Us.Identifiers` | — | `IIdentifierValidator` × N (EIN, SSN, ABA, USDOT, MC) |

## Adding a plugin

See [../../CONTRIBUTING.md](../../CONTRIBUTING.md) and the relevant skill (e.g., [../../.claude/skills/compliance-plugin-pattern/SKILL.md](../../.claude/skills/compliance-plugin-pattern/SKILL.md)).
