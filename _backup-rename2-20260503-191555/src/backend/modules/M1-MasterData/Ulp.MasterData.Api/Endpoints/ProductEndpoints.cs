using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NodaTime;
using Ulp.BuildingBlocks;
using Ulp.Core.Domain.Tenancy;
using Ulp.Core.Domain.ValueObjects;
using Ulp.MasterData.Application.Products;
using Ulp.MasterData.Domain.Entities;

namespace Ulp.MasterData.Api.Endpoints;

public static class ProductEndpoints
{
    public static IEndpointRouteBuilder MapProductEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/master-data/products").WithTags("M1 Â· Products").RequireAuthorization();

        g.MapGet("/", List);
        g.MapGet("/{id:long}", Get);
        g.MapPost("/", Create);
        g.MapPut("/{id:long}", Update);
        g.MapDelete("/{id:long}", Delete);

        return app;
    }

    private static async Task<IResult> List(
        [FromServices] IProductRepository repo,
        [FromQuery] string? search,
        [FromQuery] string? countryCode,
        [FromQuery] ProductType? productType,
        [FromQuery] int page,
        [FromQuery] int pageSize,
        CancellationToken ct)
    {
        var q = new ProductListQuery(search, countryCode, productType,
                                     Math.Max(page, 1),
                                     pageSize is <= 0 or > 200 ? 50 : pageSize);
        var items = await repo.ListAsync(q, ct);
        var total = await repo.CountAsync(q, ct);
        return Results.Ok(new PagedList<ProductDto>(items.Select(ToDto).ToList(), q.Page, q.PageSize, total));
    }

    private static async Task<IResult> Get(long id, [FromServices] IProductRepository repo, CancellationToken ct)
    {
        var p = await repo.GetAsync(id, ct);
        return p is null ? Results.NotFound() : Results.Ok(ToDto(p));
    }

    private static async Task<IResult> Create(
        [FromBody] CreateProductRequest req,
        [FromServices] IProductRepository repo,
        [FromServices] ITenantContext tenant,
        [FromServices] IClock clock,
        CancellationToken ct)
    {
        if (await repo.GetByCodeAsync(req.ProductCode, ct) is not null)
            return Results.Conflict(new { error = $"Product code '{req.ProductCode}' already exists for this tenant." });

        var now = clock.GetCurrentInstant();
        var p = new Product
        {
            TenantId  = tenant.TenantId,
            CountryCode = string.IsNullOrEmpty(req.CountryCode) ? tenant.CountryCode : new CountryCode(req.CountryCode),
            ProductCode = req.ProductCode,
            ProductName = req.ProductName,
            ProductDescription = req.ProductDescription,
            ProductType = req.ProductType,
            UomCode = req.UomCode,
            WeightKg = req.WeightKg,
            VolumeCbm = req.VolumeCbm,
            HsCode = req.HsCode,
            HsnCode = req.HsnCode,
            HtsusCode = req.HtsusCode,
            ScheduleBCode = req.ScheduleBCode,
            TaxClass = req.TaxClass,
            CountryOfOrigin = req.CountryOfOrigin,
            IsHazmat = req.IsHazmat,
            IsPerishable = req.IsPerishable,
            IsTemperatureControlled = req.IsTemperatureControlled,
            IsDualUse = req.IsDualUse,
            CreatedAt = now,
            ModifiedAt = now,
        };
        var saved = await repo.AddAsync(p, ct);
        return Results.Created($"/api/v1/master-data/products/{saved.Id}", ToDto(saved));
    }

    private static async Task<IResult> Update(
        long id,
        [FromBody] UpdateProductRequest req,
        [FromServices] IProductRepository repo,
        [FromServices] IClock clock,
        CancellationToken ct)
    {
        var p = await repo.GetAsync(id, ct);
        if (p is null) return Results.NotFound();

        p.ProductName = req.ProductName;
        p.ProductDescription = req.ProductDescription;
        p.ProductType = req.ProductType;
        p.UomCode = req.UomCode;
        p.WeightKg = req.WeightKg;
        p.VolumeCbm = req.VolumeCbm;
        p.HsCode = req.HsCode;
        p.HsnCode = req.HsnCode;
        p.HtsusCode = req.HtsusCode;
        p.ScheduleBCode = req.ScheduleBCode;
        p.TaxClass = req.TaxClass;
        p.CountryOfOrigin = req.CountryOfOrigin;
        p.IsHazmat = req.IsHazmat;
        p.IsPerishable = req.IsPerishable;
        p.IsTemperatureControlled = req.IsTemperatureControlled;
        p.IsDualUse = req.IsDualUse;
        p.ModifiedAt = clock.GetCurrentInstant();
        await repo.UpdateAsync(p, ct);
        return Results.Ok(ToDto(p));
    }

    private static async Task<IResult> Delete(long id, [FromServices] IProductRepository repo, CancellationToken ct)
    {
        await repo.DeleteAsync(id, ct);
        return Results.NoContent();
    }

    private static ProductDto ToDto(Product p) => new(
        p.Id, p.CountryCode.Value, p.ProductCode, p.ProductName, p.ProductDescription,
        p.ProductType, p.UomCode, p.WeightKg, p.VolumeCbm,
        p.HsCode, p.HsnCode, p.HtsusCode, p.ScheduleBCode,
        p.TaxClass, p.CountryOfOrigin,
        p.IsHazmat, p.IsPerishable, p.IsTemperatureControlled, p.IsDualUse,
        p.CreatedAt.ToString(), p.ModifiedAt.ToString());
}
