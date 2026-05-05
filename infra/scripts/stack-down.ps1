# ============================================================
# ULP local stack — stop all services. Add -Wipe to delete volumes.
# Usage: pwsh ./infra/scripts/stack-down.ps1 [-Wipe]
# ============================================================
[CmdletBinding()]
param(
    [switch]$Wipe
)
$ErrorActionPreference = "Stop"

$ComposeDir = Resolve-Path "$PSScriptRoot\..\..\infra\docker"

Push-Location $ComposeDir
try {
    if ($Wipe) {
        Write-Host "Stopping stack and WIPING all volumes..." -ForegroundColor Red
        docker compose down -v
    }
    else {
        Write-Host "Stopping stack (data preserved)..." -ForegroundColor Yellow
        docker compose down
    }
}
finally {
    Pop-Location
}
