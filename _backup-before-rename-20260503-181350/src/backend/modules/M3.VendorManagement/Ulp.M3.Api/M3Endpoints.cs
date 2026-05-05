using Microsoft.AspNetCore.Routing;
using Ulp.M3.Api.Endpoints;

namespace Ulp.M3.Api;

public static class M3Endpoints
{
    public static IEndpointRouteBuilder MapM3Endpoints(this IEndpointRouteBuilder app)
    {
        app.MapVendorEndpoints();
        app.MapNcrEndpoints();
        return app;
    }
}
