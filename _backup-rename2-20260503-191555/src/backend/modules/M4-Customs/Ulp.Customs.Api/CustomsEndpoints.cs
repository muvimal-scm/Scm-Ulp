using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.Customs.Application;
using Ulp.Customs.Domain.Entities;

namespace Ulp.Customs.Api;

public static class CustomsEndpoints
{
    public static IEndpointRouteBuilder MapCustomsEndpoints(this IEndpointRouteBuilder app)
    {
        var entries = app.MapGroup("/api/v1/customs/entries").WithTags("M4 Â· Entries").RequireAuthorization();
        entries.MapGet("/", async ([FromServices] ICustomsService svc,
            [FromQuery] AbiStatus? status, [FromQuery] bool? pgaHoldOnly,
            [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct) =>
            Results.Ok(await svc.ListEntriesAsync(new EntryListQuery(status, pgaHoldOnly, page ?? 1, pageSize ?? 50), ct)));
        entries.MapGet("/{id:long}", async (long id, [FromServices] ICustomsService svc, CancellationToken ct) =>
        {
            var d = await svc.GetEntryAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        var bonds = app.MapGroup("/api/v1/customs/bonds").WithTags("M4 Â· Bonds").RequireAuthorization();
        bonds.MapGet("/", async ([FromServices] ICustomsService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListBondsAsync(ct)));

        var atms = app.MapGroup("/api/v1/customs/atm").WithTags("M4 Â· Authority to Make Entry").RequireAuthorization();
        atms.MapGet("/", async ([FromServices] ICustomsService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAtmAsync(ct)));

        var ros = app.MapGroup("/api/v1/customs/release-orders").WithTags("M4 Â· Release Orders").RequireAuthorization();
        ros.MapGet("/", async ([FromServices] ICustomsService svc, [FromQuery] long? entryId, CancellationToken ct) =>
            Results.Ok(await svc.ListReleaseOrdersAsync(entryId, ct)));

        var isfs = app.MapGroup("/api/v1/customs/isf").WithTags("M4 Â· ISF").RequireAuthorization();
        isfs.MapGet("/", async ([FromServices] ICustomsService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListIsfAsync(ct)));

        var pga = app.MapGroup("/api/v1/customs/pga-holds").WithTags("M4 Â· PGA Holds").RequireAuthorization();
        pga.MapGet("/", async ([FromServices] ICustomsService svc, [FromQuery] bool? activeOnly, CancellationToken ct) =>
            Results.Ok(await svc.ListPgaHoldsAsync(activeOnly ?? true, ct)));

        var holdExams = app.MapGroup("/api/v1/customs/hold-exams").WithTags("M4 Â· Customs Hold/Exam").RequireAuthorization();
        holdExams.MapGet("/", async ([FromServices] ICustomsService svc, [FromQuery] bool? openOnly, CancellationToken ct) =>
            Results.Ok(await svc.ListHoldExamsAsync(openOnly ?? true, ct)));

        var inBond = app.MapGroup("/api/v1/customs/in-bond").WithTags("M4 Â· In-Bond Moves").RequireAuthorization();
        inBond.MapGet("/", async ([FromServices] ICustomsService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListInBondMovesAsync(ct)));

        var abi = app.MapGroup("/api/v1/customs/abi-messages").WithTags("M4 Â· ABI Messages").RequireAuthorization();
        abi.MapGet("/", async ([FromServices] ICustomsService svc, [FromQuery] long? entryId, [FromQuery] int? max, CancellationToken ct) =>
            Results.Ok(await svc.ListAbiMessagesAsync(entryId, max ?? 200, ct)));

        return app;
    }
}
