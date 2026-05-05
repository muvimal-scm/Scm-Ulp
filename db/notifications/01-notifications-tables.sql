-- =====================================================================
-- M27 Notifications — 9 tables (Tier-A, country-aware templates)
-- Strictly per docs/lld/M27_Notifications_v1.0.md (matches DBD §4 = 9 tables).
-- =====================================================================
-- Idempotent: CREATE TABLE IF NOT EXISTS + INSERT IGNORE.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- 3.1 m27_template — locale + country variants
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m27_template (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT,                              -- NULL = system default
  country_code    CHAR(2),
  code            VARCHAR(80) NOT NULL,
  channel         ENUM('EMAIL','SMS','WHATSAPP','IN_APP','WEBHOOK') NOT NULL,
  locale          VARCHAR(10) NOT NULL,
  subject         VARCHAR(255),
  body_template   TEXT NOT NULL,
  is_html         TINYINT(1) DEFAULT 0,
  is_active       TINYINT(1) DEFAULT 1,
  version         INT NOT NULL DEFAULT 1,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_code_country_channel_locale (tenant_id, code, country_code, channel, locale),
  CONSTRAINT fk_template_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.2 m27_recipient_preference
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m27_recipient_preference (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  user_id         BIGINT NOT NULL,
  category        VARCHAR(50) NOT NULL,
  channel         ENUM('EMAIL','SMS','WHATSAPP','IN_APP') NOT NULL,
  is_subscribed   TINYINT(1) DEFAULT 1,
  digest_frequency ENUM('IMMEDIATE','HOURLY','DAILY','WEEKLY','OFF') DEFAULT 'IMMEDIATE',
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_user_cat_channel (user_id, category, channel),
  CONSTRAINT fk_pref_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.3 m27_notification
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m27_notification (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  ulid              VARCHAR(26) NOT NULL,
  source_module     VARCHAR(10) NOT NULL,
  source_event      VARCHAR(80) NOT NULL,
  source_entity_id  BIGINT,
  category          VARCHAR(50) NOT NULL,
  priority          ENUM('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
  payload           JSON NOT NULL,
  correlation_id    VARCHAR(36),
  created_at_utc    DATETIME(3) NOT NULL,
  status            ENUM('Queued','Processing','Completed','Failed','Cancelled') NOT NULL,
  completed_at_utc  DATETIME(3),
  UNIQUE KEY uq_ulid (ulid),
  INDEX idx_tenant_status (tenant_id, status),
  INDEX idx_correlation (correlation_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.4 m27_recipient
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m27_recipient (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  notification_id BIGINT NOT NULL,
  user_id         BIGINT,
  email           VARCHAR(255),
  phone           VARCHAR(30),
  channel         ENUM('EMAIL','SMS','WHATSAPP','IN_APP','WEBHOOK') NOT NULL,
  locale          VARCHAR(10),
  CONSTRAINT fk_recip_notif FOREIGN KEY (notification_id) REFERENCES m27_notification(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.5 m27_send_attempt
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m27_send_attempt (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  recipient_id      BIGINT NOT NULL,
  attempt_number    INT NOT NULL,
  provider          VARCHAR(50) NOT NULL,
  provider_ref      VARCHAR(255),
  status            ENUM('Pending','Sent','Delivered','Bounced','Failed','Read') NOT NULL,
  error_code        VARCHAR(50),
  error_message     TEXT,
  attempted_at_utc  DATETIME(3) NOT NULL,
  delivered_at_utc  DATETIME(3),
  read_at_utc       DATETIME(3),
  cost_micros       BIGINT,
  cost_currency     CHAR(3),
  INDEX idx_recip_attempt (recipient_id, attempt_number),
  INDEX idx_tenant_status_time (tenant_id, status, attempted_at_utc),
  CONSTRAINT fk_attempt_recip FOREIGN KEY (recipient_id) REFERENCES m27_recipient(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.6 m27_in_app_inbox
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m27_in_app_inbox (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  user_id         BIGINT NOT NULL,
  notification_id BIGINT,
  title           VARCHAR(255) NOT NULL,
  body            TEXT NOT NULL,
  link_url        VARCHAR(500),
  icon            VARCHAR(50),
  category        VARCHAR(50),
  is_read         TINYINT(1) DEFAULT 0,
  read_at_utc     DATETIME(3),
  created_at_utc  DATETIME(3) NOT NULL,
  expires_at_utc  DATETIME(3),
  INDEX idx_user_read_time (user_id, is_read, created_at_utc),
  CONSTRAINT fk_inbox_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.7 m27_webhook_endpoint
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m27_webhook_endpoint (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  name            VARCHAR(150) NOT NULL,
  url             VARCHAR(500) NOT NULL,
  secret          VARCHAR(64) NOT NULL,
  event_filter    JSON NOT NULL,
  is_active       TINYINT(1) DEFAULT 1,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  INDEX idx_tenant_active (tenant_id, is_active)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.8 m27_webhook_delivery
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m27_webhook_delivery (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  endpoint_id       BIGINT NOT NULL,
  notification_id   BIGINT NOT NULL,
  attempt_number    INT NOT NULL,
  http_status       SMALLINT,
  request_body      LONGTEXT,
  response_body     LONGTEXT,
  duration_ms       INT,
  attempted_at_utc  DATETIME(3) NOT NULL,
  next_retry_at_utc DATETIME(3),
  CONSTRAINT fk_whd_endpoint FOREIGN KEY (endpoint_id) REFERENCES m27_webhook_endpoint(id) ON DELETE CASCADE,
  CONSTRAINT fk_whd_notif    FOREIGN KEY (notification_id) REFERENCES m27_notification(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3.9 m27_provider_config
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m27_provider_config (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  country_code    CHAR(2),
  channel         ENUM('EMAIL','SMS','WHATSAPP') NOT NULL,
  provider        VARCHAR(50) NOT NULL,
  config_encrypted JSON NOT NULL,
  is_active       TINYINT(1) DEFAULT 1,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_country_channel (tenant_id, country_code, channel),
  CONSTRAINT fk_provcfg_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- System template seeds (LLD §11) — tenant_id=NULL = system default
-- =====================================================================
INSERT IGNORE INTO m27_template
  (tenant_id, country_code, code, channel, locale, subject, body_template, is_html, is_active, version, created_at_utc, modified_at_utc) VALUES
  -- IN variants
  (NULL, 'IN', 'tenant.welcome',   'EMAIL', 'en-IN', 'Welcome to ULP - {{tenant_name}}',
    'Hi {{user_name}},\n\nYour tenant <b>{{tenant_name}}</b> is now active on ULP.\nLogin: <a href="{{login_url}}">{{login_url}}</a>\n\n— ULP Team', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (NULL, 'IN', 'user.invited',     'EMAIL', 'en-IN', '{{inviter_name}} invited you to ULP',
    'Hi,\n\n{{inviter_name}} invited you to join <b>{{tenant_name}}</b> on ULP.\nAccept: <a href="{{invite_url}}">{{invite_url}}</a>', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (NULL, 'IN', 'invoice.issued',   'EMAIL', 'en-IN', 'Invoice {{invoice_number}} from {{tenant_name}}',
    'Dear {{customer_name}},\n\nInvoice <b>{{invoice_number}}</b> for {{currency}} {{amount}} has been issued.\nDue: {{due_date}}\nView: <a href="{{invoice_url}}">{{invoice_url}}</a>', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (NULL, 'IN', 'shipment.delivered','EMAIL', 'en-IN', 'Shipment {{tracking_number}} delivered',
    'Shipment <b>{{tracking_number}}</b> was delivered at {{delivered_at}}.\nPOD: <a href="{{pod_url}}">{{pod_url}}</a>', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (NULL, 'IN', 'mfa.enrolment',    'EMAIL', 'en-IN', 'MFA enrolment confirmation',
    'Hi {{user_name}},\n\nMFA factor <b>{{factor}}</b> was added to your account.', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (NULL, 'IN', 'login.alert',      'EMAIL', 'en-IN', 'New sign-in to your ULP account',
    'A sign-in to your account was detected from {{ip_address}} ({{user_agent}}) at {{occurred_at}}.', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  -- US variants
  (NULL, 'US', 'tenant.welcome',   'EMAIL', 'en-US', 'Welcome to ULP - {{tenant_name}}',
    'Hi {{user_name}},\n\nYour tenant <b>{{tenant_name}}</b> is now active on ULP.\nLogin: <a href="{{login_url}}">{{login_url}}</a>\n\n— ULP Team', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (NULL, 'US', 'user.invited',     'EMAIL', 'en-US', '{{inviter_name}} invited you to ULP',
    'Hi,\n\n{{inviter_name}} invited you to join <b>{{tenant_name}}</b> on ULP.\nAccept: <a href="{{invite_url}}">{{invite_url}}</a>', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (NULL, 'US', 'invoice.issued',   'EMAIL', 'en-US', 'Invoice {{invoice_number}} from {{tenant_name}}',
    'Dear {{customer_name}},\n\nInvoice <b>{{invoice_number}}</b> for {{currency}} {{amount}} has been issued.\nDue: {{due_date}}\nView: <a href="{{invoice_url}}">{{invoice_url}}</a>', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (NULL, 'US', 'shipment.delivered','EMAIL', 'en-US', 'Shipment {{tracking_number}} delivered',
    'Shipment <b>{{tracking_number}}</b> was delivered at {{delivered_at}}.\nPOD: <a href="{{pod_url}}">{{pod_url}}</a>', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (NULL, 'US', 'mfa.enrolment',    'EMAIL', 'en-US', 'MFA enrollment confirmation',
    'Hi {{user_name}},\n\nMFA factor <b>{{factor}}</b> was added to your account.', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (NULL, 'US', 'login.alert',      'EMAIL', 'en-US', 'New sign-in to your ULP account',
    'A sign-in to your account was detected from {{ip_address}} ({{user_agent}}) at {{occurred_at}}.', 1, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- Mark version
INSERT INTO _ulp_schema_version (version, source, notes)
VALUES ('m27-tables', 'db/m27/01-m27-tables.sql', 'M27 9 tables + system email templates (IN+US)')
ON DUPLICATE KEY UPDATE applied_at_utc = CURRENT_TIMESTAMP(3);
