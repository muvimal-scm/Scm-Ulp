# ULP — Project Conventions for Claude Code

## What this project is

Unified Logistics Platform (ULP). Multi-region SaaS for logistics operators. Serves India + US on a single codebase via the Compliance Plugin Pattern. 27 modules: 15 Tier-A country-agnostic + 8 Tier-B with country plugins + 4 Tier-C country-specific.

## Authoritative sources

Always check these before making architectural decisions:

1. [ulpReq/ULP_Rework_FinalIndex_v2.1.docx](ulpReq/ULP_Rework_FinalIndex_v2.1.docx) — master navigation for all 38 design docs.
2. [ulpReq/ULP_HLD_v2.0_MultiRegion.docx](ulpReq/ULP_HLD_v2.0_MultiRegion.docx) — high-level design.
3. [ulpReq/ULP_Internationalization_Guide_v1.0.docx](ulpReq/ULP_Internationalization_Guide_v1.0.docx) — i18n contract (single source of truth for country abstractions).
4. [ulpReq/ULP_DevelopmentSequencing_v2.0.docx](ulpReq/ULP_DevelopmentSequencing_v2.0.docx) — phase plan.
5. [ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx](ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx) + [ulpReq/ULP_DBD_v2.0_Schema.sql](ulpReq/ULP_DBD_v2.0_Schema.sql) — DB design + DDL.
6. Module LLDs: [ulpReq/ULP_LLD_*.docx](ulpReq/) — per-module designs from the sealed v2.0 package (M1, M4, M4-US, M8, M13, M17, M17-US, M18-US, M19-US, M20-US, M24).
7. **Derived LLDs** for modules without an LLD in `ulpReq/`: [docs/lld/](docs/lld/) — drafted strictly from HLD §9, DBD §4 table counts, Security doc §6/§7, API Spec, and skills bundle. Currently locked: [M21 Doc Management](docs/lld/M21_DocManagement_v1.0.md), [M26 RBAC](docs/lld/M26_RBAC_v1.0.md), [M27 Notifications](docs/lld/M27_Notifications_v1.0.md), [M3 Vendor Management](docs/lld/M3_VendorManagement_v1.0.md). See [docs/lld/README.md](docs/lld/README.md) for lifecycle.
8. [docs/design/SCMCube-DesignSystem.md](docs/design/SCMCube-DesignSystem.md) + [ulpReq/DesignColorReference.jpg](ulpReq/DesignColorReference.jpg) — brand & visual design (locked by [ADR 0037](docs/adr/0037-scmcube-brand-design-system.md)).

## Skills (auto-discovered)

42 SKILL.md files in [.claude/skills/](.claude/skills/). Skills cover backend (.NET, EF Core, Hangfire, MassTransit, Polly, Serilog, xUnit), frontend (Angular 17, Material, charts, Leaflet), desktop (Electron), mobile (KMP), infra (Docker Compose, Terraform Azure, GitHub Actions, Keycloak), storage/messaging (Redis, MinIO, MailHog), AI (FastAPI/LangGraph, Qdrant), and country-specific business modules (8 IN + 6 US). When working in any of those areas, the relevant skill should be your first reference.

## Hard rules (non-negotiable)

### Brand & design system (SCMCube)

- The product is branded **SCMCube — NextGen Solutions**. Source of truth: [docs/design/SCMCube-DesignSystem.md](docs/design/SCMCube-DesignSystem.md). Reference image: [ulpReq/DesignColorReference.jpg](ulpReq/DesignColorReference.jpg). ADR: [docs/adr/0037-scmcube-brand-design-system.md](docs/adr/0037-scmcube-brand-design-system.md).
- **Brand primary** = purple `#3F2D7C` (`$brand-purple-900`). **Accent** = MILD coral `#EF7D7E` (`$accent-red-600`) — soft, not saturated. Errors only use `$semantic-danger-strong` `#D04E54`. Hero gradient = coral → pink → lavender (marketing/onboarding only). Interior screens stay **mild** — `$neutral-50` page bg, white cards, soft purple-tinted shadows.
- **Never hardcode hex values** in templates or component SCSS. Always use tokens from [src/frontend/ulp-web/src/styles/_tokens.scss](src/frontend/ulp-web/src/styles/_tokens.scss).
- **Ignore the indigo+amber sample** in [.claude/skills/angular-material-17/SKILL.md](.claude/skills/angular-material-17/SKILL.md) — it is illustrative only. The Material 17 theme in [src/frontend/ulp-web/src/styles/_theme.scss](src/frontend/ulp-web/src/styles/_theme.scss) is authoritative.
- Country-specific UI (`plugins-ui/india/`, `plugins-ui/us/`) inherits the SCMCube palette verbatim — no new colors per country.
- Adding a new color requires a new ADR superseding 0037.

