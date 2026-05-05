# Client Milestone Document — Delta Analysis (v1 → v2)

**Compared:**
- **v1** (May 1): `ulpReq/Milestone Timeline - SCM_ClientProposal.docx` (extracted as `Milestone_extracted.txt` on May 3)
- **v2** (May 4): `ulpReq/Milestone Timeline - SCM (1).docx` (extracted as `Milestone_v2_extracted.txt`)

**Bottom line:** Most diffs are cosmetic (whitespace, line wraps). But there are **6 real scope changes** — and two of them shift the priority of Milestone 1 in a way we need to act on.

---

## REAL CONTENT CHANGES

### ⚠ Change 1 — Milestone 1 scope **reshuffled** (high impact)

In v1, Milestone 1 led with **Control Tower** (filters, subtabs, watchlist, reminders, chat). v2 **moved Control Tower to Milestone 2** and put **Sales – Leads / New Quote** at the top of Milestone 1 instead.

**v1 Milestone 1 content (now in M2):**
- Control Tower with subtabs (All Shipments, Ocean Import/Export, Air Import/Export)
- Filters: file #, MBL, HBL, Cntr #, Shipper, Cnee, PO #, Team Code, POL/POD/POFD, ETA range, Firms Code, Supplier Product #, Internal Product #
- Shipment stages, Watchlist, Reminders/Holds, Chat Box

**v2 Milestone 1 content (new top of stack):**
- **Sales – Leads, New Quote** (was an "Order Management – Leads" item buried lower in v1 M1)
- ERP for Vendor Account (Shipment Details) — with explicit note: ***need tab for Ocean Export, Ocean Import, Air Export, Air Import*** (this absorbs the old Control Tower subtab idea but bound to the vendor/shipment screen, not a separate Control Tower screen)
- Generating New Shipment (MBL/HBL), Documents (incl. **Bill of Lading promoted to top**), Doc Mgmt for shipment, Memo Notes (now also "task history"), Profiles & Settings, POA, Permits, Misc Docs

### ⚠ Change 2 — "Logins tracked by email" now requires **organization admin account**

- **v1:** "Logins tracked by email address"
- **v2:** "Logins tracked by email address **but need organization admin account**"

**Impact:** changes the M26 RBAC model. v1 implied flat user list keyed by email. v2 wants a **two-tier** model: organization → admin → users. We have `m_tenant` already, but the **org-admin role per tenant** as a distinct first-class concept isn't explicitly modeled in M26 today (we have generic `is_admin` flag). May need an explicit `OrganizationAdmin` role + UI for the admin to invite/manage their org's users.

### Change 3 — Memo Notes adds "task history"

- **v1:** "Memo Notes (internal)"
- **v2:** "Memo Notes (internal) **— task history**"
- And a new bullet under M2 In-Transit: `**task history**`

**Impact:** the existing `m5_shipment_memo` table covers free-text memos. We now also need a **structured task/activity history** (who did what, when, on this shipment). Either extend the memo table with a `kind` enum (`memo` vs `task-event`) or add a new `m5_shipment_task_history` table populated by the API on every state change. Also surface in the Shipment Detail page.

### Change 4 — M2 In-Transit columns simplified, added **Track Shipment Holds**

- **v1 M2** had explicit columns: `Vessel Departure / In-Transit / Vessel Arrival / At POD / Discharged / Inbound Arrival / Gate Out / Empty Return / Dispute Status / Demurrage / Per Diem / Customs info / Duty per product calculated on 7501 / PGA holds`
- **v2 M2** generalises this to: `Be able to see status of each shipment / **Track Shipment Holds (BL, Freight, Customs, Terminal Fees)** / Customs info / PGA holds / **Calculate out landed costs**`

**Impact:**
- `Track Shipment Holds` becomes a first-class concept with a **typology** (BL/Freight/Customs/Terminal Fees). We have `m5_hold` already from the SCM closure work — verify it has a `hold_type` enum that covers these four. If not, add them.
- `Calculate out landed costs` was implied before; now it's a **named explicit requirement** for M2. Today we have charges on shipment but no consolidated "landed cost" computation per shipment. New backend method needed: `IFreightForwardingService.GetLandedCostAsync(shipmentId)`.

