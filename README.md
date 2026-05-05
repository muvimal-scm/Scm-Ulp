# Unified Logistics Platform (ULP) - SCMCube

Multi-region SaaS for logistics operators (freight forwarding, customs brokerage, transportation, accounting). Single codebase serving India + US tenants via the **Compliance Plugin Pattern**.

> **Repository visibility:** Private. Includes the sealed design package in `ulpReq/` - do not make this repo public.

---

## Status (as of 2026-05-03)

**Phase 1 + 2 + 3 partial + 4 partial delivered.** Modules wired into the API host with working frontend pages:

| Module folder | API base | Frontend URL | DB folder | DB prefix | Status |
|---------------|----------|--------------|-----------|-----------|--------|
| `Accounting/` | `/api/v1/accounting`, `/api/v1/accounting-ext` | `/app/accounting` | `db/accounting/`, `db/accounting-ext/` | `m17_*`, `m17in_*` | LIVE (FACube Finance) |
| `Customs/` | `/api/v1/customs` | `/app/customs` | `db/customs/` | `m4us_*` | LIVE (US CBP/ABI) |
| `Dashboards/` | - | - | - | - | folder scaffolded |
| `DocumentGeneration/` | `/api/v1/document-generation` | `/app/document-generation` | `db/document-generation/` | `m6_*` | LIVE |
| `DocumentManagement/` | `/api/v1/document-management` | `/app/document-management` | `db/document-management/` | `m21_*` | LIVE |
| `FreightForwarding/` | `/api/v1/freight-forwarding` | `/app/freight-forwarding` | `db/freight-forwarding/` | `m5_*` | LIVE |
| `Identity/` | `/api/v1/identity` | `/app/identity` | `db/identity/` | `m26_*` | LIVE (RBAC + JWT tenant resolver) |
| `LastMile/` | `/api/v1/last-mile` | `/app/last-mile` | `db/last-mile/` | `m9_*` | LIVE |
| `MasterData/` | `/api/v1/master-data` | `/app/master-data` | `db/master-data/`, `db/master-data-ext/` | `m1_*` | LIVE |
| `Notifications/` | `/api/v1/notifications` | `/app/notifications` | `db/notifications/` | `m27_*` | LIVE |
| `PricingQuotation/` | `/api/v1/pricing-quotation` | `/app/pricing-quotation` | `db/pricing-quotation/` | `m14_*` | LIVE |
| `Procurement/` | `/api/v1/procurement` | `/app/procurement` | `db/procurement/` | `m7_*` | LIVE |
| `Sales/` | `/api/v1/sales` | `/app/sales` | `db/sales/` | `m2_*` | LIVE |
| `Transportation/` | - | - | - | - | folder scaffolded |
| `Trucking/` | - | - | `db/trucking/` | `m10_*` | schema + fixtures applied; backend in progress |
| `VendorManagement/` | `/api/v1/vendor-management` | `/app/vendor-management` | `db/vendor-management/` | `m3_*` | LIVE |
| `Warehousing/` | - | - | - | - | folder scaffolded |
| `plugins/india/Ulp.Plugin.India.Tax/` | resolved per tenant | - | - | - | LIVE (GST CGST/SGST/IGST split) |

**13 modules + 1 plugin live. Build status:**
- `dotnet build src/backend/host/Ulp.Api/Ulp.Api.csproj` -> **0 errors** (22 Scriban warnings only)
- `ng build src/frontend/ulp-web --configuration=development` -> **0 errors**

---

## Naming convention (single source of truth)

Every name in this repo follows one rule:

```
DomainName  =  PascalCase business name        (e.g., Accounting, Customs, FreightForwarding)
KebabName   =  same name lowercased + hyphens  (e.g., accounting, customs, freight-forwarding)
```

| Place | Pattern | Example (Accounting) |
|---|---|---|
| Backend folder | `{DomainName}/` | `Accounting/` |
| .NET project | `Ulp.{DomainName}.{Layer}.csproj` | `Ulp.Accounting.Domain.csproj` |
| C# namespace | `Ulp.{DomainName}.{Layer}` | `Ulp.Accounting.Domain` |
| DI extension | `Add{DomainName}Module()` | `AddAccountingModule()` |
| Endpoint extension | `Map{DomainName}Endpoints()` | `MapAccountingEndpoints()` |
| Service interface | `I{DomainName}Service` | `IAccountingService` |
| API base route | `/api/v1/{kebab-name}/...` | `/api/v1/accounting/invoices` |
| Frontend feature folder | `src/app/features/{kebab-name}/` | `src/app/features/accounting/` |
| Frontend route | `/app/{kebab-name}` | `/app/accounting` |
| Frontend service class | `{DomainName}ApiService` | `AccountingApiService` |
| DB folder | `db/{kebab-name}/` | `db/accounting/` |
| DB SQL files | `db/{kebab-name}/{order}-{kebab-name}-{purpose}.sql` | `db/accounting/01-accounting-tables.sql` |
| DB tables (unchanged) | `m{N}_*`, `m{N}in_*`, `m{N}us_*` | `m17_invoice`, `m17in_irn`, `m4us_entry` |

