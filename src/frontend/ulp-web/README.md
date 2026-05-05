# ulp-web (Angular 17 SPA)

ULP / SCMCube web application. Phase 1 shell — landing page + auth + dashboard. Module screens land in subsequent streams.

## Prerequisites

- Node.js **20.x** LTS
- npm **10.x** (bundled with Node 20)
- Docker stack running (Keycloak at http://localhost:8080) — see [../../../docs/runbooks/local-stack-up.md](../../../docs/runbooks/local-stack-up.md)
- Backend API running (http://localhost:5080) — see [../../../docs/runbooks/backend-build.md](../../../docs/runbooks/backend-build.md)

## First-time setup

```powershell
cd src\frontend\ulp-web
npm install
```

First install: ~2 minutes (~600 MB in `node_modules`).

## Run the dev server

```powershell
npm start
```

Opens at **http://localhost:4200**. The landing hero shows the SCMCube gradient with a **Sign in** button. Clicking it redirects to Keycloak — log in with one of the seeded test users (e.g., `in-admin@ulp.local` / `DevPass!234`) — and you'll bounce back to the dashboard at `/app/dashboard`.

## What's wired

| Concern | Where |
|---|---|
| Auth (Keycloak `ulp` realm, PKCE) | [src/app/app.config.ts](src/app/app.config.ts), [src/app/core/auth/auth.guard.ts](src/app/core/auth/auth.guard.ts) |
| Bearer-token interceptor | [src/app/core/auth/auth.interceptor.ts](src/app/core/auth/auth.interceptor.ts) |
| Idempotency-Key auto-attach | [src/app/core/http/idempotency-key.interceptor.ts](src/app/core/http/idempotency-key.interceptor.ts) |
| Tenant context (reads tenant_id / country_code / region from JWT) | [src/app/core/tenant/tenant-context.service.ts](src/app/core/tenant/tenant-context.service.ts) |
| Money type + locale-aware formatting | [src/app/shared/money/](src/app/shared/money/) |
| Time helpers (Luxon, IANA tz) | [src/app/shared/time/](src/app/shared/time/) |
| App shell (top nav + sidebar in SCMCube colors) | [src/app/core/shell/app-shell.component.ts](src/app/core/shell/app-shell.component.ts) |
| Landing page (hero gradient + sign-in CTA) | [src/app/features/landing/landing.component.ts](src/app/features/landing/landing.component.ts) |
| Dashboard (calls /health, shows tenant context + permissions) | [src/app/features/dashboard/dashboard.component.ts](src/app/features/dashboard/dashboard.component.ts) |
| Design tokens + Material 17 theme | [src/styles/](src/styles/) — see [docs/design/SCMCube-DesignSystem.md](../../../docs/design/SCMCube-DesignSystem.md) |

## What's NOT wired yet (deferred to module work)

- Module routes (M1, M5, M8, M13, M17, ...) — placeholders only in sidebar
- Tenant switcher (multi-region operators)
- i18n loading from `.xlf` files (English baked-in for now)
- Feature flags
- Error boundary / global error toast

## Conventions

- **Standalone components only** — no NgModules. Skill: [angular-17-signals](../../../.claude/skills/angular-17-signals/SKILL.md).
- **`OnPush` change detection** on every component.
- **Signals** for state, **`@if`/`@for`** for templates.
- **`inject()`** function over constructor injection.
- **Money** is the wire format `{ amount: "1180.00", currency: "INR" }` — never a number.
- **Dates** are ISO 8601 UTC strings on the wire; format with Luxon + tenant tz on display.
- **Never hardcode hex colors** — use SCSS tokens from [src/styles/_tokens.scss](src/styles/_tokens.scss).

## Build

```powershell
npm run build:prod    # outputs to dist/
```

## Test

```powershell
npm test              # interactive Karma
```
