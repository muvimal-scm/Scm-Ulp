# ============================================================
# ULP — apply the Phase 1 baseline + per-module SQL to local MySQL.
# Usage:
#   powershell -ExecutionPolicy Bypass -File ./infra/scripts/init-db.ps1
# Idempotent — re-runnable. Records version in _ulp_schema_version.
#
# Note: ulpReq/ULP_DBD_v2.0_Schema.sql is a DELTA migration from v1.0
# and assumes legacy module tables already exist; it is NOT a fresh-
# install bootstrap. Phase 1 applies db/baseline/ + db/m*/ instead.
# ============================================================
$ErrorActionPreference = "Stop"

$RepoRoot   = Resolve-Path "$PSScriptRoot\..\.."
$Container  = "ulp-mysql"
$Database   = "ulp_dev"
$User       = "root"
$Password   = $env:MYSQL_ROOT_PASSWORD
if (-not $Password) { $Password = "dev_password" }

# Files to apply, in order. Each must be idempotent.
$Files = @(
    (Join-Path $RepoRoot 'db\baseline\01-v1-baseline.sql'),
    (Join-Path $RepoRoot 'db\m1\01-m1-core-tables.sql'),
    (Join-Path $RepoRoot 'db\m1-ext\01-m1-profile-extensions.sql'),
    (Join-Path $RepoRoot 'db\m26\01-m26-tables.sql'),
    (Join-Path $RepoRoot 'db\m21\01-m21-tables.sql'),
    (Join-Path $RepoRoot 'db\m27\01-m27-tables.sql'),
    (Join-Path $RepoRoot 'db\m27\02-m27-rules.sql'),
    (Join-Path $RepoRoot 'db\m3\01-m3-tables.sql'),
    (Join-Path $RepoRoot 'db\m14\01-m14-tables.sql'),
    (Join-Path $RepoRoot 'db\m6\01-m6-tables.sql'),
    (Join-Path $RepoRoot 'db\m6\02-m6-templates-scm-m1.sql'),
    (Join-Path $RepoRoot 'db\m5\01-m5-tables.sql'),
    (Join-Path $RepoRoot 'db\m5\02-m5-memo.sql'),
    (Join-Path $RepoRoot 'db\m5\03-m5-watchlist.sql'),
    (Join-Path $RepoRoot 'db\m5\04-m5-reminders-holds.sql'),
    (Join-Path $RepoRoot 'db\m2\01-m2-tables.sql'),
    (Join-Path $RepoRoot 'db\m7\01-m7-tables.sql'),
    (Join-Path $RepoRoot 'db\m9\01-m9-tables.sql'),
    (Join-Path $RepoRoot 'db\m17\01-m17-tables.sql'),
    (Join-Path $RepoRoot 'db\m17\02-m17-fixtures.sql'),
    (Join-Path $RepoRoot 'db\m4us\01-m4us-tables.sql'),
    (Join-Path $RepoRoot 'db\m4us\02-m4us-fixtures.sql'),
    (Join-Path $RepoRoot 'db\m17-ext\01-m17-finish.sql'),
    (Join-Path $RepoRoot 'db\m17-ext\02-m17-finish-fixtures.sql'),
    (Join-Path $RepoRoot 'db\m10\01-m10-tables.sql'),
    (Join-Path $RepoRoot 'db\m10\02-m10-fixtures.sql'),
    (Join-Path $RepoRoot 'db\dev-fixtures\01-dev-fixtures.sql')
)

Write-Host "== Phase 1 schema apply to $Database ==" -ForegroundColor Cyan

# Health check
$state = docker inspect -f "{{.State.Health.Status}}" $Container 2>$null
if ($state -ne "healthy") {
    throw "Container $Container is not healthy (state: $state). Run stack-up first."
}

foreach ($file in $Files) {
    if (-not (Test-Path $file)) {
        throw "Schema file not found: $file"
    }
    Write-Host "  Applying $($file.Substring($RepoRoot.Path.Length + 1))" -ForegroundColor Gray
    Get-Content $file -Raw | docker exec -i $Container mysql -u $User "-p$Password" $Database
    if ($LASTEXITCODE -ne 0) { throw "Apply failed: $file" }
}

# Record version
$marker = @"
INSERT INTO _ulp_schema_version (version, source, notes)
VALUES ('phase1-baseline', 'db/baseline + db/m1 + db/m26', 'Applied via init-db.ps1')
ON DUPLICATE KEY UPDATE applied_at_utc = CURRENT_TIMESTAMP(3);
"@
$marker | docker exec -i $Container mysql -u $User "-p$Password" $Database

Write-Host "Phase 1 schema applied (baseline + M1 + M26)." -ForegroundColor Green
