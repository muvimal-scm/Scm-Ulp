using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Ulp.Accounting.Application;
using Ulp.Accounting.Domain.Entities;

namespace Ulp.Accounting.Api;

/// <summary>M17 finish endpoints â€” closes SCM client Milestone 3 gaps.</summary>
public static class AccountingExtEndpoints
{
    public static IEndpointRouteBuilder MapAccountingExtEndpoints(this IEndpointRouteBuilder app)
    {
        var sl = app.MapGroup("/api/v1/accounting/settlement-links").WithTags("M17 Â· Settlement").RequireAuthorization();
        sl.MapGet("/", async ([FromServices] IFinanceExtService svc, [FromQuery] SettlementLinkStatus? status, CancellationToken ct) =>
            Results.Ok(await svc.ListSettlementLinksAsync(status, ct)));
        sl.MapPost("/", async ([FromBody] CreateSettlementLinkRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Created("/api/v1/accounting/settlement-links", await svc.CreateSettlementLinkAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });
        sl.MapPost("/{id:long}/reverse", async (long id, [FromBody] ReverseSettlementRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Ok(await svc.ReverseSettlementLinkAsync(id, req, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        var bank = app.MapGroup("/api/v1/accounting/bank-accounts").WithTags("M17 Â· Bank").RequireAuthorization();
        bank.MapGet("/", async ([FromServices] IFinanceExtService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListBankAccountsAsync(ct)));

        var dep = app.MapGroup("/api/v1/accounting/deposits").WithTags("M17 Â· Deposits").RequireAuthorization();
        dep.MapGet("/", async ([FromServices] IFinanceExtService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListDepositsAsync(ct)));
        dep.MapPost("/", async ([FromBody] CreateDepositRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Created("/api/v1/accounting/deposits", await svc.CreateDepositAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });
        dep.MapPost("/{id:long}/reverse", async (long id, [FromBody] ReverseSettlementRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Ok(await svc.ReverseDepositAsync(id, req.Reason, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        var stmt = app.MapGroup("/api/v1/accounting/bank-statements").WithTags("M17 Â· Bank Statements").RequireAuthorization();
        stmt.MapGet("/", async ([FromServices] IFinanceExtService svc, [FromQuery] long? bankAccountId, CancellationToken ct) =>
            Results.Ok(await svc.ListBankStatementsAsync(bankAccountId, ct)));
        stmt.MapGet("/{id:long}", async (long id, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            var d = await svc.GetBankStatementAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        var recon = app.MapGroup("/api/v1/accounting/bank-recons").WithTags("M17 Â· Bank Reconciliation").RequireAuthorization();
        recon.MapGet("/", async ([FromServices] IFinanceExtService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListBankReconsAsync(ct)));
        recon.MapGet("/{id:long}", async (long id, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            var d = await svc.GetBankReconAsync(id, ct);
            return d is null ? Results.NotFound() : Results.Ok(d);
        });

        var ft = app.MapGroup("/api/v1/accounting/fund-transfers").WithTags("M17 Â· Fund Transfers").RequireAuthorization();
        ft.MapGet("/", async ([FromServices] IFinanceExtService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListFundTransfersAsync(ct)));
        ft.MapPost("/", async ([FromBody] CreateFundTransferRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Created("/api/v1/accounting/fund-transfers", await svc.CreateFundTransferAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        var voids = app.MapGroup("/api/v1/accounting/voided-checks").WithTags("M17 Â· Voided Checks").RequireAuthorization();
        voids.MapGet("/", async ([FromServices] IFinanceExtService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListVoidedChecksAsync(ct)));
        voids.MapPost("/", async ([FromBody] CreateVoidedCheckRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Created("/api/v1/accounting/voided-checks", await svc.CreateVoidedCheckAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        var checkPrint = app.MapGroup("/api/v1/accounting/check-print-batches").WithTags("M17 Â· Print").RequireAuthorization();
        checkPrint.MapGet("/", async ([FromServices] IFinanceExtService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListCheckPrintBatchesAsync(ct)));
        checkPrint.MapPost("/", async ([FromBody] CreateCheckPrintBatchRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Created("/api/v1/accounting/check-print-batches", await svc.CreateCheckPrintBatchAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        var invPrint = app.MapGroup("/api/v1/accounting/invoice-print-batches").WithTags("M17 Â· Print").RequireAuthorization();
        invPrint.MapGet("/", async ([FromServices] IFinanceExtService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListInvoicePrintBatchesAsync(ct)));
        invPrint.MapPost("/", async ([FromBody] CreateInvoicePrintBatchRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Created("/api/v1/accounting/invoice-print-batches", await svc.CreateInvoicePrintBatchAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        var pdn = app.MapGroup("/api/v1/accounting/past-due-notices").WithTags("M17 Â· Past Due").RequireAuthorization();
        pdn.MapGet("/", async ([FromServices] IFinanceExtService svc, [FromQuery] PastDueStatus? status, CancellationToken ct) =>
            Results.Ok(await svc.ListPastDueNoticesAsync(status, ct)));
        pdn.MapPost("/", async ([FromBody] CreatePastDueNoticeRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Created("/api/v1/accounting/past-due-notices", await svc.CreatePastDueNoticeAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });
        pdn.MapPost("/{id:long}/send", async (long id, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Ok(await svc.SendPastDueNoticeAsync(id, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        var et = app.MapGroup("/api/v1/accounting/email-templates").WithTags("M17 Â· Email Templates").RequireAuthorization();
        et.MapGet("/", async ([FromServices] IFinanceExtService svc, [FromQuery] EmailTemplateCategory? category, CancellationToken ct) =>
            Results.Ok(await svc.ListEmailTemplatesAsync(category, ct)));
        et.MapPost("/", async ([FromBody] UpsertEmailTemplateRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
            Results.Ok(await svc.UpsertEmailTemplateAsync(req, ct)));

        var cc = app.MapGroup("/api/v1/accounting/credit-card-payments").WithTags("M17 Â· Credit Card").RequireAuthorization();
        cc.MapGet("/", async ([FromServices] IFinanceExtService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListCreditCardPaymentsAsync(ct)));
        cc.MapPost("/", async ([FromBody] CreateCreditCardPaymentRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Created("/api/v1/accounting/credit-card-payments", await svc.CreateCreditCardPaymentAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        var ge = app.MapGroup("/api/v1/accounting/general-expenses").WithTags("M17 Â· General Expense").RequireAuthorization();
        ge.MapGet("/", async ([FromServices] IFinanceExtService svc, [FromQuery] GeneralExpenseKind? kind, CancellationToken ct) =>
            Results.Ok(await svc.ListGeneralExpensesAsync(kind, ct)));
        ge.MapPost("/", async ([FromBody] CreateGeneralExpenseRequest req, [FromServices] IFinanceExtService svc, CancellationToken ct) =>
        {
            try { return Results.Created("/api/v1/accounting/general-expenses", await svc.CreateGeneralExpenseAsync(req, ct)); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { error = ex.Message }); }
        });

        var rep = app.MapGroup("/api/v1/accounting/reports-ext").WithTags("M17 Â· Reports Ext").RequireAuthorization();
        rep.MapGet("/comparative-profit", async ([FromServices] IFinanceExtService svc, [FromQuery] int year, CancellationToken ct) =>
            Results.Ok(await svc.ComparativeProfitAsync(year, ct)));

        return app;
    }
}
