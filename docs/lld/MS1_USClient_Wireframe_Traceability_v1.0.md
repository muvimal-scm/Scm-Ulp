# US Client Milestone 1 — Wireframe Traceability v1.0

**Status:** Drafted (awaiting Shankar approval)
**Compiled:** May 2026

**What this is:** A traceability map between SooHoo's 15 wireframe screens (US client's Milestone 1 delivery) and the ULP backend modules that power them. Plus the 65 stakeholder questions surfaced in those wireframes — each tagged with the module that needs to answer it.

**Source:** `docs/wireframes/SooHoo_USClient_Milestone1_Wireframes.html` (received from US client / SooHoo design partner via WhatsApp 2026-05-02)

> **Important:** The wireframes use a **navy + blue + teal + gold** palette that does **NOT** match our locked SCMCube brand (purple-pink-coral, ADR 0037). The wireframes drive **layout / IA / field inventory / interaction patterns** only. Visual styling (colors, type, gradients, hero card pattern) follows our locked design system v1.6 verbatim. **No color drift.**

---

## 1. What "Milestone 1" means

Per `ulpReq/ULP_DevelopmentSequencing_v2.0.docx §3.1.1`, the US client's 6-milestone proposal kicks off with Milestone 1 = "Control Tower + Order/Doc/Profiles". The dev-sequencing doc says:

- **Milestone 1 readiness:** End of Phase 4 (Month 8). Earlier preview at end of Phase 2 (Month 4) for non-customs features.

So these 15 screens are NOT shipping in Phase 1 — they span Phases 2 + 4 + (compliance bits in 3b). This document captures the spec; implementation follows phase ordering.

## 2. Traceability matrix — 15 screens × ULP modules

| # | Wireframe screen | Primary module(s) | Phase | Notes |
|---|---|---|---|---|
| 1 | MFA Login | M26 RBAC | 1 | Drives MFA strategy + session tracking |
| 2 | Control Tower (dashboard home) | M24 Dashboards + M27 (chat tile) | 4 | Tenant role-aware widgets |
| 3 | View Shipments (All / Ocean / Air tabs) | M5 Forwarding + M24 (filters) | 2 | Server-side filter + sort |
| 4 | Shipment Stages — Pipeline view | M5 + M24 | 2 | Drag-and-drop or click-to-advance? Q4 |
| 5 | Watchlist | M27 + M24 | 4 | Per-user vs team-shared (Q1) |
| 6 | Reminders & Holds | M27 + M5 + M4 customs | 2/3 | Auto-trigger from data feed (Q2) |
| 7 | Chat Box | M27 (in-app threads) | 4 | Per-shipment vs global (Screen 2 Q4) |
| 8 | Order Mgmt — Leads (3PL only) | M2 Sales/CRM | 4 | Leads-only view, not full RFQ |
| 9 | New Shipment (MBL/HBL) | M5 Forwarding | 2 | File# auto-gen scheme (Q1) |
| 10 | Generate Documents | M6 Doc Generation | 2 | Rated vs non-rated AN (Q1) |
| 11 | Doc Management — shipment level | M21 + M5 | 1+2 | Shipment-scoped UI on top of M21 |
| 12 | Memo Notes — internal | M27 (notes) | 4 | @mention notifications |
| 13 | Profiles & Settings | M26 + M1 | 1 | Internal vs external profiles (Q1) |
| 14 | Profile Documents | M21 + M3 vendor docs | 1+4 | POA expiry alerts |
| 15 | Permits | M1 Master Data + M11 Hazmat (commodity permits) | 1+future | Permit-to-HTS link (Q5) |

**Modules touched:** M1, M2, M3, M4, M5, M6, M11, M21, M24, M26, M27 — 11 modules across phases 1-4.

## 3. Stakeholder questions — 65 in total, tagged by module

Every question grouped by which module's LLD must answer it. Items the existing LLDs already address are marked ✅; open ones are flagged 🟡 for Shankar / US-client decision.

### M26 RBAC — 11 questions

