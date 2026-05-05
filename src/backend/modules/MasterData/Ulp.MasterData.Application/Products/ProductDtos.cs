using Ulp.MasterData.Domain.Entities;

namespace Ulp.MasterData.Application.Products;

public sealed record ProductDto(
    long Id,
    string? CountryCode,
    string ProductCode,
    string ProductName,
    string? ProductDescription,
    ProductType ProductType,
    string UomCode,
    decimal? WeightKg,
    decimal? VolumeCbm,
    string? HsCode,
    string? HsnCode,
    string? HtsusCode,
    string? ScheduleBCode,
    string? TaxClass,
    string? CountryOfOrigin,
    bool IsHazmat,
    bool IsPerishable,
    bool IsTemperatureControlled,
    bool IsDualUse,
    string CreatedAtUtc,
    string ModifiedAtUtc);

public sealed record CreateProductRequest(
    string? CountryCode,
    string ProductCode,
    string ProductName,
    string? ProductDescription,
    ProductType ProductType,
    string UomCode,
    decimal? WeightKg,
    decimal? VolumeCbm,
    string? HsCode,
    string? HsnCode,
    string? HtsusCode,
    string? ScheduleBCode,
    string? TaxClass,
    string? CountryOfOrigin,
    bool IsHazmat = false,
    bool IsPerishable = false,
    bool IsTemperatureControlled = false,
    bool IsDualUse = false);

public sealed record UpdateProductRequest(
    string ProductName,
    string? ProductDescription,
    ProductType ProductType,
    string UomCode,
    decimal? WeightKg,
    decimal? VolumeCbm,
    string? HsCode,
    string? HsnCode,
    string? HtsusCode,
    string? ScheduleBCode,
    string? TaxClass,
    string? CountryOfOrigin,
    bool IsHazmat,
    bool IsPerishable,
    bool IsTemperatureControlled,
    bool IsDualUse);

public sealed record ProductListQuery(
    string? Search,
    string? CountryCode,
    ProductType? ProductType,
    int Page = 1,
    int PageSize = 50);
