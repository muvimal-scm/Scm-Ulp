using NodaTime;
using Ulp.FreightForwarding.Domain.Entities;

namespace Ulp.FreightForwarding.Application;

public interface IFreightService
{
    /* Bookings */
    Task<BookingDto>                  CreateBookingAsync(CreateBookingRequest req, CancellationToken ct);
    Task<BookingDetailDto?>           GetBookingAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<BookingDto>>   ListBookingsAsync(BookingListQuery q, CancellationToken ct);
    Task<BookingDto>                  ChangeBookingStatusAsync(long id, BookingStatus next, CancellationToken ct);
    Task<BookingLineDto>              AddBookingLineAsync(long bookingId, CreateBookingLineRequest req, CancellationToken ct);

    /* Shipments */
    Task<ShipmentDto>                 CreateShipmentAsync(CreateShipmentRequest req, CancellationToken ct);
    Task<ShipmentDetailDto?>          GetShipmentAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<ShipmentDto>>  ListShipmentsAsync(ShipmentListQuery q, CancellationToken ct);
    Task<ShipmentDto>                 ChangeShipmentStatusAsync(long id, ShipmentStatus next, CancellationToken ct);

    /* MBL / HBL / AWB */
    Task<MblDto>                      AddMblAsync(long shipmentId, CreateMblRequest req, CancellationToken ct);
    Task<HblDto>                      AddHblAsync(CreateHblRequest req, CancellationToken ct);
    Task<AwbDto>                      AddAwbAsync(long shipmentId, CreateAwbRequest req, CancellationToken ct);
    Task<IReadOnlyList<MblDto>>       ListMblsAsync(long shipmentId, CancellationToken ct);
    Task<IReadOnlyList<HblDto>>       ListHblsAsync(long? mblId, CancellationToken ct);
    Task<IReadOnlyList<AwbDto>>       ListAwbsAsync(long shipmentId, CancellationToken ct);

    /* Containers */
    Task<ContainerDto>                AddContainerAsync(long shipmentId, CreateContainerRequest req, CancellationToken ct);
    Task<IReadOnlyList<ContainerDto>> ListContainersAsync(long shipmentId, CancellationToken ct);
    Task<ContainerDto>                ChangeContainerStatusAsync(long id, ContainerStatus next, CancellationToken ct);

    /* Milestones */
    Task<MilestoneDto>                AddMilestoneAsync(long shipmentId, CreateMilestoneRequest req, CancellationToken ct);
    Task<IReadOnlyList<MilestoneDto>> ListMilestonesAsync(long shipmentId, CancellationToken ct);

    /* Charges */
    Task<ChargeLineDto>               AddChargeAsync(long shipmentId, CreateChargeRequest req, CancellationToken ct);
    Task<IReadOnlyList<ChargeLineDto>> ListChargesAsync(long shipmentId, CancellationToken ct);

    /* CP13 v2 delta — landed cost roll-up */
    Task<LandedCostDto>               GetLandedCostAsync(long shipmentId, CancellationToken ct);

    /* Read-only roll-ups */
    Task<IReadOnlyList<ConsolDto>>    ListConsolsAsync(CancellationToken ct);
    Task<IReadOnlyList<DemurrageEventDto>> ListDemurrageAsync(long? containerId, CancellationToken ct);

    /* SCM Milestone 1 — internal memo notes per shipment */
    Task<ShipmentMemoDto>             AddMemoAsync(long shipmentId, AddMemoRequest req, CancellationToken ct);
    Task<IReadOnlyList<ShipmentMemoDto>> ListMemosAsync(long shipmentId, CancellationToken ct);

    /* SCM Milestone 1+2 — watchlist (starred shipments per user) */
    Task<bool>                        StarShipmentAsync(long shipmentId, string userSub, CancellationToken ct);
    Task<bool>                        UnstarShipmentAsync(long shipmentId, string userSub, CancellationToken ct);
    Task<IReadOnlyList<long>>         ListWatchlistShipmentIdsAsync(string userSub, CancellationToken ct);

