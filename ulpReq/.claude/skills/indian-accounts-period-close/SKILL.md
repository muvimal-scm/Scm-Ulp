---
name: indian-accounts-period-close
description: Indian accounts and period close patterns for ULP M17 - GL postings, financial year (Apr-Mar), period close immutability, TDS/TCS, GSTR-1/3B/9 reconciliation, dunning, AR/AP ageing, journal posting rules. Use when implementing GL transactions, period close logic, tax computations, statutory return generation, or any code in Backend/M17.Accounts/. Covers Indian Accounting Standards (Ind AS), Income Tax Act sections, GST returns reconciliation, audit trail (Section 138), and 8-year retention rules.
---

# Indian Accounts + Period Close for ULP M17

## When this skill triggers
Working on M17 Accounts module - GL postings, journal entries, period close, statutory returns (GSTR-1/3B/9, TDS), dunning, ageing reports, or any code in `Backend/M17.Accounts/`.

## Top 3 reference sources
1. **Ministry of Corporate Affairs (mca.gov.in)** — Indian Accounting Standards (Ind AS) authoritative source. Companies (Indian Accounting Standards) Rules 2015 and amendments.
2. **incometax.gov.in** — Income Tax Act, TDS rates, return filing procedures. Section 44AA (books retention 8 years), Section 138 (audit trail mandate).
3. **gst.gov.in** — GST returns specifications (GSTR-1, 3B, 9, 9C), reconciliation rules, e-invoicing → return auto-populate.

## Critical ULP patterns

### Indian Financial Year (FY)
```
FY runs: 1 April to 31 March
Naming: "FY 2026-27" = Apr 2026 to Mar 2027
Quarter: Q1 (Apr-Jun), Q2 (Jul-Sep), Q3 (Oct-Dec), Q4 (Jan-Mar)

ULP master:
- All financial reports use FY axis (not calendar year)
- Period table: 12 months per FY + 4 quarter periods + 1 annual period
- Period close cascades: month -> quarter -> annual

Date helpers:
- FY of date d: if d.Month >= 4 then d.Year else d.Year-1
- FY year string: f"FY {fy}-{(fy+1) % 100:02d}"
- Quarter: q = ((d.Month - 4 + 12) % 12) // 3 + 1
```

### General Ledger structure
```
Chart of Accounts (CoA): per-tenant configurable, derived from standard CoA template

Account types:
1. Assets (Current, Non-Current)
2. Liabilities (Current, Non-Current)
3. Equity (Capital, Retained Earnings, Reserves)
4. Income (Operating, Other)
5. Expenses (COGS, Operating, Other)

Account hierarchy: 5-level (e.g., Assets > Current Assets > Trade Receivables > Domestic > Customer-X)

Mandatory standard accounts:
- 1000 Cash, 1100 Bank, 1200 AR, 1300 Inventory, 1400 GST Input
- 2000 AP, 2100 GST Output, 2200 TDS Payable, 2300 Loans
- 3000 Capital, 3100 Retained Earnings
- 4000 Sales Revenue, 4100 Service Revenue
- 5000 COGS, 5100 Salaries, 5200 Rent, 5300 Depreciation

Posting rules:
- Every transaction is balanced (sum of debits = sum of credits)
- All amounts in INR (functional currency); FX gain/loss for non-INR
- TenantId mandatory on every line
- Audit columns: created_by, created_at, posted_by, posted_at, reversed_by, reversed_at
```

### Period close immutability (CRITICAL)
```
Periods have status:
- Open: transactions can be posted
- Closed: NO posting allowed (locked)
- Closing-In-Progress: transitional (closing journals being posted)
- Reopened: rare; requires audit approval

Once closed:
- No new journals
- No journal modifications
- No journal reversals (must use reversing entry in CURRENT period)

ULP enforcement (database + application):
1. Database trigger: BEFORE INSERT/UPDATE on m17_journal -> check period status
2. Application: PostingService.PostAsync() -> validates period status
3. UI: form shows "Period Closed" warning + disables Save

Reopen workflow:
- Requires reason + 2-person approval (CFO + Auditor)
- Logs audit trail in m17_period_audit
- All reopen events visible on M21 (Audit) dashboard
```

