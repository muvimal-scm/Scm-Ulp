using NodaTime;
using Ulp.LastMile.Domain.Entities;

namespace Ulp.LastMile.Application;

public interface ILastMileService
{
    /* Bookings */
    Task<CourierBookingDto>                 CreateBookingAsync(CreateCourierBookingRequest req, CancellationToken ct);
    Task<CourierBookingDetailDto?>          GetBookingAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<CourierBookingDto>>  ListBookingsAsync(CourierBookingListQuery q, CancellationToken ct);
    Task<CourierBookingDto>                 ChangeBookingStatusAsync(long id, CourierBookingStatus next, CancellationToken ct);

    /* Routes */
    Task<RouteDto>                          CreateRouteAsync(CreateRouteRequest req, CancellationToken ct);
    Task<RouteDetailDto?>                   GetRouteAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<RouteDto>>           ListRoutesAsync(CancellationToken ct);

    /* Manifests */
    Task<IReadOnlyList<ManifestDto>>        ListManifestsAsync(CancellationToken ct);

    /* PODs */
    Task<PodDto>                            RecordPodAsync(CreatePodRequest req, CancellationToken ct);
    Task<IReadOnlyList<PodDto>>             ListPodsAsync(long? bookingId, CancellationToken ct);

    /* COD */
    Task<CodDto>                            RecordCodAsync(CreateCodRequest req, CancellationToken ct);
    Task<IReadOnlyList<CodDto>>             ListCodAsync(CodSettledStatus? status, CancellationToken ct);

    /* Delivery attempts */
    Task<DeliveryAttemptDto>                RecordAttemptAsync(CreateAttemptRequest req, CancellationToken ct);
    Task<IReadOnlyList<DeliveryAttemptDto>> ListAttemptsAsync(long bookingId, CancellationToken ct);

    /* Zone rates / pincodes (read-only) */
    Task<IReadOnlyList<ZoneRateDto>>        ListZoneRatesAsync(string? countryCode, CourierType? type, CancellationToken ct);

    /* Ocean Drayage */
    Task<OceanDrayageJobDto>                CreateOdJobAsync(CreateOdJobRequest req, CancellationToken ct);
    Task<OceanDrayageJobDto>                UpdateOdJobAsync(long id, UpdateOdJobRequest req, CancellationToken ct);
    Task<OceanDrayageJobDto?>               GetOdJobAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<OceanDrayageJobDto>> ListOdJobsAsync(OdStatus? status, CancellationToken ct);
    Task                                    DeleteOdJobAsync(long id, CancellationToken ct);

    /* Over-The-Road */
    Task<OtrJobDto>                CreateOtrJobAsync(CreateOtrJobRequest req, CancellationToken ct);
    Task<OtrJobDto>                UpdateOtrJobAsync(long id, UpdateOtrJobRequest req, CancellationToken ct);
    Task<OtrJobDto?>               GetOtrJobAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<OtrJobDto>> ListOtrJobsAsync(OtrStatus? status, CancellationToken ct);
    Task                           DeleteOtrJobAsync(long id, CancellationToken ct);
}

/* ===== Request DTOs ===== */

public sealed record CreateCourierBookingRequest(
    string CountryCode, string BookingNumber, CourierType CourierType,
    long? ShipperPartyId, long? ConsigneePartyId,
    long? PickupAddressId, long? DeliveryAddressId,
    decimal? WeightKg, int? Pieces, string? ServiceLevel,
    decimal? DeclaredValueAmount, string? DeclaredValueCurrency,
    decimal? CodAmount, string? CodCurrency);

public sealed record CreateRouteRequest(
    string CountryCode, string RouteCode, string? Name,
    RouteType RouteType, LocalDate PlannedDate,
    long? DriverUserId, string? VehicleNo);

public sealed record CreatePodRequest(
    long BookingId, string? SignedBy,
    long? SignatureImageDocId, long? PhotoDocId,
    decimal? GpsLat, decimal? GpsLng,
    Instant CapturedAt, long? CapturedByUserId);

public sealed record CreateCodRequest(
    long BookingId, decimal AmountCollected, string Currency,
    CodPaymentMethod PaymentMethod, Instant CollectedAt, string? ReferenceNo);

public sealed record CreateAttemptRequest(
    long BookingId, Instant AttemptedAt, AttemptStatus Status,
    string? FailureReason, LocalDate? NextAttemptDate);

public sealed record CourierBookingListQuery(
    CourierBookingStatus? Status = null, CourierType? CourierType = null,
    string? CountryCode = null, int Page = 1, int PageSize = 50);

/* ===== Response DTOs ===== */

