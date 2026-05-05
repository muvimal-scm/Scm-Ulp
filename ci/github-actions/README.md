# GitHub Actions workflows (parked)

These YAMLs are ready-to-use but **not yet active** — git is not initialised on this folder.

## When git is initialised

Copy these files into `.github/workflows/` at the repo root:

```powershell
mkdir -p .github\workflows
cp ci\github-actions\ci-backend.yml .github\workflows\
cp ci\github-actions\ci-frontend.yml .github\workflows\
cp ci\github-actions\ci-stack.yml .github\workflows\
```

GitHub auto-discovers them on the first push.

## What's here

| File | Trigger | What it does |
|---|---|---|
| `ci-backend.yml` | PR/push affecting `src/backend/**` | `dotnet restore` + `build` + `test` against a MySQL 8 service container |
| `ci-frontend.yml` | PR/push affecting `src/frontend/**` | `npm ci` + `ng build:prod` + headless Karma tests |
| `ci-stack.yml` | PR/push affecting `infra/**` | Brings up the full docker-compose stack and verifies all services come up healthy |

## Future workflows (Phase 5)

- `docker-build.yml` — build module images, push to ACR (OIDC, no static secrets)
- `terraform-plan.yml` — plan on PR, comment diff on PR
- `terraform-apply.yml` — apply on merge to `main`, manual approval gate
- `deploy-dev.yml` / `deploy-staging.yml` / `deploy-prod.yml` — Blue/Green per region

See [.claude/skills/github-actions-cicd/SKILL.md](../../.claude/skills/github-actions-cicd/SKILL.md) for the full pattern catalogue.
