# src/backend/

.NET 8 backend. One solution (`Ulp.sln` — to be created), four roots: `core/`, `modules/`, `plugins/`, `host/`, plus `shared/`.

## Layout

```
backend/
├── core/                  # Country-agnostic platform foundation
│   ├── Ulp.Core.Domain            # Entities, value objects (Money, TenantContext)
│   ├── Ulp.Core.Abstractions      # Plugin interfaces (7 — see CLAUDE.md)
│   ├── Ulp.Core.Application       # CQRS, AutoMapper, FluentValidation
│   ├── Ulp.Core.Infrastructure    # EF Core, MassTransit, Hangfire, Polly, Redis, MinIO
│   └── Ulp.Core.PluginHost        # Plugin loader, tenant-scoped DI
│
├── modules/               # Tier-A (country-agnostic) and Tier-B (core part) modules
│   └── M{N}.{Name}/
│       ├── Ulp.{Name}.Domain
│       ├── Ulp.{Name}.Application
│       ├── Ulp.{Name}.Infrastructure
│       └── Ulp.{Name}.Api
│
├── plugins/               # Country-specific compliance — implements core interfaces
│   ├── india/             # M4-IN, M13-IN, M17-IN, M15, M18, M19, M20 (Phase 3a)
│   └── us/                # M4-US, M13-US, M17-US, M18-US, M19-US, M20-US (Phase 3b)
│
├── host/                  # Composition root — references modules + plugins
│   ├── Ulp.Api            # ASP.NET Core 8 Minimal API
│   ├── Ulp.Worker         # Hangfire + MassTransit consumers
│   └── Ulp.Migrations     # EF Core migrations runner
│
└── shared/
    ├── Ulp.TestKit            # Test base classes, fixtures, country-aware [Theory] data
    └── Ulp.BuildingBlocks     # Cross-cutting helpers (Result, Pagination, etc.)
```

## Module status

Modules planned per [../../ulpReq/ULP_DevelopmentSequencing_v2.0.docx](../../ulpReq/ULP_DevelopmentSequencing_v2.0.docx):

| Module | Phase | Type | Status |
|---|---|---|---|
| M1 Master Data | 1 | Core | Folder scaffolded |
| M3 Vendor | 1 | Core | Folder scaffolded |
| M4 CHA | 2/3 | Core + IN/US plugins | Folder scaffolded |
| M5 Freight Forwarding | 2 | Core | Folder scaffolded |
| M6 Doc Generation | 2 | Core | Folder scaffolded |
| M8 WMS | 2 | Core | Folder scaffolded |
| M13 Transportation | 2/3 | Core + IN/US plugins | Folder scaffolded |
| M14 Pricing | 2 | Core | Folder scaffolded |
| M17 Accounts | 2/3 | Core + IN/US plugins | Folder scaffolded |
| M21 Doc Management | 1 | Core | Folder scaffolded |
| M24 Dashboards | 4 | Core | Folder scaffolded |
| M26 RBAC | 1 | Core | Folder scaffolded |
| M27 Notifications | 1 | Core | Folder scaffolded |

Module LLDs in [../../ulpReq/ULP_LLD_M*.docx](../../ulpReq/) — read the relevant LLD before scaffolding code.

## Conventions

- File-scoped namespaces, nullable reference types ON.
- One assembly per module per layer (Domain / Application / Infrastructure / Api).
- Domain references nothing. Application references Domain. Infrastructure references Application. Api references all three.
- No SQL JOINs across module boundaries — use APIs / events.
- Money type, NodaTime, IClock — see [../../CLAUDE.md](../../CLAUDE.md).
