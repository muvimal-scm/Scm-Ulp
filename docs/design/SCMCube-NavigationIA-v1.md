# SCMCube — Navigation Information Architecture v1.0

**Status:** Locked. Companion to [SCMCube-DesignSystem.md](SCMCube-DesignSystem.md) and [ADR 0037](../adr/0037-scmcube-brand-design-system.md).
**Decided:** 2026-05-02
**Decider:** Shankar
**Sources:**
- [ULP_HLD_v2.0_MultiRegion.docx §9 Module Catalog](../../ulpReq/ULP_HLD_v2.0_MultiRegion.docx) — 27 ULP backend modules (M1–M27)
- `FreightCube_v2_Full_Platform.html` (Shankar's reference IA from `D:\Immortal-2025\Immortal-2026\Product\`) — battle-tested freight-forwarder navigation taxonomy
- SCMCube brand product catalogue: ImpexCube, FreightCube, WMSCube, TMSCube, FACube, EximCube

## 1. Purpose

This document captures the **frontend navigation taxonomy** for the post-login SCMCube SaaS app shell. The 38 ULP design docs define backend modules by number (M1, M4, M5, ...) but do not specify how those modules surface to the user. This document fills that gap.

**Why this matters:** Without a locked IA, every session that touches the sidebar drifts. Designers and developers must agree on (a) which modules belong together, (b) what they're called on the surface, and (c) what order they appear in.

## 2. Design principles

1. **Customer-first ordering.** The customer is where every workflow begins (lead → quote → booking → operations → invoice). CRM is the FIRST group. Everything else follows in workflow order.
2. **Brand product names on the surface.** Users see "FreightCube · Forwarding" or "ImpexCube · Customs" — not "M5" or "M4". Each brand product maps to one or more backend modules.
3. **Semantic grouping by intent.** Modules group by *what users come to do*, not by *what team built them*. Tracking & Documents is its own group ("Visibility") because users come to the app *to see* shipment status — they don't come to "do operations" and stumble onto tracking.
4. **Two new groups beyond what's in the docs.** "Visibility" and "Management" don't appear in `ulpReq/` design docs — they're added here per the FreightCube reference IA. Both serve real cross-cutting functions that have no natural home in the operational groups.
5. **Light theme, brand-correct.** Sidebar matches `SCMCube-DesignSystem.md` — white surface, purple/lavender accents, no dark theme. See §6.

## 3. The 8-group taxonomy (locked order)

```
─ DASHBOARD                 (top item, ungrouped)

  COMMERCIAL                (customer-first — every workflow starts here)
    CRM & Sales             ▾ Lead management
                            ▾ Quotation & rates
                            ▾ Customer contracts
                            ▾ CRM outreach

  OPERATIONS                (the actual freight work)
    FreightCube · Forwarding   ▾ Job management
                               ▾ Air export — HAWB / MAWB
                               ▾ Air import — HBL / D-O
                               ▾ Ocean export — HBL / MBL
                               ▾ Ocean import — HBL / D-O
                               ▾ Container survey [new]
    International Courier      [new]
    Domestic Courier           [new]
    Consolidation (CGM / LCL)  ▾ Air consol manifest
                               ▾ Sea consol (LCL)
                               ▾ Consol agent master
                               ▾ IGM — land, transport
                               ▾ SCMTR filing

  COMPLIANCE                (regulatory filings)
    ImpexCube · Customs        ▾ Duty calculator & tariff
                               ▾ Import / export clearance
                               ▾ LEO — Let Export Order
                               ▾ OOC — Out of Charge
                               ▾ CE Certificate [new]
                               ▾ Commodity codes
    EximCube · Trade Programs  [ext]
                               ▾ HS code lookup & tariff
                               ▾ Trade data intelligence
                               ▾ Restricted party screening
                               ▾ Compliance alerts

  LOGISTICS                 (move + store the goods)
    TMSCube · Transport        ▾ LR booking & creation
                               ▾ Trip start / close
                               ▾ Delivery running sheet
                               ▾ Proof of delivery
                               ▾ Transport invoice & reports
    Fleet Management
    WMSCube · Warehouse        [new]
                               ▾ Inbound — GRN, inspection
                               ▾ Storage & bin management
                               ▾ Inventory control
                               ▾ Bonded warehouse
                               ▾ Outbound dispatch
                               ▾ Warehouse billing & reports

  VISIBILITY                (cross-cutting — see what's happening)
    Tracking & Documents       ▾ Stage milestone tracker
                               ▾ Stage update & status
                               ▾ DMS — document management
                               ▾ Landed cost
                               ▾ Stage status reports

  FINANCE                   (close the books)
    FACube · Finance           ▾ Billing & invoices
                               ▾ Vendor bills
                               ▾ Payments & receipts
                               ▾ Remittance & funds
                               ▾ Bank reconciliation

  MANAGEMENT                (back-office tools)
    Reports & Analytics        ▾ Register reports
                               ▾ Financial statements
                               ▾ MIS & dashboards
                               ▾ BI & analytics
                               ▾ GSTR / TDS statutory
    HRMS                       [new]
                               ▾ Employee master
                               ▾ Attendance & leave
                               ▾ Payroll processing
                               ▾ Performance management
                               ▾ HR reports
    Settings                   ▾ Master data
                               ▾ User management & roles
                               ▾ Print & notification config
                               ▾ System tools & audit

─ HELP & SUPPORT            (footer)
─ SIGN OUT                  (footer)
```

**Total:** 8 groups (Dashboard + 7 named) · 18 top-level modules · 56 leaf items.

## 4. Mapping — sidebar item → ULP backend module

Every sidebar item resolves to a ULP backend module per [HLD §9](../../ulpReq/ULP_HLD_v2.0_MultiRegion.docx). When a module isn't built yet, the sidebar item is `status:'soon'` (greyed at 55% opacity, not clickable).

| Sidebar item | ULP module(s) | Status |
|---|---|---|
| Dashboard | M24 Dashboards | Phase 4 |
| **CRM & Sales** | M2 Sales / CRM | Phase 4 |
| **FreightCube · Forwarding** | M5 Freight Forwarding + M6 Doc Generation | Phase 2 |
| International Courier | (new — extend M5) | Future |
| Domestic Courier | (new — extend M13 + M5) | Future |
| Consolidation | M5 + M20 SCMTR (IN plugin) | Phase 2/3a |
| **ImpexCube · Customs** | M4 CHA core + M4-IN ICEGATE plugin + M4-US CBP/ABI plugin | Phase 2/3a/3b |
| EximCube · Trade Programs | M15 DGFT (IN) + M15-US Trade Programs (US) | Phase 3a/3b |
| **TMSCube · Transport** | M13 Transportation core | Phase 2 |
| Fleet Management | M13 + M13-US ELD/HOS/IFTA (US plugin) | Phase 2/3b |
| **WMSCube · Warehouse** | M8 WMS | Phase 2 |
| Tracking & Documents | M21 Doc Mgmt + M24 widgets | Phase 1/4 |
| **FACube · Finance** | M17 Accounts core + M17-IN GST (IN) + M17-US GAAP (US) | Phase 2/3a/3b |
| Reports & Analytics | M24 Dashboards (analytic side) + M18 GST returns + M19 TDS | Phase 4 / 3a |
| HRMS | M23 HR / Payroll + M20-US Payroll (US plugin) | Phase 4 / 3b |
| Settings | M1 Master Data + M26 RBAC + M27 Notifications | Phase 1 |

Bold rows = brand product surfacing.

## 5. Badges and statuses

Per `SCMCube-DesignSystem.md`:

| Badge | Background | Text | Meaning |
|---|---|---|---|
| `new` | `#DEF7E5` | `#2E8B57` | Recently added, draws attention |
| `ext` | `#E8E2F4` | `#3F2D7C` | External integration / portal |
| `soon` | `#F0F0F4` | `#9A9AA3` | Module not yet shipped |
| Numeric (`3`) | `#DEF7E5` | `#2E8B57` | Unread / pending count |

## 6. Sidebar visual rules

Per `SCMCube-DesignSystem.md` v1.4 + sidebar-fit rules added 2026-05-02:

- **Background:** `#FFFFFF` (white). Light theme always.
- **Width — expanded:** 300px (fits the longest label without truncation).
- **Width — collapsed:** 60px (icons only, with hover tooltip showing the label).
- **Group titles:** uppercase 11px / 700 weight / `#9A9AA3`, letterspacing 1.2px.
- **Item rows:** 14px label, 9px vertical padding, 3px transparent left border.
- **Hover:** `#F5F2FB` background, purple text.
- **Active:** `#E8E2F4` background, purple `#5B3FA0` left border, purple text bold.
- **Children indent:** padding-left 44px (room for label icon + dot + label).
- **All labels:** `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` — never wrap, never overflow horizontally.
- **Sidebar overflow:** `overflow-x: hidden` — guaranteed no horizontal scroll.

## 7. Per-module page pattern

When you click a sidebar leaf item, the content area shows:

```
breadcrumb           Home › Operations › FreightCube · Forwarding
hero card            [icon]  Module title + description + status pills
quick actions        [Create Job] [Track Shipment] [Generate Document] ...
content              tables, forms, dashboards specific to the module
```

This pattern is enforced for every module page so the chrome is consistent. Detail templates live in each module folder under `src/frontend/ulp-web/src/app/features/`.

## 8. Adding a new module

When a new ULP backend module ships:

1. Update the relevant row in the table at §4 (set Status: ✅ live).
2. In `app-shell.component.ts → navGroups`, remove `status: 'soon'` from the matching nav item.
3. Add the route in `app.routes.ts` under `/app/<module-key>`.
4. Build the feature component at `src/frontend/ulp-web/src/app/features/<module-key>/`.
5. Verify the breadcrumb + hero pattern matches §7.

## 9. Versioning

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-02 | Initial IA. 8 groups, 18 top-level modules, 56 leaves. CRM at top per Shankar's customer-first principle. Visibility and Management groups added beyond the original ULP docs (sourced from FreightCube reference IA). |
