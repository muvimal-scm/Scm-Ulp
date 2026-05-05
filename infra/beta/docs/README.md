# Beta operator runbooks — index

Use this as your jump table during bring-up, the bug bash, and incidents.

## Bring-up (in order)

1. [`dns-and-tls.md`](dns-and-tls.md) — DNS records, Let's Encrypt setup,
   common cert-issuance failures (CP19)
2. [`../README.md`](../README.md) — main bring-up runbook for the core stack
   (CP18) — env file prep, `bring-up.sh`, restore from backup, tear down
3. [`keycloak-prod-config.md`](keycloak-prod-config.md) — first-time KC
   bootstrap, adding users, lost-TOTP recovery, SMTP test (CP20)
4. [`observability.md`](observability.md) — bringing up Loki/Grafana, useful
   LogQL queries, Sentry DSN configuration (CP21)
5. [`security-hardening.md`](security-hardening.md) — what changed at CP22
   (Scriban CVE bump, rate limiter, OWASP headers); how to test the limits
6. [`load-test.md`](load-test.md) — k6 load test setup + run + failure triage
   (CP23)
7. [`bug-bash.md`](bug-bash.md) — 11-step go-live bug bash playbook (CP24).
   Run this **before** inviting testers.

## Soft launch (T+0 to T+48h)

8. [`soft-launch.md`](soft-launch.md) — 48-hour soft-launch playbook with
   6-hour snapshot cadence, rollback decision tree, done criteria (CP26).
   Snapshot script: `infra/beta/scripts/status-snapshot.sh`.

## During the beta

- [`beta-tester-welcome.md`](beta-tester-welcome.md) — share this with each
  tester (CP25). Covers first-login flow, what to expect, how to file bugs.

## Incident reference

| If…                                              | Open                                                           |
|--------------------------------------------------|----------------------------------------------------------------|
| TLS errors / cert won't issue                    | [`dns-and-tls.md`](dns-and-tls.md) §6 "Common failure modes"   |
| Can't log in / account locked                    | [`keycloak-prod-config.md`](keycloak-prod-config.md) §"Recovering from lost TOTP" |
| Disk filling, 500s, slow pages                   | [`observability.md`](observability.md) §"Disk pressure" + Grafana dashboard |
| Site keeps 429ing legitimate users               | [`security-hardening.md`](security-hardening.md) §"Per-tenant rate buckets" |
| Need to wipe demo data + start fresh              | Admin sidebar → Demo Reset, or `POST /api/v1/admin/factory-reset` |
| Restoring from a database backup                 | [`../README.md`](../README.md) §"Restore from backup"          |
| Beta box gets DDoS / abuse                       | Caddy access logs in Loki + `infra/beta/scripts/dns-preflight.sh` to confirm DNS |

## Files of record

- `infra/beta/docker-compose.beta.yml` — core stack
- `infra/beta/docker-compose.observability.yml` — opt-in obs stack
- `infra/beta/.env.beta` — secrets (chmod 600, NOT in git)
- `infra/beta/backups/` — nightly mysql dumps (NOT in git)
- `infra/beta/caddy/Caddyfile` — reverse proxy config
- `infra/beta/keycloak/import/ulp-realm.beta.json` — beta realm definition
