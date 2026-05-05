using NodaTime;

namespace Ulp.M5.Domain.Entities;

/* ===================== Booking ===================== */
public sealed class Booking
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    CountryCode { get; set; } = "";
    public string    BookingNumber { get; set; } = "";
    public long      CustomerPartyId { get; set; }
    public long?     ShipperPartyId { get; set; }
    public long?     ConsigneePartyId { get; set; }
    public long?     NotifyPartyId { get; set; }
    public TradeDirection TradeDirection { get; set; }
    public TransportMode  Mode { get; set; }
    public ServiceType    ServiceType { get; set; }
    public string?   Incoterm { get; set; }
    public long      OriginPortId { get; set; }
    public long      DestinationPortId { get; set; }
    public long?     PickupAddressId { get; set; }
    public long?     DeliveryAddressId { get; set; }
    public LocalDate? ExpectedPickupDate { get; set; }
    public LocalDate? ExpectedDeliveryDate { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Draft;
    public int?      TotalPieces { get; set; }
    public decimal?  TotalGrossWeightKg { get; set; }
    public decimal?  TotalVolumeCbm { get; set; }
    public decimal?  DeclaredValueAmount { get; set; }
    public string?   DeclaredValueCurrency { get; set; }
    // SCM Milestone 2 additions (2026-05-03):
    public LocalDate? EstimatedCrd { get; set; }            // Cargo Ready Date — required once OrderConfirmed
    public long?     FfAssignedPartyId { get; set; }        // Freight Forwarder party_id (separate from carrier)
    public string?   Remarks { get; set; }
    public Instant   CreatedAt { get; set; }
    public Instant   ModifiedAt { get; set; }
}

public enum TradeDirection { Import, Export, CrossTrade, Domestic }
public enum TransportMode  { Air, OceanFcl, OceanLcl, Road, Rail, Multimodal }
public enum ServiceType    { DoorDoor, DoorPort, PortDoor, PortPort }
// LLD enum extended 2026-05-03 per SCM Milestone 2 spec — adds explicit
// "BookingRequested" / "PendingBooking" steps and "OrderConfirmed" before
// "Confirmed" so the ops dashboard can show the full handoff funnel.
public enum BookingStatus  { Draft, OrderConfirmed, BookingRequested, PendingBooking, Confirmed, InTransit, Discharged, Delivered, Cancelled, Closed }

public sealed class BookingLine
{
    public long     Id { get; set; }
    public int      TenantId { get; set; }
    public long     BookingId { get; set; }
    public int      LineNumber { get; set; }
    public long?    ProductId { get; set; }
    public string   Description { get; set; } = "";
    public string?  HsCode { get; set; }
    public int?     Pieces { get; set; }
    public string?  PackagingType { get; set; }
    public decimal? GrossWeightKg { get; set; }
    public decimal? VolumeCbm { get; set; }
    public bool     IsHazmat { get; set; }
    public bool     IsPerishable { get; set; }
}

/* ===================== Shipment ===================== */
public sealed class Shipment
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public string    CountryCode { get; set; } = "";
    public string    ShipmentNumber { get; set; } = "";
    public long?     BookingId { get; set; }
    public TransportMode Mode { get; set; }
    public long      CarrierPartyId { get; set; }
    public string?   VesselOrFlight { get; set; }
    public string?   VoyageOrFlightNo { get; set; }
    public Instant?  Etd { get; set; }
    public Instant?  Eta { get; set; }
    public Instant?  Atd { get; set; }
    public Instant?  Ata { get; set; }
    public long      OriginPortId { get; set; }
    public long      DestinationPortId { get; set; }
    public ShipmentStatus Status { get; set; } = ShipmentStatus.Booked;
    public string?   Remarks { get; set; }
    public Instant   CreatedAt { get; set; }
    public Instant   ModifiedAt { get; set; }
}

// LLD enum extended 2026-05-03 per SCM Milestone 2 spec — adds AtPOD,
// InboundArrival, EmptyReturn so the in-transit ops dashboard can show
// every leg of the journey separately.
public enum ShipmentStatus { Booked, Loaded, Departed, InTransit, Arrived, AtPOD, Discharged, InboundArrival, GateOut, EmptyReturn, Delivered, Cancelled }

/* ===================== MBL / HBL / AWB ===================== */
public sealed class Mbl
{
    public long   Id { get; set; }
    public int    TenantId { get; set; }
    public string CountryCode { get; set; } = "";
    public long   ShipmentId { get; set; }
    public string MblNumber { get; set; } = "";
    public BlType BlType { get; set; }
    public long   IssuedByCarrierPartyId { get; set; }
    public ReleaseType ReleaseType { get; set; }
    public LocalDate? IssueDate { get; set; }
    public LocalDate? OnBoardDate { get; set; }
    public long?  DocumentId { get; set; }
    public BlStatus Status { get; set; } = BlStatus.Draft;
}

