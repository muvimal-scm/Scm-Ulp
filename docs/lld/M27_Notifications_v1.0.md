# ULP M27: Notifications LLD

**Version:** 1.0 · **Status:** Drafted (awaiting Shankar approval) · **Compiled:** May 2026

**Authoritative sources (do not deviate):**
- `ulpReq/ULP_HLD_v2.0_MultiRegion.docx` §7 (cross-cutting), §8 (resilience), §9.1 (M27 in Tier-A catalog)
- `ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx` §4 — **M27 = 9 tables, +country_code on templates (locale variants)**
- `ulpReq/ULP_SecurityComplianceArchitecture_v2.0.docx` §10 (incident response, breach-notification SLAs)
- `ulpReq/ULP_ObservabilitySRE_v2.0.docx` (alert routing, mandatory log fields)
- `ulpReq/ULP_VendorIntegrationCatalog_v2.0.docx` (MSG91 IN, Twilio US, Gupshup WhatsApp)
- `ulpReq/ULP_NonFunctionalRequirements_v2.0.docx` NFR-REL-002 (webhook 99.5% within 24h)
- `.claude/skills/mailhog-acs-email/SKILL.md` — MailHog MVP → Azure Communication Services prod swap
- `.claude/skills/masstransit-broker/SKILL.md` — broker abstraction + outbox pattern
- `.claude/skills/hangfire-jobs/SKILL.md` — recurring + scheduled jobs
- `.claude/skills/polly-resilience/SKILL.md` — retry/circuit-breaker for outbound calls

> **Indian client continuity** — every existing v1.0 notification flow preserved. `country_code` added to template tables only so we can hold parallel IN/US locale variants of the same template.

---

## 1. Module Purpose

M27 is the **single egress** for every user-facing message ULP sends:

- Email (transactional, batch)
- SMS / WhatsApp (transactional alerts)
- In-app notifications (bell icon, real-time push)
- Webhook delivery (tenant-configured outbound hooks)

It owns:
- Channel abstraction — `INotificationSender` per channel; provider swap is config-only
- Templating with locale + country variants
- Per-user / per-tenant notification preferences
- Delivery tracking + retry (Hangfire + Polly)
- Outbox pattern — MassTransit publishes `NotificationRequested`; M27 consumer dequeues + sends
- Audit trail of every send attempt (delivered / bounced / failed)

It is a **Tier-A** module per HLD §9.1 — country-agnostic core. SMS/WhatsApp providers are country-specific (MSG91 IN, Twilio US) but the abstraction is universal.

## 2. Architecture

| Component | Scope |
|---|---|
| **`INotificationSender`** | Abstraction with implementations per channel + provider |
| **MailHog (MVP) → Azure Communication Services (prod)** | Email — config-only swap per `mailhog-acs-email` skill |
| **MSG91 (IN) / Twilio (US) / Gupshup WhatsApp** | Country-aware provider resolution; per-tenant config |
| **Hangfire worker** | Pulls outbox; sends; records result; retries with Polly |
| **Provider webhooks** | Receive delivery status callbacks; update `m27_send_attempt` |
| **MassTransit consumer** | Subscribes to `NotificationRequested` events from any module |

## 3. Database — 9 tables (matches DBD §4)

