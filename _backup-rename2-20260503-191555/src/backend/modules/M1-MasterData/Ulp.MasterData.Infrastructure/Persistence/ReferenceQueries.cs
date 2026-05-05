using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.MasterData.Application.Reference;

namespace Ulp.MasterData.Infrastructure.Persistence;

internal sealed class ReferenceQueries(MasterDataDbContext db) : IReferenceQueries
{
    public async Task<IReadOnlyList<CountryDto>> ListCountriesAsync(bool supportedOnly, CancellationToken ct)
    {
        var q = db.Countries.AsNoTracking().AsQueryable();
        if (supportedOnly) q = q.Where(c => c.IsSupported);
        return await q.OrderBy(c => c.Name).Select(c => new CountryDto(
            c.Code, c.Code3, c.NumericCode, c.Name, c.Region,
            c.DefaultCurrency, c.DefaultLocale, c.DefaultTimeZone, c.IsSupported)).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<StateOrProvinceDto>> ListStatesAsync(string countryCode, CancellationToken ct) =>
        await db.StatesOrProvinces.AsNoTracking()
            .Where(s => s.CountryCode == countryCode)
            .OrderBy(s => s.Name)
            .Select(s => new StateOrProvinceDto(s.Id, s.CountryCode, s.Code, s.Name, s.IsSpecial, s.CapitalCity, s.TimeZone))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<CurrencyDto>> ListCurrenciesAsync(bool activeOnly, CancellationToken ct)
    {
        var q = db.Currencies.AsNoTracking().AsQueryable();
        if (activeOnly) q = q.Where(c => c.IsActive);
        return await q.OrderBy(c => c.Code).Select(c => new CurrencyDto(
            c.Code, c.NumericCode, c.Name, c.Symbol, c.DecimalDigits, c.DefaultCountry, c.IsActive)).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<UomDto>> ListUomsAsync(string? category, CancellationToken ct)
    {
        var q = db.UnitsOfMeasure.AsNoTracking().Where(u => u.IsActive);
        if (!string.IsNullOrEmpty(category))
        {
            var enumVal = Enum.Parse<Domain.Entities.UomCategory>(category, ignoreCase: true);
            q = q.Where(u => u.Category == enumVal);
        }
        return await q.OrderBy(u => u.Category).ThenBy(u => u.Code)
            .Select(u => new UomDto(u.Code, u.Name, u.Category.ToString(), u.BaseFactor, u.BaseUomCode, u.IsActive))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<PortDto>> ListPortsAsync(string? countryCode, string? portType, CancellationToken ct)
    {
        var q = db.Ports.AsNoTracking().Where(p => p.IsActive);
        if (!string.IsNullOrEmpty(countryCode)) q = q.Where(p => p.CountryCode == countryCode);
        if (!string.IsNullOrEmpty(portType))
        {
            var enumVal = Enum.Parse<Domain.Entities.PortType>(portType, ignoreCase: true);
            q = q.Where(p => p.PortType == enumVal);
        }
        return await q.OrderBy(p => p.Name)
            .Select(p => new PortDto(p.Id, p.UnLocode, p.CountryCode, p.Name, p.PortType.ToString(), p.CbpScheduleD, p.IsActive))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<HolidayDto>> ListHolidaysAsync(string countryCode, string? stateCode, int year, CancellationToken ct)
    {
        var start = new LocalDate(year, 1, 1);
        var end   = new LocalDate(year, 12, 31);
        var q = db.Holidays.AsNoTracking()
            .Where(h => h.CountryCode == countryCode && h.HolidayDate >= start && h.HolidayDate <= end && h.IsObserved);
        if (!string.IsNullOrEmpty(stateCode))
            q = q.Where(h => h.StateCode == null || h.StateCode == stateCode);
        else
            q = q.Where(h => h.StateCode == null);
        return await q.OrderBy(h => h.HolidayDate)
            .Select(h => new HolidayDto(h.Id, h.CountryCode, h.StateCode, h.HolidayDate.ToString(), h.Name, h.IsObserved))
            .ToListAsync(ct);
    }
}
