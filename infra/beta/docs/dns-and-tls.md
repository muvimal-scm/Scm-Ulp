# CP19 — DNS + Let's Encrypt for the beta server

This is the procedure for cutting over a real (temporary) domain to the beta
host so Caddy can issue Let's Encrypt certs on first boot. CP18 made the stack
deployable; CP19 makes it *reachable* under real names with valid TLS.

> **Per Q2 from the kickoff:** beta uses a *temporary domain* (not the final
> production zone). All four subdomains live under one apex you control —
> e.g. `ulp-beta.example.com`.

## 1. Prerequisites

- A registered domain you can edit DNS records on. Anything works
  (Cloudflare, Route 53, Namecheap, Squarespace, GoDaddy…).
- Beta server with a public IPv4 (and ideally IPv6) address.
- Ports 80 + 443 open inbound on the beta host. SSH (22) restricted to your
  jump host or VPN.
- `infra/beta/.env.beta` filled in with `ULP_DOMAIN` set to the apex you'll use.

## 2. DNS records

Pick one of the two patterns. **A records** are simplest for a single host;
**CNAMEs** make moving the IP later a one-line change.

### Pattern A — four A records (recommended for beta)

| Type | Host                      | Value (TTL 300)         |
|------|---------------------------|-------------------------|
| A    | `ulp-beta.example.com`    | `203.0.113.42`          |
| A    | `app.ulp-beta.example.com`| `203.0.113.42`          |
| A    | `api.ulp-beta.example.com`| `203.0.113.42`          |
| A    | `kc.ulp-beta.example.com` | `203.0.113.42`          |
| A    | `minio.ulp-beta.example.com`| `203.0.113.42`        |

(Replace `203.0.113.42` with your real public IP.)

### Pattern B — apex A + 3 CNAMEs

| Type  | Host                        | Value                     |
|-------|-----------------------------|---------------------------|
| A     | `ulp-beta.example.com`      | `203.0.113.42`            |
| CNAME | `app.ulp-beta.example.com`  | `ulp-beta.example.com.`   |
| CNAME | `api.ulp-beta.example.com`  | `ulp-beta.example.com.`   |
| CNAME | `kc.ulp-beta.example.com`   | `ulp-beta.example.com.`   |
| CNAME | `minio.ulp-beta.example.com`| `ulp-beta.example.com.`   |

CAA record (recommended, not required):

| Type | Host                     | Value                              |
|------|--------------------------|------------------------------------|
| CAA  | `ulp-beta.example.com`   | `0 issue "letsencrypt.org"`        |

## 3. Wait for DNS propagation, then preflight

Run from your laptop **before** you `docker compose up`:

```sh
sh infra/beta/scripts/dns-preflight.sh ulp-beta.example.com 203.0.113.42
```

The script checks (a) all five hostnames resolve to the expected IP, and
(b) port 80 on the host accepts the HTTP-01 challenge path. It exits non-zero
on any mismatch — bring-up should not proceed until it returns clean.

## 4. Bring up Caddy

Caddy in `infra/beta/docker-compose.beta.yml` is configured to provision certs
automatically on first connection to each hostname. **No manual `certbot`
step.** Watch the issuance live:

```sh
docker compose -f infra/beta/docker-compose.beta.yml logs -f caddy
```

You're looking for one log line per hostname:

```
{"level":"info","logger":"tls.obtain","msg":"acquiring lock"...}
{"level":"info","logger":"tls.obtain","msg":"obtaining certificate"...}
{"level":"info","logger":"tls.obtain","msg":"certificate obtained successfully"...}
```

If you see `"too many failed authorizations"` — Let's Encrypt has rate-limited
your IP. Wait an hour, then retry; or temporarily switch `acme_ca` in the
Caddyfile to the LE staging endpoint
(`https://acme-staging-v02.api.letsencrypt.org/directory`) until you've shaken
out the bring-up issues, then switch back.

## 5. Verify TLS

```sh
curl -sS -o /dev/null -w '%{http_code}\n' https://app.ulp-beta.example.com/
curl -sS -o /dev/null -w '%{http_code}\n' https://api.ulp-beta.example.com/health
curl -sS https://kc.ulp-beta.example.com/realms/ulp/.well-known/openid-configuration | head -c 200
```

Expected: `200`, `200`, and a JSON blob starting with `{"issuer":"https://kc.…`.

`testssl.sh` or `https://www.ssllabs.com/ssltest/` should give A or A+ on each
hostname (HSTS + strong ciphers come from the `header` directives in the
Caddyfile).

## 6. Common failure modes

| Symptom                                              | Cause                                                | Fix |
|------------------------------------------------------|------------------------------------------------------|-----|
| `tls.obtain: failed to get certificate: ... timeout` | Port 80 not reachable from public internet           | Open port 80; Let's Encrypt MUST hit `:80/.well-known/acme-challenge/...`. Even with HTTPS-only intent. |
| `urn:ietf:params:acme:error:dns`                     | DNS hasn't propagated, or apex points elsewhere      | Re-run `dns-preflight.sh`; wait until all 5 names resolve. |
| `urn:ietf:params:acme:error:rateLimited`             | Hit LE's per-domain or per-IP cap                    | Switch to staging directory while debugging; back off real LE for 1h. |
| `400 Bad Request` from Keycloak after login          | `KC_HOSTNAME_STRICT_HTTPS=true` but Caddy → KC over HTTP | Already handled by `KC_PROXY=edge` in the compose; if you forked the compose, keep that env var. |
| Browser shows `app.<domain>` cert but Keycloak login → "site can't be reached" | Missing CNAME/A for `kc.<domain>` | Add the record + re-run preflight. |

## 7. Rollback

To detach Let's Encrypt and start fresh (e.g. you used the wrong email and
want to re-issue):

```sh
docker compose -f infra/beta/docker-compose.beta.yml down
docker volume rm ulp-beta_caddy_data ulp-beta_caddy_config
docker compose -f infra/beta/docker-compose.beta.yml --env-file .env.beta up -d
```

Caddy will re-request all certs. **Do this sparingly** — too many cert orders
in a week trips Let's Encrypt's rate limits.
