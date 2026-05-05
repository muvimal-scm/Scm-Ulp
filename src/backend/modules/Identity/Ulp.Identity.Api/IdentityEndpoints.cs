using Microsoft.AspNetCore.Routing;
using Ulp.Identity.Api.Endpoints;

namespace Ulp.Identity.Api;

/// <summary>
/// Single entry point for the host: registers all M26 endpoint groups under
/// <c>/api/v1/identity/*</c>.
/// </summary>
public static class IdentityEndpoints
{
    public static IEndpointRouteBuilder MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapMeEndpoints();
        app.MapUserEndpoints();
        app.MapRoleEndpoints();
        app.MapPermissionEndpoints();
        app.MapApiKeyEndpoints();
        return app;
    }
}
