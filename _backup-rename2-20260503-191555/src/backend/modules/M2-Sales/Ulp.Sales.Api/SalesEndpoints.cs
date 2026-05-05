using Microsoft.AspNetCore.Routing;
using Ulp.Sales.Api.Endpoints;

namespace Ulp.Sales.Api;

public static class SalesEndpoints
{
    public static IEndpointRouteBuilder MapSalesEndpoints(this IEndpointRouteBuilder app)
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
