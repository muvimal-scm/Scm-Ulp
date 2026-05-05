# Derived LLDs

This folder contains Low-Level Design documents for ULP modules that **don't have an LLD in the sealed `ulpReq/` package**. Each LLD here is derived strictly from authoritative sources and is treated as authoritative once locked.

## What's authoritative

These derived LLDs are anchored to (in order of precedence):

1. **`ulpReq/ULP_HLD_v2.0_MultiRegion.docx`** — module catalog (§9), responsibilities, multi-region architecture
2. **`ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx`** — table-count expectations (§4), schema conventions, indexing strategy, country_code rules
3. **`ulpReq/ULP_SecurityComplianceArchitecture_v2.0.docx`** — encryption, RBAC, PII handling, audit, MFA
4. **`ulpReq/ULP_APISpecification_v2.0.docx`** — REST/JSON conventions, versioning, idempotency, error model
5. **`ulpReq/ULP_ObservabilitySRE_v2.0.docx`** — Serilog schema, correlation IDs, metric/SLO conventions
6. **`ulpReq/ULP_NonFunctionalRequirements_v2.0.docx`** — performance, availability, scalability targets
7. **`.claude/skills/`** — pattern catalogue for the relevant area (Keycloak, MinIO, MailHog, MassTransit, Hangfire, Polly, QuestPDF/Scriban, Document extraction, etc.)

When any of those sources contradict a derived LLD, the **source wins** and the LLD is amended.

## Index

### Phase 1 — Foundation (must complete before Phase 2)

| LLD | Module | Tables | Status |
|---|---|---|---|
| [M3_VendorManagement_v1.0.md](M3_VendorManagement_v1.0.md) | Vendor Management | 9 | Drafted |
| [M21_DocManagement_v1.0.md](M21_DocManagement_v1.0.md) | Document Management | 14 | Drafted |
| [M26_RBAC_v1.0.md](M26_RBAC_v1.0.md) | RBAC + Tenant Mgmt | 13 | Drafted |
| [M27_Notifications_v1.0.md](M27_Notifications_v1.0.md) | Notifications | 9 | Drafted |

### Phase 2 — Operations Core

| LLD | Module | Tables | Status |
|---|---|---|---|
| [M5_FreightForwarding_v1.0.md](M5_FreightForwarding_v1.0.md) | Freight Forwarding | 17 | Drafted |
| [M6_DocGeneration_v1.0.md](M6_DocGeneration_v1.0.md) | Doc Generation | 8 | Drafted |
| [M14_Pricing_v1.0.md](M14_Pricing_v1.0.md) | Pricing & Quotation | 15 | Drafted |

### Phase 3 — Compliance Plugins

| LLD | Module | Tables | Status |
|---|---|---|---|
| [M15_TradePrograms_v1.0.md](M15_TradePrograms_v1.0.md) | DGFT (IN) + Trade Programs (US) | 12 IN + 4 US | Drafted |

### Phase 4 — Visibility / AI / Polish

| LLD | Module | Tables | Status |
|---|---|---|---|
| [M2_SalesCRM_v1.0.md](M2_SalesCRM_v1.0.md) | Sales / CRM | 12 | Drafted |
| [M7_Procurement_v1.0.md](M7_Procurement_v1.0.md) | Procurement | 11 | Drafted |
| [M9_LastMile_v1.0.md](M9_LastMile_v1.0.md) | Last-Mile Delivery | 14 | Drafted |
| [M12_FreightAudit_v1.0.md](M12_FreightAudit_v1.0.md) | Freight Audit & Payment | 11 | Drafted |
| [M16_Settlement_v1.0.md](M16_Settlement_v1.0.md) | Settlement | 9 | Drafted |
| [M22_Quality_v1.0.md](M22_Quality_v1.0.md) | Quality Management | 8 | Drafted |
| [M23_HRPayroll_v1.0.md](M23_HRPayroll_v1.0.md) | HR & Payroll | 21 | Drafted |
| [M28_AIServices_v1.0.md](M28_AIServices_v1.0.md) | AI Services | 7 | Drafted |

### Future / Optional

| LLD | Module | Tables | Status |
|---|---|---|---|
| [M10_ColdChain_v1.0.md](M10_ColdChain_v1.0.md) | Cold Chain | 6 | Drafted |
| [M11_Hazmat_v1.0.md](M11_Hazmat_v1.0.md) | Hazmat | 8 | Drafted |

**18 derived LLDs total.** Every table count validated against `ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx §4`. No invention.

### Cross-cutting traceability

| Doc | Purpose | Status |
|---|---|---|
| [MS1_USClient_Wireframe_Traceability_v1.0.md](MS1_USClient_Wireframe_Traceability_v1.0.md) | Maps SooHoo's 15 wireframe screens (US client Milestone 1) to ULP modules. Captures all 65 stakeholder questions tagged by module. Identifies 8 net-new requirements requiring LLD amendments. | Drafted |

Source wireframe: `docs/wireframes/SooHoo_USClient_Milestone1_Wireframes.html`

## Lifecycle

1. **Drafted** — produced by Claude from authoritative sources. Awaiting Shankar's review.
2. **Locked** — Shankar approves; future implementation must follow it strictly.
3. **Amended** — explicit edit + version bump (v1.0 → v1.1) with changelog entry.
4. **Superseded** — replaced by a new version; old version retained for audit.

A drafted LLD is **not implemented** until Shankar marks it Locked. Once locked, the SCSS/SQL/code in this repo follows it the same way the M1 LLD was followed.

## Skills bundle additions

Two new skills added in this session to support the LLDs:

- **`.claude/skills/questpdf-scriban-rendering/`** — for M6 Doc Generation rendering pipeline
- **`.claude/skills/document-extraction-ocr/`** — for M21 / M28 OCR + structured extraction

All other skills referenced by the LLDs (Keycloak, MinIO, MailHog, MassTransit, Hangfire, Polly, EF Core / Pomelo, FastAPI / LangGraph, Qdrant, Serilog) already existed in the bundle.

## Modules with `ulpReq/` LLDs (do NOT redraft)

These have detailed LLDs in the sealed package; do not re-derive:

- M1 Master Data
- M4 CHA (IN core) + M4-US CBP/ABI
- M8 WMS
- M13 Transportation (core, IN, US)
- M17 Accounts (core, IN) + M17-US GAAP
- M18-US Sales Tax Returns
- M19-US Banking
- M20-US HR/Payroll
- M24 Dashboards
