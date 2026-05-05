using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.M1.Application.Parties;
using Ulp.M1.Application.Products;
using Ulp.M1.Application.Profiles;
using Ulp.M1.Application.Reference;

namespace Ulp.M1.Infrastructure.Persistence;

/// <summary>
/// DI extension for the M1 module. The host calls
/// <c>services.AddM1Module(configuration)</c> from Program.cs.
/// </summary>
public static class M1Registration
{
    public static IServiceCollection AddM1Module(this IServiceCollection services, IConfiguration cfg)
    {
        // Connection string per region — Phase 1 dev uses "primary-in-central"
        // for both IN and US tenants since they share one MySQL container in dev.
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<M1DbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<IPartyRepository, PartyRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IReferenceQueries, ReferenceQueries>();
        services.AddScoped<IProfileExtensionsRepository, ProfileExtensionsRepository>();

        return services;
    }
}
