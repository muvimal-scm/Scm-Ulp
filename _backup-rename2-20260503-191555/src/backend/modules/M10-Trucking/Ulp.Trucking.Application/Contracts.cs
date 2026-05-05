using NodaTime;
using Ulp.Trucking.Domain.Entities;

namespace Ulp.Trucking.Application;

public interface ITruckingService
{
    // Drivers
    Task<IReadOnlyList<DriverDto>>  ListDriversAsync(DriverAvailability? availability, CancellationToken ct);
    Task<DriverDto>                 SetDriverAvailabilityAsync(long id, DriverAvailability availability, CancellationToken ct);

    // Trucks
    Task<IReadOnlyList<TruckDto>>   ListTrucksAsync(TruckStatus? status, CancellationToken ct);

    // Chassis
    Task<IReadOnlyList<ChassisDto>> ListChassisAsync(ChassisStatus? status, CancellationToken ct);

    // Maintenance
    Task<IReadOnlyList<EquipmentMaintDto>> ListMaintAsync(EquipmentKind? kind, MaintStatus? status, CancellationToken ct);

    // Jobs
    Task<IReadOnlyList<JobListDto>> ListJobsAsync(JobAvailabilityStatus? status, CancellationToken ct);
    Task<JobDetailDto?>             GetJobAsync(long id, CancellationToken ct);
    Task<JobListDto>                AdvanceJobStatusAsync(long id, AdvanceJobStatusRequest req, CancellationToken ct);
    Task<JobListDto>                AssignDispatchAsync(long id, AssignDispatchRequest req, CancellationToken ct);

    // Accessorials
    Task<IReadOnlyList<AccessorialDto>>     ListAccessorialsAsync(CancellationToken ct);
    Task<JobAccessorialDto>                 AddJobAccessorialAsync(long jobId, AddAccessorialRequest req, CancellationToken ct);
    Task<IReadOnlyList<JobAccessorialDto>>  ListJobAccessorialsAsync(long? jobId, CancellationToken ct);

    // POD
    Task<PodDto>                    UploadPodAsync(long jobId, UploadPodRequest req, CancellationToken ct);

    // Appointments
    Task<IReadOnlyList<AppointmentDto>> ListAppointmentsAsync(LocalDate? from, LocalDate? to, CancellationToken ct);

    // Dispatch board (calendar feed)
    Task<DispatchBoardDto>          DispatchBoardAsync(LocalDate? day, CancellationToken ct);
}

/* ----- requests ----- */

public sealed record AdvanceJobStatusRequest(JobAvailabilityStatus ToStatus, string? LocationText, string? Notes);
public sealed record AssignDispatchRequest(long DriverId, long? TruckId, long? ChassisId);
public sealed record AddAccessorialRequest(long AccessorialId, LocalDate OccurredAt, decimal Quantity, decimal? RateOverride, string? Notes);
public sealed record UploadPodRequest(PodKind PodKind, string? SignedByName, string? SignatureRef, decimal? GeoLat, decimal? GeoLon, string? Notes);

/* ----- DTOs ----- */

public sealed record DriverDto(
    long Id, string DriverCode, string FullName, DriverType DriverType,
    string? LicenseNumber, string? LicenseClass,
    LocalDate? LicenseExpiry, LocalDate? TwicCardExpiry, LocalDate? MedicalCardExpiry,
    string? Phone, string? Email, long? CurrentTruckId, string? CurrentTruckNumber,
    DriverAvailability Availability, LocalDate? HireDate, string? Notes, bool IsActive);

public sealed record TruckDto(
    long Id, string TruckNumber, string? Vin, string? LicensePlate,
    string? Make, string? Model, int? Year, TruckOwnership Ownership,
    long? OwnerPartyId, string? OwnerName, TruckStatus Status,
    LocalDate? RegistrationExpiry, LocalDate? InsuranceExpiry, string? Notes);

public sealed record ChassisDto(
    long Id, string ChassisNumber, ChassisType ChassisType, ChassisOwnership Ownership,
    string? PoolProvider, ChassisStatus Status,
    string? CurrentContainer, string? CurrentLocation,
    LocalDate? RegistrationExpiry, string? Notes);

public sealed record EquipmentMaintDto(
    long Id, EquipmentKind EquipmentKind, long EquipmentId, string? EquipmentLabel,
    MaintType MaintType, string Description,
    LocalDate StartDate, LocalDate? EndDate,
    decimal? CostAmount, MaintStatus Status, string? Notes);

public sealed record JobListDto(
    long Id, string JobNumber, long CustomerPartyId, string? CustomerName,
    string? CustRef, MoveType MoveType,
    string? ContainerNumber, ContainerSize? ContainerSize,
    string? PuLocation, LocalDate? PuDate, string? DelLocation, LocalDate? DelDate,
    LocalDate? EtaDate, LocalDate? LfdDate,
    long? DriverId, string? DriverName, long? TruckId, string? TruckNumber,
    long? ChassisId, string? ChassisNumber,
    JobAvailabilityStatus AvailabilityStatus, string? HoldReason,
    int AccessorialCount, decimal AccessorialTotalAmount, string AccessorialCurrency,
    int PodCount,
    Instant? DispatchedAt, Instant? OutgatedAt, Instant? CompletedAt);

public sealed record JobDetailDto(
    JobListDto Header,
    string? BlNumber, string? SslCode, decimal? WeightKg,
    LocalTime? PuTime, LocalTime? DelTime,
    bool PuAppointmentRequired, bool DelAppointmentRequired,
    LocalDate? EmptyReadyDate, string? ReturnLocation, LocalDate? ReturnDate, LocalTime? ReturnTime, string? ReturnNumber,
    string? Notes,
    IReadOnlyList<JobStatusEventDto> StatusEvents,
    IReadOnlyList<JobAccessorialDto> Accessorials,
    IReadOnlyList<PodDto> Pods,
    IReadOnlyList<AppointmentDto> Appointments);

public sealed record JobStatusEventDto(
    long Id, string? FromStatus, string ToStatus, Instant OccurredAt,
    long? DriverId, string? DriverName, string? LocationText, string? Notes);

public sealed record AccessorialDto(
    long Id, string Code, string Name, AccessorialCategory Category,
    decimal DefaultRate, string Currency, AccessorialUom Uom, decimal? FreeUnits, bool IsActive);

public sealed record JobAccessorialDto(
    long Id, long JobId, string? JobNumber, long AccessorialId, string AccessorialCode, string AccessorialName,
    AccessorialCategory Category, LocalDate OccurredAt, decimal Quantity, decimal Rate, decimal Amount,
    string Currency, string? Notes, bool IsBilled, AccessorialSource Source);

public sealed record PodDto(
    long Id, long JobId, PodKind PodKind, string? SignedByName, Instant SignedAt,
    string? SignatureRef, long? DocumentId,
    decimal? GeoLat, decimal? GeoLon, string? Notes);

public sealed record AppointmentDto(
    long Id, long JobId, string? JobNumber, AppointmentKind AppointmentKind,
    LocalDateTime AppointmentDt, int? DurationMin, string? FacilityName,
    string? ConfirmationNumber, AppointmentStatus Status, string? Notes);

public sealed record DispatchBoardDto(
    LocalDate Day,
    IReadOnlyList<DriverDto> AvailableDrivers,
    IReadOnlyList<ChassisDto> AvailableChassis,
    IReadOnlyList<JobListDto> JobsAwaitingDispatch,
    IReadOnlyList<JobListDto> JobsInProgress);
