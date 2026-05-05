using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NodaTime;
using Ulp.M17.Application;
using Ulp.M17.Domain.Entities;

namespace Ulp.M17.Api;

/// <summary>
/// Maps the 18 endpoints from sealed LLD §11 plus chart-of-accounts read endpoints.
/// </summary>
public static class M17Endpoints
{
    public static IEndpointRouteBuilder MapM17Endpoints(this IEndpointRouteBuilder app)
    {
        MapAccountEndpoints(app);
        MapPeriodEndpoints(app);
        MapInvoiceEndpoints(app);
        MapBillEndpoints(app);
        MapReceiptEndpoints(app);
        MapPaymentEndpoints(app);
        MapJournalEndpoints(app);
        MapReportEndpoints(app);
        return app;
    }

    private static void MapAccountEndpoints(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m17/accounts").WithTags("M17 · Chart of Accounts").RequireAuthorization();

        g.MapGet("/", async ([FromServices] IAccountsService svc,
            [FromQuery] AccountClass? accountClass, [FromQuery] bool? isActive,
            [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct) =>
            Results.Ok(await svc.ListAccountsAsync(new AccountListQuery(accountClass, isActive, page ?? 1, pageSize ?? 200), ct)));

        g.MapGet("/{id:long}", async (long id, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            var a = await svc.GetAccountAsync(id, ct);
            return a is null ? Results.NotFound() : Results.Ok(a);
        });

        g.MapPost("/", async ([FromBody] CreateAccountRequest req, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/m17/accounts", await svc.CreateAccountAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });
    }

    private static void MapPeriodEndpoints(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m17/periods").WithTags("M17 · Periods").RequireAuthorization();

        g.MapGet("/", async ([FromServices] IAccountsService svc, [FromQuery] int? fiscalYear, CancellationToken ct) =>
            Results.Ok(await svc.ListPeriodsAsync(fiscalYear, ct)));

        g.MapGet("/{id:long}", async (long id, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            var p = await svc.GetPeriodAsync(id, ct);
            return p is null ? Results.NotFound() : Results.Ok(p);
        });

        g.MapPost("/{id:long}/close", async (long id, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ClosePeriodAsync(id, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/reopen", async (long id, [FromBody] ReopenPeriodRequest req,
            [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.ReopenPeriodAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });
    }

    private static void MapInvoiceEndpoints(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m17/invoices").WithTags("M17 · AR Invoices").RequireAuthorization();

        g.MapGet("/", async ([FromServices] IAccountsService svc,
            [FromQuery] long? customerPartyId, [FromQuery] InvoiceStatus? status,
            [FromQuery] string? fromDate, [FromQuery] string? toDate,
            [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct) =>
        {
            var q = new InvoiceListQuery(customerPartyId, status,
                ParseDate(fromDate), ParseDate(toDate), page ?? 1, pageSize ?? 50);
            return Results.Ok(await svc.ListInvoicesAsync(q, ct));
        });

        g.MapGet("/{id:long}", async (long id, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            var inv = await svc.GetInvoiceAsync(id, ct);
            return inv is null ? Results.NotFound() : Results.Ok(inv);
        });

        g.MapPost("/", async ([FromBody] CreateInvoiceRequest req, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/m17/invoices", await svc.CreateInvoiceAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/post", async (long id, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.PostInvoiceAsync(id, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/void", async (long id, [FromBody] VoidInvoiceRequest req,
            [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.VoidInvoiceAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });
    }

    private static void MapBillEndpoints(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m17/bills").WithTags("M17 · AP Bills").RequireAuthorization();

        g.MapGet("/", async ([FromServices] IAccountsService svc,
            [FromQuery] long? vendorPartyId, [FromQuery] BillStatus? status,
            [FromQuery] string? fromDate, [FromQuery] string? toDate,
            [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct) =>
        {
            var q = new BillListQuery(vendorPartyId, status,
                ParseDate(fromDate), ParseDate(toDate), page ?? 1, pageSize ?? 50);
            return Results.Ok(await svc.ListBillsAsync(q, ct));
        });

        g.MapGet("/{id:long}", async (long id, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            var b = await svc.GetBillAsync(id, ct);
            return b is null ? Results.NotFound() : Results.Ok(b);
        });

        g.MapPost("/", async ([FromBody] CreateBillRequest req, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/m17/bills", await svc.CreateBillAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/post", async (long id, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.PostBillAsync(id, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });
    }

    private static void MapReceiptEndpoints(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m17/receipts").WithTags("M17 · Receipts").RequireAuthorization();

        g.MapGet("/", async ([FromServices] IAccountsService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListReceiptsAsync(ct)));

        g.MapPost("/", async ([FromBody] CreateReceiptRequest req, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/m17/receipts", await svc.CreateReceiptAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        g.MapPost("/{id:long}/match", async (long id, [FromBody] MatchReceiptRequest req,
            [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.MatchReceiptAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });
    }

    private static void MapPaymentEndpoints(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m17/payments").WithTags("M17 · Payments").RequireAuthorization();

        g.MapGet("/", async ([FromServices] IAccountsService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListPaymentsAsync(ct)));

        g.MapPost("/", async ([FromBody] CreatePaymentRequest req, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/m17/payments", await svc.CreatePaymentAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });
    }

    private static void MapJournalEndpoints(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m17/journals").WithTags("M17 · Journals").RequireAuthorization();

        g.MapGet("/", async ([FromServices] IAccountsService svc,
            [FromQuery] long? periodId, [FromQuery] JournalType? type, [FromQuery] bool? isPosted,
            [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct) =>
        {
            var q = new JournalListQuery(periodId, type, isPosted, page ?? 1, pageSize ?? 50);
            return Results.Ok(await svc.ListJournalsAsync(q, ct));
        });

        g.MapPost("/", async ([FromBody] CreateJournalRequest req, [FromServices] IAccountsService svc, CancellationToken ct) =>
        {
            try   { return Results.Created("/api/v1/m17/journals", await svc.CreateJournalAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });
    }

    private static void MapReportEndpoints(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/m17/reports").WithTags("M17 · Reports").RequireAuthorization();

        g.MapGet("/trial-balance", async ([FromServices] IAccountsService svc, [FromQuery] long periodId, CancellationToken ct) =>
        {
            try   { return Results.Ok(await svc.TrialBalanceAsync(periodId, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        g.MapGet("/income-statement", async ([FromServices] IAccountsService svc,
            [FromQuery] long fromPeriodId, [FromQuery] long toPeriodId, CancellationToken ct) =>
            Results.Ok(await svc.IncomeStatementAsync(fromPeriodId, toPeriodId, ct)));

        g.MapGet("/balance-sheet", async ([FromServices] IAccountsService svc, [FromQuery] long asOfPeriodId, CancellationToken ct) =>
            Results.Ok(await svc.BalanceSheetAsync(asOfPeriodId, ct)));

        g.MapGet("/ar-aging", async ([FromServices] IAccountsService svc, [FromQuery] string? asOf, CancellationToken ct) =>
            Results.Ok(await svc.ArAgingAsync(ParseDate(asOf) ?? Today(), ct)));

        g.MapGet("/ap-aging", async ([FromServices] IAccountsService svc, [FromQuery] string? asOf, CancellationToken ct) =>
            Results.Ok(await svc.ApAgingAsync(ParseDate(asOf) ?? Today(), ct)));
    }

    private static LocalDate? ParseDate(string? s) =>
        string.IsNullOrEmpty(s) ? null : LocalDate.FromDateTime(DateTime.Parse(s));

    private static LocalDate Today() => LocalDate.FromDateTime(DateTime.UtcNow);
}
