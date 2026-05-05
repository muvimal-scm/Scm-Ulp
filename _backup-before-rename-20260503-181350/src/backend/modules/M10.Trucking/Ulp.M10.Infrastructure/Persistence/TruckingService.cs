using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.M10.Application;
using Ulp.M10.Domain.Entities;

namespace Ulp.M10.Infrastructure.Persistence;

public sealed class TruckingService(M10DbContext db, ITenantContext tenant, IClock clock) : ITruckingService
{
    private int Tid => int.Parse(tenant.TenantId.Value);

    /* ===== Drivers ===== */
    public async Task<IReadOnlyList<DriverDto>> ListDriversAsync(DriverAvailability? availability, CancellationToken ct)
    {
        var q = db.Drivers.AsNoTracking().Where(d => d.TenantId == Tid);
        if (availability.HasValue) q = q.Where(d => d.Availability == availability.Value);
        var rows = await q.OrderBy(d => d.DriverCode).ToListAsync(ct);
        var truckIds = rows.Where(r => r.CurrentTruckId.HasValue).Select(r => r.CurrentTruckId!.Value).Distinct().ToList();
        var truckNums = truckIds.Count == 0 ? new Dictionary<long, string>() :
            await db.Trucks.AsNoTracking().Where(t => truckIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t.TruckNumber, ct);
        return rows.Select(d => new DriverDto(d.Id, d.DriverCode, d.FullName, d.DriverType,
            d.LicenseNumber, d.LicenseClass, d.LicenseExpiry, d.TwicCardExpiry, d.MedicalCardExpiry,
            d.Phone, d.Email, d.CurrentTruckId,
            d.CurrentTruckId.HasValue ? truckNums.GetValueOrDefault(d.CurrentTruckId.Value) : null,
            d.Availability, d.HireDate, d.Notes, d.IsActive)).ToList();
    }

    public async Task<DriverDto> SetDriverAvailabilityAsync(long id, DriverAvailability availability, CancellationToken ct)
    {
        var d = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException("driver not found");
        d.Availability = availability;
        d.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return (await ListDriversAsync(null, ct)).First(x => x.Id == id);
    }

    /* ===== Trucks ===== */
    public async Task<IReadOnlyList<TruckDto>> ListTrucksAsync(TruckStatus? status, CancellationToken ct)
    {
        var q = db.Trucks.AsNoTracking().Where(t => t.TenantId == Tid);
        if (status.HasValue) q = q.Where(t => t.Status == status.Value);
        var rows = await q.OrderBy(t => t.TruckNumber).ToListAsync(ct);
        var partyIds = rows.Where(r => r.OwnerPartyId.HasValue).Select(r => r.OwnerPartyId!.Value).Distinct().ToList();
        var names = partyIds.Count == 0 ? new Dictionary<long, string>() :
            await db.PartyLookups.AsNoTracking().Where(p => p.TenantId == Tid && partyIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.LegalName, ct);
        return rows.Select(t => new TruckDto(t.Id, t.TruckNumber, t.Vin, t.LicensePlate,
            t.Make, t.Model, t.Year, t.Ownership,
            t.OwnerPartyId, t.OwnerPartyId.HasValue ? names.GetValueOrDefault(t.OwnerPartyId.Value) : null,
            t.Status, t.RegistrationExpiry, t.InsuranceExpiry, t.Notes)).ToList();
    }

    /* ===== Chassis ===== */
    public async Task<IReadOnlyList<ChassisDto>> ListChassisAsync(ChassisStatus? status, CancellationToken ct)
    {
        var q = db.Chassis.AsNoTracking().Where(c => c.TenantId == Tid);
        if (status.HasValue) q = q.Where(c => c.Status == status.Value);
        var rows = await q.OrderBy(c => c.ChassisNumber).ToListAsync(ct);
        return rows.Select(c => new ChassisDto(c.Id, c.ChassisNumber, c.ChassisType, c.Ownership,
            c.PoolProvider, c.Status,
            c.CurrentContainer, c.CurrentLocation, c.RegistrationExpiry, c.Notes)).ToList();
    }

