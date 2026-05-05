using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NodaTime;
using Ulp.BuildingBlocks;
using Ulp.Core.Domain.Tenancy;
using Ulp.Core.Domain.ValueObjects;
using Ulp.MasterData.Application.Parties;
using Ulp.MasterData.Domain.Entities;

namespace Ulp.MasterData.Api.Endpoints;

public static class PartyEndpoints
{
    public static IEndpointRouteBuilder MapPartyEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/v1/master-data/parties").WithTags("M1 Â· Parties").RequireAuthorization();

        g.MapGet("/", ListAsync);
        g.MapGet("/{id:long}", GetAsync);
        g.MapPost("/", CreateAsync);
        g.MapPut("/{id:long}", UpdateAsync);
        g.MapDelete("/{id:long}", DeactivateAsync);

        return app;
    }

    private static async Task<IResult> ListAsync(
        [FromServices] IPartyRepository repo,
        [FromQuery] PartyType? partyType,
        [FromQuery] string? search,
        [FromQuery] bool? includeInactive,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken ct)
    {
        var ps = pageSize ?? 50;
        var q = new PartyListQuery(partyType, search, includeInactive ?? false,
                                   Math.Max(page ?? 1, 1),
                                   ps is <= 0 or > 200 ? 50 : ps);
        var items = await repo.ListAsync(q, ct);
        var total = await repo.CountAsync(q, ct);
        return Results.Ok(new PagedList<PartyDto>(items.Select(ToDto).ToList(), q.Page, q.PageSize, total));
    }

    private static async Task<IResult> GetAsync(long id, [FromServices] IPartyRepository repo, CancellationToken ct)
    {
        var p = await repo.GetAsync(id, ct);
        return p is null ? Results.NotFound() : Results.Ok(ToDto(p));
    }

    private static async Task<IResult> CreateAsync(
        [FromBody] CreatePartyRequest req,
        [FromServices] IPartyRepository repo,
        [FromServices] IValidator<CreatePartyRequest> validator,
        [FromServices] ITenantContext tenant,
        [FromServices] IClock clock,
        CancellationToken ct)
    {
        var v = await validator.ValidateAsync(req, ct);
        if (!v.IsValid) return Results.ValidationProblem(v.ToDictionary());

        var now = clock.GetCurrentInstant();
        var party = new Party
        {
            TenantId          = tenant.TenantId,
            CountryCode       = new CountryCode(req.CountryCode),
            PartyType         = req.PartyType,
            LegalName         = req.LegalName,
            TradeName         = req.TradeName,
            ParentPartyId     = req.ParentPartyId,
            IsActive          = true,
            PreferredLocale   = req.PreferredLocale,
            PreferredCurrency = req.PreferredCurrency,
            DefaultPaymentTerms = req.DefaultPaymentTerms,
            CreditLimit       = req.CreditLimit,
            TaxStatus         = req.TaxStatus,
            CreatedAt         = now,
            ModifiedAt        = now,
            Identifiers       = req.Identifiers?.Select(i => new PartyIdentifier
            {
                TenantId         = int.Parse(tenant.TenantId.Value),
                IdentifierType   = i.IdentifierType,
                IdentifierValue  = i.IdentifierValue,
                IsPrimary        = i.IsPrimary,
                ValidationStatus = IdentifierValidationStatus.Pending,
            }).ToList() ?? new List<PartyIdentifier>(),
        };

        var saved = await repo.AddAsync(party, ct);
        return Results.Created($"/api/v1/master-data/parties/{saved.Id}", ToDto(saved));
    }

    private static async Task<IResult> UpdateAsync(
        long id,
        [FromBody] UpdatePartyRequest req,
        [FromServices] IPartyRepository repo,
        [FromServices] IValidator<UpdatePartyRequest> validator,
        [FromServices] IClock clock,
        CancellationToken ct)
    {
        var v = await validator.ValidateAsync(req, ct);
        if (!v.IsValid) return Results.ValidationProblem(v.ToDictionary());

        var party = await repo.GetAsync(id, ct);
        if (party is null) return Results.NotFound();

        party.PartyType           = req.PartyType;
        party.LegalName           = req.LegalName;
        party.TradeName           = req.TradeName;
        party.ParentPartyId       = req.ParentPartyId;
        party.IsActive            = req.IsActive;
        party.PreferredLocale     = req.PreferredLocale;
        party.PreferredCurrency   = req.PreferredCurrency;
        party.DefaultPaymentTerms = req.DefaultPaymentTerms;
        party.CreditLimit         = req.CreditLimit;
        party.TaxStatus           = req.TaxStatus;
        party.ModifiedAt          = clock.GetCurrentInstant();

        await repo.UpdateAsync(party, ct);
        return Results.Ok(ToDto(party));
    }

    private static async Task<IResult> DeactivateAsync(long id, [FromServices] IPartyRepository repo, CancellationToken ct)
    {
        await repo.SoftDeleteAsync(id, ct);
        return Results.NoContent();
    }

    // -------- mapping --------
    private static PartyDto ToDto(Party p) => new(
        p.Id,
        p.CountryCode.Value,
        p.PartyType,
        p.LegalName,
        p.TradeName,
        p.ParentPartyId,
        p.IsActive,
        p.PreferredLocale,
        p.PreferredCurrency,
        p.DefaultPaymentTerms,
        p.CreditLimit,
        p.TaxStatus,
        p.SanctionsScreened,
        p.SanctionsScreenedAt?.ToString(),
        p.CreatedAt.ToString(),
        p.ModifiedAt.ToString(),
        p.Identifiers.Select(i => new PartyIdentifierDto(
            i.Id, i.IdentifierType, i.IdentifierValue, i.IsPrimary,
            i.ValidationStatus.ToString(), i.ValidationSource,
            i.ValidatedAt?.ToString(), i.ExpiresAt?.ToString())).ToList());
}
