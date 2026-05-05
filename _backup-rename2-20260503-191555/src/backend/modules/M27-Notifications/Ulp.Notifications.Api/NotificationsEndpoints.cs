using Microsoft.AspNetCore.Routing;
using Ulp.Notifications.Api.Endpoints;

namespace Ulp.Notifications.Api;

public static class NotificationsEndpoints
{
    public static IEndpointRouteBuilder MapNotificationsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapInboxEndpoints();
        app.MapPreferenceEndpoints();
        app.MapTemplateEndpoints();
        app.MapProviderTestEndpoints();
        app.MapRuleEndpoints();
        return app;
    }
}
