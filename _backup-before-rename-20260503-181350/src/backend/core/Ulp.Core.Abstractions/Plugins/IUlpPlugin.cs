using Microsoft.Extensions.DependencyInjection;
using Ulp.Core.Domain.ValueObjects;

namespace Ulp.Core.Abstractions.Plugins;

/// <summary>
/// Plugin entry point. Each country compliance plugin (India, US, future UAE/EU) implements
/// this and is discovered + registered by <c>Ulp.Core.PluginHost</c> at host startup.
/// </summary>
public interface IUlpPlugin
{
    /// <summary>Stable plugin code (e.g., "india-compliance", "us-compliance").</summary>
    string Code { get; }

    /// <summary>The country this plugin serves.</summary>
    CountryCode CountryCode { get; }

    /// <summary>Register the plugin's services into DI. Implementations should use keyed services
    /// scoped by <see cref="CountryCode"/>.</summary>
    void ConfigureServices(IServiceCollection services);
}
