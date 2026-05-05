using NodaTime;
using Ulp.M6.Domain.Entities;

namespace Ulp.M6.Application;

public interface IDocGenService
{
    // Templates
    Task<IReadOnlyList<TemplateDto>>      ListTemplatesAsync(string? channel, CancellationToken ct);
    Task<TemplateDetailDto?>              GetTemplateAsync(long id, CancellationToken ct);
    Task<TemplateDto>                     CreateTemplateAsync(CreateTemplateRequest req, CancellationToken ct);
    Task<TemplateVersionDto>              AddTemplateVersionAsync(long templateId, AddVersionRequest req, CancellationToken ct);

    // Render
    Task<RenderResponseDto>               RenderAsync(RenderApiRequest req, CancellationToken ct);
    Task<IReadOnlyList<RenderRequestDto>> ListRenderRequestsAsync(int page, int pageSize, CancellationToken ct);
}

/* ----- request DTOs ----- */

public sealed record CreateTemplateRequest(
    string Code, string? CountryCode, string Name, string? Description,
    TemplateType TemplateType, RenderingEngine RenderingEngine,
    string Body);

public sealed record AddVersionRequest(string Body, string? LayoutJson, string? Comment);

public sealed record RenderApiRequest(
    string Code,                                      // template code, e.g. "INVOICE"
    string? CountryCode,                              // optional locale variant
    string SourceModule,                              // "M14","M17",…
    long? SourceEntityId,
    Dictionary<string, object?> Payload);

/* ----- response DTOs ----- */

public sealed record TemplateDto(
    long Id, int? TenantId, string Code, string? CountryCode, string Name,
    string? Description, TemplateType TemplateType, RenderingEngine RenderingEngine,
    bool IsActive, int Version, Instant CreatedAt, Instant ModifiedAt);

public sealed record TemplateDetailDto(
    TemplateDto Template,
    IReadOnlyList<TemplateVersionDto> Versions,
    IReadOnlyList<TemplateFieldDto>   Fields);

public sealed record TemplateVersionDto(
    long Id, int VersionNumber, string Body, string? LayoutJson,
    long CreatedBy, Instant CreatedAt, string? Comment);

public sealed record TemplateFieldDto(
    string FieldName, TemplateFieldType FieldType, bool IsRequired,
    string? DefaultValue, string? SourceModule, string? SourcePath);

public sealed record RenderResponseDto(
    string Ulid, RenderStatus Status, TemplateType OutputFormat,
    string? Body, int? DurationMs, string? Error);

public sealed record RenderRequestDto(
    long Id, string Ulid, long TemplateId, string SourceModule, long? SourceEntityId,
    TemplateType OutputFormat, RenderStatus Status,
    int? DurationMs, Instant RequestedAt, Instant? CompletedAt);
