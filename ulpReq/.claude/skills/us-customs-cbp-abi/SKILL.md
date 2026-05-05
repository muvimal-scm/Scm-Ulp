---
name: us-customs-cbp-abi
description: ULP v2.0 US customs filing via CBP ABI (entry summaries), AES (export filings), ISF 10+2 (importer security filing), and PGA disclaim. Use when implementing US customs flows in M4-US module — Type 01 entry summaries, ITN generation, ISF submission, FDA/USDA/EPA partner-government-agency disclaim. Implements ICustomsProvider for US tenants. Parallel to indian-customs-icegate skill for IN tenants.
---

# US Customs (CBP ABI / AES / ISF / PGA) for ULP v2.0

## When this skill triggers
Implementing US customs filings in module M4-US. Filing entry summaries to CBP via ABI (EDI), export filings to AES, ISF 10+2 importer security filings, and PGA disclaim for FDA/USDA/EPA-regulated commodities.

## Top 3 reference repos
1. **CBP — Customs and Trade Automated Interface Requirements (CATAIR)** (https://www.cbp.gov/trade/ace/catair) — Authoritative spec for ACE/ABI message formats.
2. **CBP — ISF 10+2 specifications** (https://www.cbp.gov/trade/programs-administration/importer-security-filing-1) — ISF transaction set details.
3. **U.S. Census — AES messaging** (https://www.census.gov/foreign-trade/aes/) — AES record layouts and EDI specs.

## CBP ABI / ACE entry summary types
| Type | Description | When to use |
|---|---|---|
| 01 | Consumption (most common) | Goods entering for consumption |
| 02 | Consumption — Quota / Visa | Quota-controlled goods |
| 03 | Consumption — Antidumping / Countervailing | AD/CVD covered goods |
| 06 | Consumption — Foreign Trade Zone | FTZ withdrawals |
| 11 | Informal — Mail / Personal | < $2,500 informal |
| 23 | Temporary Importation Bond | Temporary entry, re-export within 1 year |

## Required data on entry summary (Type 01 — most common)
| Field | Source in ULP | Notes |
|---|---|---|
| Importer of Record (IOR) EIN | Tenant master / customer master | Validate via `IIdentifierValidator` |
| Consignee | Order header | May == IOR |
| Port of entry | Shipment header | 4-digit numeric |
| Entry date | Today (filing-day) | LocalDate in tenant TZ |
| Country of origin | Per HS line | ISO 3166-1 alpha-2 |
| HTS classification (10-digit) | Item master / classification engine | Critical; drives duty + PGA |
| Quantity + unit of measure | Per line | Match HTS UoM |
| Entered value | Money(USD) | Money type |
| Duty rate | From HTS lookup | Computed |
| MPF + HMF | Computed | MPF = 0.3464%, min $32.71 max $634.62 (FY2026 — verify) |
| AD/CVD case numbers if applicable | Special procedures table | Only if HTS triggers |
| Bond number | Tenant bond master | Continuous or single-entry |

## ICustomsProvider implementation outline (US)

```csharp
public sealed class CbpAbiCustomsProvider : ICustomsProvider
{
    private readonly IAbiClient _abi;            // EDI sender (ANSI X12 CATAIR)
    private readonly IHtsLookup _hts;
    private readonly IDutyEngine _duty;
    private readonly ILogger<CbpAbiCustomsProvider> _log;

    public Task<CustomsFilingResult> FileAsync(CustomsFilingRequest req, CancellationToken ct)
    {
        // 1. Build entry summary (Type 01)
        var entry = BuildEntrySummary(req);
        // 2. Compute duty + MPF + HMF
        var charges = _duty.Compute(entry);
        // 3. Send via ABI to ACE (asynchronous)
        var ack = await _abi.SendAsync(entry, ct);
        // 4. Persist filing record with ACE entry number once issued
        return new CustomsFilingResult(ack.Status, ack.AceEntryNumber, charges.Total);
    }
    public Task<CustomsFilingStatus> GetStatusAsync(string aceEntryNumber, CancellationToken ct) { ... }
    public Task<bool> SupportsAsync(string country, CancellationToken ct)
        => Task.FromResult(country == "US");
}
```

## AES (Automated Export System)

Required for exports valued > $2,500 per HTS line OR all licensed/restricted goods regardless of value.

| Field | Source |
|---|---|
| USPPI (US Principal Party) EIN | Tenant master |
| Foreign consignee | Customer master |
| Schedule B / HTS number | Item master |
| Origin state | Item master |
| Mode of transport | Shipment header |
| Carrier SCAC | Carrier master |
| Date of export | Shipment depart date |
| Port of export | Shipment header |
| License code (if licensed) | Special procedures |
| Routed transaction indicator | Order header |

Successful filing returns an **ITN (Internal Transaction Number)** which must accompany the shipment.

## ISF 10+2 (Importer Security Filing)

Filed by the importer (or filer) **before** ocean cargo loads at foreign port. 24-hour rule.

| Element | Source |
|---|---|
| 1. Manufacturer name + address | PO line / vendor master |
| 2. Seller name + address | Vendor master |
| 3. Buyer name + address | Tenant or end-buyer |
| 4. Ship-to name + address | Order header |
| 5. Container stuffing location | Shipment header |
| 6. Consolidator name + address | Logistics provider |
| 7. Importer of record number (EIN) | Tenant master |
| 8. Consignee number | Customer master |
| 9. Country of origin | PO line |
| 10. HTS number (6-digit) | Item master |
| +1. Vessel stow plan | Carrier (their responsibility) |
| +2. Container status messages | Carrier (their responsibility) |

ULP files the 10 importer-side elements; carrier files +2.

## PGA disclaim (Partner Government Agencies)

Applies to commodities regulated by FDA, USDA, EPA, FCC, FWS, NHTSA, etc. ULP must:
1. Detect PGA flag from HTS lookup or item master.
2. Capture additional data per PGA (e.g., FDA prior notice for food).
3. Disclaim non-applicability where appropriate (e.g., FDA exemption for industrial-use chemical).
4. Include PGA message segments in the ABI transaction.

## Standard ULP flow
```
Order in M2 (US tenant)
  → Shipment created in M5/M6
  → ISF 10+2 filed (24h before lading) via M4-US (CbpAbiCustomsProvider.FileIsfAsync)
  → Shipment departs foreign port
  → On arrival at US port: M4-US files Type 01 entry summary via ABI
  → CBP returns ACE entry number + duty bill
  → M17-US books duty + MPF + HMF as cost; AP entry to broker if applicable
  → Status updates ingested via webhook on milestone events
```

## Integration with ICustomsProvider contract tests

Both `CHACustomsProvider` (IN) and `CbpAbiCustomsProvider` (US) inherit `CustomsProviderContractTests`:
```csharp
[Fact] public async Task File_ReturnsTrackingId() { ... }
[Fact] public async Task File_PersistsForAuditTrail() { ... }
[Fact] public async Task GetStatus_ReturnsLatest() { ... }
[Fact] public async Task File_IsIdempotent_OnSameRequestId() { ... }
// ~16 shared assertions
```

## Common pitfalls
- Filing entry summary before goods arrive — wait for arrival manifest.
- Misclassifying HTS (10-digit precision matters); duty + PGA flow change drastically.
- Forgetting MPF minimum/maximum bounds (FY-specific; verify annually).
- ISF filed less than 24h before lading → CBP fines.
- AES required threshold = $2,500 per Schedule B / HTS line, not per shipment total.
- Bond mismatch: continuous bond vs single-entry bond by tenant; can't always assume continuous.

## DO and DON'T

| DO | DON'T |
|---|---|
| Validate EIN via `IIdentifierValidator` | Don't accept free-form IOR strings |
| Use `Money` for entered value, duty, MPF, HMF | Don't use bare `decimal` |
| Persist ACE entry number + ITN when CBP returns them | Don't let them stay in volatile state |
| Idempotent filing by `request_id` | Don't allow duplicate filings on retry |
| Run PGA disclaim engine on every line | Don't assume HTS is "clean" |
| Schedule status polling per filing | Don't poll continuously (rate limits) |

## See also
- `compliance-plugin-pattern` — `ICustomsProvider` interface this skill implements.
- `indian-customs-icegate` — IN counterpart (CHA / ICEGATE / SCMTR).
- `money-type-multicurrency` — for all monetary fields.
- `multi-region-tenant-context` — for tenant pinning + DI.
- ULP_LLD_M4_US_CBP_ABI_v1.0.docx — full LLD reference.
