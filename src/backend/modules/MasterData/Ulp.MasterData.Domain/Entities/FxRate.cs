using NodaTime;

namespace Ulp.MasterData.Domain.Entities;

/// <summary>
/// FX rate. Per ULP_LLD_M1_v2.0_MasterData.docx Â§7.
/// Tenant-scoped because each tenant configures its preferred source
/// (RBI for IN, Federal Reserve for US, OXR/ECB fallback).
/// </summary>
public sealed class FxRate
{
    public long Id { get; set; }
    public int TenantId { get; set; }
    public string BaseCurrency { get; set; } = "";
    public string QuoteCurrency { get; set; } = "";
    public decimal Rate { get; set; }
    public LocalDate RateDate { get; set; }
    public FxRateType RateType { get; set; }
    public string Source { get; set; } = "";          // "RBI" | "FED" | "OXR" | "ECB"
    public Instant FetchedAt { get; set; }
}

public enum FxRateType
{
    Spot,
    Forward,
    AverageMonthly,
    PeriodEnd,
}
