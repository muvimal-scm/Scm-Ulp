using System.Reflection;
using MySqlConnector;             // pulled in transitively by Pomelo.EntityFrameworkCore.MySql
using Testcontainers.MySql;
using Xunit;

namespace Ulp.Integration.Tests.Fixtures;

/// <summary>
/// xUnit collection fixture: spins up one MySQL 8 container for the whole
/// test run, applies every SQL migration file under <c>db/</c> in the same
/// order init-db.ps1 uses, and exposes a connection string for tests.
///
/// Why a single shared container: starting MySQL takes 15–30s; per-test
/// containers would make the suite unusably slow. Each test seeds and cleans
/// only the rows it needs.
/// </summary>
public sealed class MySqlFixture : IAsyncLifetime
{
    private MySqlContainer? _container;

    public string ConnectionString => _container?.GetConnectionString()
        ?? throw new InvalidOperationException("Container not initialized");

    public async Task InitializeAsync()
    {
        _container = new MySqlBuilder()
            .WithImage("mysql:8.0")
            .WithDatabase("ulp_dev")
            .WithUsername("root")
            .WithPassword("test_password")
            .WithCommand(
                "--default-authentication-plugin=mysql_native_password",
                "--character-set-server=utf8mb4",
                "--collation-server=utf8mb4_0900_ai_ci",
                "--sql-mode=STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO",
                "--default-time-zone=+00:00")
            .Build();

        await _container.StartAsync();
        await ApplyMigrationsAsync();
    }

    public async Task DisposeAsync()
    {
        if (_container is not null) await _container.DisposeAsync();
    }

    private async Task ApplyMigrationsAsync()
    {
        var repoRoot = FindRepoRoot();
        var dbDir    = Path.Combine(repoRoot, "db");

        // Order matches infra/scripts/init-db.ps1. Keeping it in code (rather
        // than parsing the .ps1) means a missing migration here shows up as a
        // test failure, not silently skipped.
        var orderedFiles = new[]
        {
            "master-data/01-master-data-tables.sql",
            "master-data/02-master-data-fixtures.sql",
            "vendor-management/01-vendor-management-tables.sql",
            "rbac/01-rbac-tables.sql",
            "rbac/02-rbac-fixtures.sql",
            "document-management/01-document-management-tables.sql",
            "notifications/01-notifications-tables.sql",
            "notifications/02-notifications-fixtures.sql",
            "pricing-quotation/01-pricing-quotation-tables.sql",
            "document-generation/01-document-generation-tables.sql",
            "document-generation/02-document-generation-templates-scm-m1.sql",
            "freight-forwarding/01-freight-forwarding-tables.sql",
            "freight-forwarding/02-freight-forwarding-memo.sql",
            "freight-forwarding/03-freight-forwarding-watchlist.sql",
            "freight-forwarding/04-freight-forwarding-reminders-holds.sql",
            "sales/01-sales-tables.sql",
            "procurement/01-procurement-tables.sql",
            "last-mile/01-last-mile-tables.sql",
            "accounting/01-accounting-tables.sql",
            "accounting/02-accounting-fixtures.sql",
            "customs/01-customs-tables.sql",
            "customs/02-customs-fixtures.sql",
            "accounting-ext/01-accounting-finish.sql",
            "accounting-ext/02-accounting-finish-fixtures.sql",
            "trucking/01-trucking-tables.sql",
            "trucking/02-trucking-fixtures.sql",
            "dev-fixtures/01-dev-fixtures.sql",
            // CP13 v2 deltas — must run before any seed using new columns
            "freight-forwarding/13-cp13-v2-deltas.sql",
            // CP17 import-flow demo seed — uses CP13 trade_direction + invoice.shipment_id
            "dev-fixtures/02-import-flow-demo.sql",
        };

        await using var conn = new MySqlConnection(ConnectionString + ";AllowUserVariables=true");
        await conn.OpenAsync();

        foreach (var rel in orderedFiles)
        {
            var path = Path.Combine(dbDir, rel.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(path))
            {
                // Some Phase-1 files may not exist depending on branch; skip
                // gracefully instead of failing the whole run.
                continue;
            }
            var sql = await File.ReadAllTextAsync(path);
            // MySqlCommand accepts multiple statements when the connection
            // string allows AllowUserVariables (set above). Splitting on ';'
            // would break stored-procedure DELIMITER blocks; let the driver
            // handle it.
            await using var cmd = new MySqlCommand(sql, conn);
            cmd.CommandTimeout = 120;
            try
            {
                await cmd.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(
                    $"Migration failed: {rel}\n  {ex.Message}", ex);
            }
        }
    }

    /// <summary>
    /// Walks up from the test assembly location to find the repo root —
    /// the directory that contains a <c>db/</c> subfolder.
    /// </summary>
    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!);
        while (dir is not null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "db"))) return dir.FullName;
            dir = dir.Parent;
        }
        throw new InvalidOperationException("Could not locate repo root (no parent dir contains 'db/').");
    }
}

[CollectionDefinition(nameof(MySqlCollection))]
public sealed class MySqlCollection : ICollectionFixture<MySqlFixture> { }
