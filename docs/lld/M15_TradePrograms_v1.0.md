# ULP M15: DGFT (IN) / Trade Programs (US) LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** 3

**Sources:** HLD §9.2 · DBD §4 — **M15 = 12 tables (IN), m15us = 4 NEW tables (C-TPAT, FAST tracking)** · India DGFT regulations · US Trade Programs (C-TPAT, FAST, Trusted Trader)

> Tier-B with country plugins. Indian DGFT schemes are India-specific (RoDTEP, EPCG, Advance Authorization, IEC). US Trade Programs are different (C-TPAT, FAST) and tracked separately in `m15us_*`.

## 1. Database — 12 IN + 4 US tables = 16 total (matches DBD §4)

### India (m15_*)
```sql
CREATE TABLE m15_iec               (id, tenant_id, party_id, iec_code, issued_at, status, last_modified_at_utc);
CREATE TABLE m15_scheme            (id, code ENUM('RODTEP','EPCG','ADVANCE_AUTH','EOU','SEZ','MEIS','SEIS'), name, description, valid_from, valid_to);
CREATE TABLE m15_scheme_application (id, tenant_id, scheme_id, application_number, applied_date, status, document_id);
CREATE TABLE m15_authorization     (id, tenant_id, scheme_id, authorization_number, party_id, valid_from, valid_to, total_value_amount, total_value_currency, used_value_amount);
CREATE TABLE m15_export_obligation (id, authorization_id, period_start, period_end, target_amount, achieved_amount, status ENUM('OnTrack','Behind','Met','Defaulted'));
CREATE TABLE m15_eodc              (id, authorization_id, applied_at_utc, status, document_id); -- Export Obligation Discharge Certificate
CREATE TABLE m15_rodtep_claim      (id, tenant_id, shipping_bill_id, claim_amount, claim_status, e_scrip_number);
CREATE TABLE m15_advance_auth      (id, authorization_id, input_norms JSON, value_addition_pct, sion_no);
CREATE TABLE m15_epcg              (id, authorization_id, capital_goods_imported_value, export_obligation_block_period_yrs);
CREATE TABLE m15_appendix          (id, country_code CHAR(2) DEFAULT 'IN', appendix_no, content_json); -- DGFT appendices
CREATE TABLE m15_dgft_filing       (id, tenant_id, filing_type, filed_at_utc, response_doc_id, status);
CREATE TABLE m15_audit             (id, tenant_id, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

### US (m15us_*)
```sql
CREATE TABLE m15us_ctpat_application (id, tenant_id, party_id, application_date, status, validation_date, expiry_date);
CREATE TABLE m15us_ctpat_security_profile (id, ctpat_application_id, security_criteria JSON, last_review_date_utc, reviewer);
CREATE TABLE m15us_fast_application (id, tenant_id, party_id, fast_id, valid_from, valid_to);
CREATE TABLE m15us_audit            (id, tenant_id, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

**Totals: m15 = 12** ✅, **m15us = 4** ✅ — matches DBD §4 exactly.

## 2. Sign-off
| 1.0 | 2026-05-XX | Initial draft. 12 IN + 4 US tables matching DBD §4. |