**Screen 1 (Login):**
1. 🟡 Should MFA be enforced for all user roles, or only for admin / accounting roles?
2. 🟡 What is the OTP expiry window — 5 mins standard, or configurable per org?
3. 🟡 Do you need an SSO / SAML integration path (Google Workspace, Microsoft 365) in addition to email+password?
4. ✅ Should failed login attempts trigger account lockout — if so, after how many attempts? *(M26 LLD §9: 5 attempts → 15 min lockout — already in Keycloak realm)*
5. ✅ Is session tracking by email address sufficient, or do you also need device/IP logging per audit trail? *(M26 LLD §3.10 m26_session: ip_address + user_agent already captured)*

**Screen 13 (Profiles & Settings):**
1. 🟡 Should "Profiles" cover both internal users (staff) and external clients (shippers/cnees) in the same module, or separate modules?
2. 🟡 What roles and permission levels are needed — and should permissions be configurable per profile or fixed per role type?
3. ✅ Should login activity (email, timestamp, IP, device) be logged per user for compliance? *(M26 LLD §3.13 m26_audit covers this)*
4. ✅ Can a single company profile have multiple linked contacts (billing, operations, management) with different roles? *(M3 LLD §3.8 m3_vendor_contact and M1 Party hierarchy support this)*

**Screen 14 (Profile Documents):**
1. 🟡 Can a client upload their own POA via a self-serve portal, or only internal staff can upload? *(M21 share endpoint exists; portal UI is M3 future scope)*

**Screen 15 (Permits):**
1. 🟡 Can commodity permits be linked to specific HTS/HS codes to auto-validate against shipment cargo data?

---

### M24 Dashboards — 8 questions

**Screen 2 (Control Tower):**
1. 🟡 What KPIs are most critical for the default landing view — volume, holds, ETA, or profitability?
2. 🟡 Should the Control Tower show all company shipments by default, or filtered to the logged-in user's team?
3. 🟡 Is role-based visibility required — e.g. a broker sees only customs shipments, a trucker sees only trucking?

**Screen 3 (Shipment List):**
1. 🟡 Should multiple filters apply as AND logic or AND/OR configurable by the user?
2. 🟡 Is there a default sort order (newest first, ETA ascending)? Should it be configurable per user?
3. 🟡 Should column visibility be customisable per user / per role?
4. 🟡 Should the POFD filter be different from POD, or are they always the same port?

**Screen 5 (Watchlist):**
1. 🟡 Is the watchlist personal (per user) or team-shared — can one user see another's watchlist?

---

### M5 Freight Forwarding — 12 questions

**Screen 3 (Shipment List):**
1. 🟡 Are Supplier Product # and Internal Product # linked to a product catalogue, or free-text search? *(M5 LLD §3.2 booking line links to m1_product — answer: linked)*

**Screen 4 (Shipment Stages):**
1. 🟡 What are all the stages to be defined for Ocean Import, Ocean Export, Air Import, and Air Export — are they different or shared?
2. 🟡 Who has permission to manually advance or revert a stage — any team member or only assigned team?
3. 🟡 Should stage updates trigger automatic notifications to the shipper/cnee/client?
4. 🟡 Should a hold state block stage progression, or just flag it visually while allowing movement?