    /* SCM Milestone 1+2 — operational holds */
    Task<ShipmentHoldDto>             PlaceHoldAsync(long shipmentId, PlaceHoldRequest req, long? raisedByUserId, CancellationToken ct);
    Task<ShipmentHoldDto>             ClearHoldAsync(long holdId, ClearHoldRequest req, long? clearedByUserId, CancellationToken ct);
    Task<IReadOnlyList<ShipmentHoldDto>> ListHoldsAsync(long shipmentId, bool includeCleared, CancellationToken ct);

    /* SCM Milestone 1+2 — date-driven reminders */
    Task<ShipmentReminderDto>         AddReminderAsync(long shipmentId, AddReminderRequest req, CancellationToken ct);
    Task<IReadOnlyList<ShipmentReminderDto>> ListRemindersAsync(ReminderListQuery q, CancellationToken ct);
    Task<ShipmentReminderDto>         ChangeReminderStatusAsync(long reminderId, ReminderStatus next, Instant? snoozeUntil, CancellationToken ct);
    /// <summary>Run all Pending reminders that are due (DueAt &lt;= now). Returns counts. Phase 5 wires this to Hangfire.</summary>
    Task<RemindersFiredDto>           RunDueRemindersAsync(CancellationToken ct);
}

public sealed record AddMemoRequest(string Body, bool IsPinned = false, long? AuthorUserId = null);
public sealed record ShipmentMemoDto(long Id, long ShipmentId, long? AuthorUserId, string Body, bool IsPinned, Instant CreatedAt);

/* SCM Milestone 1+2 — Hold + Reminder DTOs */
public sealed record PlaceHoldRequest(HoldType HoldType, string Reason);
public sealed record ClearHoldRequest(string? ResolutionNote);
public sealed record ShipmentHoldDto(
    long Id, long ShipmentId, HoldType HoldType, string Reason,
    long? RaisedBy, Instant RaisedAt,
    long? ClearedBy, Instant? ClearedAt, string? ResolutionNote,
    bool IsActive);

public sealed record AddReminderRequest(
    ReminderKind ReminderKind, string Title, string? Notes,
    Instant DueAt, long? ContainerId, string? AssignedUserSub);

public sealed record ReminderListQuery(
    long? ShipmentId = null,
    ReminderStatus? Status = null,
    bool DueNow = false,                   // shorthand for status=Pending AND due_at <= now
    string? AssignedUserSub = null,
    int Page = 1, int PageSize = 100);

public sealed record ShipmentReminderDto(
    long Id, long ShipmentId, long? ContainerId,
    ReminderKind ReminderKind, string Title, string? Notes,
    Instant DueAt, string? AssignedUserSub,
    ReminderStatus Status, Instant CreatedAt, Instant ModifiedAt, Instant? LastFiredAt);

public sealed record RemindersFiredDto(int CheckedCount, int FiredCount, int FailedCount);

/* ===================== Request DTOs ===================== */

public sealed record CreateBookingRequest(
    string CountryCode, string BookingNumber, long CustomerPartyId,
    long? ShipperPartyId, long? ConsigneePartyId, long? NotifyPartyId,
    TradeDirection TradeDirection, TransportMode Mode, ServiceType ServiceType,
    string? Incoterm, long OriginPortId, long DestinationPortId,
    LocalDate? ExpectedPickupDate, LocalDate? ExpectedDeliveryDate,
    decimal? DeclaredValueAmount, string? DeclaredValueCurrency,
    LocalDate? EstimatedCrd, long? FfAssignedPartyId, string? Remarks);

public sealed record CreateBookingLineRequest(
    string Description, string? HsCode, int? Pieces, string? PackagingType,
    decimal? GrossWeightKg, decimal? VolumeCbm, bool IsHazmat = false, bool IsPerishable = false);

public sealed record CreateShipmentRequest(
    string CountryCode, string ShipmentNumber, long? BookingId, TransportMode Mode,
    long CarrierPartyId, string? VesselOrFlight, string? VoyageOrFlightNo,
    Instant? Etd, Instant? Eta, long OriginPortId, long DestinationPortId, string? Remarks);

