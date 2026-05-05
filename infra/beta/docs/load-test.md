# CP23 — Beta load test

A quick, repeatable load test that proves the beta box can carry the planned
10–20 concurrent users without falling over. Tool: [k6](https://k6.io) — single
binary, no install footprint on the test runner, scriptable in JS.

## Pass criteria

| Metric                    | Threshold     | Why                                           |
|---------------------------|---------------|-----------------------------------------------|
| `http_req_duration` p95   | < 800 ms      | Beta users notice 1s+ page loads              |
| `http_req_duration` p99   | < 2000 ms     | Tail latency stays sane under 20-VU sustained |
| `http_req_failed`         | < 1 %         | Auth + transient blips OK; persistent fail not|
| `http_5xx`                | < 0.1 %       | A single 5xx fails the run                    |

The k6 script in `infra/beta/loadtest/beta-uat-load.js` declares these as
thresholds, so a breach causes a non-zero exit code — the run reads `pass`
or `fail` to a CI gate cleanly.

## One-time setup: load-test Keycloak client

Beta realm has **Direct Access Grants disabled on `ulp-web`** (CP20). To mint
tokens for k6 without going through the SPA login flow, add a dedicated
`ulp-loadtest` client + a service user.

Run once on the beta server (or via Keycloak admin UI):

```sh
docker exec -it ulp-beta-keycloak \
    /opt/keycloak/bin/kcadm.sh config credentials \
        --server http://localhost:8080 \
        --realm master \
        --user "$KEYCLOAK_ADMIN" \
        --password "$KEYCLOAK_ADMIN_PASSWORD"

# Create the load-test client (confidential, DAG enabled).
docker exec -it ulp-beta-keycloak \
    /opt/keycloak/bin/kcadm.sh create clients -r ulp \
        -s clientId=ulp-loadtest \
        -s name="ULP Load Test" \
        -s 'redirectUris=[]' \
        -s publicClient=false \
        -s standardFlowEnabled=false \
        -s directAccessGrantsEnabled=true \
        -s serviceAccountsEnabled=false \
        -s secret="<GENERATE_AND_RECORD>"

# Create the load-test user with realistic permissions + tenant attrs.
docker exec -it ulp-beta-keycloak \
    /opt/keycloak/bin/kcadm.sh create users -r ulp \
        -s username=loadtest@ulp.local \
        -s email=loadtest@ulp.local \
        -s emailVerified=true \
        -s enabled=true \
        -s 'attributes.tenant_id=["1001"]' \
        -s 'attributes.country_code=["IN"]' \
        -s 'attributes.region=["in-central"]' \
        -s 'attributes.permissions=["shipment.read","invoice.read","party.read"]'

docker exec -it ulp-beta-keycloak \
    /opt/keycloak/bin/kcadm.sh set-password -r ulp \
        --username loadtest@ulp.local --new-password "<TEMP_PWD>"

# Grant ulp-user role.
docker exec -it ulp-beta-keycloak \
    /opt/keycloak/bin/kcadm.sh add-roles -r ulp \
        --uusername loadtest@ulp.local \
        --rolename ulp-user
```

Record the client secret + user password in the operator's password store
(NOT in `.env.beta`; this is a test-only credential).

## Run the test

```sh
cd infra/beta/loadtest

export KC_BASE=https://kc.ulp-beta.example.com
export LOADTEST_CLIENT_ID=ulp-loadtest
export LOADTEST_CLIENT_SECRET=<the-secret>
export LOADTEST_USERNAME=loadtest@ulp.local
export LOADTEST_PASSWORD=<the-temp-pwd>

ULP_API_BASE=https://api.ulp-beta.example.com \
ULP_TOKEN="$(sh get-token.sh)" \
k6 run beta-uat-load.js
```

The full run takes 5 minutes (30s warm-up + 4m steady at 20 VUs + 30s cool-down).

## Reading the output

k6 prints a summary block at the end:

```
running (5m00.4s), 00/00 VUs, 8421 complete and 0 interrupted iterations
✓ shipments_list status 2xx
✓ shipment_detail status 2xx
...
http_req_duration..................: avg=212ms p(95)=487ms  p(99)=1.21s   ✓
http_req_failed....................: 0.04%  ✓
http_5xx...........................: 0.00%  ✓
errors.............................: 0.04%  ✓
```

Green checks across the board → beta box can carry the planned load. Run on
the same hardware you'll do the soft-launch on; results don't transfer.

## Reading failures

| Symptom                                  | Likely cause                                                | Fix                                                                                          |
|------------------------------------------|-------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| `http_5xx` > 0                           | API throwing under load (DB pool starved, OOM, …)            | `docker stats`; bump InnoDB buffer pool / Kestrel `MaxConcurrentConnections`; check Sentry  |
| p95 > 800 ms but no 5xx                   | DB query hot-spot                                           | Loki: `{compose_service="mysql"} \|~ "Query_time:"` for slow queries; add index               |
| p99 spikes > 2 s, p95 fine                | GC pauses or container CPU throttling                       | `docker stats` during run; raise host-level CPU/RAM if it's near 100%                       |
| `http_req_failed` > 1 %                  | Token expired mid-run, or rate limiter biting                | Mint fresh token; check Caddy access log for 429s; bump `read` token bucket if hits          |
| Connection resets                        | Caddy or API restart loop                                   | `docker compose ps` — service marked `unhealthy`? `docker compose logs --tail 200 <svc>`     |

## Re-runs

Cheap and idempotent — the test only does GETs, never mutates. Run between
each backend deploy to catch regressions.
