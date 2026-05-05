---
name: document-extraction-ocr
description: ULP document OCR + structured extraction — Azure Document Intelligence (prod) and Tesseract via Python service (dev). Use when implementing M21 ingestion ocr_enabled flow, M28 doc-extraction agents, HSN/HTS auto-suggestion, or any flow that needs to read fields out of customer-uploaded PDFs (invoices, BOE, 7501, BLs). Always emit results into m21_extracted_field with confidence scores; never overwrite human-reviewed fields.
---

# Document Extraction & OCR for ULP

## When this skill triggers
Implementing M21's `auto_ocr=1` ingestion path; M28's extraction agents; HSN/HTSUS suggestion engine; bulk-import flows that need to read fields out of scanned/PDF docs.

## Top 3 reference repos
1. **Azure-Samples/azure-search-openai-demo** — production-grade reference for Azure Document Intelligence + Cognitive Search RAG. Read `app/backend/approaches/`.
2. **microsoft/Form-Recognizer-Toolkit** — DI client wrappers, prebuilt-invoice and prebuilt-bl model usage.
3. **tesseract-ocr/tesseract** — open-source OCR for the dev/MVP path.

## ULP-specific patterns

### Two-tier strategy
| Tier | Stack | Use when |
|---|---|---|
| **Production** | Azure AI Document Intelligence (prebuilt-invoice, prebuilt-bl, custom models per country) | All paying tenants |
| **Dev / MVP** | Tesseract via Python `ulp-ai` service | Local developer machines, CI integration tests |

Selection per tenant via `m27_provider_config`-style entry or env flag. Code only sees `IDocumentExtractor` abstraction.

### `IDocumentExtractor` abstraction
```csharp
public interface IDocumentExtractor
{
    Task<ExtractionResult> ExtractAsync(ExtractionRequest req, CancellationToken ct);
}

public sealed record ExtractionRequest(
    long TenantId,
    string DocumentUlid,
    string ContentType,            // application/pdf, image/jpeg, image/png
    Stream Content,
    DocumentClass Hint);           // INVOICE | BOE | BL | 7501 | OTHER

public sealed record ExtractionResult(
    IReadOnlyList<ExtractedField> Fields,
    string Provider,               // "Azure DI" | "Tesseract"
    int DurationMs,
    decimal OverallConfidence);

public sealed record ExtractedField(
    string Name,                   // "invoice_number","vendor_gstin","total_amount"
    string? Value,
    decimal Confidence,            // 0.0 - 1.0
    int? PageNumber,
    BoundingBox? Bbox);
```

### Where extraction results land
Per the M21 LLD, results write to `m21_extracted_field`:
- one row per field
- `source = 'OCR'` for raw OCR, `'AI'` for LLM-augmented, `'HUMAN'` for manual review override
- `confidence` 0.0000–1.0000
- `bbox_json` for highlight in viewer
- HUMAN-reviewed rows: do NOT overwrite on re-extraction; raise event instead

### Flow (M21 + M28 together)
1. User uploads doc → M21 stores blob + creates `m21_document` row
2. If `m21_document_class.ocr_enabled = 1` → emit `DocumentUploaded` event
3. M28 Python worker subscribes → downloads blob via M21 pre-signed URL
4. Calls `IDocumentExtractor.ExtractAsync` → fields back
5. Inserts/updates `m21_extracted_field` rows; `source='OCR'` or `'AI'`
6. If `m21_document_class.ai_classify = 1` → also runs HS/HSN/HTS suggestion → inserts `m28_classification_suggestion`

### Country-specific document types
Per M21 LLD §10 seeded classes — Indian uploads go through Indian-trained custom models (BOE, GSTR-1, EWB), US uploads go through US-trained custom models (7501, ATM, ITN). Routing by `m21_document.country_code` + class.

### Confidence thresholds
- **≥ 0.90** → auto-accept; populate downstream fields directly
- **0.70–0.90** → flag for review; prefill but require user confirm
- **< 0.70** → leave the source field blank; surface low-confidence warning

These thresholds are tenant-configurable later; v1.0 hardcoded.

## Critical gotchas

### Never store PII unencrypted in extracted_field
GSTIN, PAN, EIN, SSN — always run through PII redaction (per Security doc §7) before logging. The DB column itself stays plaintext (it's encrypted at rest via Azure Key Vault CMK), but logs strip it.

### Tesseract is not production-ready for invoices
Use it only for dev / smoke. Real invoices need Azure DI's prebuilt-invoice model — Tesseract can't handle multi-column layouts reliably.

### Per-page splitting
Multi-page PDFs: extract per page, merge results with page_number. Don't OCR a whole 50-page packing list as one image — DI bills per page anyway.

### Re-extraction policy
On re-upload (new doc version):
- Re-run extraction ONLY if extractor version or model version changed
- Never re-run if a field has `source='HUMAN'` and `reviewed_at_utc` is recent (last 30 days)

### Cost tracking
Per `m27_send_attempt.cost_micros` pattern, M28 extraction jobs should record provider cost in `m28_extraction_job` (add `cost_micros` + `cost_currency` columns when extending the v1.0 schema). FinOps depends on this.

## See also
- `fastapi-langgraph-agents` — Python service hosting the extractor
- `qdrant-vector-db` — RAG corpus storage for compliance Q&A
- `minio-blob-storage` — pre-signed URL retrieval for source docs
- `docs/lld/M21_DocManagement_v1.0.md` — `m21_extracted_field` schema
- `docs/lld/M28_AIServices_v1.0.md` — extraction job tables