### Change 5 — M3 Accounting adds **Invoice Status (Tab 5: Invoices: Shipments In-Transit)**

- **v1:** absent
- **v2:** "Invoice Status (Tab 5: Invoices: Shipments In-Transit)" (new line in M3)

**Impact:** a new tab/screen on Accounting that filters invoices to those whose shipment is currently In-Transit. This is a list view we don't have explicitly today. Easy add — query `m17_invoice` ⨝ `m5_shipment` where `shipment.status IN (in-transit set)`.

### Change 6 — M4 Trucking absorbs **Order Management – Purchase Orders**

- **v1:** Purchase Orders + approval workflow lived in **Milestone 2** (top of M2 list).
- **v2:** Purchase Orders + approval workflow moved to **Milestone 4** (bottom of trucking section, alongside trucking).

**Impact:** **DEPRIORITIZES** purchase-order CRUD. We don't have to ship M7 PO UI in M2. Frees up bandwidth in earlier milestones.

---

## ITEMS UNCHANGED (no action needed)

Everything else is identical between v1 and v2 — only whitespace/formatting differences:
- M1: Profiles & Settings, POA, Permits, Misc Docs (unchanged)
- M3: Accounting, Settlement, Aging, Payment History, Bank, GL, Email/Notification rules (unchanged)
- M4: Trucking workflow, columns, dispatch, accessorial, app (unchanged)
- M5: Warehousing, Inventory, Sales Order, App, Doc Mgmt, Other Ops (unchanged)
- M6: Documentation Functions, Reports (unchanged)

---

## STATUS vs. CURRENT BUILD

| Item | v2 location | Build status today |
|---|---|---|
| Sales – Leads, New Quote (M1) | M1 | ✅ Backend + List UI live; **Lead form CRUD just shipped today**; Quote wizard not yet built |
| ERP Vendor Account / Shipment Details with Ocean/Air Import/Export tabs | M1 | 🟡 Backend live (M5); list UI live; **tabs need to filter by `direction × mode`** — minor refactor |
| Generate New Shipment (MBL/HBL) | M1 | ✅ Backend live; **Shipment create form not yet wired** (CRUD recipe applies) |
| Generate Documents (BoL, Arrival Notice, DO, etc.) | M1 | ✅ Backend live (M6 DocGen); 10 templates seeded |
| Doc Mgmt (shipment + profile) | M1 | ✅ Backend + UI live (M21) |
| Memo Notes (internal) — **task history** | M1 | 🟡 `m5_shipment_memo` exists; **task history is a delta** |
| Profiles & Settings — **org admin** | M1 | 🟡 `m_tenant` + M26 users live; **org-admin tier delta** |
| POA / Permits / Misc Docs | M1 | ✅ Backend + UI live (M1 closure work) |
| Control Tower (subtabs, filters, watchlist, reminders, chat) | M2 | ✅ All shipped except Chat Box |
| Sales – RFQ | M2 | ✅ Backend live; UI list-only today; CRUD applies |
| Order Management – New Booking Request | M2 | ✅ Backend live (M5); CRUD applies |
| Active Shipments – In-Transit + **Track Shipment Holds (typed)** + **Calculate landed costs** | M2 | 🟡 Holds exist; **typology + landed-cost are deltas** |
| Customs info / PGA holds | M2 | ✅ M4-US delivered |
| All M3 Accounting items | M3 | ✅ M17 + M17-extension delivered (Phase 1 closure) |
| **Invoice Status — Tab 5** | M3 | ❌ **Delta — new tab needed** |
| Email connection + auto-notifications | M3 | ✅ M27 + 5 rules live |
| Trucking + **Purchase Orders moved here** | M4 | ❌ Trucking not built; PO backend exists (M7) but UI deferred |
| Warehousing | M5 | ❌ Not built |
| Doc Functions, Reports | M6 | 🟡 DocGen live; Reports partially live |

---

## DELTA → ACTION LIST (priority for Milestone 1 ERP-up-and-running for agent testing)

These are the **only items the v2 doc adds that aren't already done**:

