using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.FreightForwarding.Domain.Entities;

namespace Ulp.FreightForwarding.Infrastructure.Persistence;

public sealed class FreightForwardingDbContext(DbContextOptions<FreightForwardingDbContext> options) : DbContext(options)
{
    public DbSet<Booking>          Bookings           => Set<Booking>();
    public DbSet<BookingLine>      BookingLines       => Set<BookingLine>();
    public DbSet<Shipment>         Shipments          => Set<Shipment>();
    public DbSet<Mbl>              Mbls               => Set<Mbl>();
    public DbSet<Hbl>              Hbls               => Set<Hbl>();
    public DbSet<Awb>              Awbs               => Set<Awb>();
    public DbSet<Container>        Containers         => Set<Container>();
    public DbSet<ContainerPacking> ContainerPackings  => Set<ContainerPacking>();
    public DbSet<Milestone>        Milestones         => Set<Milestone>();
    public DbSet<ChargeLine>       ChargeLines        => Set<ChargeLine>();
    public DbSet<PartyRole>        PartyRoles         => Set<PartyRole>();
    public DbSet<Routing>          Routings           => Set<Routing>();
    public DbSet<Consol>           Consols            => Set<Consol>();
    public DbSet<ConsolMember>     ConsolMembers      => Set<ConsolMember>();
    public DbSet<DemurrageEvent>   DemurrageEvents    => Set<DemurrageEvent>();
    public DbSet<PreAlert>         PreAlerts          => Set<PreAlert>();
    public DbSet<M5Audit>          Audits             => Set<M5Audit>();
    public DbSet<ShipmentMemo>     Memos              => Set<ShipmentMemo>();
    public DbSet<UserWatchlistEntry> Watchlist        => Set<UserWatchlistEntry>();
    public DbSet<ShipmentHold>     Holds              => Set<ShipmentHold>();
    public DbSet<ShipmentReminder> Reminders          => Set<ShipmentReminder>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Booking>(e =>
        {
            e.ToTable("m5_booking");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.BookingNumber).HasColumnName("booking_number").HasMaxLength(50);
            e.Property(x => x.CustomerPartyId).HasColumnName("customer_party_id");
            e.Property(x => x.ShipperPartyId).HasColumnName("shipper_party_id");
            e.Property(x => x.ConsigneePartyId).HasColumnName("consignee_party_id");
            e.Property(x => x.NotifyPartyId).HasColumnName("notify_party_id");
            e.Property(x => x.TradeDirection).HasColumnName("trade_direction").HasConversion(TradeDirToStr, StrToTradeDir).HasMaxLength(15);
            e.Property(x => x.Mode).HasColumnName("mode").HasConversion(ModeToStr, StrToMode).HasMaxLength(15);
            e.Property(x => x.ServiceType).HasColumnName("service_type").HasConversion(SvcToStr, StrToSvc).HasMaxLength(15);
            e.Property(x => x.Incoterm).HasColumnName("incoterm").HasMaxLength(10);
            e.Property(x => x.OriginPortId).HasColumnName("origin_port_id");
            e.Property(x => x.DestinationPortId).HasColumnName("destination_port_id");
            e.Property(x => x.PickupAddressId).HasColumnName("pickup_address_id");
            e.Property(x => x.DeliveryAddressId).HasColumnName("delivery_address_id");
            e.Property(x => x.ExpectedPickupDate).HasColumnName("expected_pickup_date").HasConversion(NullableLocalDate);
            e.Property(x => x.ExpectedDeliveryDate).HasColumnName("expected_delivery_date").HasConversion(NullableLocalDate);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.TotalPieces).HasColumnName("total_pieces");
            e.Property(x => x.TotalGrossWeightKg).HasColumnName("total_gross_weight_kg").HasPrecision(12, 3);
            e.Property(x => x.TotalVolumeCbm).HasColumnName("total_volume_cbm").HasPrecision(12, 4);
            e.Property(x => x.DeclaredValueAmount).HasColumnName("declared_value_amount").HasPrecision(18, 4);
            e.Property(x => x.DeclaredValueCurrency).HasColumnName("declared_value_currency").HasMaxLength(3).IsFixedLength();
            // SCM Milestone 2 columns (2026-05-03):
            e.Property(x => x.EstimatedCrd).HasColumnName("estimated_crd").HasConversion(NullableLocalDate);
            e.Property(x => x.FfAssignedPartyId).HasColumnName("ff_assigned_party_id");
            e.Property(x => x.Remarks).HasColumnName("remarks");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<BookingLine>(e =>
        {
            e.ToTable("m5_booking_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.LineNumber).HasColumnName("line_number");
            e.Property(x => x.ProductId).HasColumnName("product_id");
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
            e.Property(x => x.HsCode).HasColumnName("hs_code").HasMaxLength(15);
            e.Property(x => x.Pieces).HasColumnName("pieces");
            e.Property(x => x.PackagingType).HasColumnName("packaging_type").HasMaxLength(50);
            e.Property(x => x.GrossWeightKg).HasColumnName("gross_weight_kg").HasPrecision(12, 3);
            e.Property(x => x.VolumeCbm).HasColumnName("volume_cbm").HasPrecision(12, 4);
            e.Property(x => x.IsHazmat).HasColumnName("is_hazmat");
            e.Property(x => x.IsPerishable).HasColumnName("is_perishable");
        });

        b.Entity<Shipment>(e =>
        {
            e.ToTable("m5_shipment");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.ShipmentNumber).HasColumnName("shipment_number").HasMaxLength(50);
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.Mode).HasColumnName("mode").HasConversion(ModeToStr, StrToMode).HasMaxLength(15);
            e.Property(x => x.CarrierPartyId).HasColumnName("carrier_party_id");
            e.Property(x => x.VesselOrFlight).HasColumnName("vessel_or_flight").HasMaxLength(50);
            e.Property(x => x.VoyageOrFlightNo).HasColumnName("voyage_or_flight_no").HasMaxLength(30);
            e.Property(x => x.Etd).HasColumnName("etd").HasConversion(NullableInstant);
            e.Property(x => x.Eta).HasColumnName("eta").HasConversion(NullableInstant);
            e.Property(x => x.Atd).HasColumnName("atd").HasConversion(NullableInstant);
            e.Property(x => x.Ata).HasColumnName("ata").HasConversion(NullableInstant);
            e.Property(x => x.OriginPortId).HasColumnName("origin_port_id");
            e.Property(x => x.DestinationPortId).HasColumnName("destination_port_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Remarks).HasColumnName("remarks");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<Mbl>(e =>
        {
            e.ToTable("m5_mbl");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.MblNumber).HasColumnName("mbl_number").HasMaxLength(50);
            e.Property(x => x.BlType).HasColumnName("bl_type").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.IssuedByCarrierPartyId).HasColumnName("issued_by_carrier_party_id");
            e.Property(x => x.ReleaseType).HasColumnName("release_type").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.IssueDate).HasColumnName("issue_date").HasConversion(NullableLocalDate);
            e.Property(x => x.OnBoardDate).HasColumnName("on_board_date").HasConversion(NullableLocalDate);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
        });

        b.Entity<Hbl>(e =>
        {
            e.ToTable("m5_hbl");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.MblId).HasColumnName("mbl_id");
            e.Property(x => x.HblNumber).HasColumnName("hbl_number").HasMaxLength(50);
            e.Property(x => x.ShipperPartyId).HasColumnName("shipper_party_id");
            e.Property(x => x.ConsigneePartyId).HasColumnName("consignee_party_id");
            e.Property(x => x.NotifyPartyId).HasColumnName("notify_party_id");
            e.Property(x => x.ReleaseType).HasColumnName("release_type").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.IssueDate).HasColumnName("issue_date").HasConversion(NullableLocalDate);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
        });

        b.Entity<Awb>(e =>
        {
            e.ToTable("m5_awb");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.AwbType).HasColumnName("awb_type").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.AwbNumber).HasColumnName("awb_number").HasMaxLength(20);
            e.Property(x => x.ParentAwbId).HasColumnName("parent_awb_id");
            e.Property(x => x.IataCarrierCode).HasColumnName("iata_carrier_code").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.FlightNumber).HasColumnName("flight_number").HasMaxLength(10);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
        });

        b.Entity<Container>(e =>
        {
            e.ToTable("m5_container");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.ContainerNumber).HasColumnName("container_number").HasMaxLength(20);
            e.Property(x => x.ContainerType).HasColumnName("container_type").HasMaxLength(10);
            e.Property(x => x.SealNumber).HasColumnName("seal_number").HasMaxLength(30);
            e.Property(x => x.TareWeightKg).HasColumnName("tare_weight_kg").HasPrecision(10, 2);
            e.Property(x => x.CargoWeightKg).HasColumnName("cargo_weight_kg").HasPrecision(12, 3);
            e.Property(x => x.PackedAt).HasColumnName("packed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.LoadedAt).HasColumnName("loaded_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.DischargedAt).HasColumnName("discharged_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.GateOutAt).HasColumnName("gate_out_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.EmptyReturnedAt).HasColumnName("empty_returned_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.FreeDays).HasColumnName("free_days");
            e.Property(x => x.PerDiemStarts).HasColumnName("per_diem_starts").HasConversion(NullableLocalDate);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
        });

        b.Entity<ContainerPacking>(e =>
        {
            e.ToTable("m5_container_packing");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ContainerId).HasColumnName("container_id");
            e.Property(x => x.HblId).HasColumnName("hbl_id");
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
            e.Property(x => x.Pieces).HasColumnName("pieces");
            e.Property(x => x.WeightKg).HasColumnName("weight_kg").HasPrecision(12, 3);
            e.Property(x => x.VolumeCbm).HasColumnName("volume_cbm").HasPrecision(12, 4);
        });

        b.Entity<Milestone>(e =>
        {
            e.ToTable("m5_milestone");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.MilestoneCode).HasColumnName("milestone_code").HasMaxLength(50);
            e.Property(x => x.OccurredAt).HasColumnName("occurred_at_utc").HasConversion(InstantConv);
            e.Property(x => x.LocationPortId).HasColumnName("location_port_id");
            e.Property(x => x.Source).HasColumnName("source").HasConversion(MsSourceToStr, StrToMsSource).HasMaxLength(15);
            e.Property(x => x.Remarks).HasColumnName("remarks");
        });

        b.Entity<ChargeLine>(e =>
        {
            e.ToTable("m5_charge_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.ChargeCode).HasColumnName("charge_code").HasMaxLength(50);
            e.Property(x => x.RateCardId).HasColumnName("rate_card_id");
            e.Property(x => x.Quantity).HasColumnName("quantity").HasPrecision(12, 4);
            e.Property(x => x.UomCode).HasColumnName("uom_code").HasMaxLength(10);
            e.Property(x => x.UnitPriceAmount).HasColumnName("unit_price_amount").HasPrecision(18, 4);
            e.Property(x => x.UnitPriceCurrency).HasColumnName("unit_price_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.AmountAmount).HasColumnName("amount_amount").HasPrecision(18, 4);
            e.Property(x => x.AmountCurrency).HasColumnName("amount_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.IsBillable).HasColumnName("is_billable");
            e.Property(x => x.InvoiceStatus).HasColumnName("invoice_status").HasConversion<string>().HasMaxLength(15);
        });

        b.Entity<PartyRole>(e =>
        {
            e.ToTable("m5_party_role");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.PartyId).HasColumnName("party_id");
            e.Property(x => x.Role).HasColumnName("role").HasConversion(RoleToStr, StrToRole).HasMaxLength(20);
            e.Property(x => x.ContactName).HasColumnName("contact_name").HasMaxLength(150);
            e.Property(x => x.ContactEmail).HasColumnName("contact_email").HasMaxLength(255);
            e.Property(x => x.ContactPhone).HasColumnName("contact_phone").HasMaxLength(30);
        });

        b.Entity<Routing>(e =>
        {
            e.ToTable("m5_routing");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.LegSequence).HasColumnName("leg_sequence");
            e.Property(x => x.OriginPortId).HasColumnName("origin_port_id");
            e.Property(x => x.DestPortId).HasColumnName("dest_port_id");
            e.Property(x => x.Mode).HasColumnName("mode").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.VesselOrFlight).HasColumnName("vessel_or_flight").HasMaxLength(50);
            e.Property(x => x.VoyageOrFlightNo).HasColumnName("voyage_or_flight_no").HasMaxLength(30);
            e.Property(x => x.Etd).HasColumnName("etd").HasConversion(NullableInstant);
            e.Property(x => x.Eta).HasColumnName("eta").HasConversion(NullableInstant);
        });

        b.Entity<Consol>(e =>
        {
            e.ToTable("m5_consol");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ConsolNumber).HasColumnName("consol_number").HasMaxLength(50);
            e.Property(x => x.ConsolType).HasColumnName("consol_type").HasConversion(ConsolTypeToStr, StrToConsolType).HasMaxLength(15);
            e.Property(x => x.MasterShipmentId).HasColumnName("master_shipment_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<ConsolMember>(e =>
        {
            e.ToTable("m5_consol_member");
            e.HasKey(x => new { x.ConsolId, x.HblId });
            e.Property(x => x.ConsolId).HasColumnName("consol_id");
            e.Property(x => x.HblId).HasColumnName("hbl_id");
        });

        b.Entity<DemurrageEvent>(e =>
        {
            e.ToTable("m5_demurrage_event");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ContainerId).HasColumnName("container_id");
            e.Property(x => x.EventType).HasColumnName("event_type").HasConversion(DemurTypeToStr, StrToDemurType).HasMaxLength(15);
            e.Property(x => x.StartDate).HasColumnName("start_date").HasConversion(LocalDateConv);
            e.Property(x => x.EndDate).HasColumnName("end_date").HasConversion(NullableLocalDate);
            e.Property(x => x.Days).HasColumnName("days");
            e.Property(x => x.RateAmount).HasColumnName("rate_amount").HasPrecision(18, 4);
            e.Property(x => x.RateCurrency).HasColumnName("rate_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.TotalAmount).HasColumnName("total_amount").HasPrecision(18, 4);
            e.Property(x => x.TotalCurrency).HasColumnName("total_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
        });

        b.Entity<PreAlert>(e =>
        {
            e.ToTable("m5_pre_alert");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.RecipientPartyId).HasColumnName("recipient_party_id");
            e.Property(x => x.SentAt).HasColumnName("sent_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
        });

        b.Entity<M5Audit>(e =>
        {
            e.ToTable("m5_audit");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EntityType).HasColumnName("entity_type").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.EntityId).HasColumnName("entity_id");
            e.Property(x => x.Action).HasColumnName("action").HasMaxLength(50);
            e.Property(x => x.PerformedBy).HasColumnName("performed_by");
            e.Property(x => x.PerformedAt).HasColumnName("performed_at_utc").HasConversion(InstantConv);
            e.Property(x => x.DetailsJson).HasColumnName("details").HasColumnType("json");
        });

        // SCM Milestone 1: shipment internal memo notes
        b.Entity<ShipmentMemo>(e =>
        {
            e.ToTable("m5_memo");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.AuthorUserId).HasColumnName("author_user_id");
            e.Property(x => x.Body).HasColumnName("body");
            e.Property(x => x.IsPinned).HasColumnName("is_pinned");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        // SCM Milestone 1+2: per-user starred shipments
        b.Entity<UserWatchlistEntry>(e =>
        {
            e.ToTable("m5_user_watchlist");
            e.HasKey(x => new { x.TenantId, x.UserSub, x.ShipmentId });
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.UserSub).HasColumnName("user_sub").HasMaxLength(64);
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.StarredAt).HasColumnName("starred_at_utc").HasConversion(InstantConv);
        });

        // SCM Milestone 1+2 â€” operational holds per shipment.
        b.Entity<ShipmentHold>(e =>
        {
            e.ToTable("m5_hold");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.HoldType).HasColumnName("hold_type").HasConversion(HoldToStr, StrToHold).HasMaxLength(20);
            e.Property(x => x.Reason).HasColumnName("reason").HasMaxLength(255);
            e.Property(x => x.RaisedBy).HasColumnName("raised_by");
            e.Property(x => x.RaisedAt).HasColumnName("raised_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ClearedBy).HasColumnName("cleared_by");
            e.Property(x => x.ClearedAt).HasColumnName("cleared_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ResolutionNote).HasColumnName("resolution_note").HasMaxLength(500);
        });

        // SCM Milestone 1+2 â€” date-driven reminders.
        b.Entity<ShipmentReminder>(e =>
        {
            e.ToTable("m5_reminder");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.ContainerId).HasColumnName("container_id");
            e.Property(x => x.ReminderKind).HasColumnName("reminder_kind").HasConversion(KindToStr, StrToKind).HasMaxLength(20);
            e.Property(x => x.Title).HasColumnName("title").HasMaxLength(150);
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.DueAt).HasColumnName("due_at_utc").HasConversion(InstantConv);
            e.Property(x => x.AssignedUserSub).HasColumnName("assigned_user_sub").HasMaxLength(64);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
            e.Property(x => x.LastFiredAt).HasColumnName("last_fired_at_utc").HasConversion(NullableInstant);
        });
    }

    /* ===== enum <-> SQL ENUM string converters (camelCase ToString diverges) ===== */

    // ENUM('CUSTOMS','PGA','MISSING_DOC','CUSTOMER_DISPUTE','PAYMENT','OPERATIONS','OTHER')
    private static System.Linq.Expressions.Expression<Func<HoldType, string>> HoldToStr => h =>
        h == HoldType.Customs         ? "CUSTOMS" :
        h == HoldType.Pga             ? "PGA" :
        h == HoldType.MissingDoc      ? "MISSING_DOC" :
        h == HoldType.CustomerDispute ? "CUSTOMER_DISPUTE" :
        h == HoldType.Payment         ? "PAYMENT" :
        h == HoldType.Operations      ? "OPERATIONS" :
                                        "OTHER";

    private static System.Linq.Expressions.Expression<Func<string, HoldType>> StrToHold => s =>
        s == "CUSTOMS"          ? HoldType.Customs :
        s == "PGA"              ? HoldType.Pga :
        s == "MISSING_DOC"      ? HoldType.MissingDoc :
        s == "CUSTOMER_DISPUTE" ? HoldType.CustomerDispute :
        s == "PAYMENT"          ? HoldType.Payment :
        s == "OPERATIONS"       ? HoldType.Operations :
                                  HoldType.Other;

    // ENUM('FOLLOW_UP','DOC_DUE','POD_FOLLOWUP','RETURN_DUE','PAYMENT_DUE','CUSTOM')
    private static System.Linq.Expressions.Expression<Func<ReminderKind, string>> KindToStr => k =>
        k == ReminderKind.FollowUp     ? "FOLLOW_UP" :
        k == ReminderKind.DocDue       ? "DOC_DUE" :
        k == ReminderKind.PodFollowup  ? "POD_FOLLOWUP" :
        k == ReminderKind.ReturnDue    ? "RETURN_DUE" :
        k == ReminderKind.PaymentDue   ? "PAYMENT_DUE" :
                                         "CUSTOM";

    private static System.Linq.Expressions.Expression<Func<string, ReminderKind>> StrToKind => s =>
        s == "FOLLOW_UP"    ? ReminderKind.FollowUp :
        s == "DOC_DUE"      ? ReminderKind.DocDue :
        s == "POD_FOLLOWUP" ? ReminderKind.PodFollowup :
        s == "RETURN_DUE"   ? ReminderKind.ReturnDue :
        s == "PAYMENT_DUE"  ? ReminderKind.PaymentDue :
                              ReminderKind.Custom;

    // ENUM('IMPORT','EXPORT','CROSS_TRADE','DOMESTIC')
    private static System.Linq.Expressions.Expression<Func<TradeDirection, string>> TradeDirToStr => t =>
        t == TradeDirection.Import     ? "IMPORT" :
        t == TradeDirection.Export     ? "EXPORT" :
        t == TradeDirection.CrossTrade ? "CROSS_TRADE" :
                                         "DOMESTIC";

    private static System.Linq.Expressions.Expression<Func<string, TradeDirection>> StrToTradeDir => s =>
        s == "IMPORT"      ? TradeDirection.Import :
        s == "EXPORT"      ? TradeDirection.Export :
        s == "CROSS_TRADE" ? TradeDirection.CrossTrade :
                             TradeDirection.Domestic;

    // ENUM('AIR','OCEAN_FCL','OCEAN_LCL','ROAD','RAIL','MULTIMODAL')
    private static System.Linq.Expressions.Expression<Func<TransportMode, string>> ModeToStr => m =>
        m == TransportMode.Air        ? "AIR" :
        m == TransportMode.OceanFcl   ? "OCEAN_FCL" :
        m == TransportMode.OceanLcl   ? "OCEAN_LCL" :
        m == TransportMode.Road       ? "ROAD" :
        m == TransportMode.Rail       ? "RAIL" :
                                        "MULTIMODAL";

    private static System.Linq.Expressions.Expression<Func<string, TransportMode>> StrToMode => s =>
        s == "AIR"        ? TransportMode.Air :
        s == "OCEAN_FCL"  ? TransportMode.OceanFcl :
        s == "OCEAN_LCL"  ? TransportMode.OceanLcl :
        s == "ROAD"       ? TransportMode.Road :
        s == "RAIL"       ? TransportMode.Rail :
                            TransportMode.Multimodal;

    // ENUM('DOOR_DOOR','DOOR_PORT','PORT_DOOR','PORT_PORT')
    private static System.Linq.Expressions.Expression<Func<ServiceType, string>> SvcToStr => s =>
        s == ServiceType.DoorDoor ? "DOOR_DOOR" :
        s == ServiceType.DoorPort ? "DOOR_PORT" :
        s == ServiceType.PortDoor ? "PORT_DOOR" :
                                    "PORT_PORT";

    private static System.Linq.Expressions.Expression<Func<string, ServiceType>> StrToSvc => s =>
        s == "DOOR_DOOR" ? ServiceType.DoorDoor :
        s == "DOOR_PORT" ? ServiceType.DoorPort :
        s == "PORT_DOOR" ? ServiceType.PortDoor :
                           ServiceType.PortPort;

    // ENUM('SYSTEM','EDI','MANUAL','CARRIER_API','GPS')
    private static System.Linq.Expressions.Expression<Func<MilestoneSource, string>> MsSourceToStr => s =>
        s == MilestoneSource.System     ? "SYSTEM" :
        s == MilestoneSource.Edi        ? "EDI" :
        s == MilestoneSource.Manual     ? "MANUAL" :
        s == MilestoneSource.CarrierApi ? "CARRIER_API" :
                                          "GPS";

    private static System.Linq.Expressions.Expression<Func<string, MilestoneSource>> StrToMsSource => s =>
        s == "SYSTEM"      ? MilestoneSource.System :
        s == "EDI"         ? MilestoneSource.Edi :
        s == "MANUAL"      ? MilestoneSource.Manual :
        s == "CARRIER_API" ? MilestoneSource.CarrierApi :
                             MilestoneSource.Gps;

    // ENUM('CARRIER','ORIGIN_AGENT','DESTINATION_AGENT','TRUCKER','SURVEYOR','BROKER','BANK')
    private static System.Linq.Expressions.Expression<Func<PartyRoleKind, string>> RoleToStr => r =>
        r == PartyRoleKind.Carrier          ? "CARRIER" :
        r == PartyRoleKind.OriginAgent      ? "ORIGIN_AGENT" :
        r == PartyRoleKind.DestinationAgent ? "DESTINATION_AGENT" :
        r == PartyRoleKind.Trucker          ? "TRUCKER" :
        r == PartyRoleKind.Surveyor         ? "SURVEYOR" :
        r == PartyRoleKind.Broker           ? "BROKER" :
                                              "BANK";

    private static System.Linq.Expressions.Expression<Func<string, PartyRoleKind>> StrToRole => s =>
        s == "CARRIER"           ? PartyRoleKind.Carrier :
        s == "ORIGIN_AGENT"      ? PartyRoleKind.OriginAgent :
        s == "DESTINATION_AGENT" ? PartyRoleKind.DestinationAgent :
        s == "TRUCKER"           ? PartyRoleKind.Trucker :
        s == "SURVEYOR"          ? PartyRoleKind.Surveyor :
        s == "BROKER"            ? PartyRoleKind.Broker :
                                   PartyRoleKind.Bank;

    // ENUM('AIR_CONSOL','SEA_LCL','ROAD_CONSOL')
    private static System.Linq.Expressions.Expression<Func<ConsolType, string>> ConsolTypeToStr => c =>
        c == ConsolType.AirConsol ? "AIR_CONSOL" :
        c == ConsolType.SeaLcl    ? "SEA_LCL" :
                                    "ROAD_CONSOL";

    private static System.Linq.Expressions.Expression<Func<string, ConsolType>> StrToConsolType => s =>
        s == "AIR_CONSOL" ? ConsolType.AirConsol :
        s == "SEA_LCL"    ? ConsolType.SeaLcl :
                            ConsolType.RoadConsol;

    // ENUM('DEMURRAGE','DETENTION','PER_DIEM')
    private static System.Linq.Expressions.Expression<Func<DemurrageType, string>> DemurTypeToStr => d =>
        d == DemurrageType.Demurrage ? "DEMURRAGE" :
        d == DemurrageType.Detention ? "DETENTION" :
                                       "PER_DIEM";

    private static System.Linq.Expressions.Expression<Func<string, DemurrageType>> StrToDemurType => s =>
        s == "DEMURRAGE" ? DemurrageType.Demurrage :
        s == "DETENTION" ? DemurrageType.Detention :
                           DemurrageType.PerDiem;

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
