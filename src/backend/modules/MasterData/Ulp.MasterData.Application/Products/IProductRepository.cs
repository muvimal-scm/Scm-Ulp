using Ulp.MasterData.Domain.Entities;

namespace Ulp.MasterData.Application.Products;

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> ListAsync(ProductListQuery query, CancellationToken ct);
    Task<Product?> GetAsync(long id, CancellationToken ct);
    Task<Product?> GetByCodeAsync(string productCode, CancellationToken ct);
    Task<Product> AddAsync(Product product, CancellationToken ct);
    Task UpdateAsync(Product product, CancellationToken ct);
    Task DeleteAsync(long id, CancellationToken ct);
    Task<long> CountAsync(ProductListQuery query, CancellationToken ct);
}
