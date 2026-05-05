using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.VendorManagement.Application;
using Ulp.VendorManagement.Domain.Entities;

namespace Ulp.VendorManagement.Api.Endpoints;

public static class VendorEndpoints
{
    public static IEndpointRouteBuilder MapVendorEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/vendor-management/vendors").WithTags("M3 · Vendors").RequireAuthorization();

        g.MapGet("/", async (
            [FromServices] IVendorService svc,
            [FromQuery] VendorStatus? status,
            [FromQuery] string? countryCode,
            [FromQuery] VendorCategoryCode? category,
            [FromQuery] int page,
            [FromQuery] int pageSize,
            CancellationToken ct) =>
        {
            var q = new VendorListQuery(status, countryCode, category, page, pageSize);
            var items = await svc.ListAsync(q, ct);
            var total = await svc.CountAsync(q, ct);
            return Results.Ok(new { items, total });
        });

        g.MapGet("/{id:long}", async (long id,
            [FromServices] IVendorService svc, CancellationToken ct) =>
        {
            var v = await svc.GetAsync(id, ct);
            return v is null ? Results.NotFound() : Results.Ok(v);
        });

        g.MapPost("/", async (
            [FromBody] CreateVendorRequest req,
            [FromServices] IVendorService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/vendor-management/vendors/", await svc.CreateAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPut("/{id:long}", async (long id,
            [FromBody] UpdateVendorRequest req,
            [FromServices] IVendorService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.UpdateAsync(id, req, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        g.MapPost("/{id:long}/activate", async (long id,
            [FromServices] IVendorService svc, CancellationToken ct) =>
        {
            return await svc.ActivateAsync(id, ct) ? Results.NoContent() : Results.NotFound();
        });

        g.MapPost("/{id:long}/suspend", async (long id,
            [FromBody] SuspendRequest req,
            [FromServices] IVendorService svc, CancellationToken ct) =>
        {
            return await svc.SuspendAsync(id, req.Reason ?? "", ct) ? Results.NoContent() : Results.NotFound();
        });

        // Onboarding
        g.MapPost("/{id:long}/onboarding/start", async (long id,
            [FromServices] IVendorService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.StartOnboardingAsync(id, ct)); }
            catch (InvalidOperationException) { return Results.NotFound(); }
        });

        g.MapPost("/{id:long}/onboarding/{stepCode}/complete", async (long id, string stepCode,
            [FromBody] CompleteStepRequest req,
            [FromServices] IVendorService svc, CancellationToken ct) =>
        {
            return await svc.CompleteStepAsync(id, stepCode, req, ct) ? Results.NoContent() : Results.NotFound();
        });

        g.MapGet("/{id:long}/onboarding", async (long id,
            [FromServices] IVendorService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetOnboardingStepsAsync(id, ct)));

        // Agreements
        g.MapGet("/{id:long}/agreements", async (long id,
            [FromServices] IVendorService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAgreementsAsync(id, ct)));

        g.MapPost("/{id:long}/agreements", async (long id,
            [FromBody] CreateAgreementRequest req,
            [FromServices] IVendorService svc, CancellationToken ct) =>
        {
            try   { return Results.Created($"/api/v1/vendor-management/vendors/{id}/agreements/", await svc.CreateAgreementAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        // Performance
        g.MapGet("/{id:long}/performance", async (long id,
            [FromServices] IVendorService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetPerformanceAsync(id, ct)));

        // NCRs (vendor-scoped list)
        g.MapGet("/{id:long}/ncrs", async (long id,
            [FromServices] IVendorService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListNcrsAsync(id, ct)));

        return app;
    }
}

public sealed record SuspendRequest(string? Reason);
