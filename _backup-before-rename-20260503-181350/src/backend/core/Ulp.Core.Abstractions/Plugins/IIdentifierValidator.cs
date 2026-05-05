namespace Ulp.Core.Abstractions.Plugins;

/// <summary>
/// Country-specific identifier validator. One implementation per ID type
/// (PAN, GSTIN, IFSC, IEC for IN; EIN, SSN, ITIN, ABA for US).
/// Validators are registered as multi-instance services; the right one is
/// picked by <see cref="IdKind"/>.
/// </summary>
public interface IIdentifierValidator
{
    string IdKind { get; }              // "PAN" | "GSTIN" | "EIN" | "SSN" | "ABA" | ...
    string CountryCode { get; }         // "IN" | "US"
    bool IsValid(string value);
    string Format(string value);        // canonical format (uppercase, spacing, etc.)
}
