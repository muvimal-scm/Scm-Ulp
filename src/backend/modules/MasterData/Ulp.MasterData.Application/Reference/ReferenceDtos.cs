namespace Ulp.MasterData.Application.Reference;

/// <summary>Read-only reference data DTOs (country, state, currency, UoM, port, holiday).</summary>

public sealed record CountryDto(
    string Code, string Code3, short NumericCode, string Name,
    string? Region, string DefaultCurrency, string DefaultLocale,
    string DefaultTimeZone, bool IsSupported);

public sealed record StateOrProvinceDto(
    long Id, string CountryCode, string Code, string Name,
    bool IsSpecial, string? CapitalCity, string? TimeZone);

public sealed record CurrencyDto(
    string Code, short? NumericCode, string Name, string? Symbol,
    byte DecimalDigits, string? DefaultCountry, bool IsActive);

public sealed record UomDto(
    string Code, string Name, string Category,
    decimal? BaseFactor, string? BaseUomCode, bool IsActive);

public sealed record PortDto(
    long Id, string UnLocode, string CountryCode, string Name,
    string PortType, string? CbpScheduleD, bool IsActive);

public sealed record HolidayDto(
    long Id, string CountryCode, string? StateCode,
    string HolidayDate, string Name, bool IsObserved);
