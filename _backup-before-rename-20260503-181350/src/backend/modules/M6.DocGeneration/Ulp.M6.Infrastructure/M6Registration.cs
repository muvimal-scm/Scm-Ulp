using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Core.Infrastructure.Rendering;
using Ulp.M6.Application;
using Ulp.M6.Infrastructure.Persistence;

namespace Ulp.M6.Infrastructure;

public static class M6Registration
{
    public static IServiceCollection AddM6Module(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<M6DbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        // IDocumentRenderer impl from Core.Infrastructure
        services.AddScribanRenderer();

        services.AddScoped<IDocGenService, DocGenService>();
        return services;
    }
}
