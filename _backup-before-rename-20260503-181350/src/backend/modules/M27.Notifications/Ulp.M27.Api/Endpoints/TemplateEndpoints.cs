using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M27.Application;

namespace Ulp.M27.Api.Endpoints;

public static class TemplateEndpoints
{
    public static IEndpointRouteBuilder MapTemplateEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m27/templates").WithTags("M27 · Templates").RequireAuthorization();

        g.MapGet("/", async (
            [FromQuery] string? channel,
            [FromServices] INotificationService svc,
            CancellationToken ct) => Results.Ok(await svc.ListTemplatesAsync(channel, ct)));

        return app;
    }
}

public static class ProviderTestEndpoints
{
    public static IEndpointRouteBuilder MapProviderTestEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m27/providers").WithTags("M27 · Providers").RequireAuthorization();

        g.MapPost("/email/test", async (
            [FromBody] SendTestEmailRequest req,
            [FromServices] INotificationService svc,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.To)) return Results.BadRequest(new { error = "to is required" });
            return Results.Ok(await svc.SendTestEmailAsync(req.To, ct));
        });

        return app;
    }
}

public sealed record SendTestEmailRequest(string To);
