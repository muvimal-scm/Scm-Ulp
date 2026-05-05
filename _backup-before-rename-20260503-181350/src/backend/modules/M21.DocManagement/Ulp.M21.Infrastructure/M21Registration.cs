using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Core.Infrastructure.Storage;
using Ulp.M21.Application;
using Ulp.M21.Infrastructure.Persistence;

namespace Ulp.M21.Infrastructure;

public static class M21Registration
{
    public static IServiceCollection AddM21Module(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<M21DbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        // IStorageProvider lives in Core.Infrastructure; register the MinIO impl
        // here so M21 (and any future doc consumer) gets a working blob layer.
        services.AddMinioStorage(cfg);

        services.AddScoped<IDocumentService, DocumentService>();
        return services;
    }
}
