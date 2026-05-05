using Microsoft.EntityFrameworkCore;
using Ulp.MasterData.Application.Products;
using Ulp.MasterData.Domain.Entities;

namespace Ulp.MasterData.Infrastructure.Persistence;

internal sealed class ProductRepository(MasterDataDbContext db) : IProductRepository
{
    public async Task<IReadOnlyList<Product>> ListAsync(ProductListQuery q, CancellationToken ct)
    {
        var query = db.Products.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(q.CountryCode))
            query = query.Where(p => p.CountryCode.Value == q.CountryCode);
        if (q.ProductType.HasValue)
            query = query.Where(p => p.ProductType == q.ProductType.Value);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = $"%{q.Search}%";
            query = query.Where(p => EF.Functions.Like(p.ProductCode, s) || EF.Functions.Like(p.ProductName, s));
        }
        return await query
            .OrderBy(p => p.ProductCode)
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .ToListAsync(ct);
    }

    public Task<Product?> GetAsync(long id, CancellationToken ct) =>
        db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Product?> GetByCodeAsync(string productCode, CancellationToken ct) =>
        db.Products.FirstOrDefaultAsync(p => p.ProductCode == productCode, ct);

    public async Task<Product> AddAsync(Product product, CancellationToken ct)
    {
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        return product;
    }

    public async Task UpdateAsync(Product product, CancellationToken ct)
    {
        db.Products.Update(product);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(long id, CancellationToken ct)
    {
        var p = await db.Products.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return;
        db.Products.Remove(p);
        await db.SaveChangesAsync(ct);
    }

    public Task<long> CountAsync(ProductListQuery q, CancellationToken ct)
    {
        var query = db.Products.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(q.CountryCode)) query = query.Where(p => p.CountryCode.Value == q.CountryCode);
        if (q.ProductType.HasValue) query = query.Where(p => p.ProductType == q.ProductType.Value);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = $"%{q.Search}%";
            query = query.Where(p => EF.Functions.Like(p.ProductCode, s) || EF.Functions.Like(p.ProductName, s));
        }
        return query.LongCountAsync(ct);
    }
}
