# ============================================================
# ULP — full local reset: tear down, wipe data, restart, reapply schema.
# Usage: pwsh ./infra/scripts/reset-local.ps1
# Use this when local state gets weird and you want a clean slate.
# ============================================================
$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot

Write-Host "== ULP local reset ==" -ForegroundColor Red
Write-Host "This will WIPE all local DB / Keycloak / MinIO data." -ForegroundColor Yellow
$confirm = Read-Host "Continue? (y/N)"
if ($confirm.ToLower() -ne "y") {
    Write-Host "Aborted."
    exit 0
}

& "$ScriptDir\stack-down.ps1" -Wipe
& "$ScriptDir\stack-up.ps1"
& "$ScriptDir\init-db.ps1"

Write-Host ""
Write-Host "Reset complete. Stack is up with fresh state." -ForegroundColor Green