### Money
Never use `decimal` or `double` for monetary values. Always `Money(amount, currency)`. Operations enforce same-currency. EF Core `ComplexProperty` mapping. JSON: `{ "amount": 1000.00, "currency": "USD" }`.

### Time
- DB: UTC, `DATETIME(3)`, column suffix `_utc`.
- API: ISO 8601 with offset.
- Display: tenant's IANA tz from `m_tenant.primary_time_zone`.
- C#: NodaTime (`Instant`, `ZonedDateTime`, `LocalDate`). Inject `IClock`. **Never** `DateTime.Now` / `DateTime.UtcNow` for business logic.
- TS: Luxon. **Never** `new Date()` for business logic.

### Tenancy
- Every tenant-scoped table: `tenant_id INT NOT NULL` + `country_code CHAR(2) NOT NULL` (ISO 3166-1).
- EF Core global query filter on `tenant_id` — cross-tenant access impossible by construction.
- Region pinning at API gateway: tenant → region map. No cross-region business-data replication.

### Plugins
- Country-specific behavior lives behind 7 interfaces: `IComplianceProvider`, `ITaxProvider`, `ICustomsProvider`, `IBankingProvider`, `IPayrollProvider`, `IIdentifierValidator`, `IStateTaxProvider`.
- Plugins live in [src/backend/plugins/india/](src/backend/plugins/india/) and [src/backend/plugins/us/](src/backend/plugins/us/).
- Resolution: tenant `country_code` → `compliance_plugins[]` → DI scoped instance.
- **Never** put country-specific logic in core modules. Tier-A modules must work with no plugin loaded.

### Schema naming
- `m_*` cross-cutting (tenant, user, address)
- `m1_*`, `m4_*`, ..., `m27_*` core module tables
- `m4in_*`, `m13in_*`, `m17in_*` India plugin tables
- `m4us_*`, `m13us_*`, `m17us_*` US plugin tables
- No SQL JOINs across module prefixes — module APIs / events only.

### Coding standards
- C# 12, nullable reference types enabled project-wide.
- Angular 17 strict mode, standalone components, Signals.
- Trunk-based dev, Conventional Commits, PR review required.
- Test coverage: ≥70% backend, ≥60% frontend.
- Locale-aware formatting always — never hardcode user-facing strings; use `.xlf` files for Angular i18n.

## Open-source-first infra

Phase 1–4 uses only open-source / locally-runnable services:

| Concern | Local (now) | Production (Phase 5) |
|---|---|---|
| DB | MySQL 8 (Docker) | Azure Database for MySQL Flexible Server |
| Cache | Redis 7 | Azure Cache for Redis |
| Broker | RabbitMQ | Azure Service Bus |
| Blob | MinIO | Azure Blob Storage |
| Mail | MailHog | Azure Communication Services |
| Identity | Keycloak | Keycloak self-hosted OR Azure AD B2C |
| Vector | Qdrant | Qdrant Cloud OR self-hosted |

All accessed through abstractions (`IEmailSender`, `IBlobStore`, `IBus`, etc.) — production swap is a DI registration change, **zero code changes**. Don't bake cloud-vendor SDKs into module code.

## Phase context (2026-05)

Phase 1 (months 1–2): infra + M1 + M21 + M26 + M27 + M3.

The plan: docker-compose first → .NET solution skeleton → DB schema applied → M1 first module. India + US tracks split at Phase 3 (months 5–6).

## Conventions for working in this repo

- Folders are scaffolded but mostly empty. Don't assume code exists — check first.
- Each major folder has its own `README.md` describing what goes there.
- ADRs live in [docs/adr/](docs/adr/) — write one whenever you make a decision that future-you would want explained.
- Local-dev runbooks live in [docs/runbooks/](docs/runbooks/).
- Generated files (EF migrations, Angular dist, Electron build) are gitignored when git is initialised — do not commit.

## When unsure

The design package in [ulpReq/](ulpReq/) is exhaustive. If a question has an answer there, use that answer. If it doesn't, ask Shankar — don't invent.
