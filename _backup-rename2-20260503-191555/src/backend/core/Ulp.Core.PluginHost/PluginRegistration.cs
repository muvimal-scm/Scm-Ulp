using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Ulp.Core.Abstractions.Plugins;
using Ulp.Core.Domain.Tenancy;

namespace Ulp.Core.PluginHost;

/// <summary>
/// Discovers <see cref="IUlpPlugin"/> implementations registered by the host
/// and wires their services via keyed DI keyed by <see cref="ITenantContext.CountryCode"/>.
/// </summary>
public static class PluginRegistration
{
    public static IServiceCollection AddUlpPlugins(this IServiceCollection services, IEnumerable<IUlpPlugin> plugins, ILogger? logger = null)
    {
        foreach (var plugin in plugins)
        {
            logger?.LogInformation("Registering ULP plugin {Code} for country {Country}", plugin.Code, plugin.CountryCode.Value);
            plugin.ConfigureServices(services);
        }

        // Resolver — turn keyed registrations into a per-request implementation
        // selected by the tenant's country code.
        RegisterCountryResolver<IComplianceProvider>(services);
        RegisterCountryResolver<ITaxProvider>(services);
        RegisterCountryResolver<ICustomsProvider>(services);
        RegisterCountryResolver<IBankingProvider>(services);
        RegisterCountryResolver<IPayrollProvider>(services);
        RegisterCountryResolver<IStateTaxProvider>(services);

        return services;
    }

    private static void RegisterCountryResolver<TInterface>(IServiceCollection services) where TInterface : class
    {
        services.AddScoped<TInterface>(sp =>
        {
            var tenant = sp.GetRequiredService<ITenantContext>();
            return sp.GetRequiredKeyedService<TInterface>(tenant.CountryCode.Value);
        });
    }
}
