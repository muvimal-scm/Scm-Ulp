using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ulp.Core.Infrastructure.Notifications;
using Ulp.Notifications.Application;
using Ulp.Notifications.Infrastructure.Persistence;

namespace Ulp.Notifications.Infrastructure;

public static class NotificationsRegistration
{
    public static IServiceCollection AddNotificationsModule(this IServiceCollection services, IConfiguration cfg)
    {
        var connStr = cfg.GetConnectionString("primary-in-central")
            ?? throw new InvalidOperationException("Connection string 'primary-in-central' missing");

        services.AddDbContext<NotificationsDbContext>(opts =>
            opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
                mysql => mysql.EnableRetryOnFailure(3).CommandTimeout(30)));

        // IEmailSender lives in Core.Infrastructure (MailHog dev / ACS prod swap).
        services.AddMailHogEmail(cfg);

        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<INotificationRuleService, NotificationRuleService>();
        return services;
    }
}
