---
name: aspnet-minimal-api
description: ASP.NET Core 8 Minimal API patterns for ULP module APIs. Use when creating new API endpoints, writing route handlers, configuring DI, adding middleware, or implementing FluentValidation. Covers route grouping, endpoint filters, OpenAPI/Swagger, idempotency, rate limiting. Always use when working in Backend/*.Api/ projects.
---

# ASP.NET Core 8 Minimal API for ULP

## When this skill triggers
Creating REST endpoints, route handlers, DI configuration, middleware, validators, or any work in `Backend/M*.Api/` projects.

## Top 3 reference repos
1. **dotnet/aspnetcore** (https://github.com/dotnet/aspnetcore) - Official source. The `samples/` and `src/Http/Routing/` are gold for endpoint filter patterns.
2. **PacktPublishing/ASP.NET-8-Best-Practices** (https://github.com/PacktPublishing/ASP.NET-8-Best-Practices) - Production patterns: middleware, security, EF Core integration, structured logging.
3. **dodyg/practical-aspnetcore** (https://github.com/dodyg/practical-aspnetcore) - 200+ runnable samples covering every Minimal API feature.

## Standard ULP endpoint structure
```csharp
// Backend/M17.Accounts.Api/Endpoints/InvoiceEndpoints.cs
public static class InvoiceEndpoints
{
    public static IEndpointRouteBuilder MapInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        var grp = app.MapGroup("/api/v1/invoices")
            .RequireAuthorization()
            .WithTags("M17.Invoices")
            .AddEndpointFilter<TenantContextFilter>()
            .AddEndpointFilter<IdempotencyFilter>();

        grp.MapGet("/{id:guid}", GetInvoiceAsync)
            .WithName("GetInvoice")
            .Produces<InvoiceDto>()
            .Produces(404);

        grp.MapPost("/", CreateInvoiceAsync)
            .WithName("CreateInvoice")
            .Produces<InvoiceDto>(201)
            .Produces<ValidationProblemDetails>(400);

        return app;
    }

    private static async Task<Results<Ok<InvoiceDto>, NotFound>> GetInvoiceAsync(
        Guid id, IInvoiceService svc, CancellationToken ct)
    {
        var inv = await svc.GetByIdAsync(id, ct);
        return inv is null ? TypedResults.NotFound() : TypedResults.Ok(inv);
    }
}
```

## Idempotency filter (mandatory for state-changing endpoints)
```csharp
public class IdempotencyFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var http = ctx.HttpContext;
        if (http.Request.Method is "POST" or "PUT" or "PATCH") {
            var key = http.Request.Headers["Idempotency-Key"].FirstOrDefault();
            if (string.IsNullOrEmpty(key))
                return Results.Problem("Idempotency-Key header required", statusCode: 400);
            
            var cache = http.RequestServices.GetRequiredService<IIdempotencyCache>();
            var cached = await cache.GetAsync(key);
            if (cached is not null) return cached;
            
            var result = await next(ctx);
            await cache.SetAsync(key, result, TimeSpan.FromHours(24));
            return result;
        }
        return await next(ctx);
    }
}
```

## FluentValidation integration
```csharp
public class CreateInvoiceValidator : AbstractValidator<CreateInvoiceCommand>
{
    public CreateInvoiceValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Lines).NotEmpty().WithMessage("At least one line required");
        RuleForEach(x => x.Lines).SetValidator(new InvoiceLineValidator());
        RuleFor(x => x.TotalAmount).GreaterThan(0);
    }
}

// Program.cs
builder.Services.AddValidatorsFromAssemblyContaining<CreateInvoiceValidator>();
```

## Gotchas specific to ULP

1. **NEVER use controllers** - ULP is Minimal API only. Keep handlers in `Endpoints/` folders, not `Controllers/`.
2. **Always include `CancellationToken`** as last parameter - propagate to all async calls. Critical for graceful shutdown.
3. **Use `Results<T1, T2>` (TypedResults)** not `IResult` - gives OpenAPI better metadata.
4. **`/api/v1/` versioning** is mandatory - never deploy unversioned endpoints.
5. **Tenant context comes from JWT claim** `tenant_id` - extracted in `TenantContextFilter`. Never read from query string or body.
6. **Errors return `ProblemDetails`** (RFC 7807) - never raw exception text.
7. **Idempotency-Key required** on POST/PUT/PATCH - enforced by filter.

## Standard middleware order in Program.cs
```csharp
app.UseExceptionHandler();           // 1. Catch all
app.UseSerilogRequestLogging();      // 2. Log requests
app.UseRouting();                    // 3. Route resolution
app.UseRateLimiter();                // 4. DDoS protection
app.UseAuthentication();             // 5. JWT validation
app.UseAuthorization();              // 6. RBAC
app.UseMiddleware<TenantContextMiddleware>(); // 7. Tenant scoping
app.MapInvoiceEndpoints();           // 8. Endpoints
```

## ULP companion docs
- API patterns: `docs/ULP_HLD_v1.0_HighLevelDesign.docx` Section 5
- M17 endpoints: `docs/ULP_LLD_M17_v1.0_Accounts.docx` Section 3

