using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.M1.Application.Profiles;
using Ulp.M1.Domain.Entities;

namespace Ulp.M1.Infrastructure.Persistence;

internal sealed class ProfileExtensionsRepository(
    M1DbContext db,
    ITenantContext tenant,
    IClock clock) : IProfileExtensionsRepository
{
    /// <summary>
    /// The new profile-extension tables use plain <c>int TenantId</c> (no
    /// global query filter, matching the existing PartyIdentifier style),
    /// so we filter explicitly here. <see cref="_tenantId"/> is computed
    /// once per repo instance.
    /// </summary>
    private readonly int _tenantId = int.Parse(tenant.TenantId.Value);

    public async Task<ProfileExtensionsBundle> GetBundleAsync(long partyId, CancellationToken ct)
    {
        var poas = await db.PartyPoas.AsNoTracking()
            .Where(x => x.TenantId == _tenantId && x.PartyId == partyId)
            .OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

        var permits = await db.PartyPermits.AsNoTracking()
            .Where(x => x.TenantId == _tenantId && x.PartyId == partyId)
            .OrderBy(x => x.Kind).ThenBy(x => x.PermitName).ToListAsync(ct);

        var miscDocs = await db.PartyMiscDocs.AsNoTracking()
            .Where(x => x.TenantId == _tenantId && x.PartyId == partyId)
            .OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

        return new ProfileExtensionsBundle(partyId, poas, permits, miscDocs);
    }

    public async Task<PartyPoa> AddPoaAsync(long partyId, AddPoaRequest req, CancellationToken ct)
    {
        var now = clock.GetCurrentInstant();
        var entity = new PartyPoa
        {
            TenantId = _tenantId, PartyId = partyId,
            PoaNumber = req.PoaNumber, GrantedTo = req.GrantedTo,
            EffectiveDate = req.EffectiveDate, ExpirationDate = req.ExpirationDate,
            Status = req.Status, DocumentId = req.DocumentId, Notes = req.Notes,
            CreatedAt = now, ModifiedAt = now,
        };
        db.PartyPoas.Add(entity);
        await db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<PartyPermit> AddPermitAsync(long partyId, AddPermitRequest req, CancellationToken ct)
    {
        var now = clock.GetCurrentInstant();
        var entity = new PartyPermit
        {
            TenantId = _tenantId, PartyId = partyId,
            Kind = req.Kind, PermitCode = req.PermitCode, PermitName = req.PermitName,
            IssuingAuthority = req.IssuingAuthority,
            HsCode = req.HsCode, ProductId = req.ProductId,
            EffectiveDate = req.EffectiveDate, ExpirationDate = req.ExpirationDate,
            Status = req.Status, DocumentId = req.DocumentId, Notes = req.Notes,
            CreatedAt = now, ModifiedAt = now,
        };
        db.PartyPermits.Add(entity);
        await db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<PartyMiscDoc> AddMiscDocAsync(long partyId, AddMiscDocRequest req, CancellationToken ct)
    {
        var entity = new PartyMiscDoc
        {
            TenantId = _tenantId, PartyId = partyId,
            DocCategory = req.DocCategory, Title = req.Title,
            DocumentId = req.DocumentId,
            EffectiveDate = req.EffectiveDate, ExpirationDate = req.ExpirationDate,
            Notes = req.Notes,
            CreatedAt = clock.GetCurrentInstant(),
        };
        db.PartyMiscDocs.Add(entity);
        await db.SaveChangesAsync(ct);
        return entity;
    }
}
