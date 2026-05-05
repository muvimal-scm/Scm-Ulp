---
name: us-transportation-eld-hos-ifta
description: ULP v2.0 US transportation compliance — ELD (Electronic Logging Device) integration, FMCSA HOS (Hours of Service) rules, IFTA fuel-tax filings, DOT carrier registration, CSA scoring. Use when implementing M13-US transportation flows. Implements the US side of M13's ICustomsProvider equivalent for transportation. Parallel to transportation-pod-gps for IN. Tightly regulated — non-compliance = fines + out-of-service orders.
---

# US Transportation — ELD / HOS / IFTA / DOT for ULP v2.0

## When this skill triggers
Implementing US-tenant fleet operations: driver hours tracking, ELD integration, IFTA fuel-tax aggregation/filing, DOT/FMCSA registration, carrier safety scoring. Module M13-US.

## Top 3 reference repos
1. **FMCSA — ELD Mandate technical specs** (https://www.fmcsa.dot.gov/hours-service/elds/) — Authoritative ELD spec; every certified ELD vendor publishes an API matching this.
2. **IFTA Inc. — Articles of Agreement + procedure manual** (https://www.iftach.org/) — IFTA tax filing rules + jurisdictional rates.
3. **CSA — Compliance, Safety, Accountability program** (https://csa.fmcsa.dot.gov/) — BASIC scoring methodology.

## ELD Mandate (FMCSA 49 CFR 395.20)
Required for most CMVs (commercial motor vehicles) since Dec 2017 (with phase-out of older AOBRDs by 2019). ULP integrates with ELD vendors via their APIs to:
- Pull real-time HOS records (on-duty / driving / off-duty / sleeper berth).
- Pull duty-status changes per driver per day.
- Post unassigned-driving alerts to dispatcher.
- Validate edits against FMCSA rules (no edit of driving time, only of duty status with annotation).

## HOS rules (Property-Carrying CMV — most common)

| Rule | Limit |
|---|---|
| Max driving hours per day | 11 hours after 10 consecutive hours off-duty |
| Max on-duty per day | 14 hours after 10 hours off (the "14-hour rule") |
| Mandatory 30-minute break | After 8 cumulative driving hours since last 30-min break |
| Max on-duty per 7 days | 60 hours OR per 8 days 70 hours (carrier choice) |
| 34-hour restart | 34 consecutive hours off-duty resets the 60/70-hour clock |
| Adverse driving conditions | +2 hours allowance |
| Short-haul exception | 150 air-mile radius, 14-hour limit, no ELD required (tracked manually) |
| Sleeper berth split | 7+3, 8+2, or 9+1 (the "split-sleeper provision") |
| Personal conveyance | Off-duty status while moving CMV personally; logged but not counted |

ULP receives HOS records from ELD vendors and validates against these rules; alerts when driver approaches limits.

## ICarrierProvider / transport plugin (US side)

```csharp
public interface IFleetComplianceProvider   // part of plugin pattern, country-scoped
{
    Task<HosStatus> GetCurrentHosAsync(string driverId, CancellationToken ct);
    Task<bool> CanAcceptTripAsync(string driverId, Trip trip, CancellationToken ct);
    Task IngestEldEventsAsync(IEnumerable<EldEvent> events, CancellationToken ct);
    Task<IftaQuarterReport> ComputeIftaAsync(int year, int quarter, CancellationToken ct);
    Task<bool> SupportsAsync(string country, CancellationToken ct);
}

public sealed class UsFleetComplianceProvider : IFleetComplianceProvider
{
    private readonly IEldClient _eld;            // vendor-agnostic interface
    private readonly IIftaEngine _ifta;
    private readonly IFmcsaClient _fmcsa;
    private readonly IClock _clock;

    public async Task<bool> CanAcceptTripAsync(string driverId, Trip trip, CancellationToken ct)
    {
        var hos = await GetCurrentHosAsync(driverId, ct);
        var estimatedDuration = EstimateTripDuration(trip);

        // Check 11-hour driving limit
        if (hos.DrivingHoursToday + estimatedDuration > TimeSpan.FromHours(11)) return false;

        // Check 14-hour on-duty limit
        if (hos.OnDutyHoursToday + estimatedDuration > TimeSpan.FromHours(14)) return false;

        // Check 60/70-hour rolling window
        var rollingWindow = (hos.CarrierUses60HourRule ? 7 : 8);
        var rollingHours  = hos.OnDutyHoursLast(rollingWindow);
        var maxHours      = hos.CarrierUses60HourRule ? 60 : 70;
        if (rollingHours + estimatedDuration > TimeSpan.FromHours(maxHours)) return false;

        // 30-minute break check
        if (hos.DrivingSinceLastBreak + estimatedDuration > TimeSpan.FromHours(8) &&
            hos.LastBreakDuration < TimeSpan.FromMinutes(30))
            return false; // requires break first

        return true;
    }

    public Task<bool> SupportsAsync(string country, CancellationToken ct)
        => Task.FromResult(country == "US");
}
```

## IFTA (International Fuel Tax Agreement)

US + Canadian provinces participate. Carriers operating across two or more jurisdictions report fuel use + miles per jurisdiction quarterly. Net tax is computed per jurisdiction.

ULP tracks per-vehicle:
- Miles per jurisdiction (from GPS / ELD)
- Fuel purchased per jurisdiction (from fuel-card integration or driver-entered receipts)

Then computes per-jurisdiction:
- Tax-paid gallons (from purchases)
- Taxable gallons (from miles ÷ MPG)
- Net tax owed (positive) or refund (negative)

```csharp
public sealed class IftaEngine : IIftaEngine
{
    public IftaQuarterReport Compute(IftaQuarterInput input)
    {
        var totalMiles = input.JurisdictionMiles.Values.Sum(m => m.Miles);
        var totalGallons = input.JurisdictionPurchases.Values.Sum(p => p.Gallons);
        var fleetMpg = totalMiles / totalGallons;

        var jurisdictionLines = new List<IftaLine>();
        foreach (var (juris, miles) in input.JurisdictionMiles)
        {
            var taxableGallons = miles.Miles / fleetMpg;
            var purchasedGallons = input.JurisdictionPurchases.GetValueOrDefault(juris)?.Gallons ?? 0m;
            var netGallons = taxableGallons - purchasedGallons;
            var rate = IftaJurisdictionRates[input.Quarter][juris];
            var net  = new Money(netGallons * rate, "USD");
            jurisdictionLines.Add(new IftaLine(juris, miles.Miles, taxableGallons, purchasedGallons, rate, net));
        }
        return new IftaQuarterReport(input.Year, input.Quarter, jurisdictionLines);
    }
}
```

Filing happens through state portals (each state's IFTA office). Most accept e-file. ULP generates the filing data; tenant submits via state portal in v2.0 (vendor partnership for direct filing is a future enhancement).

## DOT registration
- Tenants operating CMVs commercially must register with FMCSA and obtain a USDOT number.
- ULP captures USDOT, MC (motor carrier) number, and operating authority (for-hire vs private).
- Stored in `m13us_carrier` table.

## CSA BASIC scores (read-only for ULP)
Carriers with poor scores face increased inspections + potential out-of-service orders. CSA categories:
- Unsafe Driving
- Crash Indicator
- Hours-of-Service Compliance
- Vehicle Maintenance
- Controlled Substances / Alcohol
- Hazardous Materials Compliance
- Driver Fitness

ULP fetches BASIC scores via FMCSA SAFER API and surfaces them on a tenant dashboard. Doesn't manage scores directly but flags risk to dispatchers.

## ELD vendor integration
ULP supports a vendor-agnostic interface; concrete vendor adapters implement it. Common integrations: Geotab, Samsara, KeepTruckin (now Motive), Garmin, Omnitracs.

```csharp
public interface IEldClient
{
    Task<IReadOnlyList<EldDuty>> GetDutyStatusAsync(string driverId, DateRange range, CancellationToken ct);
    Task<IReadOnlyList<EldVehicle>> GetVehiclesAsync(CancellationToken ct);
    IAsyncEnumerable<EldEvent> StreamEventsAsync(CancellationToken ct);
}

// Per-tenant vendor configuration (DI keyed)
services.AddKeyedScoped<IEldClient, GeotabEldClient>("geotab");
services.AddKeyedScoped<IEldClient, SamsaraEldClient>("samsara");
services.AddKeyedScoped<IEldClient, MotiveEldClient>("motive");

services.AddScoped<IEldClient>(sp =>
{
    var tenant = sp.GetRequiredService<ITenantContext>();
    var vendor = ResolveEldVendorForTenant(tenant.TenantId);
    return sp.GetRequiredKeyedService<IEldClient>(vendor);
});
```

## DO and DON'T

| DO | DON'T |
|---|---|
| Block trip assignment if HOS would exceed limits | Don't trust drivers to self-monitor |
| Honor 30-min break rule precisely | Don't aggregate "any 30 min in last 8h" — must be continuous |
| Track 60/70-hour rolling window per driver per carrier choice | Don't hardcode 70; carriers can elect 60 |
| Use IANA tz for HOS calc — driver's home terminal TZ | Don't assume UTC for shift boundaries |
| Persist ELD events as immutable | Don't allow edits to driving time |
| Mask CDL number in logs (last 4 only) | Don't log full CDL |
| Pull IFTA mileage from ELD/GPS authoritative source | Don't accept driver-entered miles without ELD cross-check |
| Validate fuel purchases against vehicle/driver | Don't accept unmatched fuel records |

## Common pitfalls
- Confusing 11-hour driving with 14-hour on-duty; both apply simultaneously.
- Forgetting 34-hour restart resets the rolling window only if it includes two 1-5 AM home terminal periods (this rule was previously controversial; verify current FMCSA guidance).
- Short-haul exception drivers don't need ELD — but ULP should still track HOS via timeclocks.
- IFTA jurisdiction rates change quarterly — refresh from IFTA Inc. data feed.
- Personal conveyance miles count toward IFTA but not toward HOS driving time.
- ELD malfunctions: driver may use paper logs for up to 8 days while ELD is being repaired; ULP must accept paper-log fallback.

## See also
- `compliance-plugin-pattern` — for the plugin architecture.
- `transportation-pod-gps` — IN counterpart (PUC, FC, RC, GPS-VTS).
- `multi-region-tenant-context` — for tenant US-pinning.
- `nodatime-luxon-timezone` — HOS math depends on driver's home-terminal TZ.
- ULP_LLD_M13_v2.0_Transportation.docx §US plugin — full LLD reference.
