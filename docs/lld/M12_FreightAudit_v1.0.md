# ULP M12: Freight Audit & Payment LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** 4

**Sources:** HLD §9 · DBD §4 — **M12 = 11 tables, +country_code on audit** · M14 (rate cards), M5 (charges), M17 (payment posting)

## 1. Purpose
Verify carrier invoices against contracted rates. Catch overcharges, duplicate billing, rate-card mismatches. Post approved invoices to M17 for payment.

## 2. Database — 11 tables (matches DBD §4)
```sql
CREATE TABLE m12_carrier_invoice   (id, tenant_id, country_code CHAR(2), invoice_number, carrier_party_id, invoice_date, total_amount, total_currency, status ENUM('Received','UnderAudit','Approved','Disputed','Rejected','Paid'), source_document_id, …);
CREATE TABLE m12_carrier_invoice_line (id, carrier_invoice_id, charge_code, shipment_id, container_id, billed_amount, billed_currency, billed_quantity, uom_code);
CREATE TABLE m12_audit_run         (id, tenant_id, carrier_invoice_id, started_at_utc, completed_at_utc, status, total_findings, total_savings_amount, total_savings_currency);
CREATE TABLE m12_finding           (id, audit_run_id, carrier_invoice_line_id, finding_type ENUM('Overcharge','RateMismatch','DuplicateLine','MissingProof','UnauthorizedCharge'), expected_amount, expected_currency, variance_amount, variance_currency, severity);
CREATE TABLE m12_dispute           (id, tenant_id, carrier_invoice_id, raised_at_utc, raised_by, dispute_reason, status ENUM('Open','InProgress','ResolvedPaid','ResolvedAdjusted','Withdrawn'));
CREATE TABLE m12_dispute_response  (id, dispute_id, response_at_utc, response_by_party_id, content, attachments_doc_ids JSON);
CREATE TABLE m12_payment_batch     (id, tenant_id, batch_number, total_amount, total_currency, status, scheduled_payment_date, posted_to_m17 TINYINT);
CREATE TABLE m12_payment_batch_line (id, payment_batch_id, carrier_invoice_id, amount_to_pay, currency);
CREATE TABLE m12_audit_rule        (id, tenant_id, country_code CHAR(2), rule_name, charge_code, expected_source, tolerance_pct, severity, is_active);
CREATE TABLE m12_savings_summary   (id, tenant_id, period_start, period_end, total_audited_amount, total_recovered_amount, currency, computed_at_utc);
CREATE TABLE m12_audit             (id, tenant_id, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

**Total: 11 tables** ✅ matches DBD §4.

## 3. Sign-off
| 1.0 | 2026-05-XX | Initial draft. 11 tables. |
