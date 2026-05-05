using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.M4.Application;
using Ulp.M4.Infrastructure.Persistence;

namespace Ulp.M4.Infrastructure;

public static class M4Registration
{
    public static IServiceCollection AddM4Module(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<M4DbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<ICustomsService, CustomsService>();
        return services;
    }
}