### Period close checklist (M17 wizard)
```
Pre-close validations (must pass):
[ ] All sales invoices for period are Issued (not Draft)
[ ] All purchase invoices for period are Approved
[ ] Bank reconciliation completed for period
[ ] Stock count adjustments posted (M8)
[ ] Depreciation auto-posted for period
[ ] Provisions posted (bad debt, gratuity, leave)
[ ] Accruals posted (electricity, telephone, audit fee)
[ ] Prepaid expenses amortized
[ ] Inter-company transactions reconciled
[ ] FX revaluation posted (for foreign currency balances)
[ ] TDS computed + journal posted
[ ] GST liability journal posted (output - input)

Closing journals:
- Close revenue accounts -> P&L
- Close expense accounts -> P&L
- Close P&L -> Retained Earnings (year-end only)

Generate:
- Trial Balance
- Balance Sheet
- Profit & Loss
- Cash Flow Statement (year-end only)

Final lock:
- Period status -> Closed
- Audit trail logged
- Reports archived (PDF + JSON to immutable storage)
```

### TDS (Tax Deducted at Source)
```
Common sections + rates (FY 2026-27):
194C  - Contractor (TDS 1% if individual, 2% if company)
194I  - Rent (TDS 10% on building, 2% on plant/machinery)
194J  - Professional fees (TDS 10%, 2% for technical services)
194Q  - Purchase > ₹50L (TDS 0.1%)
194O  - E-commerce (TDS 1%)
194T  - Partner remuneration (NEW from FY 25-26: TDS 10% on >₹20K/year)

Workflow:
1. On purchase invoice: auto-detect applicable section (vendor type + service type)
2. Compute TDS amount
3. On payment: deduct TDS from vendor payment
4. Credit to TDS Payable account
5. File quarterly TDS return (24Q for salary, 26Q for other)
6. Issue Form 16/16A to vendor
7. Pay TDS to Govt by 7th of following month

ULP M17 must:
- Master: vendor TDS section + threshold
- Auto-deduct on payment posting
- Quarterly TDS return generator (Form 26Q schema)
- Form 16A PDF generator
- TDS challan tracking (CIN/BIN)
```

### GST returns reconciliation
```
GSTR-1: Outward supplies (sales) - filed monthly by 11th
GSTR-2A/2B: Inward supplies auto-populated from supplier GSTR-1
GSTR-3B: Summary monthly return - filed by 20th
GSTR-9: Annual return
GSTR-9C: Annual reconciliation (audit) for AATO > ₹5cr

ULP M17 reconciliation:
- Match GSTR-2B (govt) vs purchase register (ULP M17)
- Variance flags: not in GSTR-2B (supplier delay), in GSTR-2B but not in ULP, amount mismatch
- ITC eligibility: only claim ITC where supplier filed GSTR-1
- Hangfire job: nightly fetch GSTR-2B; reconcile; flag differences

Pre-GSTR-3B filing checklist:
[ ] All sales invoices issued + IRN generated
[ ] GSTR-1 prepared + accepted
[ ] Purchase invoices reconciled with GSTR-2B
[ ] ITC computed (eligible only)
[ ] GST liability journal posted
[ ] Cash payment journal (RCM, late fees) posted
[ ] GSTR-3B preview generated; figures match books
```

### AR/AP Ageing
```
Standard buckets:
- Not due (within credit period)
- 0-30 days overdue
- 31-60 days
- 61-90 days
- 91-180 days
- > 180 days

Provision for bad debts:
- > 6 months: 50% provision (suggested; tenant-configurable)
- > 1 year: 100% provision

ULP M17 ageing report:
- Run on date X (default: today)
- Group by customer (AR) / vendor (AP)
- Hyperlink each row to invoice list
- Export to Excel with subtotals
```

