---
name: automapper-fluentvalidation
description: AutoMapper 13 (DTO mapping) and FluentValidation 11 (input validation) patterns for ULP. Use when defining DTOs, writing entity-to-DTO maps, validating API request/response models, or any work in Backend/*/Mappers/ or Backend/*/Validators/. Covers ProjectTo for query optimization, validation pipeline behaviors, custom rules for Indian-specific validations (GSTIN, PAN, mobile, IFSC, PIN), and AsyncValidator usage. Trigger on Profile classes, AbstractValidator inheritance, or Map<>/MapTo<> calls.
---

# AutoMapper + FluentValidation for ULP

## When this skill triggers
Working with DTOs, defining entity-to-DTO mappings, writing input validators, modifying request/response contracts, or anything in `Backend/*/Mappers/`, `Backend/*/Validators/`, `Backend/*/Dto/`. Trigger on `Profile`, `AbstractValidator<T>`, `IMapper`, `MapTo<>()`.

## Top 3 reference repos
1. **AutoMapper/AutoMapper** (https://github.com/AutoMapper/AutoMapper) — Official repo. Read `docs/Configuration.md` for Profile setup and `docs/Queryable Extensions.md` for `ProjectTo`. Critical for EF Core query performance.
2. **FluentValidation/FluentValidation** (https://github.com/FluentValidation/FluentValidation) — Official repo. Read `docs/aspnet.md` for ASP.NET Core integration and `docs/built-in-validators.md` for the rule reference.
3. **jbogard/MediatR** (https://github.com/jbogard/MediatR) — Even if ULP doesn't use MediatR everywhere, the pipeline behavior pattern (`IPipelineBehavior`) is the canonical way to wire FluentValidation. Read `samples/MediatR.Examples/`.

## Critical ULP patterns

### AutoMapper Profile (one per module)
```csharp
// Backend/M17.Accounts/Mappers/InvoiceProfile.cs
public class InvoiceProfile : Profile
{
    public InvoiceProfile()
    {
        // Entity -> DTO (read path)
        CreateMap<Invoice, InvoiceDto>()
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Customer.Name))
            .ForMember(d => d.LineCount, o => o.MapFrom(s => s.Lines.Count))
            // CRITICAL: Money type to decimal+currency
            .ForMember(d => d.AmountInr, o => o.MapFrom(s => s.Amount.Value))
            .ForMember(d => d.Currency, o => o.MapFrom(s => s.Amount.Currency));

        // CreateRequest -> Entity (write path)
        CreateMap<CreateInvoiceRequest, Invoice>()
            // Never map Id, CreatedAt, TenantId from DTO - set in service
            .ForMember(d => d.Id, o => o.Ignore())
            .ForMember(d => d.CreatedAt, o => o.Ignore())
            .ForMember(d => d.TenantId, o => o.Ignore())
            .ForMember(d => d.Status, o => o.MapFrom(_ => InvoiceStatus.Draft));
    }
}

// Program.cs registration
builder.Services.AddAutoMapper(typeof(InvoiceProfile).Assembly);
```

### Use ProjectTo for query performance (mandatory for read paths)
```csharp
// WRONG: loads full entity then maps in memory
public async Task<List<InvoiceDto>> GetAllAsync()
{
    var entities = await _db.Invoices.Include(i => i.Customer).Include(i => i.Lines).ToListAsync();
    return _mapper.Map<List<InvoiceDto>>(entities);
}

// RIGHT: SQL projection - only selects mapped columns
public async Task<List<InvoiceDto>> GetAllAsync()
{
    return await _db.Invoices
        .ProjectTo<InvoiceDto>(_mapper.ConfigurationProvider)
        .ToListAsync();
}
```

### FluentValidation validator (one per request DTO)
```csharp
// Backend/M17.Accounts/Validators/CreateInvoiceRequestValidator.cs
public class CreateInvoiceRequestValidator : AbstractValidator<CreateInvoiceRequest>
{
    public CreateInvoiceRequestValidator(ICustomerRepository customers)
    {
        RuleFor(x => x.CustomerId)
            .NotEmpty()
            .MustAsync(async (id, ct) => await customers.ExistsAsync(id, ct))
            .WithMessage("Customer {PropertyValue} does not exist");

        RuleFor(x => x.InvoiceDate)
            .NotEmpty()
            .LessThanOrEqualTo(DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("Invoice date cannot be in the future");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Amount must be positive")
            .ScalePrecision(2, 18).WithMessage("Amount precision is 18,2");

        RuleFor(x => x.Currency)
            .NotEmpty().Length(3)
            .Matches("^[A-Z]{3}$").WithMessage("Currency must be ISO 4217 (e.g. INR)");

        RuleFor(x => x.Lines)
            .NotEmpty()
            .Must(lines => lines.Count <= 500).WithMessage("Max 500 line items per invoice");

        RuleForEach(x => x.Lines).SetValidator(new InvoiceLineValidator());
    }
}
```

### India-specific validators (reusable across modules)
```csharp
// Backend/Common/Validators/IndianRules.cs
public static class IndianRules
{
    private static readonly Regex GstinRegex =
        new(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", RegexOptions.Compiled);

    private static readonly Regex PanRegex =
        new(@"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", RegexOptions.Compiled);

    private static readonly Regex IfscRegex =
        new(@"^[A-Z]{4}0[A-Z0-9]{6}$", RegexOptions.Compiled);

    private static readonly Regex MobileE164InRegex =
        new(@"^\+91[6-9][0-9]{9}$", RegexOptions.Compiled);

    private static readonly Regex PinRegex =
        new(@"^[1-9][0-9]{5}$", RegexOptions.Compiled);

    public static IRuleBuilderOptions<T, string> Gstin<T>(this IRuleBuilder<T, string> rb)
        => rb.NotEmpty().Length(15).Matches(GstinRegex)
            .WithMessage("Invalid GSTIN. Format: 27AAAAA0000A1Z5 (15 chars)");

    public static IRuleBuilderOptions<T, string> Pan<T>(this IRuleBuilder<T, string> rb)
        => rb.NotEmpty().Length(10).Matches(PanRegex)
            .WithMessage("Invalid PAN. Format: ABCDE1234F (10 chars)");

    public static IRuleBuilderOptions<T, string> Ifsc<T>(this IRuleBuilder<T, string> rb)
        => rb.NotEmpty().Length(11).Matches(IfscRegex)
            .WithMessage("Invalid IFSC. Format: HDFC0000123 (11 chars; 5th char is 0)");

    public static IRuleBuilderOptions<T, string> MobileIndia<T>(this IRuleBuilder<T, string> rb)
        => rb.NotEmpty().Matches(MobileE164InRegex)
            .WithMessage("Indian mobile must be E.164 format: +91XXXXXXXXXX");

    public static IRuleBuilderOptions<T, string> Pincode<T>(this IRuleBuilder<T, string> rb)
        => rb.NotEmpty().Length(6).Matches(PinRegex)
            .WithMessage("Invalid PIN code (6 digits, first digit 1-9)");
}

// Usage in any validator:
public class CreateCustomerValidator : AbstractValidator<CreateCustomerRequest>
{
    public CreateCustomerValidator()
    {
        RuleFor(x => x.Gstin).Gstin();
        RuleFor(x => x.Pan).Pan();
        RuleFor(x => x.PrimaryMobile).MobileIndia();
        RuleFor(x => x.BillingAddress.Pincode).Pincode();
    }
}
```

### Validation pipeline (Minimal API filter)
```csharp
// Backend/Common/Filters/ValidationFilter.cs
public class ValidationFilter<T> : IEndpointFilter where T : class
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var arg = ctx.Arguments.OfType<T>().FirstOrDefault();
        if (arg is null) return Results.BadRequest("Missing request body");

        var validator = ctx.HttpContext.RequestServices.GetService<IValidator<T>>();
        if (validator is null) return await next(ctx);

        var result = await validator.ValidateAsync(arg, ctx.HttpContext.RequestAborted);
        if (!result.IsValid)
        {
            return Results.ValidationProblem(result.ToDictionary());
        }
        return await next(ctx);
    }
}

// Endpoint usage
group.MapPost("/invoices", CreateInvoice)
     .AddEndpointFilter<ValidationFilter<CreateInvoiceRequest>>();
```

## Critical gotchas

### AutoMapper performance
- ALWAYS use `ProjectTo<TDto>(config)` for queryables (EF Core).
- `Map<TDto>(entities)` materializes the full entity tree first - slow.
- Configure once at startup; never new up `Mapper` per request.

### Don't map ID/CreatedAt/TenantId from DTOs
- Server controls these. DTO -> Entity mapping must `Ignore()` server-managed fields.

### FluentValidation async rules need MustAsync
- `Must(x => repo.ExistsAsync(x).Result)` deadlocks. Use `MustAsync`.

### Validator scope
- Register validators as scoped/transient: `builder.Services.AddValidatorsFromAssemblyContaining<CreateInvoiceRequestValidator>()`.

### Tenant scoping in async validators
- If async rule queries DB, the DbContext needs tenant filter applied (via global filter or explicit).
- Otherwise validator could return false-positive for cross-tenant entities.

### Indian validation regexes
- Always use the regexes above; validation is part of compliance audit.
- GSTIN check digit validation (15th char) is more rigorous - consider a `GstinChecksumValidator` for high-stakes paths.

## ULP companion docs
- ULP_HLD_v1.0_HighLevelDesign.docx Section 5 (API contracts)
- ULP_DBD_v1.0_DatabaseDesign.docx (entity definitions)
- ULP_DomainReferenceLibrary_v3.0.docx (Indian-specific field formats)
