# Runbooks

Practical how-tos for development workflow. Production runbooks (DR, tenant lifecycle, releases) live in [../../ulpReq/](../../ulpReq/) — the v2.0 design package already covers those.

Expected files (added as Phase 1 progresses):

- `local-stack-up.md` — start docker-compose and verify health
- `db-reset.md` — wipe and reapply schema + seed data
- `seed-test-tenants.md` — create IN + US test tenants in Keycloak + DB
- `troubleshooting.md` — common errors and fixes
