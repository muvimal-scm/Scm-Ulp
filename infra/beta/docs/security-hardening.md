# CP22 — Security hardening

Three concrete things changed for beta security posture:

1. **Scriban bumped from 5.10.0 → 5.12.1** — closes 11 known advisories
   (8 high/critical) listed in `Directory.Packages.props`. Confirmed by
   `dotnet build`: `0 Error(s)` and the `NU1902/03/04` warnings are gone.

2. **ASP.NET Core 8 rate limiter** — three named policies with per-IP
   partitioning (X-Forwarded-For first hop, falling back to remote IP):

   | Policy            | Limit                       | Applied to                       |
   |-------------------|-----------------------------|----------------------------------|
   | `auth-sensitive`  | 10/min fixed window         | `/api/v1/admin/*` (factory-reset)|
   | `general-write`   | 120 burst, 60/min refill    | (opt-in per endpoint group)      |
   | `read`            | 600 burst, 600/min refill   | (opt-in per endpoint group)      |

   Add to a module's endpoints with `.RequireRateLimiting("read")` —
   parameter is the policy name. The middleware sits between CORS and auth so
   429 responses fire before we hit JWT validation overhead.

3. **OWASP body limits + headers**:
   - Kestrel: `MaxRequestBodySize = 25 MB` (M21 upload endpoint overrides
     locally to 50 MB via `MultipartBodyLengthLimit`).
   - `MaxRequestHeadersTotalSize = 32 KB` (slows header-bomb attacks).
   - Always-on response headers via a tiny middleware before CORS:
     `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
     `Referrer-Policy: no-referrer`,
     `Permissions-Policy: geolocation=(), camera=(), microphone=()`.
   - These are in addition to Caddy's edge headers — defence in depth so
     internal callers hitting `:8080` directly still get the same posture.

## Testing

```sh
# Trigger the rate limit (without auth — admin endpoint will 401 first
# then 429 once you exceed 10/min):
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://api.<ULP_DOMAIN>/api/v1/admin/factory-reset
done
# Expect: 401 401 ... then 429 starting at the 11th call within the same minute.

# Body-size cap:
dd if=/dev/urandom bs=1M count=30 | \
  curl -X POST -H "Content-Type: application/octet-stream" \
       --data-binary @- https://api.<ULP_DOMAIN>/api/v1/m21/documents
# Expect: 413 Payload Too Large (the 25 MB Kestrel cap; M21 endpoint will
# raise it to 50 MB inside the multipart pipeline).

# Header check:
curl -I https://api.<ULP_DOMAIN>/health
# Expect to see: X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
# Permissions-Policy in addition to Caddy's HSTS.
```

## What this checkpoint deliberately doesn't do

- **caddy-ratelimit module at the edge** — the in-app ASP.NET limiter is
  enough for beta traffic. Edge rate-limiting needs a custom Caddy build with
  `--with github.com/mholt/caddy-ratelimit` and a separate Caddyfile block;
  parked until CP23 (load test) shows we need it.
- **WebAuthn / FIDO2** — TOTP from CP20 is sufficient for 10–20 users.
- **Per-tenant rate buckets** — current limits partition by IP, not tenant.
  Multiple users behind one office NAT share a bucket, which is fine for
  beta. CP24 may switch to `(tenant_id, ip)` if real users hit the cap.
- **OWASP Dependency Check / SAST** — left for the CI hardening pass.

## Files touched

- `src/backend/Directory.Packages.props` — Scriban 5.10.0 → 5.12.1
- `src/backend/host/Ulp.Api/Ulp.Api.csproj` — added `Sentry.AspNetCore` (CP21)
- `src/backend/host/Ulp.Api/Program.cs` — body limits, rate-limiter setup,
  security-headers middleware
- `src/backend/host/Ulp.Api/AdminEndpoints.cs` — admin group requires
  `auth-sensitive` rate-limit policy
