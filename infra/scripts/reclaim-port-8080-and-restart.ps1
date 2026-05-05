# Reclaim port 8080 from MiniTool ShadowMaker's AgentService and bring up
# the full local dev stack on the standard ports (Keycloak=8080, SPA=4200).
#
# What this does, in order:
#   1. Stop MTAgentService and set it to Manual start (so it does not grab
#      port 8080 again on reboot). MiniTool ShadowMaker still works — its
#      backups can be triggered from the GUI; only the always-on agent stops.
#   2. Verify port 8080 is now free.
#   3. Restart the docker stack so Keycloak picks up the new (reverted) port.
#   4. Wait until Keycloak is ready and confirm the issuer URL is correct.
#   5. Reset the Keycloak `ulp-web` client's redirect URIs to localhost:4200.
#   6. Print a checklist for the user to start the API + SPA.
#
# Re-runnable: each step is idempotent.

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot   = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$composeFile = Join-Path $repoRoot 'infra\docker\docker-compose.yml'

function Write-Step($n, $msg) { Write-Host ''; Write-Host ('===[{0}]=== {1}' -f $n, $msg) -ForegroundColor Cyan }

# ---- 1. Stop MTAgentService -------------------------------------------------
Write-Step 1 'Stopping MTAgentService (MiniTool ShadowMaker agent)'
$svc = Get-Service -Name 'MTAgentService' -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Host '  service not found — already gone, nothing to do' -ForegroundColor Yellow
} else {
    if ($svc.Status -eq 'Running') {
        # Requires admin. Try and report cleanly if denied.
        try {
            Stop-Service -Name 'MTAgentService' -Force -ErrorAction Stop
            Write-Host '  stopped' -ForegroundColor Green
        } catch {
            Write-Error @"
Could not stop MTAgentService — this script must run as Administrator.
Right-click PowerShell → Run as Administrator, then re-run:
  powershell -ExecutionPolicy Bypass -File "$($MyInvocation.MyCommand.Path)"
"@
            exit 1
        }
    } else {
        Write-Host ('  already in state: {0}' -f $svc.Status) -ForegroundColor Green
    }
    # Disable autostart so we don't fight this every boot.
    try {
        Set-Service -Name 'MTAgentService' -StartupType Manual -ErrorAction Stop
        Write-Host '  startup type set to Manual (was Auto)' -ForegroundColor Green
    } catch {
        Write-Warning ('  could not change startup type: {0}' -f $_.Exception.Message)
    }
}

# ---- 2. Verify port 8080 is free (or owned by Docker) ----------------------
Write-Step 2 'Verifying port 8080 is free or owned by Docker (Keycloak container)'
$listening = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    $owners = $listening | ForEach-Object {
        $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        if ($p) { '{0} (PID {1})' -f $p.ProcessName, $p.Id }
    } | Sort-Object -Unique
    # com.docker.backend / wslrelay / vpnkit are Docker's own port-publishers.
    # If Keycloak is already running in docker, that's exactly what we want
    # to see. Block only if a non-Docker process owns the port.
    $nonDocker = $owners | Where-Object { $_ -notmatch 'docker|wslrelay|vpnkit' }
    if ($nonDocker) {
        Write-Error ('Port 8080 is still in use by non-Docker process: {0}' -f ($nonDocker -join ', '))
        exit 1
    }
    Write-Host ('  port 8080 owned by Docker (expected): {0}' -f ($owners -join ', ')) -ForegroundColor Green
} else {
    Write-Host '  port 8080 is free' -ForegroundColor Green
}

# ---- 3. Restart docker stack -----------------------------------------------
Write-Step 3 'Restarting docker stack on port 8080'
& docker compose -f $composeFile up -d
if ($LASTEXITCODE -ne 0) { Write-Error 'docker compose failed'; exit 1 }

# ---- 4. Wait for Keycloak ready --------------------------------------------
Write-Step 4 'Waiting for Keycloak to become ready (up to 90s)'
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 3
    try {
        $resp = Invoke-WebRequest -Uri 'http://localhost:8080/realms/ulp/.well-known/openid-configuration' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch { } # keep polling
    Write-Host '  ...still booting' -ForegroundColor DarkGray
}
if (-not $ready) {
    Write-Error 'Keycloak did not become ready in 90s. Run `docker logs ulp-keycloak` to investigate.'
    exit 1
}
$cfg = Invoke-RestMethod -Uri 'http://localhost:8080/realms/ulp/.well-known/openid-configuration'
Write-Host ('  ready — issuer: {0}' -f $cfg.issuer) -ForegroundColor Green
if ($cfg.issuer -ne 'http://localhost:8080/realms/ulp') {
    Write-Warning ('  issuer is unexpected: {0}' -f $cfg.issuer)
}

# ---- 5. Reset ulp-web client redirect URIs to :4200 ------------------------
Write-Step 5 'Resetting Keycloak ulp-web client redirect URIs to :4200'
$tokenBody = @{
    grant_type = 'password'
    client_id  = 'admin-cli'
    username   = 'admin'
    password   = 'admin'
}
try {
    $tok = Invoke-RestMethod -Method Post `
        -Uri 'http://localhost:8080/realms/master/protocol/openid-connect/token' `
        -Body $tokenBody -ContentType 'application/x-www-form-urlencoded'
} catch {
    Write-Error ('Could not get admin token from Keycloak: {0}' -f $_.Exception.Message)
    exit 1
}
$hdr = @{ Authorization = "Bearer $($tok.access_token)" }
$clients = Invoke-RestMethod -Uri 'http://localhost:8080/admin/realms/ulp/clients?clientId=ulp-web' -Headers $hdr
if (-not $clients -or $clients.Count -eq 0) {
    Write-Error 'ulp-web client not found in realm ulp'
    exit 1
}
$client = $clients[0]
$client.redirectUris = @('http://localhost:4200/*')
$client.webOrigins   = @('http://localhost:4200')
$client.attributes.'post.logout.redirect.uris' = 'http://localhost:4200/*'
$json = $client | ConvertTo-Json -Depth 20 -Compress
Invoke-RestMethod -Method Put -Uri ('http://localhost:8080/admin/realms/ulp/clients/{0}' -f $client.id) `
    -Headers $hdr -ContentType 'application/json' -Body $json | Out-Null
Write-Host '  ulp-web redirect URIs + web origins reset to http://localhost:4200' -ForegroundColor Green

# ---- 6. Final checklist ----------------------------------------------------
Write-Step 6 'Done — next steps'
@'
Stack is back on standard ports. Now in two SEPARATE PowerShell windows:

  Window A  — start the backend API:
    & "C:\Program Files\dotnet\dotnet.exe" run --project d:\Immortal-2025\ProductRequirements\ULPscmProject\src\backend\host\Ulp.Api\Ulp.Api.csproj

  Window B  — start the frontend SPA on port 4200:
    cd d:\Immortal-2025\ProductRequirements\ULPscmProject\src\frontend\ulp-web
    $env:NODE_OPTIONS = "--max-old-space-size=8192"
    npm start -- --port 4200

When both are up, open a fresh browser window and go to:
    http://localhost:4200
Sign in with: in-admin@ulp.local / DevPass!2345
'@ | Write-Host -ForegroundColor Green
