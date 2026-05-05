using Microsoft.EntityFrameworkCore;
using Ulp.M1.Application.Parties;
using Ulp.M1.Domain.Entities;

namespace Ulp.M1.Infrastructure.Persistence;

internal sealed class PartyRepository(M1DbContext db) : IPartyRepository
{
    public async Task<IReadOnlyList<Party>> ListAsync(PartyListQuery q, CancellationToken ct)
    {
        var query = db.Parties.AsNoTracking().Include(p => p.Identifiers).AsQueryable();
        if (q.PartyType.HasValue) query = query.Where(p => p.PartyType == q.PartyType.Value);
        if (!q.IncludeInactive)   query = query.Where(p => p.IsActive);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = $"%{q.Search}%";
            query = query.Where(p => EF.Functions.Like(p.LegalName, s) || EF.Functions.Like(p.TradeName ?? "", s));
        }
        return await query
            .OrderBy(p => p.LegalName)
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .ToListAsync(ct);
    }

    public Task<Party?> GetAsync(long id, CancellationToken ct) =>
        db.Parties.Include(p => p.Identifiers).Include(p => p.Addresses).FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<Party> AddAsync(Party party, CancellationToken ct)
    {
        db.Parties.Add(party);
        await db.SaveChangesAsync(ct);
        return party;
    }

    public async Task UpdateAsync(Party party, CancellationToken ct)
    {
        db.Parties.Update(party);
        await db.SaveChangesAsync(ct);
    }

    public async Task SoftDeleteAsync(long id, CancellationToken ct)
    {
        var p = await db.Parties.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return;
        p.IsActive = false;
        await db.SaveChangesAsync(ct);
    }

    public Task<long> CountAsync(PartyListQuery q, CancellationToken ct)
    {
        var query = db.Parties.AsNoTracking().AsQueryable();
        if (q.PartyType.HasValue) query = query.Where(p => p.PartyType == q.PartyType.Value);
        if (!q.IncludeInactive)   query = query.Where(p => p.IsActive);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = $"%{q.Search}%";
            query = query.Where(p => EF.Functions.Like(p.LegalName, s) || EF.Functions.Like(p.TradeName ?? "", s));
        }
        return query.LongCountAsync(ct);
    }
}
