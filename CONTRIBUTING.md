# Contributing to ULP

## Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine + Compose plugin** (Linux)
- **.NET 8 SDK** (`dotnet --version` should print 8.x)
- **Node.js 20+** (`node --version` should print v20.x or later)
- **PowerShell 5.1+** (Windows; pre-installed) or **bash** (Mac/Linux)
- **Python 3.11+** (only when working in `src/ai/` â€” Phase 5)
- **JDK 17 + Android Studio** (only when working in `src/mobile/` â€” Phase 5)

## First-time setup (5 minutes)

> See [DEVELOPER_SETUP.md](DEVELOPER_SETUP.md) for the troubleshooting-friendly happy-path.

### 1. Start the local infra stack

```powershell
powershell -ExecutionPolicy Bypass -File ./infra/scripts/stack-up.ps1     # Windows
./infra/scripts/stack-up.sh                                                # Mac / Linux
```

This starts: MySQL 8, Redis 7, RabbitMQ, MinIO, MailHog, Keycloak, Qdrant. See [infra/docker/README.md](infra/docker/README.md) for ports + credentials.

### 2. Apply database schema + dev fixtures

```powershell
powershell -ExecutionPolicy Bypass -File ./infra/scripts/init-db.ps1      # Windows
./infra/scripts/init-db.sh                                                 # Mac / Linux
```

The script is **idempotent** â€” safe to re-run any time. It applies `db/baseline/` then each module's `db/m*/01-*-tables.sql` and `02-*-fixtures.sql` in order, ending with `db/dev-fixtures/` (parties, currencies, countries seeded for tenants 1001/IN and 2001/US).

### 3. Build + run the backend

```powershell
dotnet run --project src/backend/host/Ulp.Api/Ulp.Api.csproj
```

API at `http://localhost:5000`. Health check: `curl http://localhost:5000/health`.

### 4. Build + run the frontend

In another shell:

```powershell
cd src/frontend/ulp-web
npm install      # first time only
npm start
```

SPA at `http://localhost:4200`. Auth: Keycloak `ulp` realm at `http://localhost:8080`.

## Daily workflow

```powershell
# Start infra (if not already running)
powershell -ExecutionPolicy Bypass -File ./infra/scripts/stack-up.ps1

# Backend in watch mode
dotnet watch run --project src/backend/host/Ulp.Api/Ulp.Api.csproj

# Frontend in watch mode
cd src/frontend/ulp-web
npm start

# Stop infra (preserves data)
powershell -ExecutionPolicy Bypass -File ./infra/scripts/stack-down.ps1

# Reset to clean slate (wipes MySQL data, MinIO buckets, RabbitMQ queues)
powershell -ExecutionPolicy Bypass -File ./infra/scripts/reset-local.ps1
```

## Naming convention (must follow)

