# CP20 — Keycloak production config (SMTP + MFA + brute-force)

CP18 brought up Keycloak behind Caddy with the dev realm. CP20 swaps in a
production-shaped realm that:

- **Forces password change + TOTP on first login** for the bootstrap admin
- **Forces email verification** for every new user added via the SCIM/admin UI
- **Wires SMTP** so password-reset, verify-email, and KC's "magic link" flows
  actually deliver mail
- **Locks out brute-force attempts** at 5 failures in a row (existing dev
  setting kept; tightened wait time)
- **Strong password policy:** 12 chars + upper/lower/digit/special + history(5)
  + 180-day expiry
- **No seeded test users** — the only seeded account is the beta admin, with a
  temporary password emailed to `BETA_ADMIN_EMAIL`

Realm JSON: `infra/beta/keycloak/import/ulp-realm.beta.json`.

## What's different from the dev realm

| Setting                     | Dev realm                  | Beta realm                          |
|-----------------------------|----------------------------|-------------------------------------|
| `verifyEmail`               | false                      | **true**                            |
| `smtpServer`                | not configured             | uses `${env.SMTP_*}` from compose   |
| `frontendUrl`               | `http://localhost:8080`    | `https://kc.${ULP_DOMAIN}`          |
| Password policy             | length(12)+1up+1dig+1spec  | + lower + history(5) + expire(180d) |
| `requiredActions` defaults  | none                       | `CONFIGURE_TOTP`, `VERIFY_EMAIL`    |
| OTP                         | none                       | TOTP (FreeOTP / Google Auth)        |
| Seeded users                | 5 dev personas             | 1 beta-admin (temp password)        |
| Redirect URIs               | `localhost:4200`           | `https://app.${ULP_DOMAIN}`         |
| `webOrigins`                | `localhost:4200` + `+`     | scoped to `app.${ULP_DOMAIN}`       |
| Worker secret               | hardcoded "dev-…"          | from `${env.WORKER_CLIENT_SECRET}`  |

## Bring-up: first-time bootstrap

1. **Ensure the beta admin email is real** — `BETA_ADMIN_EMAIL` in
   `.env.beta` must be a mailbox you can read. You'll receive password-reset
   + email-verify links there.

2. **Bring the stack up** (CP18 instructions). Watch Keycloak logs for:
   ```
   {"level":"INFO","msg":"Imported realm 'ulp'","sequence":...}
   ```
   That confirms `--import-realm` ran.

3. **Send yourself the password-reset email** so you can log in without
   knowing the temp password (it's in `.env.beta`, but treat it as
   write-only):
   - Open `https://kc.${ULP_DOMAIN}/realms/ulp/account` → "Forgot password?"
   - Enter your `BETA_ADMIN_EMAIL`. KC mails the reset link.
   - Click the link → set a strong password → KC immediately prompts you to
     scan the TOTP QR code into FreeOTP / Google Authenticator.

4. **Verify your email** by clicking the second link KC mails you (the
   `VERIFY_EMAIL` required action). After this, your account is fully usable.

5. **Log into the app** at `https://app.${ULP_DOMAIN}`. You should land on the
   dashboard with platform-admin permissions.

## Adding more beta users

Two routes:

### Option A — admin console (faster for 5–10 users)

1. KC admin console → `https://kc.${ULP_DOMAIN}/admin` → master realm login
   with `KEYCLOAK_ADMIN` from `.env.beta`.
2. Switch to realm `ulp`.
3. **Users → Add user**. Fill in email + first/last name. Set
   `Email Verified = OFF` (KC will email a verify link).
4. **Required user actions** → tick `Update Password`, `Configure OTP`,
   `Verify Email`. Save.
5. **Credentials** tab → set a temporary password, mark **Temporary**. Save.
6. **Attributes** tab → add `tenant_id`, `country_code`, `region`, and
   `permissions` per the same schema as the bootstrap admin.
7. **Role mappings** → assign `ulp-user` (or `ulp-admin` for tenant admins).
8. Email the user the URL. KC walks them through password change + TOTP +
   email verify on first login.

### Option B — SCIM via `/api/v1/m26/users` (when CP24 ships the bulk-invite UI)

Postponed to CP24. For 10–20 beta users, Option A is fine.

## Recovering from "I lost my TOTP device"

This will happen during beta. The only path is admin reset:

1. KC admin console → realm `ulp` → Users → find the user.
2. **Credentials** tab → next to "OTP" → click the trash icon.
3. **Required user actions** → tick `Configure OTP` again. Save.
4. User re-enrolls TOTP on their next login.

## SMTP smoke test (without involving the app)

```sh
# From inside the keycloak container (so the path matches where realm JSON's
# {env.SMTP_HOST} got resolved):
docker exec -it ulp-beta-keycloak \
    /opt/keycloak/bin/kcadm.sh config credentials \
        --server http://localhost:8080 \
        --realm master \
        --user "$KEYCLOAK_ADMIN" \
        --password "$KEYCLOAK_ADMIN_PASSWORD"

docker exec -it ulp-beta-keycloak \
    /opt/keycloak/bin/kcadm.sh test-smtp -r ulp -e "$BETA_ADMIN_EMAIL"
```

If the mail bounces, check `SMTP_HOST/PORT/USER/PASSWORD` and ensure your
provider has the beta server's IP allow-listed (some, like AWS SES sandbox,
need explicit verification of `From:` and `To:` until production access is
granted).

## Brute-force tuning (already on)

- 5 failed logins inside the rolling window → 60-second backoff
- Backoff doubles each failure to a 15-minute cap
- Window resets after 12h of no failures

If a beta tester gets locked out: KC admin console → Users → find user →
**Sessions** tab → "Revoke" the lockout entry. Their next login attempt is a
clean slate.

## What this checkpoint does NOT do

- **SCIM / SSO with the customer's IdP** — out of scope for beta. Accounts
  are local to KC.
- **WebAuthn / passkeys** — TOTP is sufficient for 10–20 beta users. CP22 may
  add WebAuthn if the client requests it.
- **Per-realm MFA enforcement at the role level** — currently every user
  configures TOTP because `CONFIGURE_TOTP` is a default required action. To
  loosen this for `ulp-viewer`-only users later, untick "Default Action" on
  CONFIGURE_TOTP and instead add a Conditional MFA flow.
