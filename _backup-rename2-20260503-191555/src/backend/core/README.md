# src/backend/core/

Country-agnostic platform foundation. Every module and plugin references one or more of these.

| Project | Purpose | Key types |
|---|---|---|
| `Ulp.Core.Domain` | Cross-cutting domain primitives | `Money`, `TenantId`, `CountryCode`, `IClock`, base entity, soft-delete, audit |
| `Ulp.Core.Abstractions` | Plugin contracts | 7 interfaces: `IComplianceProvider`, `ITaxProvider`, `ICustomsProvider`, `IBankingProvider`, `IPayrollProvider`, `IIdentifierValidator`, `IStateTaxProvider` |
| `Ulp.Core.Application` | CQRS, mapping, validation | `ICommand`, `IQuery`, `Result<T>`, AutoMapper profiles, FluentValidation rules |
| `Ulp.Core.Infrastructure` | Cross-cutting infra adapters | EF Core base context, MassTransit, Hangfire, Polly, Redis, MinIO, Serilog config |
| `Ulp.Core.PluginHost` | Plugin discovery + DI | `IUlpPlugin`, plugin loader, tenant-scoped resolver |

## Reference rules

`core/` references nothing in `modules/`, `plugins/`, or `host/`. It's the trunk; everything else hangs off it.

## Reference skills

- [../../.claude/skills/compliance-plugin-pattern/](../../.claude/skills/compliance-plugin-pattern/) — the 7 interfaces and DI resolution
- [../../.claude/skills/multi-region-tenant-context/](../../.claude/skills/multi-region-tenant-context/) — `ITenantContext`, country_code routing
- [../../.claude/skills/money-type-multicurrency/](../../.claude/skills/money-type-multicurrency/) — Money value object
- [../../.claude/skills/nodatime-luxon-timezone/](../../.claude/skills/nodatime-luxon-timezone/) — IClock, IANA tz handling
