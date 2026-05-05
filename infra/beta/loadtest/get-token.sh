#!/bin/sh
# =============================================================================
# Mint a Keycloak access token for the load test.
#
# CP20 disables Direct Access Grants on `ulp-web` (the SPA client), so we
# can't use ROPC there. Two ways to get a token for k6:
#
#   A. Bring up a one-off `loadtest` confidential client in the realm with
#      DAG enabled. (Recommended — keep beta-realm DAG off everywhere else.)
#
#   B. Click through the SPA in your browser, copy the access_token from
#      DevTools, and paste it as ULP_TOKEN. Fine for ad-hoc runs.
#
# This script implements path A. Run once after you've added a `loadtest`
# client + a `loadtest@ulp.local` user (instructions in load-test.md).
#
# Env required (read from .env.beta if you `source` it):
#   KC_BASE                — https://kc.<ULP_DOMAIN>
#   LOADTEST_CLIENT_ID     — ulp-loadtest
#   LOADTEST_CLIENT_SECRET — confidential client secret
#   LOADTEST_USERNAME      — loadtest@ulp.local
#   LOADTEST_PASSWORD      — temp password set in the realm
#
# Output: prints just the access token to stdout (so you can do
#   ULP_TOKEN="$(./get-token.sh)" k6 run beta-uat-load.js
# in one line).
# =============================================================================
set -eu

: "${KC_BASE:?KC_BASE not set}"
: "${LOADTEST_CLIENT_ID:?LOADTEST_CLIENT_ID not set}"
: "${LOADTEST_CLIENT_SECRET:?LOADTEST_CLIENT_SECRET not set}"
: "${LOADTEST_USERNAME:?LOADTEST_USERNAME not set}"
: "${LOADTEST_PASSWORD:?LOADTEST_PASSWORD not set}"

resp=$(curl -fsSL \
    -d "grant_type=password" \
    -d "client_id=${LOADTEST_CLIENT_ID}" \
    -d "client_secret=${LOADTEST_CLIENT_SECRET}" \
    -d "username=${LOADTEST_USERNAME}" \
    -d "password=${LOADTEST_PASSWORD}" \
    "${KC_BASE}/realms/ulp/protocol/openid-connect/token")

# jq is the cleanest, but fall back to a sed extractor for shells without it.
if command -v jq >/dev/null 2>&1; then
    echo "$resp" | jq -r .access_token
else
    echo "$resp" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'
fi
