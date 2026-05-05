using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Procurement.Application;
using Ulp.Procurement.Infrastructure.Persistence;

namespace Ulp.Procurement.Infrastructure;

public static class ProcurementRegistration
{
    public static IServiceCollection AddProcurementModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<ProcurementDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<IProcurementService, ProcurementService>();
        return services;
    }
}
