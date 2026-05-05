using Microsoft.AspNetCore.Routing;
using Ulp.FreightForwarding.Api.Endpoints;

namespace Ulp.FreightForwarding.Api;

public static class FreightForwardingEndpoints
{
    public static IEndpointRouteBuilder MapFreightForwardingEndpoints(this IEndpointRouteBuilder app)
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
