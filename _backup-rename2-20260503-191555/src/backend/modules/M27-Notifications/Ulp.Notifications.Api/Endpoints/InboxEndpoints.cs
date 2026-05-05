using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.Identity.Infrastructure.Tenancy;
using Ulp.Notifications.Application;

namespace Ulp.Notifications.Api.Endpoints;

public static class InboxEndpoints
{
    public static IEndpointRouteBuilder MapInboxEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/notifications/inbox").WithTags("M27 Â· Inbox").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] INotificationService svc,
            [FromServices] TenantContextHolder holder,
            [FromQuery] bool includeRead,
            [FromQuery] int page,
            [FromQuery] int pageSize,
            CancellationToken ct) =>
        {
            if (holder.UserId is null) return Results.Unauthorized();
            var items = await svc.GetInboxAsync(holder.UserId.Value, includeRead, page, pageSize, ct);
            return Results.Ok(items);
        });

        g.MapPost("/{id:long}/read", async (long id,
            [FromServices] INotificationService svc,
            [FromServices] TenantContextHolder holder,
            CancellationToken ct) =>
        {
            if (holder.UserId is null) return Results.Unauthorized();
            return await svc.MarkReadAsync(id, holder.UserId.Value, ct) ? Results.NoContent() : Results.NotFound();
        });

        g.MapPost("/read-all", async (
            [FromServices] INotificationService svc,
            [FromServices] TenantContextHolder holder,
            CancellationToken ct) =>
        {
            if (holder.UserId is null) return Results.Unauthorized();
            var n = await svc.MarkAllReadAsync(holder.UserId.Value, ct);
            return Results.Ok(new { marked = n });
        });

        return app;
    }
}
