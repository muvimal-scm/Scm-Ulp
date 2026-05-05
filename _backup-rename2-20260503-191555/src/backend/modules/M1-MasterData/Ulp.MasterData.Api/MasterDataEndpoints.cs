using FluentValidation;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Ulp.MasterData.Api.Endpoints;
using Ulp.MasterData.Application.Parties;

namespace Ulp.MasterData.Api;

/// <summary>
/// Single entry point for the host: registers M1 endpoints + the
/// FluentValidation validators that the endpoints depend on.
/// </summary>
public static class MasterDataEndpoints
{
    public static IServiceCollection AddMasterDataValidators(this IServiceCollection services)
    {
        services.AddScoped<IValidator<CreatePartyRequest>, CreatePartyValidator>();
        services.AddScoped<IValidator<UpdatePartyRequest>, UpdatePartyValidator>();
        return services;
    }

    public static IEndpointRouteBuilder MapMasterDataEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPartyEndpoints();
        app.MapProductEndpoints();
        app.MapReferenceEndpoints();
        app.MapProfileExtensionsEndpoints();
        return app;
    }
}
