using FluentValidation;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Ulp.M1.Api.Endpoints;
using Ulp.M1.Application.Parties;

namespace Ulp.M1.Api;

/// <summary>
/// Single entry point for the host: registers M1 endpoints + the
/// FluentValidation validators that the endpoints depend on.
/// </summary>
public static class M1Endpoints
{
    public static IServiceCollection AddM1Validators(this IServiceCollection services)
    {
        services.AddScoped<IValidator<CreatePartyRequest>, CreatePartyValidator>();
        services.AddScoped<IValidator<UpdatePartyRequest>, UpdatePartyValidator>();
        return services;
    }

    public static IEndpointRouteBuilder MapM1Endpoints(this IEndpointRouteBuilder app)
    {
        app.MapPartyEndpoints();
        app.MapProductEndpoints();
        app.MapReferenceEndpoints();
        app.MapProfileExtensionsEndpoints();
        return app;
    }
}
