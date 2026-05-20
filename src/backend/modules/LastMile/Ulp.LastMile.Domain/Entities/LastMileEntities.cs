using NodaTime;

namespace Ulp.LastMile.Domain.Entities;

public sealed class CourierBooking
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    CountryCode { get; set; } = "";
    public string    BookingNumber { get; set; } = "";
    public CourierType CourierType { get; set; }
    public long?     ShipperPartyId { get; set; }
    public long?     ConsigneePartyId { get; set; }
    public long?     PickupAddressId { get; set; }
    public long?     DeliveryAddressId { get; set; }
    public decimal?  WeightKg { get; set; }
    public decimal?  DeclaredValueAmount { get; set; }
    public string?   DeclaredValueCurrency { get; set; }
    public CourierBookingStatus Status { get; set; } = CourierBookingStatus.Created;
    public int?      Pieces { get; set; }
    public string?   ServiceLevel { get; set; }
    public decimal?  CodAmount { get; set; }
    public string?   CodCurrency { get; set; }
    public Instant   CreatedAt { get; set; }
    public Instant   ModifiedAt { get; set; }
}

public enum CourierType { Domestic, International }
public enum CourierBookingStatus { Created, Scheduled, PickedUp, InTransit, OutForDelivery, Delivered, Failed, Returned, Cancelled }

public sealed class PickupSchedule
{
    public long       Id { get; set; }
    public int        TenantId { get; set; }
    public long       BookingId { get; set; }
    public LocalDate  ScheduledDate { get; set; }
    public string?    TimeWindow { get; set; }
    public long?      AssignedToUserId { get; set; }
    public PickupStatus Status { get; set; } = PickupStatus.Planned;
    public int        AttemptedCount { get; set; }
}

public enum PickupStatus { Planned, Dispatched, Completed, Failed, Rescheduled }

public sealed class Route
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    CountryCode { get; set; } = "";
    public string    RouteCode { get; set; } = "";
    public string?   Name { get; set; }
    public RouteType RouteType { get; set; }
    public LocalDate PlannedDate { get; set; }
    public RouteStatus Status { get; set; } = RouteStatus.Planned;
    public long?     DriverUserId { get; set; }
    public string?   VehicleNo { get; set; }
}

public enum RouteType   { Pickup, Delivery, Mixed }
public enum RouteStatus { Planned, InProgress, Completed, Cancelled }

public sealed class RouteStop
{
    public long       Id { get; set; }
    public long       RouteId { get; set; }
    public int        Sequence { get; set; }
    public string     CountryCode { get; set; } = "";
    public StopType   StopType { get; set; }
    public long?      AddressId { get; set; }
    public long?      PartyId { get; set; }
    public long?      BookingId { get; set; }
    public Instant?   ExpectedArrival { get; set; }
    public Instant?   ActualArrival { get; set; }
    public StopStatus Status { get; set; } = StopStatus.Pending;
}

public enum StopType   { Pickup, Delivery }
public enum StopStatus { Pending, Arrived, Completed, Skipped, Failed }

public sealed class Manifest
{
    public long       Id { get; set; }
    public int        TenantId { get; set; }
    public string     ManifestNumber { get; set; } = "";
    public long?      RouteId { get; set; }
    public CourierType CourierType { get; set; }
    public int?       TotalPieces { get; set; }
    public decimal?   TotalWeightKg { get; set; }
    public Instant    GeneratedAt { get; set; }
}

public sealed class ManifestLine
{
    public long     Id { get; set; }
    public long     ManifestId { get; set; }
    public long     BookingId { get; set; }
    public string?  AwbNumber { get; set; }
    public decimal? WeightKg { get; set; }
    public int?     Pieces { get; set; }
}

public sealed class Awb
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    AwbNumber { get; set; } = "";
    public long      BookingId { get; set; }
    public CourierType AwbType { get; set; }
    public AwbStatus Status { get; set; } = AwbStatus.Generated;
}

public enum AwbStatus { Generated, InTransit, Delivered, Cancelled, Returned }

public sealed class Pod
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public long      BookingId { get; set; }
    public string?   SignedBy { get; set; }
    public long?     SignatureImageDocId { get; set; }
    public long?     PhotoDocId { get; set; }
    public decimal?  GpsLat { get; set; }
    public decimal?  GpsLng { get; set; }
    public Instant   CapturedAt { get; set; }
    public long?     CapturedByUserId { get; set; }
}