public enum BlType      { Ocean, Air, Road, Rail }
public enum ReleaseType { Original, Telex, Seaway, Express, Surrender }
public enum BlStatus    { Draft, Issued, Released, Cancelled }

public sealed class Hbl
{
    public long   Id { get; set; }
    public int    TenantId { get; set; }
    public string CountryCode { get; set; } = "";
    public long?  MblId { get; set; }
    public string HblNumber { get; set; } = "";
    public long?  ShipperPartyId { get; set; }
    public long?  ConsigneePartyId { get; set; }
    public long?  NotifyPartyId { get; set; }
    public ReleaseType ReleaseType { get; set; }
    public LocalDate? IssueDate { get; set; }
    public long?  DocumentId { get; set; }
    public BlStatus Status { get; set; } = BlStatus.Draft;
}

public sealed class Awb
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public long    ShipmentId { get; set; }
    public AwbType AwbType { get; set; }
    public string  AwbNumber { get; set; } = "";
    public long?   ParentAwbId { get; set; }
    public string? IataCarrierCode { get; set; }
    public string? FlightNumber { get; set; }
    public long?   DocumentId { get; set; }
    public AwbStatus Status { get; set; } = AwbStatus.Draft;
}

public enum AwbType   { Master, House }
public enum AwbStatus { Draft, Issued, Cancelled }

/* ===================== Container ===================== */
public sealed class Container
{
    public long     Id { get; set; }
    public int      TenantId { get; set; }
    public long     ShipmentId { get; set; }
    public string   ContainerNumber { get; set; } = "";
    public string   ContainerType { get; set; } = "";
    public string?  SealNumber { get; set; }
    public decimal? TareWeightKg { get; set; }
    public decimal? CargoWeightKg { get; set; }
    public Instant? PackedAt { get; set; }
    public Instant? LoadedAt { get; set; }
    public Instant? DischargedAt { get; set; }
    public Instant? GateOutAt { get; set; }
    public Instant? EmptyReturnedAt { get; set; }
    public int?     FreeDays { get; set; }
    public LocalDate? PerDiemStarts { get; set; }
    public ContainerStatus Status { get; set; } = ContainerStatus.Empty;
}

public enum ContainerStatus { Empty, Loading, Loaded, OnVessel, Discharged, GatedOut, Returned }

public sealed class ContainerPacking
{
    public long     Id { get; set; }
    public long     ContainerId { get; set; }
    public long?    HblId { get; set; }
    public string?  Description { get; set; }
    public int?     Pieces { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? VolumeCbm { get; set; }
}

/* ===================== Milestone ===================== */
public sealed class Milestone
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public long    ShipmentId { get; set; }
    public string  MilestoneCode { get; set; } = "";
    public Instant OccurredAt { get; set; }
    public long?   LocationPortId { get; set; }
    public MilestoneSource Source { get; set; }
    public string? Remarks { get; set; }
}

public enum MilestoneSource { System, Edi, Manual, CarrierApi, Gps }

/* ===================== Charge ===================== */
public sealed class ChargeLine
{
    public long     Id { get; set; }
    public int      TenantId { get; set; }
    public long     ShipmentId { get; set; }
    public string   ChargeCode { get; set; } = "";
    public long?    RateCardId { get; set; }
    public decimal? Quantity { get; set; }
    public string?  UomCode { get; set; }
    public decimal? UnitPriceAmount { get; set; }
    public string?  UnitPriceCurrency { get; set; }
    public decimal? AmountAmount { get; set; }
    public string?  AmountCurrency { get; set; }
    public bool     IsBillable { get; set; } = true;
    public ChargeInvoiceStatus InvoiceStatus { get; set; } = ChargeInvoiceStatus.Pending;
}

public enum ChargeInvoiceStatus { Pending, Invoiced, Paid, Disputed }

/* ===================== Party role / Routing ===================== */
public sealed class PartyRole
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public long    ShipmentId { get; set; }
    public long    PartyId { get; set; }
    public PartyRoleKind Role { get; set; }
    public string? ContactName { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
}

public enum PartyRoleKind { Carrier, OriginAgent, DestinationAgent, Trucker, Surveyor, Broker, Bank }

public sealed class Routing
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public long    ShipmentId { get; set; }
    public int     LegSequence { get; set; }
    public long    OriginPortId { get; set; }
    public long    DestPortId { get; set; }
    public RoutingMode Mode { get; set; }
    public string? VesselOrFlight { get; set; }
    public string? VoyageOrFlightNo { get; set; }
    public Instant? Etd { get; set; }
    public Instant? Eta { get; set; }
}

