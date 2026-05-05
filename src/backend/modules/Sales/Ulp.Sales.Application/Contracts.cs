using NodaTime;
using Ulp.Sales.Domain.Entities;

namespace Ulp.Sales.Application;

public interface ICrmService
{
    /* Leads */
    Task<LeadDto>                    CreateLeadAsync(CreateLeadRequest req, CancellationToken ct);
    Task<LeadDto?>                   GetLeadAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<LeadDto>>     ListLeadsAsync(LeadListQuery q, CancellationToken ct);
    Task<LeadDto>                    ChangeLeadStageAsync(long id, LeadStage next, CancellationToken ct);
    Task<LeadDto>                    UpdateLeadAsync(long id, UpdateLeadRequest req, CancellationToken ct);
    Task<bool>                       DeleteLeadAsync(long id, CancellationToken ct);

    /* Opportunities */
    Task<OpportunityDto>             CreateOpportunityAsync(CreateOpportunityRequest req, CancellationToken ct);
    Task<OpportunityDetailDto?>      GetOpportunityAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<OpportunityDto>> ListOpportunitiesAsync(OpportunityListQuery q, CancellationToken ct);
    Task<OpportunityDto>             ChangeOpportunityStageAsync(long id, OppStage next, CancellationToken ct);
    Task<OpportunityDto>             UpdateOpportunityAsync(long id, UpdateOpportunityRequest req, CancellationToken ct);
    Task<bool>                       DeleteOpportunityAsync(long id, CancellationToken ct);

    /* Activities */
    Task<ActivityDto>                AddActivityAsync(CreateActivityRequest req, CancellationToken ct);
    Task<IReadOnlyList<ActivityDto>> ListActivitiesAsync(RelatedTo? relatedTo, long? relatedId, int page, int pageSize, CancellationToken ct);

    /* Campaigns */
    Task<CampaignDto>                CreateCampaignAsync(CreateCampaignRequest req, CancellationToken ct);
    Task<IReadOnlyList<CampaignDto>> ListCampaignsAsync(CancellationToken ct);
    Task<CampaignDto>                ChangeCampaignStatusAsync(long id, CampaignStatus next, CancellationToken ct);

    /* RFQs */
    Task<RfqRequestDto>              CreateRfqAsync(CreateRfqRequest req, CancellationToken ct);
    Task<RfqRequestDetailDto?>       GetRfqAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<RfqRequestDto>> ListRfqsAsync(CancellationToken ct);
    Task<RfqLineDto>                 AddRfqLineAsync(long rfqId, CreateRfqLineRequest req, CancellationToken ct);
    Task<RfqResponseDto>             AddRfqResponseAsync(long rfqId, CreateRfqResponseRequest req, CancellationToken ct);

    /* Pipeline + forecast (read-only) */
    Task<IReadOnlyList<PipelineStageDto>> ListPipelineStagesAsync(CancellationToken ct);
    Task<IReadOnlyList<ForecastSnapshotDto>> ListForecastsAsync(string? period, CancellationToken ct);
}

/* ===================== Request DTOs ===================== */

public sealed record CreateLeadRequest(
    string CountryCode, string LeadNumber, LeadSource Source,
    string ContactName, string? CompanyName, string? Email, string? Phone,
    string? Industry, string? EstimatedVolume);

// Update DTO: same shape as Create but without LeadNumber (immutable identifier).
public sealed record UpdateLeadRequest(
    string CountryCode, LeadSource Source,
    string ContactName, string? CompanyName, string? Email, string? Phone,
    string? Industry, string? EstimatedVolume);

public sealed record CreateOpportunityRequest(
    string CountryCode, string OppNumber, long PartyId, string Title,
    decimal? EstimatedValue, string? EstimatedCurrency,
    LocalDate? ExpectedClose, decimal? ProbabilityPct);

