# ULP Claude Code Skills Bundle v2.0

A curated collection of **42 Claude Code skills** for the **Unified Logistics Platform (ULP)** — multi-region SaaS supporting both Indian (IN) and US tenants on a single codebase using the Compliance Plugin Pattern.

**Built:** v1.0 May 2026 (32 skills, India-only) → **v2.0 May 2026 (42 skills, multi-region)**
**Project:** Unified Logistics Platform (ULP) — 27 modules (15 Tier-A country-agnostic + 8 Tier-B with plugins + 4+ Tier-C country-specific)
**Tech stack:** .NET 8 + Angular 17 + MySQL 8 + KMP mobile + Electron 28 desktop + NodaTime + Luxon + Money type + Azure (Central India + South India DR for IN; East US 2 + West US 2 DR for US)

---

## What changed from v1.0 → v2.0

| Change | Detail |
|---|---|
| **New cross-cutting skills (4)** | `compliance-plugin-pattern`, `multi-region-tenant-context`, `money-type-multicurrency`, `nodatime-luxon-timezone` — these encode the heart of the multi-region rework |
| **New US business skills (6)** | `us-customs-cbp-abi`, `us-sales-tax-avalara`, `us-banking-ach-plaid`, `us-payroll-fica-w2-941`, `us-accounts-gaap-1099`, `us-transportation-eld-hos-ifta` — parallel to the existing IN business skills |
| **Updated existing skills (3)** | `xunit-testing` (added region-aware `[Theory]` + plugin contract test pattern), `serilog-logging` (added v2.0 mandatory schema with region/countryCode), `efcore-mysql-pomelo` (added country_code, Money columns, IANA tz, region-pinned conn string resolution) |
| **Indian skills retained verbatim** | All 8 India-specific business skills (`gst-irn-einvoice`, `eway-bill`, `indian-customs-icegate`, `scmtr-cargo-manifest`, `dgft-schemes`, `indian-accounts-period-close`, `transportation-pod-gps`, `wms-grn-putaway`) are unchanged — Indian client continuity preserved |

---

## What's in this bundle (42 skills)

### Cross-cutting v2.0 patterns (4 — NEW)
| Skill | Purpose |
|---|---|
| `compliance-plugin-pattern` | The 7 plugin interfaces (IComplianceProvider, ITaxProvider, ICustomsProvider, IBankingProvider, IPayrollProvider, IIdentifierValidator, IStateTaxProvider) and tenant-scoped DI resolution |
| `multi-region-tenant-context` | `ITenantContext`, country_code as the source of truth, region pinning, HTTP 421 routing, plugin DI resolution |
| `money-type-multicurrency` | `Money(amount, currency)` strongly-typed money replacing bare `decimal`, EF Core `ComplexProperty` mapping, JSON serialisation, FX rules |
| `nodatime-luxon-timezone` | `IClock` injection, `Instant`/`ZonedDateTime`/`LocalDate` selection, IANA tz IDs end-to-end, Luxon on the client |

### Backend .NET stack (8)
| Skill | Purpose |
|---|---|
| `efcore-mysql-pomelo` | EF Core 8 + Pomelo + v2.0 schema conventions (country_code, Money, IANA tz, region pinning) |
| `aspnet-minimal-api` | ASP.NET Core 8 Minimal API, endpoint groups, idempotency |
| `masstransit-broker` | MassTransit broker abstraction (RabbitMQ MVP → Service Bus prod) |
| `hangfire-jobs` | Hangfire recurring/scheduled jobs |
| `polly-resilience` | Polly v8 resilience pipelines for external integrations |
| `serilog-logging` | Structured logging + v2.0 mandatory schema (region, countryCode, traceId etc.) |
| `xunit-testing` | xUnit + region-aware `[Theory]` + plugin contract test pattern |
| `automapper-fluentvalidation` | Mapping + validation patterns |

### Frontend / mobile (6)
| Skill | Purpose |
|---|---|
| `angular-17-signals` | Angular 17 signals state management |
| `angular-material-17` | Material Design 3 components |
| `chartjs-apexcharts` | Charting libraries |
| `leaflet-openstreetmap` | Maps with OpenStreetMap tiles |
| `electron-desktop` | Electron 28 desktop wrapper |
| `kotlin-multiplatform-mobile` | KMP mobile (iOS + Android shared) |

### Infrastructure (5)
| Skill | Purpose |
|---|---|
| `docker-compose-mvp` | Local MVP compose stack (MySQL, Redis, RabbitMQ, MinIO, MailHog, Keycloak, Qdrant) |
| `terraform-azure` | Azure IaC for region-pinned deployment |
| `github-actions-cicd` | CI/CD pipeline with region-aware deployment + Blue/Green |
| `keycloak-mvp-identity` | Per-tenant Keycloak realms, JWT issuance |
| `qdrant-vector-db` | Vector DB for AI/semantic-search features |

