#!/bin/sh
# =============================================================================
# CP26 — Soft-launch 6-hour status snapshot.
#
# Run with: sh infra/beta/scripts/status-snapshot.sh >> infra/beta/soft-launch-log.md
#
# The output is markdown, paste-ready into the running soft-launch log.
# Designed to run unattended from cron (every 6h) during soft launch.
# =============================================================================
set -eu

domain="${ULP_DOMAIN:?set ULP_DOMAIN}"

echo "## $(date -u +'T%H — %Y-%m-%d %H:%M UTC')"
echo

# 1. Public API health (through Caddy → catches TLS + reverse-proxy + API)
echo -n "API health (https): "
if curl -fsS --max-time 5 "https://api.${domain}/health" >/dev/null 2>&1; then
    echo "OK"
else
    echo "DOWN — investigate immediately"
fi

# 2. Container states
echo
echo "Container states:"
docker compose -f infra/beta/docker-compose.beta.yml ps --format \
    'table {{.Service}}\t{{.Status}}' 2>/dev/null | sed 's/^/  /'

# 3. Disk free on the volume that holds /var/lib/docker (where mysql_data,
#    loki_data, etc. live). On most Linux installs that's `/`.
echo
echo -n "Disk on /: "
df -h / | awk 'NR==2 {printf "%s used, %s free\n", $5, $4}'

# 4. Most recent backup — proves the sidecar has been running.
echo -n "Latest MySQL backup: "
latest=$(ls -t infra/beta/backups/*.sql.gz 2>/dev/null | head -n 1 || true)
if [ -n "${latest:-}" ]; then
    size=$(stat -c '%s' "$latest" 2>/dev/null || stat -f '%z' "$latest")
    echo "$(basename "$latest") (${size} bytes)"
else
    echo "NONE — backup sidecar may have failed"
fi

# 5. Caddy 5xx count in last 6h (rough — counts JSON `"status":5..` strings).
echo -n "Caddy 5xx in last 6h: "
docker exec ulp-beta-caddy sh -c 'find /data/caddy/logs -name "*.access.log" -mmin -360' 2>/dev/null \
    | xargs -I{} docker exec ulp-beta-caddy sh -c 'grep -c "\"status\":5" "{}" || echo 0' 2>/dev/null \
    | awk '{s+=$1} END{print s+0}'

# 6. Active testers — count sessions in KC. We don't have admin token here,
#    so just remind the operator to check.
echo "Active KC sessions: open https://kc.${domain}/admin → Sessions to count"

echo
echo "---"
echo
