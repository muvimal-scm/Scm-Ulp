using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M6.Application;

namespace Ulp.M6.Api.Endpoints;

public static class TemplateEndpoints
{
    public static IEndpointRouteBuilder MapTemplateEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m6/templates").WithTags("M6 · Templates").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] IDocGenService svc,
            [FromQuery] string? channel,
            CancellationToken ct) => Results.Ok(await svc.ListTemplatesAsync(channel, ct)));

        g.MapGet("/{id:long}", async (long id,
            [FromServices] IDocGenService svc, CancellationToken ct) =>
        {
            var d = await svc.GetTemplateAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        g.MapPost("/", async (
            [FromBody] CreateTemplateRequest req,
            [FromServices] IDocGenService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/m6/templates/", await svc.CreateTemplateAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/versions", async (long id,
            [FromBody] AddVersionRequest req,
            [FromServices] IDocGenService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/m6/templates/{id}/versions", await svc.AddTemplateVersionAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        return app;
    }
}
