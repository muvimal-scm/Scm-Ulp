# CP24 — Bug bash playbook

A structured walkthrough you run on the beta box AFTER CP18–CP23 are deployed
but BEFORE inviting real users. The goal is to surface the obvious failures
where a bring-up assumption was wrong.

The playbook below is **ordered by blast radius** — early steps fail fast on
the simplest issues; later steps catch subtler integration bugs.

## Pre-emptive fixes shipped in this checkpoint

Static review of the CP18–CP23 artefacts caught these **before** real bring-up:

| #  | What                                                                   | Where                                                  |
|----|------------------------------------------------------------------------|--------------------------------------------------------|
| 1  | `Dockerfile.api` used `COPY --parents` (BuildKit-only, fragile)        | Replaced with single-shot `COPY src/backend ./src/backend` |
| 2  | `Dockerfile.web` used `<<EOF` heredocs (BuildKit-only)                 | Replaced with `printf` builder + checked-in `nginx/default.conf` |
| 3  | Caddy → API circular wait: `caddy.depends_on.api: service_healthy`     | Changed to `service_started` — API needs KC for OIDC at boot, KC needs Caddy for TLS |
| 4  | `acme_ca` pinned to LE — lost ZeroSSL fallback                         | Removed; let Caddy default handle CA failover          |

Files changed: `infra/beta/Dockerfile.api`, `infra/beta/Dockerfile.web`,
`infra/beta/nginx/default.conf` (new), `infra/beta/docker-compose.beta.yml`,
`infra/beta/caddy/Caddyfile`.

## Bug-bash sequence (run on the beta server)

### Step 1 — Build images (5–10 min, before bringing up)

```sh
cd infra/beta
docker compose -f docker-compose.beta.yml --env-file .env.beta build
```

Watch for:
- `web` build failing on `printf` substitution → check `ULP_API_BASE` build arg made it through
- `api` build hanging on `dotnet restore` → corporate proxy or transient
  nuget.org blip; retry once before assuming the Dockerfile is broken

### Step 2 — Single-service bring-up (catches missing env)

```sh
# Bring up just the data tier first.
docker compose -f docker-compose.beta.yml --env-file .env.beta up -d \
    mysql redis rabbitmq minio keycloak-db

docker compose -f docker-compose.beta.yml ps
# Expect: all five "healthy" within 60s. If any "unhealthy", check the
# specific container logs.
```

### Step 3 — Bring Keycloak up + verify realm import

```sh
docker compose -f docker-compose.beta.yml --env-file .env.beta up -d keycloak

docker compose logs keycloak | grep -E '(Imported realm|ERROR)'
# Expect: one line "Imported realm 'ulp'" and no ERRORs about missing env
# placeholders. If you see "Cannot resolve placeholder ${env.X}", that env
# var is missing from .env.beta.
```

### Step 4 — Bring API up + verify OIDC discovery works

```sh
docker compose -f docker-compose.beta.yml --env-file .env.beta up -d api

# Internal health check (bypasses Caddy):
docker exec ulp-beta-api wget -qO- http://localhost:8080/health
# Expect: {"status":"ok",...}

docker compose logs api | grep -iE '(error|unable|exception)' | head -20
# Expect: no errors. If you see "Unable to retrieve discovery document",
# the JWT bearer can't reach Keycloak. Check kc.<domain> resolves and Caddy
# is up.
```

### Step 5 — Bring Caddy up + verify TLS issuance

```sh
docker compose -f docker-compose.beta.yml --env-file .env.beta up -d caddy web

# Live-tail Caddy until certs issue — usually under 60s for 4 hostnames.
docker compose logs -f caddy | grep -E '(certificate obtained|error)'
```

If certs don't issue, follow the `infra/beta/docs/dns-and-tls.md` failure
table.

### Step 6 — End-to-end smoke

```sh
# Public health (through Caddy):
curl -sS https://api.<ULP_DOMAIN>/health
# Expect: {"status":"ok","service":"ulp-api","version":"...","time":"..."}

# Public KC discovery:
curl -sS https://kc.<ULP_DOMAIN>/realms/ulp/.well-known/openid-configuration \
    | head -c 200
# Expect: JSON starting with {"issuer":"https://kc.<ULP_DOMAIN>/realms/ulp",...

# Public SPA:
curl -sS -o /dev/null -w '%{http_code}\n' https://app.<ULP_DOMAIN>/
# Expect: 200
```

### Step 7 — First admin login (full UAT path)

Follow `infra/beta/docs/keycloak-prod-config.md` "Bring-up: first-time bootstrap".
You should be able to: receive password-reset email → set permanent password →
enroll TOTP → verify email → land on `app.<ULP_DOMAIN>` dashboard.

### Step 8 — Factory reset round-trip

```sh
# As beta admin (with valid bearer):
curl -sS -X POST https://api.<ULP_DOMAIN>/api/v1/admin/factory-reset \
    -H "Authorization: Bearer $TOKEN"
# Expect: {"ok":true,"wipedRows":N,"reseededRows":M,"message":"Demo data reset..."}

# Try without auth (should hit rate limit after 10 calls/min):
for i in $(seq 1 12); do
    curl -s -o /dev/null -w "%{http_code} " \
        -X POST https://api.<ULP_DOMAIN>/api/v1/admin/factory-reset
done
echo
# Expect first ~10 calls to be 401, then 429.
```

### Step 9 — Backups

```sh
# Force a backup run rather than waiting 24h:
docker exec ulp-beta-mysql-backup /usr/local/bin/mysql-backup.sh

ls -la infra/beta/backups/
# Expect: ulp_dev-<timestamp>.sql.gz, non-zero size.

# Smoke restore into a scratch DB:
docker exec ulp-beta-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
    -e "CREATE DATABASE restore_test;"
gunzip < infra/beta/backups/ulp_dev-<timestamp>.sql.gz | \
    docker exec -i ulp-beta-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" restore_test
docker exec ulp-beta-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
    -e "SELECT COUNT(*) FROM restore_test.m1_party;"
# Expect: same count as the live ulp_dev DB.
docker exec ulp-beta-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
    -e "DROP DATABASE restore_test;"
```

### Step 10 — Observability stack

```sh
docker compose -f docker-compose.beta.yml -f docker-compose.observability.yml \
    --env-file .env.beta up -d

# Check Loki is ingesting:
curl -sS https://grafana.<ULP_DOMAIN>/api/datasources/proxy/uid/loki-beta/ready
# (Through Grafana proxy; alternatively docker exec into loki and curl localhost:3100/ready)

# Open the dashboard:
#   https://grafana.<ULP_DOMAIN>  →  ULP Beta folder  →  ULP Beta — Overview
# Expect: API request rate panel shows traffic from your smoke calls above.
```

### Step 11 — Load test

Follow `infra/beta/docs/load-test.md`. The test must come back green:
- p95 < 800 ms
- p99 < 2 s
- 5xx rate = 0
- error rate < 1%

If any threshold breaches, the bug bash is BLOCKED and the breach itself
becomes the next bug bash item — don't move on to soft launch with red
metrics.

## Recording bugs found during the bash

When you find something this playbook doesn't catch, add a row to the table
at the top of this doc and create a fix in the same commit. The point of the
playbook is to keep growing as you find more things to check.

## Done criteria

Bug bash is complete when:

- All 11 steps above pass on a clean `down -v` → fresh bring-up
- Every found bug has a fix committed (or a documented "known limitation"
  with a workaround in the user-facing onboarding doc)
- Load test (CP23) passes against the same bring-up

Then proceed to CP25 (onboarding docs) and CP26 (soft launch).
