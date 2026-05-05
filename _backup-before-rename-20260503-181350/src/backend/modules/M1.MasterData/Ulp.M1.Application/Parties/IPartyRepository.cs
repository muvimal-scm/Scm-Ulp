using Ulp.Core.Domain.ValueObjects;
using Ulp.M1.Domain.Entities;

namespace Ulp.M1.Application.Parties;

/// <summary>
/// Repository contract for parties. Implementation lives in
/// Ulp.M1.Infrastructure (EF Core) so the Application layer stays
/// persistence-agnostic. Tenant scoping is enforced via DbContext
/// global query filter.
/// </summary>
public interface IPartyRepository
{
    Task<IReadOnlyList<Party>> ListAsync(PartyListQuery query, CancellationToken ct);
    Task<Party?> GetAsync(long id, CancellationToken ct);
    Task<Party> AddAsync(Party party, CancellationToken ct);
    Task UpdateAsync(Party party, CancellationToken ct);
    Task SoftDeleteAsync(long id, CancellationToken ct);
    Task<long> CountAsync(PartyListQuery query, CancellationToken ct);
}