1. **Quote wizard / template UI** for Sales – Leads (M1 top item now). Backend RFQ/Quote tables exist (M2 RFQ + M14 quote). Need a "New Quote" form that stitches them.
2. **Ocean/Air × Import/Export tabs** on the Shipment Details ERP screen. Filter the existing list by `mode + direction`. ~30 min job.
3. **Bill of Lading promoted** in document list — already built; just ordering in UI.
4. **Memo Notes → Task History** structured records. Add `m5_shipment_task_history` table, append on every shipment state change, render in Shipment Detail.
5. **Logins → Organization admin tier**. Add `OrganizationAdmin` role distinct from regular admin. Org-admin invites/manages users in their org.
6. **Track Shipment Holds typology**: confirm `m5_hold.hold_type` enum has `BL / Freight / Customs / Terminal Fees`. Add if missing.
7. **Landed cost calculation**: `GET /api/v1/freight-forwarding/shipments/{id}/landed-cost` returning `{base, freight, brokerage, duty, accessorials, total}`.
8. **Invoice Status — Tab 5 (Shipments In-Transit)**: new tab on Accounting that lists invoices for in-transit shipments.

**Not added by v2 but already in our backlog:**
- CRUD UI for the 5 modules (MasterData, Procurement, FreightForwarding, Customs, Accounting) per `docs/CRUD_PATTERN.md`.
- FastAPI agent service + smoke-test playbook.

**De-prioritized by v2:** Purchase Order UI work (now M4, no longer M2) — can defer.

---

## RECOMMENDED MILESTONE 1 SCOPE (for agent-driven import/export testing)

To honor v2 priorities, M1 should be:

**Must-ship for M1**:
1. Sales/Lead CRUD (✅ already shipped today)
2. **Quote wizard** (delta #1) — backend hooks already exist
3. Shipment Details ERP screen with **Ocean/Air × Import/Export tabs** (delta #2)
4. **Shipment create + edit form** (CRUD recipe — was already in plan)
5. **Document generation flows** for Arrival Notice, BoL, Delivery Order, Release Instructions, Letter of Guarantee, Authority to Make Entry, U.S. Customs Hold/Exam Notice, I.T., Turnover/Release Order, Air Shipments — backend done, need to verify the 10 templates are wired to a "Generate" button on Shipment Detail
6. **Doc Mgmt for shipment + profile** (✅ already live)
7. **Memo Notes / task history** (delta #4) — small DB + UI add
8. **Org admin tier** (delta #5) — RBAC tweak + admin invite UI
9. **POA / Permits / Misc Docs** (✅ already live)
10. **Demo seed script + agent service skeleton** (per previous plan)

**Pushed to M2 by v2** — no rush on Control Tower, RFQ CRUD UI, Booking Request UI, Track Shipment Holds typology, landed cost — all required but in M2 not M1.

**Pushed even later by v2** — Purchase Orders UI is now M4.

---

## What I recommend doing next

The v2 doc clarifies that **Milestone 1 = "vendor / FF can create a shipment, generate all the docs for it, attach POA/permits, manage profiles"** — i.e. the vendor-side ERP for shipment lifecycle. It's NOT primarily Control Tower / Sales (those move to M2).

Given this, the previous plan's "5 modules CRUD + agent service" needs to **re-prioritize**:

- ✅ Keep: MasterData CRUD (parties/products are needed for shipments)
- ✅ Keep: FreightForwarding CRUD (shipment + booking forms)
- ✅ Keep: Accounting Invoice CRUD (M3 priority anyway)
- ⏬ **DEFER**: Procurement (PO) CRUD — moved to M4
- ⏬ **DEFER**: Customs Entry CRUD — sealed M4-US already covers this in backend; UI form was already not on the M1 critical path
- ➕ **ADD**: Quote wizard (M1 top item now)
- ➕ **ADD**: Shipment task history (memo enhancement)
- ➕ **ADD**: Org admin tier (RBAC tweak)
- ➕ **ADD**: Tab-filtering on shipment ERP (Ocean Import / Export / Air Import / Export)
- ➕ **ADD**: Document generation buttons wired on Shipment Detail (templates exist; just need the "Generate" UX)

Net effort change: roughly **same total hours** (~25–30h focused), but the deliverable list is reshaped to match the client's priority.
