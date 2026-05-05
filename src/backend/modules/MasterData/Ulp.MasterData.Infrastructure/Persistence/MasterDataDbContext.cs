using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.Core.Domain.ValueObjects;
using Ulp.MasterData.Domain.Entities;

namespace Ulp.MasterData.Infrastructure.Persistence;

/// <summary>
/// M1 Master Data DbContext. Mappings strictly per
/// ULP_LLD_M1_v2.0_MasterData.docx + ULP_DBD_v2.0_DatabaseDesign.docx.
///
/// Conventions:
///   - Money fields: ComplexProperty mapping → DECIMAL(18,4) + CHAR(3) currency
///   - Instant fields: stored as DATETIME(3) UTC via value converter
///   - LocalDate fields: stored as DATE
///   - Tenant-scoped tables: HasQueryFilter on TenantId
///   - Schema names match the DDL exactly: m1_*
/// </summary>
public sealed class MasterDataDbContext(DbContextOptions<MasterDataDbContext> options, ITenantContext tenant) : DbContext(options)
{
    private readonly ITenantContext _tenant = tenant;

    // ---------------- Tenant-scoped business tables ----------------
    public DbSet<Party>            Parties           => Set<Party>();
    public DbSet<PartyIdentifier>  PartyIdentifiers  => Set<PartyIdentifier>();
    public DbSet<Address>          Addresses         => Set<Address>();
    public DbSet<Product>          Products          => Set<Product>();
    public DbSet<BankAccount>      BankAccounts      => Set<BankAccount>();
    public DbSet<FxRate>           FxRates           => Set<FxRate>();

    // ---------------- Universal reference tables ------------------
    public DbSet<Country>          Countries         => Set<Country>();
    public DbSet<StateOrProvince>  StatesOrProvinces => Set<StateOrProvince>();
    public DbSet<Currency>         Currencies        => Set<Currency>();
    public DbSet<UnitOfMeasure>    UnitsOfMeasure    => Set<UnitOfMeasure>();
    public DbSet<Port>             Ports             => Set<Port>();
    public DbSet<Bank>             Banks             => Set<Bank>();
    public DbSet<BankBranch>       BankBranches      => Set<BankBranch>();
    public DbSet<Holiday>          Holidays          => Set<Holiday>();

