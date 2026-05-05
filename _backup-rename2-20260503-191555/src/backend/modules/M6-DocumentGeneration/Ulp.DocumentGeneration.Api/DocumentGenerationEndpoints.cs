using Microsoft.AspNetCore.Routing;
using Ulp.DocumentGeneration.Api.Endpoints;

namespace Ulp.DocumentGeneration.Api;

public static class DocumentGenerationEndpoints
{
    public static IEndpointRouteBuilder MapDocumentGenerationEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapTemplateEndpoints();
        app.MapRenderEndpoints();
        return app;
    }
}
