# CP26 — Soft launch + 48h monitoring

The plan: invite a small subset of testers first, watch the system for 48
hours with structured 6-hour check-ins (per Q6 from kickoff), then open up
to the full cohort.

## Day 0 — Soft launch

### Morning of go-live (T+0)

- [ ] CP24 bug bash: every step passing on a fresh `down -v` → `up -d`
- [ ] CP23 load test: green within the last 24h on the actual prod-shaped box
- [ ] Backups: yesterday's nightly dump exists in `infra/beta/backups/`
- [ ] Sentry DSN set + a deliberate test error fired and visible in Sentry UI
- [ ] Grafana dashboard pulled up on a second monitor — leave it open

### First wave invite (T+0 to T+1h)

Pick **3 testers** for the first 24 hours. Choose:
- One who's a careful "happy-path" user — will exercise common flows
- One who's a known-aggressive tester — will try edge cases
- One who's tech-fluent — can give detailed bug reports

Email them via the KC admin console flow (see
[`keycloak-prod-config.md`](keycloak-prod-config.md) §"Adding more beta users"
Option A).

For each invitee, **personally walk them through their first login** — a 10
min Zoom is enough. This catches "the email didn't arrive" / "I can't scan
the QR" / "the app loads but says I'm logged out" before it lands as a bug
ticket.

### First-day playbook (T+1h to T+24h)

Run the [status snapshot](#status-snapshot-script) every 6 hours. Record each
snapshot in a running log:

```
infra/beta/soft-launch-log.md (gitignored — contains live PII-adjacent data)
```

Format per entry:
```
## T+6h (2026-05-13 19:00 UTC)

Active testers logged in:        2/3
5xx in last 6h:                  0
p95 latency (last 6h):           340 ms
Disk free:                       62%
MySQL slow queries:              1 (`SELECT FROM m5_shipment WHERE…`)
Sentry events:                   0
Open beta bugs:                  2 (P3 typo on dashboard, P3 sidebar hover)

Decision: continue.
```

A snapshot is **green** if:
- 5xx count = 0
- p95 latency < 800 ms (matches load-test threshold)
- Disk free > 30%
- No P0/P1 bug filed in the last 6h

If anything is red, decide via the [rollback tree](#rollback-decision-tree).

## Day 1 — Wider invite (T+24h)

If three consecutive 6-hour snapshots are green, invite the next **5–7
testers**. Don't open to the full 20 yet — incremental load reveals
incremental problems.

Repeat the 6-hour cadence. Snapshots get less interesting once you cross
T+12h with no issues — that's the signal it's working.

## Day 2 — Full cohort (T+48h)

If T+24h to T+48h stays green:
- Open invites to the rest of the cohort (10–20 total testers)
- Drop snapshot cadence to once a day
- Send the [`beta-tester-welcome.md`](beta-tester-welcome.md) to all testers
  in a single batch email

If T+24h to T+48h has any red flags:
- Don't expand the cohort
- Triage the open issues
- Reset the soft-launch clock once fixes are in

## Status snapshot script

Add this to `infra/beta/scripts/status-snapshot.sh`:

```sh
#!/bin/sh
# 6-hour status snapshot for the soft launch log.
set -eu
domain="${ULP_DOMAIN:?set ULP_DOMAIN}"

echo "## T+? ($(date -u +'%Y-%m-%d %H:%M UTC'))"
echo

# 1. API health
echo -n "API health: "
if curl -fsS "https://api.${domain}/health" >/dev/null 2>&1; then
    echo "OK"
else
    echo "DOWN"
fi

# 2. Container states
echo
echo "Container states:"
docker compose -f infra/beta/docker-compose.beta.yml ps --format \
    'table {{.Service}}\t{{.Status}}' | sed 's/^/  /'

# 3. Disk free
echo
echo -n "Disk free on /: "
df -h / | awk 'NR==2{print $5 " used (" $4 " free)"}'

# 4. Backups
echo -n "Latest backup: "
ls -t infra/beta/backups/*.sql.gz 2>/dev/null | head -n 1 | xargs -I{} basename {} \
    || echo "none"

# 5. 5xx in the last 6h via Caddy access log
echo -n "5xx in last 6h (Caddy): "
since=$(date -u -d '6 hours ago' +%s 2>/dev/null || date -v-6H +%s)
docker exec ulp-beta-caddy sh -c 'find /data/caddy/logs -name "*.access.log"' \
    | xargs -I{} docker exec ulp-beta-caddy grep -c '"status":5..' {} 2>/dev/null \
    | awk '{s+=$1} END{print s+0}'

# 6. Active sessions in Keycloak (admin REST)
echo -n "Active KC sessions: "
echo "(check kc.${domain}/admin → Sessions)"

echo
echo "---"
```

Run with `sh infra/beta/scripts/status-snapshot.sh >> infra/beta/soft-launch-log.md`.

## Rollback decision tree

```
Is the site DOWN (curl health fails)?
├─ Yes → roll back stack to last known-good image:
│       docker compose -f docker-compose.beta.yml --env-file .env.beta down
│       (rollback container image tags in compose file or .env.beta)
│       docker compose -f docker-compose.beta.yml --env-file .env.beta up -d
│       Notify the 3 active testers via email; pause invites.
└─ No, but degraded?
   ├─ p95 > 2s sustained?
   │  └─ Loki dashboard → which endpoint is slow → likely DB query.
   │     Add an index, deploy hotfix, or accept until next maintenance window.
   ├─ 5xx > 0 but rare?
   │  └─ Sentry will have stack trace → fix forward, no rollback.
   ├─ Disk > 80% full?
   │  └─ Loki retention → drop to 7 days; clear old backups beyond 7 days
   │     manually; check for runaway logs from any single container.
   └─ Single tester locked out / can't log in?
      └─ Not a stack issue. Help that user via KC admin console
         (see keycloak-prod-config.md).
```

## Rollback to "no beta": shut it all down

If something goes catastrophically wrong and you need to take the box
offline:

```sh
# Save current state for forensics:
docker compose -f infra/beta/docker-compose.beta.yml --env-file .env.beta logs \
    > /tmp/beta-shutdown-$(date -u +%Y%m%dT%H%MZ).log
mysqldump  # via the backup sidecar's last run if MySQL is fine; else skip

# Stop public traffic:
docker compose -f infra/beta/docker-compose.beta.yml stop caddy

# Email cohort:
# Subject: "SCMCube beta — temporary outage"
# Body: We've taken the beta site offline for emergency maintenance. ETA: <X>.
```

Public access ends within seconds of stopping Caddy. Internal data is intact;
nothing is lost.

## Done criteria

Soft launch is **complete** when:
- 48 consecutive hours of green snapshots
- Full cohort (10–20 testers) onboarded
- No P0/P1 bugs in the last 24h
- Backups have run successfully twice (proven by their existence + size)
- Cert renewals in `caddy_data` show `not_after` > 60 days (LE auto-renews)

After this, beta moves into normal-running mode — keep the daily snapshot
habit, triage bugs as they come, and start planning the cutover to GA per
the timeline in the project plan.
