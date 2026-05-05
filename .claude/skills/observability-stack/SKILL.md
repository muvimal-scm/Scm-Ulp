---
name: observability-stack
description: ULP observability stack - Application Insights (APM, traces, dependencies), Sentry (error tracking, source maps), BetterStack (uptime, logs, status page), and Langfuse (LLM tracing for FastAPI agents). Use when configuring telemetry, debugging production issues, setting up dashboards/alerts, configuring distributed tracing across .NET services, or instrumenting custom metrics. Covers OpenTelemetry standardization, correlation ID propagation, PII redaction, sampling strategy, and what to send to which tool.
---

# Observability Stack for ULP

## When this skill triggers
Configuring telemetry/instrumentation in any backend service, debugging production issues, setting up alert rules, configuring `appsettings` observability sections, or instrumenting custom metrics. Trigger on `OpenTelemetry`, `ApplicationInsights`, `Sentry`, `IMeterFactory`, `ActivitySource`.

## Top 3 reference repos
1. **microsoft/ApplicationInsights-dotnet** (https://github.com/microsoft/ApplicationInsights-dotnet) — Official AI SDK. ULP uses this for .NET APM. Read `examples/` for AspNetCore + worker setups.
2. **getsentry/sentry-dotnet** (https://github.com/getsentry/sentry-dotnet) — Official Sentry .NET SDK. Best-in-class error grouping + release tracking. Read README for ASP.NET Core integration.
3. **langfuse/langfuse** (https://github.com/langfuse/langfuse) — LLM observability platform. Read `python/` SDK README for FastAPI/LangGraph integration. Self-hosted option available; ULP MVP uses cloud free tier.

## Critical ULP patterns

### Tool ownership matrix (what goes where)
| Concern | Tool | Why |
|---------|------|-----|
| .NET APM (request traces, deps) | Application Insights | Native .NET integration; Azure Portal dashboards |
| Frontend errors + source maps | Sentry | Best frontend grouping; release tracking |
| Backend exceptions (high-stakes) | Sentry | Better grouping than AI |
| Uptime monitoring | BetterStack | External heartbeat checks; status page; PagerDuty |
| Log aggregation (search) | Application Insights + BetterStack | AI for ad-hoc query; BetterStack for retention |
| LLM traces (FastAPI agents) | Langfuse | Native LangChain/LangGraph integration |
| Infra metrics (CPU, mem) | Azure Monitor | Pulled into AI workspace |
| Alerts | Azure Monitor + BetterStack | AI for app metrics; BetterStack for uptime |

### .NET 8 Application Insights setup
```csharp
// Program.cs
using Microsoft.ApplicationInsights.AspNetCore.Extensions;

builder.Services.AddApplicationInsightsTelemetry(opt =>
{
    opt.ConnectionString = builder.Configuration["AppInsights:ConnectionString"];
    opt.EnableAdaptiveSampling = true;     // Dynamic sampling under high load
    opt.EnableQuickPulseMetricStream = true;  // Live Metrics Stream
});

// Custom telemetry initializer to add tenant_id to every event
builder.Services.AddSingleton<ITelemetryInitializer, TenantTelemetryInitializer>();

public class TenantTelemetryInitializer : ITelemetryInitializer
{
    private readonly IHttpContextAccessor _ctx;
    public TenantTelemetryInitializer(IHttpContextAccessor ctx) { _ctx = ctx; }
    public void Initialize(ITelemetry t)
    {
        var tenantId = _ctx.HttpContext?.User.FindFirst("tenant_id")?.Value;
        if (!string.IsNullOrEmpty(tenantId))
            t.Context.GlobalProperties["TenantId"] = tenantId;
        t.Context.Cloud.RoleName = "ulp-" + Environment.GetEnvironmentVariable("MODULE_NAME");
    }
}
```

### Sentry setup (.NET backend + Angular frontend)
```csharp
// Program.cs
builder.WebHost.UseSentry(opt =>
{
    opt.Dsn = builder.Configuration["Sentry:Dsn"];
    opt.Environment = builder.Environment.EnvironmentName;
    opt.Release = $"ulp@{ThisAssembly.Git.SemVer.Source}";
    opt.TracesSampleRate = builder.Environment.IsProduction() ? 0.1 : 1.0;
    opt.SendDefaultPii = false;             // PII off; explicit opt-in below
    opt.BeforeSend = e => RedactPii(e);    // strip GSTIN, PAN, mobile from breadcrumbs
});
```

```typescript
// frontend/src/main.ts
import * as Sentry from '@sentry/angular';

Sentry.init({
  dsn: environment.sentryDsn,
  environment: environment.name,
  release: environment.version,
  tracesSampleRate: 0.1,
  integrations: [Sentry.browserTracingIntegration()],
  beforeSend(event) { return redactPii(event); },
});
```

### Langfuse for FastAPI LLM agents
```python
# Backend/Ai/agents/tracing.py
from langfuse import Langfuse
from langfuse.langchain import CallbackHandler
import os

langfuse = Langfuse(
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
    secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
    host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
)

# Inject into LangGraph
def get_handler(tenant_id: str, user_id: str, trace_name: str):
    return CallbackHandler(
        langfuse_client=langfuse,
        trace_name=trace_name,
        user_id=user_id,
        metadata={"tenant_id": tenant_id, "module": "ulp-ai"},
    )

# Usage in agent
result = await agent.ainvoke(
    {"input": user_query},
    config={"callbacks": [get_handler(tenant_id, user_id, "doc-extraction")]}
)
```

### Correlation ID propagation across services
```csharp
// Backend/Common/Middleware/CorrelationIdMiddleware.cs
public class CorrelationIdMiddleware
{
    private const string Header = "X-Correlation-Id";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) { _next = next; }

    public async Task InvokeAsync(HttpContext ctx)
    {
        var corrId = ctx.Request.Headers[Header].FirstOrDefault() ?? Guid.NewGuid().ToString("N");
        ctx.Response.Headers[Header] = corrId;
        ctx.Items["CorrelationId"] = corrId;
        using (LogContext.PushProperty("CorrelationId", corrId))   // Serilog
        using (Activity.Current?.SetTag("correlation.id", corrId))  // OpenTelemetry
        {
            await _next(ctx);
        }
    }
}

// On HttpClient calls to other services, propagate the header
public class CorrelationIdHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _ctx;
    public CorrelationIdHandler(IHttpContextAccessor ctx) { _ctx = ctx; }
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage req, CancellationToken ct)
    {
        var corrId = _ctx.HttpContext?.Items["CorrelationId"] as string;
        if (corrId is not null) req.Headers.Add("X-Correlation-Id", corrId);
        return await base.SendAsync(req, ct);
    }
}
```

### Custom metrics (.NET 8 Meter API)
```csharp
public class M17AccountsMetrics
{
    private readonly Counter<long> _invoicesCreated;
    private readonly Counter<long> _invoicesApproved;
    private readonly Histogram<double> _approvalDurationMs;

    public M17AccountsMetrics(IMeterFactory mf)
    {
        var meter = mf.Create("ULP.M17.Accounts");
        _invoicesCreated = meter.CreateCounter<long>("ulp_m17_invoices_created");
        _invoicesApproved = meter.CreateCounter<long>("ulp_m17_invoices_approved");
        _approvalDurationMs = meter.CreateHistogram<double>("ulp_m17_invoice_approval_duration_ms");
    }

    public void RecordCreated(int tenantId) =>
        _invoicesCreated.Add(1, new KeyValuePair<string, object?>("tenant_id", tenantId));
}
```

### BetterStack uptime + status page
```yaml
# Heartbeat: every minute, expect 200 from /health
- name: ulp-api-prod
  url: https://api.ulp.com/health
  expected_status_code: 200
  expected_response_body_contains: "healthy"
  notify: pagerduty,slack
  interval_seconds: 60
  regions: [in-mumbai, sg-singapore, us-east]
```

## Critical gotchas

### PII redaction is non-negotiable
- Never log GSTIN, PAN, Aadhaar, full mobile, full email, address.
- Already enforced in Serilog via PII enricher; ensure Sentry + AI also strip PII.
- Audit AI/Sentry events monthly to catch leaks.

### Sampling strategy
- Production: 10% trace sampling baseline; 100% for errors.
- Dev/staging: 100% sampling.
- Adaptive sampling kicks in at high load; tune via AI portal.

### Sentry release tracking
- Tag Sentry releases with git SHA: `release: ulp@${GIT_SHA}`.
- Upload source maps in CI/CD: `npx @sentry/cli releases files <release> upload-sourcemaps ./dist`.
- Without source maps: stack traces are minified gibberish.

### LLM cost tracking
- Langfuse auto-captures token usage + cost per LLM call.
- Aggregate by tenant_id to identify high-cost tenants for billing.
- Alert if any single trace > $0.50 (likely runaway loop).

### Structured logging contract
- All logs MUST include: `tenant_id`, `correlation_id`, `module`, `user_id`.
- Don't use `string.Format` - use Serilog message template: `_logger.LogInformation("Invoice {InvoiceId} approved by {UserId}", inv.Id, user.Id)`.

### Alert routing
- Critical (paging): infrastructure down, payment processing failures, period close errors -> PagerDuty
- High (Slack): error rate spike, dependency failure, RTO/RPO breach -> #ulp-alerts
- Info (email): anomaly detection, capacity warnings -> ops mailing list

### Observability cost
- AI: ~$2-5/GB ingested. Sample aggressively; use custom dimensions sparingly.
- Sentry: free up to 5K errors/month; $26/mo for 50K.
- BetterStack: free for up to 10 monitors; $25/mo for unlimited.
- Langfuse cloud: free 50K events/mo; or self-host (recommended at scale).

## ULP companion docs
- ULP_HLD_v1.0_HighLevelDesign.docx Section 7 (Cross-cutting - observability)
- ULP_DevelopmentGuide_v1.0.docx (alerting patterns)
- ULP_TechStack_v3.0_Final.xlsx (Observability tab)
