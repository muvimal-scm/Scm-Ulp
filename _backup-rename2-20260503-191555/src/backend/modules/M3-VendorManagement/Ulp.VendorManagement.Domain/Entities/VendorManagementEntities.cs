using NodaTime;

namespace Ulp.VendorManagement.Domain.Entities;

// LLD Â§3.1 â€” vendor satellite over m1_party
public sealed class Vendor
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long PartyId { get; set; }                      // FK m1_party.id (party_type='Vendor')
    public string CountryCode { get; set; } = "";
    public string VendorCode { get; set; } = "";
    public VendorStatus Status { get; set; } = VendorStatus.Prospect;
    public Instant? OnboardingStartedAt { get; set; }
    public Instant? ActivatedAt { get; set; }
    public string? PreferredLanguage { get; set; }

    // IN compliance flags
    public bool TdsApplicable { get; set; }
    public string? TdsSection { get; set; }
    public bool IsMsme { get; set; }
    public string? MsmeUdyamNumber { get; set; }

    // US compliance flags
    public bool Is1099Reportable { get; set; }
    public bool W9OnFile { get; set; }

    // Risk
    public RiskTier RiskTier { get; set; } = RiskTier.Low;
    public bool SanctionsClear { get; set; }
    public Instant? SanctionsCheckedAt { get; set; }

    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum VendorStatus { Prospect, OnboardingInProgress, Active, Suspended, Blacklisted, Closed }
public enum RiskTier { Low, Medium, High, Critical }

// LLD Â§3.2
public sealed class VendorCategory
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long VendorId { get; set; }
    public VendorCategoryCode Category { get; set; }
    public bool IsPrimary { get; set; }
}

public enum VendorCategoryCode
{
    CARRIER_SEA, CARRIER_AIR, CARRIER_ROAD, CARRIER_RAIL,
    BROKER_CHA, BROKER_NVOCC, FREIGHT_FORWARDER,
    WAREHOUSE_3PL, WAREHOUSE_BONDED,
    BANK, PAYMENT_PROCESSOR, GOVERNMENT_AGENCY,
    IT_SOFTWARE, IT_HARDWARE, UTILITY, PROFESSIONAL_SERVICES,
    INSURANCE, SURVEY, TRADE_INTELLIGENCE, OTHER,
}

// LLD Â§3.3 â€” entity renamed from VendorService to avoid C# name collision with
// the application-service class (Ulp.VendorManagement.Infrastructure.Persistence.VendorService).
public sealed class VendorServiceOffering
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long VendorId { get; set; }
    public string ServiceCode { get; set; } = "";
    public string ServiceName { get; set; } = "";
    public string? ModuleCode { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

// LLD Â§3.4
public sealed class Agreement
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long VendorId { get; set; }
    public AgreementType AgreementType { get; set; }
    public string AgreementNumber { get; set; } = "";
    public string Title { get; set; } = "";
    public LocalDate StartDate { get; set; }
    public LocalDate? EndDate { get; set; }
    public bool AutoRenewal { get; set; }
    public int? RenewalNoticeDays { get; set; }
    public AgreementStatus Status { get; set; } = AgreementStatus.Draft;
    public long? DocumentId { get; set; }                  // FK m21_document.id
    public Instant? SignedAt { get; set; }
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum AgreementType   { MSA, SOW, SLA, NDA, RATE_CARD, OTHER }
public enum AgreementStatus { Draft, UnderReview, Signed, Active, Expiring, Expired, Terminated }

// LLD Â§3.5
public sealed class OnboardingStep
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long VendorId { get; set; }
    public string StepCode { get; set; } = "";
    public string StepName { get; set; } = "";
    public OnboardingStatus Status { get; set; } = OnboardingStatus.Pending;
    public bool Required { get; set; } = true;
    public string? ResultJson { get; set; }
    public long? PerformedBy { get; set; }
    public Instant? PerformedAt { get; set; }
    public string? Notes { get; set; }
}

public enum OnboardingStatus { Pending, InProgress, Completed, Skipped, Failed }

// LLD Â§3.6
public sealed class PerformanceScore
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long VendorId { get; set; }
    public LocalDate PeriodStart { get; set; }
    public LocalDate PeriodEnd { get; set; }
    public decimal? OnTimeDeliveryPct { get; set; }
    public decimal? QualityScore { get; set; }
    public int SlaBreachCount { get; set; }
    public int NcrCount { get; set; }
    public int InvoiceDisputeCount { get; set; }
    public decimal? OverallScore { get; set; }
    public PerformanceRating? Rating { get; set; }
    public Instant ComputedAt { get; set; }
    public ComputedBy ComputedBy { get; set; } = ComputedBy.System;
    public string? Notes { get; set; }
}

public enum PerformanceRating { A, B, C, D, F }
public enum ComputedBy { System, Manual }

// LLD Â§3.7
public sealed class Ncr
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long VendorId { get; set; }
    public string NcrNumber { get; set; } = "";
    public Instant RaisedAt { get; set; }
    public long RaisedBy { get; set; }
    public string? RelatedModule { get; set; }
    public long? RelatedEntityId { get; set; }
    public NcrSeverity Severity { get; set; }
    public string? Category { get; set; }
    public string Description { get; set; } = "";
    public string? RootCause { get; set; }
    public string? CorrectiveAction { get; set; }
    public NcrStatus Status { get; set; } = NcrStatus.Open;
    public Instant? ClosedAt { get; set; }
    public long? ClosedBy { get; set; }
}

public enum NcrSeverity { Low, Medium, High, Critical }
public enum NcrStatus   { Open, InvestigationStarted, VendorResponded, Resolved, Closed }

// LLD Â§3.8
public sealed class VendorContact
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long VendorId { get; set; }
    public ContactRole ContactRole { get; set; }
    public string FullName { get; set; } = "";
    public string? Designation { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Language { get; set; }
    public bool IsPrimary { get; set; }
    public bool IsActive { get; set; } = true;
}

public enum ContactRole { Primary, Billing, Operations, Legal, Compliance, Emergency, Other }

// LLD Â§3.9
public sealed class VendorAudit
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public long VendorId { get; set; }
    public VendorAuditAction Action { get; set; }
    public long PerformedBy { get; set; }
    public Instant PerformedAt { get; set; }
    public string? DetailsJson { get; set; }
}

public enum VendorAuditAction
{
    Created, Onboarded, Activated, Suspended, Blacklisted, Reinstated, Closed,
    CategoryChanged, RiskReassessed, ScoreRecomputed, NcrRaised, NcrClosed,
}
