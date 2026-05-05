# ULP M7: Procurement LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** 4

**Sources:** HLD §9.1 ("Purchase orders, receipts") · DBD §4 — **M7 = 11 tables, +country_code on PO, RFQ** · M3 (vendor) · M8 (GRN) · M17 (vendor invoice posting)

## 1. Purpose
Buy-side: vendor RFQs, purchase orders, goods receipts, invoice matching, returns. Different from M14 (sell-side rates).

## 2. Database — 11 tables (matches DBD §4)

```sql
CREATE TABLE m7_purchase_request   (id, tenant_id, country_code CHAR(2), pr_number, requested_by, department, status ENUM('Draft','Submitted','Approved','Rejected','Closed'), needed_by, …);
CREATE TABLE m7_purchase_request_line (id, pr_id, line_no, product_id, description, quantity, uom_code, estimated_unit_price_amount, estimated_unit_price_currency);
CREATE TABLE m7_rfq                (id, tenant_id, country_code CHAR(2), rfq_number, due_date, status, scope_pr_id);
CREATE TABLE m7_rfq_recipient      (id, rfq_id, vendor_party_id, sent_at_utc, response_status);
CREATE TABLE m7_rfq_response       (id, rfq_id, vendor_party_id, total_amount, total_currency, valid_until, document_id);
CREATE TABLE m7_purchase_order     (id, tenant_id, country_code CHAR(2), po_number, vendor_party_id, status ENUM('Draft','Approved','Sent','PartialReceipt','Closed','Cancelled'), …);
CREATE TABLE m7_purchase_order_line (id, po_id, line_no, product_id, description, quantity_ordered, quantity_received, uom_code, unit_price_amount, unit_price_currency);
CREATE TABLE m7_goods_receipt      (id, tenant_id, po_id, grn_number, received_at_utc, received_by, m8_grn_id, status);
CREATE TABLE m7_goods_receipt_line (id, gr_id, po_line_id, quantity_received, condition, remarks);
CREATE TABLE m7_invoice_match      (id, tenant_id, po_id, vendor_invoice_id, match_status ENUM('ThreeWayMatched','PriceVariance','QtyVariance','NoPO','Disputed'), variance_amount, variance_currency, matched_by, matched_at_utc);
CREATE TABLE m7_audit              (id, tenant_id, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

**Total: 11 tables** ✅ matches DBD §4.

## 3. Sign-off
| Version | Date | Change | 1.0 | 2026-05-XX | Initial draft. 11 tables. |
