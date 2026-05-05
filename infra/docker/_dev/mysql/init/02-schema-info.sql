-- =====================================================================
-- ULP schema marker
-- The actual schema lives in: ulpReq/ULP_DBD_v2.0_Schema.sql
-- Apply via: infra/scripts/init-db.sh (or .ps1)
-- This file is intentionally light — full schema is applied on demand,
-- not on container boot, so devs can iterate without losing data.
-- =====================================================================

USE ulp_dev;

-- Lightweight metadata table to track which schema version is loaded.
CREATE TABLE IF NOT EXISTS _ulp_schema_version (
  version       VARCHAR(32)  NOT NULL PRIMARY KEY,
  applied_at_utc DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  source        VARCHAR(255) NULL,
  notes         TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