    // SCM Milestone 1 — party profile extensions
    public DbSet<PartyPoa>         PartyPoas         => Set<PartyPoa>();
    public DbSet<PartyPermit>      PartyPermits      => Set<PartyPermit>();
    public DbSet<PartyMiscDoc>     PartyMiscDocs     => Set<PartyMiscDoc>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        ConfigureCountry(b);
        ConfigureStateOrProvince(b);
        ConfigureCurrency(b);
        ConfigureUnitOfMeasure(b);
        ConfigurePort(b);
        ConfigureBank(b);
        ConfigureBankBranch(b);
        ConfigureBankAccount(b);
        ConfigureHoliday(b);
        ConfigureFxRate(b);
        ConfigureParty(b);
        ConfigurePartyIdentifier(b);
        ConfigureAddress(b);
        ConfigureProduct(b);
        ConfigurePartyPoa(b);
        ConfigurePartyPermit(b);
        ConfigurePartyMiscDoc(b);
        base.OnModelCreating(b);
    }

    // ===========================================================
    //  Reference tables (universal)
    // ===========================================================

    private static void ConfigureCountry(ModelBuilder b) => b.Entity<Country>(e =>
    {
        e.ToTable("m1_country");
        e.HasKey(c => c.Code);
        e.Property(c => c.Code).HasColumnName("code").HasMaxLength(2).IsFixedLength();
        e.Property(c => c.Code3).HasColumnName("code3").HasMaxLength(3).IsFixedLength();
        e.Property(c => c.NumericCode).HasColumnName("numeric_code");
        e.Property(c => c.Name).HasColumnName("name").HasMaxLength(100);
        e.Property(c => c.Region).HasColumnName("region").HasMaxLength(50);
        e.Property(c => c.DefaultCurrency).HasColumnName("default_currency").HasMaxLength(3).IsFixedLength();
        e.Property(c => c.DefaultLocale).HasColumnName("default_locale").HasMaxLength(10);
        e.Property(c => c.DefaultTimeZone).HasColumnName("default_time_zone").HasMaxLength(50);
        e.Property(c => c.IsSupported).HasColumnName("is_supported");
    });

    private static void ConfigureStateOrProvince(ModelBuilder b) => b.Entity<StateOrProvince>(e =>
    {
        e.ToTable("m1_state_or_province");
        e.HasKey(s => s.Id);
        e.Property(s => s.Id).HasColumnName("id");
        e.Property(s => s.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
        e.Property(s => s.Code).HasColumnName("code").HasMaxLength(10);
        e.Property(s => s.Name).HasColumnName("name").HasMaxLength(100);
        e.Property(s => s.IsSpecial).HasColumnName("is_special");
        e.Property(s => s.CapitalCity).HasColumnName("capital_city").HasMaxLength(100);
        e.Property(s => s.TimeZone).HasColumnName("time_zone").HasMaxLength(50);
        e.HasIndex(s => new { s.CountryCode, s.Code }).IsUnique();
    });

    private static void ConfigureCurrency(ModelBuilder b) => b.Entity<Currency>(e =>
    {
        e.ToTable("m1_currency");
        e.HasKey(c => c.Code);
        e.Property(c => c.Code).HasColumnName("code").HasMaxLength(3).IsFixedLength();
        e.Property(c => c.NumericCode).HasColumnName("numeric_code");
        e.Property(c => c.Name).HasColumnName("name").HasMaxLength(50);
        e.Property(c => c.Symbol).HasColumnName("symbol").HasMaxLength(10);
        e.Property(c => c.DecimalDigits).HasColumnName("decimal_digits");
        e.Property(c => c.DefaultCountry).HasColumnName("default_country").HasMaxLength(2);
        e.Property(c => c.IsActive).HasColumnName("is_active");
    });

    private static void ConfigureUnitOfMeasure(ModelBuilder b) => b.Entity<UnitOfMeasure>(e =>
    {
        e.ToTable("m1_uom");
        e.HasKey(u => u.Code);
        e.Property(u => u.Code).HasColumnName("code").HasMaxLength(10);
        e.Property(u => u.Name).HasColumnName("name").HasMaxLength(100);
        e.Property(u => u.Category).HasColumnName("category").HasConversion<string>().HasMaxLength(20);
        e.Property(u => u.BaseFactor).HasColumnName("base_factor").HasPrecision(18, 8);
        e.Property(u => u.BaseUomCode).HasColumnName("base_uom_code").HasMaxLength(10);
        e.Property(u => u.IsActive).HasColumnName("is_active");
    });

    private static void ConfigurePort(ModelBuilder b) => b.Entity<Port>(e =>
    {
        e.ToTable("m1_port");
        e.HasKey(p => p.Id);
        e.Property(p => p.Id).HasColumnName("id");
        e.Property(p => p.UnLocode).HasColumnName("un_locode").HasMaxLength(10);
        e.Property(p => p.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
        e.Property(p => p.Name).HasColumnName("name").HasMaxLength(150);
        e.Property(p => p.PortType).HasColumnName("port_type").HasConversion<string>().HasMaxLength(15);
        e.Property(p => p.CbpScheduleD).HasColumnName("cbp_schedule_d").HasMaxLength(10);
        e.Property(p => p.IsActive).HasColumnName("is_active");
        e.HasIndex(p => p.UnLocode).IsUnique();
    });

    private static void ConfigureBank(ModelBuilder b) => b.Entity<Bank>(e =>
    {
        e.ToTable("m1_bank");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.Bic).HasColumnName("bic").HasMaxLength(11);
        e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
        e.Property(x => x.Name).HasColumnName("name").HasMaxLength(200);
        e.Property(x => x.ShortName).HasColumnName("short_name").HasMaxLength(100);
        e.Property(x => x.IsActive).HasColumnName("is_active");
    });

    private static void ConfigureBankBranch(ModelBuilder b) => b.Entity<BankBranch>(e =>
    {
        e.ToTable("m1_bank_branch");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.BankId).HasColumnName("bank_id");
        e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
        e.Property(x => x.BranchCode).HasColumnName("branch_code").HasMaxLength(20);
        e.Property(x => x.BranchName).HasColumnName("branch_name").HasMaxLength(200);
        e.Property(x => x.City).HasColumnName("city").HasMaxLength(100);
        e.Property(x => x.StateCode).HasColumnName("state_code").HasMaxLength(10);
        e.Property(x => x.IsActive).HasColumnName("is_active");
    });

    private void ConfigureBankAccount(ModelBuilder b) => b.Entity<BankAccount>(e =>
    {
        e.ToTable("m1_bank_account");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.TenantId).HasColumnName("tenant_id").HasConversion(t => int.Parse(t.Value), v => new TenantId(v.ToString()));
        e.Property(x => x.CountryCode).HasColumnName("country_code").HasConversion(c => c.Value, v => new CountryCode(v)).HasMaxLength(2).IsFixedLength();
        e.Property(x => x.PartyId).HasColumnName("party_id");
        e.Property(x => x.BankBranchId).HasColumnName("bank_branch_id");
        e.Property(x => x.AccountNumber).HasColumnName("account_number").HasMaxLength(50);
        e.Property(x => x.AccountHolder).HasColumnName("account_holder").HasMaxLength(255);
        e.Property(x => x.Currency).HasColumnName("currency").HasMaxLength(3).IsFixedLength();
        e.Property(x => x.AccountType).HasColumnName("account_type").HasConversion<string>().HasMaxLength(10);
        e.Property(x => x.IsActive).HasColumnName("is_active");
        e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConverter);
        e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConverter);
        // Tenant scope
        e.HasQueryFilter(x => x.TenantId == _tenant.TenantId);
    });

    private static void ConfigureHoliday(ModelBuilder b) => b.Entity<Holiday>(e =>
    {
        e.ToTable("m1_holiday");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsFixedLength();
        e.Property(x => x.StateCode).HasColumnName("state_code").HasMaxLength(10);
        e.Property(x => x.HolidayDate).HasColumnName("holiday_date").HasConversion(LocalDateConverter);
        e.Property(x => x.Name).HasColumnName("name").HasMaxLength(150);
        e.Property(x => x.IsObserved).HasColumnName("is_observed");
    });

    private static void ConfigureFxRate(ModelBuilder b) => b.Entity<FxRate>(e =>
    {
        e.ToTable("m1_fx_rate");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.TenantId).HasColumnName("tenant_id");
        e.Property(x => x.BaseCurrency).HasColumnName("base_currency").HasMaxLength(3).IsFixedLength();
        e.Property(x => x.QuoteCurrency).HasColumnName("quote_currency").HasMaxLength(3).IsFixedLength();
        e.Property(x => x.Rate).HasColumnName("rate").HasPrecision(18, 8);
        e.Property(x => x.RateDate).HasColumnName("rate_date").HasConversion(LocalDateConverter);
        e.Property(x => x.RateType).HasColumnName("rate_type").HasConversion<string>().HasMaxLength(20);
        e.Property(x => x.Source).HasColumnName("source").HasMaxLength(50);
        e.Property(x => x.FetchedAt).HasColumnName("fetched_at_utc").HasConversion(InstantConverter);
    });

    // ===========================================================
    //  Tenant-scoped business tables
    // ===========================================================

    private void ConfigureParty(ModelBuilder b) => b.Entity<Party>(e =>
    {
        e.ToTable("m1_party");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.TenantId).HasColumnName("tenant_id").HasConversion(t => int.Parse(t.Value), v => new TenantId(v.ToString()));
        e.Property(x => x.CountryCode).HasColumnName("country_code").HasConversion(c => c.Value, v => new CountryCode(v)).HasMaxLength(2).IsFixedLength();
        e.Property(x => x.PartyType).HasColumnName("party_type").HasConversion<string>().HasMaxLength(20);
        e.Property(x => x.LegalName).HasColumnName("legal_name").HasMaxLength(255);
        e.Property(x => x.TradeName).HasColumnName("trade_name").HasMaxLength(255);
        e.Property(x => x.ParentPartyId).HasColumnName("parent_party_id");
        e.Property(x => x.IsActive).HasColumnName("is_active");
        e.Property(x => x.PreferredLocale).HasColumnName("preferred_locale").HasMaxLength(10);
        e.Property(x => x.PreferredCurrency).HasColumnName("preferred_currency").HasMaxLength(3).IsFixedLength();
        e.Property(x => x.DefaultPaymentTerms).HasColumnName("default_payment_terms").HasMaxLength(50);
        e.Property(x => x.TaxStatus).HasColumnName("tax_status").HasMaxLength(50);
        e.Property(x => x.SanctionsScreened).HasColumnName("sanctions_screened");
        e.Property(x => x.SanctionsScreenedAt).HasColumnName("sanctions_screened_at_utc").HasConversion(NullableInstantConverter);
        e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConverter);
        e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConverter);

        // Money split into two flat columns (EF Core 8 doesn't support
        // nullable struct ComplexProperty); domain exposes [NotMapped] Money? CreditLimit.
        e.Ignore(x => x.CreditLimit);
        e.Property(x => x.CreditLimitAmount).HasColumnName("credit_limit").HasPrecision(18, 4);
        e.Property(x => x.CreditLimitCurrency).HasColumnName("credit_currency").HasMaxLength(3).IsFixedLength();

        // Navigation
        e.HasMany(x => x.Identifiers).WithOne().HasForeignKey(i => i.PartyId);
        e.HasMany(x => x.Addresses).WithOne().HasForeignKey(a => a.PartyId);

        // Tenant scope
        e.HasQueryFilter(x => x.TenantId == _tenant.TenantId);
    });

    private static void ConfigurePartyIdentifier(ModelBuilder b) => b.Entity<PartyIdentifier>(e =>
    {
        e.ToTable("m1_party_identifier");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.TenantId).HasColumnName("tenant_id");
        e.Property(x => x.PartyId).HasColumnName("party_id");
        e.Property(x => x.IdentifierType).HasColumnName("identifier_type").HasMaxLength(30);
        e.Property(x => x.IdentifierValue).HasColumnName("identifier_value").HasMaxLength(50);
        e.Property(x => x.IsPrimary).HasColumnName("is_primary");
        e.Property(x => x.ValidatedAt).HasColumnName("validated_at_utc").HasConversion(NullableInstantConverter);
        e.Property(x => x.ValidationSource).HasColumnName("validation_source").HasMaxLength(50);
        e.Property(x => x.ValidationStatus).HasColumnName("validation_status").HasConversion<string>().HasMaxLength(10);
        e.Property(x => x.ExpiresAt).HasColumnName("expires_at_utc").HasConversion(NullableInstantConverter);
        e.Property(x => x.EncryptedValue).HasColumnName("encrypted_value");
    });

    private void ConfigureAddress(ModelBuilder b) => b.Entity<Address>(e =>
    {
        e.ToTable("m1_address");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.TenantId).HasColumnName("tenant_id").HasConversion(t => int.Parse(t.Value), v => new TenantId(v.ToString()));
        e.Property(x => x.PartyId).HasColumnName("party_id");
        e.Property(x => x.CountryCode).HasColumnName("country_code").HasConversion(c => c.Value, v => new CountryCode(v)).HasMaxLength(2).IsFixedLength();
        e.Property(x => x.Line1).HasColumnName("line1").HasMaxLength(255);
        e.Property(x => x.Line2).HasColumnName("line2").HasMaxLength(255);
        e.Property(x => x.Line3).HasColumnName("line3").HasMaxLength(255);
        e.Property(x => x.City).HasColumnName("city").HasMaxLength(100);
        e.Property(x => x.StateOrProvince).HasColumnName("state_or_province").HasMaxLength(100);
        e.Property(x => x.StateOrProvinceCode).HasColumnName("state_or_province_code").HasMaxLength(10);
        e.Property(x => x.PostalCode).HasColumnName("postal_code").HasMaxLength(20);
        e.Property(x => x.CountyOrDistrict).HasColumnName("county_or_district").HasMaxLength(100);
        e.Property(x => x.Latitude).HasColumnName("latitude").HasPrecision(10, 7);
        e.Property(x => x.Longitude).HasColumnName("longitude").HasPrecision(10, 7);
        e.Property(x => x.GeocodeSource).HasColumnName("geocode_source").HasMaxLength(50);
        e.Property(x => x.GeocodeQuality).HasColumnName("geocode_quality").HasMaxLength(20);
        e.Property(x => x.VerifiedAt).HasColumnName("verified_at_utc").HasConversion(NullableInstantConverter);
        e.Property(x => x.VerificationSource).HasColumnName("verification_source").HasMaxLength(50);
        e.Property(x => x.AddressType).HasColumnName("address_type").HasConversion<string>().HasMaxLength(20);
        e.Property(x => x.IsPrimary).HasColumnName("is_primary");
        e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConverter);
        e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConverter);

        e.HasQueryFilter(x => x.TenantId == _tenant.TenantId);
    });

    private void ConfigureProduct(ModelBuilder b) => b.Entity<Product>(e =>
    {
        e.ToTable("m1_product");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.TenantId).HasColumnName("tenant_id").HasConversion(t => int.Parse(t.Value), v => new TenantId(v.ToString()));
        e.Property(x => x.CountryCode).HasColumnName("country_code").HasConversion(c => c.Value, v => new CountryCode(v)).HasMaxLength(2).IsFixedLength();
        e.Property(x => x.ProductCode).HasColumnName("product_code").HasMaxLength(50);
        e.Property(x => x.ProductName).HasColumnName("product_name").HasMaxLength(255);
        e.Property(x => x.ProductDescription).HasColumnName("product_description");
        e.Property(x => x.ProductType).HasColumnName("product_type").HasConversion<string>().HasMaxLength(10);
        e.Property(x => x.UomCode).HasColumnName("uom_code").HasMaxLength(10);
        e.Property(x => x.WeightKg).HasColumnName("weight_kg").HasPrecision(10, 3);
        e.Property(x => x.VolumeCbm).HasColumnName("volume_cbm").HasPrecision(10, 4);
        e.Property(x => x.HsCode).HasColumnName("hs_code").HasMaxLength(15);
        e.Property(x => x.HsnCode).HasColumnName("hsn_code").HasMaxLength(15);
        e.Property(x => x.HtsusCode).HasColumnName("htsus_code").HasMaxLength(15);
        e.Property(x => x.ScheduleBCode).HasColumnName("schedule_b_code").HasMaxLength(15);
        e.Property(x => x.TaxClass).HasColumnName("tax_class").HasMaxLength(50);
        e.Property(x => x.CountryOfOrigin).HasColumnName("country_of_origin").HasMaxLength(2).IsFixedLength();
        e.Property(x => x.IsHazmat).HasColumnName("is_hazmat");
        e.Property(x => x.IsPerishable).HasColumnName("is_perishable");
        e.Property(x => x.IsTemperatureControlled).HasColumnName("is_temperature_controlled");
        e.Property(x => x.IsDualUse).HasColumnName("is_dual_use");
        e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConverter);
        e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConverter);

        e.HasIndex(x => new { x.TenantId, x.ProductCode }).IsUnique();
        e.HasQueryFilter(x => x.TenantId == _tenant.TenantId);
    });

    // ===========================================================
    //  Value converters
    // ===========================================================

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant, DateTime>
        InstantConverter = new(
            v => v.ToDateTimeUtc(),
            v => Instant.FromDateTimeUtc(DateTime.SpecifyKind(v, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Instant?, DateTime?>
        NullableInstantConverter = new(
            v => v == null ? null : v.Value.ToDateTimeUtc(),
            v => v == null ? null : Instant.FromDateTimeUtc(DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<LocalDate, DateOnly>
        LocalDateConverter = new(
            v => v.ToDateOnly(),
            v => LocalDate.FromDateOnly(v));

    private static readonly Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<LocalDate?, DateOnly?>
        NullableLocalDateConverter = new(
            v => v == null ? null : v.Value.ToDateOnly(),
            v => v == null ? null : LocalDate.FromDateOnly(v.Value));

    // ===========================================================
    //  Profile extensions (SCM Milestone 1)
    // ===========================================================

    private static void ConfigurePartyPoa(ModelBuilder b) => b.Entity<PartyPoa>(e =>
    {
        e.ToTable("m_party_poa");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.TenantId).HasColumnName("tenant_id");
        e.Property(x => x.PartyId).HasColumnName("party_id");
        e.Property(x => x.PoaNumber).HasColumnName("poa_number").HasMaxLength(80);
        e.Property(x => x.GrantedTo).HasColumnName("granted_to").HasMaxLength(200);
        e.Property(x => x.EffectiveDate).HasColumnName("effective_date").HasConversion(NullableLocalDateConverter);
        e.Property(x => x.ExpirationDate).HasColumnName("expiration_date").HasConversion(NullableLocalDateConverter);
        e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
        e.Property(x => x.DocumentId).HasColumnName("document_id");
        e.Property(x => x.Notes).HasColumnName("notes");
        e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConverter);
        e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConverter);
    });

    // SQL ENUM is `Company` / `Commodity` (PascalCase) so HasConversion<string>() matches ToString().
    private static void ConfigurePartyPermit(ModelBuilder b) => b.Entity<PartyPermit>(e =>
    {
        e.ToTable("m_party_permit");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.TenantId).HasColumnName("tenant_id");
        e.Property(x => x.PartyId).HasColumnName("party_id");
        e.Property(x => x.Kind).HasColumnName("permit_kind").HasConversion<string>().HasMaxLength(15);
        e.Property(x => x.PermitCode).HasColumnName("permit_code").HasMaxLength(80);
        e.Property(x => x.PermitName).HasColumnName("permit_name").HasMaxLength(200);
        e.Property(x => x.IssuingAuthority).HasColumnName("issuing_authority").HasMaxLength(200);
        e.Property(x => x.HsCode).HasColumnName("hs_code").HasMaxLength(15);
        e.Property(x => x.ProductId).HasColumnName("product_id");
        e.Property(x => x.EffectiveDate).HasColumnName("effective_date").HasConversion(NullableLocalDateConverter);
        e.Property(x => x.ExpirationDate).HasColumnName("expiration_date").HasConversion(NullableLocalDateConverter);
        e.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(15);
        e.Property(x => x.DocumentId).HasColumnName("document_id");
        e.Property(x => x.Notes).HasColumnName("notes");
        e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConverter);
        e.Property(x => x.ModifiedAt).HasColumnName("modified_at_utc").HasConversion(InstantConverter);
    });

    private static void ConfigurePartyMiscDoc(ModelBuilder b) => b.Entity<PartyMiscDoc>(e =>
    {
        e.ToTable("m_party_misc_doc");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.TenantId).HasColumnName("tenant_id");
        e.Property(x => x.PartyId).HasColumnName("party_id");
        e.Property(x => x.DocCategory).HasColumnName("doc_category").HasConversion<string>().HasMaxLength(15);
        e.Property(x => x.Title).HasColumnName("title").HasMaxLength(200);
        e.Property(x => x.DocumentId).HasColumnName("document_id");
        e.Property(x => x.EffectiveDate).HasColumnName("effective_date").HasConversion(NullableLocalDateConverter);
        e.Property(x => x.ExpirationDate).HasColumnName("expiration_date").HasConversion(NullableLocalDateConverter);
        e.Property(x => x.Notes).HasColumnName("notes");
        e.Property(x => x.CreatedAt).HasColumnName("created_at_utc").HasConversion(InstantConverter);
    });
}
