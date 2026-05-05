using NodaTime;
using Ulp.Core.Domain.Entities;
using Ulp.Core.Domain.ValueObjects;

namespace Ulp.MasterData.Domain.Entities;

/// <summary>
/// Bank master. Per ULP_LLD_M1_v2.0_MasterData.docx Â§8.1.
/// </summary>
public sealed class Bank
{
    public long Id { get; set; }
    public string? Bic { get; set; }
    public string CountryCode { get; set; } = "";
    public string Name { get; set; } = "";
    public string? ShortName { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Bank branch â€” country-specific (IFSC for IN, ABA for US).
/// Per ULP_LLD_M1_v2.0_MasterData.docx Â§8.1.
/// </summary>
public sealed class BankBranch
{
    public long Id { get; set; }
    public long BankId { get; set; }
    public string CountryCode { get; set; } = "";
    public string BranchCode { get; set; } = "";       // IFSC | ABA
    public string? BranchName { get; set; }
    public string? City { get; set; }
    public string? StateCode { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Tenant's own / customer / vendor bank account.
/// Per ULP_LLD_M1_v2.0_MasterData.docx Â§8.1.
/// </summary>
public sealed class BankAccount : IEntity, ITenantScoped
{
    public long Id { get; set; }
    public TenantId TenantId { get; set; }
    public CountryCode CountryCode { get; set; }
    public long? PartyId { get; set; }
    public long BankBranchId { get; set; }
    public string AccountNumber { get; set; } = "";
    public string AccountHolder { get; set; } = "";
    public string Currency { get; set; } = "";
    public BankAccountType AccountType { get; set; } = BankAccountType.Current;
    public bool IsActive { get; set; } = true;
    public Instant CreatedAt { get; set; }
    public Instant ModifiedAt { get; set; }
}

public enum BankAccountType
{
    Savings,
    Current,
    Od,
    Loan,
    Other,
}
