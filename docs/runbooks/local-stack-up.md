# Runbook — Start the local ULP stack

## Prerequisites
- Docker Desktop (Windows / Mac) or Docker Engine + Compose plugin (Linux)
- ~4 GB free RAM, ~5 GB free disk
- These ports free on your host: 3306, 6379, 5672, 15672, 9000, 9001, 1025, 8025, 8080, 6333, 6334

If a port is busy, copy `infra/docker/docker-compose.override.example.yml` to `docker-compose.override.yml` and remap.

## Start (one-liner)

```powershell
# Windows — PowerShell 7 (pwsh)
pwsh ./infra/scripts/stack-up.ps1

# Windows — Windows PowerShell 5.1 (built-in `powershell`) or cmd.exe
powershell -ExecutionPolicy Bypass -File .\infra\scripts\stack-up.ps1
```

```bash
# Linux / Mac
./infra/scripts/stack-up.sh
```

The script:
1. Creates `infra/docker/.env` from `.env.example` if missing.
2. Runs `docker compose up -d --wait` (waits for all healthchecks to pass).
3. Prints UIs and test credentials.

First run takes ~3–5 minutes (image pulls + MySQL/Keycloak first-boot init).

## Verify

```powershell
docker compose -f infra/docker/docker-compose.yml ps
```

All services should show `healthy` (except `ulp-minio-init`, which exits after seeding buckets — that's correct).

## What's running

| Service | UI | Credentials |
|---|---|---|
| MySQL 8 | — (use a client on `localhost:3306`) | root / dev_password (or ulp / dev_password) |
| Redis 7 | — | (no auth in dev) |
| RabbitMQ | http://localhost:15672 | ulp / dev_password |
| MinIO | http://localhost:9001 | ulp / dev_password_min8 |
| MailHog | http://localhost:8025 | — |
| Keycloak | http://localhost:8080 | admin / admin (master); test users below |
| Qdrant | http://localhost:6333/dashboard | — |

## Pre-seeded Keycloak test users

Realm: **ulp** — login at http://localhost:8080/realms/ulp/account

| User | Password | Tenant | Country | Region | Role |
|---|---|---|---|---|---|
| in-admin@ulp.local | DevPass!2345 | 1001 | IN | in-central | ulp-admin |
| in-user@ulp.local | DevPass!2345 | 1001 | IN | in-central | ulp-user |
| us-admin@ulp.local | DevPass!2345 | 2001 | US | us-east | ulp-admin |
| us-user@ulp.local | DevPass!2345 | 2001 | US | us-east | ulp-user |
| platform-admin@ulp.local | DevPass!2345 | 0 | IN | in-central | platform-admin |

## Pre-seeded MinIO buckets

- `ulp-invoices` (WORM, 8-yr retention attempted)
- `ulp-audit-logs` (WORM)
- `ulp-customs-documents` (WORM, 5-yr)
- `ulp-pod-photos` (lifecycle: 365-day expire)
- `ulp-exports` (lifecycle: 30-day expire)
- `ulp-user-uploads` (no retention rule)

## Apply the v2.0 DB schema

After the stack is up, apply the schema once:

```powershell
# pwsh (PS 7)
pwsh ./infra/scripts/init-db.ps1

# Windows PowerShell 5.1 / cmd.exe
powershell -ExecutionPolicy Bypass -File .\infra\scripts\init-db.ps1
```

```bash
./infra/scripts/init-db.sh
```

This applies [ulpReq/ULP_DBD_v2.0_Schema.sql](../../ulpReq/ULP_DBD_v2.0_Schema.sql) to `ulp_dev` and records the version in `_ulp_schema_version`.

## Stop

```powershell
# pwsh
pwsh ./infra/scripts/stack-down.ps1            # preserves data
pwsh ./infra/scripts/stack-down.ps1 -Wipe      # wipes volumes

# Windows PowerShell 5.1 / cmd.exe
powershell -ExecutionPolicy Bypass -File .\infra\scripts\stack-down.ps1
powershell -ExecutionPolicy Bypass -File .\infra\scripts\stack-down.ps1 -Wipe
```

```bash
./infra/scripts/stack-down.sh
./infra/scripts/stack-down.sh --wipe
```

## Full reset

When state goes weird:

```powershell
pwsh ./infra/scripts/reset-local.ps1
```

Stops, wipes volumes, restarts, reapplies schema.
