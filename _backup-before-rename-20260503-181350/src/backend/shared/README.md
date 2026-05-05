# src/backend/shared/

Cross-cutting helpers used by tests and multiple modules. Anything here must be **truly generic** — module-specific code belongs in the module.

| Project | Purpose |
|---|---|
| `Ulp.TestKit` | Base test classes, fixtures, country-aware `[Theory]` data generators, in-memory tenant builders |
| `Ulp.BuildingBlocks` | Generic helpers — `Result<T,E>`, `PagedList<T>`, idempotency-key middleware, common exception types |

## Rule of thumb

If you find yourself adding something here, ask: "Will both modules AND plugins need this, AND is it generic enough that it isn't really a domain concept?" If yes, it belongs here. If it's a domain concept, it belongs in `Ulp.Core.Domain`.
