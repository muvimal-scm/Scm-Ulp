namespace Ulp.M1.Application.Reference;

/// <summary>
/// Read-only reference queries. Reference data is universal (not tenant-scoped)
/// for country / state / currency / UoM / port; <see cref="ListHolidaysAsync"/>
/// also takes country/state filters.
/// </summary>
public interface IReferenceQueries
{
    Task<IReadOnlyList<CountryDto>> ListCountriesAsync(bool supportedOnly, CancellationToken ct);
    Task<IReadOnlyList<StateOrProvinceDto>> ListStatesAsync(string countryCode, CancellationToken ct);
    Task<IReadOnlyList<CurrencyDto>> ListCurrenciesAsync(bool activeOnly, CancellationToken ct);
    Task<IReadOnlyList<UomDto>> ListUomsAsync(string? category, CancellationToken ct);
    Task<IReadOnlyList<PortDto>> ListPortsAsync(string? countryCode, string? portType, CancellationToken ct);
    Task<IReadOnlyList<HolidayDto>> ListHolidaysAsync(string countryCode, string? stateCode, int year, CancellationToken ct);
}
