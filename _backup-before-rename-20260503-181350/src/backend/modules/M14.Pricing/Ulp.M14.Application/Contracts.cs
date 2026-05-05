using NodaTime;
using Ulp.M14.Domain.Entities;

namespace Ulp.M14.Application;

public interface IPricingService
{
    // Rate cards
    Task<RateCardDto>                CreateRateCardAsync(CreateRateCardRequest req, CancellationToken ct);
    Task<RateCardDto?>               GetRateCardAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<RateCardDto>> ListRateCardsAsync(RateCardListQuery query, CancellationToken ct);
    Task<RateCardDto>                ApproveRateCardAsync(long id, CancellationToken ct);
    Task<RateCardLineDto>            AddRateCardLineAsync(long rateCardId, CreateRateCardLineRequest req, CancellationToken ct);
    Task<IReadOnlyList<RateCardLineDto>> GetRateCardLinesAsync(long rateCardId, CancellationToken ct);

    // Quotes
    Task<QuoteDto>                CreateQuoteAsync(CreateQuoteRequest req, CancellationToken ct);
    Task<QuoteDto?>               GetQuoteAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<QuoteDto>> ListQuotesAsync(QuoteListQuery query, CancellationToken ct);
    Task<QuoteLineDto>            AddQuoteLineAsync(long quoteId, CreateQuoteLineRequest req, CancellationToken ct);
    Task<IReadOnlyList<QuoteLineDto>> GetQuoteLinesAsync(long quoteId, CancellationToken ct);
    Task<QuoteDto>                ChangeQuoteStatusAsync(long id, QuoteStatus newStatus, CancellationToken ct);

    // Surcharges (read-side only in Phase 2.0)
    Task<IReadOnlyList<SurchargeDto>> ListSurchargesAsync(CancellationToken ct);

    // Contracts (read-side only in Phase 2.0)
    Task<IReadOnlyList<ContractDto>> ListContractsAsync(CancellationToken ct);
}

/* ----- request DTOs ----- */

public sealed record CreateRateCardRequest(
    string CountryCode,
    string CardNumber,
    RateCardType CardType,
    RateCardScope Scope,
    long? PartyId,
    long? OriginPortId,
    long? DestinationPortId,
    string? ServiceType,
    LocalDate ValidFrom,
    LocalDate? ValidTo,
    string Currency);

public sealed record CreateRateCardLineRequest(
    string ChargeCode,
    string? Description,
    string UomCode,
    decimal RateAmount,
    string RateCurrency,
    decimal? MinAmount = null,
    decimal? MaxAmount = null,
    bool IsTaxable = true,
    string? TaxClass = null);

public sealed record CreateQuoteRequest(
    string QuoteNumber,
    long CustomerPartyId,
    string? EnquiryRef,
    long? OriginPortId,
    long? DestinationPortId,
    string? ServiceType,
    LocalDate? ValidUntil,
    string? Notes);

public sealed record CreateQuoteLineRequest(
    string ChargeCode,
    string? Description,
    decimal? Quantity,
    string? UomCode,
    decimal? UnitPrice,
    string? Currency,
    long? RateCardId);

public sealed record RateCardListQuery(
    RateCardStatus? Status = null,
    RateCardType? CardType = null,
    string? CountryCode = null,
    int Page = 1, int PageSize = 50);

public sealed record QuoteListQuery(
    QuoteStatus? Status = null,
    long? CustomerPartyId = null,
    int Page = 1, int PageSize = 50);

/* ----- response DTOs ----- */

public sealed record RateCardDto(
    long Id, int TenantId, string CountryCode, string CardNumber,
    RateCardType CardType, RateCardScope Scope,
    long? PartyId, long? OriginPortId, long? DestinationPortId,
    string? ServiceType, LocalDate ValidFrom, LocalDate? ValidTo,
    string Currency, RateCardStatus Status,
    long? ApprovedBy, Instant? ApprovedAt,
    int LineCount, Instant CreatedAt, Instant ModifiedAt);

public sealed record RateCardLineDto(
    long Id, long RateCardId, int LineNumber, string ChargeCode, string? Description,
    string UomCode, decimal RateAmount, string RateCurrency,
    decimal? MinAmount, decimal? MaxAmount, bool IsTaxable, string? TaxClass);

public sealed record QuoteDto(
    long Id, int TenantId, string QuoteNumber, long CustomerPartyId, string? EnquiryRef,
    QuoteStatus Status, long? OriginPortId, long? DestinationPortId, string? ServiceType,
    decimal? TotalAmount, string? TotalCurrency, LocalDate? ValidUntil,
    long? DocumentId, string? Notes,
    int LineCount, Instant CreatedAt, Instant ModifiedAt);

public sealed record QuoteLineDto(
    long Id, long QuoteId, int LineNumber, string ChargeCode, string? Description,
    decimal? Quantity, string? UomCode, decimal? UnitPrice,
    decimal? Amount, string? Currency, long? RateCardId);

public sealed record SurchargeDto(
    long Id, string Code, string Name, SurchargeType SurchargeType,
    decimal? Amount, string? Currency, decimal? Percent,
    LocalDate ValidFrom, LocalDate? ValidTo, bool IsActive);

public sealed record ContractDto(
    long Id, string ContractNumber, long CustomerPartyId, long? RateCardId,
    LocalDate StartDate, LocalDate? EndDate, bool AutoRenew,
    string? PaymentTerms, ContractStatus Status, long? DocumentId);
