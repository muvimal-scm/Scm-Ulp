using Microsoft.AspNetCore.Routing;
using Ulp.M6.Api.Endpoints;

namespace Ulp.M6.Api;

public static class M6Endpoints
{
    public static IEndpointRouteBuilder MapM6Endpoints(this IEndpointRouteBuilder app)
    {
        app.MapTemplateEndpoints();
        app.MapRenderEndpoints();
        return app;
    }
}
