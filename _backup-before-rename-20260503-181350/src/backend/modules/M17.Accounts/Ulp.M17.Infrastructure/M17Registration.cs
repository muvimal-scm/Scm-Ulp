using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.M17.Application;
using Ulp.M17.Infrastructure.Persistence;

namespace Ulp.M17.Infrastructure;

public static class M17Registration
{
    public static IServiceCollection AddM17Module(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<M17DbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<IAccountsService, AccountsService>();
        services.AddScoped<IFinanceExtService, FinanceExtService>();
        return services;
    }
}
