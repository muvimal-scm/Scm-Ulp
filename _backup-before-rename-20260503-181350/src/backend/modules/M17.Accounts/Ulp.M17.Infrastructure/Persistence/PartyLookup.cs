namespace Ulp.M17.Infrastructure.Persistence;

/// <summary>
/// Read-only projection over m1_party — used by AccountsService to resolve customer/vendor
/// names without taking a project dependency on the M1 module. Mapped as a keyless entity.
/// </summary>
public sealed class PartyLookup
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string LegalName { get; set; } = "";
}
