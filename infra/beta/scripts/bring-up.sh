#!/bin/sh
# =============================================================================
# Convenience wrapper: bring up the beta stack with the right flags.
#
# Run from the repo root:
#   sh infra/beta/scripts/bring-up.sh
# =============================================================================
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env.beta ]; then
    echo "ERROR: .env.beta not found. Run:" >&2
    echo "  cp .env.beta.example .env.beta && \$EDITOR .env.beta && chmod 600 .env.beta" >&2
    exit 1
fi

# `chmod 600` enforced — refuses to run otherwise so secrets don't leak.
perms=$(stat -c '%a' .env.beta 2>/dev/null || stat -f '%A' .env.beta)
if [ "$perms" != "600" ]; then
    echo "ERROR: .env.beta has perms ${perms}. Run: chmod 600 .env.beta" >&2
    exit 1
fi

mkdir -p backups
chmod 700 backups

echo "[bring-up] building images and starting stack…"
docker compose -f docker-compose.beta.yml --env-file .env.beta up -d --build

echo "[bring-up] waiting up to 3 min for Caddy to be healthy"
deadline=$(( $(date +%s) + 180 ))
while [ "$(date +%s)" -lt "$deadline" ]; do
    state=$(docker inspect -f '{{.State.Health.Status}}' ulp-beta-caddy 2>/dev/null || echo "starting")
    if [ "$state" = "healthy" ]; then
        echo "[bring-up] Caddy is healthy."
        break
    fi
    sleep 5
done

echo "[bring-up] done. Tail logs with:"
echo "  docker compose -f infra/beta/docker-compose.beta.yml logs -f caddy"