DB **table prefixes** (`m17_`, `m4us_`, etc.) intentionally stay numeric to match the sealed design package and avoid destructive migrations. **Folder names** and **API/URL/code identifiers** all use the pure domain name.

---

## Quick start (5 minutes on a fresh laptop)

See [DEVELOPER_SETUP.md](DEVELOPER_SETUP.md) for the full happy-path with troubleshooting.

```bash
# 1. Start infra (MySQL, Redis, RabbitMQ, MinIO, MailHog, Keycloak, Qdrant)
powershell -ExecutionPolicy Bypass -File ./infra/scripts/stack-up.ps1     # Windows
./infra/scripts/stack-up.sh                                                # Mac / Linux

# 2. Apply schema + dev fixtures (idempotent - safe to re-run)
powershell -ExecutionPolicy Bypass -File ./infra/scripts/init-db.ps1      # Windows
./infra/scripts/init-db.sh                                                 # Mac / Linux

# 3. Run backend (API at http://localhost:5000)
dotnet run --project src/backend/host/Ulp.Api/Ulp.Api.csproj

# 4. Run frontend (web at http://localhost:4200) - in another shell
cd src/frontend/ulp-web
npm install
npm start
```

Then open `http://localhost:4200`, sign in via Keycloak (`http://localhost:8080`), and click the sidebar.

---

## SCM client milestone coverage (2026-05-03)

Tracks delivery against the SCM client's "Milestone Timeline" (`ulpReq/Milestone Timeline - SCM_ClientProposal.docx`):

| Milestone | % done | Status |
|-----------|--------|--------|
| **M1** Control Tower + ERP basics + Profile docs | ~99% | Closed except Chat Box (Phase 5 WebSocket) |
| **M2** Bookings + In-Transit + Customs | ~99% | Closed (Customs module shipped) |
| **M3** Accounting + Bank + Email notifications | ~99% | Closed (Accounting + ext + Notifications shipped) |
| **M4** Trucking dispatch | ~30% | Trucking schema + backend in progress; LastMile partly overlaps |
| **M5** Warehousing (WMS) | ~5% | Folder scaffolded; awaiting build |
| **M6** Doc text/stamps + Reports | ~15% | DocumentGeneration has render pipeline + 12 templates; reports pending |

---

## Folder layout

```
.
+-- ulpReq/        Sealed design package (38 docs + 42 Claude skills) - DO NOT make public
+-- .claude/       Project-level Claude skills (mirror)
+-- docs/          ADRs, derived LLDs, runbooks, design notes
+-- infra/         IaC - docker (now), k8s + terraform (Phase 5)
|   +-- docker/    docker-compose stack (MySQL, Redis, RabbitMQ, MinIO, MailHog, Keycloak, Qdrant)
|   +-- scripts/   stack-up, stack-down, init-db, reset-local, sync-keycloak-subs
+-- src/
|   +-- backend/
|   |   +-- core/      Cross-cutting: Domain, Abstractions, Application, Infrastructure, PluginHost
|   |   +-- shared/    Building blocks + test kit
|   |   +-- modules/   Accounting, Customs, Dashboards, DocumentGeneration, DocumentManagement,
|   |   |              FreightForwarding, Identity, LastMile, MasterData, Notifications,
|   |   |              PricingQuotation, Procurement, Sales, Transportation, Trucking,
|   |   |              VendorManagement, Warehousing
|   |   +-- plugins/   india/Ulp.Plugin.India.* and us/Ulp.Plugin.Us.* (resolved per tenant.country_code)
|   |   +-- host/      Ulp.Api (composition root), Ulp.Worker, Ulp.Migrations
|   |   +-- Ulp.sln
|   +-- frontend/      Angular 17 + Signals SPA (ulp-web)
|   +-- desktop/       Electron 28 wrapper (Phase 5)
|   +-- mobile/        Kotlin Multiplatform (Phase 5)
|   +-- ai/            FastAPI + LangGraph + Qdrant (Phase 5)
+-- tests/             Integration, contract, E2E, perf
+-- db/                accounting, accounting-ext, baseline, customs, dev-fixtures,
|                      document-generation, document-management, freight-forwarding,
|                      identity, last-mile, master-data, master-data-ext, notifications,
|                      pricing-quotation, procurement, sales, trucking, vendor-management
+-- ci/                GitHub Actions (parked until repo is hosted)
+-- tools/             Dev tools, scaffolding
```