public sealed record CreateMblRequest(
    string CountryCode, string MblNumber, BlType BlType,
    long IssuedByCarrierPartyId, ReleaseType ReleaseType,
    LocalDate? IssueDate, LocalDate? OnBoardDate);

public sealed record CreateHblRequest(
    string CountryCode, long? MblId, string HblNumber,
    long? ShipperPartyId, long? ConsigneePartyId, long? NotifyPartyId,
    ReleaseType ReleaseType, LocalDate? IssueDate);

public sealed record CreateAwbRequest(
    AwbType AwbType, string AwbNumber, long? ParentAwbId,
    string? IataCarrierCode, string? FlightNumber);

public sealed record CreateContainerRequest(
    string ContainerNumber, string ContainerType, string? SealNumber,
    decimal? TareWeightKg, decimal? CargoWeightKg, int? FreeDays);

public sealed record CreateMilestoneRequest(
    string MilestoneCode, Instant OccurredAt, long? LocationPortId,
    MilestoneSource Source, string? Remarks);

public sealed record CreateChargeRequest(
    string ChargeCode, long? RateCardId, decimal? Quantity, string? UomCode,
    decimal? UnitPriceAmount, string? UnitPriceCurrency,
    decimal? AmountAmount, string? AmountCurrency, bool IsBillable = true);

/* ===================== Query records ===================== */

public sealed record BookingListQuery(
    BookingStatus? Status = null, long? CustomerPartyId = null,
    TransportMode? Mode = null, string? CountryCode = null,
    int Page = 1, int PageSize = 50);

public sealed record ShipmentListQuery(
    ShipmentStatus? Status = null, TransportMode? Mode = null,
    string? CountryCode = null,
    // SCM Milestone 2 Control Tower filters (added 2026-05-03):
    TradeDirection? Direction = null,           // 'IMPORT' / 'EXPORT' (joined from booking)
    string? ShipmentNumber = null,              // contains-match (file #)
    string? MblNumber = null,                   // contains-match across linked MBLs
    string? HblNumber = null,                   // contains-match across HBLs (via MBL → HBL)
    string? ContainerNumber = null,             // contains-match across containers
    long? CustomerPartyId = null,               // exact match on booking.customer_party_id
    long? OriginPortId = null,
    long? DestinationPortId = null,
    LocalDate? EtaFrom = null, LocalDate? EtaTo = null,
    // SCM Milestone 1+2 watchlist:
    bool   StarredOnly = false,                 // restrict to current user's starred set
    string? UserSub = null,                     // populated by the endpoint from JWT 'sub'; used for IsStarred + StarredOnly
    int Page = 1, int PageSize = 50);

/* ===================== Response DTOs ===================== */

public sealed record BookingDto(
    long Id, int TenantId, string CountryCode, string BookingNumber,
    long CustomerPartyId, TradeDirection TradeDirection, TransportMode Mode,
    ServiceType ServiceType, string? Incoterm,
    long OriginPortId, long DestinationPortId,
    LocalDate? ExpectedPickupDate, LocalDate? ExpectedDeliveryDate,
    BookingStatus Status, int? TotalPieces, decimal? TotalGrossWeightKg, decimal? TotalVolumeCbm,
    decimal? DeclaredValueAmount, string? DeclaredValueCurrency,
    LocalDate? EstimatedCrd, long? FfAssignedPartyId,
    int LineCount, Instant CreatedAt, Instant ModifiedAt);

public sealed record BookingLineDto(
    long Id, long BookingId, int LineNumber, string Description,
    string? HsCode, int? Pieces, string? PackagingType,
    decimal? GrossWeightKg, decimal? VolumeCbm, bool IsHazmat, bool IsPerishable);

public sealed record BookingDetailDto(BookingDto Booking, IReadOnlyList<BookingLineDto> Lines);

