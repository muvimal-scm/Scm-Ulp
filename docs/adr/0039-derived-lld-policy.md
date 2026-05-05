# ADR 0039 — Derived LLD policy for modules without an `ulpReq/` LLD

**Status:** Accepted (locked)
**Date:** 2026-05-02
**Decider:** Shankar
**Related:** ADR 0036 (infra), ADR 0037 (brand), ADR 0038 (.NET skeleton)

## Context

The sealed `ulpReq/` v2.0 package contains LLDs for **11 modules**: M1, M4 (IN+US), M8, M13, M17 (IN+US), M18-US, M19-US, M20-US, M24. The other **16 modules** (M2, M3, M5, M6, M7, M14, M15, M16, M21, M22, M23, M26, M27, M28 + sub-variants) are referenced in the HLD and DBD but have no detailed LLD.

When we tried to start Phase 1 module work after M1, we hit a wall: the next four planned modules (M21 Doc Mgmt, M26 RBAC, M27 Notifications, M3 Vendor Mgmt) — all critical foundation modules — have no LLD. Implementing without an LLD breaks our locked rule "strictly follow design documents."

## Decision

**Derived LLDs** are produced for modules without an `ulpReq/` LLD, strictly anchored to authoritative sources, stored in `docs/lld/`, and treated as authoritative once Shankar locks them.

### Authoritative source order (a derived LLD MUST cite + obey):

1. `ulpReq/ULP_HLD_v2.0_MultiRegion.docx` — module catalog (§9), responsibilities, multi-region rules
2. `ulpReq/ULP_DBD_v2.0_DatabaseDesign.docx` — table counts (§4), schema conventions, indexing, country_code rules
3. `ulpReq/ULP_SecurityComplianceArchitecture_v2.0.docx` — encryption, RBAC, PII, audit, MFA
4. `ulpReq/ULP_APISpecification_v2.0.docx` — REST + Idempotency-Key + error model
5. `ulpReq/ULP_ObservabilitySRE_v2.0.docx` — Serilog mandatory fields, SLOs
6. `ulpReq/ULP_NonFunctionalRequirements_v2.0.docx` — performance/availability targets
7. `ulpReq/ULP_VendorIntegrationCatalog_v2.0.docx` — third-party vendors per category
8. Existing LLDs (M1 …) — for cross-module references
9. `.claude/skills/` bundle — pattern catalogue

### Lifecycle (per `docs/lld/README.md`):

| Stage | Description |
|---|---|
| **Drafted** | Claude produces from authoritative sources. NOT yet implemented. |
| **Locked** | Shankar approves. Implementation must follow strictly, same way `ulpReq/` LLDs are followed. |
| **Amended** | Explicit edit + version bump (v1.0 → v1.1) with changelog entry. |
| **Superseded** | Replaced by new version; old retained for audit. |

### What's been drafted (Phase 1)

- `docs/lld/M21_DocManagement_v1.0.md` — 14 tables matching DBD §4
- `docs/lld/M26_RBAC_v1.0.md` — 13 tables matching DBD §4
- `docs/lld/M27_Notifications_v1.0.md` — 9 tables matching DBD §4
- `docs/lld/M3_VendorManagement_v1.0.md` — 9 tables matching DBD §4

Every table count matches DBD §4 exactly. Every column type and convention follows `ULP_DBD_v2.0_Schema.sql` precedent.

## Consequences

### Better
- Phase 1 + Phase 2 unblocked — no waiting on Shankar to author LLDs from scratch.
- LLDs are real documents in git; future sessions inherit them and follow strictly.
- Cross-references between modules work (M21 references M26 user/role, M3 references M1.Party).
- Verifiable: every claim in a derived LLD points back to a sealed-package source.

### Worse
- Two LLD homes (`ulpReq/` for v2.0 sealed, `docs/lld/` for derived). Authors must remember both.
- Risk of drift if a new sealed-package version conflicts with a derived LLD — mitigated by the source-precedence rule above.

### Now possible
- M21, M26, M27, M3 implementations begin against locked specs.
- Future modules (M2, M5, M6, M7, M14, M15, M16, M22, M23, M28) follow the same pattern when their phase arrives.

### Now harder
- Updating a derived LLD requires the same discipline as updating a sealed one — version bump, changelog, no silent edits.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Wait for Shankar to author each LLD before implementation | Days of blocking; Shankar's instruction was to proceed |
| Implement freely without LLDs | Breaks the locked "strictly follow design docs" rule |
| Use HLD-only as the spec | HLD describes responsibilities, not table shapes — insufficient for DB work |
| Fork the `ulpReq/` package | Pollutes the sealed v2.0 deliverable |

## Verification

Each derived LLD passes only if:
1. Table count matches DBD §4 exactly
2. Every authoritative source it cites at the top is actually consulted (claims in the LLD trace back)
3. No invention beyond what HLD/DBD/skills imply
4. Cross-module references use existing module's column names verbatim
5. Shankar marks it Locked
