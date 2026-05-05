# ULP Beta UAT — single-host deployment

Production-like deployment for 10–20 beta users on a single host. Follows the
"Open-source-first infra" line from CLAUDE.md (no cloud-vendor lock-in;
Phase 5 swaps containers for managed services without code changes).

## What runs here

| Container             | Image                          | Exposed via      |
|-----------------------|--------------------------------|------------------|
| `ulp-beta-caddy`      | `caddy:2.8-alpine`             | host 80/443      |
| `ulp-beta-web`        | built from `Dockerfile.web`    | Caddy → app.\<d> |
| `ulp-beta-api`        | built from `Dockerfile.api`    | Caddy → api.\<d> |
| `ulp-beta-keycloak`   | `quay.io/keycloak/keycloak:24` | Caddy → kc.\<d>  |
| `ulp-beta-keycloak-db`| `postgres:16-alpine`           | internal         |
| `ulp-beta-mysql`      | `mysql:8.0`                    | internal         |
| `ulp-beta-mysql-backup`| `mysql:8.0` (sidecar)         | internal         |
| `ulp-beta-redis`      | `redis:7-alpine`               | internal         |
| `ulp-beta-rabbitmq`   | `rabbitmq:3-management-alpine` | internal         |
| `ulp-beta-minio`      | `minio/minio:latest`           | Caddy → minio.\<d> |

**Only Caddy publishes host ports (80/443).** Every other service is reachable
only on the internal `ulp-beta-network`. That alone closes off the bulk of
opportunistic scanning.

## Pre-flight checklist

1. **DNS** (CP19 covers this end-to-end). Four A/AAAA records on `<ULP_DOMAIN>`:
    - `app.<domain>` → beta server public IP
    - `api.<domain>` → same IP
    - `kc.<domain>` → same IP
    - `minio.<domain>` → same IP

2. **Firewall** on the host: only allow 22 (SSH), 80, and 443 inbound.

3. **`.env.beta`** generated from the example, with `chmod 600`. All passwords
   should be at least 24 chars; generate with:
   ```sh
   openssl rand -base64 32 | tr -d '/+=' | head -c 28
   ```

4. **`backups/`** directory created with `chmod 700`. The mysql-backup sidecar
   writes here.

## Bring up

```sh
cd infra/beta
cp .env.beta.example .env.beta
$EDITOR .env.beta              # fill in real secrets + domain
chmod 600 .env.beta
mkdir -p backups && chmod 700 backups
chmod +x scripts/mysql-backup.sh

docker compose -f docker-compose.beta.yml --env-file .env.beta up -d --build
```

Caddy will request a Let's Encrypt cert on first start. Watch:

```sh
docker compose -f docker-compose.beta.yml logs -f caddy
```

Health check:

```sh
curl https://api.<ULP_DOMAIN>/health
# {"status":"ok","service":"ulp-api","version":"...","time":"..."}
```

## Restore from backup

```sh
ls infra/beta/backups
# ulp_dev-20260601T0205Z.sql.gz

gunzip < infra/beta/backups/ulp_dev-20260601T0205Z.sql.gz \
  | docker exec -i ulp-beta-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ulp_dev
```

## Tear down (keeps volumes)

```sh
docker compose -f docker-compose.beta.yml down
```

## Tear down + wipe volumes (DANGER — destroys data)

```sh
docker compose -f docker-compose.beta.yml down -v
```

## What this checkpoint does NOT do

CP18 leaves the following for later checkpoints:

- **CP19** — DNS records + verifying Let's Encrypt certs issue cleanly
- **CP20** — Keycloak: SMTP, password reset, MFA enforcement, brute-force lockout
- **CP21** — Loki + Grafana + Sentry observability
- **CP22** — caddy-ratelimit, OWASP headers tightening, Scriban CVE fix

Each one is additive — none of them edit `docker-compose.beta.yml` in a way
that would invalidate this baseline.
