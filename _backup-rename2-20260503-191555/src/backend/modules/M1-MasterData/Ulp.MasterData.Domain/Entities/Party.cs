using NodaTime;
using Ulp.Core.Domain.Entities;
using Ulp.Core.Domain.ValueObjects;

namespace Ulp.MasterData.Domain.Entities;

/// <summary>
/// Universal party â€” customer / vendor / carrier / broker / bank / agency / employee.
/// Per ULP_LLD_M1_v2.0_MasterData.docx Â§3 (universal party model).
/// Country-specific identifiers (PAN, GSTIN, EIN, ABAâ€¦) live in <see cref="PartyIdentifier"/>.
/// </summary>
public sealed class Party : IEntity, ITenantScoped
{
    public long Id { get; set; }
    public TenantId TenantId { get; set; }
    public CountryCode CountryCode { get; set; }      // legal home country
    public PartyType PartyType { get; set; }
    public string LegalName { get; set; } = "";
    public string? TradeName { get; set; }
    public long? ParentPartyId { get; set; }          // corporate hierarchy
    public bool IsActive { get; set; } = true;

    public string? PreferredLocale { get; set; }      // BCP 47 (e.g., en-IN)
    public string? PreferredCurrency { get; set; }    // ISO 4217
    public string? DefaultPaymentTerms { get; set; }

    // Persisted as two flat columns (credit_limit, credit_currency) â€” EF Core 8
    // does not yet support nullable Money struct via ComplexProperty/OwnsOne.
    public decimal? CreditLimitAmount   { get; set; }
    public string?  CreditLimitCurrency { get; set; }   // ISO 4217

    /// <summary>Domain-friendly view of the two persisted columns.</summary>
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public Money? CreditLimit
    {
        get => CreditLimitAmount.HasValue && !string.IsNullOrEmpty(CreditLimitCurrency)
            ? new Money(CreditLimitAmount.Value, CreditLimitCurrency)
            : null;
        set
        {
            CreditLimitAmount   = value?.Amount;
            CreditLimitCurrency = value?.Currency;
        }
    }

    public string? TaxStatus { get; set; }            // "Regular GST" (IN) | "Tax Exempt" (US) | â€¦

    public bool SanctionsScreened { get; set; }
    public Instant? SanctionsScreenedAt { get; set; }

    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }

    // Navigation
    public List<PartyIdentifier> Identifiers { get; set; } = new();
    public List<Address> Addresses { get; set; } = new();
}

/// <summary>Per LLD Â§3 â€” enumeration of party types.</summary>
public enum PartyType
{
    Customer,
    Vendor,
    Carrier,
    Broker,
    Bank,
    GovernmentAgency,
    Employee,
    Other,
}
