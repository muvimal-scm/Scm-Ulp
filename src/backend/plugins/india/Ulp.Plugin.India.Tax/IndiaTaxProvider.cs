using Ulp.Core.Abstractions.Plugins;
using Ulp.Core.Domain.ValueObjects;

namespace Ulp.Plugin.India.Tax;

/// <summary>
/// India GST tax provider — implements ITaxProvider per sealed M17 LLD §12.2.
///
/// Computation rules:
///   Intra-state supply  → CGST + SGST (each = half of total rate, typically 9% + 9% = 18%)
///   Inter-state supply  → IGST (full rate, typically 18%)
///   Imports             → IGST on assessable value + customs duties (not handled here)
///   Exports             → Zero-rated (with refund or LUT)
///
/// Phase-1 honesty flag: rate lookup is hardcoded to a small HSN table for the demo.
/// Production lookup will hit m17in_gst_rate (already seeded with 7 logistics SACs).
/// State determination uses the StateCode parameter from TaxRequest; missing state
/// defaults to inter-state (IGST) so the demo works for cross-state customer/supplier pairs.
/// </summary>
public sealed class IndiaTaxProvider : ITaxProvider
{
    // Demo HSN → total rate map. Production reads from m17in_gst_rate.
    private static readonly Dictionary<string, decimal> RateMap = new()
    {
        ["996511"] =  5m, // Road transport of goods
        ["996521"] =  5m, // Coastal & transoceanic water transport (FCL)
        ["996531"] = 18m, // Air transport of goods
        ["996713"] = 18m, // Customs house agent services
        ["996721"] = 18m, // Cargo handling — port and airport
        ["996791"] = 18m, // Freight forwarding services
        ["996799"] = 18m, // Other supporting transport services
    };

    // Demo supplier state — Maharashtra (27). Production reads from tenant master.
    private const string SupplierState = "27";

    public Task<TaxResult> ComputeAsync(TaxRequest req, CancellationToken ct)
    {
        var lines = new List<TaxLine>(req.Lines.Count);
        decimal totalTax = 0m;
        var recipientState = req.StateCode ?? "00"; // missing → treat as inter-state

        foreach (var line in req.Lines)
        {
            var rate = line.HsnCode is not null && RateMap.TryGetValue(line.HsnCode, out var r) ? r : 18m;
            var amount = line.LineAmount.Amount;
            var currency = line.LineAmount.Currency;

            if (recipientState == SupplierState)
            {
                // Intra-state: CGST + SGST (each = rate/2)
                var half = rate / 2m;
                var halfTax = amount * half / 100m;
                lines.Add(new TaxLine($"CGST_{half}", half, new Money(halfTax, currency)));
                lines.Add(new TaxLine($"SGST_{half}", half, new Money(halfTax, currency)));
                totalTax += 2m * halfTax;
            }
            else
            {
                // Inter-state: IGST (full rate)
                var igst = amount * rate / 100m;
                lines.Add(new TaxLine($"IGST_{rate}", rate, new Money(igst, currency)));
                totalTax += igst;
            }
        }

        var result = new TaxResult(new Money(totalTax, req.Amount.Currency), lines, ProviderRef: "M17-IN-Plugin/v1.0");
        return Task.FromResult(result);
    }

    public Task<TaxFilingResult> FileReturnAsync(TaxFilingRequest req, CancellationToken ct)
    {
        // GSTR-1 / GSTR-3B preparation produces an output JSON; actual filing is via the
        // GSTN portal and is out of scope for Phase-1. Return a placeholder result.
        return Task.FromResult(new TaxFilingResult(
            FilingRef: $"GSTR-DRAFT-{req.Period}",
            Accepted:  false,
            Message:   "Phase-1: filing prep only; submission via GSTN portal is manual."));
    }

    public Task<bool> SupportsAsync(string country, CancellationToken ct) =>
        Task.FromResult(string.Equals(country, "IN", StringComparison.OrdinalIgnoreCase));
}
