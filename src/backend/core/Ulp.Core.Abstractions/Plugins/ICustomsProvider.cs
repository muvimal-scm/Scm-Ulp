namespace Ulp.Core.Abstractions.Plugins;

/// <summary>Customs filing. IN: ICEGATE BOE/SB/SCMTR/DGFT. US: CBP ABI/AES/ISF/PGA.</summary>
public interface ICustomsProvider
{
    Task<CustomsFilingResult> FileAsync(CustomsFilingRequest req, CancellationToken ct);
    Task<CustomsStatus> GetStatusAsync(string filingRef, CancellationToken ct);
    Task<bool> SupportsAsync(string country, CancellationToken ct);
}

public sealed record CustomsFilingRequest(
    string Country,
    string FilingType,         // IN: "BOE","SB","SCMTR_ARR"; US: "ENTRY_01","AES","ISF"
    string ShipmentId,
    IReadOnlyDictionary<string, string> Payload);

public sealed record CustomsFilingResult(string FilingRef, bool Accepted, string? Message);

public sealed record CustomsStatus(string FilingRef, string Status, IReadOnlyList<CustomsEvent> Events);

public sealed record CustomsEvent(string Code, string Message, NodaTime.Instant At);
