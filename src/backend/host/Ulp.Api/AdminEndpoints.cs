using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using MySqlConnector;
using System.Security.Claims;

namespace Ulp.Api;

/// <summary>
/// CP17 admin operations — bound at /api/v1/admin and gated to platform-admin role.
///
/// Endpoints:
///   POST /api/v1/admin/factory-reset
///     Wipes the CP17 demo rows (id 9000–9099) across every demo table and
///     re-applies the demo seed SQL. Per-tenant data scope: only rows owned
///     by tenant_id = 1001 (the IN demo tenant) are touched. Real customer
///     data outside the 9000+ ID range is left alone.
///
///   GET /api/v1/admin/db-stats
///     Counts of major rows per tenant for a quick dashboard snapshot.
/// </summary>
public static class AdminEndpoints
{
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        // CP22 — admin endpoints are auth-sensitive (factory-reset is the
        // bluntest possible button). Cap to 10 calls/min/IP via the named
        // rate-limit policy registered in Program.cs.
        var g = app.MapGroup("/api/v1/admin")
                   .WithTags("Admin")
                   .RequireAuthorization()
                   .RequireRateLimiting("auth-sensitive");

        g.MapPost("/factory-reset", async (
            HttpContext httpCtx,
            [FromServices] IConfiguration cfg,
            [FromServices] IWebHostEnvironment env,
            CancellationToken ct) =>
        {
            // Only platform admins can hit this. The dev realm seeds these in
            // the `permissions` claim; non-admin tokens get 403 here.
            if (!IsPlatformAdmin(httpCtx.User))
            {
                return Results.Forbid();
            }

            // Extra guardrail: refuse on Production environment regardless of auth.
            // Beta runs on Development/Staging only; if someone deploys this
            // endpoint to a real prod environment, fail loud.
            if (env.IsProduction())
            {
                return Results.BadRequest(new
                {
                    error = "factory-reset is disabled in Production. Enable a different endpoint or run the seed SQL manually."
                });
            }

            var connStr = cfg.GetConnectionString("primary-in-central")
                ?? throw new InvalidOperationException("missing connection string primary-in-central");

            await using var conn = new MySqlConnection(connStr);
            await conn.OpenAsync(ct);

            // Wipe demo rows (9000+) across every demo-touching table. Order
            // matters: child rows first, parent last, to satisfy FKs.
            var wipeSql = @"
                DELETE FROM m17_invoice         WHERE id BETWEEN 9000 AND 9099 AND tenant_id = 1001;
                DELETE FROM m5_charge_line      WHERE id BETWEEN 9000 AND 9099 AND tenant_id = 1001;
                DELETE FROM m5_milestone        WHERE id BETWEEN 9000 AND 9099 AND tenant_id = 1001;
                DELETE FROM m5_container        WHERE id BETWEEN 9000 AND 9099 AND tenant_id = 1001;
                DELETE FROM m5_shipment_memo    WHERE id BETWEEN 9000 AND 9099 AND tenant_id = 1001;
                DELETE FROM m5_shipment         WHERE id BETWEEN 9000 AND 9099 AND tenant_id = 1001;
                DELETE FROM m5_booking          WHERE id BETWEEN 9000 AND 9099 AND tenant_id = 1001;
                DELETE FROM m1_product          WHERE id BETWEEN 9000 AND 9099 AND tenant_id = 1001;
                DELETE FROM m1_party            WHERE id BETWEEN 9000 AND 9099 AND tenant_id = 1001;
                DELETE FROM m2_lead             WHERE id BETWEEN 9000 AND 9099 AND tenant_id = 1001;
                DELETE FROM m2_opportunity      WHERE id BETWEEN 9000 AND 9099 AND tenant_id = 1001;";

            int wiped = 0;
            await using (var cmd = new MySqlCommand(wipeSql, conn) { CommandTimeout = 60 })
            {
                wiped = await cmd.ExecuteNonQueryAsync(ct);
            }

            // Re-apply the import-flow demo seed.
            var seedPath = ResolveSeedPath();
            var seedSql  = await File.ReadAllTextAsync(seedPath, ct);
            int reseeded = 0;
            await using (var cmd = new MySqlCommand(seedSql, conn) { CommandTimeout = 60 })
            {
                reseeded = await cmd.ExecuteNonQueryAsync(ct);
            }

            return Results.Ok(new
            {
                ok = true,
                wipedRows = wiped,
                reseededRows = reseeded,
                message = "Demo data reset. Tenant 1001 demo rows (9000-9099) wiped and re-seeded."
            });
        });

        g.MapGet("/db-stats", async (
            HttpContext httpCtx,
            [FromServices] IConfiguration cfg,
            CancellationToken ct) =>
        {
            if (!IsPlatformAdmin(httpCtx.User)) return Results.Forbid();

            var connStr = cfg.GetConnectionString("primary-in-central")
                ?? throw new InvalidOperationException("missing connection string primary-in-central");

            var counts = new Dictionary<string, long>();
            await using var conn = new MySqlConnection(connStr);
            await conn.OpenAsync(ct);
            foreach (var table in new[]
            {
                "m_tenant", "m1_party", "m1_product", "m2_lead", "m2_opportunity",
                "m5_booking", "m5_shipment", "m5_charge_line", "m17_invoice",
                "m17_bill", "m21_document", "m26_user", "m26_role"
            })
            {
                await using var cmd = new MySqlCommand($"SELECT COUNT(*) FROM {table}", conn);
                counts[table] = Convert.ToInt64(await cmd.ExecuteScalarAsync(ct) ?? 0L);
            }
            return Results.Ok(counts);
        });

        return app;
    }

    /// <summary>True if the JWT carries `permissions` containing "tenant.admin"
    /// or the user has the seeded PlatformAdmin role.</summary>
    private static bool IsPlatformAdmin(ClaimsPrincipal user)
    {
        // The dev realm puts permissions into a custom `permissions` claim.
        var perms = user.FindAll("permissions").Select(c => c.Value).ToList();
        if (perms.Any(p => p.Equals("tenant.admin", StringComparison.OrdinalIgnoreCase) ||
                            p.Equals("platform.admin", StringComparison.OrdinalIgnoreCase)))
            return true;

        // Fallback: check standard role claim.
        return user.IsInRole("PlatformAdmin") || user.IsInRole("OrgAdmin");
    }

    private static string ResolveSeedPath()
    {
        // Walk from the running API's content root up to the repo root (which
        // contains db/), then point to the demo seed file.
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "db", "dev-fixtures", "02-import-flow-demo.sql");
            if (File.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new FileNotFoundException("db/dev-fixtures/02-import-flow-demo.sql not found");
    }
}
