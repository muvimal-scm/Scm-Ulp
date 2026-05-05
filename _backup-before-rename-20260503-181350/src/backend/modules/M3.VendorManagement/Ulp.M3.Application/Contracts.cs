using NodaTime;
using Ulp.M3.Domain.Entities;

namespace Ulp.M3.Application;

public interface IVendorService
{
    // Vendor lifecycle
    Task<VendorDto>                CreateAsync(CreateVendorRequest req, CancellationToken ct);
    Task<VendorDto?>               GetAsync(long vendorId, CancellationToken ct);
    Task<IReadOnlyList<VendorDto>> ListAsync(VendorListQuery query, CancellationToken ct);
    Task<long>                     CountAsync(VendorListQuery query, CancellationToken ct);
    Task<VendorDto>                UpdateAsync(long vendorId, UpdateVendorRequest req, CancellationToken ct);
    Task<bool>                     ActivateAsync(long vendorId, CancellationToken ct);
    Task<bool>                     SuspendAsync(long vendorId, string reason, CancellationToken ct);

    // Onboarding
    Task<IReadOnlyList<OnboardingStepDto>> StartOnboardingAsync(long vendorId, CancellationToken ct);
    Task<bool>                             CompleteStepAsync(long vendorId, string stepCode, CompleteStepRequest req, CancellationToken ct);
    Task<IReadOnlyList<OnboardingStepDto>> GetOnboardingStepsAsync(long vendorId, CancellationToken ct);

    // Agreements
    Task<IReadOnlyList<AgreementDto>> ListAgreementsAsync(long vendorId, CancellationToken ct);
    Task<AgreementDto>                CreateAgreementAsync(long vendorId, CreateAgreementRequest req, CancellationToken ct);

    // Performance
    Task<IReadOnlyList<PerformanceScoreDto>> GetPerformanceAsync(long vendorId, CancellationToken ct);

    // NCRs
    Task<IReadOnlyList<NcrDto>> ListNcrsAsync(long vendorId, CancellationToken ct);
    Task<NcrDto>                RaiseNcrAsync(RaiseNcrRequest req, CancellationToken ct);
    Task<NcrDto>                UpdateNcrAsync(long ncrId, UpdateNcrRequest req, CancellationToken ct);
}

/* ----- request DTOs ----- */

public sealed record CreateVendorRequest(
    long PartyId,                                // existing m1_party.id with party_type='Vendor'
    string CountryCode,
    string VendorCode,
    bool TdsApplicable = false,
    string? TdsSection = null,
    bool IsMsme = false,
    string? MsmeUdyamNumber = null,
    bool Is1099Reportable = false,
    bool W9OnFile = false,
    RiskTier RiskTier = RiskTier.Low,
    IReadOnlyList<VendorCategoryCode>? Categories = null);

public sealed record UpdateVendorRequest(
    bool? TdsApplicable, string? TdsSection,
    bool? IsMsme, string? MsmeUdyamNumber,
    bool? Is1099Reportable, bool? W9OnFile,
    RiskTier? RiskTier, string? PreferredLanguage);

public sealed record VendorListQuery(
    VendorStatus? Status = null,
    string? CountryCode = null,
    VendorCategoryCode? Category = null,
    int Page = 1, int PageSize = 50);

public sealed record CompleteStepRequest(string? Notes, string? ResultJson);

public sealed record CreateAgreementRequest(
    AgreementType AgreementType,
    string AgreementNumber,
    string Title,
    LocalDate StartDate,
    LocalDate? EndDate,
    bool AutoRenewal,
    int? RenewalNoticeDays,
    long? DocumentId);

public sealed record RaiseNcrRequest(
    long VendorId,
    string NcrNumber,
    NcrSeverity Severity,
    string Description,
    string? Category = null,
    string? RelatedModule = null,
    long? RelatedEntityId = null);

public sealed record UpdateNcrRequest(
    NcrStatus? Status, string? RootCause, string? CorrectiveAction);

/* ----- response DTOs ----- */

public sealed record VendorDto(
    long Id, int TenantId, long PartyId, string CountryCode, string VendorCode,
    VendorStatus Status, Instant? ActivatedAt,
    bool TdsApplicable, string? TdsSection, bool IsMsme, string? MsmeUdyamNumber,
    bool Is1099Reportable, bool W9OnFile,
    RiskTier RiskTier, bool SanctionsClear,
    IReadOnlyList<VendorCategoryCode> Categories,
    Instant CreatedAt, Instant ModifiedAt);

public sealed record OnboardingStepDto(
    string StepCode, string StepName, OnboardingStatus Status, bool Required,
    Instant? PerformedAt, string? Notes);

public sealed record AgreementDto(
    long Id, AgreementType AgreementType, string AgreementNumber, string Title,
    LocalDate StartDate, LocalDate? EndDate, bool AutoRenewal,
    AgreementStatus Status, long? DocumentId, Instant? SignedAt);

public sealed record PerformanceScoreDto(
    long Id, LocalDate PeriodStart, LocalDate PeriodEnd,
    decimal? OnTimeDeliveryPct, decimal? QualityScore, int SlaBreachCount, int NcrCount,
    decimal? OverallScore, PerformanceRating? Rating, Instant ComputedAt);

public sealed record NcrDto(
    long Id, long VendorId, string NcrNumber, NcrSeverity Severity, NcrStatus Status,
    string Description, string? Category, Instant RaisedAt, Instant? ClosedAt);
