# Runbook — Build and verify the .NET backend

## Prerequisites

Install the **.NET 8 SDK** (8.0.300 or newer):
- Windows: https://dotnet.microsoft.com/download/dotnet/8.0
- Verify: `dotnet --version` should print `8.0.x`

## First-time restore + build

```powershell
cd d:\Immortal-2025\ProductRequirements\ULPscmProject\src\backend
dotnet restore
dotnet build
```

First restore takes 2–4 minutes (downloads ~50 packages). Build itself is <30s after restore.

Expected output: `Build succeeded. 0 Warning(s) 0 Error(s)`.

## Run the API

```powershell
cd d:\Immortal-2025\ProductRequirements\ULPscmProject\src\backend\host\Ulp.Api
dotnet run
```

API binds to **http://localhost:5080** (per `Properties/launchSettings.json`).

Smoke tests:

```powershell
# Health (anonymous)
curl http://localhost:5080/health

# Whoami (requires JWT — get one from Keycloak)
curl http://localhost:5080/whoami -H "Authorization: Bearer $token"
```

## Get a JWT for testing

```powershell
$body = @{
    grant_type = "password"
    client_id  = "ulp-web"
    username   = "in-admin@ulp.local"
    password   = "DevPass!2345"
} | % { "$($_.Key)=$($_.Value)" } -join "&"

# Direct grant is disabled for ulp-web (PKCE-only). Use ulp-worker (service account) for scripts:
$resp = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8080/realms/ulp/protocol/openid-connect/token" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "grant_type=client_credentials&client_id=ulp-worker&client_secret=dev-worker-secret-change-me"
$token = $resp.access_token
```

Or — for browser-driven testing — log into Keycloak account console at http://localhost:8080/realms/ulp/account and copy the access token from devtools.

## Run unit tests

```powershell
cd d:\Immortal-2025\ProductRequirements\ULPscmProject\src\backend
dotnet test
```

Expected: `Ulp.Core.Domain.Tests` runs `Money` + `CountryCode` tests, all pass.

## Useful commands

```powershell
# Clean
dotnet clean

# Format check
dotnet format --verify-no-changes

# Outdated packages
dotnet list package --outdated

# Project graph (verifies references)
dotnet build --no-incremental --verbosity normal
```

## Where to start adding code

| Need | Project |
|---|---|
| New entity (e.g., `Customer`) | `src/backend/modules/M{N}.{Name}/Ulp.{Name}.Domain` |
| Use case / handler | `src/backend/modules/M{N}.{Name}/Ulp.{Name}.Application` |
| EF Core DbContext | `src/backend/modules/M{N}.{Name}/Ulp.{Name}.Infrastructure` |
| HTTP endpoints | `src/backend/modules/M{N}.{Name}/Ulp.{Name}.Api` |
| Country plugin | `src/backend/plugins/{country}/Ulp.Plugin.{Country}.{Concern}` |
| Cross-cutting helper | `src/backend/shared/Ulp.BuildingBlocks` (only if truly generic) |

Always check the relevant module LLD in `ulpReq/` and the matching SKILL.md in `.claude/skills/` before scaffolding code.
