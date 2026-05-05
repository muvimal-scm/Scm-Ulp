---
name: questpdf-scriban-rendering
description: ULP M6 Doc Generation rendering stack — QuestPDF for PDFs and Scriban for text/HTML templating. Use when implementing document templates (BL, AWB, manifest, invoice, packing list, quote, COO), template versioning, or async render jobs. Tenant-customisable templates render to bytes and store via IStorageProvider. Always use IDocumentRenderer abstraction; never call QuestPDF/Scriban directly from module code.
---

# QuestPDF + Scriban for ULP Document Generation

## When this skill triggers
Working on M6 Doc Generation: implementing the rendering pipeline, adding new template types, debugging template variable bindings, sizing PDFs, embedding images / signatures / watermarks, or wiring template assets. Also relevant when an upstream module (M5 BL, M17 invoice, M4 BOE PDF) needs to emit a document — they request via M6's API, never render directly.

## Top 3 reference repos
1. **QuestPDF/QuestPDF** (https://github.com/QuestPDF/QuestPDF) — Official. Modern fluent C# API for PDF generation. Read `docs/api-reference/` and `examples/Reports`.
2. **scriban/scriban** (https://github.com/scriban/scriban) — Template engine. Read `doc/runtime.md` for context bindings; `doc/builtins.md` for filters.
3. **dotnet/runtime** — `System.IO.Pipelines` for streaming large PDFs to MinIO without buffering.

## ULP-specific patterns

### `IDocumentRenderer` abstraction (mandatory)
```csharp
public interface IDocumentRenderer
{
    Task<RenderResult> RenderAsync(RenderRequest req, CancellationToken ct);
}

public sealed record RenderRequest(
    long TenantId,
    long TemplateId,
    int TemplateVersion,
    OutputFormat Format,             // PDF | HTML | DOCX | TEXT
    object Payload,                  // template variables
    IReadOnlyList<TemplateAsset> Assets);

public sealed record RenderResult(
    byte[] Bytes,
    string ContentType,
    long SizeBytes,
    string ChecksumSha256,
    int DurationMs);

public enum OutputFormat { Pdf, Html, Docx, Text }
```

Module code only sees `IDocumentRenderer`. M6's concrete implementation picks Scriban or QuestPDF based on the template's `rendering_engine`.

### QuestPDF setup (ULP standard)
```csharp
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

QuestPDF.Settings.License = LicenseType.Community;        // Free for revenue < $1M; switch when needed

public byte[] RenderInvoice(InvoiceModel model)
{
    return Document.Create(c =>
    {
        c.Page(p =>
        {
            p.Size(PageSizes.A4);
            p.Margin(2, Unit.Centimetre);
            p.PageColor(Colors.White);
            p.DefaultTextStyle(t => t.FontFamily("Inter").FontSize(10));

            p.Header().Element(h => Header(h, model));
            p.Content().Element(c => Content(c, model));
            p.Footer().AlignCenter().Text(t =>
            {
                t.CurrentPageNumber();
                t.Span(" / ");
                t.TotalPages();
            });
        });
    }).GeneratePdf();
}
```

### Scriban for HTML / text bodies
```csharp
var template = Scriban.Template.Parse(rawTemplateBody);
if (template.HasErrors) throw new TemplateRenderException(template.Messages);

var ctx = new Scriban.Runtime.ScriptObject();
ctx.Import(payload);                            // populate
ctx.SetValue("formatMoney", new Func<decimal, string, string>((a, c) =>
    money.Format(new Money(a, c), tenantLocale)), readOnly: true);

var output = template.Render(ctx);
```

### Template asset loading (logos, signatures, watermarks)
Assets live in M21 as documents. M6 fetches by `m6_template_asset.document_id` via `IStorageProvider.GetAsync()` at render time. **Cache** per render request; do not re-download for every page.

### Async rendering for heavy templates
If anticipated output > 1 MB or render time > 3 s, enqueue via Hangfire:
```csharp
hangfire.Enqueue<IRenderWorker>(w => w.RunAsync(renderRequestId, ct));
```
Status tracked in `m6_render_request.status` (`Queued` → `Rendering` → `Completed`).

## Critical gotchas

### Money formatting in templates
NEVER format money with `.ToString("C")` — locale gets it wrong for INR vs USD vs JPY.
Use the provided `formatMoney` helper which routes through `Money.MinorUnits` per ISO 4217 and `tenant.Locale`.

### Date formatting
NEVER use `DateTime.Now`. Pass `Instant`s into templates and format via the provided `formatDate(instant, tz, locale)` helper that uses NodaTime + IANA tz.

### Embedded fonts
Inter must be embedded. Don't rely on system fonts — they don't exist in the container.

### Streaming large PDFs
For multi-page invoices > 5 MB, use `Document.GeneratePdfAsync(stream)` and stream directly to `IStorageProvider.PutAsync` to avoid OOM.

### License
QuestPDF is free under Community license up to $1M revenue. When exceeded, switch to Professional. Track via `LicenseType` config.

### Template versioning
Every template edit = new `m6_template_version` row. NEVER mutate existing rows. Render requests reference a specific version so historical re-renders are reproducible.

### Country variants
Same `code` (e.g. "INVOICE") may have multiple rows differing by `country_code`. Resolution: tenant.country → fallback null. Indian invoice template has GST fields; US invoice template has sales-tax fields. Both share the same `code='INVOICE'`.

## See also
- `efcore-mysql-pomelo` — `m6_template`, `m6_render_request` schema
- `minio-blob-storage` — output upload + asset download
- `hangfire-jobs` — async render queue
- `serilog-logging` — render audit (`document_id`, `template_id`, `duration_ms`)
- `docs/lld/M6_DocGeneration_v1.0.md` — full schema + responsibilities
