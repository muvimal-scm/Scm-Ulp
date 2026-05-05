using NodaTime;
using Ulp.M7.Domain.Entities;

namespace Ulp.M7.Application;

public interface IProcurementService
{
    /* PRs */
    Task<PrDto>                    CreatePrAsync(CreatePrRequest req, CancellationToken ct);
    Task<PrDetailDto?>             GetPrAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<PrDto>>     ListPrsAsync(PrListQuery q, CancellationToken ct);
    Task<PrDto>                    ChangePrStatusAsync(long id, PrStatus next, CancellationToken ct);
    Task<PrLineDto>                AddPrLineAsync(long prId, CreatePrLineRequest req, CancellationToken ct);

    /* RFQs */
    Task<RfqDto>                   CreateRfqAsync(CreateRfqRequest req, CancellationToken ct);
    Task<RfqDetailDto?>            GetRfqAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<RfqDto>>    ListRfqsAsync(CancellationToken ct);
    Task<RfqRecipientDto>          AddRfqRecipientAsync(long rfqId, long vendorPartyId, CancellationToken ct);
    Task<RfqResponseDto>           AddRfqResponseAsync(long rfqId, CreateRfqResponseRequest req, CancellationToken ct);

    /* POs */
    Task<PoDto>                    CreatePoAsync(CreatePoRequest req, CancellationToken ct);
    Task<PoDetailDto?>             GetPoAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<PoDto>>     ListPosAsync(PoListQuery q, CancellationToken ct);
    Task<PoDto>                    ChangePoStatusAsync(long id, PoStatus next, CancellationToken ct);
    Task<PoLineDto>                AddPoLineAsync(long poId, CreatePoLineRequest req, CancellationToken ct);

    /* GRNs */
    Task<GrnDto>                   CreateGrnAsync(CreateGrnRequest req, CancellationToken ct);
    Task<GrnDetailDto?>            GetGrnAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<GrnDto>>    ListGrnsAsync(long? poId, CancellationToken ct);

    /* Invoice match */
    Task<InvoiceMatchDto>          RecordMatchAsync(CreateMatchRequest req, CancellationToken ct);
    Task<IReadOnlyList<InvoiceMatchDto>> ListMatchesAsync(long? poId, CancellationToken ct);
}

/* ===================== Request DTOs ===================== */

public sealed record CreatePrRequest(
    string CountryCode, string PrNumber, long? RequestedBy,
    string? Department, LocalDate? NeededBy, string? Notes);

public sealed record CreatePrLineRequest(
    long? ProductId, string Description, decimal? Quantity, string? UomCode,
    decimal? EstimatedUnitPriceAmount, string? EstimatedUnitPriceCurrency);

public sealed record CreateRfqRequest(
    string CountryCode, string RfqNumber, LocalDate? DueDate, long? ScopePrId, string? Notes);

public sealed record CreateRfqResponseRequest(
    long VendorPartyId, decimal? TotalAmount, string? TotalCurrency,
    LocalDate? ValidUntil, long? DocumentId, string? Notes);

public sealed record CreatePoRequest(
    string CountryCode, string PoNumber, long VendorPartyId, long? RfqId,
    decimal? TotalAmount, string? TotalCurrency,
    LocalDate? ExpectedDeliveryDate, string? PaymentTerms, string? Notes);

public sealed record CreatePoLineRequest(
    long? ProductId, string Description, decimal? QuantityOrdered, string? UomCode,
    decimal? UnitPriceAmount, string? UnitPriceCurrency);

public sealed record CreateGrnRequest(
    long PoId, string GrnNumber, Instant ReceivedAt, long? ReceivedBy,
    long? M8GrnId, string? Remarks);

public sealed record CreateMatchRequest(
    long PoId, long? VendorInvoiceId, string? VendorInvoiceNo, MatchStatus Status,
    decimal? VarianceAmount, string? VarianceCurrency, string? Notes);

/* ===================== Query records ===================== */

public sealed record PrListQuery(
    PrStatus? Status = null, string? CountryCode = null, int Page = 1, int PageSize = 50);

public sealed record PoListQuery(
    PoStatus? Status = null, long? VendorPartyId = null,
    string? CountryCode = null, int Page = 1, int PageSize = 50);

/* ===================== Response DTOs ===================== */

public sealed record PrDto(
    long Id, int TenantId, string CountryCode, string PrNumber, long? RequestedBy,
    string? Department, PrStatus Status, LocalDate? NeededBy, string? Notes,
    int LineCount, Instant CreatedAt, Instant ModifiedAt);

public sealed record PrLineDto(
    long Id, long PrId, int LineNo, long? ProductId, string Description,
    decimal? Quantity, string? UomCode,
    decimal? EstimatedUnitPriceAmount, string? EstimatedUnitPriceCurrency);

public sealed record PrDetailDto(PrDto Pr, IReadOnlyList<PrLineDto> Lines);

public sealed record RfqDto(
    long Id, string CountryCode, string RfqNumber, LocalDate? DueDate,
    RfqStatus Status, long? ScopePrId, string? Notes,
    int RecipientCount, int ResponseCount, Instant CreatedAt);

public sealed record RfqRecipientDto(
    long Id, long RfqId, long VendorPartyId, Instant? SentAt, RfqRecipientStatus ResponseStatus);

public sealed record RfqResponseDto(
    long Id, long RfqId, long VendorPartyId,
    decimal? TotalAmount, string? TotalCurrency, LocalDate? ValidUntil,
    long? DocumentId, string? Notes, Instant ReceivedAt, bool IsWinner);

public sealed record RfqDetailDto(
    RfqDto Rfq,
    IReadOnlyList<RfqRecipientDto> Recipients,
    IReadOnlyList<RfqResponseDto> Responses);

public sealed record PoDto(
    long Id, int TenantId, string CountryCode, string PoNumber, long VendorPartyId, long? RfqId,
    PoStatus Status, decimal? TotalAmount, string? TotalCurrency,
    LocalDate? ExpectedDeliveryDate, string? PaymentTerms,
    int LineCount, int GrnCount, Instant CreatedAt, Instant ModifiedAt);

public sealed record PoLineDto(
    long Id, long PoId, int LineNo, long? ProductId, string Description,
    decimal? QuantityOrdered, decimal? QuantityReceived, string? UomCode,
    decimal? UnitPriceAmount, string? UnitPriceCurrency);

public sealed record PoDetailDto(
    PoDto Po,
    IReadOnlyList<PoLineDto> Lines,
    IReadOnlyList<GrnDto> Grns,
    IReadOnlyList<InvoiceMatchDto> Matches);

public sealed record GrnDto(
    long Id, long PoId, string GrnNumber, Instant ReceivedAt, long? ReceivedBy,
    long? M8GrnId, GrnStatus Status, string? Remarks, int LineCount);

public sealed record GrnLineDto(
    long Id, long GrId, long PoLineId, decimal QuantityReceived,
    GoodsCondition Cond, string? Remarks);

public sealed record GrnDetailDto(GrnDto Grn, IReadOnlyList<GrnLineDto> Lines);

public sealed record InvoiceMatchDto(
    long Id, long PoId, long? VendorInvoiceId, string? VendorInvoiceNo,
    MatchStatus MatchStatus, decimal? VarianceAmount, string? VarianceCurrency,
    long? MatchedBy, Instant MatchedAt, string? Notes);
