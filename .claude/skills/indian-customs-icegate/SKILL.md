---
name: indian-customs-icegate
description: Indian Customs ICEGATE filing patterns for ULP M4 CHA (Customs House Agent). Use when implementing Bill of Entry (BOE) filing, Shipping Bill (SB) filing, IGM/EGM tracking, customs duty calculation, AEO compliance, SWIFT integrations, or any code in Backend/M4.CHA/. Covers 2026-current rules - Bill of Entry filing deadline (end of day before vessel arrival), Shipping Bill LEO/EGM workflow, document types (Home Consumption white / Warehousing yellow / Ex-Bond green), late filing penalties, ITC linkage, and SCMTR transition. Always trigger when M4 LLD work, customs duty logic, or ICEGATE API integration.
---

# Indian Customs / ICEGATE for ULP M4 CHA

## When this skill triggers
Working on M4 CHA module - Bill of Entry (BOE) filing, Shipping Bill (SB) filing, customs duty computation, IGM/EGM (manifest tracking), DGFT scheme integration, ICEGATE message format generation/parsing, or any code in `Backend/M4.CHA/`.

## Top 3 reference sources (authoritative)
1. **icegate.gov.in/guidelines** (https://www.icegate.gov.in/guidelines/communicating-icegate) — Official ICEGATE filing guidelines + Message Implementation Guidelines (MIG). The authoritative spec for BOE/SB JSON formats, error codes, and acknowledgement workflows.
2. **CBIC e-Customs portal** (https://www.cbic.gov.in/) — Notifications, circulars, Customs Tariff Act amendments. Read latest circulars for HSN/CTH classification updates and duty rate changes.
3. **icegate.gov.in/help/faq** (https://www.icegate.gov.in/help/faq) — Comprehensive FAQ covering edge cases like SB error codes (SB001, SB105), AEO benefits, IGST claim linkage. ULP must handle every error code listed.

## Critical ULP patterns

### Bill of Entry (BOE) — import declaration
```
Document types:
- Home Consumption (White)  - Goods for immediate use; full duty paid at clearance
- Warehousing (Yellow)      - Goods stored bonded; duty deferred
- Ex-Bond (Green)           - Clearing previously warehoused goods

Filing deadline: End of day BEFORE vessel/aircraft arrival
Late penalty: ₹5,000/day for first 3 days, ₹10,000/day after

Workflow:
1. CHA prepares BOE (master + line items)
2. Submit JSON to ICEGATE via SMTP / direct API
3. ICEGATE returns acknowledgement (success or error code)
4. Customs assessment -> BE assessed
5. Duty payment (e-payment via ICEGATE)
6. Examination (if selected by RMS)
7. Out of Charge (OOC) issued -> goods released
```

### Shipping Bill (SB) — export declaration
```
Document types:
- ESB (Electronic Shipping Bill) - 7-digit number
- MSB (Manual Shipping Bill)     - 6-digit number (legacy)
- CRSB (Courier Shipping Bill)   - 5-digit number

Workflow:
1. Exporter/CHA prepares SB
2. Submit JSON to ICEGATE
3. Customs assessment
4. Examination if required
5. Let Export Order (LEO) granted
6. Goods loaded on vessel
7. Shipping line files Export General Manifest (EGM)
8. EGM filed = export complete (date is date of export for IGST refund + RoDTEP)

Critical: IGST refund + RoDTEP claim require BOTH LEO + EGM filed
```

### Sample BOE message structure (simplified)
```json
{
  "ServiceType": "BE",
  "FileType": "BE_FORM_REQUEST",
  "Header": {
    "DeclarationDate": "2026-04-15",
    "BillOfEntryNo": "",
    "PortCode": "INNSA1",
    "ImporterIEC": "0123456789",
    "ImporterName": "...",
    "ImporterPAN": "AAAAA1234A",
    "ImporterGSTIN": "27AAAAA1234A1Z5",
    "BOEType": "H",  // H=Home, W=Warehouse, X=Ex-bond
    "BillOfLadingNo": "MAEU123456789",
    "BillOfLadingDate": "2026-04-10",
    "VesselName": "...",
    "VoyageNo": "...",
    "ArrivalDate": "2026-04-16",
    "TotalInvoiceValue": 1500000.00,
    "TotalInvoiceCurrency": "USD",
    "ExchangeRate": 83.50,
    "TotalInvoiceValueINR": 125250000.00
  },
  "InvoiceList": [{
    "InvoiceNo": "INV-2026-001",
    "InvoiceDate": "2026-04-08",
    "SupplierName": "...",
    "SupplierAddress": "...",
    "CountryOfOrigin": "CN",
    "TermsOfDelivery": "FOB",
    "Items": [{
      "SerialNo": 1,
      "Description": "...",
      "CTH": "84714900",  // 8-digit Customs Tariff Heading
      "RITC": "84714900",
      "Quantity": 100,
      "UQC": "NOS",
      "UnitValueForeign": 15000.00,
      "TotalValueForeign": 1500000.00,
      "TotalAssessableValueINR": 125250000.00,
      "BCDRate": 7.50,    // Basic Customs Duty %
      "SWSRate": 10,      // Social Welfare Surcharge % (on BCD)
      "IGSTRate": 18,     // Integrated GST %
      "Notifications": ["50/2017-Cus"]
    }]
  }],
  "Documents": [
    { "Type": "INVOICE", "Reference": "INV-2026-001", "DigitalSignedHash": "..." },
    { "Type": "BL",      "Reference": "MAEU123456789" },
    { "Type": "PACKING_LIST", "Reference": "..." },
    { "Type": "AWB",     "Reference": "..." }
  ]
}
```

### Customs duty calculation (CIF method - standard)
```csharp
// Backend/M4.CHA/Services/CustomsDutyCalculator.cs
public class CustomsDutyCalculator
{
    public DutyBreakup Calculate(BoeLineItem item)
    {
        // Step 1: CIF value (Cost + Insurance + Freight)
        var cif = item.FobValueInr + item.FreightInr + item.InsuranceInr;

        // Step 2: Landing charges (1% of CIF) - assumed under Section 14 of Customs Act
        var landing = cif * 0.01m;

        // Step 3: Assessable Value (AV)
        var av = cif + landing;

        // Step 4: Basic Customs Duty (BCD)
        var bcd = av * (item.BcdRate / 100m);

        // Step 5: Social Welfare Surcharge (SWS) - 10% of BCD
        var sws = bcd * (item.SwsRate / 100m);

        // Step 6: Anti-dumping duty (if applicable, on AV)
        var add = item.HasAntiDumpingDuty ? av * (item.AddRate / 100m) : 0m;

        // Step 7: IGST taxable value = AV + BCD + SWS + ADD
        var igstBase = av + bcd + sws + add;
        var igst = igstBase * (item.IgstRate / 100m);

        // Step 8: Compensation Cess (some HS codes - cars, tobacco, coal etc.)
        var compCess = item.HasCompensationCess ? igstBase * (item.CompCessRate / 100m) : 0m;

        return new DutyBreakup(
            AssessableValue: av,
            Bcd: bcd,
            Sws: sws,
            AntiDumpingDuty: add,
            Igst: igst,
            CompensationCess: compCess,
            TotalDuty: bcd + sws + add + igst + compCess
        );
    }
}
```

### Common SB error codes (must handle in ULP)
```
SB001 - SB Number / Date / Port Code mismatch with GST invoice
SB002 - GSTIN not valid for export claim
SB003 - Invalid export item details
SB005 - LEO date doesn't match EGM date  (refund delay)
SB006 - IGST paid but no GST refund claim made
SB104 - Multiple SBs with same invoice number
SB105 - Invalid SB number length (must be 7=ESB, 6=MSB, or 5=CRSB)
SB006 - GSTIN-port mapping failed

For each error: ULP shows guided remediation.
SB001: "Verify SB Number, Date, Port Code match the GST invoice exactly."
SB005: "Use Table 9A in GSTR-1 to amend the export details."
```

### IGM/EGM tracking
```
IGM (Import General Manifest)  - Filed by carrier on arrival; lists all incoming cargo
EGM (Export General Manifest)  - Filed by carrier on departure; lists all outgoing cargo

ULP flow:
1. Subscribe to ICEGATE event/poll for IGM filed against your BL
2. Match IGM line item to your BOE
3. PROC TO CONNECT - associates BOE with vessel arrival
4. Customs assessment proceeds
5. After OOC, ULP marks shipment 'cleared'
```

## Critical gotchas

### Filing deadline is HARD
- BOE: end of day BEFORE vessel arrival. Late = ₹5K/day penalty.
- ULP M4 must alert CHA 48 hours before arrival if BOE not filed yet.

### CTH classification matters more than people think
- Wrong CTH = wrong duty rate = either revenue loss (under-paid) or working-capital lock (over-paid).
- ULP master data: CTH 8-digit codes with current duty rates, refreshed monthly from CBIC.
- Suggest: use HS lookup AI agent (M28 RAG) trained on CBIC notifications.

### SCMTR transition (current as of 2026)
- Sea Cargo Manifest and Transhipment Regulations - replaces old IGM/EGM regulations.
- Transitional provisions extended to 30 June 2026 (latest CBIC Circular 16/2026).
- ULP M4 must support BOTH old IGM/EGM and new SCMTR Arrival/Departure Manifests during transition.
- SCMTR uses JSON format submitted via ICEGATE MFTP (Managed File Transfer Protocol).

### Document size limit
- ICEGATE max document size: 1 MB per supporting document.
- Page count: no restriction, but file size matters.
- ULP must compress PDFs before upload.

### IGST refund linkage
- Exporter pays IGST on export, claims refund.
- Refund requires: SB filed + LEO granted + EGM filed.
- Validation chain in ULP: SB.LeoDate IS NOT NULL AND EGM.FilingDate IS NOT NULL.
- If any error code SB001/SB003/SB005 — refund blocked until resolved.

### AEO benefits
- Authorized Economic Operator scheme by CBIC.
- 3 tiers: AEO-T1 (basic), AEO-T2 (intermediate), AEO-T3 (premium).
- T2/T3 get deferred payment of import duty (15-day deferral).
- ULP M4 must check `customer.aeo_status` and apply deferral terms accordingly.

### Public Holiday handling
- Customs operates limited hours/days; check holiday calendar before scheduling clearance jobs.
- ULP master: `customs_holiday_calendar` table refreshed annually.

### Digital Signature Certificate (DSC)
- Currently NOT mandatory per ICEGATE FAQ but DG Systems plans to require.
- ULP should be DSC-ready: support PKCS#11 token signing for BOE/SB submissions.

## ULP companion docs
- ULP_LLD_M4_v1.0_CHA.docx (full module spec - 45 pages)
- ULP_DomainReferenceLibrary_v3.0.docx Section 4 (Customs domain)
- ULP_DBD_v1.0_DatabaseDesign.docx (m4_boe, m4_shipping_bill schemas)
