---
name: polly-resilience
description: Polly v8 resilience pipelines for ULP external integrations. Use when calling external APIs (ICEGATE, IRN portal, banking, GST GSP), DB connections, or any flaky network call. Implements retry, circuit breaker, timeout, bulkhead patterns. Always wrap external calls in a resilience pipeline.
---

# Polly v8 Resilience for ULP

## When this skill triggers
Any call to external APIs, third-party services, or flaky network resources. ULP integrates with ICEGATE (customs), IRN portal (GST e-invoice), Razorpay/Cashfree, banks (NEFT statements), MSG91/Twilio (SMS), Gupshup (WhatsApp). All wrapped in Polly.

## Top 3 reference repos
1. **App-vNext/Polly** (https://github.com/App-vNext/Polly) - Official Polly v8. The README has complete pipeline reference.
2. **App-vNext/Polly.Samples** (https://github.com/App-vNext/Polly.Samples) - 30+ runnable scenarios. Direct templates for retry, circuit breaker, hedging.
3. **dotnet/aspire** (https://github.com/dotnet/aspire) - .NET Aspire's HTTP client extensions show production resilience patterns for Microsoft-style.

## Standard ULP resilience pipeline
```csharp
// Backend/ULP.Common/Resilience/StandardPipelines.cs
public static class StandardPipelines
{
    public static ResiliencePipeline<HttpResponseMessage> ExternalApiPipeline =>
        new ResiliencePipelineBuilder<HttpResponseMessage>()
            // 1. Timeout - kill if too slow
            .AddTimeout(TimeSpan.FromSeconds(30))
            // 2. Retry - exponential backoff
            .AddRetry(new RetryStrategyOptions<HttpResponseMessage> {
                ShouldHandle = new PredicateBuilder<HttpResponseMessage>()
                    .Handle<HttpRequestException>()
                    .HandleResult(r => r.StatusCode >= HttpStatusCode.InternalServerError
                                    || r.StatusCode == HttpStatusCode.RequestTimeout
                                    || r.StatusCode == HttpStatusCode.TooManyRequests),
                MaxRetryAttempts = 3,
                Delay = TimeSpan.FromSeconds(2),
                BackoffType = DelayBackoffType.Exponential,
                UseJitter = true,
                OnRetry = args => {
                    Log.Warning("Retry {Attempt} after {Delay}ms: {Reason}",
                        args.AttemptNumber, args.RetryDelay.TotalMilliseconds, args.Outcome);
                    return ValueTask.CompletedTask;
                }
            })
            // 3. Circuit breaker - stop trying when service is down
            .AddCircuitBreaker(new CircuitBreakerStrategyOptions<HttpResponseMessage> {
                ShouldHandle = new PredicateBuilder<HttpResponseMessage>()
                    .Handle<HttpRequestException>()
                    .HandleResult(r => (int)r.StatusCode >= 500),
                FailureRatio = 0.5,
                MinimumThroughput = 10,
                SamplingDuration = TimeSpan.FromSeconds(30),
                BreakDuration = TimeSpan.FromMinutes(1)
            })
            .Build();
}
```

## ULP-specific named pipelines
```csharp
// Different SLAs for different services
public static ResiliencePipeline<HttpResponseMessage> IcegatePipeline =>
    // ICEGATE is slow but reliable - long timeout, fewer retries
    new ResiliencePipelineBuilder<HttpResponseMessage>()
        .AddTimeout(TimeSpan.FromMinutes(2))
        .AddRetry(new() { MaxRetryAttempts = 2, Delay = TimeSpan.FromSeconds(10) })
        .Build();

public static ResiliencePipeline<HttpResponseMessage> IrnPipeline =>
    // IRN portal flaky - aggressive retry
    new ResiliencePipelineBuilder<HttpResponseMessage>()
        .AddTimeout(TimeSpan.FromSeconds(15))
        .AddRetry(new() { MaxRetryAttempts = 5, Delay = TimeSpan.FromSeconds(1) })
        .AddCircuitBreaker(new() { FailureRatio = 0.5, BreakDuration = TimeSpan.FromMinutes(2) })
        .Build();

public static ResiliencePipeline<HttpResponseMessage> SmsPipeline =>
    // SMS is fire-and-forget - short timeout, fail fast
    new ResiliencePipelineBuilder<HttpResponseMessage>()
        .AddTimeout(TimeSpan.FromSeconds(5))
        .AddRetry(new() { MaxRetryAttempts = 2 })
        .Build();
```

## Usage in service
```csharp
public class IcegateClient
{
    private readonly HttpClient _http;
    private readonly ResiliencePipeline<HttpResponseMessage> _pipeline = StandardPipelines.IcegatePipeline;

    public async Task<ShippingBillResponse> SubmitAsync(ShippingBillRequest req, CancellationToken ct)
    {
        var resp = await _pipeline.ExecuteAsync(async token => 
            await _http.PostAsJsonAsync("/api/shipping-bill", req, token), ct);
        
        return await resp.Content.ReadFromJsonAsync<ShippingBillResponse>(ct);
    }
}
```

## DI registration
```csharp
// Program.cs
builder.Services.AddHttpClient<IcegateClient>(c => {
    c.BaseAddress = new Uri(builder.Configuration["Icegate:BaseUrl"]);
    c.DefaultRequestHeaders.Add("X-Api-Key", builder.Configuration["Icegate:ApiKey"]);
});
```

## Gotchas specific to ULP

1. **Don't retry on 4xx** - except 408 (timeout) and 429 (rate limit). 4xx means client error - retry won't help.
2. **Always include jitter** in backoff - thundering herd from synchronized retries.
3. **Circuit breaker per upstream** - one circuit breaker per external service, not global. ICEGATE down should not block IRN calls.
4. **Log retry attempts** - send to Application Insights so SRE can see retry storms.
5. **Don't wrap idempotent and non-idempotent calls in same pipeline** - retrying a non-idempotent POST creates duplicates. Use `Idempotency-Key` header on POSTs.
6. **Bulkhead isolation** - for high-volume external calls (POD photo upload), add `.AddConcurrencyLimiter()` to prevent thread exhaustion.
7. **Polly v8 syntax differs from v7** - All ULP code is v8 (`ResiliencePipelineBuilder`). Don't copy v7 examples.

## ULP companion docs
- Integration patterns: `docs/ULP_HLD_v1.0_HighLevelDesign.docx` Section 5
- ICEGATE: `docs/ULP_LLD_M4_v1.0_CHA.docx` Section 5