    /* ===== Maintenance ===== */
    public async Task<IReadOnlyList<EquipmentMaintDto>> ListMaintAsync(EquipmentKind? kind, MaintStatus? status, CancellationToken ct)
    {
        var q = db.EquipmentMaints.AsNoTracking().Where(m => m.TenantId == Tid);
        if (kind.HasValue)   q = q.Where(m => m.EquipmentKind == kind.Value);
        if (status.HasValue) q = q.Where(m => m.Status == status.Value);
        var rows = await q.OrderByDescending(m => m.StartDate).Take(200).ToListAsync(ct);
        // Resolve labels (truck number / chassis number)
        var truckIds   = rows.Where(r => r.EquipmentKind == EquipmentKind.Truck).Select(r => r.EquipmentId).Distinct().ToList();
        var chassisIds = rows.Where(r => r.EquipmentKind == EquipmentKind.Chassis).Select(r => r.EquipmentId).Distinct().ToList();
        var truckMap   = truckIds.Count == 0 ? new Dictionary<long, string>() :
            await db.Trucks.AsNoTracking().Where(t => truckIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t.TruckNumber, ct);
        var chassisMap = chassisIds.Count == 0 ? new Dictionary<long, string>() :
            await db.Chassis.AsNoTracking().Where(c => chassisIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.ChassisNumber, ct);
        return rows.Select(m => new EquipmentMaintDto(
            m.Id, m.EquipmentKind, m.EquipmentId,
            m.EquipmentKind == EquipmentKind.Truck   ? truckMap.GetValueOrDefault(m.EquipmentId) :
            m.EquipmentKind == EquipmentKind.Chassis ? chassisMap.GetValueOrDefault(m.EquipmentId) : null,
            m.MaintType, m.Description,
            m.StartDate, m.EndDate, m.CostAmount, m.Status, m.Notes)).ToList();
    }

    /* ===== Jobs ===== */
    public async Task<IReadOnlyList<JobListDto>> ListJobsAsync(JobAvailabilityStatus? status, CancellationToken ct)
    {
        var q = db.Jobs.AsNoTracking().Where(j => j.TenantId == Tid);
        if (status.HasValue) q = q.Where(j => j.AvailabilityStatus == status.Value);
        var rows = await q.OrderByDescending(j => j.PuDate ?? j.CreatedAt.InUtc().Date).Take(200).ToListAsync(ct);
        return await EnrichJobListAsync(rows, ct);
    }

    public async Task<JobDetailDto?> GetJobAsync(long id, CancellationToken ct)
    {
        var j = await db.Jobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (j is null) return null;

        var header  = (await EnrichJobListAsync(new List<TruckingJob> { j }, ct)).Single();
        var events  = await db.JobStatusEvents.AsNoTracking().Where(e => e.JobId == id)
            .OrderBy(e => e.OccurredAt).ToListAsync(ct);
        var driverIds = events.Where(e => e.DriverId.HasValue).Select(e => e.DriverId!.Value).Distinct().ToList();
        var drvNames  = driverIds.Count == 0 ? new Dictionary<long, string>() :
            await db.Drivers.AsNoTracking().Where(d => driverIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, d => d.FullName, ct);
        var jaccs   = await ListJobAccessorialsAsync(id, ct);
        var pods    = await db.Pods.AsNoTracking().Where(p => p.JobId == id)
            .OrderBy(p => p.SignedAt).ToListAsync(ct);
        var appts   = await db.Appointments.AsNoTracking().Where(a => a.JobId == id)
            .OrderBy(a => a.AppointmentDt).ToListAsync(ct);

        return new JobDetailDto(header,
            j.BlNumber, j.SslCode, j.WeightKg,
            j.PuTime, j.DelTime,
            j.PuAppointmentRequired, j.DelAppointmentRequired,
            j.EmptyReadyDate, j.ReturnLocation, j.ReturnDate, j.ReturnTime, j.ReturnNumber,
            j.Notes,
            events.Select(e => new JobStatusEventDto(e.Id, e.FromStatus, e.ToStatus, e.OccurredAt,
                e.DriverId, e.DriverId.HasValue ? drvNames.GetValueOrDefault(e.DriverId.Value) : null,
                e.LocationText, e.Notes)).ToList(),
            jaccs,
            pods.Select(p => new PodDto(p.Id, p.JobId, p.PodKind, p.SignedByName, p.SignedAt,
                p.SignatureRef, p.DocumentId, p.GeoLat, p.GeoLon, p.Notes)).ToList(),
            appts.Select(a => new AppointmentDto(a.Id, a.JobId, j.JobNumber, a.AppointmentKind,
                a.AppointmentDt, a.DurationMin, a.FacilityName, a.ConfirmationNumber, a.Status, a.Notes)).ToList());
    }