**Screen 9 (New Shipment MBL/HBL):**
1. 🟡 Should File # be system-auto-generated or manually assigned — if auto, what is the numbering scheme (SCM-YYYY-####)?
2. ✅ For Air shipments, do routing fields (vessel/voyage) change to MAWB/HAWB and flight number? *(M5 LLD §3.6 m5_awb has flight_number; §3.4 m5_mbl has voyage)*
3. ✅ Can a single MBL have multiple HBL children — should this be modelled as a parent–child relationship in the form? *(M5 LLD §3.5 m5_hbl.mbl_id FK confirms parent-child)*
4. ✅ Is there a multi-container shipment scenario (multiple Cntr #s under one MBL) — how should those be captured? *(M5 LLD §3.7 m5_container.shipment_id supports N containers per shipment)*
5. 🟡 Are Supplier Product # and Internal Product # linked to a product catalogue, or free-text entry per shipment?

**Screen 6 (Reminders / Holds):**
1. 🟡 Should holds block document generation or invoice creation until the hold is resolved?
2. 🟡 Are holds entered manually by staff, or auto-triggered from a carrier / customs data feed?

---

### M21 Doc Management — 4 questions

**Screen 11 (Doc Management — shipment level):**
1. ✅ Should there be document versioning — i.e. when a corrected B/L is uploaded, does the old one become archived? *(M21 LLD §3.3 m21_document_version supports this)*
2. ✅ Who can delete or replace a document — any user, or only managers? *(M21 LLD §3.5 m21_document_acl with permission=DELETE supports per-doc grant)*
3. 🟡 Should required documents be flagged per shipment type (e.g. AMS always required for ocean imports)?
4. ✅ Should clients (shippers/cnees) have read-only access to their shipment documents via a portal? *(M21 LLD §3.6 m21_document_share covers time-limited external share)*

---

### M27 Notifications — 14 questions

**Screen 2 (Control Tower):**
1. 🟡 Should the Chat Box be a global company-wide chat or shipment-specific threads?

**Screen 6 (Reminders / Holds):**
1. ✅ Should reminder notifications be sent via email, in-app, or both? *(M27 LLD §3.2 recipient preference supports per-channel toggle)*
2. 🟡 Should a Reminder have a completion workflow (mark as done with a note/timestamp)?

**Screen 7 (Chat Box):**
1. 🟡 Should chat messages be searchable — including historical messages per shipment?
2. 🟡 Can external parties (clients, carriers) be invited to a shipment-specific chat channel?
3. 🟡 Should file/document attachments be allowed in chat, and should they link to document management?
4. 🟡 Are read receipts / message status (sent/read) required?

**Screen 12 (Memo Notes):**
1. 🟡 Should memo notes be editable or delete-able after posting, or immutable once saved (audit trail)?
2. 🟡 Should users be able to @mention teammates in a note to trigger a notification?
3. 🟡 Is there a need for note categories / tags beyond the basic list (Customs, Finance, etc.)?

**Screen 5 (Watchlist):**
1. 🟡 Should watchlisted shipments auto-remove when they reach a certain stage (e.g. Delivered)?
2. 🟡 Should there be a priority/urgency level (High / Medium / Low) on watchlist items?

---

### M2 Sales/CRM — 4 questions

**Screen 8 (Order Mgmt — Leads):**
1. 🟡 Should a Lead flow into a formal RFQ workflow (Milestone 2), or is this a standalone pre-RFQ capture?
2. 🟡 When the lead becomes a client, should the Lead record link to their Vendor Profile automatically? *(M2 LLD §2.1 m2_lead.converted_party_id supports this)*
3. ✅ Is there a sales pipeline view needed (e.g. New → Contacted → Quoted → Won/Lost)? *(M2 LLD §2.1 m2_lead.stage enum covers New / Contacted / Qualified / Disqualified / Converted)*
4. 🟡 Can a single lead include multiple services (e.g. freight + brokerage + warehousing together)?

---

### M6 Doc Generation — 5 questions

**Screen 10 (Generate Documents):**
1. 🟡 For rated vs non-rated Arrival Notice — what data fields change between the two versions?
2. ✅ Can stamps / signatures be pre-configured per user or per company, or uploaded per generation? *(M6 LLD §3.5 m6_template_asset supports stamps + signatures per template)*
3. ✅ Should document generation be restricted by role (e.g. only senior staff can generate invoices)? *(RBAC permission `m6.generate.{template-code}` per M26)*
4. 🟡 Can documents be bulk-generated for multiple shipments at once, or always one at a time?
5. 🟡 Are all documents PDF output, or should some be editable (Word format) before finalisation? *(M6 LLD §3.1 template_type ENUM('PDF','HTML','DOCX','TEXT') already supports DOCX)*

---

### M1 Master Data + M3 Vendor + M11 Hazmat — 7 questions

**Screen 14 (Profile Documents — POA):**
1. 🟡 How many days before expiry should the system alert the team — 30, 60, 90 days?
2. 🟡 Should an expired POA block the creation of new customs entries for that client?
3. 🟡 Is "Incomplete" status for a POA manually set by staff, or auto-detected from the document contents?

**Screen 15 (Permits):**
1. 🟡 What is the full list of permit types expected — Customs Bond, FDA, USDA, FCC, DEA, others?
2. 🟡 Should the system flag shipments where a required commodity permit is missing or expired at time of entry?
3. 🟡 What is the expiry alert threshold — same 30/60/90 day rule as POA, or different per permit type?
4. 🟡 Should Customs Bond renewal trigger an automated task / reminder assigned to the compliance team?

---

## 4. Net new requirements surfaced by the wireframes (NOT in existing LLDs)

| Requirement | Module impacted | Action |
|---|---|---|
| **Watchlist** as a first-class concept | M24 + M27 | Add `m24_watchlist` table and per-user UI; add to M24 LLD v1.1 amendment |
| **Reminders & Holds** as a first-class concept | M5 + M27 | Add `m5_hold` + `m27_reminder` tables (covered by M27 in-app inbox + future m5 hold mechanism) |
| **Memo Notes** with @mentions | M27 | Add `m27_memo_note` + `m27_mention` tables to M27 LLD v1.1 amendment |
| **Permits** with HTS/HS code linkage | M1 | Extend M1 with `m1_permit` + `m1_permit_hs_link` tables — M1 LLD amendment v2.1 needed |
| **POA expiry tracking** | M3 + M21 | M3 LLD §3.4 `m3_agreement` covers POA-as-agreement; expiry alerts via M27 reminders |
| **3PL Lead module** with multi-service tagging | M2 | M2 LLD §2.2 `m2_opportunity` already supports multiple services via opportunity-line linking — confirmed |
| **Per-user / per-role column visibility** in tables | M24 + M26 | Add `m26_user_view_preference` (1 table) to M26 LLD v1.1 amendment |
| **Stage definitions** per Ocean/Air × Import/Export | M5 | Add `m5_stage_definition` (1 table) to M5 LLD v1.1 amendment |

These are **proposed amendments to existing LLDs**, not new LLDs. Subject to Shankar's lock review when amending.

## 5. Interaction patterns to capture in implementation

### Login flow (Screen 1)
- Email/password → JWT issued from Keycloak
- 6-digit OTP from email (5-min expiry — Q2)
- "Remember this device" optional cookie
- Session tracked by email + device + IP per `m26_session`

### Control Tower flow (Screen 2)
- Single dashboard home; KPI tiles use locked SCMCube design v1.6 (8-tone palette, dark-navy hero border)
- Module access tiles below KPIs route to module landing pages
- Chat box widget links to Screen 7

### Shipment list (Screen 3) — three tabs: All / Ocean / Air
- Server-paginated table; default sort: newest first
- Filter row: File# / MBL / HBL / Cntr / POL / POD / status / shipper / cnee
- Column visibility per-user (new requirement → M26 amendment)

### Pipeline (Screen 4)
- Kanban-style stages per mode × direction
- Drag-and-drop to advance? Q4-2 (permission Q)
- Hold flag visible on cards

## 6. What we will NOT change in our existing design

- **Brand colors:** SCMCube v1.6 stays (purple primary, mild coral accent, dark navy hero border). Wireframes' navy/teal/gold palette is layout-spec only.
- **Sidebar IA:** Our 8-group taxonomy stays. Wireframes show one specific tenant's flat top-nav — we use grouped sidebar.
- **Module boundaries:** Wireframes don't override module ownership defined in HLD §9.

## 7. Implementation traceability

When implementing each screen, the developer references:
1. The wireframe screen number (Screen 1-15)
2. The corresponding LLD(s) for backend + table shapes
3. The locked design system patterns (`docs/design/SCMCube-DesignSystem.md` v1.6)
4. The 8-group navigation IA (`docs/design/SCMCube-NavigationIA-v1.md`)

The wireframe HTML is committed at `docs/wireframes/SooHoo_USClient_Milestone1_Wireframes.html` for reference.

## 8. Sign-off

Drafted by Claude (May 2026) from the wireframe HTML + cross-referenced with sealed `ulpReq/` LLDs and derived `docs/lld/` LLDs. Awaiting Shankar review.

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-02 | Initial mapping. 15 screens × 11 ULP modules. 65 stakeholder questions tagged. 8 net-new requirements identified for LLD amendments. |
