using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.LastMile.Application;
using Ulp.LastMile.Infrastructure.Persistence;

namespace Ulp.LastMile.Infrastructure;

public static class LastMileRegistration
{
    public static IServiceCollection AddLastMileModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<LastMileDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<ILastMileService, LastMileService>();
        return services;
    }
}
