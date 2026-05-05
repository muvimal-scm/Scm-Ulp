using Microsoft.AspNetCore.Routing;
using Ulp.Procurement.Api.Endpoints;

namespace Ulp.Procurement.Api;

public static class ProcurementEndpoints
{
    public static IEndpointRouteBuilder MapProcurementEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPrEndpoints();
        app.MapRfqEndpoints();
        app.MapPoEndpoints();
        app.MapGrnEndpoints();
        app.MapMatchEndpoints();
        return app;
    }
}
