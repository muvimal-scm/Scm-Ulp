using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Accounting.Application;
using Ulp.Accounting.Infrastructure.Persistence;

namespace Ulp.Accounting.Infrastructure;

public static class AccountingRegistration
{
    public static IServiceCollection AddAccountingModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<AccountingDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddScoped<IAccountsService, AccountsService>();
        services.AddScoped<IFinanceExtService, FinanceExtService>();
        return services;
    }
}