public sealed record ShipmentDto(
    long Id, int TenantId, string CountryCode, string ShipmentNumber,
    long? BookingId, TransportMode Mode, long CarrierPartyId,
    string? VesselOrFlight, string? VoyageOrFlightNo,
    Instant? Etd, Instant? Eta, Instant? Atd, Instant? Ata,
    long OriginPortId, long DestinationPortId,
    ShipmentStatus Status, int ContainerCount, int MilestoneCount,
    bool IsStarred,                              // SCM Milestone 1+2: starred by the calling user
    int ActiveHoldCount,                         // SCM Milestone 1+2: open holds against this shipment
    int DueReminderCount,                        // SCM Milestone 1+2: Pending reminders with due_at <= now
    Instant CreatedAt, Instant ModifiedAt,
    TradeDirection? TradeDirection = null);      // CP13 v2 delta: surfaced for Ocean/Air × Imp/Exp tab filter

// CP13 v2 client doc delta — landed cost summary per shipment.
// Aggregates m5_charge_line by charge category. Not authoritative customs/tax
// math — that's M4-US ABI integration territory. This is the operational
// "what did we pay landing this freight" rollup the v2 doc asks for.
public sealed record LandedCostDto(
    long ShipmentId,
    string Currency,
    decimal FreightAmount,           // OCEAN_FREIGHT, AIR_FREIGHT, FUEL, etc.
    decimal BrokerageAmount,         // BROKERAGE, CUSTOMS_CLEARANCE
    decimal DutyAmount,              // DUTY, TAX (excludes invoice tax)
    decimal AccessorialsAmount,      // DEMURRAGE, DETENTION, STORAGE, HANDLING
    decimal OtherAmount,             // anything else
    decimal TotalAmount);            // sum of the above

public sealed record ShipmentDetailDto(
    ShipmentDto Shipment,
    IReadOnlyList<ContainerDto> Containers,
    IReadOnlyList<MilestoneDto> Milestones,
    IReadOnlyList<MblDto> Mbls,
    IReadOnlyList<AwbDto> Awbs,
    IReadOnlyList<ChargeLineDto> Charges);

public sealed record MblDto(
    long Id, long ShipmentId, string CountryCode, string MblNumber,
    BlType BlType, long IssuedByCarrierPartyId, ReleaseType ReleaseType,
    LocalDate? IssueDate, LocalDate? OnBoardDate, long? DocumentId, BlStatus Status);

public sealed record HblDto(
    long Id, long? MblId, string CountryCode, string HblNumber,
    long? ShipperPartyId, long? ConsigneePartyId, long? NotifyPartyId,
    ReleaseType ReleaseType, LocalDate? IssueDate, long? DocumentId, BlStatus Status);

public sealed record AwbDto(
    long Id, long ShipmentId, AwbType AwbType, string AwbNumber,
    long? ParentAwbId, string? IataCarrierCode, string? FlightNumber,
    long? DocumentId, AwbStatus Status);

public sealed record ContainerDto(
    long Id, long ShipmentId, string ContainerNumber, string ContainerType,
    string? SealNumber, decimal? TareWeightKg, decimal? CargoWeightKg,
    Instant? PackedAt, Instant? LoadedAt, Instant? DischargedAt,
    Instant? GateOutAt, int? FreeDays, ContainerStatus Status);

public sealed record MilestoneDto(
    long Id, long ShipmentId, string MilestoneCode, Instant OccurredAt,
    long? LocationPortId, MilestoneSource Source, string? Remarks);

public sealed record ChargeLineDto(
    long Id, long ShipmentId, string ChargeCode, long? RateCardId,
    decimal? Quantity, string? UomCode,
    decimal? UnitPriceAmount, string? UnitPriceCurrency,
    decimal? AmountAmount, string? AmountCurrency,
    bool IsBillable, ChargeInvoiceStatus InvoiceStatus);

public sealed record ConsolDto(
    long Id, string ConsolNumber, ConsolType ConsolType,
    long MasterShipmentId, ConsolStatus Status, Instant CreatedAt);

public sealed record DemurrageEventDto(
    long Id, long ContainerId, DemurrageType EventType,
    LocalDate StartDate, LocalDate? EndDate, int? Days,
    decimal? RateAmount, string? RateCurrency,
    decimal? TotalAmount, string? TotalCurrency, DemurrageStatus Status);
