---
name: hangfire-jobs
description: Hangfire background jobs for ULP scheduled and recurring tasks. Use when implementing recurring jobs (period close prep, GSTR generation, dunning), delayed jobs (POD reminders), batch jobs (GPS aggregation), or fire-and-forget jobs (email send). Always use Hangfire instead of HostedService for anything beyond app startup.
---

# Hangfire Background Jobs for ULP

## When this skill triggers
Implementing recurring jobs, delayed jobs, batch processing, or any work that should NOT run on the request thread. Examples: GSTR data export every month, AR dunning daily, GPS data archival hourly.

## Top 3 reference repos
1. **HangfireIO/Hangfire** (https://github.com/HangfireIO/Hangfire) - Official. The dashboard at `/hangfire` is invaluable for ops visibility.
2. **HangfireIO/Hangfire.MySqlStorage** (https://github.com/HangfireIO/Hangfire.MySqlStorage) - The MySQL storage provider ULP uses. **Note: prefer Pomelo's MySql storage** for production.
3. **arnoldasgudas/Hangfire.RecurringJobExtensions** (https://github.com/arnoldasgudas/Hangfire.RecurringJobExtensions) - Attribute-based recurring job declaration. Cleaner than imperative registration.

## Standard ULP setup
```csharp
// Program.cs
builder.Services.AddHangfire(cfg => cfg
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseStorage(new MySqlStorage(
        builder.Configuration.GetConnectionString("Hangfire"),
        new MySqlStorageOptions {
            QueuePollInterval = TimeSpan.FromSeconds(15),
            JobExpirationCheckInterval = TimeSpan.FromHours(1),
            CountersAggregateInterval = TimeSpan.FromMinutes(5),
            PrepareSchemaIfNecessary = true,
            DashboardJobListLimit = 50000,
            TransactionTimeout = TimeSpan.FromMinutes(1),
            TablesPrefix = "hangfire_"
        }))
    .UseFilter(new AutomaticRetryAttribute { Attempts = 3 })
    .UseFilter(new TenantContextHangfireFilter()));

builder.Services.AddHangfireServer(opts => {
    opts.WorkerCount = Environment.ProcessorCount * 2;
    opts.Queues = new[] { "critical", "default", "low" };
});

// Dashboard - secure with auth
app.UseHangfireDashboard("/hangfire", new DashboardOptions {
    Authorization = new[] { new HangfireAuthFilter() }
});
```

## Recurring job pattern (M17 example)
```csharp
public class M17RecurringJobs
{
    public static void Register()
    {
        // Daily AR aging snapshot at 2 AM IST
        RecurringJob.AddOrUpdate<IArAgingService>(
            "m17-ar-aging-snapshot",
            x => x.GenerateDailySnapshotAsync(CancellationToken.None),
            "0 2 * * *",
            TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"));

        // Daily dunning at 9 AM IST
        RecurringJob.AddOrUpdate<IDunningService>(
            "m17-dunning-daily",
            x => x.RunDailyDunningAsync(CancellationToken.None),
            "0 9 * * *",
            TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"));

        // Period close eligibility check on 1st at 1 AM IST
        RecurringJob.AddOrUpdate<IPeriodCloseService>(
            "m17-period-close-check",
            x => x.CheckEligibilityAsync(CancellationToken.None),
            "0 1 1 * *");
    }
}
```

## Delayed job pattern (M13 example)
```csharp
// 4 hours after dispatch, check for POD; if missing, alert
public async Task DispatchTripAsync(Guid tripId)
{
    await _tripService.DispatchAsync(tripId);
    
    BackgroundJob.Schedule<IPodReminderService>(
        x => x.CheckPodOverdueAsync(tripId, CancellationToken.None),
        TimeSpan.FromHours(4));
}
```

## Gotchas specific to ULP

1. **ALWAYS pass `CancellationToken.None` in job declarations** - Hangfire injects its own. Passing actual `ct` causes serialization errors.
2. **Job arguments must be serializable** - never pass entities or domain objects. Use IDs and re-fetch in the job.
3. **Tenant context must be captured at enqueue time** - use a `TenantContextHangfireFilter` to write it to job arguments. Workers can't read HTTP context.
4. **DON'T use `BackgroundJob.Enqueue` for things that should be reliable events** - that's MassTransit's job. Hangfire is for scheduled work. Events are for state changes.
5. **Idempotency** - jobs may run multiple times on retry. Make them idempotent (especially payment processing).
6. **DB connection** - Hangfire uses its own MySQL DB or schema. Keep `hangfire_*` tables in a separate database, not mixed with module data.
7. **Dashboard access** - production must require admin role. NEVER expose `/hangfire` publicly.

## Job queues by priority
- `critical` - Period close, GST IRN registration, payment processing (paid more workers)
- `default` - Most jobs
- `low` - Reports, exports, data archival

## ULP companion docs
- Schedule examples: `docs/ULP_LLD_M17_v1.0_Accounts.docx` Section 8 (dunning), Section 5.4 (close)