See [README.md -> Naming convention](README.md#naming-convention-single-source-of-truth). **Every name uses the business domain (PascalCase or kebab-case form) — never module numbers.** The only place `m{N}` survives is inside DB **table** prefixes (`m17_invoice`, `m4us_entry`) — this matches the sealed design package and avoids destructive migrations.

| Place | Pattern | Example |
|---|---|---|
| Backend folder | `{DomainName}/` | `Accounting/` |
| .NET project | `Ulp.{DomainName}.{Layer}.csproj` | `Ulp.Accounting.Api.csproj` |
| C# namespace | `Ulp.{DomainName}.{Layer}` | `Ulp.Accounting.Domain` |
| API base | `/api/v1/{kebab-name}/...` | `/api/v1/accounting/invoices` |
| Frontend folder | `src/app/features/{kebab-name}/` | `src/app/features/accounting/` |
| Frontend route | `/app/{kebab-name}` | `/app/accounting` |
| DB folder | `db/{kebab-name}/` | `db/accounting/` |
| DB SQL files | `{order}-{kebab-name}-{purpose}.sql` | `01-accounting-tables.sql` |
| DB tables | `m{N}_*`, `m{N}in_*`, `m{N}us_*` | `m17_invoice`, `m17in_irn` |

## Hard rules

See [CLAUDE.md](CLAUDE.md) for the full list. Critical ones:

- **Money:** never `decimal` for monetary values â€” always `Money(amount, currency)`
- **Time:** server-side use NodaTime (`Instant`, `LocalDate`); never `DateTime.UtcNow` for business logic. Frontend uses Luxon
- **Tenancy:** every tenant-scoped table has `tenant_id INT NOT NULL` + `country_code CHAR(2)`. EF Core global query filter on `tenant_id` makes cross-tenant access impossible by construction
- **Plugins:** country-specific behavior lives behind 7 interfaces (`IComplianceProvider`, `ITaxProvider`, `ICustomsProvider`, etc.). Never `if (country == "IN")` in core code
- **DB tables:** `m{N}_*` for core, `m{N}in_*` for India plugin, `m{N}us_*` for US plugin. No SQL JOINs across module prefixes â€” use module APIs / events
- **Constraint names:** prefix all FK/UNIQUE/INDEX names with the module code (e.g. `fk_m17_inv_customer`) â€” MySQL constraint namespace is db-global
- **Brand:** purple `#3F2D7C` primary, mild coral `#EF7D7E` accent; use design tokens from `src/frontend/ulp-web/src/styles/_tokens.scss` â€” never hardcode hex

## Code style

- **C# 12:** nullable reference types on, file-scoped namespaces, primary constructors where they help
- **Angular 17:** standalone components, Signals for state, OnPush change detection, new control flow (`@if`, `@for`)
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`)

## Testing

```powershell
# Backend unit + integration
dotnet test src/backend/Ulp.sln

# Frontend
cd src/frontend/ulp-web && npm test

# E2E (Playwright â€” wired in Phase 5)
cd tests/e2e && npx playwright test
```

Coverage gates: 70% backend, 60% frontend.

## Adding a new module

1. Read the corresponding LLD in `ulpReq/` (e.g. `ULP_LLD_M{N}_*.docx`).
2. Pick a clean **DomainName** for the module (PascalCase, business term, not "Module" or numbered).
3. Scaffold under `src/backend/modules/{DomainName}/` following the 4-layer pattern (Domain / Application / Infrastructure / Api). Project files: `Ulp.{DomainName}.Domain.csproj` etc.
4. Add tables under `db/{kebab-name}/` with the module's prefix (`m{N}_*`). Fixtures in `02-m{N}-fixtures.sql`.
5. Wire into `src/backend/host/Ulp.Api/Program.cs`:
   - `builder.Services.Add{DomainName}Module(builder.Configuration);`
   - `app.Map{DomainName}Endpoints();`
6. Update `src/backend/host/Ulp.Api/Ulp.Api.csproj` with `<ProjectReference>` lines for all 4 layers.
7. Add to `infra/scripts/init-db.ps1` so a fresh laptop picks it up.
8. Write tests next to the code (unit) + in `tests/integration/` (integration).
9. Frontend: add `src/app/features/{kebab-name}/` with types, API service, home, routes, and component pages. Wire route in `src/app/app.routes.ts` and sidebar group in `src/app/core/shell/app-shell.component.ts`.

## Adding a country plugin

1. Read [ulpReq/ULP_Internationalization_Guide_v1.0.docx](ulpReq/ULP_Internationalization_Guide_v1.0.docx).
2. Identify which interfaces you implement (`ICustomsProvider`, `ITaxProvider`, etc.).
3. Scaffold under `src/backend/plugins/{country}/Ulp.Plugin.{Country}.{Concern}/` â€” one assembly per concern.
4. Plugin entry-point: implement `IUlpPlugin` with `CountryCode` and `ConfigureServices`.
5. Wire into `Program.cs` â€” see how `IndiaTaxPlugin` is registered.
6. Add country-aware tests using `[Theory]` per `.claude/skills/xunit-testing/SKILL.md`.

## Where to ask questions

- **Design intent:** check `ulpReq/` first â€” the answer is almost always there.
- **Stack-specific patterns:** check `.claude/skills/`.
- **Anything else:** ask Shankar.
