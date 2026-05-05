# ci/

CI/CD pipelines. Open-source default: GitHub Actions.

| Folder | Purpose |
|---|---|
| [github-actions/](github-actions/) | Workflow YAML files — copied into `.github/workflows/` when git is initialised |
| [scripts/](scripts/) | Reusable shell/PowerShell scripts called from CI workflows (lint, build, test, package) |

## Planned workflows

- `ci-backend.yml` — .NET build + test + coverage
- `ci-frontend.yml` — Angular build + test + lint
- `ci-mobile.yml` — KMP shared build + Android assemble
- `ci-ai.yml` — Python lint + pytest
- `ci-infra.yml` — Terraform plan + tflint + checkov
- `cd-deploy.yml` — Blue/Green region-aware deployment (Phase 5)

Reference skill: [../.claude/skills/github-actions-cicd/](../.claude/skills/github-actions-cicd/).