    public async Task<JobListDto> AdvanceJobStatusAsync(long id, AdvanceJobStatusRequest req, CancellationToken ct)
    {
        var j = await db.Jobs.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException("job not found");
        var now = clock.GetCurrentInstant();
        var fromStatus = j.AvailabilityStatus.ToString();
        j.AvailabilityStatus = req.ToStatus;
        if (req.ToStatus == JobAvailabilityStatus.Dispatched && j.DispatchedAt is null) j.DispatchedAt = now;
        if (req.ToStatus == JobAvailabilityStatus.OutGated   && j.OutgatedAt   is null) j.OutgatedAt   = now;
        if (req.ToStatus == JobAvailabilityStatus.Completed  && j.CompletedAt  is null) j.CompletedAt  = now;
        j.ModifiedAt = now;
        db.JobStatusEvents.Add(new JobStatusEvent {
            TenantId = Tid, JobId = id, FromStatus = fromStatus, ToStatus = req.ToStatus.ToString(),
            OccurredAt = now, OccurredBy = 1, DriverId = j.DriverId, LocationText = req.LocationText, Notes = req.Notes,
        });
        await db.SaveChangesAsync(ct);
        return (await ListJobsAsync(null, ct)).First(x => x.Id == id);
    }

    public async Task<JobListDto> AssignDispatchAsync(long id, AssignDispatchRequest req, CancellationToken ct)
    {
        var j = await db.Jobs.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException("job not found");

        // Conflict check: warn if driver is on another active load with overlapping pickup date
        if (j.PuDate.HasValue)
        {
            var conflict = await db.Jobs.AsNoTracking().AnyAsync(other =>
                other.TenantId == Tid && other.Id != id &&
                other.DriverId == req.DriverId &&
                other.PuDate == j.PuDate &&
                (other.AvailabilityStatus == JobAvailabilityStatus.Dispatched ||
                 other.AvailabilityStatus == JobAvailabilityStatus.OutGated), ct);
            if (conflict)
                throw new InvalidOperationException($"Driver {req.DriverId} is already assigned to another active load on {j.PuDate}");
        }

        var now = clock.GetCurrentInstant();
        j.DriverId = req.DriverId;
        j.TruckId = req.TruckId;
        j.ChassisId = req.ChassisId;
        if (req.ChassisId.HasValue)
        {
            var c = await db.Chassis.AsNoTracking().FirstOrDefaultAsync(x => x.Id == req.ChassisId.Value, ct);
            if (c is not null) { j.ChassisOwned = c.Ownership == ChassisOwnership.CompanyOwned; j.ChassisType = c.ChassisType.ToString(); }
        }
        j.ModifiedAt = now;
        // Mark driver OnLoad
        var drv = await db.Drivers.FirstOrDefaultAsync(d => d.Id == req.DriverId && d.TenantId == Tid, ct);
        if (drv is not null) { drv.Availability = DriverAvailability.OnLoad; drv.CurrentTruckId = req.TruckId; drv.ModifiedAt = now; }
        await db.SaveChangesAsync(ct);
        return (await ListJobsAsync(null, ct)).First(x => x.Id == id);
    }

    /* ===== Accessorials ===== */
    public async Task<IReadOnlyList<AccessorialDto>> ListAccessorialsAsync(CancellationToken ct)
    {
        var rows = await db.Accessorials.AsNoTracking().Where(a => a.TenantId == Tid)
            .OrderBy(a => a.Code).ToListAsync(ct);
        return rows.Select(a => new AccessorialDto(a.Id, a.Code, a.Name, a.Category,
            a.DefaultRate, a.Currency, a.Uom, a.FreeUnits, a.IsActive)).ToList();
    }