public sealed class CodCollection
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public long      BookingId { get; set; }
    public decimal   AmountCollected { get; set; }
    public string    Currency { get; set; } = "";
    public CodPaymentMethod PaymentMethod { get; set; }
    public Instant   CollectedAt { get; set; }
    public CodSettledStatus SettledStatus { get; set; } = CodSettledStatus.Pending;
    public string?   ReferenceNo { get; set; }
}

public enum CodPaymentMethod { Cash, Card, Upi, Other }
public enum CodSettledStatus { Pending, Deposited, Settled, Disputed }

public sealed class WeightCorrection
{
    public long     Id { get; set; }
    public int      TenantId { get; set; }
    public long     BookingId { get; set; }
    public decimal  OriginalWeightKg { get; set; }
    public decimal  CorrectedWeightKg { get; set; }
    public string?  CorrectionReason { get; set; }
    public long?    CorrectedBy { get; set; }
    public Instant  CorrectedAt { get; set; }
    public decimal? BillingImpactAmount { get; set; }
    public string?  BillingImpactCurrency { get; set; }
}

public sealed class ZoneRate
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    CountryCode { get; set; } = "";
    public string    ZoneCode { get; set; } = "";
    public CourierType CourierType { get; set; }
    public decimal   WeightSlabFromKg { get; set; }
    public decimal   WeightSlabToKg { get; set; }
    public decimal   RateAmount { get; set; }
    public string    RateCurrency { get; set; } = "";
    public LocalDate ValidFrom { get; set; }
    public LocalDate? ValidTo { get; set; }
}

public sealed class PincodeZone
{
    public string CountryCode { get; set; } = "";
    public string Pincode { get; set; } = "";
    public string ZoneCode { get; set; } = "";
}

public sealed class DeliveryAttempt
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public long      BookingId { get; set; }
    public int       AttemptNo { get; set; }
    public Instant   AttemptedAt { get; set; }
    public AttemptStatus Status { get; set; }
    public string?   FailureReason { get; set; }
    public LocalDate? NextAttemptDate { get; set; }
}

public enum AttemptStatus { Delivered, Failed, PartiallyDelivered, Refused }

public sealed class M9Audit
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public M9EntityType EntityType { get; set; }
    public long    EntityId { get; set; }
    public string  Action { get; set; } = "";
    public long    PerformedBy { get; set; }
    public Instant PerformedAt { get; set; }
    public string? DetailsJson { get; set; }
}

public enum M9EntityType { Booking, Route, Manifest, Pod, Cod, Awb }

// ===== Ocean Drayage =====

public sealed class OceanDrayageJob
{
    public long       Id { get; set; }
    public int        TenantId { get; set; }
    public string     JobNumber { get; set; } = "";
    public string     ContainerNumber { get; set; } = "";
    public string?    AdditionalRefs { get; set; }
    public long?      TruckerPartyId { get; set; }
    public bool       AvailableForPickup { get; set; }
    public string?    Terminal { get; set; }
    public Instant?   PickupAppointment { get; set; }
    public string?    DropOffLocation { get; set; }
    public Instant?   DropOffAppointment { get; set; }
    public OdTripType TripType { get; set; } = OdTripType.LiveUnload;
    public OdStatus   Status { get; set; } = OdStatus.OutGate;
    public string?    SpecialInstructions { get; set; }
    public long?      ShipmentId { get; set; }
    public Instant    CreatedAt { get; set; }
    public Instant    ModifiedAt { get; set; }
}

public enum OdTripType { LiveUnload, Drop }
public enum OdStatus   { OutGate, EnRoute, ContainerMarkedEmpty, EmptyReturned }

// ===== Over-The-Road =====

public sealed class OtrJob
{
    public long       Id { get; set; }
    public int        TenantId { get; set; }
    public string     JobNumber { get; set; } = "";
    public string?    TrackingNumber { get; set; }
    public string?    AdditionalRefs { get; set; }
    public string?    PickUpLocation { get; set; }
    public Instant?   PickUpAppointment { get; set; }
    public string?    DropOffLocation { get; set; }
    public Instant?   DropOffAppointment { get; set; }
    public OdTripType TripType { get; set; } = OdTripType.LiveUnload;
    public OtrStatus  Status { get; set; } = OtrStatus.PickedUp;
    public string?    SpecialInstructions { get; set; }
    public long?      TruckerPartyId { get; set; }
    public Instant    CreatedAt { get; set; }
    public Instant    ModifiedAt { get; set; }
}

public enum OtrStatus { PickedUp, EnRoute, DroppedOff }
