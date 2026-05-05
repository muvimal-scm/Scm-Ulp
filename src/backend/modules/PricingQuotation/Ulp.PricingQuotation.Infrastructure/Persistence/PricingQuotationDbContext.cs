using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.PricingQuotation.Domain.Entities;

namespace Ulp.PricingQuotation.Infrastructure.Persistence;

public sealed class PricingQuotationDbContext(DbContextOptions<PricingQuotationDbContext> options) : DbContext(options)
{
    public DbSet<RateCard>          RateCards     => Set<RateCard>();
    public DbSet<RateCardLine>      RateCardLines => Set<RateCardLine>();
    public DbSet<RateBreakpoint>    Breakpoints   => Set<RateBreakpoint>();
    public DbSet<Surcharge>         Surcharges    => Set<Surcharge>();
    public DbSet<Quote>             Quotes        => Set<Quote>();
    public DbSet<QuoteLine>         QuoteLines    => Set<QuoteLine>();
    public DbSet<Contract>          Contracts     => Set<Contract>();
    public DbSet<Lane>              Lanes         => Set<Lane>();
    public DbSet<Zone>              Zones         => Set<Zone>();
    public DbSet<CurrencyFactor>    Factors       => Set<CurrencyFactor>();
    public DbSet<QuoteRevision>     Revisions     => Set<QuoteRevision>();
    public DbSet<NegotiationRound>  Rounds        => Set<NegotiationRound>();
    public DbSet<RateRequest>       RateRequests  => Set<RateRequest>();
    public DbSet<RateResponse>      RateResponses => Set<RateResponse>();
    public DbSet<M14Audit>          Audits        => Set<M14Audit>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<RateCard>(e =>
        {
            e.ToTable("m14_rate_card");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.CardNumber).HasColumnName("card_number").HasMaxLength(50);
            e.Property(x => x.CardType).HasColumnName("card_type").HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Scope).HasColumnName("scope").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.PartyId).HasColumnName("party_id");
            e.Property(x => x.OriginPortId).HasColumnName("origin_port_id");
            e.Property(x => x.DestinationPortId).HasColumnName("destination_port_id");
            e.Property(x => x.ServiceType).HasColumnName("service_type").HasMaxLength(50);
            e.Property(x => x.ValidFrom).HasColumnName("valid_from").HasConversion(LocalDateConv);
            e.Property(x => x.ValidTo).HasColumnName("valid_to").HasConversion(NullableLocalDate);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.ApprovedBy).HasColumnName("approved_by");
            e.Property(x => x.ApprovedAt).HasColumnName("approved_at_utc").HasConversion(NullableInstant);
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<RateCardLine>(e =>
        {
            e.ToTable("m14_rate_card_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RateCardId).HasColumnName("rate_card_id");
            e.Property(x => x.LineNumber).HasColumnName("line_number");
            e.Property(x => x.ChargeCode).HasColumnName("charge_code").HasMaxLength(50);
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            e.Property(x => x.UomCode).HasColumnName("uom_code").HasMaxLength(10);
            e.Property(x => x.RateAmount).HasColumnName("rate_amount").HasPrecision(18, 4);
            e.Property(x => x.RateCurrency).HasColumnName("rate_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.MinAmount).HasColumnName("min_amount").HasPrecision(18, 4);
            e.Property(x => x.MaxAmount).HasColumnName("max_amount").HasPrecision(18, 4);
            e.Property(x => x.IsTaxable).HasColumnName("is_taxable");
            e.Property(x => x.TaxClass).HasColumnName("tax_class").HasMaxLength(50);
        });

        b.Entity<RateBreakpoint>(e =>
        {
            e.ToTable("m14_rate_breakpoint");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RateLineId).HasColumnName("rate_line_id");
            e.Property(x => x.FromQty).HasColumnName("from_qty").HasPrecision(12, 4);
            e.Property(x => x.ToQty).HasColumnName("to_qty").HasPrecision(12, 4);
            e.Property(x => x.RateAmount).HasColumnName("rate_amount").HasPrecision(18, 4);
            e.Property(x => x.RateCurrency).HasColumnName("rate_currency").HasMaxLength(3).IsFixedLength();
        });

        b.Entity<Surcharge>(e =>
        {
            e.ToTable("m14_surcharge");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(50);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.SurchargeType).HasColumnName("surcharge_type").HasConversion(SurchargeTypeToString, StringToSurchargeType).HasMaxLength(20);
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 4);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Percent).HasColumnName("percent").HasPrecision(7, 4);
            e.Property(x => x.ValidFrom).HasColumnName("valid_from").HasConversion(LocalDateConv);
            e.Property(x => x.ValidTo).HasColumnName("valid_to").HasConversion(NullableLocalDate);
            e.Property(x => x.OriginPortId).HasColumnName("origin_port_id");
            e.Property(x => x.DestinationPortId).HasColumnName("destination_port_id");
            e.Property(x => x.IsActive).HasColumnName("is_active");
        });

        b.Entity<Quote>(e =>
        {
            e.ToTable("m14_quote");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.QuoteNumber).HasColumnName("quote_number").HasMaxLength(50);
            e.Property(x => x.CustomerPartyId).HasColumnName("customer_party_id");
            e.Property(x => x.EnquiryRef).HasColumnName("enquiry_ref").HasMaxLength(50);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.OriginPortId).HasColumnName("origin_port_id");
            e.Property(x => x.DestinationPortId).HasColumnName("destination_port_id");
            e.Property(x => x.ServiceType).HasColumnName("service_type").HasMaxLength(50);
            e.Property(x => x.TotalAmount).HasColumnName("total_amount").HasPrecision(18, 4);
            e.Property(x => x.TotalCurrency).HasColumnName("total_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.ValidUntil).HasColumnName("valid_until").HasConversion(NullableLocalDate);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<QuoteLine>(e =>
        {
            e.ToTable("m14_quote_line");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.QuoteId).HasColumnName("quote_id");
            e.Property(x => x.LineNumber).HasColumnName("line_number");
            e.Property(x => x.ChargeCode).HasColumnName("charge_code").HasMaxLength(50);
            e.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            e.Property(x => x.Quantity).HasColumnName("quantity").HasPrecision(12, 4);
            e.Property(x => x.UomCode).HasColumnName("uom_code").HasMaxLength(10);
            e.Property(x => x.UnitPrice).HasColumnName("unit_price").HasPrecision(18, 4);
            e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 4);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.RateCardId).HasColumnName("rate_card_id");
        });

        b.Entity<Contract>(e =>
        {
            e.ToTable("m14_contract");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.ContractNumber).HasColumnName("contract_number").HasMaxLength(50);
            e.Property(x => x.CustomerPartyId).HasColumnName("customer_party_id");
            e.Property(x => x.RateCardId).HasColumnName("rate_card_id");
            e.Property(x => x.StartDate).HasColumnName("start_date").HasConversion(LocalDateConv);
            e.Property(x => x.EndDate).HasColumnName("end_date").HasConversion(NullableLocalDate);
            e.Property(x => x.AutoRenew).HasColumnName("auto_renew");
            e.Property(x => x.PaymentTerms).HasColumnName("payment_terms").HasMaxLength(50);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.DocumentId).HasColumnName("document_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConv);
        });

        b.Entity<Lane>(e =>
        {
            e.ToTable("m14_lane");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.OriginPortId).HasColumnName("origin_port_id");
            e.Property(x => x.DestinationPortId).HasColumnName("destination_port_id");
            e.Property(x => x.Mode).HasColumnName("mode").HasConversion(TransportModeToString, StringToTransportMode).HasMaxLength(15);
            e.Property(x => x.TransitDays).HasColumnName("transit_days");
            e.Property(x => x.Frequency).HasColumnName("frequency").HasMaxLength(50);
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
        });

        b.Entity<Zone>(e =>
        {
            e.ToTable("m14_zone");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
            e.Property(x => x.Code).HasColumnName("code").HasMaxLength(50);
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
            e.Property(x => x.PostalPattern).HasColumnName("postal_pattern").HasMaxLength(255);
            e.Property(x => x.IsActive).HasColumnName("is_active");
        });

        b.Entity<CurrencyFactor>(e =>
        {
            e.ToTable("m14_currency_factor");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.BaseCurrency).HasColumnName("base_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.QuoteCurrency).HasColumnName("quote_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Factor).HasColumnName("factor").HasPrecision(18, 8);
            e.Property(x => x.ValidFrom).HasColumnName("valid_from").HasConversion(LocalDateConv);
            e.Property(x => x.ValidTo).HasColumnName("valid_to").HasConversion(NullableLocalDate);
            e.Property(x => x.Source).HasColumnName("source").HasMaxLength(50);
        });

        b.Entity<QuoteRevision>(e =>
        {
            e.ToTable("m14_quote_revision");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.QuoteId).HasColumnName("quote_id");
            e.Property(x => x.RevisionNo).HasColumnName("revision_no");
            e.Property(x => x.SnapshotJson).HasColumnName("snapshot_json").HasColumnType("json");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConv);
            e.Property(x => x.Notes).HasColumnName("notes");
        });

        b.Entity<NegotiationRound>(e =>
        {
            e.ToTable("m14_negotiation_round");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.QuoteId).HasColumnName("quote_id");
            e.Property(x => x.RoundNo).HasColumnName("round_no");
            e.Property(x => x.PartyId).HasColumnName("party_id");
            e.Property(x => x.Action).HasColumnName("action").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.AmountOffered).HasColumnName("amount_offered").HasPrecision(18, 4);
            e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.OccurredAt).HasColumnName("occurred_at_utc").HasConversion(InstantConv);
        });

        b.Entity<RateRequest>(e =>
        {
            e.ToTable("m14_rate_request");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.RequestNumber).HasColumnName("request_number").HasMaxLength(50);
            e.Property(x => x.CustomerPartyId).HasColumnName("customer_party_id");
            e.Property(x => x.OriginPortId).HasColumnName("origin_port_id");
            e.Property(x => x.DestinationPortId).HasColumnName("destination_port_id");
            e.Property(x => x.ServiceType).HasColumnName("service_type").HasMaxLength(50);
            e.Property(x => x.CargoDescription).HasColumnName("cargo_description").HasMaxLength(500);
            e.Property(x => x.RequestedAt).HasColumnName("requested_at_utc").HasConversion(InstantConv);
            e.Property(x => x.DueDate).HasColumnName("due_date").HasConversion(NullableLocalDate);
            e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
        });

        b.Entity<RateResponse>(e =>
        {
            e.ToTable("m14_rate_response");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RateRequestId).HasColumnName("rate_request_id");
            e.Property(x => x.VendorPartyId).HasColumnName("vendor_party_id");
            e.Property(x => x.ResponseAmount).HasColumnName("response_amount").HasPrecision(18, 4);
            e.Property(x => x.ResponseCurrency).HasColumnName("response_currency").HasMaxLength(3).IsFixedLength();
            e.Property(x => x.ValidUntil).HasColumnName("valid_until").HasConversion(NullableLocalDate);
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.ReceivedAt).HasColumnName("received_at_utc").HasConversion(InstantConv);
            e.Property(x => x.IsWinner).HasColumnName("is_winner");
        });

        b.Entity<M14Audit>(e =>
        {
            e.ToTable("m14_audit");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.EntityType).HasColumnName("entity_type").HasMaxLength(50);
            e.Property(x => x.EntityId).HasColumnName("entity_id");
            e.Property(x => x.Action).HasColumnName("action").HasMaxLength(50);
            e.Property(x => x.PerformedBy).HasColumnName("performed_by");
            e.Property(x => x.PerformedAt).HasColumnName("performed_at_utc").HasConversion(InstantConv);
            e.Property(x => x.DetailsJson).HasColumnName("details").HasColumnType("json");
        });
    }

    // ENUM('FIXED','PERCENT_FREIGHT','PER_UNIT')
    private static System.Linq.Expressions.Expression<Func<SurchargeType, string>> SurchargeTypeToString => t =>
        t == SurchargeType.Fixed          ? "FIXED" :
        t == SurchargeType.PercentFreight ? "PERCENT_FREIGHT" :
                                            "PER_UNIT";

    private static System.Linq.Expressions.Expression<Func<string, SurchargeType>> StringToSurchargeType => s =>
        s == "FIXED"           ? SurchargeType.Fixed :
        s == "PERCENT_FREIGHT" ? SurchargeType.PercentFreight :
                                 SurchargeType.PerUnit;

    // ENUM('OCEAN_FCL','OCEAN_LCL','AIR','ROAD','RAIL','MULTIMODAL')
    private static System.Linq.Expressions.Expression<Func<TransportMode, string>> TransportModeToString => m =>
        m == TransportMode.OceanFcl   ? "OCEAN_FCL" :
        m == TransportMode.OceanLcl   ? "OCEAN_LCL" :
        m == TransportMode.Air        ? "AIR" :
        m == TransportMode.Road       ? "ROAD" :
        m == TransportMode.Rail       ? "RAIL" :
                                        "MULTIMODAL";

    private static System.Linq.Expressions.Expression<Func<string, TransportMode>> StringToTransportMode => s =>
        s == "OCEAN_FCL" ? TransportMode.OceanFcl :
        s == "OCEAN_LCL" ? TransportMode.OceanLcl :
        s == "AIR"       ? TransportMode.Air :
        s == "ROAD"      ? TransportMode.Road :
        s == "RAIL"      ? TransportMode.Rail :
                           TransportMode.Multimodal;

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
