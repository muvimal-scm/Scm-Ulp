using NodaTime;

namespace Ulp.MasterData.Domain.Entities;

/// <summary>
/// Country / state holiday calendar.
/// Per ULP_LLD_M1_v2.0_MasterData.docx Â§8.4.
/// Used by SLA, due-date computation, working-day calculations.
/// </summary>
public sealed class Holiday
{
    public long Id { get; set; }
    public string CountryCode { get; set; } = "";
    public string? StateCode { get; set; }       // null = country-wide
    public LocalDate HolidayDate { get; set; }
    public string Name { get; set; } = "";
    public bool IsObserved { get; set; } = true;
}
