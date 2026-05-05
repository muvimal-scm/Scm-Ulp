using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.DocumentManagement.Application;

namespace Ulp.DocumentManagement.Api.Endpoints;

public static class DocumentEndpoints
{
    public static IEndpointRouteBuilder MapDocumentEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/document-management/documents").WithTags("M21 · Documents").RequireAuthorization();

        g.MapPost("/upload-init", async (
            [FromBody] UploadInitRequest req,
            [FromServices] IDocumentService svc,
            CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.InitUploadAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        g.MapPost("/{ulid}/upload-complete", async (
            string ulid,
            [FromBody] UploadCompleteRequest req,
            [FromServices] IDocumentService svc,
            CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.CompleteUploadAsync(ulid, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        g.MapGet("/", async (
            [FromServices] IDocumentService svc,
            [FromQuery] string? moduleCode,
            [FromQuery] string? moduleEntityType,
            [FromQuery] long? moduleEntityId,
            [FromQuery] string? classCode,
            [FromQuery] bool includeDeleted,
            [FromQuery] int page,
            [FromQuery] int pageSize,
            CancellationToken ct) =>
        {
            var q = new DocumentListQuery(moduleCode, moduleEntityType, moduleEntityId, classCode,
                includeDeleted, page, pageSize);
            var items = await svc.ListAsync(q, ct);
            var total = await svc.CountAsync(q, ct);
            return Results.Ok(new { items, total });
        });

        g.MapGet("/{ulid}", async (string ulid,
            [FromServices] IDocumentService svc, CancellationToken ct) =>
        {
            var d = await svc.GetByUlidAsync(ulid, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        g.MapGet("/{ulid}/download", async (string ulid,
            [FromQuery] int? expireSeconds,
            [FromServices] IDocumentService svc, CancellationToken ct) =>
        {
            try
            {
                var url = await svc.CreateDownloadUrlAsync(ulid,
                    expireSeconds.HasValue ? TimeSpan.FromSeconds(expireSeconds.Value) : null, ct);
                return Results.Ok(new { url = url.ToString() });
            }
            catch (InvalidOperationException ex) { return Results.NotFound(new { error = ex.Message }); }
        });

        g.MapPost("/{ulid}/versions", async (string ulid,
            [FromBody] UploadInitRequest req,
            [FromServices] IDocumentService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.AddVersionAsync(ulid, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        g.MapDelete("/{ulid}", async (string ulid,
            [FromServices] IDocumentService svc, CancellationToken ct) =>
        {
            try   { return await svc.SoftDeleteAsync(ulid, ct) ? Results.NoContent() : Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{ulid}/restore", async (string ulid,
            [FromServices] IDocumentService svc, CancellationToken ct) =>
        {
            return await svc.RestoreAsync(ulid, ct) ? Results.NoContent() : Results.NotFound();
        });

        return app;
    }
}
