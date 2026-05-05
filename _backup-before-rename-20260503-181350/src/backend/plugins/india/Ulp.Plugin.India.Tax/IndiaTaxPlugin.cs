using Microsoft.Extensions.DependencyInjection;
using Ulp.Core.Abstractions.Plugins;
using Ulp.Core.Domain.ValueObjects;

namespace Ulp.Plugin.India.Tax;

/// <summary>
/// IUlpPlugin entry point for the India tax plugin (M17-IN). Registers IndiaTaxProvider
/// as a keyed ITaxProvider keyed by "IN" — the Core PluginHost resolver then picks it
/// per-request based on ITenantContext.CountryCode.
/// </summary>
public sealed class IndiaTaxPlugin : IUlpPlugin
{
    public string Code => "india-tax";
    public CountryCode CountryCode => new("IN");

    public void ConfigureServices(IServiceCollection services)
    {
        services.AddKeyedScoped<ITaxProvider, IndiaTaxProvider>("IN");
    }
}
