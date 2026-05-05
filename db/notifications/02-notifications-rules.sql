-- =====================================================================
-- M27 — SCM Milestone 3 auto-notification rules.
-- Each row is a named rule with a query (logical, not raw SQL — the
-- service interprets `query_kind`), recipient strategy, and template.
-- Phase 1 dev: rules are triggered on demand via /api/v1/m27/rules/{code}/run.
-- Phase 5 production: a Hangfire scheduler reads `cron_expression` and
-- fires the same handler. No code change needed in the service when the
-- scheduler lands.
-- =====================================================================

USE ulp_dev;

CREATE TABLE IF NOT EXISTS m27_notification_rule (
  id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id             INT     NOT NULL,
  code                  VARCHAR(50) NOT NULL,    -- e.g. 'SHIPMENTS_ON_HOLD_7D'
  name                  VARCHAR(150) NOT NULL,
  description           TEXT,
  query_kind            ENUM(
    'SHIPMENTS_ON_HOLD',          -- arriving within N days, with hold flag
    'STATEMENT_OF_ACCOUNT',       -- A/R aging digest per customer
    'SHIPMENTS_ARRIVING',         -- ETA within N days
    'CONTAINERS_NOT_RETURNED',    -- discharged > N days, not yet empty-returned
    'CONTAINERS_READY_FOR_RETURN' -- emptied, ready for trucker pickup
  ) NOT NULL,
  threshold_days        INT NULL,                -- N for the queries above
  channel               ENUM('EMAIL','SMS','WHATSAPP','IN_APP') NOT NULL DEFAULT 'EMAIL',
  template_code         VARCHAR(80),             -- references m27_template.code (optional)
  recipient_strategy    ENUM('TENANT_ADMINS','SHIPMENT_OWNER','CUSTOMER_PARTY','PARTY_FROM_RESULT') NOT NULL,
  cron_expression       VARCHAR(50),             -- e.g. '0 8 * * *' — used once Hangfire is wired
  is_enabled            TINYINT(1) NOT NULL DEFAULT 1,
  last_run_at_utc       DATETIME(3),
  last_run_status       ENUM('Success','PartialFailure','Failed') NULL,
  last_run_match_count  INT,
  last_run_sent_count   INT,
  last_run_error        TEXT,
  created_at_utc        DATETIME(3) NOT NULL,
  modified_at_utc       DATETIME(3) NOT NULL,
  UNIQUE KEY uq_m27_rule_tenant_code (tenant_id, code),
  INDEX idx_m27_rule_enabled (tenant_id, is_enabled)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Per-rule, per-firing log so users can see history + debug.
CREATE TABLE IF NOT EXISTS m27_notification_rule_run (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  rule_id         BIGINT NOT NULL,
  started_at_utc  DATETIME(3) NOT NULL,
  finished_at_utc DATETIME(3),
  status          ENUM('Running','Success','PartialFailure','Failed') NOT NULL,
  match_count     INT,
  sent_count      INT,
  error           TEXT,
  triggered_by    ENUM('SCHEDULER','MANUAL','API') NOT NULL DEFAULT 'MANUAL',
  triggered_by_user_id BIGINT,
  INDEX idx_m27_run_rule (rule_id, started_at_utc),
  CONSTRAINT fk_m27_run_rule FOREIGN KEY (rule_id) REFERENCES m27_notification_rule(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed the 5 SCM-spec rules for tenant 1001 (IN). Tenant 2001 gets the same set.
INSERT IGNORE INTO m27_notification_rule
  (tenant_id, code, name, description, query_kind, threshold_days, channel, template_code,
   recipient_strategy, cron_expression, is_enabled, created_at_utc, modified_at_utc) VALUES

  (1001, 'SHIPMENTS_ON_HOLD_7D', 'Shipments on hold (≤7 days to ETA)',
   'Lists shipments that have a hold AND ETA within the next 7 days.',
   'SHIPMENTS_ON_HOLD', 7, 'EMAIL', NULL, 'TENANT_ADMINS', '0 8 * * *', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),

  (1001, 'STATEMENT_OF_ACCOUNT', 'Statement of Account (monthly)',
   'Per-customer A/R aging summary; emailed to each customer party.',
   'STATEMENT_OF_ACCOUNT', NULL, 'EMAIL', NULL, 'CUSTOMER_PARTY', '0 9 1 * *', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),

  (1001, 'SHIPMENTS_ARRIVING_3D', 'Shipments arriving (≤3 days)',
   'Lists shipments with ETA within the next 3 days; sent to consignee + ops team.',
   'SHIPMENTS_ARRIVING', 3, 'EMAIL', NULL, 'PARTY_FROM_RESULT', '0 7 * * *', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),

  (1001, 'CONTAINERS_NOT_RETURNED_5D', 'Containers not returned past 5 days',
   'Containers discharged > 5 days ago that have no empty-return timestamp; demurrage exposure.',
   'CONTAINERS_NOT_RETURNED', 5, 'EMAIL', NULL, 'TENANT_ADMINS', '0 8 * * *', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),

  (1001, 'CONTAINERS_READY_FOR_RETURN', 'Containers ready for return',
   'Containers in GatedOut status that need a return appointment; sent twice daily.',
   'CONTAINERS_READY_FOR_RETURN', NULL, 'EMAIL', NULL, 'TENANT_ADMINS', '0 8,14 * * *', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- US tenant gets the same 5 rules.
INSERT IGNORE INTO m27_notification_rule
  (tenant_id, code, name, description, query_kind, threshold_days, channel, template_code,
   recipient_strategy, cron_expression, is_enabled, created_at_utc, modified_at_utc) VALUES
  (2001, 'SHIPMENTS_ON_HOLD_7D',          'Shipments on hold (≤7 days to ETA)', 'Same rule, US tenant.', 'SHIPMENTS_ON_HOLD',          7,    'EMAIL', NULL, 'TENANT_ADMINS',     '0 8 * * *',    1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2001, 'STATEMENT_OF_ACCOUNT',          'Statement of Account (monthly)',     'Same rule, US tenant.', 'STATEMENT_OF_ACCOUNT',       NULL, 'EMAIL', NULL, 'CUSTOMER_PARTY',    '0 9 1 * *',    1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2001, 'SHIPMENTS_ARRIVING_3D',         'Shipments arriving (≤3 days)',       'Same rule, US tenant.', 'SHIPMENTS_ARRIVING',         3,    'EMAIL', NULL, 'PARTY_FROM_RESULT', '0 7 * * *',    1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2001, 'CONTAINERS_NOT_RETURNED_5D',    'Containers not returned past 5 days','Same rule, US tenant.', 'CONTAINERS_NOT_RETURNED',    5,    'EMAIL', NULL, 'TENANT_ADMINS',     '0 8 * * *',    1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (2001, 'CONTAINERS_READY_FOR_RETURN',   'Containers ready for return',        'Same rule, US tenant.', 'CONTAINERS_READY_FOR_RETURN',NULL, 'EMAIL', NULL, 'TENANT_ADMINS',     '0 8,14 * * *', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
