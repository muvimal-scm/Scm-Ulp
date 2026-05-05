using NodaTime;
using Serilog;

// =====================================================================
// ULP Worker — Phase 1 skeleton. Hangfire + MassTransit wiring lands
// alongside the first module that needs background work (M27 Notifications).
// =====================================================================

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .Enrich.FromLogContext()
    .CreateBootstrapLogger();

try
{
    var builder = Host.CreateApplicationBuilder(args);

    builder.Services.AddSerilog((sp, lc) => lc
        .ReadFrom.Configuration(builder.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    builder.Services.AddSingleton<IClock>(SystemClock.Instance);

    var host = builder.Build();
    Log.Information("ULP Worker starting");
    host.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "ULP Worker failed to start");
    return 1;
}
finally
{
    Log.CloseAndFlush();
}

return 0;
