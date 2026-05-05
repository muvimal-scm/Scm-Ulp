#!/usr/bin/env bash
# ============================================================
# ULP — apply the v2.0 schema from ulpReq/ to the local MySQL.
# Usage: ./infra/scripts/init-db.sh
# Idempotent — re-runnable.
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCHEMA_FILE="$REPO_ROOT/ulpReq/ULP_DBD_v2.0_Schema.sql"
CONTAINER="ulp-mysql"
DATABASE="ulp_dev"
USER="root"
PASSWORD="${MYSQL_ROOT_PASSWORD:-dev_password}"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo "Schema file not found: $SCHEMA_FILE" >&2
    exit 1
fi

echo "== Applying schema to $DATABASE in container $CONTAINER =="

state=$(docker inspect -f "{{.State.Health.Status}}" "$CONTAINER" 2>/dev/null || echo "missing")
if [ "$state" != "healthy" ]; then
    echo "Container $CONTAINER is not healthy (state: $state). Run stack-up first." >&2
    exit 1
fi

cat "$SCHEMA_FILE" | docker exec -i "$CONTAINER" mysql -u "$USER" "-p$PASSWORD" "$DATABASE"

docker exec -i "$CONTAINER" mysql -u "$USER" "-p$PASSWORD" "$DATABASE" <<SQL
INSERT INTO _ulp_schema_version (version, source, notes)
VALUES ('v2.0', 'ulpReq/ULP_DBD_v2.0_Schema.sql', 'Applied via init-db.sh')
ON DUPLICATE KEY UPDATE applied_at_utc = CURRENT_TIMESTAMP(3);
SQL

echo "Schema v2.0 applied."
