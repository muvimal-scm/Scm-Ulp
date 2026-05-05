#!/usr/bin/env bash
# ============================================================
# ULP — apply the baseline + per-module SQL to local MySQL.
# Usage: ./infra/scripts/init-db.sh
# Idempotent — re-runnable.
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER="ulp-mysql"
DATABASE="ulp_dev"
USER="root"
PASSWORD="${MYSQL_ROOT_PASSWORD:-dev_password}"

# Files to apply, in order. Each must be idempotent.
FILES=(
    "db/baseline/01-v1-baseline.sql"
    "db/master-data/01-master-data-core-tables.sql"
    "db/master-data-ext/01-master-data-profile-extensions.sql"
    "db/identity/01-identity-tables.sql"
    "db/document-management/01-document-management-tables.sql"
    "db/notifications/01-notifications-tables.sql"
    "db/notifications/02-notifications-rules.sql"
    "db/vendor-management/01-vendor-management-tables.sql"
    "db/pricing-quotation/01-pricing-quotation-tables.sql"
    "db/document-generation/01-document-generation-tables.sql"
    "db/document-generation/02-document-generation-templates-scm-m1.sql"
    "db/freight-forwarding/01-freight-forwarding-tables.sql"
    "db/freight-forwarding/02-freight-forwarding-memo.sql"
    "db/freight-forwarding/03-freight-forwarding-watchlist.sql"
    "db/freight-forwarding/04-freight-forwarding-reminders-holds.sql"
    "db/sales/01-sales-tables.sql"
    "db/procurement/01-procurement-tables.sql"
    "db/last-mile/01-last-mile-tables.sql"
    "db/accounting/01-accounting-tables.sql"
    "db/accounting/02-accounting-fixtures.sql"
    "db/customs/01-customs-tables.sql"
    "db/customs/02-customs-fixtures.sql"
    "db/accounting-ext/01-accounting-finish.sql"
    "db/accounting-ext/02-accounting-finish-fixtures.sql"
    "db/trucking/01-trucking-tables.sql"
    "db/trucking/02-trucking-fixtures.sql"
    "db/dev-fixtures/01-dev-fixtures.sql"
)

echo "== Applying schema to $DATABASE in container $CONTAINER =="

state=$(docker inspect -f "{{.State.Health.Status}}" "$CONTAINER" 2>/dev/null || echo "missing")
if [ "$state" != "healthy" ]; then
    echo "Container $CONTAINER is not healthy (state: $state). Run stack-up.sh first." >&2
    exit 1
fi

for f in "${FILES[@]}"; do
    full="$REPO_ROOT/$f"
    if [ ! -f "$full" ]; then
        echo "Schema file not found: $full" >&2
        exit 1
    fi
    echo "  Applying $f"
    cat "$full" | docker exec -i "$CONTAINER" mysql -u "$USER" "-p$PASSWORD" "$DATABASE"
done

docker exec -i "$CONTAINER" mysql -u "$USER" "-p$PASSWORD" "$DATABASE" <<SQL
INSERT INTO _ulp_schema_version (version, source, notes)
VALUES ('phase1-baseline', 'db/baseline + module folders', 'Applied via init-db.sh')
ON DUPLICATE KEY UPDATE applied_at_utc = CURRENT_TIMESTAMP(3);
SQL

echo "Schema applied (baseline + all live modules)."
