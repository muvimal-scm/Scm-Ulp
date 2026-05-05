# ADR 0038 — Backend solution skeleton (.NET 8)

**Status:** Accepted
**Date:** 2026-05-02
**Decider:** Shankar
**Related:** ADR 0036 (local infra), [Compliance Plugin Pattern skill](../../.claude/skills/compliance-plugin-pattern/SKILL.md), [Money Type skill](../../.claude/skills/money-type-multicurrency/SKILL.md), [Multi-Region Tenant Context skill](../../.claude/skills/multi-region-tenant-context/SKILL.md), [NodaTime skill](../../.claude/skills/nodatime-luxon-timezone/SKILL.md)

## Context

Phase 1 needs a .NET 8 solution skeleton that:
- Holds the canonical `Money`, `CountryCode`, `TenantId`, `IClock`, `ITenantContext` types referenced by every module and plugin.
- Defines the seven plugin contracts (`IComplianceProvider`, `ITaxProvider`, `ICustomsProvider`, `IBankingProvider`, `IPayrollProvider`, `IIdentifierValidator`, `IStateTaxProvider`) so India + US plugins (Phase 3a/3b, parallel) have a stable target.
- Boots an API host that integrates with the Phase 1 infra stack (Keycloak JWT, MySQL connection strings, Money/NodaTime JSON).
- Builds without a docker stack present (so engineers can iterate offline).

## Decision

Adopt the layered solution at [src/backend/Ulp.sln](../../src/backend/Ulp.sln):

```
core/
  Ulp.Core.Domain         — Money, CountryCode, TenantId, IClock, ITenantContext, base entity interfaces
  Ulp.Core.Abstractions   — 7 plugin contracts + IUlpPlugin entry point
  Ulp.Core.Application    — CQRS markers (ICommand/IQuery), Result<T>
  Ulp.Core.Infrastructure — MoneyJsonConverter; package refs for EF Core/MassTransit/Hangfire/Polly/Serilog/Redis/MinIO
  Ulp.Core.PluginHost     — PluginRegistration: keyed-DI by country code
host/
  Ulp.Api                 — ASP.NET Core 8 Minimal API; Keycloak JWT auth; /health and /whoami
  Ulp.Worker              — Generic Host placeholder (Hangfire+MassTransit wired with first job)
  Ulp.Migrations          — Standalone EF migrations runner placeholder
shared/
  Ulp.BuildingBlocks      — PagedList<T>
  Ulp.TestKit             — TenantFixtures, FakeClock, [CountryAwareData] xUnit data attribute
tests/unit/
  Ulp.Core.Domain.Tests   — Money + CountryCode unit tests (proves the skeleton compiles)
```

### Cross-cutting build hygiene

- **`Directory.Build.props`** at `src/backend/` — `net8.0`, C# 12, nullable on, warnings-as-errors, central package management.
- **`Directory.Packages.props`** — pins all transitive versions: EF Core 8.0.6, Pomelo 8.0.2, MassTransit 8.2.3, Hangfire 1.8.12, Polly 8.4.0, Serilog 8.0.1, NodaTime 3.1.11, xUnit 2.8.1, Minio 6.0.2, etc.
- **`NuGet.config`** — pins `nuget.org` source (defence against accidental private feed leakage).

### Reference rules (enforced by project structure)

| Project | May reference |
|---|---|
| `Domain` | nothing |
| `Abstractions` | `Domain` only |
| `Application` | `Domain`, `Abstractions` |
| `Infrastructure` | `Domain`, `Abstractions`, `Application` |
| `PluginHost` | `Domain`, `Abstractions` only |
| `BuildingBlocks` | `Domain` only |
| `TestKit` | `Domain`, `Abstractions` |
| Module `Domain` | core `Domain` |
| Module `Application` | own `Domain` + core `{Domain,Abstractions,Application}` |
| Module `Infrastructure` | own `{Domain,Application}` + core `{Domain,Abstractions,Application,Infrastructure}` |
| Module `Api` | own `{Domain,Application}` + core `{Domain,Abstractions,Application}` (NOT Infrastructure — Infrastructure is composed in `host/`) |
| Plugins | core `{Domain,Abstractions,Application,Infrastructure}` |
| `Ulp.Api` | core `{...}`, all module `Api`, all `Plugin*` (composition root) |

### Tenant-scoped plugin DI

`Ulp.Core.PluginHost.PluginRegistration.AddUlpPlugins(...)` enumerates registered `IUlpPlugin` implementations. Each plugin registers its concrete providers as **keyed** services keyed by country code. The registration helper then registers a scoped resolver per plugin interface that reads `ITenantContext.CountryCode.Value` and returns the right keyed instance. Result: business code asks for `ITaxProvider` and gets the IN or US implementation transparently — no `if (country == "IN")` ever appears in core.

## Consequences

### Better
- Every module that lands in Phase 1 (M1, M3, M21, M26, M27) plugs into a stable, layered solution.
- Plugin contracts are written once; both India and US teams in Phase 3a/3b implement against identical interfaces.
- `Money` and `IClock` available from day one — no risk of `decimal` or `DateTime.Now` creeping into early code.
- xUnit `[CountryAwareData]` attribute means country-aware testing is a one-line change to opt into.
- Central package management ensures consistent transitive versions across all projects.

### Worse
- 11 .NET projects up front (5 core + 3 host + 2 shared + 1 test) — feels heavy for a Phase 1 codebase.
- Plugin host abstraction is invested before any actual plugin exists (planned Phase 3).

### Now possible
- API host runs against the Phase 1 docker stack with no further wiring.
- First module (M1 Master Data) can be added with minimal incidental work — just 4 new projects under `modules/M1.MasterData/`.
- Country plugin scaffolding for Phase 3 is a copy-paste of an existing layout once concrete behaviour is decided.

### Now harder
- Adding a new top-level concern requires deciding which layer it lives in (the rule of thumb is in `src/backend/shared/README.md`).

## Verification

Engineer with .NET 8 SDK runs:

```powershell
cd src/backend
dotnet restore
dotnet build
dotnet test
cd host/Ulp.Api
dotnet run
# In another terminal:
curl http://localhost:5080/health   # → 200 OK with status/service/version/time
```

If the docker stack from ADR 0036 is up, `/whoami` accepts JWTs from Keycloak's `ulp` realm.

## Future

- ADR 0039+ will cover module scaffolding pattern (M1 first), DbContext-per-module, and the exact `ITenantContext` resolver implementation against the admin DB.
