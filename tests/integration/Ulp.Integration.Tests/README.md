# Ulp.Integration.Tests

CP14 baseline integration tests. Spins up a fresh MySQL 8 container per test run via Testcontainers, applies every SQL migration in the same order `infra/scripts/init-db.ps1` uses, and verifies schema invariants.

## What's covered today

- **`MigrationSmokeTests.Migrations_apply_cleanly_and_core_tables_exist`** — fails if any SQL file errors during apply, or if a known core table is missing.
- **`MigrationSmokeTests.Cp13_*`** — pins the CP13 v2 client doc deltas (hold-type enum extension, `m5_shipment.trade_direction`, `m17_invoice.shipment_id`, OrgAdmin role seed).
- **`MigrationSmokeTests.Migrations_are_idempotent`** — re-applies the CP13 delta and asserts no error.

## What's NOT covered yet (post-beta)

- Service-level CRUD round-trips (CreateParty → GetParty etc.). These need module project references and `ITenantContext` test doubles. Plumbing is non-trivial; deferred.
- API-level tests via `WebApplicationFactory`. Will land alongside CP15 frontend smoke.
- Contract tests, perf/load (those have their own folders under `tests/`).

## Prereqs

- Docker daemon running locally (Testcontainers needs it).
- MySQL 8.0 image pullable from Docker Hub.

## Run

```pwsh
dotnet test tests\integration\Ulp.Integration.Tests
```

First run is slower (~30s) because Docker pulls `mysql:8.0`. Subsequent runs reuse the cached image; container start is ~10s.

## Adding a service-level test (when needed)

1. Add the relevant module project references to the csproj.
2. Inside `[Fact]` build the DbContext via `DbContextOptionsBuilder<TContext>().UseMySql(_mysql.ConnectionString, ServerVersion.AutoDetect(...))`.
3. Stub `ITenantContext` to return `tenant_id = 1001` (seeded by `dev-fixtures/01-dev-fixtures.sql`).
4. Construct the service, call create/get/list, assert.

Don't share state between tests — clean up rows you created or use the per-test transaction pattern.
