# ============================================================
# ULP â€” apply the Phase 1 baseline + per-module SQL to local MySQL.
# Usage:
#   powershell -ExecutionPolicy Bypass -File ./infra/scripts/init-db.ps1
# Idempotent â€” re-runnable. Records version in _ulp_schema_version.
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
    (Join-Path $RepoRoot 'db\master-data\01-master-data-core-tables.sql'),
    (Join-Path $RepoRoot 'db\master-data-ext\01-master-data-profile-extensions.sql'),
    (Join-Path $RepoRoot 'db\identity\01-identity-tables.sql'),
    (Join-Path $RepoRoot 'db\document-management\01-document-management-tables.sql'),
    (Join-Path $RepoRoot 'db\notifications\01-notifications-tables.sql'),
    (Join-Path $RepoRoot 'db\notifications\02-notifications-rules.sql'),
    (Join-Path $RepoRoot 'db\vendor-management\01-vendor-management-tables.sql'),
    (Join-Path $RepoRoot 'db\pricing-quotation\01-pricing-quotation-tables.sql'),
    (Join-Path $RepoRoot 'db\document-generation\01-document-generation-tables.sql'),
    (Join-Path $RepoRoot 'db\document-generation\02-document-generation-templates-scm-m1.sql'),
    (Join-Path $RepoRoot 'db\freight-forwarding\01-freight-forwarding-tables.sql'),
    (Join-Path $RepoRoot 'db\freight-forwarding\02-freight-forwarding-memo.sql'),
    (Join-Path $RepoRoot 'db\freight-forwarding\03-freight-forwarding-watchlist.sql'),
    (Join-Path $RepoRoot 'db\freight-forwarding\04-freight-forwarding-reminders-holds.sql'),
    (Join-Path $RepoRoot 'db\sales\01-sales-tables.sql'),
    (Join-Path $RepoRoot 'db\procurement\01-procurement-tables.sql'),
    (Join-Path $RepoRoot 'db\last-mile\01-last-mile-tables.sql'),
    (Join-Path $RepoRoot 'db\accounting\01-accounting-tables.sql'),
    (Join-Path $RepoRoot 'db\accounting\02-accounting-fixtures.sql'),
    (Join-Path $RepoRoot 'db\customs\01-customs-tables.sql'),
    (Join-Path $RepoRoot 'db\customs\02-customs-fixtures.sql'),
    (Join-Path $RepoRoot 'db\accounting-ext\01-accounting-finish.sql'),
    (Join-Path $RepoRoot 'db\accounting-ext\02-accounting-finish-fixtures.sql'),
    (Join-Path $RepoRoot 'db\trucking\01-trucking-tables.sql'),
    (Join-Path $RepoRoot 'db\trucking\02-trucking-fixtures.sql'),
    (Join-Path $RepoRoot 'db\dev-fixtures\01-dev-fixtures.sql'),
    # CP13 v2 client doc deltas — must run before any seed that uses new columns
    (Join-Path $RepoRoot 'db\freight-forwarding\13-cp13-v2-deltas.sql'),
    # CP17 import-flow demo seed — uses CP13's trade_direction + shipment_id
    (Join-Path $RepoRoot 'db\dev-fixtures\02-import-flow-demo.sql')
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
