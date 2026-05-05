using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using NodaTime;
using Ulp.Customs.Domain.Entities;

namespace Ulp.Customs.Infrastructure.Persistence;

public sealed class CustomsDbContext(DbContextOptions<CustomsDbContext> options) : DbContext(options)
{
    public DbSet<CustomsEntry>     Entries        => Set<CustomsEntry>();
    public DbSet<CustomsEntryLine> Lines          => Set<CustomsEntryLine>();
    public DbSet<CustomsBond>      Bonds          => Set<CustomsBond>();
    public DbSet<IsfFiling>        Isfs           => Set<IsfFiling>();
    public DbSet<PgaHold>          PgaHolds       => Set<PgaHold>();
    public DbSet<Atm>              Atms           => Set<Atm>();
    public DbSet<ReleaseOrder>     ReleaseOrders  => Set<ReleaseOrder>();
    public DbSet<InBondMove>       InBondMoves    => Set<InBondMove>();
    public DbSet<CustomsHoldExam>  HoldExams      => Set<CustomsHoldExam>();
    public DbSet<AbiMessage>       AbiMessages    => Set<AbiMessage>();
    public DbSet<PartyLookup>      PartyLookups   => Set<PartyLookup>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<CustomsEntry>(e =>
        {
            e.ToTable("m4us_entry");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.EntryNumber).HasColumnName("entry_number").HasMaxLength(11).IsFixedLength();
            e.Property(x => x.FilerCode).HasColumnName("filer_code").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.EntryType).HasColumnName("entry_type").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.EntryTypeDescription).HasColumnName("entry_type_description").HasMaxLength(50);
            e.Property(x => x.ImporterOfRecordId).HasColumnName("importer_of_record_id");
            e.Property(x => x.ImporterEin).HasColumnName("importer_ein").HasMaxLength(20);
            e.Property(x => x.ConsigneeId).HasColumnName("consignee_id");
            e.Property(x => x.UltimateConsigneeId).HasColumnName("ultimate_consignee_id");
            e.Property(x => x.BondId).HasColumnName("bond_id");
            e.Property(x => x.CarrierScac).HasColumnName("carrier_scac").HasMaxLength(4).IsFixedLength();
            e.Property(x => x.VesselName).HasColumnName("vessel_name").HasMaxLength(100);
            e.Property(x => x.VoyageNumber).HasColumnName("voyage_number").HasMaxLength(20);
            e.Property(x => x.PortOfUnladingCode).HasColumnName("port_of_unlading_code").HasMaxLength(4).IsFixedLength();
            e.Property(x => x.PortOfEntryCode).HasColumnName("port_of_entry_code").HasMaxLength(4).IsFixedLength();
            e.Property(x => x.FirmsCode).HasColumnName("firms_code").HasMaxLength(4).IsFixedLength();
            e.Property(x => x.EntryDate).HasColumnName("entry_date").HasConversion(LocalDateConv);
            e.Property(x => x.ImportDate).HasColumnName("import_date").HasConversion(LocalDateConv);
            e.Property(x => x.EstimatedArrivalDate).HasColumnName("estimated_arrival_date").HasConversion(NullableLocalDate);
            e.Property(x => x.ReleaseDate).HasColumnName("release_date").HasConversion(NullableLocalDate);
            e.Property(x => x.BillOfLading).HasColumnName("bill_of_lading").HasMaxLength(50);
            e.Property(x => x.ScacBillId).HasColumnName("scac_bill_id").HasMaxLength(60);
            e.Property(x => x.InBondNumber).HasColumnName("in_bond_number").HasMaxLength(20);
            e.Property(x => x.AbiStatus).HasColumnName("abi_status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.CbpStatusMessage).HasColumnName("cbp_status_message");
            e.Property(x => x.PgaHoldFlag).HasColumnName("pga_hold_flag");
            e.Property(x => x.ExamType).HasColumnName("exam_type").HasConversion(ExamTypeToStr, StrToExamType).HasMaxLength(15);
            e.Property(x => x.TotalValueUsd).HasColumnName("total_value_usd").HasPrecision(18, 2);
            e.Property(x => x.DutyAmountUsd).HasColumnName("duty_amount_usd").HasPrecision(18, 2);
            e.Property(x => x.MpfUsd).HasColumnName("mpf_usd").HasPrecision(18, 2);
            e.Property(x => x.HmfUsd).HasColumnName("hmf_usd").HasPrecision(18, 2);
            e.Property(x => x.TotalFeesUsd).HasColumnName("total_fees_usd").HasPrecision(18, 2);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.SubmittedAt).HasColumnName("submitted_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ReleasedAt).HasColumnName("released_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.LiquidatedAt).HasColumnName("liquidated_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<CustomsEntryLine>(e =>
        {
            e.ToTable("m4us_entry_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EntryId).HasColumnName("entry_id");
            e.Property(x => x.LineNumber).HasColumnName("line_number");
            e.Property(x => x.HtsNumber).HasColumnName("hts_number").HasMaxLength(15);
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            e.Property(x => x.CountryOfOrigin).HasColumnName("country_of_origin").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.Quantity).HasColumnName("quantity").HasPrecision(18, 4);
            e.Property(x => x.UnitOfMeasure).HasColumnName("unit_of_measure").HasMaxLength(10);
            e.Property(x => x.NetWeightKg).HasColumnName("net_weight_kg").HasPrecision(18, 4);
            e.Property(x => x.InvoiceValueUsd).HasColumnName("invoice_value_usd").HasPrecision(18, 2);
            e.Property(x => x.InvoiceCurrency).HasColumnName("invoice_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.InvoiceValueOrig).HasColumnName("invoice_value_orig").HasPrecision(18, 2);
            e.Property(x => x.FxRate).HasColumnName("fx_rate").HasPrecision(18, 8);
            e.Property(x => x.DutyRatePct).HasColumnName("duty_rate_pct").HasPrecision(8, 4);
            e.Property(x => x.DutySpecific).HasColumnName("duty_specific").HasPrecision(18, 4);
            e.Property(x => x.DutyAmountUsd).HasColumnName("duty_amount_usd").HasPrecision(18, 2);
            e.Property(x => x.AddCaseNumber).HasColumnName("add_case_number").HasMaxLength(20);
            e.Property(x => x.CvdCaseNumber).HasColumnName("cvd_case_number").HasMaxLength(20);
            e.Property(x => x.AddRatePct).HasColumnName("add_rate_pct").HasPrecision(8, 4);
            e.Property(x => x.CvdRatePct).HasColumnName("cvd_rate_pct").HasPrecision(8, 4);
            e.Property(x => x.SpecialProgram).HasColumnName("special_program").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.PreferentialTreatmentPct).HasColumnName("preferential_treatment_pct").HasPrecision(8, 4);
            e.Property(x => x.FdaRequired).HasColumnName("fda_required");
            e.Property(x => x.UsdaRequired).HasColumnName("usda_required");
            e.Property(x => x.EpaRequired).HasColumnName("epa_required");
            e.Property(x => x.FccRequired).HasColumnName("fcc_required");
            e.Property(x => x.ManufacturerIdCode).HasColumnName("manufacturer_id_code").HasMaxLength(15);
        });

        b.Entity<CustomsBond>(e =>
        {
            e.ToTable("m4us_bond");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BondNumber).HasColumnName("bond_number").HasMaxLength(30);
            e.Property(x => x.BondType).HasColumnName("bond_type").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.SuretyCode).HasColumnName("surety_code").HasMaxLength(10);
            e.Property(x => x.SuretyName).HasColumnName("surety_name").HasMaxLength(150);
            e.Property(x => x.ImporterPartyId).HasColumnName("importer_party_id");
            e.Property(x => x.AmountUsd).HasColumnName("amount_usd").HasPrecision(18, 2);
            e.Property(x => x.EffectiveFrom).HasColumnName("effective_from").HasConversion(LocalDateConv);
            e.Property(x => x.EffectiveTo).HasColumnName("effective_to").HasConversion(NullableLocalDate);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.UtilizationPct).HasColumnName("utilization_pct").HasPrecision(5, 2);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<IsfFiling>(e =>
        {
            e.ToTable("m4us_isf");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ShipmentId).HasColumnName("shipment_id");
            e.Property(x => x.ImporterOfRecordId).HasColumnName("importer_of_record_id");
            e.Property(x => x.ImporterNumber).HasColumnName("importer_number").HasMaxLength(20);
            e.Property(x => x.ConsigneeNumber).HasColumnName("consignee_number").HasMaxLength(20);
            e.Property(x => x.SellerName).HasColumnName("seller_name").HasMaxLength(255);
            e.Property(x => x.SellerAddress).HasColumnName("seller_address").HasMaxLength(500);
            e.Property(x => x.BuyerName).HasColumnName("buyer_name").HasMaxLength(255);
            e.Property(x => x.BuyerAddress).HasColumnName("buyer_address").HasMaxLength(500);
            e.Property(x => x.ShipToName).HasColumnName("ship_to_name").HasMaxLength(255);
            e.Property(x => x.ShipToAddress).HasColumnName("ship_to_address").HasMaxLength(500);
            e.Property(x => x.ManufacturerName).HasColumnName("manufacturer_name").HasMaxLength(255);
            e.Property(x => x.ManufacturerAddress).HasColumnName("manufacturer_address").HasMaxLength(500);
            e.Property(x => x.CountryOfOrigin).HasColumnName("country_of_origin").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.Hts6).HasColumnName("hts_6").HasMaxLength(7);
            e.Property(x => x.ContainerStuffingLocation).HasColumnName("container_stuffing_location").HasMaxLength(255);
            e.Property(x => x.ConsolidatorName).HasColumnName("consolidator_name").HasMaxLength(255);
            e.Property(x => x.FilingStatus).HasColumnName("filing_status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.FiledAt).HasColumnName("filed_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.VesselLoadCutoff).HasColumnName("vessel_load_cutoff_utc").HasConversion(NullableInstant);
            e.Property(x => x.BondId).HasColumnName("bond_id");
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<PgaHold>(e =>
        {
            e.ToTable("m4us_pga_hold");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EntryId).HasColumnName("entry_id");
            e.Property(x => x.PgaCode).HasColumnName("pga_code").HasConversion(PgaCodeToStr, StrToPgaCode).HasMaxLength(15);
            e.Property(x => x.HoldReasonCode).HasColumnName("hold_reason_code").HasMaxLength(20);
            e.Property(x => x.HoldReasonText).HasColumnName("hold_reason_text").HasMaxLength(500);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.RaisedAt).HasColumnName("raised_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ReleasedAt).HasColumnName("released_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ReleasedBy).HasColumnName("released_by");
            e.Property(x => x.ResolutionNote).HasColumnName("resolution_note").HasMaxLength(500);
        });

        b.Entity<Atm>(e =>
        {
            e.ToTable("m4us_atm");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ImporterPartyId).HasColumnName("importer_party_id");
            e.Property(x => x.BrokerFilerCode).HasColumnName("broker_filer_code").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.CombinedWithPoa).HasColumnName("combined_with_poa");
            e.Property(x => x.SignedAt).HasColumnName("signed_at").HasConversion(LocalDateConv);
            e.Property(x => x.EffectiveFrom).HasColumnName("effective_from").HasConversion(LocalDateConv);
            e.Property(x => x.EffectiveTo).HasColumnName("effective_to").HasConversion(NullableLocalDate);
            e.Property(x => x.SignerName).HasColumnName("signer_name").HasMaxLength(255);
            e.Property(x => x.SignerTitle).HasColumnName("signer_title").HasMaxLength(100);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<ReleaseOrder>(e =>
        {
            e.ToTable("m4us_release_order");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EntryId).HasColumnName("entry_id");
            e.Property(x => x.OrderType).HasColumnName("order_type").HasConversion<string>().HasMaxLength(25);
            e.Property(x => x.ReferenceNumber).HasColumnName("reference_number").HasMaxLength(40);
            e.Property(x => x.CarrierPartyId).HasColumnName("carrier_party_id");
            e.Property(x => x.WarehousePartyId).HasColumnName("warehouse_party_id");
            e.Property(x => x.IssuedAt).HasColumnName("issued_at").HasConversion(LocalDateConv);
            e.Property(x => x.CargoPickupAt).HasColumnName("cargo_pickup_at").HasConversion(NullableLocalDate);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<InBondMove>(e =>
        {
            e.ToTable("m4us_in_bond");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EntryId).HasColumnName("entry_id");
            e.Property(x => x.InBondNumber).HasColumnName("in_bond_number").HasMaxLength(20);
            e.Property(x => x.InBondType).HasColumnName("in_bond_type").HasConversion<string>().HasMaxLength(2);
            e.Property(x => x.CarrierScac).HasColumnName("carrier_scac").HasMaxLength(4).IsFixedLength();
            e.Property(x => x.OriginPortCode).HasColumnName("origin_port_code").HasMaxLength(4).IsFixedLength();
            e.Property(x => x.DestinationPortCode).HasColumnName("destination_port_code").HasMaxLength(4).IsFixedLength();
            e.Property(x => x.BondedCarrierId).HasColumnName("bonded_carrier_id");
            e.Property(x => x.InitiatedAt).HasColumnName("initiated_at").HasConversion(LocalDateConv);
            e.Property(x => x.ArrivedAt).HasColumnName("arrived_at").HasConversion(NullableLocalDate);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<CustomsHoldExam>(e =>
        {
            e.ToTable("m4us_customs_hold_exam");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EntryId).HasColumnName("entry_id");
            e.Property(x => x.NoticeType).HasColumnName("notice_type").HasConversion<string>().HasMaxLength(10);
            e.Property(x => x.ExamType).HasColumnName("exam_type").HasConversion(ExamTypeToStr, StrToExamType).HasMaxLength(15);
            e.Property(x => x.HoldReasonCode).HasColumnName("hold_reason_code").HasMaxLength(20);
            e.Property(x => x.HoldReasonText).HasColumnName("hold_reason_text").HasMaxLength(500);
            e.Property(x => x.ExamSite).HasColumnName("exam_site").HasMaxLength(150);
            e.Property(x => x.ExamAppointmentAt).HasColumnName("exam_appointment_at").HasConversion(NullableInstant);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.RaisedAt).HasColumnName("raised_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ResolvedAt).HasColumnName("resolved_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.ResolutionNote).HasColumnName("resolution_note").HasMaxLength(500);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
        });

        b.Entity<AbiMessage>(e =>
        {
            e.ToTable("m4us_abi_message");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EntryId).HasColumnName("entry_id");
            e.Property(x => x.MessageCode).HasColumnName("message_code").HasMaxLength(4);
            e.Property(x => x.Direction).HasColumnName("direction").HasConversion<string>().HasMaxLength(4);
            e.Property(x => x.PayloadRedacted).HasColumnName("payload_redacted");
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.AttemptCount).HasColumnName("attempt_count");
            e.Property(x => x.CbpReference).HasColumnName("cbp_reference").HasMaxLength(40);
            e.Property(x => x.AcknowledgedAt).HasColumnName("acknowledged_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.FailureReason).HasColumnName("failure_reason").HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.SentAt).HasColumnName("sent_at_utc").HasConversion(NullableInstant);
        });

        b.Entity<PartyLookup>(e =>
        {
            e.HasNoKey();
            e.ToView("m1_party");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.LegalName).HasColumnName("legal_name").HasMaxLength(255);
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
        });
    }

    // ENUM('NIL','XRAY','INTENSIVE','CET','TAILGATE')
    private static Expression<Func<ExamType, string>> ExamTypeToStr => t =>
        t == ExamType.Nil       ? "NIL" :
        t == ExamType.Xray      ? "XRAY" :
        t == ExamType.Intensive ? "INTENSIVE" :
        t == ExamType.Cet       ? "CET" :
                                  "TAILGATE";
    private static Expression<Func<string, ExamType>> StrToExamType => s =>
        s == "NIL"       ? ExamType.Nil :
        s == "XRAY"      ? ExamType.Xray :
        s == "INTENSIVE" ? ExamType.Intensive :
        s == "CET"       ? ExamType.Cet :
                           ExamType.Tailgate;

    // ENUM('FDA','USDA-APHIS','USDA-FSIS','EPA-TSCA','EPA-FIFRA','FCC','FWS','CPSC','ATF','DOT-NHTSA')
    private static Expression<Func<PgaCode, string>> PgaCodeToStr => p =>
        p == PgaCode.Fda       ? "FDA" :
        p == PgaCode.UsdaAphis ? "USDA-APHIS" :
        p == PgaCode.UsdaFsis  ? "USDA-FSIS" :
        p == PgaCode.EpaTsca   ? "EPA-TSCA" :
        p == PgaCode.EpaFifra  ? "EPA-FIFRA" :
        p == PgaCode.Fcc       ? "FCC" :
        p == PgaCode.Fws       ? "FWS" :
        p == PgaCode.Cpsc      ? "CPSC" :
        p == PgaCode.Atf       ? "ATF" :
                                 "DOT-NHTSA";
    private static Expression<Func<string, PgaCode>> StrToPgaCode => s =>
        s == "FDA"        ? PgaCode.Fda :
        s == "USDA-APHIS" ? PgaCode.UsdaAphis :
        s == "USDA-FSIS"  ? PgaCode.UsdaFsis :
        s == "EPA-TSCA"   ? PgaCode.EpaTsca :
        s == "EPA-FIFRA"  ? PgaCode.EpaFifra :
        s == "FCC"        ? PgaCode.Fcc :
        s == "FWS"        ? PgaCode.Fws :
        s == "CPSC"       ? PgaCode.Cpsc :
        s == "ATF"        ? PgaCode.Atf :
                            PgaCode.DotNhtsa;

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
}

public sealed class PartyLookup
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string LegalName { get; set; } = "";
}
