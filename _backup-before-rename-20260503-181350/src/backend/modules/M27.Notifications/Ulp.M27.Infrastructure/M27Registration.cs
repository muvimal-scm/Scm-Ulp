using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Core.Infrastructure.Notifications;
using Ulp.M27.Application;
using Ulp.M27.Infrastructure.Persistence;

namespace Ulp.M27.Infrastructure;

public static class M27Registration
{
    public static IServiceCollection AddM27Module(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<M27DbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        // IEmailSender lives in Core.Infrastructure (MailHog dev / ACS prod swap).
        services.AddMailHogEmail(cfg);

        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<INotificationRuleService, NotificationRuleService>();
        return services;
    }
}
