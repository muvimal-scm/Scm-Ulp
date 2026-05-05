# ULP M26: RBAC + Tenant Management LLD

**Version:** 1.0 · **Status:** Drafted (awaiting Shankar approval) · **Compiled:** May 2026

**Authoritative sources (do not deviate):**
- `ulpReq/ULP_HLD_v2.0_MultiRegion.docx` §6 (Identity), §7 (cross-cutting), §9.1 (M26 in Tier-A catalog)
- `ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx` §4 — **M26 = 13 tables, +country_code on user, role**
- `ulpReq/ULP_SecurityComplianceArchitecture_v2.0.docx` §6 (IAM), §7 (PII), §9 (audit retention)
- `ulpReq/ULP_TenantLifecycleRunbook_v2.0.docx` (tenant onboarding workflow)
- `ulpReq/ULP_APISpecification_v2.0.docx` §6 (Idempotency-Key), §7 (error model)
- `.claude/skills/keycloak-mvp-identity/SKILL.md` — Keycloak realm config, JWT validation, claim mappers
- `.claude/skills/multi-region-tenant-context/SKILL.md` — `ITenantContext`, region-pinning, HTTP 421 routing
- `ulpReq/ULP_DBD_v2.0_Schema.sql` — `m_tenant` already specified (line 196 onward)

> **Indian client continuity** — every existing v1.0 user, role, and tenant record is preserved. `country_code` added to user/role tables only as a v2.0 enrichment (defaults to `IN` for legacy rows per DBD migration §3).

---

## 1. Module Purpose

M26 owns:
- **Tenant master** — onboarding, lifecycle (`Active`/`Suspended`/`Closed`), region-pinning, plan, configuration
- **User identity binding** — local user records linked to Keycloak subject IDs; tenant_id mapping
- **Roles & permissions** — role-based access control with tenant + country granularity
- **Permission grants** — module-level + entity-level + field-level (per HLD §7.1)
- **Per-tenant API keys** — service-to-service auth (sparing, machine accounts only)
- **Session lifecycle** — refresh-token rotation, revocation, audit
- **Real `ITenantContext` resolver** — JWT → tenant lookup → region check → HTTP 421 if misrouted
- **MFA tracking** — per-tenant policy + per-user enrolment status
- **Tenant onboarding workflow** — self-serve + assisted; per-region Keycloak realm provisioning

It is a **Tier-A** module per HLD §9.1 — country-agnostic core. Country-specific identifier validation lives in M1 plugins, not here.

## 2. Architecture

| Component | Scope |
|---|---|
| **Keycloak (per region)** | Identity provider; per-tenant realm or shared `ulp` realm with tenant_id claim. Existing realm config in `infra/docker/_dev/keycloak/import/ulp-realm.json` |
| **M26 metadata DB** | 13 tables `m26_*` + `m_tenant`/`m_user` (existing in DBD) |
| **`ITenantContextResolver`** | Per-request middleware: JWT.tenant_id → cached tenant lookup → region check → fail HTTP 421 if mismatch |
| **`ITenantOnboardingService`** | Hangfire-driven workflow: create realm, default roles, seed master data, send welcome email |
| **`AuthorizationPolicyProvider`** | Maps permission strings to ASP.NET Core authorization policies |

## 3. Database — 13 tables (matches DBD §4)

### 3.1 `m_tenant` (already in DBD `ULP_DBD_v2.0_Schema.sql`)
The base tenant table. M26 extends it with operational metadata in companion tables; the column shape is locked by DBD.

