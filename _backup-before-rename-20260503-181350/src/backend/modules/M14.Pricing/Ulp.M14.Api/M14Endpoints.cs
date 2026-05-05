using Microsoft.AspNetCore.Routing;
using Ulp.M14.Api.Endpoints;

namespace Ulp.M14.Api;

public static class M14Endpoints
{
    public static IEndpointRouteBuilder MapM14Endpoints(this IEndpointRouteBuilder app)
    {
        app.MapRateCardEndpoints();
        app.MapQuoteEndpoints();
        app.MapM14ReadOnlyEndpoints();
        return app;
    }
}
