# Beta UAT — Checkpoint 1 Summary (2026-05-04)

**Status:** Build-clean. Pending live verification (API restart required by user).

## Sub-checkpoints

### CP1.A — `/api/v1/identity/me` 500 fix ✅

**Bug:** [PermissionResolver.cs](../src/backend/modules/Identity/Ulp.Identity.Infrastructure/Persistence/PermissionResolver.cs) line 26 used `DateTime.UtcNow.ToInstant()` inside a LINQ `.Where(...)` — EF Core couldn't translate the custom `ToInstant` extension method. The whole `/me` query failed at runtime → 500 → dashboard tenant context never loaded.

**Fix:**
- Inject `IClock` per CLAUDE.md rule (no `DateTime.UtcNow` for business logic).
- Compute `nowInstant = clock.GetCurrentInstant()` *once on the client* before the query.
- Reference the local in `Where`, so EF passes it as a SQL parameter.
- Removed the unused `InstantExtensions.ToInstant` extension class.
- Mojibake side-fix in [Contracts.cs:5](../src/backend/modules/Identity/Ulp.Identity.Application/Contracts.cs#L5).

### CP1.B — Dashboard polish ✅

[dashboard.component.ts](../src/frontend/ulp-web/src/app/features/dashboard/dashboard.component.ts):

- **Quick Actions strip** with 6 deep-links: New Lead, New Shipment, New Booking, New Invoice, Customs Entry, Control Tower.
- **Real KPI counts** — parallel fetches across SalesApi, FreightForwardingApi, AccountingApi, CustomsApi. Per-tile fail-soft (one down module can't black out the whole dashboard).
- **All KPI tiles clickable** — link to their corresponding list page.
- Section subtitle: "Live counts from your tenant" instead of "real values arrive when each module ships".
- Removed `console.warn` debug noise.

### CP1.C — Quote wizard ✅

[quote-wizard.component.ts](../src/frontend/ulp-web/src/app/features/pricing-quotation/quotes/quote-wizard.component.ts):

- 3-step Material stepper: **Header → Lines → Review**.
- Auto-pre-fills from `?leadId=X` query param (creates quote from a lead).
- Atomic create-quote-then-add-lines flow + optional **Save & Send to customer** (sets status `Sent`).
- Auto-suggests `QTE-YYYYMMDD-HHMM` quote number, +30d valid-until.
- Total recomputes live in the lines step.
- Lead list ([leads-list.component.ts](../src/frontend/ulp-web/src/app/features/sales/leads/leads-list.component.ts)) now has a **request_quote** icon on every row that pre-fills the wizard.
- Routes ([pricing-quotation.routes.ts](../src/frontend/ulp-web/src/app/features/pricing-quotation/pricing-quotation.routes.ts)) — added `quotes/new`.
- Quotes list ([quotes-list.component.ts](../src/frontend/ulp-web/src/app/features/pricing-quotation/quotes/quotes-list.component.ts)) — enabled the formerly disabled "+ New quote" button.

### CP1.D — Sales remaining CRUD ✅

Three new forms:

1. [activity-form.component.ts](../src/frontend/ulp-web/src/app/features/sales/activities/activity-form.component.ts) — log call/email/meeting/note/task against Lead, Opp, or Party. Pre-fills from `?relatedTo=Lead&relatedId=42`. Defaults `occurredAt` to now.
2. [campaign-form.component.ts](../src/frontend/ulp-web/src/app/features/sales/campaigns/campaign-form.component.ts) — create Email/SMS/WhatsApp campaign with template + audience filter JSON + scheduled-at.
3. [rfq-form.component.ts](../src/frontend/ulp-web/src/app/features/sales/rfqs/rfq-form.component.ts) — single-page header + lines (description, qty, UoM). Atomic create-rfq-then-add-lines.

Wiring:
- [sales.routes.ts](../src/frontend/ulp-web/src/app/features/sales/sales.routes.ts) — added `activities/new`, `campaigns/new`, `rfqs/new`.
- All 3 list pages now have a `+ New X` button in their headers.
- [sales-types.ts](../src/frontend/ulp-web/src/app/features/sales/shared/sales-types.ts) — added `CreateActivityRequest`, `CreateCampaignRequest`, `CreateRfqRequest`, `CreateRfqLineRequest`, `CreateRfqResponseRequest`.
- [sales-api.service.ts](../src/frontend/ulp-web/src/app/features/sales/shared/sales-api.service.ts) — added `createActivity`, `createCampaign`, `createRfq`, `addRfqLine`, `addRfqResponse`.
- Mojibake fixed in [activities-list.component.ts](../src/frontend/ulp-web/src/app/features/sales/activities/activities-list.component.ts) (`'â€"'` → `'—'`).

### CP1.E — Build verification ✅

- **Backend Identity module**: `dotnet build` succeeded — 0 errors. (Scriban CVE warnings only — tracked for CP22.)
- **Frontend full build**: `ng build` succeeded — 0 errors, 27.4s. Only 4 pre-existing NG8102 warnings in `comparative-profit.component.ts` (unrelated to CP1).

## What's NOT yet verified live

Until you restart the API, these remain (a)-grade build-clean rather than (b)-grade verified-running:

- [ ] `/api/v1/identity/me` returns 200 with the fix
- [ ] Dashboard loads with real KPI counts (not all em-dashes)
- [ ] Quote wizard saves a real quote against MySQL
- [ ] Activity/Campaign/RFQ forms POST successfully
- [ ] Lead → Generate Quote button pre-fills the wizard

## Tooling delivered alongside CP1

- [dev-restart-api.ps1](../infra/scripts/dev-restart-api.ps1) — `taskkill /F /T /IM Ulp.Api.exe` → `dotnet build` → spawn detached API window → wait for `/health` 200. Idempotent. Detects admin-mismatch and prints clear next-step guidance.
- [fix-mojibake.ps1](../infra/scripts/fix-mojibake.ps1) — extended with arrow / bullet / ©®° byte signatures (covered the "Open →" issue from RFQ list).

## Next-step pre-conditions for CP2

1. **You** Ctrl+C the running (elevated) API window once.
2. **I** run `dev-restart-api.ps1` to pick up CP1.A backend fix + verify all of CP1.A–D end-to-end against the live stack.
3. Move to **CP2 — MasterData CRUD (Party + Product)**.

If git is not yet initialised when we close out CP1, this doc plus the file timestamps serves as the change manifest.
