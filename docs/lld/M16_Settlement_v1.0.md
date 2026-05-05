# ULP M16: Settlement LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** 4

**Sources:** HLD §9.1 ("AR/AP settlements, ageing, dunning") · DBD §4 — **M16 = 9 tables, +country_code on settlement runs** · M17 (general ledger) · M19/M19-US (banking)

## 1. Purpose
AR/AP settlement: matching customer payments to invoices, vendor payments to bills, dunning workflows for overdue receivables, ageing reports.

## 2. Database — 9 tables (matches DBD §4)
```sql
CREATE TABLE m16_settlement_run    (id, tenant_id, country_code CHAR(2), run_number, run_type ENUM('AR','AP'), period_start, period_end, status ENUM('Draft','Posted','Reversed'), created_at_utc, posted_at_utc, posted_by);
CREATE TABLE m16_ar_match          (id, settlement_run_id, customer_party_id, invoice_id, payment_id, matched_amount_amount, matched_amount_currency, matched_at_utc, status ENUM('Open','PartiallyMatched','Matched','Reversed'));
CREATE TABLE m16_ap_match          (id, settlement_run_id, vendor_party_id, vendor_invoice_id, payment_id, matched_amount_amount, matched_amount_currency, matched_at_utc, status);
CREATE TABLE m16_aging_bucket      (id, tenant_id, run_id, party_id, bucket ENUM('NotDue','0-30','31-60','61-90','91-180','181+'), amount_amount, amount_currency, item_count);
CREATE TABLE m16_dunning_letter    (id, tenant_id, customer_party_id, level ENUM('Reminder','FirstNotice','FinalNotice','Legal'), sent_at_utc, document_id, total_overdue_amount, total_overdue_currency);
CREATE TABLE m16_writeoff          (id, tenant_id, ar_match_id, written_off_amount, written_off_currency, reason, approved_by, approved_at_utc);
CREATE TABLE m16_deposit           (id, tenant_id, party_id, deposit_amount, deposit_currency, received_at_utc, applied_to_ar_match_id, status);
CREATE TABLE m16_reversal          (id, tenant_id, original_match_id, original_match_type ENUM('AR','AP'), reversed_amount, currency, reason, reversed_by, reversed_at_utc);
CREATE TABLE m16_audit             (id, tenant_id, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

**Total: 9 tables** ✅ matches DBD §4.

## 3. Sign-off
| 1.0 | 2026-05-XX | Initial draft. 9 tables. |
