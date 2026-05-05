-- =====================================================================
-- M26 RBAC + Tenant Management — schema
-- =====================================================================
-- Strictly per docs/lld/M26_RBAC_v1.0.md (table count = 13).
-- m_tenant already exists from ulpReq/ULP_DBD_v2.0_Schema.sql.
-- m_user is enriched here with country_code per DBD §4.
-- =====================================================================

USE ulp_dev;

-- ---------------------------------------------------------------------
-- m_user (LLD §3.2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m_user (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id          INT NOT NULL,
  country_code       CHAR(2) NOT NULL,
  keycloak_subject   VARCHAR(36) NOT NULL,
  email              VARCHAR(255) NOT NULL,
  phone              VARCHAR(30),
  display_name       VARCHAR(150) NOT NULL,
  status             ENUM('Active','Invited','Suspended','Deactivated') NOT NULL DEFAULT 'Active',
  preferred_locale   VARCHAR(10),
  preferred_timezone VARCHAR(50),
  last_login_at_utc  DATETIME(3),
  created_at_utc     DATETIME(3) NOT NULL,
  modified_at_utc    DATETIME(3) NOT NULL,
  UNIQUE KEY uq_keycloak_subject (keycloak_subject),
  UNIQUE KEY uq_tenant_email (tenant_id, email),
  INDEX idx_tenant_status (tenant_id, status),
  CONSTRAINT fk_user_tenant  FOREIGN KEY (tenant_id) REFERENCES m_tenant(id),
  CONSTRAINT fk_user_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m26_role (LLD §3.3) — +country_code per DBD §4
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m26_role (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT,                                 -- NULL = system role (cross-tenant)
  country_code    CHAR(2),
  code            VARCHAR(50) NOT NULL,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  is_system       TINYINT(1) DEFAULT 0,
  is_active       TINYINT(1) DEFAULT 1,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_code (tenant_id, code),
  CONSTRAINT fk_role_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m26_permission (LLD §3.4) — universal catalog, not tenant-scoped
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m26_permission (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  module_code  VARCHAR(10) NOT NULL,
  resource     VARCHAR(50) NOT NULL,
  action       ENUM('read','write','create','update','delete','approve','export','share') NOT NULL,
  scope        ENUM('module','entity','field') NOT NULL,
  description  TEXT,
  UNIQUE KEY uq_perm (module_code, resource, action, scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m26_role_permission (LLD §3.5)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m26_role_permission (
  role_id        BIGINT NOT NULL,
  permission_id  BIGINT NOT NULL,
  granted_at_utc DATETIME(3) NOT NULL,
  granted_by     BIGINT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES m26_role(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES m26_permission(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m26_user_role (LLD §3.6)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m26_user_role (
  user_id        BIGINT NOT NULL,
  role_id        BIGINT NOT NULL,
  granted_at_utc DATETIME(3) NOT NULL,
  granted_by     BIGINT NOT NULL,
  expires_at_utc DATETIME(3),
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES m26_role(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m26_user_permission_override (LLD §3.7)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m26_user_permission_override (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id      INT NOT NULL,
  user_id        BIGINT NOT NULL,
  permission_id  BIGINT NOT NULL,
  effect         ENUM('GRANT','DENY') NOT NULL,
  scope_filter   JSON,
  granted_by     BIGINT NOT NULL,
  granted_at_utc DATETIME(3) NOT NULL,
  expires_at_utc DATETIME(3),
  CONSTRAINT fk_upo_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE,
  CONSTRAINT fk_upo_perm FOREIGN KEY (permission_id) REFERENCES m26_permission(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m26_group (LLD §3.8)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m26_group (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id    INT NOT NULL,
  code         VARCHAR(50) NOT NULL,
  name         VARCHAR(150) NOT NULL,
  description  TEXT,
  UNIQUE KEY uq_tenant_code (tenant_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m26_user_group + m26_group_role (LLD §3.9)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m26_user_group (
  user_id  BIGINT NOT NULL,
  group_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, group_id),
  CONSTRAINT fk_ug_user  FOREIGN KEY (user_id)  REFERENCES m_user(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ug_group FOREIGN KEY (group_id) REFERENCES m26_group(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS m26_group_role (
  group_id BIGINT NOT NULL,
  role_id  BIGINT NOT NULL,
  PRIMARY KEY (group_id, role_id),
  CONSTRAINT fk_gr_group FOREIGN KEY (group_id) REFERENCES m26_group(id) ON DELETE CASCADE,
  CONSTRAINT fk_gr_role  FOREIGN KEY (role_id)  REFERENCES m26_role(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m26_session (LLD §3.10)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m26_session (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  user_id          BIGINT NOT NULL,
  refresh_jti      VARCHAR(36) NOT NULL,
  ip_address       VARCHAR(45),
  user_agent       VARCHAR(500),
  issued_at_utc    DATETIME(3) NOT NULL,
  expires_at_utc   DATETIME(3) NOT NULL,
  last_seen_at_utc DATETIME(3),
  revoked_at_utc   DATETIME(3),
  revoked_reason   VARCHAR(100),
  UNIQUE KEY uq_jti (refresh_jti),
  INDEX idx_user_active (user_id, revoked_at_utc),
  CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m26_api_key (LLD §3.11)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m26_api_key (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  name              VARCHAR(150) NOT NULL,
  key_hash          VARCHAR(64) NOT NULL,
  key_prefix        VARCHAR(8)  NOT NULL,
  scopes            JSON NOT NULL,
  created_by        BIGINT NOT NULL,
  created_at_utc    DATETIME(3) NOT NULL,
  expires_at_utc    DATETIME(3),
  last_used_at_utc  DATETIME(3),
  is_revoked        TINYINT(1) DEFAULT 0,
  revoked_at_utc    DATETIME(3),
  UNIQUE KEY uq_key_hash (key_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m26_mfa_enrolment (LLD §3.12)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m26_mfa_enrolment (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  user_id          BIGINT NOT NULL,
  factor           ENUM('TOTP','FIDO2','SMS','EMAIL') NOT NULL,
  factor_label     VARCHAR(100),
  is_active        TINYINT(1) DEFAULT 1,
  enrolled_at_utc  DATETIME(3) NOT NULL,
  last_used_at_utc DATETIME(3),
  CONSTRAINT fk_mfa_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- m26_audit (LLD §3.13)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m26_audit (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT NOT NULL,
  actor_user_id    BIGINT,
  action           ENUM('LOGIN','LOGOUT','GRANT_ROLE','REVOKE_ROLE','GRANT_PERM','REVOKE_PERM',
                        'CREATE_USER','DEACTIVATE_USER','ENROLL_MFA','UNENROLL_MFA',
                        'CREATE_API_KEY','REVOKE_API_KEY','TENANT_SUSPEND','TENANT_ACTIVATE') NOT NULL,
  target_user_id   BIGINT,
  details          JSON,
  ip_address       VARCHAR(45),
  occurred_at_utc  DATETIME(3) NOT NULL,
  INDEX idx_tenant_time (tenant_id, occurred_at_utc),
  INDEX idx_actor_time  (actor_user_id, occurred_at_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- Seed permission catalog (idempotent — covers M1 + M3 + M21 + M26 + M27)
-- =====================================================================
INSERT IGNORE INTO m26_permission (module_code, resource, action, scope, description) VALUES
  -- M1 Master Data
  ('m1', 'party',     'read',   'module', 'List/view parties'),
  ('m1', 'party',     'write',  'module', 'Create/update parties'),
  ('m1', 'party',     'delete', 'module', 'Soft-delete parties'),
  ('m1', 'product',   'read',   'module', 'List/view products'),
  ('m1', 'product',   'write',  'module', 'Create/update products'),
  ('m1', 'product',   'delete', 'module', 'Delete products'),
  -- M3 Vendor
  ('m3', 'vendor',    'read',   'module', 'List/view vendors'),
  ('m3', 'vendor',    'write',  'module', 'Create/update vendors'),
  ('m3', 'vendor',    'approve','module', 'Activate/suspend vendors'),
  ('m3', 'ncr',       'write',  'module', 'Raise/manage NCRs'),
  -- M21 Doc Mgmt
  ('m21','document',  'read',   'module', 'View documents'),
  ('m21','document',  'write',  'module', 'Upload/version documents'),
  ('m21','document',  'delete', 'module', 'Soft-delete documents'),
  ('m21','document',  'share',  'module', 'Create external share links'),
  -- M26 RBAC
  ('m26','user',      'read',   'module', 'List tenant users'),
  ('m26','user',      'write',  'module', 'Invite/edit users'),
  ('m26','user',      'delete', 'module', 'Deactivate users'),
  ('m26','role',      'read',   'module', 'List roles + permissions'),
  ('m26','role',      'write',  'module', 'Create/edit roles'),
  ('m26','apikey',    'write',  'module', 'Mint API keys'),
  ('m26','apikey',    'delete', 'module', 'Revoke API keys'),
  -- M27 Notifications
  ('m27','template',  'read',   'module', 'View templates'),
  ('m27','template',  'write',  'module', 'Edit tenant templates'),
  ('m27','webhook',   'read',   'module', 'View webhook endpoints'),
  ('m27','webhook',   'write',  'module', 'Configure webhooks'),
  ('m27','notification','read', 'module', 'View notification status');

-- =====================================================================
-- Seed system roles (cross-tenant; tenant_id NULL)
-- =====================================================================
INSERT IGNORE INTO m26_role (tenant_id, code, name, description, is_system, is_active, created_at_utc, modified_at_utc) VALUES
  (NULL, 'platform-admin', 'Platform Administrator', 'Cross-tenant platform staff', 1, 1, NOW(3), NOW(3)),
  (NULL, 'tenant-admin',   'Tenant Administrator',   'Full access within a tenant',  1, 1, NOW(3), NOW(3)),
  (NULL, 'tenant-user',    'Tenant User',            'Standard tenant user',         1, 1, NOW(3), NOW(3)),
  (NULL, 'tenant-viewer',  'Tenant Viewer',          'Read-only tenant access',      1, 1, NOW(3), NOW(3));

-- =====================================================================
-- Seed dev users — match Keycloak realm seeded in infra/docker/_dev/keycloak/import/ulp-realm.json
-- =====================================================================
INSERT IGNORE INTO m_user (tenant_id, country_code, keycloak_subject, email, display_name, status, preferred_locale, preferred_timezone, created_at_utc, modified_at_utc) VALUES
  (1001, 'IN', '00000000-0000-0000-0000-000000001001', 'in-admin@ulp.local', 'India Admin', 'Active', 'en-IN', 'Asia/Kolkata',     NOW(3), NOW(3)),
  (1001, 'IN', '00000000-0000-0000-0000-000000001002', 'in-user@ulp.local',  'India User',  'Active', 'en-IN', 'Asia/Kolkata',     NOW(3), NOW(3)),
  (2001, 'US', '00000000-0000-0000-0000-000000002001', 'us-admin@ulp.local', 'US Admin',    'Active', 'en-US', 'America/New_York', NOW(3), NOW(3)),
  (2001, 'US', '00000000-0000-0000-0000-000000002002', 'us-user@ulp.local',  'US User',     'Active', 'en-US', 'America/New_York', NOW(3), NOW(3));

INSERT INTO _ulp_schema_version (version, source, notes)
VALUES ('m26-tables', 'db/m26/01-m26-tables.sql', 'M26 RBAC tables created (Phase 1)')
ON DUPLICATE KEY UPDATE applied_at_utc = CURRENT_TIMESTAMP(3);
