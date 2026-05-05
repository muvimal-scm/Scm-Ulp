using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.PricingQuotation.Application;
using Ulp.PricingQuotation.Infrastructure.Persistence;

namespace Ulp.PricingQuotation.Infrastructure;

public static class PricingQuotationRegistration
{
    public static IServiceCollection AddPricingQuotationModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<PricingQuotationDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<IPricingService, PricingService>();
        return services;
    }
}
