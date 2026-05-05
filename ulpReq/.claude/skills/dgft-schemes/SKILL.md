---
name: dgft-schemes
description: DGFT export incentive schemes (RoDTEP, EPCG, Advance Authorization, RoSCTL, Duty Drawback) for ULP M4 CHA. Use when implementing scheme eligibility checks, e-scrip ledger management, EODC tracking, shipping bill scheme declaration, or any code in Backend/M4.CHA/DgftSchemes/. Covers 2026-current rules - RoDTEP rates 0.5-4.3% of FOB, EPCG 6x export obligation in 6 years, Advance Authorization SION norms, ICEGATE credit ledger flow, and SEIS discontinuation.
---

# DGFT Export Incentive Schemes for ULP

## When this skill triggers
Working on M4 CHA scheme declaration, RoDTEP/EPCG/Advance Authorization application tracking, e-scrip ledger management, EODC (Export Obligation Discharge Certificate) tracking, or any code in `Backend/M4.CHA/DgftSchemes/`.

## Top 3 reference sources
1. **dgft.gov.in** (https://www.dgft.gov.in/) — Official DGFT portal. Authoritative for FTP 2023, scheme notifications, IEC management. ULP master data refreshed from here.
2. **icegate.gov.in/CP** (https://www.icegate.gov.in/) — ICEGATE Credit Ledger interface for e-scrip generation and utilization. Critical for RoDTEP/MEIS legacy.
3. **indiantradeportal.in** (https://indiantradeportal.in/) — DGFT FAQ + scheme calculators. Good for edge cases (job work + EPCG, etc.)

## Critical ULP patterns

### Scheme overview (active in 2026)
| Scheme | What | Rate | Form | Duration |
|--------|------|------|------|----------|
| **RoDTEP** | Refund of un-rebated taxes (VAT on fuel, mandi tax, electricity duty, stamp duty) | 0.5%-4.3% of FOB | e-scrip on ICEGATE ledger | Per shipping bill |
| **RoSCTL** | RoDTEP equivalent for textiles (apparel, made-ups) | Higher than RoDTEP | e-scrip | Per shipping bill |
| **EPCG** | Duty-free import of capital goods | 0% BCD on import | EPCG license | 6 years (export 6x duty saved) |
| **Advance Authorization** | Duty-free import of inputs that go into export | 0% on inputs (raw materials) | AA license | 18 months |
| **Duty Drawback** | Refund of customs duty on inputs (alternate to AA) | All Industry Rate or Brand Rate | Direct credit | Per shipping bill |
| ~~MEIS~~ | DISCONTINUED (replaced by RoDTEP from Jan 2021) | - | - | - |
| ~~SEIS~~ | DISCONTINUED for service exporters | - | - | - |

### RoDTEP — flagship export scheme
```
Coverage: 8,555 tariff items at 8-digit HS code level
Excluded sectors: steel, pharmaceuticals, chemicals, textiles (RoSCTL covers textiles)

Workflow:
1. Exporter declares RoDTEP claim in Shipping Bill (mandatory before LEO)
2. After LEO + EGM filed: claim flows to ICEGATE
3. e-scrip generated in exporter's ICEGATE Credit Ledger
4. Exporter uses scrip to pay BCD on imports OR transfers to another importer
5. Scrip is transferable + tradable

Critical:
- Must mark RoDTEP option on EVERY eligible shipping bill (cannot retro-claim)
- Must have IEC + DSC + ICEGATE registration
- Per-unit value cap on certain HS codes (check notification)
- IGST refund + RoDTEP can be claimed simultaneously
- EPCG + RoDTEP can be claimed simultaneously
- Realisation of sale proceeds within FEMA timeline (otherwise recover with penalty)
```

### EPCG (Export Promotion Capital Goods)
```
Purpose: Allow duty-free import of capital goods used to manufacture exports
Duty saved: BCD waiver on imported machinery
Export Obligation (EO): 6x duties saved (6 times) within 6 years

Workflow:
1. Apply for EPCG Authorization on DGFT portal
2. Import capital goods at 0% BCD (paying ONLY IGST)
3. Manufacture goods using these capital goods
4. Export those goods worth 6x duties saved within 6 years
5. Submit EODC (Export Obligation Discharge Certificate) at end
6. If EO not met: pay back saved duty + interest

ULP M4 must:
- Track EPCG Authorization No, IEC, capital goods imported, duties saved
- Track exports against the EPCG (block-wise: 50% in first 4 years, 100% by year 6)
- Generate EODC application with export aggregation
- Alert if EO falling behind schedule
```

### Advance Authorization
```
Purpose: Duty-free import of INPUTS that physically go into export product
Inputs allowed: raw materials, packaging, fuel, oil, catalysts (not capital goods)
Duty saved: BCD + IGST waived on imports
EO: must export the product within 18 months of license issue

Allowed quantity: as per Standard Input-Output Norms (SION) defined per export product
  - SION specifies "for X kg of export product, you can import Y kg of input"
  - Built-in wastage allowance
If no SION exists: ad-hoc norms via Norms Committee

ULP M4 must:
- Maintain SION database (refresh from DGFT)
- Track AA license: license No, validity, inputs allowed (HSN + qty), exports completed
- On import BOE: validate against AA license SION norms
- On shipping bill: calculate input consumption against export
- Generate redemption letter at EO completion
```

### RoDTEP e-scrip ledger flow
```
[Exporter] -> Shipping Bill marked RoDTEP=Yes
   -> LEO granted
   -> EGM filed
   -> Customs system computes scrip value (FOB × notified rate)
   -> Credits exporter's ICEGATE Credit Ledger
[Exporter] -> Generate scrip from ledger (selecting eligible SBs)
   -> Use scrip to pay BCD on import (own use)
   OR
   -> Transfer scrip to another importer (sale via market)
[Importer using scrip] -> Pays BCD by debiting scrip in their ledger
```

### Multiple scheme stacking (allowed combinations)
```
RoDTEP + IGST refund: YES (most common)
RoDTEP + Duty Drawback: YES (provided drawback rate doesn't already include taxes covered by RoDTEP)
RoDTEP + EPCG: YES (RoDTEP on exports, EPCG on capital goods imports)
RoDTEP + Advance Authorization: YES
EPCG + Duty Drawback on inputs: YES
SEZ exports: NOT eligible for RoDTEP (already zero-rated)

ULP scheme stacking validator: rules engine that checks combinations.
```

### Sample scheme declaration in ULP
```csharp
// Backend/M4.CHA/Models/SchemeDeclaration.cs
public class SchemeDeclaration
{
    public long ShippingBillId { get; set; }

    // RoDTEP
    public bool ClaimRoDTEP { get; set; }
    public decimal? RoDTEPRate { get; set; }  // %, fetched from master
    public decimal? RoDTEPCapPerUnit { get; set; }
    public decimal? ScripAmount => CalculateScrip();

    // RoSCTL (textiles)
    public bool ClaimRoSCTL { get; set; }
    public decimal? RoSCTLRate { get; set; }

    // Duty Drawback
    public bool ClaimDrawback { get; set; }
    public DrawbackType? DrawbackType { get; set; }   // AIR | BrandRate
    public decimal? DrawbackRate { get; set; }

    // EPCG
    public string? EPCGLicenseNo { get; set; }
    public decimal? EPCGEoCreditedAmount { get; set; }  // export contribution towards EO

    // Advance Authorization
    public string? AALicenseNo { get; set; }
    public Dictionary<string, decimal> AAInputUtilization { get; set; } = new();  // HSN -> qty
}
```

### EODC (Export Obligation Discharge Certificate)
```
EODC required for:
- EPCG: at end of 6-year EO period
- Advance Authorization: at end of 18-month EO period

Contents:
- License details
- Export realization data (shipping bill list + values + receipt of forex)
- Bank realization certificates (BRCs) for each shipment
- Summary: EO required vs achieved

Submission: DGFT portal
Outcome: EODC issued OR additional duty + interest demanded

ULP M4 EODC generator:
- Aggregates SBs against license
- Pulls BRC data from M17 (Accounts)
- Computes EO % achieved
- Generates EODC PDF + supporting docs
- Submits to DGFT
```

## Critical gotchas

### Cannot claim RoDTEP retrospectively
- Must mark RoDTEP=Yes on shipping bill BEFORE LEO.
- Forgot to mark? RoDTEP claim is permanently lost for that SB.
- ULP M4 default: RoDTEP=Yes for all eligible HS codes; user must explicitly opt out.

### IEC + DSC + ICEGATE registration are prerequisites
- IEC (Import Export Code) - lifetime; KYC update annually.
- DSC (Digital Signature Certificate) - typically valid 2 years.
- ICEGATE registration - one-time per IEC.
- ULP master: track expiry dates; alert 60 days before.

### RoDTEP rate revisions
- DGFT periodically updates RoDTEP rates by HS code (recent revision Feb 2026 covered engineering, textiles, chemicals, agriculture, plastics, processed food).
- ULP master: nightly refresh from DGFT notifications API.
- Apply revised rate to shipping bills after notification effective date.

### EO block-wise targets
- EPCG block-wise EO: 50% in first 4 years, 100% by year 6 (within 6x).
- Falling behind block: composition fees + extension penalties.
- ULP M4 dashboard: traffic-light per license (green/amber/red).

### FEMA realization deadline
- Sale proceeds must be realized within 9 months of export (FEMA standard).
- Failure: RoDTEP recovered + penalty.
- ULP M17 BRC tracker links to M4 to flag pending realizations.

### Suspension/withholding of RoDTEP for fraud
- DGFT can suspend RoDTEP scrip generation for misuse.
- ULP audit logs every RoDTEP transaction with full traceability.

### SEZ exports - NOT eligible for RoDTEP
- SEZ exports are zero-rated under GST (deemed exports).
- Cannot claim RoDTEP scrip on SEZ supplies.
- ULP rule: if `customer.is_sez = true` -> hide RoDTEP option.

### Bonded warehouse + EPCG
- Goods imported under EPCG can be warehoused before clearance.
- Time-bound; check FTP for current rules.

### "Star Export House" status
- Based on cumulative export performance (1, 2, 3, 4, 5 stars).
- 1 Star = $3M FOB, 5 Star = $2 billion FOB (lifetime).
- Star Houses get faster clearance, certain duty benefits.
- ULP customer master: track `star_export_house_tier`.

## ULP companion docs
- ULP_LLD_M4_v1.0_CHA.docx Section 5 (DGFT scheme integration)
- ULP_DomainReferenceLibrary_v3.0.docx Section 4 (Customs domain)
- ULP_DBD_v1.0_DatabaseDesign.docx (m4_dgft_license, m4_rodtep_scrip_ledger)
