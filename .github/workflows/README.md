# GitHub Actions Workflows

## `ci.yml` — Backend + Frontend + E2E

Runs on every push to `main` and every PR (E2E skipped on draft PRs).

Three independent jobs run in parallel:

| Job | What it does | Runs on PR? | Typical duration |
|-----|--------------|-------------|------------------|
| **backend** | `dotnet restore` → `dotnet build` solution → restore + build + run integration tests (Testcontainers MySQL) | yes | ~6–8 min |
| **frontend** | `npm ci` → `ng build` → `ng test` headless Chrome with coverage | yes | ~4–6 min |
| **e2e** | Spin up MySQL service → apply migrations → run API + SPA → install Playwright → run tests | non-draft only | ~10–15 min |

## What's NOT here yet (post-beta)

- **Deploy step**: CP18+ adds a deploy job that pushes Docker images to a registry and SSH-deploys to the local-server beta host. Build the OCI images here, ship in CP18.
- **Branch protection**: configure in GitHub UI or via Terraform once the org permissions are sorted (CP19/20 territory).
- **OIDC federation**: when we move to Azure (post-beta), the deploy job authenticates via OIDC, no long-lived secrets.
- **Dependabot / security scanning**: add `.github/dependabot.yml` + a separate workflow that runs `dotnet list package --vulnerable`, `npm audit`, and `trivy` on built images. Tracked for CP22 (security hardening).

## Triggering manually

```
gh workflow run ci.yml
```

## Skipping E2E on a particular push

Mark the PR as draft, or add `[skip ci]` in the commit message (the standard Actions skip token).