---

## Tech stack

- **Backend:** .NET 8 + ASP.NET Core Minimal API + EF Core 8 + Pomelo MySQL + NodaTime
- **Frontend:** Angular 17 (Signals + standalone components) + Material 17 + Chart.js + Leaflet
- **Desktop:** Electron 28 (Phase 5)
- **Mobile:** Kotlin Multiplatform - Android + iOS (Phase 5)
- **AI:** Python + FastAPI + LangGraph + Qdrant (Phase 5)
- **DB:** MySQL 8 (region-pinned clusters)
- **Identity:** Keycloak (`ulp` realm, JWT bearer, sub claim -> ITenantContext)
- **Cache / Queue / Blob / Mail:** Redis 7, RabbitMQ, MinIO, MailHog (dev) - swap to Azure Cache / Service Bus / Blob / ACS in Phase 5
- **IaC:** Docker Compose (dev) -> Terraform Azure (Phase 5)

---

## Architecture in one picture

```
Edge (CDN/WAF, Phase 5)
    |
API Gateway (auth, tenant resolution -> country_code -> plugin DI)
    |
Module APIs (.NET 8 - Accounting, Customs, FreightForwarding, MasterData, Sales, ...)
    |       |
    |       +-- Compliance Plugins (loaded per tenant.country_code)
    |              +-- plugins/india/Ulp.Plugin.India.Tax  -> GST CGST/SGST/IGST split (LIVE)
    |              +-- plugins/india/Ulp.Plugin.India.*    -> GstReturns/Ewb/TdsTcs/Dgft/Identifiers/Scmtr (scaffolded)
    |              +-- plugins/us/Ulp.Plugin.Us.*          -> Customs/Banking/Payroll/Identifiers/SalesTax/Transportation/Accounts (scaffolded)
    |
Data (MySQL 8, Redis, MinIO) - region-pinned, no cross-region replication
```

See [ulpReq/ULP_HLD_v2.0_MultiRegion.docx](ulpReq/ULP_HLD_v2.0_MultiRegion.docx) for the full picture.

---

## Authoritative design documents

All in `ulpReq/`:

1. [ULP_Rework_FinalIndex_v2.1.docx](ulpReq/ULP_Rework_FinalIndex_v2.1.docx) - master navigation
2. [ULP_HLD_v2.0_MultiRegion.docx](ulpReq/ULP_HLD_v2.0_MultiRegion.docx) - high-level design
3. [ULP_DBD_v2.0_DatabaseDesign.docx](ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx) - DB design
4. [ULP_Internationalization_Guide_v1.0.docx](ulpReq/ULP_Internationalization_Guide_v1.0.docx) - plugin pattern
5. `ulpReq/ULP_LLD_*.docx` - per-module LLDs (still numbered M1, M4-US, M17, etc. - sealed)
6. `ulpReq/Milestone Timeline - SCM_ClientProposal.docx` - client-facing milestones
7. [docs/lld/](docs/lld/) - derived LLDs for modules without `ulpReq/` originals (DocumentManagement, Identity, Notifications, VendorManagement)

---

## Phase plan

| Phase | Months | Theme | Status |
|-------|--------|-------|--------|
| 1 | 1-2 | Foundation (MasterData, DocumentManagement, Identity, Notifications, VendorManagement, infra) | DONE |
| 2 | 3-4 | Operations Core (FreightForwarding, PricingQuotation, DocumentGeneration, Accounting base) | DONE |
| 3a | 5-6 | India compliance (Customs-IN, Transportation-IN, Accounting-IN, M15, GstReturns, Banking-IN, Payroll-IN) | Accounting India tax + Customs (US) shipped; rest deferred |
| 3b | 5-6 | US compliance (parallel with 3a) | Customs (US) shipped; Accounting-US deferred |
| 4 | 7-8 | Visibility + AI + polish (Sales, Procurement, LastMile, Dashboards, AI services) | Sales/Procurement/LastMile shipped; Dashboards/AI pending |
| 5 | 9 | Hardening + launch | Pending |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow + code standards. See [CLAUDE.md](CLAUDE.md) for hard rules (Money type, NodaTime, tenancy, plugin boundaries) - read these before adding code.

## License

Proprietary - All Rights Reserved. Internal use only.
