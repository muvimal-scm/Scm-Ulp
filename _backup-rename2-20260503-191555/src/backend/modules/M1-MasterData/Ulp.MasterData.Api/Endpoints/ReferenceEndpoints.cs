using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.MasterData.Application.Reference;

namespace Ulp.MasterData.Api.Endpoints;

/// <summary>
/// Read-only endpoints for reference data â€” countries, states, currencies,
/// units of measure, ports, holidays. Anonymous-allowed in dev (typeahead
/// dropdowns); in production these may need RequireAuthorization.
/// </summary>
public static class ReferenceEndpoints
{
    public static IEndpointRouteBuilder MapReferenceEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/master-data/reference").WithTags("M1 Â· Reference");

        g.MapGet("/countries", async ([FromServices] IReferenceQueries q, [FromQuery] bool supportedOnly, CancellationToken ct)
            => Results.Ok(await q.ListCountriesAsync(supportedOnly, ct)));

        g.MapGet("/countries/{code}/states", async ([FromServices] IReferenceQueries q, string code, CancellationToken ct)
            => Results.Ok(await q.ListStatesAsync(code, ct)));

        g.MapGet("/currencies", async ([FromServices] IReferenceQueries q, [FromQuery] bool activeOnly, CancellationToken ct)
            => Results.Ok(await q.ListCurrenciesAsync(activeOnly, ct)));

        g.MapGet("/uoms", async ([FromServices] IReferenceQueries q, [FromQuery] string? category, CancellationToken ct)
            => Results.Ok(await q.ListUomsAsync(category, ct)));

        g.MapGet("/ports", async ([FromServices] IReferenceQueries q, [FromQuery] string? countryCode, [FromQuery] string? portType, CancellationToken ct)
            => Results.Ok(await q.ListPortsAsync(countryCode, portType, ct)));

        g.MapGet("/holidays", async ([FromServices] IReferenceQueries q, [FromQuery] string countryCode, [FromQuery] string? stateCode, [FromQuery] int? year, CancellationToken ct)
            => Results.Ok(await q.ListHolidaysAsync(countryCode, stateCode, year ?? DateTime.UtcNow.Year, ct)));

        return app;
    }
}
