using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Trucking.Application;
using Ulp.Trucking.Infrastructure.Persistence;

namespace Ulp.Trucking.Infrastructure;

public static class TruckingRegistration
{
    public static IServiceCollection AddTruckingModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<TruckingDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<ITruckingService, TruckingService>();
        return services;
    }
}
