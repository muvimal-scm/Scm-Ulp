using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Core.Domain.Tenancy;
using Ulp.Identity.Application;
using Ulp.Identity.Infrastructure.Persistence;
using Ulp.Identity.Infrastructure.Tenancy;

namespace Ulp.Identity.Infrastructure;

/// <summary>
/// DI extension for the M26 RBAC + Tenant module. The host calls
/// <c>services.AddIdentityModule(configuration)</c> from Program.cs, then
/// <c>app.UseIdentityTenantContext()</c> after authentication middleware.
/// </summary>
public static class IdentityRegistration
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<IdentityDbContext>(opts =>
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

    public static IApplicationBuilder UseIdentityTenantContext(this IApplicationBuilder app)
        => app.UseMiddleware<KeycloakTenantContextMiddleware>();
}
