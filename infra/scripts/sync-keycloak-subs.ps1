# ============================================================
# Sync m_user.keycloak_subject from Keycloak's actual user sub UUIDs.
# Run AFTER each realm re-import (e.g., after wiping ulp_keycloak_db_data).
# Keycloak generates a fresh `sub` for each user on import; the dev fixtures
# can't predict it, so we read it back via the admin API and update MySQL.
# ============================================================
$ErrorActionPreference = "Stop"

$kcUrl   = 'http://localhost:8080'
$realm   = 'ulp'
$emails  = @('in-admin@ulp.local','in-user@ulp.local','us-admin@ulp.local','us-user@ulp.local')

Write-Host "== Sync Keycloak subs -> m_user ==" -ForegroundColor Cyan

# Get admin token
$admin = (Invoke-RestMethod -Method POST `
  -Uri "$kcUrl/realms/master/protocol/openid-connect/token" `
  -ContentType 'application/x-www-form-urlencoded' `
  -Body 'grant_type=password&client_id=admin-cli&username=admin&password=admin').access_token
$headers = @{ Authorization = "Bearer $admin" }

$updates = @()
foreach ($em in $emails) {
    $u = Invoke-RestMethod -Uri "$kcUrl/admin/realms/$realm/users?email=$em&exact=true" -Headers $headers
    if ($u.Count -gt 0) {
        $sub = $u[0].id
        Write-Host "  $em -> $sub" -ForegroundColor Gray
        $updates += "UPDATE m_user SET keycloak_subject='$sub' WHERE email='$em';"
    } else {
        Write-Warning "$em not found in Keycloak realm '$realm'"
    }
}

if ($updates.Count -gt 0) {
    ($updates -join "`n") | docker exec -i ulp-mysql mysql -uroot -pdev_password ulp_dev | Out-Null
    Write-Host "Updated $($updates.Count) m_user row(s)." -ForegroundColor Green
} else {
    Write-Warning "No users matched — skipped MySQL update."
}
