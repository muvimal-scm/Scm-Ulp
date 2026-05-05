using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.VendorManagement.Application;
using Ulp.VendorManagement.Infrastructure.Persistence;

namespace Ulp.VendorManagement.Infrastructure;

public static class VendorManagementRegistration
{
    public static IServiceCollection AddVendorManagementModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<VendorManagementDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<IVendorService, VendorService>();
        return services;
    }
}
