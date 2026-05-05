using NodaTime;
using Ulp.MasterData.Domain.Entities;

namespace Ulp.MasterData.Application.Profiles;

/// <summary>
/// Repository for SCM-Milestone-1 party profile extensions:
/// POAs, permits, and miscellaneous documents tied to a party.
/// Tenant scoping is enforced by the DbContext (no manual tenant filter).
/// </summary>
public interface IProfileExtensionsRepository
{
    Task<ProfileExtensionsBundle> GetBundleAsync(long partyId, CancellationToken ct);

    Task<PartyPoa>      AddPoaAsync(long partyId, AddPoaRequest req, CancellationToken ct);
    Task<PartyPermit>   AddPermitAsync(long partyId, AddPermitRequest req, CancellationToken ct);
    Task<PartyMiscDoc>  AddMiscDocAsync(long partyId, AddMiscDocRequest req, CancellationToken ct);
}

/// <summary>One round-trip payload for the Profile Detail page.</summary>
public sealed record ProfileExtensionsBundle(
    long PartyId,
    IReadOnlyList<PartyPoa>      Poas,
    IReadOnlyList<PartyPermit>   Permits,
    IReadOnlyList<PartyMiscDoc>  MiscDocs);

public sealed record AddPoaRequest(
    string? PoaNumber, string? GrantedTo,
    LocalDate? EffectiveDate, LocalDate? ExpirationDate,
    PoaStatus Status, long? DocumentId, string? Notes);

public sealed record AddPermitRequest(
    PermitKind Kind, string PermitCode, string PermitName,
    string? IssuingAuthority, string? HsCode, long? ProductId,
    LocalDate? EffectiveDate, LocalDate? ExpirationDate,
    PermitStatus Status, long? DocumentId, string? Notes);

public sealed record AddMiscDocRequest(
    MiscDocCategory DocCategory, string Title,
    long? DocumentId, LocalDate? EffectiveDate, LocalDate? ExpirationDate, string? Notes);
