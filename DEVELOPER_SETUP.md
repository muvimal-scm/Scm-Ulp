# Developer Setup â€” ULP

**Goal:** From a fresh laptop clone to "I can click around the app" in **~10 minutes** (5 if Docker images are already cached).

---

## What you'll have running at the end

| Service | URL / port | Purpose |
|---|---|---|
| API host | http://localhost:5000 | .NET 8 Minimal API (all 13 modules) |
| Web SPA | http://localhost:4200 | Angular 17 frontend |
| Keycloak | http://localhost:8080 | Identity (`ulp` realm) â€” admin: `admin`/`admin` |
| MailHog UI | http://localhost:8025 | Captured outbound email |
| MinIO console | http://localhost:9001 | Blob storage browser â€” `minioadmin`/`minioadmin` |
| RabbitMQ UI | http://localhost:15672 | Message broker â€” `guest`/`guest` |
| MySQL | localhost:3306 | DB `ulp_dev` â€” `root`/`dev_password` |
| Redis | localhost:6379 | Cache (no auth in dev) |
| Qdrant | http://localhost:6333 | Vector DB (Phase 5) |

---

## Prerequisites (install once)

| Tool | Version | Verify |
|------|---------|--------|
| **Docker Desktop** (Win/Mac) or **Docker Engine** + Compose plugin (Linux) | 24+ | `docker --version` |
| **.NET 8 SDK** | 8.0.x | `dotnet --version` |
| **Node.js** | 20.x or later | `node --version` |
| **Git** | any recent | `git --version` |

> **Windows:** PowerShell 5.1 ships with Windows. `pwsh` (PowerShell 7) works but is not required. Use `powershell -ExecutionPolicy Bypass -File ...` for `.ps1` scripts.

---

## Setup â€” step by step

### 1. Clone the repo

```powershell
git clone <YOUR_PRIVATE_REMOTE_URL> ulp
cd ulp
```

> **First-time Windows path warning:** Some build artifacts under `bin/` and `obj/` may exceed Windows' 260-char path limit. If you hit "path too long" errors, enable long paths:
> ```powershell
> # Run as Administrator, once:
> New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
>   -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
> ```

### 2. Start the local infra stack

```powershell
powershell -ExecutionPolicy Bypass -File ./infra/scripts/stack-up.ps1     # Windows
./infra/scripts/stack-up.sh                                                # Mac / Linux
```

**Expected output:** `Container ulp-mysql Started`, `... ulp-keycloak Started`, etc., for ~7 services.

**Verify with:**
```powershell
docker ps --filter "name=ulp-" --format "table {{.Names}}\t{{.Status}}"
```

All containers should be `Up X seconds (healthy)`. If MySQL takes >60s to be healthy, wait â€” it has a slow first-time init.

### 3. Apply database schema + dev fixtures

```powershell
powershell -ExecutionPolicy Bypass -File ./infra/scripts/init-db.ps1      # Windows
./infra/scripts/init-db.sh                                                 # Mac / Linux
```

This runs ~30 SQL files in order: baseline → MasterData → Identity → DocumentManagement → Notifications → VendorManagement → PricingQuotation → DocumentGeneration → FreightForwarding → Sales → Procurement → LastMile → Accounting (+ India ext + finish ext) → Customs → Trucking → dev fixtures (parties, currencies, countries).

**Idempotent** â€” safe to re-run any time. All `CREATE TABLE IF NOT EXISTS` + `INSERT IGNORE`.

**Verify with:**
```powershell
docker exec ulp-mysql mysql -uroot -pdev_password ulp_dev -e "SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = 'ulp_dev';"
```
Should return ~150+ tables.

### 4. Build + run the backend

```powershell
dotnet run --project src/backend/host/Ulp.Api/Ulp.Api.csproj
```

**Expected output ends with:**
```
[hh:mm:ss INF] ULP API starting on http://localhost:5000
[hh:mm:ss INF] Now listening on: http://localhost:5000
```

**Verify with:** `curl http://localhost:5000/health` → `{"status":"ok",...}`

> First build downloads NuGet packages (~2â€“3 min). Subsequent builds are seconds.

### 5. Build + run the frontend

In **another terminal** (leave the API running):

```powershell
cd src/frontend/ulp-web
npm install      # ~2 min first time
npm start
```

**Expected output ends with:**
```
âœ” Compiled successfully.
Local:   http://localhost:4200/
```

> **If `npm start` crashes with "JavaScript heap out of memory":**
> ```powershell
> $env:NODE_OPTIONS = "--max-old-space-size=8192"
> npm start
> ```

### 6. Click around

1. Open http://localhost:4200
2. Sign in via Keycloak (test users seeded â€” see [infra/docker/keycloak/](infra/docker/keycloak/))
3. Sidebar shows live modules: **Master Data, Identity, Document Management, Notifications, Vendor Management, Pricing & Quotation, Document Generation, Freight Forwarding, Sales, Procurement, Last-Mile Delivery, Accounting, Customs**
4. Click `Accounting → AR Invoices` to see seeded invoice data
5. Click `Customs → Entries` to see seeded CBP entries
6. Click `Freight Forwarding → Shipments` to see the Control Tower data

---

## Common tasks

### Stop everything

