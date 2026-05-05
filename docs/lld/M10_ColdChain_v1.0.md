# ULP M10: Cold Chain LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** Future

**Sources:** HLD §9 · DBD §4 — **M10 = 6 tables, no country_code change** · M5/M8/M13 (referenced)

## 1. Purpose
Temperature-controlled cargo lifecycle. Reefer container monitoring, temperature breach alerts, excursion reports, recipient acknowledgement.

## 2. Database — 6 tables (matches DBD §4)
```sql
CREATE TABLE m10_temp_profile      (id, tenant_id, code, name, min_celsius, max_celsius, sample_interval_min, alarm_threshold_celsius, alarm_duration_min);
CREATE TABLE m10_reefer_assignment (id, tenant_id, container_id, profile_id, started_at_utc, ended_at_utc);
CREATE TABLE m10_temp_reading      (id, tenant_id, reefer_assignment_id, recorded_at_utc, celsius, humidity_pct, source ENUM('IOT','MANUAL','SIM_TRACKER'));
CREATE TABLE m10_excursion         (id, tenant_id, reefer_assignment_id, started_at_utc, ended_at_utc, peak_celsius, severity ENUM('Warning','Critical'), notified_at_utc);
CREATE TABLE m10_excursion_action  (id, excursion_id, action_taken, performed_by, performed_at_utc, notes);
CREATE TABLE m10_audit             (id, tenant_id, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

**Total: 6 tables** ✅ matches DBD §4.

## 3. Sign-off
| 1.0 | 2026-05-XX | Initial draft. 6 tables. |
