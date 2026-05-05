---
name: github-actions-cicd
description: GitHub Actions CI/CD workflows for ULP (.NET 8 backend, Angular 17 frontend, Docker images, Terraform infra). Use when writing or modifying .github/workflows/, debugging pipeline failures, configuring environments and approval gates, setting up OIDC federation with Azure, caching dependencies, or adding new jobs. Covers reusable workflows, matrix builds, secrets management, environment protection rules, and the build->test->scan->deploy promotion path.
---

# GitHub Actions CI/CD for ULP

## When this skill triggers
Working on `.github/workflows/*.yml`, debugging build failures, adding deployment jobs, configuring environments, setting up Azure OIDC federation, or adding new repos to the build matrix.

## Top 3 reference repos
1. **actions/starter-workflows** (https://github.com/actions/starter-workflows) — Official workflow templates. Direct references for `dotnet.yml`, `angular.yml`, `docker-publish.yml`, `terraform.yml`. Always start from these.
2. **dotnet/samples** (https://github.com/dotnet/samples) — Microsoft samples with production-grade .NET 8 workflows. Look at `aspnetcore` and `containers` directories for multi-stage Dockerfile + workflow patterns.
3. **Azure/login** (https://github.com/Azure/login) — Official Azure login action. Critical for OIDC federation (no static secrets). Read README for federated credential setup.

## Critical ULP workflows

### Repository workflow layout
```
.github/workflows/
├── ci-backend.yml         # PR + push to main: build + test + lint
├── ci-frontend.yml        # PR + push to main: ng build + ng test
├── docker-build.yml       # main branch: build + push images to ACR
├── deploy-dev.yml         # main branch: deploy to Azure dev (auto)
├── deploy-staging.yml     # tag pushed: deploy to staging (manual approval)
├── deploy-prod.yml        # tag pushed: deploy to prod (2-person approval)
├── terraform-plan.yml     # PR to main: terraform plan + comment on PR
├── terraform-apply.yml    # main branch: terraform apply (manual approval)
└── _reusable/
    ├── dotnet-build.yml
    └── angular-build.yml
```

### Backend CI (.NET 8)
```yaml
name: CI Backend
on:
  pull_request:
    paths: ['Backend/**', '.github/workflows/ci-backend.yml']
  push:
    branches: [main]
    paths: ['Backend/**']

permissions:
  contents: read
  pull-requests: write   # for test result comments

jobs:
  build-test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env: { MYSQL_ROOT_PASSWORD: testpw, MYSQL_DATABASE: ulp_test }
        ports: ['3306:3306']
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=10
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - name: Setup .NET 8
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'
      - name: Cache NuGet
        uses: actions/cache@v4
        with:
          path: ~/.nuget/packages
          key: ${{ runner.os }}-nuget-${{ hashFiles('**/*.csproj') }}
          restore-keys: ${{ runner.os }}-nuget-
      - name: Restore
        run: dotnet restore Backend/ULP.sln
      - name: Build
        run: dotnet build Backend/ULP.sln --configuration Release --no-restore
      - name: Format check
        run: dotnet format Backend/ULP.sln --verify-no-changes
      - name: Test
        run: dotnet test Backend/ULP.sln --configuration Release --no-build --logger trx --collect:"XPlat Code Coverage"
        env:
          ConnectionStrings__Default: "server=localhost;port=3306;database=ulp_test;user=root;password=testpw"
          Redis__Endpoint: "localhost:6379"
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with: { name: test-results, path: '**/TestResults/**' }
```

### Docker build + push (using ACR + OIDC)
```yaml
name: Docker Build
on:
  push:
    branches: [main]
    tags: ['v*']

permissions:
  contents: read
  id-token: write   # required for OIDC

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        module: [m1-master, m4-cha, m8-wms, m13-transport, m17-accounts]
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Login to ACR
        run: az acr login --name ulpacr

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./Backend/${{ matrix.module }}
          push: true
          cache-from: type=gha,scope=${{ matrix.module }}
          cache-to: type=gha,mode=max,scope=${{ matrix.module }}
          tags: |
            ulpacr.azurecr.io/${{ matrix.module }}:${{ github.sha }}
            ulpacr.azurecr.io/${{ matrix.module }}:latest
          # On tag, also push semver
          ${{ startsWith(github.ref, 'refs/tags/v') && format('ulpacr.azurecr.io/{0}:{1}', matrix.module, github.ref_name) || '' }}
```

### Production deploy with approval gate
```yaml
name: Deploy Production
on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production         # configured in repo Settings > Environments
                              # with required reviewers (2 approvers)
      url: https://app.ulp.com
    steps:
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy m17-accounts
        uses: azure/webapps-deploy@v3
        with:
          app-name: app-ulp-prod-cin-m17
          slot-name: staging   # deploy to slot first
          images: ulpacr.azurecr.io/m17-accounts:${{ github.ref_name }}

      - name: Smoke test staging slot
        run: |
          curl -fsS https://app-ulp-prod-cin-m17-staging.azurewebsites.net/health || exit 1

      - name: Swap slots
        run: az webapp deployment slot swap --name app-ulp-prod-cin-m17 --resource-group rg-ulp-prod-cin --slot staging
```

### Terraform plan on PR (with comment)
```yaml
name: Terraform Plan
on:
  pull_request:
    paths: ['infra/terraform/**']

permissions:
  contents: read
  pull-requests: write
  id-token: write

jobs:
  plan:
    runs-on: ubuntu-latest
    strategy:
      matrix: { environment: [dev, staging, prod] }
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - uses: hashicorp/setup-terraform@v3
        with: { terraform_version: 1.7.0 }
      - name: Plan
        working-directory: infra/terraform/environments/${{ matrix.environment }}
        run: |
          terraform init
          terraform plan -no-color -out=tfplan 2>&1 | tee plan.out
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('infra/terraform/environments/${{ matrix.environment }}/plan.out', 'utf8');
            github.rest.issues.createComment({
              owner: context.repo.owner, repo: context.repo.repo, issue_number: context.issue.number,
              body: '### Terraform Plan: ${{ matrix.environment }}\n```\n' + plan.slice(0, 60000) + '\n```'
            });
```

## Critical gotchas

### Pin action versions
- ALWAYS pin to specific tags or SHAs: `actions/checkout@v4`, NOT `actions/checkout@main`.
- Unpinned actions are a supply chain risk.

### OIDC over static secrets
- NEVER use `AZURE_CREDENTIALS` JSON secrets in 2026.
- Use OIDC federation: configure federated credentials on Azure AD app, set `id-token: write` permission, use `azure/login@v2` with `client-id/tenant-id/subscription-id` (no client-secret).

### Concurrency control
- Add `concurrency: group: ${{ github.workflow }}-${{ github.ref }} cancel-in-progress: true` to PR workflows.
- Prevents stacking multiple runs on rapid pushes.

### Default-deny permissions
- Set `permissions: contents: read` at workflow level.
- Add specific permissions per job (`pull-requests: write`, `id-token: write`).

### Caching gotchas
- NuGet: cache `~/.nuget/packages` keyed on `**/*.csproj`.
- npm: cache `~/.npm` keyed on `**/package-lock.json`.
- Docker layers: use `cache-from`/`cache-to: type=gha`.

### Environment protection (manual approval)
- Configure in Settings > Environments > add `production` env > require 2 reviewers.
- Workflow uses `environment: production` to gate.

### Workflow secrets vs environment secrets
- Workflow secrets: shared across all envs (e.g., DOCKER_HUB_TOKEN).
- Environment secrets: scoped to env (e.g., AZURE_CLIENT_ID for prod is different from dev).

## ULP companion docs
- ULP_DevelopmentGuide_v1.0.docx Section 4 (development workflow)
- ULP_DevelopmentSequencing_v1.0.docx (CI/CD setup gates)
- ULP_TechStack_v3.0_Final.xlsx (DevOps tab)