### 3.2 `m_user` (existing in v1.0; +country_code per DBD §4)
```sql
CREATE TABLE m_user (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT NOT NULL,
  country_code      CHAR(2) NOT NULL,            -- DBD §4: +country_code on user
  keycloak_subject  CHAR(36) NOT NULL,           -- Keycloak's `sub` claim
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(30),
  display_name      VARCHAR(150) NOT NULL,
  status            ENUM('Active','Invited','Suspended','Deactivated') NOT NULL,
  preferred_locale  VARCHAR(10),
  preferred_timezone VARCHAR(50),
  last_login_at_utc DATETIME(3),
  created_at_utc    DATETIME(3) NOT NULL,
  modified_at_utc   DATETIME(3) NOT NULL,
  UNIQUE KEY uq_keycloak_subject (keycloak_subject),
  UNIQUE KEY uq_tenant_email (tenant_id, email),
  CONSTRAINT fk_user_tenant FOREIGN KEY (tenant_id) REFERENCES m_tenant(id),
  CONSTRAINT fk_user_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.3 `m26_role` — Role definition (+country_code per DBD §4)
```sql
CREATE TABLE m26_role (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,                  -- NULL = system role
  country_code    CHAR(2),                       -- DBD §4: +country_code on role
  code            VARCHAR(50) NOT NULL,          -- "tenant-admin","cha-operator","accounts-manager"
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  is_system       TINYINT(1) DEFAULT 0,          -- baked-in roles cannot be edited
  is_active       TINYINT(1) DEFAULT 1,
  created_at_utc  DATETIME(3) NOT NULL,
  modified_at_utc DATETIME(3) NOT NULL,
  UNIQUE KEY uq_tenant_code (tenant_id, code),
  CONSTRAINT fk_role_country FOREIGN KEY (country_code) REFERENCES m1_country(code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.4 `m26_permission` — Permission catalog
```sql
CREATE TABLE m26_permission (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  module_code     VARCHAR(10) NOT NULL,          -- "M4","M17"
  resource        VARCHAR(50) NOT NULL,          -- "shipment","invoice","user"
  action          ENUM('read','write','create','update','delete','approve','export','share') NOT NULL,
  scope           ENUM('module','entity','field') NOT NULL,
  description     TEXT,
  UNIQUE KEY uq_perm (module_code, resource, action, scope)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.5 `m26_role_permission` — Role → permissions (N:N)
```sql
CREATE TABLE m26_role_permission (
  role_id         BIGINT NOT NULL,
  permission_id   BIGINT NOT NULL,
  granted_at_utc  DATETIME(3) NOT NULL,
  granted_by      BIGINT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES m26_role(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES m26_permission(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.6 `m26_user_role` — User → roles (N:N)
```sql
CREATE TABLE m26_user_role (
  user_id        BIGINT NOT NULL,
  role_id        BIGINT NOT NULL,
  granted_at_utc DATETIME(3) NOT NULL,
  granted_by     BIGINT NOT NULL,
  expires_at_utc DATETIME(3),
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES m26_role(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.7 `m26_user_permission_override` — Direct user-level grant/revoke
```sql
CREATE TABLE m26_user_permission_override (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id      INT NOT NULL,
  user_id        BIGINT NOT NULL,
  permission_id  BIGINT NOT NULL,
  effect         ENUM('GRANT','DENY') NOT NULL,  -- DENY supersedes role-granted
  scope_filter   JSON,                            -- e.g. {"shipmentId":[123,456]} (entity scope)
  granted_by     BIGINT NOT NULL,
  granted_at_utc DATETIME(3) NOT NULL,
  expires_at_utc DATETIME(3),
  CONSTRAINT fk_upo_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE,
  CONSTRAINT fk_upo_perm FOREIGN KEY (permission_id) REFERENCES m26_permission(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.8 `m26_group` — Optional grouping for bulk role assignment
```sql
CREATE TABLE m26_group (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     INT NOT NULL,
  code          VARCHAR(50) NOT NULL,
  name          VARCHAR(150) NOT NULL,
  description   TEXT,
  UNIQUE KEY uq_tenant_code (tenant_id, code)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.9 `m26_user_group` + `m26_group_role` (composite N:N tables; counted as 2 tables)
```sql
CREATE TABLE m26_user_group (
  user_id  BIGINT NOT NULL,
  group_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, group_id),
  CONSTRAINT fk_ug_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE,
  CONSTRAINT fk_ug_group FOREIGN KEY (group_id) REFERENCES m26_group(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE m26_group_role (
  group_id BIGINT NOT NULL,
  role_id  BIGINT NOT NULL,
  PRIMARY KEY (group_id, role_id),
  CONSTRAINT fk_gr_group FOREIGN KEY (group_id) REFERENCES m26_group(id) ON DELETE CASCADE,
  CONSTRAINT fk_gr_role FOREIGN KEY (role_id) REFERENCES m26_role(id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.10 `m26_session` — Active session tracking (refresh-token allowlist)
```sql
CREATE TABLE m26_session (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  user_id         BIGINT NOT NULL,
  refresh_jti     CHAR(36) NOT NULL,            -- JWT ID of the refresh token
  ip_address      VARCHAR(45),
  user_agent      VARCHAR(500),
  issued_at_utc   DATETIME(3) NOT NULL,
  expires_at_utc  DATETIME(3) NOT NULL,
  last_seen_at_utc DATETIME(3),
  revoked_at_utc  DATETIME(3),
  revoked_reason  VARCHAR(100),
  UNIQUE KEY uq_jti (refresh_jti),
  INDEX idx_user_active (user_id, revoked_at_utc),
  CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.11 `m26_api_key` — Service-to-service keys
```sql
CREATE TABLE m26_api_key (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id          INT NOT NULL,
  name               VARCHAR(150) NOT NULL,
  key_hash           CHAR(64) NOT NULL,        -- sha256 of raw key
  key_prefix         CHAR(8) NOT NULL,         -- visible prefix for UI display
  scopes             JSON NOT NULL,            -- ["m21:read","m17:write"]
  created_by         BIGINT NOT NULL,
  created_at_utc     DATETIME(3) NOT NULL,
  expires_at_utc     DATETIME(3),
  last_used_at_utc   DATETIME(3),
  is_revoked         TINYINT(1) DEFAULT 0,
  revoked_at_utc     DATETIME(3),
  UNIQUE KEY uq_key_hash (key_hash)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.12 `m26_mfa_enrolment` — Per-user MFA factor registry
```sql
CREATE TABLE m26_mfa_enrolment (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  user_id         BIGINT NOT NULL,
  factor          ENUM('TOTP','FIDO2','SMS','EMAIL') NOT NULL,
  factor_label    VARCHAR(100),
  is_active       TINYINT(1) DEFAULT 1,
  enrolled_at_utc DATETIME(3) NOT NULL,
  last_used_at_utc DATETIME(3),
  CONSTRAINT fk_mfa_user FOREIGN KEY (user_id) REFERENCES m_user(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3.13 `m26_audit` — RBAC-specific audit (separate from M21 doc audit)
```sql
CREATE TABLE m26_audit (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     INT NOT NULL,
  actor_user_id BIGINT,
  action        ENUM('LOGIN','LOGOUT','GRANT_ROLE','REVOKE_ROLE','GRANT_PERM','REVOKE_PERM',
                     'CREATE_USER','DEACTIVATE_USER','ENROLL_MFA','UNENROLL_MFA',
                     'CREATE_API_KEY','REVOKE_API_KEY','TENANT_SUSPEND','TENANT_ACTIVATE') NOT NULL,
  target_user_id BIGINT,
  details       JSON,
  ip_address    VARCHAR(45),
  occurred_at_utc DATETIME(3) NOT NULL,
  INDEX idx_tenant_time (tenant_id, occurred_at_utc),
  INDEX idx_actor_time (actor_user_id, occurred_at_utc)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- 7-year retention per Security doc §9; partition by month
```

**Total: 13 tables** ✅ matches `ULP_DBD_v2.0_DatabaseDesign.docx §4`. (Counts: m_user + m26_role + m26_permission + m26_role_permission + m26_user_role + m26_user_permission_override + m26_group + m26_user_group + m26_group_role + m26_session + m26_api_key + m26_mfa_enrolment + m26_audit = 13. `m_tenant` is M0/cross-cutting per DBD.)

## 4. Permission catalog seed (per HLD §7.1 — module + entity + field granularity)

| module_code | resource | action | scope | description |
|---|---|---|---|---|
| `m1` | `party` | `read` | module | List/view parties |
| `m1` | `party` | `write` | module | Create/edit parties |
| `m1` | `product` | `read/write` | module | … |
| `m4` | `shipment` | `read/write/approve` | module | CHA shipments |
| `m17` | `invoice` | `read/write/approve` | entity | Per-invoice approval |
| `m17` | `invoice.creditLimit` | `read/write` | field | Field-level on credit limit |
| `m21` | `document` | `read/write/delete/share` | module | Doc store ops |
| `m26` | `user` | `read/write/delete` | module | Tenant user mgmt |
| `m26` | `role` | `read/write` | module | Tenant role mgmt |
| (more per module — seeded with each module's go-live) |

## 5. Real `ITenantContextResolver` (replaces dev stub)

Per `multi-region-tenant-context` skill — request flow:

1. JWT validated by ASP.NET JwtBearer middleware (Keycloak issuer)
2. `tenant_id` claim extracted (already configured in `ulp-realm.json`)
3. `ITenantLookup.GetAsync(tenantId)` → check L1 in-memory cache → L2 Redis → DB
4. Region check: `tenantRecord.Region` vs `IRegionResolver.FromHost(req.Host)`. Mismatch → HTTP 421 Misdirected with `Location` header pointing to correct region.
5. `ITenantContextImpl.Set(record)` for the rest of the request scope
6. EF Core `HasQueryFilter(e => e.TenantId == ctx.TenantId)` enforces row-level isolation

Cache invalidation: subscribe to `tenant.updated` MassTransit event; clear L1 + L2 keys.

## 6. APIs

All under `/api/v1/m26`:

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/users` | `m26.user.read` | Tenant user directory |
| `POST` | `/users/invite` | `m26.user.write` | Send invite via M27 |
| `PUT` | `/users/{id}` | `m26.user.write` | Update profile, roles |
| `POST` | `/users/{id}/deactivate` | `m26.user.delete` | Soft-deactivate |
| `GET` | `/roles` | `m26.role.read` | List roles |
| `POST` | `/roles` | `m26.role.write` | Create custom role |
| `PUT` | `/roles/{id}/permissions` | `m26.role.write` | Update role's permissions |
| `GET` | `/permissions` | `m26.role.read` | Permission catalog (read-only) |
| `POST` | `/users/{id}/mfa/enroll` | self | Start MFA enrolment |
| `GET` | `/me` | authenticated | Current user + effective permissions |
| `POST` | `/sessions/revoke` | self or `m26.user.write` | Force logout |
| `POST` | `/api-keys` | `m26.apikey.write` | Mint API key (returns raw key once) |
| `DELETE` | `/api-keys/{id}` | `m26.apikey.delete` | Revoke |
| `POST` | `/tenants/{id}/suspend` | platform-admin only | Tenant suspend |
| `POST` | `/tenants/{id}/activate` | platform-admin only | Tenant activate |

## 7. Tenant onboarding workflow (Hangfire)

Per `ULP_TenantLifecycleRunbook_v2.0.docx` references:
1. Self-serve signup → enqueue onboarding job
2. Provision Keycloak realm (or create user in shared `ulp` realm with claims)
3. Insert `m_tenant` row with `country_code`, default plan, region pinning
4. Seed default roles (tenant-admin, tenant-user, tenant-viewer)
5. Seed default M21 document classes (per M21 LLD §10)
6. Send welcome email via M27 with login link
7. Status → Active

## 8. Events

| Event | Consumers |
|---|---|
| `TenantCreated` | M21 (seed doc classes), M27 (welcome email), M24 (KPI seed) |
| `TenantSuspended` | M27 (notify users), M21 (block uploads), M24 (alert) |
| `UserInvited` | M27 (invite email) |
| `UserDeactivated` | M21 (revoke open shares), session revocation |
| `RoleGranted` / `RoleRevoked` | (cache invalidation) |

## 9. Security hard rules (per Security doc §6)

- All passwords NIST 800-63B aligned: 12+ chars, breach-list check, no forced rotation
- JWT lifetime: access 15 min, refresh 8 hours sliding (prod); 30 min / 10 hr in dev (already in `ulp-realm.json`)
- Failed login lockout: 5 attempts → 15 min (already in realm config)
- Tenant admins MAY mandate MFA per their tenant policy
- Workforce admins (Anthropic-internal-equivalent: ULP staff) MUST use Entra ID with MFA + Conditional Access (separate IdP from customer Keycloak)
- API keys: never logged in plaintext; only `key_prefix` shown in UI

## 10. Migration / Init

- Schema additions only (`+country_code` on `m_user`, `m26_role` per DBD §3 migration plan)
- Seed permission catalog on first deploy (idempotent: `INSERT IGNORE` per `(module_code,resource,action,scope)`)
- For dev: 2 fixture tenants already seeded by M1 (`tenant 1001`, `tenant 2001`) + 5 fixture users in Keycloak realm

## 11. Sign-off

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-XX | Initial draft. 13 tables matching DBD §4. JWT/Keycloak/ITenantContext patterns from referenced skills. |
