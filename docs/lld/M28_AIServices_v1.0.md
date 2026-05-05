# ULP M28: AI Services LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** 4

**Sources:** HLD §9.1 + §11 (FastAPI + LangGraph) · DBD §4 — **M28 = 7 tables, +country_code on extracted entities** · M21 (consumer of doc images), M1 (HSN/HTS suggestion target) · `.claude/skills/fastapi-langgraph-agents/SKILL.md` · `.claude/skills/qdrant-vector-db/SKILL.md`

## 1. Purpose
AI-augmented workflows:
- Document extraction (BOE / 7501 / invoices / BLs / packing lists)
- HS / HTS / HSN code classification suggestions
- RAG-based compliance Q&A (regulatory documents per country)
- Conversational agents for Control Tower
- Smart-suggestion APIs (account coding, vendor matching, lane recommendation)

The compute lives in a **separate Python service** (FastAPI + LangGraph). MySQL stores metadata/results; Qdrant stores vector embeddings. M28 itself is not C# — it's the Python `ulp-ai` service in `src/ai/ulp-ai/`. Tables here are written by the Python service via direct DB connection.

## 2. Database — 7 tables (matches DBD §4)
```sql
CREATE TABLE m28_extraction_job    (id, tenant_id, country_code CHAR(2), document_id BIGINT, doc_type ENUM('INVOICE','BOE','BL','7501','PACKING_LIST','OTHER'), status ENUM('Queued','Processing','Completed','Failed'), submitted_at_utc, completed_at_utc, error_message);
CREATE TABLE m28_extracted_entity  (id, extraction_job_id, country_code CHAR(2), entity_type, field_name, field_value TEXT, confidence DECIMAL(5,4), source_page, bbox_json, reviewed_by, reviewed_at_utc);
CREATE TABLE m28_classification_suggestion (id, tenant_id, country_code CHAR(2), product_id BIGINT, system ENUM('HS','HSN','HTSUS','SCHEDULE_B'), suggested_code VARCHAR(15), confidence DECIMAL(5,4), reasoning TEXT, accepted TINYINT, accepted_by, accepted_at_utc);
CREATE TABLE m28_rag_corpus        (id, tenant_id, country_code CHAR(2), corpus_name, description, doc_count, last_indexed_at_utc); -- e.g. "India GST Notifications", "US CBP Rulings"
CREATE TABLE m28_rag_query         (id, tenant_id, user_id, corpus_id, query_text, response_text, sources_json, latency_ms, created_at_utc);
CREATE TABLE m28_agent_session     (id, tenant_id, user_id, session_token, agent_type ENUM('CONTROL_TOWER','HS_HELPER','COMPLIANCE_QA','SMART_CODER'), started_at_utc, ended_at_utc, message_count, total_tokens);
CREATE TABLE m28_agent_message     (id, agent_session_id, role ENUM('USER','ASSISTANT','SYSTEM','TOOL'), content TEXT, token_count, model VARCHAR(100), occurred_at_utc);
```

**Total: 7 tables** ✅ matches DBD §4.

## 3. Architecture
- Python service `src/ai/ulp-ai/` — FastAPI app with LangGraph workflows
- Qdrant cluster (region-pinned) for embeddings
- Anthropic Claude / Azure OpenAI as the LLM (Phase 4)
- Communicates with .NET API via REST + MassTransit events for async jobs
- Per `serilog-logging` skill: even Python logs follow the v2.0 mandatory schema (tenantId, countryCode, region, traceId, sessionId)

## 4. Sign-off
| 1.0 | 2026-05-XX | Initial draft. 7 tables. |