### 3.1 `m27_template` — Template (+country_code per DBD §4)
```sql
CREATE TABLE m27_template (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT,                          -- NULL = system default
  country_code    CHAR(2),                      -- DBD §4: locale variant
  code            VARCHAR(80) NOT NULL,         -- "invoice.issued","shipment.delivered"
  channel         ENUM('EMAIL','SMS','WHATSAPP','IN_APP','WEBHOOK') NOT NULL,
  locale          VARCHAR(10) NOT NULL,         -- "en-IN","en-US","hi-IN"
  subject         VARCHAR(255),                 -- email/SMS subject (NULL for webhook)
  body_template   TEXT NOT NULL,                -- handlebars / scriban
  is_html         TINYINT(1) DEFAULT 0,
  is_active       TINYINT(1) DEFAULT 1,
  version         INT NOT NULL DEFAULT 1,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_code_country_channel_locale (tenant_id, code, country_code, channel, locale),
  CONSTRAINT fk_template_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.2 `m27_recipient_preference` — Per-user channel preferences
```sql
CREATE TABLE m27_recipient_preference (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  user_id         BIGINT NOT NULL,
  category        VARCHAR(50) NOT NULL,         -- "shipment","invoice","compliance","system"
  channel         ENUM('EMAIL','SMS','WHATSAPP','IN_APP') NOT NULL,
  is_subscribed   TINYINT(1) DEFAULT 1,
  digest_frequency ENUM('IMMEDIATE','HOURLY','DAILY','WEEKLY','OFF') DEFAULT 'IMMEDIATE',
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_user_cat_channel (user_id, category, channel),
  CONSTRAINT fk_pref_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.3 `m27_notification` — Logical notification request
```sql
CREATE TABLE m27_notification (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  ulid             CHAR(26) NOT NULL,
  source_module    VARCHAR(10) NOT NULL,        -- "M17","M4","M21"
  source_event     VARCHAR(80) NOT NULL,        -- e.g. "invoice.issued"
  source_entity_id BIGINT,
  category         VARCHAR(50) NOT NULL,        -- routing key for prefs
  priority         ENUM('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
  payload          JSON NOT NULL,               -- template variables
  correlation_id   CHAR(36),
  created_at_utc   DATETIME(3) NOT NULL,
  status           ENUM('Queued','Processing','Completed','Failed','Cancelled') NOT NULL,
  completed_at_utc DATETIME(3),
  UNIQUE KEY uq_ulid (ulid),
  INDEX idx_tenant_status (tenant_id, status),
  INDEX idx_correlation (correlation_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.4 `m27_recipient` — Per-notification recipient (1 notification → N recipients)
```sql
CREATE TABLE m27_recipient (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  notification_id BIGINT NOT NULL,
  user_id         BIGINT,                       -- FK m_user (nullable for external)
  email           VARCHAR(255),
  phone           VARCHAR(30),
  channel         ENUM('EMAIL','SMS','WHATSAPP','IN_APP','WEBHOOK') NOT NULL,
  locale          VARCHAR(10),
  CONSTRAINT fk_recip_notif FOREIGN KEY (notification_id) REFERENCES m27_notification(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.5 `m27_send_attempt` — Per-recipient send attempts (with retries)
```sql
CREATE TABLE m27_send_attempt (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id          INT NOT NULL,
  recipient_id       BIGINT NOT NULL,
  attempt_number     INT NOT NULL,             -- 1, 2, 3 …
  provider           VARCHAR(50) NOT NULL,     -- "ACS","MailHog","MSG91","Twilio","Gupshup"
  provider_ref       VARCHAR(255),             -- provider's message ID
  status             ENUM('Pending','Sent','Delivered','Bounced','Failed','Read') NOT NULL,
  error_code         VARCHAR(50),
  error_message      TEXT,
  attempted_at_utc   DATETIME(3) NOT NULL,
  delivered_at_utc   DATETIME(3),
  read_at_utc        DATETIME(3),
  cost_micros        BIGINT,                   -- provider-charged cost in µ-units (e.g., 1234 = $0.001234)
  cost_currency      CHAR(3),
  INDEX idx_recip_attempt (recipient_id, attempt_number),
  INDEX idx_tenant_status_time (tenant_id, status, attempted_at_utc),
  CONSTRAINT fk_attempt_recip FOREIGN KEY (recipient_id) REFERENCES m27_recipient(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.6 `m27_in_app_inbox` — Bell-icon notifications
```sql
CREATE TABLE m27_in_app_inbox (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  user_id         BIGINT NOT NULL,
  notification_id BIGINT,                      -- nullable for ad-hoc messages
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
```

### 3.7 `m27_webhook_endpoint` — Per-tenant outbound webhook config
```sql
CREATE TABLE m27_webhook_endpoint (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  name            VARCHAR(150) NOT NULL,
  url             VARCHAR(500) NOT NULL,
  secret          VARCHAR(64) NOT NULL,         -- for HMAC signing
  event_filter    JSON NOT NULL,                -- ["invoice.*","shipment.delivered"]
  is_active       TINYINT(1) DEFAULT 1,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  INDEX idx_tenant_active (tenant_id, is_active)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.8 `m27_webhook_delivery` — Per-event delivery result for webhooks
```sql
CREATE TABLE m27_webhook_delivery (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  endpoint_id     BIGINT NOT NULL,
  notification_id BIGINT NOT NULL,
  attempt_number  INT NOT NULL,
  http_status     SMALLINT,
  request_body    LONGTEXT,
  response_body   LONGTEXT,
  duration_ms     INT,
  attempted_at_utc DATETIME(3) NOT NULL,
  next_retry_at_utc DATETIME(3),                -- NULL = no more retries
  CONSTRAINT fk_whd_endpoint FOREIGN KEY (endpoint_id) REFERENCES m27_webhook_endpoint(id) ON DELETE CASCADE,
  CONSTRAINT fk_whd_notif FOREIGN KEY (notification_id) REFERENCES m27_notification(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.9 `m27_provider_config` — Per-tenant provider credentials (region-pinned, encrypted)
```sql
CREATE TABLE m27_provider_config (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  country_code    CHAR(2),                      -- nullable for tenant-wide
  channel         ENUM('EMAIL','SMS','WHATSAPP') NOT NULL,
  provider        VARCHAR(50) NOT NULL,         -- "ACS","MSG91","Twilio","Gupshup"
  config_encrypted JSON NOT NULL,               -- API key + sender ID + template IDs (encrypted at rest)
  is_active       TINYINT(1) DEFAULT 1,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_country_channel (tenant_id, country_code, channel),
  CONSTRAINT fk_provcfg_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Total: 9 tables** ✅ matches `ULP_DBD_v2.0_DatabaseDesign.docx §4`.

## 4. Resilience pattern (per HLD §8.3 + Polly skill)

For every outbound provider call:
- Retry: exponential backoff, 3 retries, 100ms→5s
- Circuit breaker: open after 5 failures in 30s; half-open after 60s
- Timeout: 5s per call (configurable per provider)
- Bulkhead: max 50 concurrent per integration

After exhaustion → `m27_send_attempt.status = Failed` + DLQ event.

## 5. APIs

All under `/api/v1/m27`:

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `POST` | `/notifications` | service-only | Enqueue (called by other modules; usually via MassTransit, not REST) |
| `GET` | `/notifications/{ulid}` | `m27.notification.read` | Status |
| `GET` | `/inbox` | self | Current user's bell-icon inbox (paginated) |
| `POST` | `/inbox/{id}/read` | self | Mark read |
| `POST` | `/inbox/read-all` | self | Mark all read |
| `GET` | `/preferences` | self | User's preferences |
| `PUT` | `/preferences` | self | Update preferences |
| `GET` | `/templates` | `m27.template.read` | List templates (tenant + system) |
| `PUT` | `/templates/{id}` | `m27.template.write` | Edit tenant template |
| `GET` | `/webhooks` | `m27.webhook.read` | List endpoints |
| `POST` | `/webhooks` | `m27.webhook.write` | Create endpoint |
| `POST` | `/webhooks/{id}/test` | `m27.webhook.write` | Send test event |
| `POST` | `/providers/{channel}/test` | tenant-admin | Send test message via configured provider |

## 6. Events (consumed)

M27 subscribes to events from every other module (per HLD §9.3 dependency graph). Examples:

| Source event | M27 default action |
|---|---|
| `M21.DocumentUploaded` (large) | optional notify to creator |
| `M17.InvoiceIssued` | email customer + WhatsApp if enabled |
| `M4.CustomsFilingAccepted` | email shipment owner |
| `M5.ShipmentDelivered` | SMS shipper, email consignee |
| `M26.UserInvited` | invite email |
| `M26.TenantSuspended` | email tenant admins |

Each module publishes domain events; M27 maps event → template + recipients via `m27_template` lookups.

## 7. Outbox + delivery flow

1. Module publishes domain event via MassTransit (e.g., `InvoiceIssuedEvent`)
2. `M27NotificationConsumer` receives → resolves recipients → resolves templates → inserts `m27_notification` + `m27_recipient` rows
3. Hangfire job `SendPendingNotifications` (every 30s) picks up rows where `status=Queued`
4. For each recipient: pick provider (per `m27_provider_config`) → render template → send via Polly-wrapped client
5. Insert `m27_send_attempt` row with result
6. Provider webhook (delivery status) updates `m27_send_attempt.status` to Delivered / Bounced
7. If failed and retries exhausted → emit `NotificationFailed` for monitoring

## 8. Locale resolution

Per template lookup:
1. Try `(tenant_id=X, country_code=tenant.countryCode, locale=user.locale)` exact
2. Fallback to `(tenant_id=X, country_code=tenant.countryCode, locale=tenant.primaryLocale)`
3. Fallback to system default (`tenant_id=NULL`)
4. If none found → log warning + use code as subject + JSON-stringify payload as body

## 9. Security

- Provider API keys encrypted at rest (Azure Key Vault references)
- Webhook secrets stored as 64-char random; signed payload with HMAC-SHA256 in `X-ULP-Signature` header
- Email body: PII redacted in logs (per Security doc §7) — log only event code + recipient hash, not full body
- WhatsApp / SMS: opt-in default; tenant must enable; quiet hours per locale (e.g., no SMS 22:00-08:00 IST)

## 10. NFR targets

Per `ULP_NonFunctionalRequirements_v2.0.docx`:
- Webhook delivery within 24h: ≥ 99.5% (NFR-REL-002)
- Email send latency: p95 < 30s end-to-end
- In-app inbox delivery: < 2s after event
- Provider cost tracking: every send records `cost_micros` for FinOps reporting

## 11. Migration / Init

- New tables only
- Seed system templates per channel for: invoice issued, shipment delivered, password reset, MFA enrolment, tenant welcome, login alert (per IN/US country variants)
- For dev: MailHog provider auto-configured; SMS/WhatsApp use console-logger stub

## 12. Sign-off

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-XX | Initial draft. 9 tables matching DBD §4 (incl. country_code on templates). |
