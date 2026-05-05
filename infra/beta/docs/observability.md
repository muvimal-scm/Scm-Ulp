# CP21 — Observability for the beta deployment

Three layers, each independently deployable:

| Layer        | What it covers                                | Where it lives                             |
|--------------|-----------------------------------------------|--------------------------------------------|
| Loki+Promtail| All container stdout/stderr + Caddy access log| `docker-compose.observability.yml`         |
| Grafana      | Dashboards over Loki                          | same compose; vhost `grafana.<ULP_DOMAIN>` |
| Sentry       | Unhandled .NET exceptions (errors w/ trace)   | `Sentry.AspNetCore` in API host            |

Loki + Grafana are self-hosted (Phase 1 "open-source-first" rule). Sentry can
be self-hosted (sentry.io OSS) or used as SaaS — you decide via the `SENTRY_DSN`
env. Leaving the DSN empty disables Sentry cleanly; the API never tries to
ship errors upstream.

## Bring up

```sh
# Add a 6th DNS record before bringing up Grafana:
#   grafana.<ULP_DOMAIN>  A  <beta server IP>
# Re-run the preflight after adding it:
sh infra/beta/scripts/dns-preflight.sh ulp-beta.example.com 203.0.113.42

# Set GRAFANA_ADMIN_PASSWORD (and SENTRY_DSN if you want errors shipped) in
# .env.beta, then bring up the obs stack alongside the main stack:
cd infra/beta
docker compose \
    -f docker-compose.beta.yml \
    -f docker-compose.observability.yml \
    --env-file .env.beta \
    up -d
```

Caddy will request a Let's Encrypt cert for `grafana.<domain>` on first hit.

## Log in to Grafana

`https://grafana.<ULP_DOMAIN>` → user `admin`, password `GRAFANA_ADMIN_PASSWORD`.

The "ULP Beta — Overview" dashboard is auto-provisioned (folder: **ULP Beta**)
and shows:

- API request rate (req/min over last 1m)
- API 5xx in last 15m (red threshold ≥10)
- Failed Keycloak logins in 1h
- Brute-force locks in 1h
- Live tail of API errors
- MySQL slow queries (>1s, from `--slow-query-log`)
- Caddy responses by status class (2xx/3xx/4xx/5xx time-series)
- Caddy 4xx + 5xx live tail

## Useful Loki queries

```logql
# Slowest API requests in the last 10 minutes (from Serilog request logging).
{compose_service="api"} |= "HTTP" |~ "Elapsed=[0-9]{4,}"

# Every login attempt + outcome over the last hour.
{compose_service="keycloak"} |~ "(LOGIN|LOGOUT)"

# Caddy 5xx grouped by upstream over 1 hour.
sum by (upstream) (count_over_time({job="caddy_access"} | json | status =~ "5.." [1h]))

# Specific tenant's activity (substitute tenant_id 1001).
{compose_service="api"} |= "tenant_id=1001"
```

## Sentry

Self-host (Sentry's OSS docker-compose is its own ~10-container stack) or use
sentry.io. For 10–20 beta users, the sentry.io free tier (5k errors/month) is
plenty.

1. Create a project: https://sentry.io → New Project → ASP.NET Core. Note the
   DSN (looks like `https://abc...@o12345.ingest.sentry.io/67890`).
2. Put it in `.env.beta`:
   ```
   SENTRY_DSN=https://abc...@o12345.ingest.sentry.io/67890
   ```
3. `docker compose -f docker-compose.beta.yml --env-file .env.beta up -d api`
   restarts the API with Sentry attached.
4. Hit the API to trigger an error (e.g. `curl https://api.<domain>/whoami`
   without a token → 401, not an error). To test, temporarily make a 500: a
   POST to `/api/v1/admin/factory-reset` without admin perms returns 403 (also
   not an error). Easiest: deploy a known-broken commit briefly. Sentry should
   capture it within seconds.

### Sentry data scrubbing

`SendDefaultPii = false` (Program.cs) means Sentry won't auto-attach the user's
email or IP. You can still attach `tenant_id`/`country_code` per-request via
`SentrySdk.ConfigureScope` if you want — but for beta, default-off is the
right setting.

### Disabling Sentry

Set `SENTRY_DSN=` (empty) in `.env.beta` and restart the API. The Program.cs
gate skips `UseSentry()` when DSN is empty — zero overhead, no failed network
calls.

## Disk pressure warnings

- **Loki retention** is set to 14 days (`limits_config.retention_period: 336h`).
  Beta box should reserve ~5 GB for `loki_data` volume; growth tracks log
  volume from all containers (API at INFO ≈ 200 MB/day with 10 active users).
- **Caddy access logs** roll at 50–100 MB per file with 14 retained — bounded.
- **Grafana data** is just the dashboards + users + state — under 100 MB.

If disk fills up and Loki starts rejecting writes, Loki's logs surface
`per-stream rate limit exceeded` warnings; raise `ingestion_rate_mb` in
`loki-config.yml` and `docker compose ... restart loki`.

## Tear down

```sh
cd infra/beta
docker compose -f docker-compose.observability.yml down       # keeps volumes
docker compose -f docker-compose.observability.yml down -v    # destroys logs
```

Tearing down obs leaves the main stack untouched (different network on the
Grafana side; shared `ulp-beta-network` for promtail's view of containers).

## Sidebar: what this checkpoint deliberately doesn't ship

- **Prometheus / metrics**: Loki carries the load-bearing signal for beta
  (logs + structured metrics extracted by LogQL). Adding Prometheus is a CP23
  load-test follow-up if we need histogram-quality latency.
- **Alertmanager**: 10–20 beta users → on-call by Slack DM is enough. Wiring
  Grafana → Slack alerts is one Grafana UI click if you want it.
- **Distributed tracing**: Sentry's traces give you per-request waterfalls for
  API errors. Full OTel tracing → Tempo/Jaeger is a Phase 5 production item,
  not a beta blocker.
