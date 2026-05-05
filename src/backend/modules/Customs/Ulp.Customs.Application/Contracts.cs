using NodaTime;
using Ulp.Customs.Domain.Entities;

namespace Ulp.Customs.Application;

// =====================================================================
// M4 Customs application contract â€” currently the M4-US plugin surface
// per sealed LLD Â§11. The country-agnostic M4-Core endpoints will be
// added when M4-Core LLD is sealed.
// =====================================================================

public interface ICustomsService
{
    // Entries (read-only for Phase-1 demo; create/submit deferred to ABI integration)
    Task<IReadOnlyList<EntryDto>>     ListEntriesAsync(EntryListQuery q, CancellationToken ct);
    Task<EntryDetailDto?>             GetEntryAsync(long id, CancellationToken ct);

    // Bonds
    Task<IReadOnlyList<BondDto>>      ListBondsAsync(CancellationToken ct);

    // ATM (Authority to Make Entry)
    Task<IReadOnlyList<AtmDto>>       ListAtmAsync(CancellationToken ct);

    // Release orders / Letters of Guarantee
    Task<IReadOnlyList<ReleaseOrderDto>> ListReleaseOrdersAsync(long? entryId, CancellationToken ct);

    // ISF
    Task<IReadOnlyList<IsfDto>>       ListIsfAsync(CancellationToken ct);

    // PGA holds
    Task<IReadOnlyList<PgaHoldDto>>   ListPgaHoldsAsync(bool activeOnly, CancellationToken ct);

    // Customs Hold/Exam notices
    Task<IReadOnlyList<HoldExamDto>>  ListHoldExamsAsync(bool openOnly, CancellationToken ct);

    // In-bond moves
    Task<IReadOnlyList<InBondDto>>    ListInBondMovesAsync(CancellationToken ct);

    // ABI message log
    Task<IReadOnlyList<AbiMessageDto>> ListAbiMessagesAsync(long? entryId, int max, CancellationToken ct);
}

public sealed record EntryListQuery(AbiStatus? Status, bool? PgaHoldOnly, int Page, int PageSize);

public sealed record EntryDto(
    long Id, int TenantId, long? ShipmentId, string? EntryNumber,
    string FilerCode, string EntryType, string? EntryTypeDescription,
    long ImporterOfRecordId, string? ImporterName, string ImporterEin,
    long? BondId,
    string CarrierScac, string? VesselName, string? VoyageNumber,
    string PortOfUnladingCode, string PortOfEntryCode, string? FirmsCode,
    LocalDate EntryDate, LocalDate ImportDate, LocalDate? ReleaseDate,
    string? BillOfLading, AbiStatus AbiStatus, string? CbpStatusMessage,
    bool PgaHoldFlag, ExamType ExamType,
    decimal? TotalValueUsd, decimal? DutyAmountUsd, decimal? MpfUsd, decimal? HmfUsd, decimal? TotalFeesUsd,
    int LineCount, int ActivePgaHoldCount, int OpenHoldExamCount,
    Instant CreatedAt, Instant? SubmittedAt, Instant? ReleasedAt);

public sealed record EntryDetailDto(
    EntryDto Entry,
    IReadOnlyList<EntryLineDto> Lines,
    IReadOnlyList<PgaHoldDto> PgaHolds,
    IReadOnlyList<HoldExamDto> HoldExams,
    IReadOnlyList<ReleaseOrderDto> ReleaseOrders,
    IReadOnlyList<AbiMessageDto> AbiMessages,
    BondDto? Bond);

public sealed record EntryLineDto(
    long Id, long EntryId, int LineNumber, string HtsNumber, string Description,
    string CountryOfOrigin, decimal Quantity, string UnitOfMeasure, decimal? NetWeightKg,
    decimal InvoiceValueUsd, string InvoiceCurrency, decimal InvoiceValueOrig, decimal? FxRate,
    decimal? DutyRatePct, decimal? DutyAmountUsd,
    string? AddCaseNumber, string? CvdCaseNumber, decimal? AddRatePct, decimal? CvdRatePct,
    string? SpecialProgram,
    bool FdaRequired, bool UsdaRequired, bool EpaRequired, bool FccRequired,
    string? ManufacturerIdCode);

public sealed record BondDto(
    long Id, string BondNumber, BondType BondType, string SuretyCode, string SuretyName,
    long ImporterPartyId, string? ImporterName,
    decimal AmountUsd, LocalDate EffectiveFrom, LocalDate? EffectiveTo,
    BondStatus Status, decimal UtilizationPct, string? Notes);

public sealed record AtmDto(
    long Id, long ImporterPartyId, string? ImporterName,
    string BrokerFilerCode, bool CombinedWithPoa,
    LocalDate SignedAt, LocalDate EffectiveFrom, LocalDate? EffectiveTo,
    string SignerName, string? SignerTitle, AtmStatus Status, string? Notes);

public sealed record ReleaseOrderDto(
    long Id, long EntryId, ReleaseOrderType OrderType, string ReferenceNumber,
    long? CarrierPartyId, long? WarehousePartyId,
    LocalDate IssuedAt, LocalDate? CargoPickupAt, ReleaseOrderStatus Status, string? Notes);

public sealed record IsfDto(
    long Id, long ShipmentId, long ImporterOfRecordId, string? ImporterName,
    string ImporterNumber, string? SellerName, string? BuyerName, string? ShipToName,
    string? ManufacturerName, string? CountryOfOrigin, string? Hts6,
    string? ContainerStuffingLocation, string? ConsolidatorName,
    IsfStatus FilingStatus, Instant? FiledAt, Instant? VesselLoadCutoff, long? BondId);

public sealed record PgaHoldDto(
    long Id, long EntryId, string? EntryNumber,
    PgaCode PgaCode, string? HoldReasonCode, string? HoldReasonText,
    PgaHoldStatus Status, Instant RaisedAt, Instant? ReleasedAt, string? ResolutionNote);

public sealed record HoldExamDto(
    long Id, long EntryId, string? EntryNumber,
    HoldExamType NoticeType, ExamType ExamType,
    string? HoldReasonCode, string? HoldReasonText,
    string? ExamSite, Instant? ExamAppointmentAt,
    HoldExamStatus Status, Instant RaisedAt, Instant? ResolvedAt, string? ResolutionNote);

public sealed record InBondDto(
    long Id, long? EntryId, string InBondNumber, InBondType InBondType,
    string CarrierScac, string OriginPortCode, string DestinationPortCode,
    LocalDate InitiatedAt, LocalDate? ArrivedAt, InBondStatus Status, string? Notes);

public sealed record AbiMessageDto(
    long Id, long? EntryId, string MessageCode, AbiDirection Direction,
    AbiMessageStatus Status, int AttemptCount, string? CbpReference,
    Instant CreatedAt, Instant? SentAt, Instant? AcknowledgedAt, string? FailureReason);
