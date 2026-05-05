using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using NodaTime;
using Ulp.Trucking.Domain.Entities;

namespace Ulp.Trucking.Infrastructure.Persistence;

public sealed class TruckingDbContext(DbContextOptions<TruckingDbContext> options) : DbContext(options)
{
    public DbSet<Driver>           Drivers          => Set<Driver>();
    public DbSet<Truck>            Trucks           => Set<Truck>();
    public DbSet<Chassis>          Chassis          => Set<Chassis>();
    public DbSet<EquipmentMaint>   EquipmentMaints  => Set<EquipmentMaint>();
    public DbSet<TruckingJob>      Jobs             => Set<TruckingJob>();
    public DbSet<JobStatusEvent>   JobStatusEvents  => Set<JobStatusEvent>();
    public DbSet<Accessorial>      Accessorials     => Set<Accessorial>();
    public DbSet<JobAccessorial>   JobAccessorials  => Set<JobAccessorial>();
    public DbSet<Pod>              Pods             => Set<Pod>();
    public DbSet<JobAppointment>   Appointments     => Set<JobAppointment>();
    public DbSet<PartyLookup>      PartyLookups     => Set<PartyLookup>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Driver>(e => {
            e.ToTable("m10_driver"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.DriverCode).HasColumnName("driver_code").HasMaxLength(20);
            e.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(150);
            e.Property(x => x.DriverType).HasColumnName("driver_type").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.LicenseNumber).HasColumnName("license_number").HasMaxLength(30);
            e.Property(x => x.LicenseClass).HasColumnName("license_class").HasMaxLength(10);
            e.Property(x => x.LicenseExpiry).HasColumnName("license_expiry").HasConversion(NullableLocalDate);
            e.Property(x => x.TwicCardExpiry).HasColumnName("twic_card_expiry").HasConversion(NullableLocalDate);
            e.Property(x => x.MedicalCardExpiry).HasColumnName("medical_card_expiry").HasConversion(NullableLocalDate);
            e.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(20);
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(150);
            e.Property(x => x.CurrentTruckId).HasColumnName("current_truck_id");
            e.Property(x => x.Availability).HasColumnName("availability").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.HireDate).HasColumnName("hire_date").HasConversion(NullableLocalDate);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<Truck>(e => {
            e.ToTable("m10_truck"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.TruckNumber).HasColumnName("truck_number").HasMaxLength(20);
            e.Property(x => x.Vin).HasColumnName("vin").HasMaxLength(17);
            e.Property(x => x.LicensePlate).HasColumnName("license_plate").HasMaxLength(15);
            e.Property(x => x.Make).HasColumnName("make").HasMaxLength(50);
            e.Property(x => x.Model).HasColumnName("model").HasMaxLength(50);
            e.Property(x => x.Year).HasColumnName("year");
            e.Property(x => x.Ownership).HasColumnName("ownership").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.OwnerPartyId).HasColumnName("owner_party_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.RegistrationExpiry).HasColumnName("registration_expiry").HasConversion(NullableLocalDate);
            e.Property(x => x.InsuranceExpiry).HasColumnName("insurance_expiry").HasConversion(NullableLocalDate);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<Chassis>(e => {
            e.ToTable("m10_chassis"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ChassisNumber).HasColumnName("chassis_number").HasMaxLength(20);
            e.Property(x => x.ChassisType).HasColumnName("chassis_type").HasConversion(ChassisTypeToStr, StrToChassisType).HasMaxLength(15);
            e.Property(x => x.Ownership).HasColumnName("ownership").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.PoolProvider).HasColumnName("pool_provider").HasMaxLength(100);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.CurrentContainer).HasColumnName("current_container").HasMaxLength(15);
            e.Property(x => x.CurrentLocation).HasColumnName("current_location").HasMaxLength(100);
            e.Property(x => x.RegistrationExpiry).HasColumnName("registration_expiry").HasConversion(NullableLocalDate);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<EquipmentMaint>(e => {
            e.ToTable("m10_equipment_maint"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EquipmentKind).HasColumnName("equipment_kind").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.EquipmentId).HasColumnName("equipment_id");
            e.Property(x => x.MaintType).HasColumnName("maint_type").HasConversion(MaintTypeToStr, StrToMaintType).HasMaxLength(20);
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            e.Property(x => x.StartDate).HasColumnName("start_date").HasConversion(LocalDateConv);
            e.Property(x => x.EndDate).HasColumnName("end_date").HasConversion(NullableLocalDate);
            e.Property(x => x.CostAmount).HasColumnName("cost_amount").HasPrecision(12, 2);
            e.Property(x => x.VendorPartyId).HasColumnName("vendor_party_id");
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<TruckingJob>(e => {
            e.ToTable("m10_job"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.JobNumber).HasColumnName("job_number").HasMaxLength(30);
            e.Property(x => x.CustomerPartyId).HasColumnName("customer_party_id");
            e.Property(x => x.CustRef).HasColumnName("cust_ref").HasMaxLength(60);
            e.Property(x => x.MoveType).HasColumnName("move_type").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(1000);
            e.Property(x => x.BlNumber).HasColumnName("bl_number").HasMaxLength(50);
            e.Property(x => x.SslCode).HasColumnName("ssl_code").HasMaxLength(20);
            e.Property(x => x.ContainerNumber).HasColumnName("container_number").HasMaxLength(15);
            e.Property(x => x.ContainerSize).HasColumnName("container_size").HasConversion(ContSizeToStr, StrToContSize).HasMaxLength(10);
            e.Property(x => x.WeightKg).HasColumnName("weight_kg").HasPrecision(12, 2);
            e.Property(x => x.PuLocation).HasColumnName("pu_location").HasMaxLength(255);
            e.Property(x => x.PuDate).HasColumnName("pu_date").HasConversion(NullableLocalDate);
            e.Property(x => x.PuTime).HasColumnName("pu_time").HasConversion(NullableLocalTime);
            e.Property(x => x.PuAppointmentRequired).HasColumnName("pu_appointment_required");
            e.Property(x => x.DelLocation).HasColumnName("del_location").HasMaxLength(255);
            e.Property(x => x.DelDate).HasColumnName("del_date").HasConversion(NullableLocalDate);
            e.Property(x => x.DelTime).HasColumnName("del_time").HasConversion(NullableLocalTime);
            e.Property(x => x.DelAppointmentRequired).HasColumnName("del_appointment_required");
            e.Property(x => x.EtaDate).HasColumnName("eta_date").HasConversion(NullableLocalDate);
            e.Property(x => x.LfdDate).HasColumnName("lfd_date").HasConversion(NullableLocalDate);
            e.Property(x => x.EmptyReadyDate).HasColumnName("empty_ready_date").HasConversion(NullableLocalDate);
            e.Property(x => x.ReturnLocation).HasColumnName("return_location").HasMaxLength(255);
            e.Property(x => x.ReturnDate).HasColumnName("return_date").HasConversion(NullableLocalDate);
            e.Property(x => x.ReturnTime).HasColumnName("return_time").HasConversion(NullableLocalTime);
            e.Property(x => x.ReturnNumber).HasColumnName("return_number").HasMaxLength(40);
            e.Property(x => x.DriverId).HasColumnName("driver_id");
            e.Property(x => x.TruckId).HasColumnName("truck_id");
            e.Property(x => x.ChassisId).HasColumnName("chassis_id");
            e.Property(x => x.ChassisOwned).HasColumnName("chassis_owned");
            e.Property(x => x.ChassisType).HasColumnName("chassis_type").HasMaxLength(50);
            e.Property(x => x.AvailabilityStatus).HasColumnName("availability_status")
                .HasConversion(JobStatusToStr, StrToJobStatus).HasMaxLength(40);
            e.Property(x => x.HoldReason).HasColumnName("hold_reason").HasMaxLength(255);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
            e.Property(x => x.DispatchedAt).HasColumnName("dispatched_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.OutgatedAt).HasColumnName("outgated_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.CompletedAt).HasColumnName("completed_at_utc").HasConversion(NullableInstant);
        });

        b.Entity<JobStatusEvent>(e => {
            e.ToTable("m10_job_status_event"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.JobId).HasColumnName("job_id");
            e.Property(x => x.FromStatus).HasColumnName("from_status").HasMaxLength(40);
            e.Property(x => x.ToStatus).HasColumnName("to_status").HasMaxLength(40);
            e.Property(x => x.OccurredAt).HasColumnName("occurred_at_utc").HasConversion(InstantConv);
            e.Property(x => x.OccurredBy).HasColumnName("occurred_by");
            e.Property(x => x.DriverId).HasColumnName("driver_id");
            e.Property(x => x.LocationText).HasColumnName("location_text").HasMaxLength(255);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
        });

        b.Entity<Accessorial>(e => {
            e.ToTable("m10_accessorial"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(20);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.Category).HasColumnName("category").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.DefaultRate).HasColumnName("default_rate").HasPrecision(12, 2);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Uom).HasColumnName("uom").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.FreeUnits).HasColumnName("free_units").HasPrecision(8, 2);
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
        });

