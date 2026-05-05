using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Scriban;
using Scriban.Runtime;
using Ulp.Core.Abstractions.Rendering;

namespace Ulp.Core.Infrastructure.Rendering;

/// <summary>
/// Scriban template renderer. Compiles + renders the template body against the payload.
/// HTML output. PDF rendering via QuestPDF lands Phase 2.1.
/// </summary>
public sealed class ScribanDocumentRenderer(ILogger<ScribanDocumentRenderer> log) : IDocumentRenderer
{
    public async Task<RenderResult> RenderAsync(RenderRequest request, CancellationToken ct)
    {
        if (!string.Equals(request.Engine, "SCRIBAN", StringComparison.OrdinalIgnoreCase))
            return new RenderResult(Success: false, Body: null, DurationMs: 0,
                Error: $"engine '{request.Engine}' not supported (Phase 2.0 = SCRIBAN only)");

        var sw = Stopwatch.StartNew();
        try
        {
            var template = Template.Parse(request.TemplateBody);
            if (template.HasErrors)
            {
                var msg = string.Join("; ", template.Messages.Select(m => m.ToString()));
                log.LogWarning("Scriban parse errors: {Errors}", msg);
                return new RenderResult(false, null, (int)sw.ElapsedMilliseconds, msg);
            }

            var so = new ScriptObject();
            foreach (var kv in request.Payload)
            {
                so[kv.Key] = kv.Value;
            }
            var ctx = new TemplateContext { MemberRenamer = m => m.Name };
            ctx.PushGlobal(so);

            var body = await template.RenderAsync(ctx);
            return new RenderResult(true, body, (int)sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Scriban render failed");
            return new RenderResult(false, null, (int)sw.ElapsedMilliseconds, ex.Message);
        }
    }
}

public static class RenderingRegistration
{
    public static IServiceCollection AddScribanRenderer(this IServiceCollection services)
    {
        services.AddSingleton<IDocumentRenderer, ScribanDocumentRenderer>();
        return services;
    }
}
