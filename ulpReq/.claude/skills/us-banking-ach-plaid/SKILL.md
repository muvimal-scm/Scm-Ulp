---
name: us-banking-ach-plaid
description: ULP v2.0 US banking — NACHA ACH origination, Plaid bank account link + transaction aggregation, BAI2 statement ingestion, Fedwire/SWIFT for high-value, OFAC screening, NACHA returns handling. Use when implementing M19-US Banking workflows. Implements IBankingProvider for US tenants. Parallel to NACH/IMPS/RTGS in IN. Heavy compliance overhead — NACHA Operating Rules + OFAC required.
---

# US Banking — ACH (NACHA) + Plaid + BAI2 for ULP v2.0

## When this skill triggers
Originating ACH credits/debits, linking customer bank accounts via Plaid, ingesting BAI2 daily statements, handling NACHA returns, sending Fedwire/SWIFT for high-value, OFAC sanctions screening. Module M19-US.

## Top 3 reference repos
1. **moov-io/ach** (https://github.com/moov-io/ach) — NACHA file builder + parser. Clean, well-tested. The reference for ACH file format.
2. **plaid/plaid-node** + **plaid/plaid-go** + **plaid/plaid-python** — Official Plaid SDKs. Read /docs/auth and /docs/transactions.
3. **moov-io/bai2** (https://github.com/moov-io/bai2) — BAI2 parser; useful reference for statement ingestion structure.

## NACHA ACH file structure

ULP generates ACH origination files daily and submits to its ACH partner bank (which acts as ODFI — Originating Depository Financial Institution). File hierarchy:

```
File Header (Type 1)
  └── Batch Header (Type 5)
       └── Entry Detail (Type 6)
       └── Entry Detail (Type 6)
       └── Addenda (Type 7) — optional
       └── ...
       └── Batch Control (Type 8)
  └── (more batches)
File Control (Type 9)
```

Standard Entry Class (SEC) codes ULP uses:
| SEC | Use |
|---|---|
| `PPD` | Prearranged payment + deposit (consumer); payroll, rent, recurring |
| `CCD` | Corporate credit/debit; B2B |
| `WEB` | Internet-initiated consumer (one-time or recurring) |
| `TEL` | Telephone-initiated consumer |
| `IAT` | International ACH |

## Standard ULP flow (payroll batch)

```
M20-US Payroll computes net pay per employee
  → M19-US receives `BankingTransferRequest` with ACH instructions
  → M19-US groups into a NACHA batch with SEC=PPD
  → File transmitted to ODFI partner bank (SFTP / API)
  → ODFI returns ack (file accepted) or NACHA return file
  → Returns matched against original entries; failed payments flagged for re-issue
  → M17-US books bank entries on settlement date
```

## IBankingProvider implementation (US)

```csharp
public sealed class AchBankingProvider : IBankingProvider
{
    private readonly INachaFileWriter _nacha;       // moov-io/ach equivalent in .NET
    private readonly IOdfiClient _odfi;             // partner bank SFTP/API
    private readonly IPlaidClient _plaid;
    private readonly IOfacScreener _ofac;
    private readonly ILogger<AchBankingProvider> _log;

    public async Task<BankingFileResult> GenerateOutboundFileAsync(
        IReadOnlyList<BankingTransfer> transfers, CancellationToken ct)
    {
        // 1. OFAC-screen every payee (reject + alert if hit)
        foreach (var t in transfers)
        {
            var hit = await _ofac.ScreenAsync(t.PayeeName, t.PayeeCountry, ct);
            if (hit.IsMatch) throw new OfacBlockException(t, hit);
        }

        // 2. Build NACHA file
        var file = _nacha.NewFile(originatorEin: ResolveOriginatorEin(_tenant));
        var batch = file.NewBatch(serviceClassCode: "200" /* mixed */, secCode: "PPD");
        foreach (var t in transfers)
        {
            batch.AddEntry(new NachaEntry
            {
                TransactionCode = t.Direction == TransferDirection.Credit ? "22" : "27",
                ReceivingDfi    = t.RoutingNumber,
                AccountNumber   = t.AccountNumber,
                Amount          = t.Amount.Amount,           // dollars; NACHA stores cents
                IndividualName  = t.PayeeName,
                TraceNumber     = NextTraceNumber()
            });
        }
        batch.Build();
        file.Build();

        // 3. Transmit to ODFI
        var ack = await _odfi.TransmitAsync(file.ToBytes(), ct);
        return new BankingFileResult(ack.FileId, ack.SettlementDate);
    }

    public async Task<IReadOnlyList<BankingReturn>> IngestReturnsAsync(
        Stream nachaReturnFile, CancellationToken ct)
    {
        var parsed = _nacha.Parse(nachaReturnFile);
        return parsed.ReturnEntries.Select(r => new BankingReturn
        {
            OriginalTraceNumber = r.OriginalTraceNumber,
            ReturnReasonCode    = r.ReturnReasonCode,           // R01 NSF, R02 Account Closed, R03 No Account, etc.
            Amount              = new Money(r.Amount, "USD"),
            ReceivedAt          = Clock.GetCurrentInstant()
        }).ToList();
    }

    public Task<bool> SupportsAsync(string country, CancellationToken ct)
        => Task.FromResult(country == "US");
}
```

## Plaid integration (account verification + transaction aggregation)

```typescript
// Frontend: Plaid Link
const link = Plaid.create({
  token: linkToken,                          // from POST /banking/plaid/link-token
  onSuccess: async (publicToken, metadata) => {
    await api.post('/banking/plaid/exchange', { publicToken });
  }
});
link.open();
```

```csharp
// Backend: exchange + persist access_token
public async Task<PlaidLinkResult> ExchangeAsync(string publicToken, CancellationToken ct)
{
    var resp = await _plaid.ItemPublicTokenExchangeAsync(new() { PublicToken = publicToken }, ct);
    // Encrypt access_token with tenant-scoped key before persistence
    var encrypted = await _crypto.EncryptAsync(_tenant.TenantId, resp.AccessToken, ct);
    await _repo.UpsertPlaidItemAsync(_tenant.TenantId, resp.ItemId, encrypted, ct);
    return new PlaidLinkResult(resp.ItemId);
}
```

Pull transactions on schedule via `/transactions/sync` — incremental cursor-based.

## BAI2 statement ingestion

```
File Header  (01)
  Group Header (02)
    Account Identifier (03)
      Transaction Detail (16)
      Transaction Detail (16)
    Account Trailer (49)
  Group Trailer (98)
File Trailer (99)
```

ULP ingests daily BAI2 file from each linked bank account; reconciles transactions; matches against expected entries (outbound ACH, expected receipts).

## NACHA Operating Rules — non-negotiable obligations
1. Authorisation on file for every consumer ACH (CPT or signed authorization).
2. Reconciliation of returns — NACHA target return rates: Unauthorized < 0.5%, Administrative < 3.0%, Overall < 15.0%.
3. Settlement date precision — funding date matters for liability.
4. Same-day ACH cutoffs (10:30 AM, 2:45 PM, 4:45 PM ET) — submitting late delays settlement.
5. Annual NACHA audit (third-party) — required for ODFI; ULP-as-Originator inherits some obligations.

## OFAC screening
- Every payee + every payer screened against OFAC SDN list before any ACH is created.
- A match BLOCKS the transaction; manual review required.
- Periodic rescan of existing customer base (weekly) on updated list.

## DO and DON'T

| DO | DON'T |
|---|---|
| OFAC-screen before file build | Don't OFAC-screen after submission |
| Use `Money` for all amounts (USD) | Don't use bare `decimal` |
| Encrypt Plaid `access_token` per tenant | Don't store plaintext |
| Use idempotent `request_id` on outbound | Don't allow duplicate file generation |
| Reconcile returns within 24h | Don't let returns sit in DLQ |
| Validate routing number checksum | Don't trust user-provided RTN |
| Mask account numbers in logs (last 4 only) | Don't log full account number |
| Track NACHA return rates monthly | Don't ignore — NACHA fines apply |

## NACHA return reason codes (most common)
| Code | Meaning |
|---|---|
| R01 | Insufficient Funds |
| R02 | Account Closed |
| R03 | No Account / Unable to Locate Account |
| R04 | Invalid Account Number Structure |
| R07 | Authorization Revoked by Customer (60 days) |
| R10 | Customer Advises Not Authorized (60 days) |
| R29 | Corporate Customer Advises Not Authorized |

## Common pitfalls
- Forgetting RDFI/ODFI distinction — ULP is Originator; the bank is ODFI.
- Mishandling same-day ACH vs next-day ACH cutoffs.
- Not honouring R07/R10 — re-presenting a revoked authorization is a NACHA violation.
- Storing routing/account in `m19us_bank_account` without encryption.
- Plaid `ITEM_LOGIN_REQUIRED` ignored; account becomes stale.

## Integration with IBankingProvider contract tests

Both `NachBankingProvider` (IN) and `AchBankingProvider` (US) inherit `BankingProviderContractTests`:
```csharp
[Fact] public async Task Generate_ProducesValidFile() { ... }
[Fact] public async Task Generate_OfacScreensEveryPayee() { ... }
[Fact] public async Task Ingest_ParsesReturnsCorrectly() { ... }
[Fact] public async Task Generate_IsIdempotent() { ... }
// ~14 shared assertions
```

## See also
- `compliance-plugin-pattern` — `IBankingProvider` contract.
- `money-type-multicurrency` — for all monetary fields.
- `multi-region-tenant-context` — for tenant US-pinning.
- `us-accounts-gaap-1099` — settlement bookings consume banking events.
- `us-payroll-fica-w2-941` — payroll generates ACH requests.
- ULP_LLD_M19_US_Banking_v1.0.docx — full LLD reference.
- ULP_VendorIntegrationCatalog_v2.0.docx §4.2 — Plaid integration details.
