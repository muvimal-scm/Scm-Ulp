#!/usr/bin/env bash
# ============================================================
# ULP — full local reset: tear down, wipe data, restart, reapply schema.
# Usage: ./infra/scripts/reset-local.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "== ULP local reset =="
echo "This will WIPE all local DB / Keycloak / MinIO data."
read -p "Continue? (y/N) " confirm
if [ "${confirm,,}" != "y" ]; then
    echo "Aborted."
    exit 0
fi

"$SCRIPT_DIR/stack-down.sh" --wipe
"$SCRIPT_DIR/stack-up.sh"
"$SCRIPT_DIR/init-db.sh"

echo
echo "Reset complete. Stack is up with fresh state."
