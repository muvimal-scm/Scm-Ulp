using Microsoft.AspNetCore.Routing;
using Ulp.M5.Api.Endpoints;

namespace Ulp.M5.Api;

public static class M5Endpoints
{
    public static IEndpointRouteBuilder MapM5Endpoints(this IEndpointRouteBuilder app)
    {
        app.MapBookingEndpoints();
        app.MapShipmentEndpoints();
        app.MapContainerEndpoints();
        app.MapHblEndpoints();
        app.MapReadOnlyEndpoints();
        app.MapReminderEndpoints();    // SCM Milestone 1+2
        return app;
    }
}
