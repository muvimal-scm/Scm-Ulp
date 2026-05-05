-- CP13 v2 client doc deltas — backend-side schema changes required for
-- the "Track Shipment Holds typology" + "Calculate landed cost" + "Invoice
-- → Shipment FK for Tab 5" deltas.
--
-- Strategy: idempotent ALTERs using information_schema gates. MySQL has no
-- native ADD COLUMN IF NOT EXISTS; the standard pattern is to query
-- information_schema and PREPARE/EXECUTE the ALTER conditionally. ENUM
-- MODIFY is naturally idempotent — replacing the type with a superset
-- never breaks existing rows.

USE ulp_dev;

-- 1. Extend m5_hold.hold_type enum with the v2 typology values.
--    BL / Freight / Terminal Fees are the new client-facing categories.
--    Existing values are preserved for backward compatibility.
ALTER TABLE m5_hold
  MODIFY COLUMN hold_type ENUM(
    'CUSTOMS','PGA','MISSING_DOC','CUSTOMER_DISPUTE','PAYMENT','OPERATIONS','OTHER',
    'BL','FREIGHT','TERMINAL_FEES'
  ) NOT NULL;

-- 2. Expose direction on shipment so the Ocean/Air × Imp/Exp tabs (CP3 v2 delta)
--    can filter without joining m5_booking. Backfill from booking where present.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'm5_shipment'
     AND COLUMN_NAME  = 'trade_direction'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE m5_shipment ADD COLUMN trade_direction ENUM(''IMPORT'',''EXPORT'',''CROSS_TRADE'',''DOMESTIC'') NULL AFTER country_code, ADD INDEX idx_m5_shipment_dir_mode (tenant_id, trade_direction, mode)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill direction from the linked booking when shipment has booking_id.
UPDATE m5_shipment s
   JOIN m5_booking b ON b.id = s.booking_id
   SET s.trade_direction = b.trade_direction
 WHERE s.trade_direction IS NULL;

-- 3. Expose shipment_id on invoice so the Accounting Tab 5 filter (CP5 v2 delta)
--    can join precisely instead of using the status approximation.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'm17_invoice'
     AND COLUMN_NAME  = 'shipment_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE m17_invoice ADD COLUMN shipment_id BIGINT NULL AFTER customer_party_id, ADD INDEX idx_m17_invoice_shipment (tenant_id, shipment_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Seed the v2 OrgAdmin role so per-tenant admin tier exists.
--    CP12 carries the role-form UI; this seed gives it a starting point.
INSERT IGNORE INTO m26_role (id, tenant_id, code, name, description, is_system, is_active, created_at, modified_at)
VALUES (
  900, NULL, 'OrgAdmin',
  'Organization Administrator',
  'Tenant-level admin: manages own org users, roles, and settings. Lower scope than PlatformAdmin.',
  1, 1,
  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
);

-- All four deltas applied. Idempotent: re-running this script is a no-op
-- on an already-migrated database.
