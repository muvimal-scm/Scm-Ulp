// =====================================================================
// ULP Migrations runner — Phase 1 skeleton.
// Once module DbContexts exist, this enumerates them and applies pending
// migrations. For now it is a placeholder that prints config and exits.
// Schema is currently applied via infra/scripts/init-db.{ps1,sh}.
// =====================================================================

Console.WriteLine("ULP Migrations runner");
Console.WriteLine("---------------------");

if (args.Length == 0 || args[0] is not ("--apply" or "--script"))
{
    Console.WriteLine("Usage: dotnet run --project Ulp.Migrations -- --apply");
    Console.WriteLine();
    Console.WriteLine("Phase 1 status: schema is applied via infra/scripts/init-db.ps1 (or .sh).");
    Console.WriteLine("Module-by-module migrations land as DbContexts are added.");
    return 0;
}

Console.WriteLine($"Mode: {args[0]} (no DbContexts registered yet)");
return 0;
