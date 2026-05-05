using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.M4.Application;
using Ulp.M4.Domain.Entities;

namespace Ulp.M4.Api;

public static class M4Endpoints
{
    public static IEndpointRouteBuilder MapM4Endpoints(this IEndpointRouteBuilder app)
    {
        var entries = app.MapGroup("/api/v1/m4/entries").WithTags("M4 · Entries").RequireAuthorization();
        entries.MapGet("/", async ([FromServices] ICustomsService svc,
            [FromQuery] AbiStatus? status, [FromQuery] bool? pgaHoldOnly,
            [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct) =>
            Results.Ok(await svc.ListEntriesAsync(new EntryListQuery(status, pgaHoldOnly, page ?? 1, pageSize ?? 50), ct)));
        entries.MapGet("/{id:long}", async (long id, [FromServices] ICustomsService svc, CancellationToken ct) =>
        {
            var d = await svc.GetEntryAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        var bonds = app.MapGroup("/api/v1/m4/bonds").WithTags("M4 · Bonds").RequireAuthorization();
        bonds.MapGet("/", async ([FromServices] ICustomsService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListBondsAsync(ct)));

        var atms = app.MapGroup("/api/v1/m4/atm").WithTags("M4 · Authority to Make Entry").RequireAuthorization();
        atms.MapGet("/", async ([FromServices] ICustomsService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAtmAsync(ct)));

        var ros = app.MapGroup("/api/v1/m4/release-orders").WithTags("M4 · Release Orders").RequireAuthorization();
        ros.MapGet("/", async ([FromServices] ICustomsService svc, [FromQuery] long? entryId, CancellationToken ct) =>
            Results.Ok(await svc.ListReleaseOrdersAsync(entryId, ct)));

        var isfs = app.MapGroup("/api/v1/m4/isf").WithTags("M4 · ISF").RequireAuthorization();
        isfs.MapGet("/", async ([FromServices] ICustomsService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListIsfAsync(ct)));

        var pga = app.MapGroup("/api/v1/m4/pga-holds").WithTags("M4 · PGA Holds").RequireAuthorization();
        pga.MapGet("/", async ([FromServices] ICustomsService svc, [FromQuery] bool? activeOnly, CancellationToken ct) =>
            Results.Ok(await svc.ListPgaHoldsAsync(activeOnly ?? true, ct)));

        var holdExams = app.MapGroup("/api/v1/m4/hold-exams").WithTags("M4 · Customs Hold/Exam").RequireAuthorization();
        holdExams.MapGet("/", async ([FromServices] ICustomsService svc, [FromQuery] bool? openOnly, CancellationToken ct) =>
            Results.Ok(await svc.ListHoldExamsAsync(openOnly ?? true, ct)));

        var inBond = app.MapGroup("/api/v1/m4/in-bond").WithTags("M4 · In-Bond Moves").RequireAuthorization();
        inBond.MapGet("/", async ([FromServices] ICustomsService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListInBondMovesAsync(ct)));

        var abi = app.MapGroup("/api/v1/m4/abi-messages").WithTags("M4 · ABI Messages").RequireAuthorization();
        abi.MapGet("/", async ([FromServices] ICustomsService svc, [FromQuery] long? entryId, [FromQuery] int? max, CancellationToken ct) =>
            Results.Ok(await svc.ListAbiMessagesAsync(entryId, max ?? 200, ct)));

        return app;
    }
}
