---
name: eway-bill
description: e-Way Bill generation and tracking for ULP M13 Transportation. Use when implementing e-Way Bill API integration with NIC EWB portal, Part A (consignment) + Part B (transport) generation, validity calculation by distance, extension/cancellation, vehicle update on transhipment, or any code in Backend/M13.Transportation/EWayBill/. Covers 2026-current rules - ₹50K threshold, validity 1 day per 200km, 180-day invoice age limit, 8-hour extension window, intrastate state-wise variations, and consolidated EWB.
---

# e-Way Bill Generation for ULP M13 Transportation

## When this skill triggers
Working on e-Way Bill generation, EWB API client (https://ewaybillgst.gov.in), Part A/B logic, validity calculation, vehicle update on transhipment, EWB extension/cancellation, or any code in `Backend/M13.Transportation/EWayBill/`.

## Top 3 reference sources
1. **docs.ewaybillgst.gov.in/apidocs** (https://docs.ewaybillgst.gov.in/apidocs/) — Official NIC EWB API documentation. Authoritative for all field formats, error codes, validations. ULP must read this end-to-end.
2. **ewaybillgst.gov.in** (https://ewaybillgst.gov.in/) — Production EWB portal. Notifications section publishes all rule changes. ULP master data refreshed from here.
3. **ewb.gst.gov.in** (sandbox) — Test environment with same API. ULP integration tests run here.

## Critical ULP patterns

### When e-Way Bill is required (2026)
```
Threshold: Consignment value > ₹50,000 (single invoice/delivery challan)
  - Inter-state: ₹50K uniform
  - Intra-state: ₹50K default; some states higher (Bihar, Delhi: ₹1L)

Mandatory cases:
- Movement of goods exceeding threshold
- Job work (even if under threshold)
- Inter-state movement of handicrafts (any value)
- Inter-state movement of goods sent for testing/exhibition
- Stock transfer between branches (different GSTIN or even same)

Exemptions:
- Non-motorized vehicles (carts, bicycles)
- Goods listed in Annexure to Rule 138(14) (e.g. LPG, kerosene to PDS)
- Distance < 50km within state (Part B optional)
- Goods exempt under GST (zero-rated supplies)
- Movement by railways where consignor is Govt
```

### Validity by distance
```
Regular cargo:    1 day per 200km (or part thereof)
Over-Dimensional Cargo (ODC): 1 day per 20km

Examples:
- 310 km regular = 2 days (200 + 110)
- 500 km regular = 3 days (200 + 200 + 100)
- 100 km ODC = 5 days (20 + 20 + 20 + 20 + 20)

Validity STARTS when Part B (vehicle number) is entered.
NOT when EWB is generated.

Extension: allowed within 8 hours BEFORE or AFTER expiry.
Reason required: vehicle breakdown, natural calamity, transhipment delay, law/order.
Extension cap: 360 days from original generation date.
```

### Part A + Part B structure
```
Part A (consignment details) - filled by supplier or recipient:
- GSTIN of supplier + recipient
- Document type (Invoice/DC/Bill of Supply/Bill of Entry)
- Document number + date (must be ≤180 days old)
- HSN code(s)
- Item description, quantity, value, tax
- From PIN code, To PIN code
- Transaction type (Outward/Inward/Bill-to-Ship-to/Bill-from-Dispatch-from)

Part B (transport details) - filled by transporter or supplier:
- Mode (Road/Rail/Air/Ship)
- Vehicle number (12-char format)
- Transporter ID (for road via transporter)
- Distance to destination

After Part A: 12-digit EWB Number (EBN) generated.
After Part B: validity clock starts.
```

### Sample EWB JSON (NIC API)
```json
{
  "supplyType": "O",       // O=Outward, I=Inward
  "subSupplyType": "1",    // 1=Supply, 2=Import, 3=Export, ...
  "docType": "INV",        // INV|CHL|BIL|BOE|CNT
  "docNo": "INV-2026-04-001234",
  "docDate": "15/04/2026",
  "fromGstin": "27AAAAA1234A1Z5",
  "fromTrdName": "ULP TEST PVT LTD",
  "fromAddr1": "...",
  "fromPlace": "MUMBAI",
  "fromPincode": 400001,
  "fromStateCode": 27,
  "actFromStateCode": 27,    // Actual dispatch state (if different)
  "toGstin": "29BBBBB5678B1Z3",
  "toTrdName": "...",
  "toAddr1": "...",
  "toPlace": "BANGALORE",
  "toPincode": 560001,
  "toStateCode": 29,
  "actToStateCode": 29,
  "transactionType": 1,    // 1=Regular, 2=Bill-to-Ship-to, 3=Bill-from-Dispatch-from, 4=Combination
  "totalValue": 100000,
  "cgstValue": 0,
  "sgstValue": 0,
  "igstValue": 18000,
  "cessValue": 0,
  "TotInvValue": 118000,
  "transMode": "1",        // 1=Road, 2=Rail, 3=Air, 4=Ship
  "transDistance": "1000", // KM
  "transporterId": "27AAAAA1234A1Z5",
  "transporterName": "...",
  "transDocNo": "LR-2026-12345",
  "transDocDate": "15/04/2026",
  "vehicleNo": "MH04AB1234",
  "vehicleType": "R",      // R=Regular, O=ODC
  "itemList": [{
    "productName": "...",
    "productDesc": "...",
    "hsnCode": 996739,
    "quantity": 1,
    "qtyUnit": "OTH",
    "cgstRate": 0,
    "sgstRate": 0,
    "igstRate": 18,
    "cessRate": 0,
    "cessNonAdvol": 0,
    "taxableAmount": 100000
  }]
}
```

### ULP integration with M17 (auto-generate from invoice)
```csharp
// Backend/M13.Transportation/EWayBill/AutoGenerationService.cs
public class EwbAutoGenerator
{
    // Trigger: invoice.amount > ₹50,000 AND requires_ewb = true
    public async Task<EwbResult> GenerateForInvoiceAsync(Invoice inv, CancellationToken ct)
    {
        // Step 1: Pre-validation
        if (inv.Amount.Value <= 50_000m && !inv.IsInterState)
            return EwbResult.NotRequired();
        if (inv.InvoiceDate < DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-180)))
            return EwbResult.Error("Invoice older than 180 days; cannot generate EWB");

        // Step 2: Construct Part A
        var partA = MapToPartA(inv);

        // Step 3: Call NIC EWB API
        var ebn = await _ewbClient.GenerateAsync(partA, ct);

        // Step 4: Persist EBN
        await _db.EWayBills.AddAsync(new EWayBill
        {
            Ebn = ebn,
            InvoiceId = inv.Id,
            Status = EwbStatus.PartAGenerated,
            CreatedAt = DateTimeOffset.UtcNow,
            ValidUntil = null  // Set after Part B
        }, ct);

        return EwbResult.Success(ebn);
    }

    public async Task UpdatePartBAsync(string ebn, VehicleDetails vehicle, decimal distanceKm, CancellationToken ct)
    {
        await _ewbClient.UpdatePartBAsync(ebn, vehicle, ct);

        var validityDays = (int)Math.Ceiling(distanceKm / 200m);  // Regular cargo
        var ewb = await _db.EWayBills.FindAsync(new object[] { ebn }, ct);
        ewb.ValidUntil = DateTimeOffset.UtcNow.AddDays(validityDays);
        ewb.Status = EwbStatus.Active;
        await _db.SaveChangesAsync(ct);
    }
}
```

### Extension on delay
```csharp
public async Task ExtendAsync(string ebn, ExtensionReason reason, string remarks, VehicleDetails newVehicle, CancellationToken ct)
{
    var ewb = await _db.EWayBills.FindAsync(new object[] { ebn }, ct);

    // Validate: within 8h before/after expiry
    var now = DateTimeOffset.UtcNow;
    var window = TimeSpan.FromHours(8);
    if (now < ewb.ValidUntil - window || now > ewb.ValidUntil + window)
        throw new InvalidOperationException("Extension only allowed 8h before/after expiry");

    // Validate: within 360-day max from original generation
    if (now > ewb.CreatedAt.AddDays(360))
        throw new InvalidOperationException("Cannot extend beyond 360 days from original generation");

    await _ewbClient.ExtendAsync(ebn, reason, remarks, newVehicle, ct);
}
```

### Consolidated EWB (multiple consignments, one vehicle)
```
Use Form GST EWB-02 to consolidate:
- Vehicle carries multiple consignments (each with its own EBN)
- Generate consolidated EWB referencing all child EBNs
- Single document at checkpoint instead of N documents

ULP M13 helper: when transporter assigns vehicle to multiple LRs, auto-generate consolidated EWB.
```

## Critical gotchas

### 180-day invoice age limit (effective 1 Jan 2025)
- Cannot generate EWB for an invoice older than 180 days.
- ULP must alert M17 if invoice approaching this threshold.

### GSTIN must be active
- IRP/EWB rejects if GSTIN inactive or returns pending.
- ULP master: cache `gstin_status` (refresh daily) before EWB call.

### Vehicle number format
- 12-char format: `<State><RTO><Series><Number>` e.g. `MH04AB1234`.
- ULP regex: `^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$`.

### Distance auto-fill from PIN
- NIC EWB system computes distance automatically based on from/to PIN.
- If NIC has data: returns actual distance.
- If not: returns 0; user must enter manually.
- ULP should NOT trust user-entered distance; cross-check with Google Maps API.

### Cancellation window: 24 hours
- Generator can cancel within 24h of generation.
- Cannot cancel if verified by tax officer at checkpoint.
- After 24h: must issue Credit Note + new invoice if commercial reasons.

### State-specific intra-state thresholds (subset)
```
Default: ₹50,000
Bihar: ₹1,00,000
Delhi: ₹1,00,000
Punjab: ₹1,00,000
Tamil Nadu: ₹1,00,000 (intra-state)
West Bengal: ₹1,00,000 (intra-state)

ULP master: state_intrastate_ewb_threshold table; refreshed monthly.
```

### Penalties for non-compliance
- ₹10,000 OR tax evaded amount, whichever is higher.
- Plus vehicle detention; goods seizure in serious cases.
- ULP must show pre-dispatch checklist:
  - EWB generated? Y/N
  - Part B filled? Y/N
  - Validity sufficient for journey? Y/N

### MFA for EWB portal (April 2026)
- 2FA mandatory for human users on EWB portal.
- API integration uses authentication token (no MFA on API).

### SMS-based generation (alternative)
- Registered users can generate via SMS.
- ULP supports this for drivers who lose connectivity.

### OTC (Out of Time Cancellation) request
- After 24h: cannot cancel via API.
- Must apply on portal manually (rare exception).
- ULP M13 should track these as compliance flags.

## ULP companion docs
- ULP_LLD_M13_v1.0_Transportation.docx Section 4.5 (EWB integration)
- ULP_DomainReferenceLibrary_v3.0.docx Section 6 (Transportation domain)
- ULP_DBD_v1.0_DatabaseDesign.docx (m13_eway_bill schema)
