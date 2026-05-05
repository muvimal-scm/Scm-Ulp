#!/bin/sh
# =============================================================================
# Nightly MySQL backup for ULP beta. Runs inside the mysql-backup sidecar.
# Writes /backups/<db>-<UTC date>.sql.gz, then prunes anything older than
# $BACKUP_RETENTION_DAYS.
#
# Restore (host shell):
#   gunzip < backups/ulp_dev-20260601T0205Z.sql.gz \
#     | docker exec -i ulp-beta-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ulp_dev
# =============================================================================
set -eu

: "${MYSQL_DATABASE:?MYSQL_DATABASE not set}"
: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD not set}"
RETENTION="${BACKUP_RETENTION_DAYS:-14}"

stamp=$(date -u +%Y%m%dT%H%MZ)
target="/backups/${MYSQL_DATABASE}-${stamp}.sql.gz"

echo "[backup] $(date -u +'%Y-%m-%dT%H:%M:%SZ') starting dump → ${target}"

# --single-transaction → consistent snapshot without locking writes (InnoDB)
# --routines + --triggers → full schema, including stored procs
# --set-gtid-purged=OFF  → restore is portable across non-GTID servers
mysqldump \
    --host=mysql \
    --user=root \
    --password="$MYSQL_ROOT_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --set-gtid-purged=OFF \
    --default-character-set=utf8mb4 \
    "$MYSQL_DATABASE" | gzip -9 > "$target"

bytes=$(stat -c '%s' "$target" 2>/dev/null || stat -f '%z' "$target")
echo "[backup] wrote ${target} (${bytes} bytes)"

# Prune old backups. find -mtime is "older than N*24h"; -delete is atomic.
echo "[backup] pruning files older than ${RETENTION} days"
find /backups -name "${MYSQL_DATABASE}-*.sql.gz" -type f -mtime +"$RETENTION" -delete -print

echo "[backup] done"
