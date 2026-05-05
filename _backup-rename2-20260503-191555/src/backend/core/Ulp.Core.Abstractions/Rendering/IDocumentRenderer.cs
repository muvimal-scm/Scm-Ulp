namespace Ulp.Core.Abstractions.Rendering;

/// <summary>
/// Document rendering abstraction. Phase 2.0 = Scriban+HTML; Phase 2.1 adds QuestPDF for real PDF.
/// Per .claude/skills/questpdf-scriban-rendering — never reference Scriban/QuestPDF directly from
/// module code. Modules call IDocumentRenderer; the impl swaps as the engine evolves.
/// </summary>
public interface IDocumentRenderer
{
    /// <summary>
    /// Render a template body against a payload to a string output (HTML or text).
    /// PDF rendering is handled by separate methods once QuestPDF lands.
    /// </summary>
    Task<RenderResult> RenderAsync(RenderRequest request, CancellationToken ct = default);
}

public sealed record RenderRequest(
    string TemplateBody,
    string Engine,                                  // "SCRIBAN" | "HANDLEBARS" — currently only SCRIBAN supported
    IDictionary<string, object?> Payload);

public sealed record RenderResult(
    bool Success,
    string? Body,
    int DurationMs,
    string? Error = null);
