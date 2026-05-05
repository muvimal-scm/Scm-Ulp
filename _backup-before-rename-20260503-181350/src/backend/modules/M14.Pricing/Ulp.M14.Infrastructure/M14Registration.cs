using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.M14.Application;
using Ulp.M14.Infrastructure.Persistence;

namespace Ulp.M14.Infrastructure;

public static class M14Registration
{
    public static IServiceCollection AddM14Module(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<M14DbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<IPricingService, PricingService>();
        return services;
    }
}
