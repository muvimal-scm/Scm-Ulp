# ADR 0036 — Local Infrastructure Stack (Phase 1)

**Status:** Accepted
**Date:** 2026-05-02
**Decider:** Shankar
**Supersedes:** N/A
**Related:** ADR 031–035 (in [Master Plan](../../ulpReq/ULP_Rework_MasterPlan_v1.0.docx))

## Context

Phase 1 (months 1–2) requires a local development environment runnable on any developer's laptop. The v2.0 design assumes Azure-managed services in production, but Phase 1 cannot depend on cloud accounts — too slow to onboard, too expensive for daily dev cycles, and the brief explicitly required "open-source first, that should be migrate or changeable later".

We need: a relational DB, distributed cache, message broker, blob store, mail capture, identity provider, and a vector DB. Each must be free, OSS, and self-hostable; each must have a documented production swap path.

## Decision

Adopt a single Docker Compose stack at [infra/docker/docker-compose.yml](../../infra/docker/docker-compose.yml) with these services:

| Service | Image | Production swap target | Abstraction |
|---|---|---|---|
| MySQL 8 | `mysql:8.0` | Azure Database for MySQL Flexible Server | EF Core + Pomelo provider |
| Redis 7 | `redis:7-alpine` | Azure Cache for Redis | `IDistributedCache` |
| RabbitMQ | `rabbitmq:3-management-alpine` | Azure Service Bus | MassTransit (broker-agnostic) |
| MinIO | `minio/minio:latest` | Azure Blob Storage | `IStorageProvider` |
| MailHog | `mailhog/mailhog:latest` | Azure Communication Services | `IEmailSender` |
| Keycloak 24 | `quay.io/keycloak/keycloak:24.0` | Keycloak self-host OR Azure AD B2C | OIDC standard |
| Qdrant | `qdrant/qdrant:latest` | Qdrant Cloud OR self-hosted | Qdrant client |

Plus one auxiliary service:
- **Postgres 16** as Keycloak's persistence backend — Keycloak's `dev-mem` mode loses state across restarts, which breaks dev iteration; using a dedicated Postgres avoids this.
- **`minio-init`** one-shot container that creates the six WORM/lifecycle buckets via `mc` after MinIO is healthy.

### Configuration

- All ports, passwords, and database names parameterised via `.env` (template: `.env.example`).
- Per-developer overrides in `docker-compose.override.yml` (gitignored).
- All services have healthchecks; `docker compose up -d --wait` blocks until everything is green.
- MySQL forced UTC, `utf8mb4` / `utf8mb4_0900_ai_ci`, strict SQL mode (matches v2.0 DB conventions).
- Keycloak realm pre-imported with: `ulp` realm, `ulp-web` SPA client (PKCE), `ulp-api` resource server, `ulp-worker` service account, `ulp-mobile` public client, custom claim mappers (`tenant_id`, `country_code`, `region`, `permissions`), and 5 test users (IN admin/user, US admin/user, platform-admin).
- MinIO buckets seeded automatically: `ulp-invoices`, `ulp-audit-logs`, `ulp-pod-photos`, `ulp-customs-documents`, `ulp-exports`, `ulp-user-uploads`.

### Operations

Cross-platform scripts in [infra/scripts/](../../infra/scripts/):
- `stack-up.{ps1,sh}` — start + wait for healthy + print UIs/credentials.
- `stack-down.{ps1,sh}` — stop (with optional `-Wipe`/`--wipe`).
- `init-db.{ps1,sh}` — apply [ulpReq/ULP_DBD_v2.0_Schema.sql](../../ulpReq/ULP_DBD_v2.0_Schema.sql).
- `reset-local.{ps1,sh}` — full nuke + recreate.

## Consequences

### Better
- Zero cloud cost during Phases 1–4 (most of the build).
- New developer onboarding: clone + `stack-up` → working environment in <10 minutes.
- All abstractions in place — production migration is config / DI swap, no code rewrite.
- Test users seeded with both IN and US tenant attributes — country-aware testing works from day one.

### Worse
- Dev environment isn't a 1:1 copy of production (different DB engine variant, no managed-service quotas/throttling, no cross-region failover).
- Healthcheck timing on Keycloak is finicky — first boot can take 90s+ on slow disks.
- MinIO object-lock can only be enabled at bucket creation; in dev we approximate with retention rules and lifecycle policies, accepting this gap.

### Now possible
- All 13 modules planned for Phases 1–2 can develop and run integration tests without external dependencies.
- CI can stand up the same stack via `docker compose up -d --wait` in a GitHub Actions runner.
- Production migration to Azure becomes a Phase 5 task scoped to IaC + DI registration changes.

### Now harder
- Testing failure modes that only happen with managed services (e.g., Service Bus dead-lettering quirks) — must be done in stage, not local.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Direct dev against Azure dev-tier resources | Cost, latency, onboarding friction, account governance overhead |
| Aspire (.NET local orchestration) | Promising but ties us to .NET-only services; we have a Python AI service (M28) and KMP mobile that would be second-class citizens |
| Tilt / DevSpace / Skaffold (Kubernetes-based local dev) | Over-engineered for Phase 1; will reconsider for Phase 5 self-host story |
| Postgres for the main DB | The v2.0 design mandates MySQL 8 — out of scope to revisit here |
| LocalStack for everything | LocalStack is AWS-flavoured; we're Azure-flavoured. MinIO is the closer match for blob; Keycloak is the closer match for B2C |

## Verification

After running `stack-up.ps1`:
- All 8 services report `healthy` in `docker compose ps`.
- http://localhost:8080/realms/ulp/account loads and accepts `in-admin@ulp.local / DevPass!2345`.
- MinIO console at http://localhost:9001 shows the 6 ULP buckets.
- After `init-db.ps1`, `SELECT * FROM _ulp_schema_version` in `ulp_dev` returns `v2.0`.