### Storage / messaging / ops (4)
| Skill | Purpose |
|---|---|
| `redis-caching` | Redis caching patterns (per-region, tenant-prefixed keys) |
| `minio-blob-storage` | MinIO/S3-compatible blob storage (per-tenant prefixes) |
| `mailhog-acs-email` | MailHog (MVP) + Azure Communication Services (prod) |
| `observability-stack` | Logs + metrics + traces; SLOs and burn-rate alerts |

### Indian business modules (8 — UNCHANGED, preserved verbatim from v1.0)
| Skill | Purpose |
|---|---|
| `gst-irn-einvoice` | GST e-invoicing (IRN) via GSP |
| `eway-bill` | e-Way Bill generation + cancellation |
| `indian-customs-icegate` | India customs filings (ICEGATE) |
| `scmtr-cargo-manifest` | SCMTR cargo manifest filing |
| `dgft-schemes` | DGFT export-incentive schemes |
| `indian-accounts-period-close` | India period close (Schedule III, GST 3B, TDS, Form 16A) |
| `transportation-pod-gps` | India transport (PUC, FC, RC, GPS-VTS, POD) |
| `wms-grn-putaway` | Warehouse receiving + putaway |

### US business modules (6 — NEW)
| Skill | Purpose |
|---|---|
| `us-customs-cbp-abi` | US customs (CBP ABI Type 01 entry, AES, ISF 10+2, PGA disclaim) |
| `us-sales-tax-avalara` | US sales tax via Avalara AvaTax + multi-state nexus + return filing |
| `us-banking-ach-plaid` | NACHA ACH origination + Plaid + BAI2 + OFAC + returns handling |
| `us-payroll-fica-w2-941` | US payroll (W-4, FICA, FUTA, SUTA, 941, 940, W-2, 1095-C, ACA) |
| `us-accounts-gaap-1099` | US GAAP (ASC 606, ASC 842) + 1099-NEC/MISC/K + W-9 + period close |
| `us-transportation-eld-hos-ifta` | US fleet (ELD integration, FMCSA HOS, IFTA, DOT, CSA scoring) |

### AI / agent (1)
| Skill | Purpose |
|---|---|
| `fastapi-langgraph-agents` | FastAPI + LangGraph multi-agent patterns (for AI features) |

---

## Installation

Run `bash install.sh` from the bundle root. This copies `.claude/skills/` into your project directory. Claude Code will auto-discover all skills.

For manual installation:
```bash
unzip ULP_ClaudeCodeSkills_v2.0.zip -d /path/to/your/project
```

---

## Skill structure

Each skill is a single `SKILL.md` file with this format:

```yaml
---
name: skill-name
description: When this skill triggers + what it covers (used for Claude's auto-discovery)
---

# Skill Title

## When this skill triggers
[Plain-English description]

## Top 3 reference repos
[Authoritative external references]

## ULP-specific patterns
[Code samples, gotchas, conventions]

## DO and DON'T
[Review-time gates]

## See also
[Related ULP skills]
```

---

## Indian client continuity

The v2.0 bundle is fully backwards-compatible with v1.0 usage:
- Every India-specific skill is unchanged.
- Three updated skills (`xunit-testing`, `serilog-logging`, `efcore-mysql-pomelo`) gain v2.0 ADDENDUM sections; the original v1.0 content is preserved above them.
- Indian client engagements continue to operate using the same patterns; the only change is that country_code is now an explicit field on tenant records (defaulting to `IN` for legacy tenants — backfilled non-disruptively per Migration Runbook v2.0 §Phase 4).

---

## Reference documents

These skills are companion to the ULP design documentation:

- `ULP_Rework_FinalIndex_v2.1.docx` — master navigation for all 38 design docs
- `ULP_HLD_v2.0_MultiRegion.docx` — high-level design
- `ULP_TestingStrategy_v2.0.docx` — informs `xunit-testing`
- `ULP_ObservabilitySRE_v2.0.docx` — informs `serilog-logging` + `observability-stack`
- `ULP_DBD_v2.0_DatabaseDesign.docx` — informs `efcore-mysql-pomelo`
- `ULP_APISpecification_v2.0.docx` — informs API patterns across skills
- `ULP_VendorIntegrationCatalog_v2.0.docx` — vendor-specific reference (Avalara, Plaid, etc.)
- Module LLDs (M1, M4, M8, M13, M17, M24 v2.0; M4-US, M17-US, M18-US, M19-US, M20-US v1.0) — module-specific reference

---

## Versioning

| Version | Date | Change |
|---|---|---|
| v1.0 | May 2026 | Initial bundle (32 skills, India-only) |
| v2.0 | May 2026 | Multi-region rework: +10 new skills, +3 v2.0 ADDENDA on existing skills, IN-skills preserved verbatim |

---

## Sign-off

- **Owner:** Tech Lead + Engineering Manager
- **Review cadence:** Per minor release; full audit annually
- **Adding a new skill:** PR to this bundle with the new `SKILL.md` + `README.md` table update + sign-off from Tech Lead
