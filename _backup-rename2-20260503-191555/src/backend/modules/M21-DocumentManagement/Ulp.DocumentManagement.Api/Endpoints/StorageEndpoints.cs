using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.DocumentManagement.Application;

namespace Ulp.DocumentManagement.Api.Endpoints;

public static class StorageEndpoints
{
    public static IEndpointRouteBuilder MapStorageEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/document-management/storage").WithTags("M21 Â· Storage").RequireAuthorization();

        g.MapGet("/quota", async (
            [FromServices] IDocumentService svc,
            CancellationToken ct) => Results.Ok(await svc.GetTenantQuotaAsync(ct)));

        return app;
    }
}
