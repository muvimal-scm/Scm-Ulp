#!/bin/sh
# =============================================================================
# CP19 — DNS preflight for the beta domain.
#
# Verifies that every hostname Caddy will request a Let's Encrypt cert for
# (a) resolves via public DNS, (b) resolves to the expected IP, and (c) port 80
# on that host accepts a connection (LE's HTTP-01 challenge needs :80 open).
#
# Exits non-zero on any mismatch so callers can gate `docker compose up` on it.
#
# Usage:
#   sh dns-preflight.sh <apex-domain> <expected-public-ip>
#
# Example:
#   sh infra/beta/scripts/dns-preflight.sh ulp-beta.example.com 203.0.113.42
# =============================================================================
set -eu

domain="${1:-}"
expected_ip="${2:-}"

if [ -z "$domain" ] || [ -z "$expected_ip" ]; then
    echo "Usage: $0 <apex-domain> <expected-public-ip>" >&2
    exit 2
fi

# Names Caddy is configured to terminate.
hosts="$domain app.$domain api.$domain kc.$domain minio.$domain"

# Pick a DNS query tool that's available. Prefer `dig` for clean output;
# fall back to `host` (BIND utils) or `nslookup` (busybox / Windows / mac).
if command -v dig >/dev/null 2>&1; then
    resolve() { dig +short "$1" A | head -n 1; }
elif command -v host >/dev/null 2>&1; then
    resolve() { host -t A "$1" | awk '/has address/{print $4; exit}'; }
elif command -v nslookup >/dev/null 2>&1; then
    # nslookup prints "Server:" + "Address:" headers (the resolver itself)
    # before the actual answer. We want only Address lines that come AFTER a
    # "Name:" line. The awk script tracks that with a flag.
    resolve() {
        nslookup "$1" 2>/dev/null | awk '
            /^Name:/ { in_answer=1; next }
            in_answer && /^Address: / { print $2; exit }
        '
    }
else
    echo "ERROR: no dig/host/nslookup on this machine. Install one and retry." >&2
    exit 3
fi

failed=0
echo "[preflight] expected IP for all hostnames: $expected_ip"
echo

for h in $hosts; do
    actual=$(resolve "$h" || true)
    if [ -z "$actual" ]; then
        printf "  %-40s NXDOMAIN — DNS record missing\n" "$h"
        failed=1
    elif [ "$actual" != "$expected_ip" ]; then
        printf "  %-40s %s   ← MISMATCH (expected %s)\n" "$h" "$actual" "$expected_ip"
        failed=1
    else
        printf "  %-40s %s   OK\n" "$h" "$actual"
    fi
done

echo
echo "[preflight] checking that port 80 on $expected_ip accepts a TCP connection"
echo "             (Let's Encrypt HTTP-01 challenge needs :80 open inbound)"

if command -v nc >/dev/null 2>&1; then
    # 5-second timeout. nc -z exits 0 on connect.
    if nc -z -w 5 "$expected_ip" 80 >/dev/null 2>&1; then
        echo "  port 80 reachable                       OK"
    else
        echo "  port 80 NOT reachable from this host    FAIL"
        echo "  → check firewall/security group; LE WILL fail without :80."
        failed=1
    fi
else
    echo "  (nc not installed; skipping port-80 check — verify manually)"
fi

echo
if [ "$failed" -ne 0 ]; then
    echo "[preflight] FAILED — fix the issues above before bringing the stack up." >&2
    exit 1
fi
echo "[preflight] all DNS records resolve to $expected_ip and :80 is reachable."
echo "[preflight] safe to run: sh infra/beta/scripts/bring-up.sh"