### Dunning (collection follow-up)
```
Stage 1 (1-7 days overdue): Soft reminder email
Stage 2 (8-30 days): Firm email + phone call
Stage 3 (31-60 days): Formal demand letter
Stage 4 (61-90 days): Sales/AM escalation
Stage 5 (>90 days): Legal hand-over

ULP M17 (dunning module):
- Per-customer dunning calendar
- Hangfire daily job: scan invoices -> match dunning stage -> send notifications
- Templates: Email/SMS/WhatsApp per stage
- Escalation: auto-email manager on stage transition
- Snooze: AM can snooze a customer for N days (with reason)
- Dispute: flag invoice as disputed; pause dunning until resolved
```

### Audit trail (Section 138 mandate)
```
Companies (Accounts) Rules 2014, amended 2022:
- All companies using accounting software MUST have edit log feature
- Mandatory from 1 April 2023 (extended from earlier dates)

Required:
- Every transaction logged
- Edit history retained
- No deletion of records (only reversal entries)
- Audit log visible to auditors

ULP enforcement:
- All M17 entities have audit columns (created/modified/posted)
- m17_journal -> m17_journal_edit_log captures every change
- Reversal entries instead of UPDATEs/DELETEs on posted journals
- WORM storage of period-close PDFs (immutable for 8 years)
```

### Books retention (8 years)
```
Income Tax Act Section 44AA: 8 years from end of relevant FY
GST Act Section 35: 6 years from end of FY

ULP retention policy: 8 years (max of both)
- Active data: in MySQL
- Year+1 to year+3: hot storage (queryable)
- Year+4 to year+8: cold archive (Azure Cool Blob or equivalent)
- After year+8: optional purge (per tenant policy)

Period-close PDFs (Trial Balance, P&L, BS, GSTR returns):
- Stored in WORM blob storage
- Retention: 8 years minimum
- Auditor access via M17 reports archive
```

## Critical gotchas

### Period close is non-negotiable
- Once closed: NO modifications. Period.
- Errors discovered post-close: reversing entry in current open period.
- Reopen requires CFO + Auditor approval; logged.

### TDS thresholds change yearly
- Refresh master annually after Budget announcement (Feb of each year).
- Threshold examples: 194C ₹30K single bill / ₹1L aggregate, 194Q ₹50L purchase aggregate.

### GST input credit time-bar
- ITC must be claimed by 30th November of next FY (or annual return filing, whichever earlier).
- Unclaimed ITC = lost.
- ULP M17 alert: 60 days before deadline if any unclaimed ITC.

### Reverse charge (RCM)
- Buyer pays GST on certain inward supplies (legal services, GTA, sponsorship, Govt services).
- Pay via cash ledger; cannot offset with ITC.
- Special handling in GSTR-3B Table 3.1(d).
- ULP must auto-detect RCM-applicable purchases.

### MFA mandate (April 2026)
- 2FA mandatory for GST portal + IRP access.
- Affects: GSTR filing automation, IRN generation.
- ULP supports OTP-based MFA flow for human users.

### FX revaluation
- Foreign currency balances revalued at period-end at closing rate.
- Unrealized gain/loss to P&L (or OCI for hedging).
- Realized gain/loss on settlement to P&L.

### Reversing entries vs adjustments
- Reversing entry: same amount, opposite sign in next period.
- Used for accruals (e.g., Mar accrual reversed Apr 1, then actual recorded).
- ULP M17 supports auto-reverse flag on journal lines.

### Forex regulation (FEMA)
- All foreign currency receipts must be repatriated within 9 months.
- ULP M17 must track BRC (Bank Realization Certificate) per export invoice.
- Outstanding > 9 months: alert + RoDTEP recovery risk.

## ULP companion docs
- ULP_LLD_M17_v1.0_Accounts.docx (full module spec - 58 pages)
- ULP_DomainReferenceLibrary_v3.0.docx Section 5 (Accounts + GST domain)
- ULP_DBD_v1.0_DatabaseDesign.docx (m17_* schemas)
