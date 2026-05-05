# ULP / SCMCube E2E Tests

Playwright tests that drive the SPA + real backend through the Milestone-1 import flow.

## What's here

- **`specs/import-flow.spec.ts`** — five tests that prove the dashboard renders, leads can be created end-to-end, shipment tabs exist, the v2 Invoice In-Transit tab is wired, and customs is read-only by design.

## Prereqs

1. Full stack up: `docker compose -f infra/docker/docker-compose.yml up -d`
2. API running: `dotnet run --project src/backend/host/Ulp.Api`
3. SPA running: `cd src/frontend/ulp-web && npm start` (port 4200)
4. Keycloak realm `ulp` seeded (init-db.ps1 covers this) with the `in-admin@ulp.local` / `DevPass!2345` user
5. Demo seed loaded (CP17) — gives the forms known party/port IDs so flows continue end-to-end. Without it, the simple create cases pass but cross-flow tests fail at FK lookup.

## First run

```powershell
cd tests\e2e
npm install
npx playwright install chromium
npm test
```

Output:
- Console: pass/fail per test
- `playwright-report/` — HTML report with traces, screenshots, video on failures

## Adding tests

Create `specs/<feature>.spec.ts`. Reuse the `loginViaKeycloak` helper. Keep tests serial unless you can prove they don't share data.

## CI integration

CP16 (GitHub Actions) wires this up: bring up stack via compose, install Playwright in CI, run on PR.

## What's NOT covered yet (post-beta)

- Per-form smoke (clicks every "+ New" button across all 30 forms). The unit specs in `src/.../*.spec.ts` cover that pattern; copy `lead-form.component.spec.ts` per form.
- Visual regression. Add `await page.screenshot()` + `toMatchSnapshot` once UI is stable.
- Mobile viewports. Add devices to `playwright.config.ts` projects array.
- Doc generation download flow (HBL/AWB/Arrival Notice etc.) — verifies blob URL opens in a new tab.
