#!/usr/bin/env bash
# ============================================================
# ULP local stack — start all services and wait until healthy.
# Usage: ./infra/scripts/stack-up.sh
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_DIR="$REPO_ROOT/infra/docker"

echo "== ULP stack up =="
echo "Compose dir: $COMPOSE_DIR"

if [ ! -f "$COMPOSE_DIR/.env" ]; then
    echo "Creating .env from .env.example..."
    cp "$COMPOSE_DIR/.env.example" "$COMPOSE_DIR/.env"
fi

cd "$COMPOSE_DIR"
docker compose up -d --wait

echo
echo "== Service status =="
docker compose ps

echo
echo "== UIs =="
echo "  RabbitMQ : http://localhost:15672  (ulp / dev_password)"
echo "  MinIO    : http://localhost:9001   (ulp / dev_password_min8)"
echo "  MailHog  : http://localhost:8025"
echo "  Keycloak : http://localhost:8080   (admin / admin)"
echo "  Qdrant   : http://localhost:6333/dashboard"
echo
echo "Test users: in-admin@ulp.local / us-admin@ulp.local  (DevPass!2345)"
