#!/usr/bin/env bash
# ============================================================
# ULP local stack — stop all services. Pass --wipe to delete volumes.
# Usage: ./infra/scripts/stack-down.sh [--wipe]
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_DIR="$REPO_ROOT/infra/docker"

cd "$COMPOSE_DIR"

if [ "${1:-}" = "--wipe" ]; then
    echo "Stopping stack and WIPING all volumes..."
    docker compose down -v
else
    echo "Stopping stack (data preserved)..."
    docker compose down
fi
