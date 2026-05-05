---
name: gst-irn-einvoice
description: GST e-invoicing (IRN) for ULP M17 Accounts. Use when implementing IRN generation, e-invoice JSON schema construction, IRP API integration (NIC/IRIS/private IRPs), QR code embedding on PDF invoices, IRN cancellation (24-hour window), GSTR-1 auto-population, or any code in Backend/M17.Accounts/EInvoice/. Covers 2026-current rules - ₹5 crore turnover threshold (likely dropping to ₹2 crore), 30-day reporting deadline for ₹10cr+ AATO, JSON schema v1.1, error code handling, and MFA mandate from April 2026.
---

# GST e-Invoicing / IRN for ULP M17

## When this skill triggers
Working on M17 Accounts e-invoice path - IRP API client, IRN generation, e-invoice JSON construction, QR code rendering, cancellation, GSTR-1 sync, or any code in `Backend/M17.Accounts/EInvoice/`.

## Top 3 reference sources
1. **einvoice1.gst.gov.in** (https://einvoice1.gst.gov.in/) — Official NIC IRP. Authoritative for JSON schema (Form GST INV-01), error codes, and API documentation. Read API docs section.
2. **einv-apisandbox.nic.in** (https://einv-apisandbox.nic.in/) — Sandbox for testing. ULP integration tests run here. Has same schema as production.
3. **GSTN cleartax.in** (https://cleartax.in/s/e-invoicing-india) — Continuously updated reference for threshold changes, GSTR-1/3B linkage, and edge cases. Good FAQ.

## Critical ULP patterns

### When e-invoicing applies (2026)
```
Threshold: AATO > ₹5 crore in any FY from 2017-18 onwards
  (likely dropping to ₹2 crore in FY 2026-27)

Documents requiring IRN:
- B2B Tax Invoices
- Export Invoices
- Credit Notes (B2B)
- Debit Notes (B2B)
- SEZ supplies (with/without IGST)

NOT requiring IRN:
- B2C invoices (separate dynamic QR code rule for ₹500cr+ AATO)
- Bill of Supply (composition / exempt)
- ISD invoices
- Reverse charge invoices
- Self-invoices for unregistered purchases

Reporting deadline:
- ₹10 crore+ AATO: 30 days from invoice date (mandatory from 1 April 2026)
- Below ₹10cr: no fixed deadline (yet)
```

### IRN generation flow (ULP must implement exactly)
```
1. Invoice created in M17 with status = 'Draft'
2. User clicks 'Generate IRN'
3. ULP constructs e-invoice JSON per schema v1.1
4. POST to IRP /einvapi/v1.03/Invoice/Generate
   - Headers: AuthToken (6h cache), Encrypted-Payload (AES-256)
5. IRP validates:
   - GSTIN active (sender + recipient)
   - HSN code valid for the GSTIN's notified products
   - Tax math: line items × rates = totals (within ₹1 tolerance)
   - Duplicate IRN check (hash collision = duplicate)
6. IRP returns:
   - IRN (64-char hash)
   - Acknowledgement no + date
   - Digitally signed JSON
   - QR code (string format)
7. ULP stores all of above; updates invoice.status = 'Issued'
8. ULP renders PDF with IRN + QR code
9. ULP sends invoice to customer (email + WhatsApp + portal)
10. GSTR-1 auto-populates within 24h
```

### IRN hash formula
```
IRN = SHA256(<Supplier_GSTIN><Financial_Year><Doc_Type><Doc_Number>)

Where:
  Financial_Year = "YYYY-YY"  e.g. "2026-27"
  Doc_Type = "INV" | "CRN" | "DBN"
  Doc_Number = invoice number (trim leading 0/-/spaces)

Examples:
  Doc_Number "00234"   -> "234"
  Doc_Number "/A234"   -> "A234"
  Doc_Number "-0123/19" -> "123/19"

Returns 64-char hex string.
```

### E-invoice JSON schema (key sections)
```json
{
  "Version": "1.1",
  "TranDtls": {
    "TaxSch": "GST",
    "SupTyp": "B2B",      // B2B|SEZWP|SEZWOP|EXPWP|EXPWOP|DEXP
    "RegRev": "N",        // Reverse charge?
    "EcmGstin": null,     // E-commerce operator GSTIN if applicable
    "IgstOnIntra": "N"
  },
  "DocDtls": {
    "Typ": "INV",         // INV|CRN|DBN
    "No": "INV-2026-04-001234",
    "Dt": "15/04/2026"    // dd/MM/yyyy
  },
  "SellerDtls": {
    "Gstin": "27AAAAA1234A1Z5",
    "LglNm": "ULP TEST PVT LTD",
    "Addr1": "...",
    "Loc": "MUMBAI",
    "Pin": 400001,
    "Stcd": "27"          // State code
  },
  "BuyerDtls": {
    "Gstin": "29BBBBB5678B1Z3",
    "LglNm": "BUYER PVT LTD",
    "Pos": "29",          // Place of supply
    "Addr1": "...",
    "Loc": "BANGALORE",
    "Pin": 560001,
    "Stcd": "29"
  },
  "ShipDtls": { /* if different from BuyerDtls */ },
  "ItemList": [{
    "SlNo": "1",
    "PrdDesc": "Logistics service",
    "IsServc": "Y",
    "HsnCd": "996739",
    "Qty": 1,
    "Unit": "OTH",
    "UnitPrice": 100000,
    "TotAmt": 100000,
    "Discount": 0,
    "AssAmt": 100000,     // Assessable amount
    "GstRt": 18.00,
    "IgstAmt": 18000,     // For inter-state
    "CgstAmt": 0,         // For intra-state (split 9+9)
    "SgstAmt": 0,
    "CesRt": 0,
    "CesAmt": 0,
    "TotItemVal": 118000
  }],
  "ValDtls": {
    "AssVal": 100000,
    "CgstVal": 0,
    "SgstVal": 0,
    "IgstVal": 18000,
    "CesVal": 0,
    "RndOffAmt": 0,
    "TotInvVal": 118000,
    "TotInvValFc": 0      // Foreign currency value (export only)
  }
}
```

### Authentication flow (NIC IRP)
```csharp
// Backend/M17.Accounts/EInvoice/IrpClient.cs
public class NicIrpClient : IIrpClient
{
    private readonly HttpClient _http;
    private readonly IDistributedCache _cache;
    private readonly NicIrpOptions _opts;

    private async Task<(string Token, byte[] Sek)> GetAuthTokenAsync(CancellationToken ct)
    {
        const string cacheKey = "ulp:m17:irp:auth";
        var cached = await _cache.GetStringAsync(cacheKey, ct);
        if (cached is not null) return JsonSerializer.Deserialize<(string,byte[])>(cached);

        // Generate AppKey (32 bytes random)
        var appKey = RandomNumberGenerator.GetBytes(32);

        // Encrypt AppKey with IRP public key (RSA)
        var encryptedAppKey = EncryptWithIrpPublicKey(appKey);

        var body = new
        {
            UserName = _opts.GstinUserName,
            Password = _opts.Password,         // Encrypted with IRP public key
            AppKey = Convert.ToBase64String(encryptedAppKey),
            ForceRefreshAccessToken = "false"
        };

        var resp = await _http.PostAsJsonAsync("/einvapi/v1.03/auth", body, ct);
        var data = await resp.Content.ReadFromJsonAsync<AuthResponse>(ct);

        // SEK is encrypted with AppKey; decrypt to get session encryption key
        var sek = AesDecrypt(Convert.FromBase64String(data.Sek), appKey);

        // Token valid 6 hours; cache for 5h 50min
        await _cache.SetStringAsync(cacheKey,
            JsonSerializer.Serialize((data.AuthToken, sek)),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(350)
            }, ct);
        return (data.AuthToken, sek);
    }

    public async Task<IrnResponse> GenerateIrnAsync(EInvoiceJson invoice, CancellationToken ct)
    {
        var (token, sek) = await GetAuthTokenAsync(ct);

        // Encrypt payload with SEK (AES-256/ECB/PKCS7)
        var payloadJson = JsonSerializer.Serialize(invoice);
        var encryptedPayload = AesEncrypt(payloadJson, sek);

        using var req = new HttpRequestMessage(HttpMethod.Post, "/einvapi/v1.03/Invoice/Generate");
        req.Headers.Add("AuthToken", token);
        req.Headers.Add("user_name", _opts.GstinUserName);
        req.Headers.Add("Gstin", _opts.SupplierGstin);
        req.Content = new StringContent($"{{\"Data\":\"{encryptedPayload}\"}}", Encoding.UTF8, "application/json");

        var resp = await _http.SendAsync(req, ct);
        var data = await resp.Content.ReadFromJsonAsync<IrpEnvelope>(ct);

        // Decrypt response
        var decrypted = AesDecrypt(Convert.FromBase64String(data.Data), sek);
        return JsonSerializer.Deserialize<IrnResponse>(decrypted);
    }
}
```

### IRN cancellation (24-hour window)
```csharp
// Allowed only within 24 hours of generation
// After 24h: must issue Credit Note + new invoice
public async Task CancelIrnAsync(string irn, CancellationReason reason, string remarks, CancellationToken ct)
{
    var body = new
    {
        Irn = irn,
        CnlRsn = (int)reason,    // 1=Duplicate, 2=Data entry mistake, 3=Order cancelled, 4=Other
        CnlRem = remarks         // Max 100 chars
    };
    // POST /einvapi/v1.03/Invoice/Cancel
    // ...
}
```

### QR code rendering on PDF
```csharp
// Backend/M17.Accounts/EInvoice/QrCodeService.cs
using QRCoder;

public byte[] GenerateQrCode(string signedQrCodeString)
{
    using var qrGenerator = new QRCodeGenerator();
    using var qrCodeData = qrGenerator.CreateQrCode(signedQrCodeString, QRCodeGenerator.ECCLevel.M);
    using var qrCode = new PngByteQRCode(qrCodeData);
    return qrCode.GetGraphic(20);  // 20 pixels per module
}

// On invoice PDF (using QuestPDF), embed:
// - IRN (top-right header, font: monospace, 8pt)
// - Acknowledgement No + Date
// - QR code image (top-right, ~150x150px)
```

## Critical gotchas

### Pre-validation in ULP (before calling IRP)
- IRP returns errors expensively. Pre-validate in ULP:
  - GSTIN format regex
  - Tax math (line items × rates = totals within ₹1)
  - HSN code presence (mandatory if AATO > ₹5cr)
  - Place of Supply consistency with state codes
  - For exports: SupTyp = EXPWP/EXPWOP, ShipDtls present
- Catch ~80% of IRP failures before round-trip.

### MFA mandatory from April 2026
- 2-Factor authentication mandatory for IRP login.
- Mobile OTP-based; ULP must support OTP flow for human user setup.
- API integration uses public/private key pair (no MFA needed).

### 30-day reporting deadline (₹10cr+ AATO)
- From 1 April 2026: cannot report invoices older than 30 days.
- ULP must auto-trigger IRN generation within 30 days.
- Hangfire job: daily check for `invoice_issued AND irn_generated_at IS NULL AND age > 25 days` -> alert.

### Common IRP error codes ULP must handle
```
2150 - Duplicate IRN (already generated for same invoice)
2169 - Invalid Buyer GSTIN (inactive/blocked)
2172 - Invalid Place of Supply
2194 - Total item value mismatch (>₹1 tolerance)
2233 - HSN code not notified for the supplier's turnover bracket
2234 - CGST/SGST amount mismatch
2235 - IGST amount mismatch
3001 - Auth token expired
3028 - Invalid sequence in invoice number
```

### Inter-state vs intra-state tax split
- Same state buyer/seller: CGST + SGST (each = GstRt/2)
- Different states: IGST = full GstRt
- ULP service must derive from `BuyerDtls.Stcd` vs `SellerDtls.Stcd`.

### ₹1 tolerance on totals
- IRP allows ₹1 rounding tolerance on TotItemVal.
- Implementation: use `decimal` with 2 decimal places, round-half-up.
- Invoice level: TotInvVal must equal sum of TotItemVal ± ₹1.

### IRN cannot be edited (post-generation)
- Once IRN generated: only cancel (within 24h) or issue Credit Note.
- After 24h cancel window: cancel attempt fails; must Credit Note.

### B2C ≥ ₹500cr AATO requires dynamic QR (separate scheme)
- Different from IRN; QR has UPI VPA + amount.
- ULP includes flag `customer.requires_dynamic_qr` for this.

### Multiple IRPs for redundancy
- NIC IRP1 (einvoice1.gst.gov.in) - primary
- NIC IRP2 (einvoice2.gst.gov.in) - secondary
- Private IRPs: IRIS, ClearTax, GSTHero
- ULP should fail-over: try primary, on 5xx fall back to secondary.

## ULP companion docs
- ULP_LLD_M17_v1.0_Accounts.docx Section 4.7 (E-invoicing)
- ULP_DomainReferenceLibrary_v3.0.docx Section 5 (GST domain)
- ULP_DBD_v1.0_DatabaseDesign.docx (m17_invoice, m17_irn_log schemas)
