-- =====================================================================
-- M5 extension (SCM Milestone 1 — Memo Notes per shipment).
-- Internal-facing scratchpad of timestamped notes attached to a shipment;
-- separate from m5_milestone (which is the operational lifecycle log).
-- =====================================================================

USE ulp_dev;

CREATE TABLE IF NOT EXISTS m5_memo (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT     NOT NULL,
  shipment_id     BIGINT  NOT NULL,
  author_user_id  BIGINT,
  body            TEXT    NOT NULL,
  is_pinned       TINYINT(1) NOT NULL DEFAULT 0,
  created_at_utc  DATETIME(3) NOT NULL,
  INDEX idx_m5_memo_shipment (shipment_id, created_at_utc),
  CONSTRAINT fk_m5_memo_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
