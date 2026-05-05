using Ulp.Core.Domain.ValueObjects;

namespace Ulp.Core.Abstractions.Plugins;

/// <summary>Bank file format + remittance. IN: NACH/IMPS/RTGS/UPI. US: NACHA ACH/Plaid/BAI2.</summary>
public interface IBankingProvider
{
    Task<RemittanceFile> GenerateRemittanceFileAsync(RemittanceBatch batch, CancellationToken ct);
    Task<BankReconciliationResult> ReconcileAsync(BankStatement statement, CancellationToken ct);
    Task<bool> SupportsAsync(string country, CancellationToken ct);
}

public sealed record RemittanceBatch(
    string Country,
    string BatchId,
    IReadOnlyList<RemittancePayment> Payments);

public sealed record RemittancePayment(
    string PayeeAccount,
    string PayeeRouting,
    Money Amount,
    string? Memo);

public sealed record RemittanceFile(string Format, byte[] Bytes, string Filename);

public sealed record BankStatement(string AccountNumber, byte[] FileBytes, string Format);

public sealed record BankReconciliationResult(int MatchedCount, int UnmatchedCount, IReadOnlyList<string> Notes);
