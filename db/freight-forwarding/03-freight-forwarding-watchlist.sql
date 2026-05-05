-- =====================================================================
-- M5 watchlist (SCM Milestone 1+2 — per-user starred shipments).
-- Composite key on (tenant, user_sub, shipment) so a user can only star a
-- shipment once. user_sub is the Keycloak `sub` claim (string ULID/UUID),
-- which means watchlist entries survive numeric user-id renumbering.
-- =====================================================================

USE ulp_dev;

CREATE TABLE IF NOT EXISTS m5_user_watchlist (
  tenant_id      INT          NOT NULL,
  user_sub       VARCHAR(64)  NOT NULL,
  shipment_id    BIGINT       NOT NULL,
  starred_at_utc DATETIME(3)  NOT NULL,
  PRIMARY KEY (tenant_id, user_sub, shipment_id),
  INDEX idx_m5_watchlist_user (tenant_id, user_sub),
  INDEX idx_m5_watchlist_ship (shipment_id),
  CONSTRAINT fk_m5_watchlist_shipment FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
