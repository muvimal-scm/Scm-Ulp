# ULP M22: Quality Management LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** 4

**Sources:** HLD §9.1 ("Inspections, NCR") · DBD §4 — **M22 = 8 tables, no country_code change** · M3 (vendor NCR linkage) · M8 (warehouse inspections)

## 1. Purpose
Quality inspections (inbound, in-process, outbound). Non-conformance reports (NCR). Corrective and preventive actions (CAPA).

## 2. Database — 8 tables (matches DBD §4)
```sql
CREATE TABLE m22_inspection_template (id, tenant_id, code, name, applicable_to ENUM('GOODS','SERVICE','PROCESS'), is_active);
CREATE TABLE m22_inspection_check    (id, template_id, sequence, check_name, check_type ENUM('VISUAL','MEASUREMENT','TEST','PHOTO','SIGNATURE'), expected_value, tolerance);
CREATE TABLE m22_inspection          (id, tenant_id, template_id, related_module VARCHAR(10), related_entity_id BIGINT, inspector_user_id, inspected_at_utc, overall_result ENUM('Pass','PassWithObservations','Fail'));
CREATE TABLE m22_inspection_result   (id, inspection_id, check_id, actual_value, result ENUM('Pass','Fail','NA'), photo_doc_id, notes);
CREATE TABLE m22_ncr                 (id, tenant_id, ncr_number, raised_at_utc, raised_by, severity ENUM('Low','Medium','High','Critical'), category, description, status ENUM('Open','InvestigationStarted','InProgress','Resolved','Closed'), m3_ncr_id BIGINT); -- link to vendor NCR if applicable
CREATE TABLE m22_capa                (id, ncr_id, action_type ENUM('Corrective','Preventive'), action_description, owner_user_id, target_date, status, completed_at_utc, completion_evidence_doc_id);
CREATE TABLE m22_calibration         (id, tenant_id, instrument_code, last_calibrated_date, next_calibration_date, certificate_doc_id, calibrated_by);
CREATE TABLE m22_audit               (id, tenant_id, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

**Total: 8 tables** ✅ matches DBD §4.

## 3. Sign-off
| 1.0 | 2026-05-XX | Initial draft. 8 tables. |