```powershell
powershell -ExecutionPolicy Bypass -File ./infra/scripts/stack-down.ps1   # Windows
./infra/scripts/stack-down.sh                                              # Mac / Linux
```

Data is preserved between runs â€” re-run `stack-up.ps1` to resume.

### Reset to clean slate (wipe DB, MinIO, RabbitMQ)

```powershell
powershell -ExecutionPolicy Bypass -File ./infra/scripts/reset-local.ps1
# then re-init
powershell -ExecutionPolicy Bypass -File ./infra/scripts/init-db.ps1
```

### Add a new SQL file

1. Drop your `db/{domain-name}/{order}-{name}.sql`
2. Add to `infra/scripts/init-db.ps1` (and `.sh`) `$Files` array in the right order
3. Re-run `init-db.ps1` â€” idempotent

### Tail backend logs

```powershell
# In the shell where dotnet run is running, just watch stdout.
# Logs use Serilog â€” structured + colored.
```

### Check MailHog for sent emails

http://localhost:8025 â€” every email the API sends (notifications, past-due notices, IRN acks etc.) lands here in dev.

---

## Troubleshooting

### MySQL container "unhealthy"

```powershell
docker logs ulp-mysql --tail 50
```

If you see `Access denied for user 'root'@'localhost'`, the volume from a previous run has a different password. Run:
```powershell
powershell -ExecutionPolicy Bypass -File ./infra/scripts/reset-local.ps1
powershell -ExecutionPolicy Bypass -File ./infra/scripts/stack-up.ps1
```

### `dotnet build` fails with "could not load file Ulp.X.Domain"

Likely an `obj/` cache issue from before a folder rename. Clean and retry:
```powershell
Get-ChildItem src/backend -Recurse -Directory -Include 'bin','obj' | Remove-Item -Recurse -Force
dotnet build src/backend/host/Ulp.Api/Ulp.Api.csproj
```

### `ng build` JavaScript heap out of memory

```powershell
$env:NODE_OPTIONS = "--max-old-space-size=8192"
ng build
```

Add this to your shell profile to make it permanent.

### Port already in use

| Port | Service | Fix |
|---|---|---|
| 5000 | API | `Stop-Process -Name dotnet -Force` |
| 4200 | SPA | `Stop-Process -Name node -Force` |
| 3306 | MySQL | Some other MySQL is running â€” stop it or `MYSQL_PORT=3307 ./infra/scripts/stack-up.ps1` |
| 8080 | Keycloak | Tomcat / another app on 8080 â€” close it |

### Keycloak login fails

```powershell
powershell -ExecutionPolicy Bypass -File ./infra/scripts/sync-keycloak-subs.ps1
```

This re-syncs Keycloak user `sub` claims with `m_user.subject_id` so the JWT tenant resolver can find users.

### "I changed an SQL file but the change didn't take effect"

`init-db.ps1` uses `IF NOT EXISTS` / `INSERT IGNORE` â€” schema changes to existing tables don't apply. To pick them up:
1. Drop the table: `docker exec ulp-mysql mysql -uroot -pdev_password ulp_dev -e "DROP TABLE m{N}_table_name;"`
2. Re-run `init-db.ps1`

For column additions, use the idempotent `information_schema` gate pattern â€” see `db/master-data-ext/01-m1-profile-extensions.sql` for an example.

### "How do I add a new module?"

See [CONTRIBUTING.md → Adding a new module](CONTRIBUTING.md#adding-a-new-module).

---

## Where things live

| What | Where |
|---|---|
| API endpoints | `src/backend/modules/{DomainName}/Ulp.{DomainName}.Api/{DomainName}Endpoints.cs` |
| Domain entities | `src/backend/modules/{DomainName}/Ulp.{DomainName}.Domain/Entities/` |
| EF Core DbContext | `src/backend/modules/{DomainName}/Ulp.{DomainName}.Infrastructure/Persistence/{DomainName}DbContext.cs` |
| Module DI registration | `src/backend/modules/{DomainName}/Ulp.{DomainName}.Infrastructure/{DomainName}Registration.cs` |
| SQL schemas | `db/{kebab-name}/01-m{N}-tables.sql` |
| SQL fixtures | `db/{kebab-name}/02-m{N}-fixtures.sql` |
| Frontend feature | `src/frontend/ulp-web/src/app/features/{kebab-name}/` |
| Frontend route | `src/frontend/ulp-web/src/app/app.routes.ts` |
| Sidebar nav | `src/frontend/ulp-web/src/app/core/shell/app-shell.component.ts` |
| Composition root | `src/backend/host/Ulp.Api/Program.cs` |
| Solution file | `src/backend/Ulp.sln` |
| Local infra | `infra/docker/docker-compose.yml` |
| Setup scripts | `infra/scripts/*.ps1` and `*.sh` |
| Sealed design docs | `ulpReq/*.docx` |
| Project conventions | `CLAUDE.md` (read this) |

---

## Need help?

- **Build broken after a pull:** `git status` → check for uncommitted local changes; clean `bin/`+`obj/`; rebuild
- **Schema/fixture problem:** check `db/{domain-name}/` SQL files; run `init-db.ps1` again
- **Auth problem:** check Keycloak admin at http://localhost:8080
- **Anything else:** Shankar
