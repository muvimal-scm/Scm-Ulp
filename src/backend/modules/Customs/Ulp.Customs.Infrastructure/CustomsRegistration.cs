using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Customs.Application;
using Ulp.Customs.Infrastructure.Persistence;

namespace Ulp.Customs.Infrastructure;

public static class CustomsRegistration
{
    public static IServiceCollection AddCustomsModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<CustomsDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<ICustomsService, CustomsService>();
        return services;
    }
}
