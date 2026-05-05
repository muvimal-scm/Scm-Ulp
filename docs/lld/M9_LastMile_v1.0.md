# ULP M9: Last-Mile Delivery LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** 4

**Sources:** HLD §9 (last-mile under transport) · DBD §4 — **M9 = 14 tables, +country_code on routes, stops** · M13 (overlap; M9 = last-leg only)

## 1. Purpose
Last-leg domestic / international courier. Pickup scheduling, route optimisation, manifest, POD, COD, weight reconciliation, domestic billing.

## 2. Database — 14 tables (matches DBD §4)

```sql
CREATE TABLE m9_courier_booking    (id, tenant_id, country_code CHAR(2), booking_number, courier_type ENUM('DOMESTIC','INTERNATIONAL'), shipper_party_id, consignee_party_id, pickup_address_id, delivery_address_id, weight_kg, declared_value_amount, declared_value_currency, status, …);
CREATE TABLE m9_pickup_schedule    (id, tenant_id, booking_id, scheduled_date, time_window, assigned_to_user_id, status, attempted_count);
CREATE TABLE m9_route              (id, tenant_id, country_code CHAR(2), route_code, name, route_type ENUM('PICKUP','DELIVERY','MIXED'), planned_date, status);
CREATE TABLE m9_route_stop         (id, route_id, sequence, country_code CHAR(2), stop_type ENUM('PICKUP','DELIVERY'), address_id, party_id, expected_arrival, actual_arrival, status);
CREATE TABLE m9_manifest           (id, tenant_id, manifest_number, route_id, courier_type, total_pieces, total_weight_kg, generated_at_utc);
CREATE TABLE m9_manifest_line      (id, manifest_id, booking_id, awb_number, weight_kg, pieces);
CREATE TABLE m9_awb                (id, tenant_id, awb_number, booking_id, awb_type, status); -- domestic/international AWB
CREATE TABLE m9_pod                (id, tenant_id, booking_id, signed_by, signature_image_doc_id, photo_doc_id, gps_lat, gps_lng, captured_at_utc, captured_by_user_id);
CREATE TABLE m9_cod_collection     (id, tenant_id, booking_id, amount_collected, currency, payment_method ENUM('CASH','CARD','UPI','OTHER'), collected_at_utc, settled_status);
CREATE TABLE m9_weight_correction  (id, tenant_id, booking_id, original_weight_kg, corrected_weight_kg, correction_reason, corrected_by, corrected_at_utc, billing_impact_amount, billing_impact_currency);
CREATE TABLE m9_zone_rate          (id, tenant_id, country_code CHAR(2), zone_code, courier_type, weight_slab_from_kg, weight_slab_to_kg, rate_amount, rate_currency, valid_from, valid_to);
CREATE TABLE m9_pincode_zone       (country_code CHAR(2), pincode VARCHAR(20), zone_code, PRIMARY KEY (country_code, pincode));
CREATE TABLE m9_delivery_attempt   (id, tenant_id, booking_id, attempt_no, attempted_at_utc, status ENUM('Delivered','Failed','PartiallyDelivered','Refused'), failure_reason, next_attempt_date);
CREATE TABLE m9_audit              (id, tenant_id, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

**Total: 14 tables** ✅ matches DBD §4.

## 3. Sign-off
| 1.0 | 2026-05-XX | Initial draft. 14 tables. |
