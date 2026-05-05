---
name: us-sales-tax-avalara
description: ULP v2.0 US sales tax via Avalara AvaTax — calculation per transaction, multi-state nexus tracking, return filing, exemption certificate management. Use whenever a US tenant invoices a customer or computes use tax on a purchase. Implements ITaxProvider for US tenants. Parallel to gst-irn-einvoice for IN tenants. NEVER hardcode US sales tax rates — always call Avalara.
---

# US Sales Tax via Avalara AvaTax for ULP v2.0

## When this skill triggers
Computing US sales tax on outbound invoices, use tax on inbound purchases, tax-exempt transactions (resale certs), tax holiday calculation, multi-state nexus tracking, and filing periodic state sales-tax returns. Module M18-US.

## Top 3 reference repos
1. **avadev/AvaTax-REST-V2-DotNet-SDK** (https://github.com/avadev/AvaTax-REST-V2-DotNet-SDK) — Official Avalara .NET SDK. Read README + samples.
2. **avadev/AvaTax-REST-V2-JS-SDK** (https://github.com/avadev/AvaTax-REST-V2-JS-SDK) — JS SDK if needed in any frontend tax preview.
3. **streamlinedsalestax/Streamlined Sales and Use Tax Agreement** (https://www.streamlinedsalestax.org/) — Reference for SST member states' uniform definitions.

## Key Avalara endpoints used by ULP
| Endpoint | Purpose |
|---|---|
| `POST /api/v2/transactions/create` | Compute and **commit** a tax transaction |
| `POST /api/v2/transactions/createoradjust` | Idempotent variant — preferred |
| `POST /api/v2/transactions/{code}/adjust` | Adjust an existing transaction |
| `POST /api/v2/transactions/{code}/void` | Void on invoice cancel |
| `GET  /api/v2/companies/{id}/filingcalendars` | Active filing calendars (state + frequency) |
| `POST /api/v2/companies/{id}/filings/{period}/files/{type}` | Submit return for filing |
| `POST /api/v2/companies/{id}/contacts` | Sync customer contacts (for cert validation) |
| `GET  /api/v2/definitions/nexus` | Lookup nexus jurisdictions |

## Standard ULP integration

```csharp
public sealed class AvalaraSalesTaxProvider : ITaxProvider
{
    private readonly AvaTaxClient _ava;          // SDK client
    private readonly ITenantContext _tenant;
    private readonly ILogger<AvalaraSalesTaxProvider> _log;

    public async Task<TaxResult> ComputeAsync(TaxRequest req, CancellationToken ct)
    {
        if (req.Country != "US")
            throw new NotSupportedException("AvalaraSalesTaxProvider supports US tenants only");

        var avaReq = new CreateOrAdjustTransactionModel
        {
            createTransactionModel = new CreateTransactionModel
            {
                companyCode    = ResolveCompanyCode(_tenant.TenantId),
                customerCode   = req.CustomerId,
                date           = DateTime.UtcNow.Date,
                code           = req.IdempotencyKey,           // your stable key
                type           = DocumentType.SalesInvoice,
                commit         = false,                         // commit later on AR posting
                currencyCode   = req.Amount.Currency,           // "USD"
                lines          = req.Lines.Select(l => new LineItemModel
                {
                    number      = l.LineNumber.ToString(),
                    quantity    = l.Quantity,
                    amount      = l.Amount.Amount,              // bare decimal here per Avalara API
                    itemCode    = l.Sku,
                    taxCode     = l.AvalaraTaxCode,             // e.g., "P0000000" for tangible
                    addresses   = new AddressesModel
                    {
                        shipFrom = ToAvalaraAddress(l.ShipFrom),
                        shipTo   = ToAvalaraAddress(l.ShipTo)
                    }
                }).ToList()
            }
        };

        var resp = await _ava.CreateOrAdjustTransactionAsync("", avaReq, ct);

        return new TaxResult(
            Total: new Money(resp.totalTax ?? 0m, "USD"),
            Lines: resp.lines.Select(l => new TaxLine(
                l.lineNumber,
                new Money(l.tax ?? 0m, "USD"),
                l.taxCalculated ?? 0m,
                l.details.Select(d => d.taxName).ToArray()
            )).ToList(),
            ProviderRef: resp.code);
    }

    public Task<bool> SupportsAsync(string country, CancellationToken ct)
        => Task.FromResult(country == "US");
}
```

## Nexus tracking

ULP maintains a `m18us_nexus` table per tenant tracking which states they have nexus in (physical or economic):

```sql
CREATE TABLE m18us_nexus (
    tenant_id          BIGINT       NOT NULL,
    state_code         CHAR(2)      NOT NULL,
    nexus_type         ENUM('physical','economic','marketplace','voluntary') NOT NULL,
    effective_date     DATE         NOT NULL,
    end_date           DATE         NULL,
    economic_threshold_met_date DATE NULL,
    avalara_nexus_id   VARCHAR(64)  NULL,
    PRIMARY KEY (tenant_id, state_code, effective_date),
    CONSTRAINT fk_state FOREIGN KEY (state_code) REFERENCES us_state(code)
);
```

Tenant onboarding asks for current nexus states; thresholds (economic nexus) are tracked via a quarterly job that aggregates transactions per state and alerts on threshold approach.

## Exemption certificates
- Avalara CertCapture handles cert lifecycle. ULP stores cert IDs against customer records.
- At calc time, Avalara uses cert state + customer code + delivery state to determine exemption.
- Expired certs trigger calculation as taxable; ULP sends in-app notification to AR team.

## Return filing
- Filing calendars retrieved nightly per company.
- Returns prepared in batch by state per period; submitted via Avalara Returns API.
- Filing acknowledgement stored against `m18us_filing` table.
- Worst-case fallback: Avalara prepares the return; tenant tax department reviews + manually files in state portal.

## DO and DON'T

| DO | DON'T |
|---|---|
| Use idempotency `code` on every transaction | Don't let retries create duplicates |
| Pass `commit=false` on draft, `commit=true` only on AR post | Don't commit on draft (creates filing-eligible txn) |
| Cache filing calendars (24h TTL) | Don't fetch on every transaction |
| Use Avalara tax codes ("P0000000", "PS080100" etc.) | Don't guess tax codes; map item_master.avalara_tax_code |
| On 5xx / timeout: queue + reconcile nightly | Don't block invoice creation if Avalara is down |
| Capture full Avalara response in audit | Don't drop response details |
| Validate EIN via `IIdentifierValidator` before sending | Don't pass garbage tax IDs |

## Failure modes

| Failure | Behaviour |
|---|---|
| Avalara 5xx / timeout | Queue calculation; degrade to last-known cached rate with banner |
| Avalara rate limit (429) | Honour `Retry-After`; SemaphoreSlim throttle to 600 req/min |
| Customer cert expired | Calculate as taxable; flag AR for follow-up |
| Tenant has no nexus in delivery state | Avalara returns 0 tax; ULP records the calc but no liability |
| Tenant approaches economic nexus threshold | Job alerts tenant admin to register in that state |

## Integration with ITaxProvider contract tests

Both `GstTaxProvider` (IN) and `AvalaraSalesTaxProvider` (US) inherit `TaxProviderContractTests`:
```csharp
[Fact] public async Task Compute_ReturnsNonNegative() { ... }
[Fact] public async Task Compute_HonorsExemption() { ... }
[Fact] public async Task Compute_RoundsToCurrencyMinor() { ... }
[Fact] public async Task Compute_IsIdempotent() { ... }
[Fact] public async Task File_PersistsAcknowledgement() { ... }
// ~22 shared assertions
```

## Common pitfalls
- Confusing US tenant `country = US` with delivery state. Tax = function of delivery state, not tenant state.
- Forgetting that some states are origin-sourced (TX, AZ, CA partial), most are destination-sourced.
- Mishandling marketplace facilitator rules: if tenant sells through Amazon/eBay, Amazon may file the tax; ULP records exemption.
- Storing tax rate at calc time as a constant — it changes; always recompute on adjustment.
- Returning cached calc result indefinitely on Avalara outage — surface a warning UX.

## See also
- `compliance-plugin-pattern` — `ITaxProvider` contract.
- `gst-irn-einvoice` — IN counterpart (GST + IRN).
- `money-type-multicurrency` — for all monetary fields.
- `us-accounts-gaap-1099` — invoice posting consumes the tax result.
- ULP_LLD_M18_US_SalesTaxReturns_v1.0.docx — full LLD reference.
- ULP_VendorIntegrationCatalog_v2.0.docx §4.1 — Avalara integration details.
