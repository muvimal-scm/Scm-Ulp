using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Core.Domain.Tenancy;
using Ulp.M26.Application;
using Ulp.M26.Infrastructure.Persistence;
using Ulp.M26.Infrastructure.Tenancy;

namespace Ulp.M26.Infrastructure;

/// <summary>
/// DI extension for the M26 RBAC + Tenant module. The host calls
/// <c>services.AddM26Module(configuration)</c> from Program.cs, then
/// <c>app.UseM26TenantContext()</c> after authentication middleware.
/// </summary>
public static class M26Registration
{
    public static IServiceCollection AddM26Module(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<M26DbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        services.AddMemoryCache();

        services.AddScoped<ITenantLookup, TenantLookup>();
        services.AddScoped<IUserLookup, UserLookup>();
        services.AddScoped<IPermissionResolver, PermissionResolver>();

        // Per-request holder + ITenantContext backed by it. Replaces the
        // host's DevTenantContext registration.
        services.AddScoped<TenantContextHolder>();
        services.AddScoped<ITenantContext, ResolvedTenantContext>();

        return services;
    }

    public static IApplicationBuilder UseM26TenantContext(this IApplicationBuilder app)
        => app.UseMiddleware<KeycloakTenantContextMiddleware>();
}
