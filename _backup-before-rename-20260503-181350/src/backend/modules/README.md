# src/backend/modules/

Per-module .NET projects. Each module is one of:
- **Tier-A (country-agnostic):** entire module lives here, no plugin.
- **Tier-B (core + plugin):** core part lives here; country plugins live in [../plugins/](../plugins/).
- **Tier-C (country-specific):** module exists only as plugin (e.g., M15 DGFT for IN, M18-US Sales Tax). No folder here.

## 4-layer pattern per module

```
M{N}.{Name}/
├── Ulp.{Name}.Domain         # Entities, value objects, domain services. References Money, NodaTime.
├── Ulp.{Name}.Application    # Use cases, CQRS handlers, DTOs, validators (FluentValidation)
├── Ulp.{Name}.Infrastructure # EF Core DbContext, repositories, external integrations
└── Ulp.{Name}.Api            # ASP.NET Core endpoint groups, route registration
```

## Dependency rules

- Domain → no project references
- Application → Domain
- Infrastructure → Application + Domain
- Api → Application + Domain (NOT Infrastructure — Infrastructure is composed in `host/`)

## Cross-module communication

- **No SQL JOINs** across `m{N}_*` and `m{M}_*` tables — module APIs / events only.
- Events via MassTransit (RabbitMQ in dev, Service Bus in prod).
- Shared concepts (TenantId, Money, ITenantContext) live in [../core/](../core/).

## Modules in this folder

See [../README.md](../README.md) for the module status table.
