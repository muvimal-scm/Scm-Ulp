using Ulp.Core.Domain.ValueObjects;
using Ulp.MasterData.Domain.Entities;

namespace Ulp.MasterData.Application.Parties;

/// <summary>
/// Read DTO for a party â€” what API responses serialise.
/// Money is emitted via MoneyJsonConverter as { amount, currency } per CLAUDE.md.
/// </summary>
public sealed record PartyDto(
    long Id,
    string CountryCode,
    PartyType PartyType,
    string LegalName,
    string? TradeName,
    long? ParentPartyId,
    bool IsActive,
    string? PreferredLocale,
    string? PreferredCurrency,
    string? DefaultPaymentTerms,
    Money? CreditLimit,
    string? TaxStatus,
    bool SanctionsScreened,
    string? SanctionsScreenedAtUtc,
    string CreatedAtUtc,
    string ModifiedAtUtc,
    IReadOnlyList<PartyIdentifierDto> Identifiers);

public sealed record PartyIdentifierDto(
    long Id,
    string IdentifierType,
    string IdentifierValue,
    bool IsPrimary,
    string ValidationStatus,
    string? ValidationSource,
    string? ValidatedAtUtc,
    string? ExpiresAtUtc);

/// <summary>Create-party request body.</summary>
public sealed record CreatePartyRequest(
    string CountryCode,
    PartyType PartyType,
    string LegalName,
    string? TradeName,
    long? ParentPartyId,
    string? PreferredLocale,
    string? PreferredCurrency,
    string? DefaultPaymentTerms,
    Money? CreditLimit,
    string? TaxStatus,
    IReadOnlyList<CreatePartyIdentifierRequest>? Identifiers);

public sealed record CreatePartyIdentifierRequest(
    string IdentifierType,
    string IdentifierValue,
    bool IsPrimary);

/// <summary>Update-party request body â€” same shape minus identifiers (those have their own endpoints).</summary>
public sealed record UpdatePartyRequest(
    PartyType PartyType,
    string LegalName,
    string? TradeName,
    long? ParentPartyId,
    bool IsActive,
    string? PreferredLocale,
    string? PreferredCurrency,
    string? DefaultPaymentTerms,
    Money? CreditLimit,
    string? TaxStatus);

public sealed record PartyListQuery(
    PartyType? PartyType,
    string? Search,
    bool IncludeInactive = false,
    int Page = 1,
    int PageSize = 50);
