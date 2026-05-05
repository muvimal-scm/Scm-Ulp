# src/backend/host/

Composition root. The only place where everything (core + modules + plugins) is wired together.

| Project | Purpose | Run command |
|---|---|---|
| `Ulp.Api` | ASP.NET Core 8 Minimal API — references all module Api projects, registers plugins via `Ulp.Core.PluginHost` | `dotnet run --project Ulp.Api` |
| `Ulp.Worker` | Background worker — Hangfire dashboard + MassTransit consumers | `dotnet run --project Ulp.Worker` |
| `Ulp.Migrations` | Standalone EF Core migrations runner — applies schema changes | `dotnet run --project Ulp.Migrations -- --apply` |

## Why a separate Migrations project?

Migrations need to run from CI/CD without booting the full API. Standalone project = standalone container image = simpler ops.
