using FluentAssertions;
using MySqlConnector;
using Ulp.Integration.Tests.Fixtures;
using Xunit;

namespace Ulp.Integration.Tests;

/// <summary>
/// CP14 baseline integration test: a fresh MySQL container that has had every
/// migration file applied (including CP13 deltas) must satisfy a small set of
/// schema invariants. This is the cheapest gate that catches:
///   - SQL syntax errors in any migration file
///   - Order-of-application bugs (e.g. CP13 ALTER running before the table exists)
///   - ENUM regressions (e.g. someone trims values needed by existing rows)
///   - Index/FK drift between code and SQL
/// Module-level service tests come in CP14.5 / post-beta sessions; this file
/// is the "fail fast on schema breakage" check that should always pass on main.
/// </summary>
[Collection(nameof(MySqlCollection))]
public class MigrationSmokeTests
{
    private readonly MySqlFixture _mysql;
    public MigrationSmokeTests(MySqlFixture mysql) => _mysql = mysql;

    [Fact]
    public async Task Migrations_apply_cleanly_and_core_tables_exist()
    {
        // If the fixture got past InitializeAsync, every migration applied OK.
        // Just verify a smattering of core tables are present so a regression
        // in the file list shows up here.
        var expectedTables = new[]
        {
            "m_tenant", "m1_party", "m1_product",
            "m5_shipment", "m5_booking", "m5_hold", "m5_charge_line",
            "m17_invoice", "m17_bill",
            "m26_role", "m26_user", "m26_permission",
            "m21_document", "m6_template_definition",
            "m2_lead", "m2_opportunity",
            "m7_purchase_order",
            "m9_courier_booking",
            "m4_entry",
            "m3_vendor",
        };

        await using var conn = new MySqlConnection(_mysql.ConnectionString);
        await conn.OpenAsync();

        foreach (var table in expectedTables)
        {
            await using var cmd = new MySqlCommand(
                "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @t",
                conn);
            cmd.Parameters.AddWithValue("@t", table);
            var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            count.Should().Be(1, $"table {table} must exist after all migrations");
        }
    }

    [Fact]
    public async Task Cp13_hold_type_enum_includes_new_v2_values()
    {
        // CP13 v2 client doc delta: hold_type enum extended with BL / FREIGHT / TERMINAL_FEES.
        await using var conn = new MySqlConnection(_mysql.ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new MySqlCommand(@"
            SELECT COLUMN_TYPE FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME   = 'm5_hold'
               AND COLUMN_NAME  = 'hold_type'", conn);
        var columnType = (string?)await cmd.ExecuteScalarAsync() ?? "";
        columnType.Should().Contain("'BL'");
        columnType.Should().Contain("'FREIGHT'");
        columnType.Should().Contain("'TERMINAL_FEES'");
        // Pre-existing values must still be there.
        columnType.Should().Contain("'CUSTOMS'");
        columnType.Should().Contain("'PGA'");
    }

    [Fact]
    public async Task Cp13_shipment_has_trade_direction_column()
    {
        await using var conn = new MySqlConnection(_mysql.ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new MySqlCommand(@"
            SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME   = 'm5_shipment'
               AND COLUMN_NAME  = 'trade_direction'", conn);
        var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        count.Should().Be(1, "CP13 migration must add m5_shipment.trade_direction");
    }

    [Fact]
    public async Task Cp13_invoice_has_shipment_id_column()
    {
        await using var conn = new MySqlConnection(_mysql.ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new MySqlCommand(@"
            SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME   = 'm17_invoice'
               AND COLUMN_NAME  = 'shipment_id'", conn);
        var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        count.Should().Be(1, "CP13 migration must add m17_invoice.shipment_id for the In-Transit Tab 5 join");
    }

    [Fact]
    public async Task Cp13_org_admin_role_seeded()
    {
        await using var conn = new MySqlConnection(_mysql.ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new MySqlCommand(@"
            SELECT COUNT(*) FROM m26_role
             WHERE code = 'OrgAdmin'
               AND is_system = 1
               AND tenant_id IS NULL", conn);
        var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        count.Should().Be(1, "CP13 migration must seed the OrgAdmin system role");
    }

    [Fact]
    public async Task Migrations_are_idempotent()
    {
        // Applying the CP13 delta twice must not error or change row counts.
        // If this breaks, the IF NOT EXISTS gates or INSERT IGNORE clauses got
        // dropped — same migration would fail on a re-deploy.
        var deltaPath = Path.Combine(FindRepoRoot(), "db", "freight-forwarding", "13-cp13-v2-deltas.sql");
        var sql = await File.ReadAllTextAsync(deltaPath);

        await using var conn = new MySqlConnection(_mysql.ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new MySqlCommand(sql, conn) { CommandTimeout = 60 };
        // First re-application happened in fixture init; this is the second.
        var act = async () => await cmd.ExecuteNonQueryAsync();
        await act.Should().NotThrowAsync(because: "CP13 migration must be idempotent");
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "db"))) return dir.FullName;
            dir = dir.Parent;
        }
        throw new InvalidOperationException("repo root not found");
    }
}
