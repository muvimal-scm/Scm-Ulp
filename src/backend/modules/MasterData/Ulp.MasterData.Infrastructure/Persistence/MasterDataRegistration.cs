using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.MasterData.Application.Parties;
using Ulp.MasterData.Application.Products;
using Ulp.MasterData.Application.Profiles;
using Ulp.MasterData.Application.Reference;

namespace Ulp.MasterData.Infrastructure.Persistence;

/// <summary>
/// DI extension for the M1 module. The host calls
/// <c>services.AddMasterDataModule(configuration)</c> from Program.cs.
/// </summary>
public static class MasterDataRegistration
{
    public static IServiceCollection AddMasterDataModule(this IServiceCollection services, IConfiguration cfg)
    {
        // Connection string per region â€” Phase 1 dev uses "primary-in-central"
        // for both IN and US tenants since they share one MySQL container in dev.
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<MasterDataDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<IPartyRepository, PartyRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IReferenceQueries, ReferenceQueries>();
        services.AddScoped<IProfileExtensionsRepository, ProfileExtensionsRepository>();

        return services;
    }
}
