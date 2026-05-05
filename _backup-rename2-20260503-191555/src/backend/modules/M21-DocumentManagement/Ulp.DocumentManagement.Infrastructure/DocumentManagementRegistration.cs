using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Core.Infrastructure.Storage;
using Ulp.DocumentManagement.Application;
using Ulp.DocumentManagement.Infrastructure.Persistence;

namespace Ulp.DocumentManagement.Infrastructure;

public static class DocumentManagementRegistration
{
    public static IServiceCollection AddDocumentManagementModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<DocumentManagementDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        // IStorageProvider lives in Core.Infrastructure; register the MinIO impl
        // here so M21 (and any future doc consumer) gets a working blob layer.
        services.AddMinioStorage(cfg);

        services.AddScoped<IDocumentService, DocumentService>();
        return services;
    }
}
