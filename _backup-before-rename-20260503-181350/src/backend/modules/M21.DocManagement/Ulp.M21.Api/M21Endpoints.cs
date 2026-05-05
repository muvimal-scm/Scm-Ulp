using Microsoft.AspNetCore.Routing;
using Ulp.M21.Api.Endpoints;

namespace Ulp.M21.Api;

public static class M21Endpoints
{
    public static IEndpointRouteBuilder MapM21Endpoints(this IEndpointRouteBuilder app)
    {
        app.MapDocumentEndpoints();
        app.MapStorageEndpoints();
        return app;
    }
}
