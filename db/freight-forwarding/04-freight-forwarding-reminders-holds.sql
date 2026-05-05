-- =====================================================================
-- M5 reminders + holds (SCM Milestone 1+2 — Reminders / Holds).
--
-- m5_hold       — operational holds raised against a shipment (PGA, customs
--                 query, missing doc, customer dispute, etc.). Active until
--                 cleared_at_utc is set. Per-shipment unique on type while
--                 active so the same kind of hold isn't doubled up.
-- m5_reminder   — date-driven reminders attached to a shipment (or, optionally,
--                 a container). The "Run reminders now" handler scans Pending
--                 reminders with due_at_utc <= now() and emits a notification.
-- =====================================================================

USE ulp_dev;

CREATE TABLE IF NOT EXISTS m5_hold (
  id              BIGINT      PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT         NOT NULL,
  shipment_id     BIGINT      NOT NULL,
  hold_type       ENUM('CUSTOMS','PGA','MISSING_DOC','CUSTOMER_DISPUTE','PAYMENT','OPERATIONS','OTHER') NOT NULL,
  reason          VARCHAR(255) NOT NULL,
  raised_by       BIGINT      NULL,
  raised_at_utc   DATETIME(3) NOT NULL,
  cleared_by      BIGINT      NULL,
  cleared_at_utc  DATETIME(3) NULL,
  resolution_note VARCHAR(500) NULL,
  INDEX idx_m5_hold_ship (shipment_id, cleared_at_utc),
  INDEX idx_m5_hold_active (tenant_id, cleared_at_utc),
  CONSTRAINT fk_m5_hold_ship FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m5_reminder (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT          NOT NULL,
  shipment_id     BIGINT       NOT NULL,
  container_id    BIGINT       NULL,
  reminder_kind   ENUM('FOLLOW_UP','DOC_DUE','POD_FOLLOWUP','RETURN_DUE','PAYMENT_DUE','CUSTOM') NOT NULL,
  title           VARCHAR(150) NOT NULL,
  notes           TEXT         NULL,
  due_at_utc      DATETIME(3)  NOT NULL,
  assigned_user_sub VARCHAR(64) NULL,
  status          ENUM('Pending','Sent','Snoozed','Dismissed','Done') NOT NULL DEFAULT 'Pending',
  created_at_utc  DATETIME(3)  NOT NULL,
  modified_at_utc DATETIME(3)  NOT NULL,
  last_fired_at_utc DATETIME(3) NULL,
  INDEX idx_m5_rem_ship  (shipment_id, status),
  INDEX idx_m5_rem_due   (tenant_id, status, due_at_utc),
  CONSTRAINT fk_m5_rem_ship FOREIGN KEY (shipment_id) REFERENCES m5_shipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_m5_rem_cntr FOREIGN KEY (container_id) REFERENCES m5_container(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Demo fixtures: 2 active holds + 1 cleared hold; 4 reminders (mix overdue + upcoming).
-- Existing shipments per dev-fixtures: 1, 2, 3 (IN), 4 (US-tenant 2001).
INSERT IGNORE INTO m5_hold
  (tenant_id, shipment_id, hold_type, reason, raised_by, raised_at_utc, cleared_by, cleared_at_utc, resolution_note) VALUES
  (1001, 1, 'CUSTOMS',          'BoE assessment query open',          1, '2026-04-28 09:00:00.000', NULL, NULL, NULL),
  (1001, 1, 'MISSING_DOC',      'Original BL not received',           1, '2026-04-29 10:30:00.000', NULL, NULL, NULL),
  (1001, 3, 'CUSTOMER_DISPUTE', 'Reliance disputed line items',       1, '2026-04-23 14:00:00.000', 1,    '2026-04-26 09:00:00.000', 'Dispute resolved; revised invoice issued');

INSERT IGNORE INTO m5_reminder
  (tenant_id, shipment_id, reminder_kind, title, notes, due_at_utc, assigned_user_sub, status, created_at_utc, modified_at_utc) VALUES
  (1001, 1, 'DOC_DUE',      'Chase Original BL with Tata',            'Customs hold blocks release until OBL is in hand.', '2026-04-30 10:00:00.000', NULL, 'Pending', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 1, 'FOLLOW_UP',    'Schedule customs broker call',           NULL,                                                '2026-05-02 11:00:00.000', NULL, 'Pending', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 2, 'PAYMENT_DUE',  'Vendor invoice payment NET-15 due',      'Maersk MUM-2604002 — NET 15 from 25 Apr.',         '2026-05-10 12:00:00.000', NULL, 'Pending', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (1001, 3, 'POD_FOLLOWUP', 'Confirm POD receipt with consignee',     NULL,                                                '2026-04-25 16:00:00.000', NULL, 'Done',    CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
