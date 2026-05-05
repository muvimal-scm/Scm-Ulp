# Runbook — End-to-end smoke test

After Phase 1 streams 1–3 land, run this once to confirm everything wires up.
Time: ~15 minutes once prerequisites are installed.

## Prerequisites (one-time)

| Tool | Version | Install |
|---|---|---|
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop/ |
| .NET 8 SDK | 8.0.300+ | https://dotnet.microsoft.com/download/dotnet/8.0 |
| Node.js | 20 LTS | https://nodejs.org/ |
| PowerShell 7 (recommended) | 7.4+ | `winget install Microsoft.PowerShell` |

Verify:
```powershell
docker --version
dotnet --version
node --version    # should be v20.x
```

## Step 1 — Bring up the local infra stack

Open PowerShell at the repo root.

```powershell
cd D:\Immortal-2025\ProductRequirements\ULPscmProject
pwsh .\infra\scripts\stack-up.ps1
```

**Expected:** ~3–5 minutes for first run (image pulls). Then output lists:

```
RabbitMQ : http://localhost:15672
MinIO    : http://localhost:9001
MailHog  : http://localhost:8025
Keycloak : http://localhost:8080
Qdrant   : http://localhost:6333/dashboard
Test users: in-admin@ulp.local / us-admin@ulp.local  (DevPass!2345)
```

**Verify:** open http://localhost:8080 and click **Administration Console** — login with `admin / admin`. You should see the **ulp** realm in the realm dropdown (top-left).

If Keycloak says "realm not found", run `pwsh .\infra\scripts\stack-down.ps1 -Wipe` then `stack-up.ps1` again — first-time realm import only runs when Postgres is empty.

## Step 2 — Apply the database schema

```powershell
pwsh .\infra\scripts\init-db.ps1
```

**Expected:** prints `Schema v2.0 applied.` Verify:
```powershell
docker exec -i ulp-mysql mysql -uroot -pdev_password ulp_dev -e "SELECT version, applied_at_utc FROM _ulp_schema_version;"
```
Should return `v2.0` and a timestamp.

## Step 3 — Build and run the .NET API

In a **new** PowerShell window:

```powershell
cd D:\Immortal-2025\ProductRequirements\ULPscmProject\src\backend
dotnet restore
dotnet build
dotnet test
```

**Expected:**
- `Build succeeded. 0 Warning(s) 0 Error(s)`
- `Passed!` for `Ulp.Core.Domain.Tests` (9 tests).

Then:
```powershell
cd host\Ulp.Api
dotnet run
```

**Expected:** logs show `ULP API starting on http://localhost:5080`.

**Smoke test:** in a **third** PowerShell window:
```powershell
curl http://localhost:5080/health
```
Should return JSON with `"status":"ok"`, `"service":"ulp-api"`, a version, and a UTC time.

## Step 4 — Build and run the Angular SPA

In a **fourth** PowerShell window:

```powershell
cd D:\Immortal-2025\ProductRequirements\ULPscmProject\src\frontend\ulp-web
npm install
npm start
```

**Expected:**
- `npm install` takes ~2 minutes first time.
- `npm start` ends with `** Angular Live Development Server is listening on localhost:4200 **`.

## Step 5 — End-to-end log-in test

1. Open **http://localhost:4200** in a browser. You should see the SCMCube hero gradient with the **Sign in** button.
2. Click **Sign in** — you bounce to Keycloak's login page (URL changes to `localhost:8080`).
3. Log in with `in-admin@ulp.local` / `DevPass!2345`.
4. You bounce back to **http://localhost:4200/app/dashboard**.

**Expected on the dashboard:**
- Heading: "Welcome, in-admin@ulp.local"
- Below it: `Tenant 1001 · Country IN · Region in-central`
- **API Health card** — status `ok`, service `ulp-api`, version, and a UTC timestamp.
- **Permissions card** — list of permissions from the JWT (`invoice.write`, `shipment.write`, etc.).

## Step 6 — Verify the US tenant

Click your username in the top nav → **Sign out**. Sign back in as `us-admin@ulp.local` / `DevPass!2345`.

**Expected:**
- Same dashboard but `Tenant 2001 · Country US · Region us-east`.
- The API Health card still works (same backend serves both regions in dev).

## What this proves

✅ Docker stack: 8 services + Postgres for Keycloak all healthy
✅ MySQL: schema applied, can be queried via Pomelo/EF Core
✅ Keycloak: realm imported, both IN and US test users authenticate via PKCE
✅ Backend: builds clean, tests pass, runs on :5080, accepts JWT
✅ Frontend: builds clean, runs on :4200, integrates with Keycloak, calls backend
✅ Tenant context: country_code / tenant_id / region claims flow end-to-end
✅ Design system: SCMCube purple+coral hero gradient, mild interior surfaces, locked palette

## What this does NOT prove (deferred to module work)

- ❌ Any actual business module (M1, M3, M5, M8, M13, M17, M21, M24, M26, M27)
- ❌ Country plugin DI resolution (no plugins implemented yet)
- ❌ Background jobs (Hangfire) and message bus (RabbitMQ) — wire alongside first job
- ❌ MinIO blob upload/download path — wire alongside M21 Doc Management
- ❌ Mobile (KMP) and Desktop (Electron) clients — Phase 2/4

## Tear down

```powershell
pwsh .\infra\scripts\stack-down.ps1            # preserves data
pwsh .\infra\scripts\stack-down.ps1 -Wipe      # wipes volumes
```

## If something fails

See [troubleshooting.md](troubleshooting.md). Most common: port already in use → use `docker-compose.override.yml` to remap.
