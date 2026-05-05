# infra/scripts/

Cross-platform bootstrap scripts. Each task ships as both `.ps1` (PowerShell, Windows) and `.sh` (Bash, Linux/Mac) — pick the one that matches your shell.

| Script | Purpose |
|---|---|
| `stack-up.{ps1,sh}` | Create `.env` if missing, `docker compose up -d --wait`, print UIs + credentials. |
| `stack-down.{ps1,sh}` | Stop the stack. Pass `-Wipe` (PS) or `--wipe` (Bash) to delete volumes. |
| `init-db.{ps1,sh}` | Apply [../../ulpReq/ULP_DBD_v2.0_Schema.sql](../../ulpReq/ULP_DBD_v2.0_Schema.sql) to `ulp_dev`. Idempotent. |
| `reset-local.{ps1,sh}` | Full nuke: stop + wipe + restart + reapply schema. Confirmation prompt. |

## When to add scripts here

Anything that's a one-liner the team will type repeatedly. Examples to add later:
- `seed-test-data.{ps1,sh}` — load fixture tenants/users/shipments
- `dump-db.{ps1,sh}` — produce a `mysqldump` snapshot for sharing
- `restore-db.{ps1,sh}` — restore from a snapshot
- `wait-for-stack.{ps1,sh}` — block until all services healthy (use in CI)

## Conventions

- Both variants live in this folder side by side — don't favour one OS.
- Idempotent by default — safe to re-run.
- Print clear status with colour where helpful (PS: `Write-Host -ForegroundColor`; Bash: ANSI codes).
- Read config from `.env` via Docker Compose; don't reparse `.env` in the script unless you must.
