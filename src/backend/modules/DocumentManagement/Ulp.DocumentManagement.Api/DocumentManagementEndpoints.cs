using Microsoft.AspNetCore.Routing;
using Ulp.DocumentManagement.Api.Endpoints;

namespace Ulp.DocumentManagement.Api;

public static class DocumentManagementEndpoints
{
    public static IEndpointRouteBuilder MapDocumentManagementEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapDocumentEndpoints();
        app.MapStorageEndpoints();
        return app;
    }
}
