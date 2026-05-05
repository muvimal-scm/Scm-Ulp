using Microsoft.AspNetCore.Routing;
using Ulp.VendorManagement.Api.Endpoints;

namespace Ulp.VendorManagement.Api;

public static class VendorManagementEndpoints
{
    public static IEndpointRouteBuilder MapVendorManagementEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapVendorEndpoints();
        app.MapNcrEndpoints();
        return app;
    }
}