// Update DTO: same shape as Create but without OppNumber (immutable identifier).
public sealed record UpdateOpportunityRequest(
    string CountryCode, long PartyId, string Title,
    decimal? EstimatedValue, string? EstimatedCurrency,
    LocalDate? ExpectedClose, decimal? ProbabilityPct);

public sealed record CreateActivityRequest(
    RelatedTo RelatedTo, long RelatedId, ActivityType ActivityType,
    string? Subject, Instant OccurredAt, long? OwnerUserId, string? DetailsJson);

public sealed record CreateCampaignRequest(
    string Name, CampaignChannel Channel, string? AudienceFilterJson,
    string? TemplateCode, Instant? ScheduledAt);

public sealed record CreateRfqRequest(
    string RfqNumber, long PartyId, Instant RequestedAt,
    LocalDate? DueDate, string? Notes);

public sealed record CreateRfqLineRequest(
    string Description, decimal? Quantity, string? UomCode);

public sealed record CreateRfqResponseRequest(
    long VendorPartyId, decimal? ResponseAmount, string? ResponseCurrency,
    LocalDate? ValidUntil, string? Notes);

/* ===================== Query records ===================== */

public sealed record LeadListQuery(
    LeadStage? Stage = null, LeadSource? Source = null,
    string? CountryCode = null, int Page = 1, int PageSize = 50);

public sealed record OpportunityListQuery(
    OppStage? Stage = null, long? PartyId = null,
    string? CountryCode = null, int Page = 1, int PageSize = 50);

/* ===================== Response DTOs ===================== */

public sealed record LeadDto(
    long Id, int TenantId, string CountryCode, string LeadNumber, LeadSource Source,
    string ContactName, string? CompanyName, string? Email, string? Phone,
    string? Industry, string? EstimatedVolume, LeadStage Stage,
    long? OwnerUserId, long? ConvertedPartyId,
    Instant CreatedAt, Instant ModifiedAt);

public sealed record OpportunityDto(
    long Id, int TenantId, string CountryCode, string OppNumber, long PartyId,
    string Title, decimal? EstimatedValue, string? EstimatedCurrency,
    LocalDate? ExpectedClose, decimal? ProbabilityPct, OppStage Stage,
    long? OwnerUserId, int ActivityCount,
    Instant CreatedAt, Instant ModifiedAt);

public sealed record OpportunityDetailDto(
    OpportunityDto Opportunity,
    IReadOnlyList<ActivityDto> Activities,
    IReadOnlyList<long> LinkedQuoteIds);

public sealed record ActivityDto(
    long Id, RelatedTo RelatedTo, long RelatedId, ActivityType ActivityType,
    string? Subject, Instant OccurredAt, long? OwnerUserId, string? DetailsJson);

public sealed record CampaignDto(
    long Id, string Name, CampaignChannel Channel, string? TemplateCode,
    Instant? ScheduledAt, CampaignStatus Status,
    int SentCount, int DeliveredCount, int TargetCount, Instant CreatedAt);

public sealed record RfqRequestDto(
    long Id, string RfqNumber, long PartyId, Instant RequestedAt,
    LocalDate? DueDate, RfqStatus Status, string? Notes,
    int LineCount, int ResponseCount);

public sealed record RfqRequestDetailDto(
    RfqRequestDto Request,
    IReadOnlyList<RfqLineDto> Lines,
    IReadOnlyList<RfqResponseDto> Responses);

public sealed record RfqLineDto(
    long Id, long RfqRequestId, int LineNumber, string Description,
    decimal? Quantity, string? UomCode);

public sealed record RfqResponseDto(
    long Id, long RfqRequestId, long VendorPartyId,
    decimal? ResponseAmount, string? ResponseCurrency,
    LocalDate? ValidUntil, string? Notes, Instant ReceivedAt, bool IsWinner);

public sealed record PipelineStageDto(
    long Id, string Code, string Name, int Sequence, decimal? DefaultProbabilityPct);

public sealed record ForecastSnapshotDto(
    long Id, long? OwnerUserId, string Period, string SnapshotJson, Instant TakenAt);
