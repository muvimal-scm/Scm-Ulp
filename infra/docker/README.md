# infra/docker/

Local MVP stack via Docker Compose. **Phase 1 — operational.**

Reference: [../../.claude/skills/docker-compose-mvp/SKILL.md](../../.claude/skills/docker-compose-mvp/SKILL.md), [ADR 0036](../../docs/adr/0036-local-infra-stack.md).

## Quick start

```powershell
# Windows
pwsh ../scripts/stack-up.ps1
```

```bash
# Linux / Mac
../scripts/stack-up.sh
```

Then apply the v2.0 schema: `pwsh ../scripts/init-db.ps1` (or `init-db.sh`).

Full runbook: [../../docs/runbooks/local-stack-up.md](../../docs/runbooks/local-stack-up.md). Troubleshooting: [../../docs/runbooks/troubleshooting.md](../../docs/runbooks/troubleshooting.md).

## Services

| Service | Port(s) | UI | Default credentials |
|---|---|---|---|
| MySQL 8 | 3306 | — | root / dev_password (also `ulp` user) |
| Redis 7 | 6379 | — | — |
| RabbitMQ | 5672, 15672 | http://localhost:15672 | ulp / dev_password |
| MinIO | 9000, 9001 | http://localhost:9001 | ulp / dev_password_min8 |
| MailHog | 1025, 8025 | http://localhost:8025 | — |
| Keycloak 24 | 8080 | http://localhost:8080 | admin / admin |
| Keycloak DB (Postgres 16) | (internal only) | — | — |
| Qdrant | 6333, 6334 | http://localhost:6333/dashboard | — |

## Files

| File | Purpose |
|---|---|
| [docker-compose.yml](docker-compose.yml) | Main stack definition |
| [.env.example](.env.example) | Environment-variable template (copy to `.env`) |
| [docker-compose.override.example.yml](docker-compose.override.example.yml) | Per-developer overrides template |
| [_dev/mysql/init/](_dev/mysql/init/) | First-boot SQL — creates `ulp_dev` + `ulp_test`, sets UTC, creates `_ulp_schema_version` marker table |
| [_dev/keycloak/import/ulp-realm.json](_dev/keycloak/import/ulp-realm.json) | Pre-imported realm: ulp-web/api/worker/mobile clients + IN+US test users + tenant_id/country_code/region claim mappers |
| [_dev/minio/buckets/init-buckets.sh](_dev/minio/buckets/init-buckets.sh) | Bucket bootstrap (run by `minio-init` one-shot container) |

## Pre-seeded test users (Keycloak realm `ulp`)

Login at http://localhost:8080/realms/ulp/account or via the Angular SPA.

| User | Tenant | Country | Region |
|---|---|---|---|
| `in-admin@ulp.local` | 1001 | IN | in-central |
| `in-user@ulp.local` | 1001 | IN | in-central |
| `us-admin@ulp.local` | 2001 | US | us-east |
| `us-user@ulp.local` | 2001 | US | us-east |
| `platform-admin@ulp.local` | 0 | IN | in-central |

All with password `DevPass!2345`.

## Pre-seeded MinIO buckets

| Bucket | Container enum | Retention |
|---|---|---|
| ulp-invoices | Invoices | WORM, 8-yr (best-effort in dev) |
| ulp-audit-logs | AuditLogs | WORM, permanent |
| ulp-pod-photos | PodPhotos | 365-day expire |
| ulp-customs-documents | CustomsDocuments | WORM, 5-yr |
| ulp-exports | Exports | 30-day expire |
| ulp-user-uploads | UserUploads | tenant-controlled |

## Daily commands

```bash
docker compose up -d           # start
docker compose ps              # status
docker compose logs -f mysql   # tail one service
docker compose restart redis   # restart one service
docker compose down            # stop, preserve data
docker compose down -v         # stop + wipe volumes
```

## Production swap path

Each service has a documented Azure equivalent — production migration changes only DI registrations and connection strings, not application code. See [ADR 0036](../../docs/adr/0036-local-infra-stack.md).
