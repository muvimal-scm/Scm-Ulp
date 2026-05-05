using Microsoft.AspNetCore.Routing;
using Ulp.M26.Api.Endpoints;

namespace Ulp.M26.Api;

/// <summary>
/// Single entry point for the host: registers all M26 endpoint groups under
/// <c>/api/v1/m26/*</c>.
/// </summary>
public static class M26Endpoints
{
    public static IEndpointRouteBuilder MapM26Endpoints(this IEndpointRouteBuilder app)
    {
        app.MapMeEndpoints();
        app.MapUserEndpoints();
        app.MapRoleEndpoints();
        app.MapPermissionEndpoints();
        app.MapApiKeyEndpoints();
        return app;
    }
}
