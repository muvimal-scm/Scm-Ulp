using Microsoft.AspNetCore.Routing;
using Ulp.M7.Api.Endpoints;

namespace Ulp.M7.Api;

public static class M7Endpoints
{
    public static IEndpointRouteBuilder MapM7Endpoints(this IEndpointRouteBuilder app)
    {
        app.MapPrEndpoints();
        app.MapRfqEndpoints();
        app.MapPoEndpoints();
        app.MapGrnEndpoints();
        app.MapMatchEndpoints();
        return app;
    }
}
