# ULP M11: Hazmat LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** Future

**Sources:** HLD §9 · DBD §4 — **M11 = 8 tables, +country_code on hazmat records** · IATA DGR / IMDG / 49CFR (US) · M5/M13/M8 (consumers)

## 1. Purpose
Dangerous-goods cargo compliance: UN classification, declaration generation, packing certification, training records, segregation rules.

## 2. Database — 8 tables (matches DBD §4)
```sql
CREATE TABLE m11_un_substance      (un_number CHAR(4) PK, proper_shipping_name VARCHAR(255), class, division, packing_group, label_codes JSON);
CREATE TABLE m11_hazmat_item       (id, tenant_id, country_code CHAR(2), product_id BIGINT, un_number, class, packing_group, packing_instructions, label_codes JSON, marine_pollutant TINYINT, ems_codes);
CREATE TABLE m11_dgd               (id, tenant_id, country_code CHAR(2), dgd_number, mode ENUM('AIR','OCEAN','ROAD','RAIL'), shipment_id, status, document_id BIGINT); -- DG Declaration
CREATE TABLE m11_dgd_line          (id, dgd_id, hazmat_item_id, quantity, packaging, ems);
CREATE TABLE m11_segregation_rule  (id, country_code CHAR(2), class_a, class_b, segregation_code, applies_to_mode ENUM('AIR','OCEAN','ROAD','RAIL'));
CREATE TABLE m11_dg_training       (id, tenant_id, user_id, course_code, valid_from, valid_to, certificate_doc_id);
CREATE TABLE m11_emergency_contact (id, tenant_id, country_code CHAR(2), purpose, name, phone, available_24x7 TINYINT);
CREATE TABLE m11_audit             (id, tenant_id, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

**Total: 8 tables** ✅ matches DBD §4.

## 3. Sign-off
| 1.0 | 2026-05-XX | Initial draft. 8 tables. |
