# Dev-restart for the ULP API.
#
# Reason this exists: when the API is running, the build's CopyToOutputDirectory
# step can't replace the bin DLLs (file lock), so backend code changes never
# reach the runtime. This script kills the running API, rebuilds, and starts it
# back up in a detached window. Safe to run repeatedly.
#
# Why taskkill instead of Stop-Process: taskkill /F succeeds without admin
# rights on processes started by the same user; PowerShell Stop-Process trips
# UAC even on same-user processes if Defender Application Control says so.
#
# Usage:
#     powershell -ExecutionPolicy Bypass -File infra\scripts\dev-restart-api.ps1
#
# Optional: pass -Foreground to run the new API in the current window
# (so you can see logs). Default starts it in a new minimized window.

[CmdletBinding()]
param(
    [switch] $Foreground,
    [int]    $WaitForReadySeconds = 60
)

$ErrorActionPreference = 'Stop'
$repo     = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$apiCsproj = Join-Path $repo 'src\backend\host\Ulp.Api\Ulp.Api.csproj'
$dotnet   = 'C:\Program Files\dotnet\dotnet.exe'

if (-not (Test-Path $dotnet)) {
    Write-Error "dotnet not found at $dotnet. Install .NET 8 SDK or fix PATH."
    exit 1
}
if (-not (Test-Path $apiCsproj)) {
    Write-Error "Ulp.Api.csproj not found at $apiCsproj"
    exit 1
}

function Step($n, $msg) { Write-Host ''; Write-Host ('===[{0}]=== {1}' -f $n, $msg) -ForegroundColor Cyan }

# ---- 1. Kill any running API process ---------------------------------------
Step 1 'Stopping running Ulp.Api processes (if any)'
# /F = forcefully terminate. /T = also kill children (the dotnet wrapper).
$tk = & taskkill.exe /F /T /IM Ulp.Api.exe 2>&1
$tkText = ($tk | Out-String)
if ($LASTEXITCODE -eq 0) {
    Write-Host '  killed at least one Ulp.Api process' -ForegroundColor Green
} elseif ($tkText -match 'not found' -or $tkText -match 'No tasks') {
    Write-Host '  no running Ulp.Api process — clean start' -ForegroundColor Green
} elseif ($tkText -match 'Access is denied|could not be terminated') {
    Write-Host ''
    Write-Host '  taskkill says Access Denied — the running API was started from an' -ForegroundColor Yellow
    Write-Host '  elevated (Administrator) PowerShell window, so a non-admin script' -ForegroundColor Yellow
    Write-Host '  cannot stop it. Choose ONE:' -ForegroundColor Yellow
    Write-Host ''
    Write-Host '    a) Press Ctrl+C in the PowerShell window that is running the API.' -ForegroundColor Yellow
    Write-Host '    b) Re-run THIS script from an elevated PowerShell window (one-time).' -ForegroundColor Yellow
    Write-Host ''
    Write-Host '  After that, future invocations of dev-restart-api.ps1 will not need admin.' -ForegroundColor Yellow
    exit 3
} else {
    Write-Warning ('  taskkill returned: {0}' -f $tkText.Trim())
}

# Also kill stray `dotnet run` wrappers that pinned the build (these spawn
# child Ulp.Api.exe but linger after taskkill on the child).
$strays = Get-Process -Name 'dotnet' -ErrorAction SilentlyContinue | Where-Object {
    try { $_.MainModule.FileName -eq $dotnet -and $_.StartInfo.Arguments -match 'Ulp.Api' } catch { $false }
}
foreach ($p in $strays) {
    try { & taskkill.exe /F /PID $p.Id 2>&1 | Out-Null; Write-Host ('  killed stray dotnet wrapper PID {0}' -f $p.Id) -ForegroundColor DarkGray } catch { }
}

# Wait a beat so the OS releases the file locks before we rebuild.
Start-Sleep -Milliseconds 1500

# ---- 2. Verify port 5080 is free -------------------------------------------
Step 2 'Verifying port 5080 is free'
$listening = Get-NetTCPConnection -LocalPort 5080 -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    $owners = $listening | ForEach-Object {
        $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        if ($p) { '{0} (PID {1})' -f $p.ProcessName, $p.Id }
    } | Sort-Object -Unique
    Write-Error ('Port 5080 still bound by: {0}' -f ($owners -join ', '))
    exit 1
}
Write-Host '  port 5080 is free' -ForegroundColor Green

# ---- 3. Rebuild ------------------------------------------------------------
Step 3 'Rebuilding Ulp.Api'
& $dotnet build $apiCsproj --nologo -v minimal 2>&1 | Tee-Object -Variable buildOutput | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ($buildOutput -join "`n") -ForegroundColor Red
    Write-Error 'dotnet build failed — fix errors and re-run'
    exit 1
}
$warnLine = $buildOutput | Where-Object { $_ -match '^\s*\d+ Warning' } | Select-Object -First 1
if (-not $warnLine) { $warnLine = '0 errors' }
Write-Host ('  build succeeded ({0})' -f $warnLine) -ForegroundColor Green

# ---- 4. Start API in detached window (or foreground if asked) --------------
$mode = if ($Foreground) { 'foreground' } else { 'detached window' }
Step 4 ('Starting API ({0})' -f $mode)
if ($Foreground) {
    & $dotnet run --project $apiCsproj --no-build
    exit $LASTEXITCODE
}

# Detached: open a new powershell window that runs the API and stays open.
# -NoExit so the user can see logs / kill it manually with Ctrl+C.
$argList = @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-Command', ('& "{0}" run --project "{1}" --no-build' -f $dotnet, $apiCsproj)
)
$proc = Start-Process powershell.exe -ArgumentList $argList -WindowStyle Normal -PassThru
Write-Host ('  spawned PID {0} — logs visible in the new window' -f $proc.Id) -ForegroundColor Green

# ---- 5. Wait for /health to come up ----------------------------------------
Step 5 ('Waiting up to {0}s for the API to listen on http://localhost:5080' -f $WaitForReadySeconds)
$ready = $false
$deadline = (Get-Date).AddSeconds($WaitForReadySeconds)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:5080/health' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { } # keep polling
    Write-Host '  ...still booting' -ForegroundColor DarkGray
}
if (-not $ready) {
    Write-Warning '  API did not respond to /health within the deadline. Check the new window for errors.'
    exit 2
}
Write-Host '  API is up and responding on http://localhost:5080/health' -ForegroundColor Green
Write-Host ''
Write-Host 'Done. The SPA dev server (if running on http://localhost:4200) will pick up the new API automatically.' -ForegroundColor Green
