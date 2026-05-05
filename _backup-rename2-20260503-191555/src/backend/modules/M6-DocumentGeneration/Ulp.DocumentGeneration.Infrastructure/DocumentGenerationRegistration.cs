using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Core.Infrastructure.Rendering;
using Ulp.DocumentGeneration.Application;
using Ulp.DocumentGeneration.Infrastructure.Persistence;

namespace Ulp.DocumentGeneration.Infrastructure;

public static class DocumentGenerationRegistration
{
    public static IServiceCollection AddDocumentGenerationModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<DocumentGenerationDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        // IDocumentRenderer impl from Core.Infrastructure
        services.AddScribanRenderer();

        services.AddScoped<IDocGenService, DocGenService>();
        return services;
    }
}