    public async Task<JobAccessorialDto> AddJobAccessorialAsync(long jobId, AddAccessorialRequest req, CancellationToken ct)
    {
        var j = await db.Jobs.FirstOrDefaultAsync(x => x.Id == jobId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException("job not found");
        var acc = await db.Accessorials.FirstOrDefaultAsync(a => a.Id == req.AccessorialId && a.TenantId == Tid, ct)
            ?? throw new InvalidOperationException("accessorial not found");
        var rate = req.RateOverride ?? acc.DefaultRate;
        var ja = new JobAccessorial {
            TenantId = Tid, JobId = jobId, AccessorialId = req.AccessorialId,
            OccurredAt = req.OccurredAt, Quantity = req.Quantity, Rate = rate,
            Amount = req.Quantity * rate, Currency = acc.Currency,
            Notes = req.Notes, AddedBy = 1, IsBilled = false,
            Source = AccessorialSource.Manual, CreatedAt = clock.GetCurrentInstant(),
        };
        db.JobAccessorials.Add(ja);
        await db.SaveChangesAsync(ct);
        return (await ListJobAccessorialsAsync(jobId, ct)).First(x => x.Id == ja.Id);
    }

    public async Task<IReadOnlyList<JobAccessorialDto>> ListJobAccessorialsAsync(long? jobId, CancellationToken ct)
    {
        var q = db.JobAccessorials.AsNoTracking().Where(j => j.TenantId == Tid);
        if (jobId.HasValue) q = q.Where(j => j.JobId == jobId.Value);
        var rows = await q.OrderByDescending(j => j.OccurredAt).Take(500).ToListAsync(ct);
        var accIds = rows.Select(r => r.AccessorialId).Distinct().ToList();
        var accs   = accIds.Count == 0 ? new Dictionary<long, Accessorial>() :
            await db.Accessorials.AsNoTracking().Where(a => accIds.Contains(a.Id))
                .ToDictionaryAsync(a => a.Id, a => a, ct);
        var jobIds = rows.Select(r => r.JobId).Distinct().ToList();
        var jobNums = jobIds.Count == 0 ? new Dictionary<long, string>() :
            await db.Jobs.AsNoTracking().Where(j => jobIds.Contains(j.Id))
                .ToDictionaryAsync(j => j.Id, j => j.JobNumber, ct);
        return rows.Select(r =>
        {
            var a = accs.GetValueOrDefault(r.AccessorialId);
            return new JobAccessorialDto(r.Id, r.JobId, jobNums.GetValueOrDefault(r.JobId),
                r.AccessorialId, a?.Code ?? "?", a?.Name ?? "?",
                a?.Category ?? AccessorialCategory.OtherSurcharge,
                r.OccurredAt, r.Quantity, r.Rate, r.Amount, r.Currency,
                r.Notes, r.IsBilled, r.Source);
        }).ToList();
    }

    /* ===== POD ===== */
    public async Task<PodDto> UploadPodAsync(long jobId, UploadPodRequest req, CancellationToken ct)
    {
        var j = await db.Jobs.FirstOrDefaultAsync(x => x.Id == jobId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException("job not found");
        var now = clock.GetCurrentInstant();
        var p = new Pod {
            TenantId = Tid, JobId = jobId, PodKind = req.PodKind,
            SignedByName = req.SignedByName, SignedAt = now, SignatureRef = req.SignatureRef,
            UploadedByDriver = j.DriverId,
            GeoLat = req.GeoLat, GeoLon = req.GeoLon, Notes = req.Notes, CreatedAt = now,
        };
        db.Pods.Add(p);
        await db.SaveChangesAsync(ct);
        return new PodDto(p.Id, p.JobId, p.PodKind, p.SignedByName, p.SignedAt,
            p.SignatureRef, p.DocumentId, p.GeoLat, p.GeoLon, p.Notes);
    }

    /* ===== Appointments ===== */
    public async Task<IReadOnlyList<AppointmentDto>> ListAppointmentsAsync(LocalDate? from, LocalDate? to, CancellationToken ct)
    {
        var q = db.Appointments.AsNoTracking().Where(a => a.TenantId == Tid);
        if (from.HasValue) q = q.Where(a => a.AppointmentDt.Date >= from.Value);
        if (to.HasValue)   q = q.Where(a => a.AppointmentDt.Date <= to.Value);
        var rows = await q.OrderBy(a => a.AppointmentDt).Take(200).ToListAsync(ct);
        var jobIds = rows.Select(r => r.JobId).Distinct().ToList();
        var jobNums = jobIds.Count == 0 ? new Dictionary<long, string>() :
            await db.Jobs.AsNoTracking().Where(j => jobIds.Contains(j.Id))
                .ToDictionaryAsync(j => j.Id, j => j.JobNumber, ct);
        return rows.Select(a => new AppointmentDto(a.Id, a.JobId, jobNums.GetValueOrDefault(a.JobId),
            a.AppointmentKind, a.AppointmentDt, a.DurationMin, a.FacilityName,
            a.ConfirmationNumber, a.Status, a.Notes)).ToList();
    }

    /* ===== Dispatch board ===== */
    public async Task<DispatchBoardDto> DispatchBoardAsync(LocalDate? day, CancellationToken ct)
    {
        var d = day ?? LocalDate.FromDateTime(clock.GetCurrentInstant().ToDateTimeUtc());
        var availDrivers = await ListDriversAsync(DriverAvailability.Available, ct);
        var availChassis = await ListChassisAsync(ChassisStatus.Available, ct);
        var awaiting = await ListJobsAsync(JobAvailabilityStatus.AvailablePendingAppointment, ct);
        var dispatched = await ListJobsAsync(JobAvailabilityStatus.Dispatched, ct);
        var outgated = await ListJobsAsync(JobAvailabilityStatus.OutGated, ct);
        return new DispatchBoardDto(d, availDrivers, availChassis, awaiting, dispatched.Concat(outgated).ToList());
    }

    /* ===== helpers ===== */

    private async Task<List<JobListDto>> EnrichJobListAsync(List<TruckingJob> rows, CancellationToken ct)
    {
        if (rows.Count == 0) return new List<JobListDto>();
        var custIds   = rows.Select(r => r.CustomerPartyId).Distinct().ToList();
        var driverIds = rows.Where(r => r.DriverId.HasValue).Select(r => r.DriverId!.Value).Distinct().ToList();
        var truckIds  = rows.Where(r => r.TruckId.HasValue).Select(r => r.TruckId!.Value).Distinct().ToList();
        var chsIds    = rows.Where(r => r.ChassisId.HasValue).Select(r => r.ChassisId!.Value).Distinct().ToList();
        var ids       = rows.Select(r => r.Id).ToList();

        var custMap = await db.PartyLookups.AsNoTracking().Where(p => p.TenantId == Tid && custIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.LegalName, ct);
        var drvMap  = driverIds.Count == 0 ? new Dictionary<long, string>() :
            await db.Drivers.AsNoTracking().Where(d => driverIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, d => d.FullName, ct);
        var trkMap  = truckIds.Count == 0 ? new Dictionary<long, string>() :
            await db.Trucks.AsNoTracking().Where(t => truckIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t.TruckNumber, ct);
        var chsMap  = chsIds.Count == 0 ? new Dictionary<long, string>() :
            await db.Chassis.AsNoTracking().Where(c => chsIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.ChassisNumber, ct);
        var accCounts = await db.JobAccessorials.AsNoTracking().Where(a => ids.Contains(a.JobId))
            .GroupBy(a => new { a.JobId, a.Currency })
            .Select(g => new { g.Key.JobId, g.Key.Currency, N = g.Count(), Total = g.Sum(x => x.Amount) })
            .ToListAsync(ct);
        var podCounts = await db.Pods.AsNoTracking().Where(p => ids.Contains(p.JobId))
            .GroupBy(p => p.JobId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);

        return rows.Select(j =>
        {
            var acc = accCounts.FirstOrDefault(a => a.JobId == j.Id);
            return new JobListDto(j.Id, j.JobNumber, j.CustomerPartyId, custMap.GetValueOrDefault(j.CustomerPartyId),
                j.CustRef, j.MoveType,
                j.ContainerNumber, j.ContainerSize,
                j.PuLocation, j.PuDate, j.DelLocation, j.DelDate, j.EtaDate, j.LfdDate,
                j.DriverId, j.DriverId.HasValue ? drvMap.GetValueOrDefault(j.DriverId.Value) : null,
                j.TruckId,  j.TruckId.HasValue  ? trkMap.GetValueOrDefault(j.TruckId.Value)  : null,
                j.ChassisId,j.ChassisId.HasValue? chsMap.GetValueOrDefault(j.ChassisId.Value): null,
                j.AvailabilityStatus, j.HoldReason,
                acc?.N ?? 0, acc?.Total ?? 0m, acc?.Currency ?? "INR",
                podCounts.GetValueOrDefault(j.Id, 0),
                j.DispatchedAt, j.OutgatedAt, j.CompletedAt);
        }).ToList();
    }
}