public sealed record CourierBookingDto(
    long Id, int TenantId, string CountryCode, string BookingNumber,
    CourierType CourierType, long? ShipperPartyId, long? ConsigneePartyId,
    long? PickupAddressId, long? DeliveryAddressId,
    decimal? WeightKg, int? Pieces, string? ServiceLevel,
    decimal? DeclaredValueAmount, string? DeclaredValueCurrency,
    decimal? CodAmount, string? CodCurrency,
    CourierBookingStatus Status, int AttemptCount, bool HasPod,
    Instant CreatedAt, Instant ModifiedAt);

public sealed record CourierBookingDetailDto(
    CourierBookingDto Booking,
    IReadOnlyList<DeliveryAttemptDto> Attempts,
    IReadOnlyList<PodDto> Pods,
    IReadOnlyList<CodDto> CodCollections);

public sealed record RouteDto(
    long Id, string CountryCode, string RouteCode, string? Name,
    RouteType RouteType, LocalDate PlannedDate, RouteStatus Status,
    long? DriverUserId, string? VehicleNo, int StopCount);

public sealed record RouteStopDto(
    long Id, long RouteId, int Sequence, string CountryCode,
    StopType StopType, long? AddressId, long? PartyId, long? BookingId,
    Instant? ExpectedArrival, Instant? ActualArrival, StopStatus Status);

public sealed record RouteDetailDto(RouteDto Route, IReadOnlyList<RouteStopDto> Stops);

public sealed record ManifestDto(
    long Id, string ManifestNumber, long? RouteId,
    CourierType CourierType, int? TotalPieces, decimal? TotalWeightKg,
    Instant GeneratedAt, int LineCount);

public sealed record PodDto(
    long Id, long BookingId, string? SignedBy,
    long? SignatureImageDocId, long? PhotoDocId,
    decimal? GpsLat, decimal? GpsLng,
    Instant CapturedAt, long? CapturedByUserId);

public sealed record CodDto(
    long Id, long BookingId, decimal AmountCollected, string Currency,
    CodPaymentMethod PaymentMethod, Instant CollectedAt,
    CodSettledStatus SettledStatus, string? ReferenceNo);

public sealed record DeliveryAttemptDto(
    long Id, long BookingId, int AttemptNo, Instant AttemptedAt,
    AttemptStatus Status, string? FailureReason, LocalDate? NextAttemptDate);

/* ===== Ocean Drayage ===== */

public sealed record CreateOdJobRequest(
    string JobNumber, string ContainerNumber, string? AdditionalRefs,
    long? TruckerPartyId, bool AvailableForPickup, string? Terminal,
    string? PickupAppointment, string? DropOffLocation, string? DropOffAppointment,
    string TripType, string? SpecialInstructions, long? ShipmentId);

public sealed record UpdateOdJobRequest(
    string? ContainerNumber, string? AdditionalRefs, long? TruckerPartyId,
    bool? AvailableForPickup, string? Terminal,
    string? PickupAppointment, string? DropOffLocation, string? DropOffAppointment,
    string? TripType, string? Status, string? SpecialInstructions);

public sealed record OceanDrayageJobDto(
    long Id, int TenantId, string JobNumber, string ContainerNumber,
    string? AdditionalRefs, long? TruckerPartyId, bool AvailableForPickup,
    string? Terminal, Instant? PickupAppointment,
    string? DropOffLocation, Instant? DropOffAppointment,
    string TripType, string Status, string? SpecialInstructions,
    long? ShipmentId, Instant CreatedAt, Instant ModifiedAt);

/* ===== OTR ===== */

public sealed record CreateOtrJobRequest(
    string JobNumber, string? TrackingNumber, string? AdditionalRefs,
    string? PickUpLocation, string? PickUpAppointment,
    string? DropOffLocation, string? DropOffAppointment,
    string TripType, string? SpecialInstructions, long? TruckerPartyId);

public sealed record UpdateOtrJobRequest(
    string? TrackingNumber, string? AdditionalRefs,
    string? PickUpLocation, string? PickUpAppointment,
    string? DropOffLocation, string? DropOffAppointment,
    string? TripType, string? Status, string? SpecialInstructions);

public sealed record OtrJobDto(
    long Id, int TenantId, string JobNumber, string? TrackingNumber,
    string? AdditionalRefs, string? PickUpLocation, Instant? PickUpAppointment,
    string? DropOffLocation, Instant? DropOffAppointment,
    string TripType, string Status, string? SpecialInstructions,
    long? TruckerPartyId, Instant CreatedAt, Instant ModifiedAt);

public sealed record ZoneRateDto(
    long Id, string CountryCode, string ZoneCode, CourierType CourierType,
    decimal WeightSlabFromKg, decimal WeightSlabToKg,
    decimal RateAmount, string RateCurrency,
    LocalDate ValidFrom, LocalDate? ValidTo);