        b.Entity<JobAccessorial>(e => {
            e.ToTable("m10_job_accessorial"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.JobId).HasColumnName("job_id");
            e.Property(x => x.AccessorialId).HasColumnName("accessorial_id");
            e.Property(x => x.OccurredAt).HasColumnName("occurred_at").HasConversion(LocalDateConv);
            e.Property(x => x.Quantity).HasColumnName("quantity").HasPrecision(8, 2);
            e.Property(x => x.Rate).HasColumnName("rate").HasPrecision(12, 2);
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(12, 2);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.AddedBy).HasColumnName("added_by");
            e.Property(x => x.IsBilled).HasColumnName("is_billed");
            e.Property(x => x.InvoiceLineId).HasColumnName("invoice_line_id");
            e.Property(x => x.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<Pod>(e => {
            e.ToTable("m10_pod"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.JobId).HasColumnName("job_id");
            e.Property(x => x.PodKind).HasColumnName("pod_kind").HasConversion(PodKindToStr, StrToPodKind).HasMaxLength(20);
            e.Property(x => x.SignedByName).HasColumnName("signed_by_name").HasMaxLength(150);
            e.Property(x => x.SignedAt).HasColumnName("signed_at_utc").HasConversion(InstantConv);
            e.Property(x => x.SignatureRef).HasColumnName("signature_ref").HasMaxLength(255);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.UploadedByDriver).HasColumnName("uploaded_by_driver");
            e.Property(x => x.GeoLat).HasColumnName("geo_lat").HasPrecision(9, 6);
            e.Property(x => x.GeoLon).HasColumnName("geo_lon").HasPrecision(9, 6);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<JobAppointment>(e => {
            e.ToTable("m10_appointment"); e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.JobId).HasColumnName("job_id");
            e.Property(x => x.AppointmentKind).HasColumnName("appointment_kind").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.AppointmentDt).HasColumnName("appointment_dt").HasConversion(LocalDateTimeConv);
            e.Property(x => x.DurationMin).HasColumnName("duration_min");
            e.Property(x => x.FacilityName).HasColumnName("facility_name").HasMaxLength(150);
            e.Property(x => x.ConfirmationNumber).HasColumnName("confirmation_number").HasMaxLength(60);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<PartyLookup>(e => {
            e.HasNoKey(); e.ToView("m1_party");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.LegalName).HasColumnName("legal_name").HasMaxLength(255);
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
        });
    }

    // Enum converters

    // ChassisType: 'Standard20','Standard40','Tri-Axle','Light','Gooseneck','Reefer','Other'
    private static Expression<Func<ChassisType, string>> ChassisTypeToStr => t =>
        t == ChassisType.Standard20 ? "Standard20" :
        t == ChassisType.Standard40 ? "Standard40" :
        t == ChassisType.TriAxle    ? "Tri-Axle" :
        t == ChassisType.Light      ? "Light" :
        t == ChassisType.Gooseneck  ? "Gooseneck" :
        t == ChassisType.Reefer     ? "Reefer" :
                                      "Other";
    private static Expression<Func<string, ChassisType>> StrToChassisType => s =>
        s == "Standard20" ? ChassisType.Standard20 :
        s == "Standard40" ? ChassisType.Standard40 :
        s == "Tri-Axle"   ? ChassisType.TriAxle :
        s == "Light"      ? ChassisType.Light :
        s == "Gooseneck"  ? ChassisType.Gooseneck :
        s == "Reefer"     ? ChassisType.Reefer :
                            ChassisType.Other;

    // MaintType: 'PMI','RepairBreakdown','Inspection','TireService','BodyRepair','Other'
    private static Expression<Func<MaintType, string>> MaintTypeToStr => t =>
        t == MaintType.Pmi             ? "PMI" :
        t == MaintType.RepairBreakdown ? "RepairBreakdown" :
        t == MaintType.Inspection      ? "Inspection" :
        t == MaintType.TireService     ? "TireService" :
        t == MaintType.BodyRepair      ? "BodyRepair" :
                                         "Other";
    private static Expression<Func<string, MaintType>> StrToMaintType => s =>
        s == "PMI"             ? MaintType.Pmi :
        s == "RepairBreakdown" ? MaintType.RepairBreakdown :
        s == "Inspection"      ? MaintType.Inspection :
        s == "TireService"     ? MaintType.TireService :
        s == "BodyRepair"      ? MaintType.BodyRepair :
                                 MaintType.Other;

    // ContainerSize: '20FT','40FT','40HC','45HC','53FT','Other'
    private static Expression<Func<ContainerSize?, string?>> ContSizeToStr => c =>
        c == null               ? null :
        c == ContainerSize.Ft20 ? "20FT" :
        c == ContainerSize.Ft40 ? "40FT" :
        c == ContainerSize.Hc40 ? "40HC" :
        c == ContainerSize.Hc45 ? "45HC" :
        c == ContainerSize.Ft53 ? "53FT" :
                                  "Other";
    private static Expression<Func<string?, ContainerSize?>> StrToContSize => s =>
        s == null    ? null :
        s == "20FT"  ? ContainerSize.Ft20 :
        s == "40FT"  ? ContainerSize.Ft40 :
        s == "40HC"  ? ContainerSize.Hc40 :
        s == "45HC"  ? ContainerSize.Hc45 :
        s == "53FT"  ? ContainerSize.Ft53 :
                       ContainerSize.Other;

    // JobAvailabilityStatus passes through (PascalCase preserved in SQL)
    private static Expression<Func<JobAvailabilityStatus, string>> JobStatusToStr => s =>
        s == JobAvailabilityStatus.NotReadyForPickup           ? "NotReadyForPickup" :
        s == JobAvailabilityStatus.AvailablePendingAppointment ? "AvailablePendingAppointment" :
        s == JobAvailabilityStatus.Dispatched                  ? "Dispatched" :
        s == JobAvailabilityStatus.OutGated                    ? "OutGated" :
        s == JobAvailabilityStatus.WaitingReturnNotify         ? "WaitingReturnNotify" :
        s == JobAvailabilityStatus.Completed                   ? "Completed" :
                                                                 "Cancelled";
    private static Expression<Func<string, JobAvailabilityStatus>> StrToJobStatus => s =>
        s == "NotReadyForPickup"           ? JobAvailabilityStatus.NotReadyForPickup :
        s == "AvailablePendingAppointment" ? JobAvailabilityStatus.AvailablePendingAppointment :
        s == "Dispatched"                  ? JobAvailabilityStatus.Dispatched :
        s == "OutGated"                    ? JobAvailabilityStatus.OutGated :
        s == "WaitingReturnNotify"         ? JobAvailabilityStatus.WaitingReturnNotify :
        s == "Completed"                   ? JobAvailabilityStatus.Completed :
                                             JobAvailabilityStatus.Cancelled;

    // PodKind: 'SignedPOD','GateReceiptOut','GateReceiptIn','EmptyReceipt','PhotoEvidence','Other'
    private static Expression<Func<PodKind, string>> PodKindToStr => k =>
        k == PodKind.SignedPod      ? "SignedPOD" :
        k == PodKind.GateReceiptOut ? "GateReceiptOut" :
        k == PodKind.GateReceiptIn  ? "GateReceiptIn" :
        k == PodKind.EmptyReceipt   ? "EmptyReceipt" :
        k == PodKind.PhotoEvidence  ? "PhotoEvidence" :
                                      "Other";
    private static Expression<Func<string, PodKind>> StrToPodKind => s =>
        s == "SignedPOD"      ? PodKind.SignedPod :
        s == "GateReceiptOut" ? PodKind.GateReceiptOut :
        s == "GateReceiptIn"  ? PodKind.GateReceiptIn :
        s == "EmptyReceipt"   ? PodKind.EmptyReceipt :
        s == "PhotoEvidence"  ? PodKind.PhotoEvidence :
                                PodKind.Other;

    private static readonly ValueConverter<Instant, DateTime> InstantConv = new(
        v => v.ToDateTimeUtc(),
        v => Instant.FromDateTimeUtc(DateTime.SpecifyKind(v, DateTimeKind.Utc)));
    private static readonly ValueConverter<Instant?, DateTime?> NullableInstant = new(
        v => v == null ? null : v.Value.ToDateTimeUtc(),
        v => v == null ? null : Instant.FromDateTimeUtc(DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)));
    private static readonly ValueConverter<LocalDate, DateTime> LocalDateConv = new(
        v => new DateTime(v.Year, v.Month, v.Day),
        v => new LocalDate(v.Year, v.Month, v.Day));
    private static readonly ValueConverter<LocalDate?, DateTime?> NullableLocalDate = new(
        v => v == null ? null : new DateTime(v.Value.Year, v.Value.Month, v.Value.Day),
        v => v == null ? null : new LocalDate(v.Value.Year, v.Value.Month, v.Value.Day));
    private static readonly ValueConverter<LocalTime?, TimeSpan?> NullableLocalTime = new(
        v => v == null ? null : new TimeSpan(v.Value.Hour, v.Value.Minute, v.Value.Second),
        v => v == null ? null : new LocalTime(v.Value.Hours, v.Value.Minutes, v.Value.Seconds));
    private static readonly ValueConverter<LocalDateTime, DateTime> LocalDateTimeConv = new(
        v => new DateTime(v.Year, v.Month, v.Day, v.Hour, v.Minute, v.Second),
        v => LocalDateTime.FromDateTime(v));
}

public sealed class PartyLookup
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string LegalName { get; set; } = "";
}
