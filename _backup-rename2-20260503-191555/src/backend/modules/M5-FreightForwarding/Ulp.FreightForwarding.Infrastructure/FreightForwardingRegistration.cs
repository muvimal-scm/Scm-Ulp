using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.FreightForwarding.Application;
using Ulp.FreightForwarding.Infrastructure.Persistence;

namespace Ulp.FreightForwarding.Infrastructure;

public static class FreightForwardingRegistration
{
    public static IServiceCollection AddFreightForwardingModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<FreightForwardingDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<IFreightService, FreightService>();
        return services;
    }
}