public enum RoutingMode { Air, Ocean, Road, Rail }

/* ===================== Consol ===================== */
public sealed class Consol
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public string  ConsolNumber { get; set; } = "";
    public ConsolType ConsolType { get; set; }
    public long    MasterShipmentId { get; set; }
    public ConsolStatus Status { get; set; } = ConsolStatus.Open;
    public Instant CreatedAt { get; set; }
}

public enum ConsolType   { AirConsol, SeaLcl, RoadConsol }
public enum ConsolStatus { Open, Sealed, Departed, Closed }

public sealed class ConsolMember
{
    public long ConsolId { get; set; }
    public long HblId { get; set; }
}

/* ===================== Demurrage / Pre-alert / Audit ===================== */
public sealed class DemurrageEvent
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public long      ContainerId { get; set; }
    public DemurrageType EventType { get; set; }
    public LocalDate StartDate { get; set; }
    public LocalDate? EndDate { get; set; }
    public int?      Days { get; set; }
    public decimal?  RateAmount { get; set; }
    public string?   RateCurrency { get; set; }
    public decimal?  TotalAmount { get; set; }
    public string?   TotalCurrency { get; set; }
    public DemurrageStatus Status { get; set; } = DemurrageStatus.Accruing;
}

public enum DemurrageType   { Demurrage, Detention, PerDiem }
public enum DemurrageStatus { Accruing, Settled, Disputed }

public sealed class PreAlert
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public long    ShipmentId { get; set; }
    public long    RecipientPartyId { get; set; }
    public Instant? SentAt { get; set; }
    public long?   DocumentId { get; set; }
    public PreAlertStatus Status { get; set; } = PreAlertStatus.Pending;
}

public enum PreAlertStatus { Pending, Sent, Acknowledged, Failed }

public sealed class M5Audit
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public M5EntityType EntityType { get; set; }
    public long    EntityId { get; set; }
    public string  Action { get; set; } = "";
    public long    PerformedBy { get; set; }
    public Instant PerformedAt { get; set; }
    public string? DetailsJson { get; set; }
}

public enum M5EntityType { Booking, Shipment, Mbl, Hbl, Awb, Container, Consol }

/* ===================== Memo (SCM Milestone 1 — internal notes per shipment) ===================== */
public sealed class ShipmentMemo
{
    public long    Id { get; set; }
    public int     TenantId { get; set; }
    public long    ShipmentId { get; set; }
    public long?   AuthorUserId { get; set; }
    public string  Body { get; set; } = "";
    public bool    IsPinned { get; set; }
    public Instant CreatedAt { get; set; }
}

/* ===================== Watchlist (SCM Milestone 1+2 — starred shipments per user) ===================== */
// Composite key (TenantId, UserSub, ShipmentId). UserSub is the JWT 'sub' claim.
public sealed class UserWatchlistEntry
{
    public int     TenantId { get; set; }
    public string  UserSub { get; set; } = "";
    public long    ShipmentId { get; set; }
    public Instant StarredAt { get; set; }
}

/* ===================== Hold (SCM Milestone 1+2 — operational holds on a shipment) ===================== */
public sealed class ShipmentHold
{
    public long      Id { get; set; }
    public int       TenantId { get; set; }
    public long      ShipmentId { get; set; }
    public HoldType  HoldType { get; set; }
    public string    Reason { get; set; } = "";
    public long?     RaisedBy { get; set; }
    public Instant   RaisedAt { get; set; }
    public long?     ClearedBy { get; set; }
    public Instant?  ClearedAt { get; set; }
    public string?   ResolutionNote { get; set; }
}

public enum HoldType { Customs, Pga, MissingDoc, CustomerDispute, Payment, Operations, Other }

/* ===================== Reminder (SCM Milestone 1+2 — date-driven, fired by RunRemindersNow) ===================== */
public sealed class ShipmentReminder
{
    public long           Id { get; set; }
    public int            TenantId { get; set; }
    public long           ShipmentId { get; set; }
    public long?          ContainerId { get; set; }
    public ReminderKind   ReminderKind { get; set; }
    public string         Title { get; set; } = "";
    public string?        Notes { get; set; }
    public Instant        DueAt { get; set; }
    public string?        AssignedUserSub { get; set; }
    public ReminderStatus Status { get; set; } = ReminderStatus.Pending;
    public Instant        CreatedAt { get; set; }
    public Instant        ModifiedAt { get; set; }
    public Instant?       LastFiredAt { get; set; }
}

public enum ReminderKind   { FollowUp, DocDue, PodFollowup, ReturnDue, PaymentDue, Custom }
public enum ReminderStatus { Pending, Sent, Snoozed, Dismissed, Done }
