using NodaTime;

namespace Ulp.M10.Domain.Entities;

// ===== Driver / Truck / Chassis masters =====

public sealed class Driver
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string DriverCode { get; set; } = "";
    public string FullName { get; set; } = "";
    public DriverType DriverType { get; set; } = DriverType.CompanyEmployee;
    public string? LicenseNumber { get; set; }
    public string? LicenseClass { get; set; }
    public LocalDate? LicenseExpiry { get; set; }
    public LocalDate? TwicCardExpiry { get; set; }
    public LocalDate? MedicalCardExpiry { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public long? CurrentTruckId { get; set; }
    public DriverAvailability Availability { get; set; } = DriverAvailability.Available;
    public LocalDate? HireDate { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum DriverType { CompanyEmployee, OwnerOperator }
public enum DriverAvailability { Available, OnLoad, OffDuty, Sick, Vacation, OutOfService }

public sealed class Truck
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string TruckNumber { get; set; } = "";
    public string? Vin { get; set; }
    public string? LicensePlate { get; set; }
    public string? Make { get; set; }
    public string? Model { get; set; }
    public int? Year { get; set; }
    public TruckOwnership Ownership { get; set; } = TruckOwnership.CompanyOwned;
    public long? OwnerPartyId { get; set; }
    public TruckStatus Status { get; set; } = TruckStatus.InService;
    public LocalDate? RegistrationExpiry { get; set; }
    public LocalDate? InsuranceExpiry { get; set; }
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum TruckOwnership { CompanyOwned, OwnerOperator, Leased }
public enum TruckStatus    { InService, InMaintenance, OutOfService, Sold }

public sealed class Chassis
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string ChassisNumber { get; set; } = "";
    public ChassisType ChassisType { get; set; }
    public ChassisOwnership Ownership { get; set; } = ChassisOwnership.CompanyOwned;
    public string? PoolProvider { get; set; }
    public ChassisStatus Status { get; set; } = ChassisStatus.Available;
    public string? CurrentContainer { get; set; }
    public string? CurrentLocation { get; set; }
    public LocalDate? RegistrationExpiry { get; set; }
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum ChassisType      { Standard20, Standard40, TriAxle, Light, Gooseneck, Reefer, Other }
public enum ChassisOwnership { CompanyOwned, Leased, Pool }
public enum ChassisStatus    { Available, InUse, InMaintenance, OutOfService }

public sealed class EquipmentMaint
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public EquipmentKind EquipmentKind { get; set; }
    public long EquipmentId { get; set; }
    public MaintType MaintType { get; set; }
    public string Description { get; set; } = "";
    public LocalDate StartDate { get; set; }
    public LocalDate? EndDate { get; set; }
    public decimal? CostAmount { get; set; }
    public long? VendorPartyId { get; set; }
    public string? Notes { get; set; }
    public MaintStatus Status { get; set; } = MaintStatus.Scheduled;
    public Instant CreatedAt { get; set; }
}

public enum EquipmentKind { Truck, Chassis }
public enum MaintType     { Pmi, RepairBreakdown, Inspection, TireService, BodyRepair, Other }
public enum MaintStatus   { Scheduled, InProgress, Completed, Cancelled }

// ===== Job / Dispatch =====

public sealed class TruckingJob
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string CountryCode { get; set; } = "";
    public string JobNumber { get; set; } = "";
    public long CustomerPartyId { get; set; }
    public string? CustRef { get; set; }
    public MoveType MoveType { get; set; } = MoveType.Fcl;
    public string? Notes { get; set; }
    public string? BlNumber { get; set; }
    public string? SslCode { get; set; }
    public string? ContainerNumber { get; set; }
    public ContainerSize? ContainerSize { get; set; }
    public decimal? WeightKg { get; set; }
    public string? PuLocation { get; set; }
    public LocalDate? PuDate { get; set; }
    public LocalTime? PuTime { get; set; }
    public bool PuAppointmentRequired { get; set; }
    public string? DelLocation { get; set; }
    public LocalDate? DelDate { get; set; }
    public LocalTime? DelTime { get; set; }
    public bool DelAppointmentRequired { get; set; }
    public LocalDate? EtaDate { get; set; }
    public LocalDate? LfdDate { get; set; }
    public LocalDate? EmptyReadyDate { get; set; }
    public string? ReturnLocation { get; set; }
    public LocalDate? ReturnDate { get; set; }
    public LocalTime? ReturnTime { get; set; }
    public string? ReturnNumber { get; set; }
    public long? DriverId { get; set; }
    public long? TruckId { get; set; }
    public long? ChassisId { get; set; }
    public bool? ChassisOwned { get; set; }
    public string? ChassisType { get; set; }
    public JobAvailabilityStatus AvailabilityStatus { get; set; } = JobAvailabilityStatus.NotReadyForPickup;
    public string? HoldReason { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
    public Instant? DispatchedAt { get; set; }
    public Instant? OutgatedAt { get; set; }
    public Instant? CompletedAt { get; set; }
}

public enum MoveType      { Fcl, Ltl, Ftl, Drayage, LiveUnload, DropAndPick }
public enum ContainerSize { Ft20, Ft40, Hc40, Hc45, Ft53, Other }
public enum JobAvailabilityStatus { NotReadyForPickup, AvailablePendingAppointment, Dispatched, OutGated, WaitingReturnNotify, Completed, Cancelled }

public sealed class JobStatusEvent
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long JobId { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = "";
    public Instant OccurredAt { get; set; }
    public long? OccurredBy { get; set; }
    public long? DriverId { get; set; }
    public string? LocationText { get; set; }
    public string? Notes { get; set; }
}

// ===== Accessorials =====

public sealed class Accessorial
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public AccessorialCategory Category { get; set; }
    public decimal DefaultRate { get; set; }
    public string Currency { get; set; } = "INR";
    public AccessorialUom Uom { get; set; } = AccessorialUom.Flat;
    public decimal? FreeUnits { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}

public enum AccessorialCategory { Detention, Demurrage, Chassis, PerDiem, PreCool, TonuDryRun, LayoverWaitTime, PortFee, OtherSurcharge }
public enum AccessorialUom      { Flat, PerHour, PerDay, PerMile, PerKg, Other }

public sealed class JobAccessorial
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long JobId { get; set; }
    public long AccessorialId { get; set; }
    public LocalDate OccurredAt { get; set; }
    public decimal Quantity { get; set; } = 1m;
    public decimal Rate { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string? Notes { get; set; }
    public long? AddedBy { get; set; }
    public bool IsBilled { get; set; }
    public long? InvoiceLineId { get; set; }
    public AccessorialSource Source { get; set; } = AccessorialSource.Manual;
    public Instant CreatedAt { get; set; }
}

public enum AccessorialSource { Manual, Suggested, Imported }

// ===== POD / Appointments =====

public sealed class Pod
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long JobId { get; set; }
    public PodKind PodKind { get; set; }
    public string? SignedByName { get; set; }
    public Instant SignedAt { get; set; }
    public string? SignatureRef { get; set; }
    public long? DocumentId { get; set; }
    public long? UploadedByDriver { get; set; }
    public decimal? GeoLat { get; set; }
    public decimal? GeoLon { get; set; }
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
}

public enum PodKind { SignedPod, GateReceiptOut, GateReceiptIn, EmptyReceipt, PhotoEvidence, Other }

public sealed class JobAppointment
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long JobId { get; set; }
    public AppointmentKind AppointmentKind { get; set; }
    public LocalDateTime AppointmentDt { get; set; }
    public int? DurationMin { get; set; }
    public string? FacilityName { get; set; }
    public string? ConfirmationNumber { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Requested;
    public string? Notes { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum AppointmentKind   { Pickup, Delivery, EmptyReturn }
public enum AppointmentStatus { Requested, Confirmed, Missed, Rescheduled, Cancelled, Completed }
