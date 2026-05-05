# ============================================================
# ULP local stack — start all services and wait until healthy.
# Usage: pwsh ./infra/scripts/stack-up.ps1
# ============================================================
$ErrorActionPreference = "Stop"

$RepoRoot   = Resolve-Path "$PSScriptRoot\..\.."
$ComposeDir = Join-Path $RepoRoot "infra\docker"

Write-Host "== ULP stack up ==" -ForegroundColor Cyan
Write-Host "Compose dir: $ComposeDir"

if (-not (Test-Path (Join-Path $ComposeDir ".env"))) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item (Join-Path $ComposeDir ".env.example") (Join-Path $ComposeDir ".env")
}

Push-Location $ComposeDir
try {
    docker compose up -d --wait
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

    Write-Host ""
    Write-Host "== Service status ==" -ForegroundColor Cyan
    docker compose ps

    Write-Host ""
    Write-Host "== UIs ==" -ForegroundColor Green
    Write-Host "  RabbitMQ : http://localhost:15672  (ulp / dev_password)"
    Write-Host "  MinIO    : http://localhost:9001   (ulp / dev_password_min8)"
    Write-Host "  MailHog  : http://localhost:8025"
    Write-Host "  Keycloak : http://localhost:8080   (admin / admin)"
    Write-Host "  Qdrant   : http://localhost:6333/dashboard"
    Write-Host ""
    Write-Host "Test users: in-admin@ulp.local / us-admin@ulp.local  (DevPass!2345)" -ForegroundColor Green
}
finally {
    Pop-Location
}
