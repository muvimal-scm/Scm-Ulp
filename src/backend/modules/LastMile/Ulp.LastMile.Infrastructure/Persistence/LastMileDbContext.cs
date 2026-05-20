using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.LastMile.Domain.Entities;

namespace Ulp.LastMile.Infrastructure.Persistence;

public sealed class LastMileDbContext(DbContextOptions<LastMileDbContext> options) : DbContext(options)
{
    public DbSet<CourierBooking>   Bookings   => Set<CourierBooking>();
    public DbSet<PickupSchedule>   Pickups    => Set<PickupSchedule>();
    public DbSet<Route>            Routes     => Set<Route>();
    public DbSet<RouteStop>        Stops      => Set<RouteStop>();
    public DbSet<Manifest>         Manifests  => Set<Manifest>();
    public DbSet<ManifestLine>     ManifestLines => Set<ManifestLine>();
    public DbSet<Awb>              Awbs       => Set<Awb>();
    public DbSet<Pod>              Pods       => Set<Pod>();
    public DbSet<CodCollection>    Cods       => Set<CodCollection>();
    public DbSet<WeightCorrection> Corrections => Set<WeightCorrection>();
    public DbSet<ZoneRate>         ZoneRates  => Set<ZoneRate>();
    public DbSet<PincodeZone>      PincodeZones => Set<PincodeZone>();
    public DbSet<DeliveryAttempt>  Attempts   => Set<DeliveryAttempt>();
    public DbSet<M9Audit>          Audits     => Set<M9Audit>();
    public DbSet<OceanDrayageJob>  OdJobs     => Set<OceanDrayageJob>();
    public DbSet<OtrJob>           OtrJobs    => Set<OtrJob>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<CourierBooking>(e =>
        {
            e.ToTable("m9_courier_booking");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.BookingNumber).HasColumnName("booking_number").HasMaxLength(50);
            e.Property(x => x.CourierType).HasColumnName("courier_type").HasConversion(CtToStr, StrToCt).HasMaxLength(15);
            e.Property(x => x.ShipperPartyId).HasColumnName("shipper_party_id");
            e.Property(x => x.ConsigneePartyId).HasColumnName("consignee_party_id");
            e.Property(x => x.PickupAddressId).HasColumnName("pickup_address_id");
            e.Property(x => x.DeliveryAddressId).HasColumnName("delivery_address_id");
            e.Property(x => x.WeightKg).HasColumnName("weight_kg").HasPrecision(10, 3);
            e.Property(x => x.DeclaredValueAmount).HasColumnName("declared_value_amount").HasPrecision(18, 4);
            e.Property(x => x.DeclaredValueCurrency).HasColumnName("declared_value_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Pieces).HasColumnName("pieces");
            e.Property(x => x.ServiceLevel).HasColumnName("service_level").HasMaxLength(50);
            e.Property(x => x.CodAmount).HasColumnName("cod_amount").HasPrecision(18, 4);
            e.Property(x => x.CodCurrency).HasColumnName("cod_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<PickupSchedule>(e =>
        {
            e.ToTable("m9_pickup_schedule");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.ScheduledDate).HasColumnName("scheduled_date").HasConversion(LocalDateConv);
            e.Property(x => x.TimeWindow).HasColumnName("time_window").HasMaxLength(20);
            e.Property(x => x.AssignedToUserId).HasColumnName("assigned_to_user_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.AttemptedCount).HasColumnName("attempted_count");
        });

        b.Entity<Route>(e =>
        {
            e.ToTable("m9_route");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.RouteCode).HasColumnName("route_code").HasMaxLength(50);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.RouteType).HasColumnName("route_type").HasConversion(RtToStr, StrToRt).HasMaxLength(10);
            e.Property(x => x.PlannedDate).HasColumnName("planned_date").HasConversion(LocalDateConv);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.DriverUserId).HasColumnName("driver_user_id");
            e.Property(x => x.VehicleNo).HasColumnName("vehicle_no").HasMaxLength(20);
        });

        b.Entity<RouteStop>(e =>
        {
            e.ToTable("m9_route_stop");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RouteId).HasColumnName("route_id");
            e.Property(x => x.Sequence).HasColumnName("sequence");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.StopType).HasColumnName("stop_type").HasConversion(StToStr, StrToSt).HasMaxLength(10);
            e.Property(x => x.AddressId).HasColumnName("address_id");
            e.Property(x => x.PartyId).HasColumnName("party_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.ExpectedArrival).HasColumnName("expected_arrival").HasConversion(NullableInstant);
            e.Property(x => x.ActualArrival).HasColumnName("actual_arrival").HasConversion(NullableInstant);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
        });

        b.Entity<Manifest>(e =>
        {
            e.ToTable("m9_manifest");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ManifestNumber).HasColumnName("manifest_number").HasMaxLength(50);
            e.Property(x => x.RouteId).HasColumnName("route_id");
            e.Property(x => x.CourierType).HasColumnName("courier_type").HasConversion(CtToStr, StrToCt).HasMaxLength(15);
            e.Property(x => x.TotalPieces).HasColumnName("total_pieces");
            e.Property(x => x.TotalWeightKg).HasColumnName("total_weight_kg").HasPrecision(12, 3);
            e.Property(x => x.GeneratedAt).HasColumnName("generated_at_utc").HasConversion(InstantConv);
        });

        b.Entity<ManifestLine>(e =>
        {
            e.ToTable("m9_manifest_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ManifestId).HasColumnName("manifest_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.AwbNumber).HasColumnName("awb_number").HasMaxLength(50);
            e.Property(x => x.WeightKg).HasColumnName("weight_kg").HasPrecision(10, 3);
            e.Property(x => x.Pieces).HasColumnName("pieces");
        });

        b.Entity<Awb>(e =>
        {
            e.ToTable("m9_awb");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.AwbNumber).HasColumnName("awb_number").HasMaxLength(50);
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.AwbType).HasColumnName("awb_type").HasConversion(CtToStr, StrToCt).HasMaxLength(15);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
        });

        b.Entity<Pod>(e =>
        {
            e.ToTable("m9_pod");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.SignedBy).HasColumnName("signed_by").HasMaxLength(150);
            e.Property(x => x.SignatureImageDocId).HasColumnName("signature_image_doc_id");
            e.Property(x => x.PhotoDocId).HasColumnName("photo_doc_id");
            e.Property(x => x.GpsLat).HasColumnName("gps_lat").HasPrecision(10, 7);
            e.Property(x => x.GpsLng).HasColumnName("gps_lng").HasPrecision(10, 7);
            e.Property(x => x.CapturedAt).HasColumnName("captured_at_utc").HasConversion(InstantConv);
            e.Property(x => x.CapturedByUserId).HasColumnName("captured_by_user_id");
        });

        b.Entity<CodCollection>(e =>
        {
            e.ToTable("m9_cod_collection");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.AmountCollected).HasColumnName("amount_collected").HasPrecision(18, 4);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.PaymentMethod).HasColumnName("payment_method").HasConversion(PmToStr, StrToPm).HasMaxLength(10);
            e.Property(x => x.CollectedAt).HasColumnName("collected_at_utc").HasConversion(InstantConv);
            e.Property(x => x.SettledStatus).HasColumnName("settled_status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.ReferenceNo).HasColumnName("reference_no").HasMaxLength(80);
        });

        b.Entity<WeightCorrection>(e =>
        {
            e.ToTable("m9_weight_correction");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.OriginalWeightKg).HasColumnName("original_weight_kg").HasPrecision(10, 3);
            e.Property(x => x.CorrectedWeightKg).HasColumnName("corrected_weight_kg").HasPrecision(10, 3);
            e.Property(x => x.CorrectionReason).HasColumnName("correction_reason").HasMaxLength(255);
            e.Property(x => x.CorrectedBy).HasColumnName("corrected_by");
            e.Property(x => x.CorrectedAt).HasColumnName("corrected_at_utc").HasConversion(InstantConv);
            e.Property(x => x.BillingImpactAmount).HasColumnName("billing_impact_amount").HasPrecision(18, 4);
            e.Property(x => x.BillingImpactCurrency).HasColumnName("billing_impact_currency").HasMaxLength(3).IsFixedLength();
        });

        b.Entity<ZoneRate>(e =>
        {
            e.ToTable("m9_zone_rate");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.ZoneCode).HasColumnName("zone_code").HasMaxLength(20);
            e.Property(x => x.CourierType).HasColumnName("courier_type").HasConversion(CtToStr, StrToCt).HasMaxLength(15);
            e.Property(x => x.WeightSlabFromKg).HasColumnName("weight_slab_from_kg").HasPrecision(8, 3);
            e.Property(x => x.WeightSlabToKg).HasColumnName("weight_slab_to_kg").HasPrecision(8, 3);
            e.Property(x => x.RateAmount).HasColumnName("rate_amount").HasPrecision(18, 4);
            e.Property(x => x.RateCurrency).HasColumnName("rate_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.ValidFrom).HasColumnName("valid_from").HasConversion(LocalDateConv);
            e.Property(x => x.ValidTo).HasColumnName("valid_to").HasConversion(NullableLocalDate);
        });

        b.Entity<PincodeZone>(e =>
        {
            e.ToTable("m9_pincode_zone");
            e.HasKey(x => new { x.CountryCode, x.Pincode });
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.Pincode).HasColumnName("pincode").HasMaxLength(20);
            e.Property(x => x.ZoneCode).HasColumnName("zone_code").HasMaxLength(20);
        });

        b.Entity<DeliveryAttempt>(e =>
        {
            e.ToTable("m9_delivery_attempt");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.AttemptNo).HasColumnName("attempt_no");
            e.Property(x => x.AttemptedAt).HasColumnName("attempted_at_utc").HasConversion(InstantConv);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.FailureReason).HasColumnName("failure_reason").HasMaxLength(255);
            e.Property(x => x.NextAttemptDate).HasColumnName("next_attempt_date").HasConversion(NullableLocalDate);
        });

        b.Entity<M9Audit>(e =>
        {
            e.ToTable("m9_audit");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EntityType).HasColumnName("entity_type").HasConversion(EtToStr, StrToEt).HasMaxLength(15);
            e.Property(x => x.EntityId).HasColumnName("entity_id");
            e.Property(x => x.Action).HasColumnName("action").HasMaxLength(50);
            e.Property(x => x.PerformedBy).HasColumnName("performed_by");
            e.Property(x => x.PerformedAt).HasColumnName("performed_at_utc").HasConversion(InstantConv);
            e.Property(x => x.DetailsJson).HasColumnName("details").HasColumnType("json");
        });

        b.Entity<OceanDrayageJob>(e =>
        {
            e.ToTable("m9_ocean_drayage_job");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.JobNumber).HasColumnName("job_number").HasMaxLength(30);
            e.Property(x => x.ContainerNumber).HasColumnName("container_number").HasMaxLength(20);
            e.Property(x => x.AdditionalRefs).HasColumnName("additional_refs").HasMaxLength(500);
            e.Property(x => x.TruckerPartyId).HasColumnName("trucker_party_id");
            e.Property(x => x.AvailableForPickup).HasColumnName("available_for_pickup");
            e.Property(x => x.Terminal).HasColumnName("terminal").HasMaxLength(100);
            e.Property(x => x.PickupAppointment).HasColumnName("pickup_appointment_utc").HasConversion(NullableInstant);
            e.Property(x => x.DropOffLocation).HasColumnName("drop_off_location").HasMaxLength(255);
            e.Property(x => x.DropOffAppointment).HasColumnName("drop_off_appointment_utc").HasConversion(NullableInstant);
            e.Property(x => x.TripType).HasColumnName("trip_type").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(25);
            e.Property(x => x.SpecialInstructions).HasColumnName("special_instructions").HasMaxLength(500);
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<OtrJob>(e =>
        {
            e.ToTable("m9_otr_job");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.JobNumber).HasColumnName("job_number").HasMaxLength(30);
            e.Property(x => x.TrackingNumber).HasColumnName("tracking_number").HasMaxLength(100);
            e.Property(x => x.AdditionalRefs).HasColumnName("additional_refs").HasMaxLength(500);
            e.Property(x => x.PickUpLocation).HasColumnName("pickup_location").HasMaxLength(255);
            e.Property(x => x.PickUpAppointment).HasColumnName("pickup_appointment_utc").HasConversion(NullableInstant);
            e.Property(x => x.DropOffLocation).HasColumnName("drop_off_location").HasMaxLength(255);
            e.Property(x => x.DropOffAppointment).HasColumnName("drop_off_appointment_utc").HasConversion(NullableInstant);
            e.Property(x => x.TripType).HasColumnName("trip_type").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.SpecialInstructions).HasColumnName("special_instructions").HasMaxLength(500);
            e.Property(x => x.TruckerPartyId).HasColumnName("trucker_party_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });
    }

    /* ===== explicit converters where SQL ENUM != C# ToString() ===== */

    // ENUM('DOMESTIC','INTERNATIONAL')
    private static System.Linq.Expressions.Expression<Func<CourierType, string>> CtToStr => t =>
        t == CourierType.Domestic ? "DOMESTIC" : "INTERNATIONAL";
    private static System.Linq.Expressions.Expression<Func<string, CourierType>> StrToCt => s =>
        s == "DOMESTIC" ? CourierType.Domestic : CourierType.International;

    // ENUM('PICKUP','DELIVERY','MIXED')
    private static System.Linq.Expressions.Expression<Func<RouteType, string>> RtToStr => t =>
        t == RouteType.Pickup   ? "PICKUP" :
        t == RouteType.Delivery ? "DELIVERY" :
                                  "MIXED";
    private static System.Linq.Expressions.Expression<Func<string, RouteType>> StrToRt => s =>
        s == "PICKUP"   ? RouteType.Pickup :
        s == "DELIVERY" ? RouteType.Delivery :
                          RouteType.Mixed;

    // ENUM('PICKUP','DELIVERY')
    private static System.Linq.Expressions.Expression<Func<StopType, string>> StToStr => t =>
        t == StopType.Pickup ? "PICKUP" : "DELIVERY";
    private static System.Linq.Expressions.Expression<Func<string, StopType>> StrToSt => s =>
        s == "PICKUP" ? StopType.Pickup : StopType.Delivery;

    // ENUM('CASH','CARD','UPI','OTHER')
    private static System.Linq.Expressions.Expression<Func<CodPaymentMethod, string>> PmToStr => p =>
        p == CodPaymentMethod.Cash  ? "CASH" :
        p == CodPaymentMethod.Card  ? "CARD" :
        p == CodPaymentMethod.Upi   ? "UPI" :
                                      "OTHER";
    private static System.Linq.Expressions.Expression<Func<string, CodPaymentMethod>> StrToPm => s =>
        s == "CASH" ? CodPaymentMethod.Cash :
        s == "CARD" ? CodPaymentMethod.Card :
        s == "UPI"  ? CodPaymentMethod.Upi :
                      CodPaymentMethod.Other;

    // ENUM('BOOKING','ROUTE','MANIFEST','POD','COD','AWB')
    private static System.Linq.Expressions.Expression<Func<M9EntityType, string>> EtToStr => t =>
        t == M9EntityType.Booking  ? "BOOKING" :
        t == M9EntityType.Route    ? "ROUTE" :
        t == M9EntityType.Manifest ? "MANIFEST" :
        t == M9EntityType.Pod      ? "POD" :
        t == M9EntityType.Cod      ? "COD" :
                                     "AWB";
    private static System.Linq.Expressions.Expression<Func<string, M9EntityType>> StrToEt => s =>
        s == "BOOKING"  ? M9EntityType.Booking :
        s == "ROUTE"    ? M9EntityType.Route :
        s == "MANIFEST" ? M9EntityType.Manifest :
        s == "POD"      ? M9EntityType.Pod :
        s == "COD"      ? M9EntityType.Cod :
                          M9EntityType.Awb;

    /* ===== shared NodaTime converters ===== */

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant, DateTime>
        InstantConv = new(
            v => v.ToDateTimeUtc(),
            v => Instant.FromDateTimeUtc(DateTime.SpecifyKind(v, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant?, DateTime?>
        NullableInstant = new(
            v => v == null ? null : v.Value.ToDateTimeUtc(),
            v => v == null ? null : Instant.FromDateTimeUtc(DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<LocalDate, DateTime>
        LocalDateConv = new(
            v => new DateTime(v.Year, v.Month, v.Day),
            v => new LocalDate(v.Year, v.Month, v.Day));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<LocalDate?, DateTime?>
        NullableLocalDate = new(
            v => v == null ? null : new DateTime(v.Value.Year, v.Value.Month, v.Value.Day),
            v => v == null ? null : new LocalDate(v.Value.Year, v.Value.Month, v.Value.Day));
}
