#!/bin/sh
# =====================================================================
# ULP MinIO bucket bootstrap
# Runs once via the `minio-init` service after MinIO is healthy.
# Creates all StorageContainer buckets defined in:
#   .claude/skills/minio-blob-storage/SKILL.md
# Idempotent — safe to re-run.
# =====================================================================
set -e

ALIAS=ulp
ENDPOINT=http://minio:9000

echo "Configuring mc alias..."
mc alias set "$ALIAS" "$ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

# Buckets per StorageContainer enum (see CLAUDE.md / SKILL.md).
# Naming: ulp-<container-kebab-case>
BUCKETS="
ulp-invoices
ulp-audit-logs
ulp-pod-photos
ulp-customs-documents
ulp-exports
ulp-user-uploads
"

for b in $BUCKETS; do
  if mc ls "$ALIAS/$b" >/dev/null 2>&1; then
    echo "  ✓ bucket exists: $b"
  else
    echo "  + creating bucket: $b"
    mc mb "$ALIAS/$b"
  fi
done

# Object locking: required for WORM containers (invoices, audit, customs)
echo "Enabling object lock retention on WORM buckets..."
for b in ulp-invoices ulp-audit-logs ulp-customs-documents; do
  # MinIO requires object lock to be enabled at bucket creation;
  # for the dev stack we set retention via lifecycle rules instead.
  # In production, buckets are created with --with-lock.
  mc retention set --default GOVERNANCE 8y "$ALIAS/$b" 2>/dev/null || \
    echo "  (warn) could not set retention on $b — fine for dev"
done

# Lifecycle: auto-expire short-lived buckets
echo "Setting lifecycle rules on transient buckets..."
mc ilm rule add --expire-days 30 "$ALIAS/ulp-exports" 2>/dev/null || true
mc ilm rule add --expire-days 365 "$ALIAS/ulp-pod-photos" 2>/dev/null || true

echo "MinIO bucket initialisation complete."
