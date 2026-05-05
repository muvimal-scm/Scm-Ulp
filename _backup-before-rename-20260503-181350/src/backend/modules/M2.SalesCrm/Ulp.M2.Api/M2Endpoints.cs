using Microsoft.AspNetCore.Routing;
using Ulp.M2.Api.Endpoints;

namespace Ulp.M2.Api;

public static class M2Endpoints
{
    public static IEndpointRouteBuilder MapM2Endpoints(this IEndpointRouteBuilder app)
    {
        app.MapLeadEndpoints();
        app.MapOpportunityEndpoints();
        app.MapActivityEndpoints();
        app.MapCampaignEndpoints();
        app.MapRfqEndpoints();
        app.MapReadOnlyEndpoints();
        return app;
    }
}
