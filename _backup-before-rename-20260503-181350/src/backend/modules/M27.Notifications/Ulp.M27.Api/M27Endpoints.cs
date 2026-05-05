using Microsoft.AspNetCore.Routing;
using Ulp.M27.Api.Endpoints;

namespace Ulp.M27.Api;

public static class M27Endpoints
{
    public static IEndpointRouteBuilder MapM27Endpoints(this IEndpointRouteBuilder app)
    {
        app.MapInboxEndpoints();
        app.MapPreferenceEndpoints();
        app.MapTemplateEndpoints();
        app.MapProviderTestEndpoints();
        app.MapRuleEndpoints();
        return app;
    }
}
