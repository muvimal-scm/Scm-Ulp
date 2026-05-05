using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.M14.Application;
using Ulp.M14.Domain.Entities;

namespace Ulp.M14.Infrastructure.Persistence;

public sealed class PricingService(M14DbContext db, ITenantContext tenant, IClock clock) : IPricingService
{
    /* ===================================================================== Rate cards ===================================================================== */

    public async Task<RateCardDto> CreateRateCardAsync(CreateRateCardRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var dup = await db.RateCards.AnyAsync(c => c.TenantId == tenantId && c.CardNumber == req.CardNumber, ct);
        if (dup) throw new InvalidOperationException($"card_number '{req.CardNumber}' already exists");

        var now = clock.GetCurrentInstant();
        var card = new RateCard
        {
            TenantId          = tenantId,
            CountryCode       = req.CountryCode,
            CardNumber        = req.CardNumber,
            CardType          = req.CardType,
            Scope             = req.Scope,
            PartyId           = req.PartyId,
            OriginPortId      = req.OriginPortId,
            DestinationPortId = req.DestinationPortId,
            ServiceType       = req.ServiceType,
            ValidFrom         = req.ValidFrom,
            ValidTo           = req.ValidTo,
            Currency          = req.Currency,
            Status            = RateCardStatus.Draft,
            CreatedAt         = now,
            ModifiedAt        = now,
        };
        db.RateCards.Add(card);
        await db.SaveChangesAsync(ct);

        Audit("RateCard", card.Id, "Created", null);
        await db.SaveChangesAsync(ct);
        return await ToCardDtoAsync(card, ct);
    }

    public async Task<RateCardDto?> GetRateCardAsync(long id, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var c = await db.RateCards.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == tenantId, ct);
        return c is null ? null : await ToCardDtoAsync(c, ct);
    }

    public async Task<IReadOnlyList<RateCardDto>> ListRateCardsAsync(RateCardListQuery q, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var query = db.RateCards.AsNoTracking().Where(c => c.TenantId == tenantId);
        if (q.Status.HasValue)        query = query.Where(c => c.Status == q.Status.Value);
        if (q.CardType.HasValue)      query = query.Where(c => c.CardType == q.CardType.Value);
        if (!string.IsNullOrEmpty(q.CountryCode)) query = query.Where(c => c.CountryCode == q.CountryCode);
        var page = Math.Max(q.Page, 1);
        var ps = q.PageSize is <= 0 or > 200 ? 50 : q.PageSize;
        var rows = await query.OrderByDescending(c => c.ValidFrom).Skip((page - 1) * ps).Take(ps).ToListAsync(ct);
        var dtos = new List<RateCardDto>(rows.Count);
        foreach (var c in rows) dtos.Add(await ToCardDtoAsync(c, ct));
        return dtos;
    }

    public async Task<RateCardDto> ApproveRateCardAsync(long id, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var c = await db.RateCards.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"rate card {id} not found");
        var now = clock.GetCurrentInstant();
        c.Status = RateCardStatus.Active;
        c.ApprovedAt = now;
        c.ApprovedBy = 0;
        c.ModifiedAt = now;
        Audit("RateCard", id, "Approved", null);
        await db.SaveChangesAsync(ct);
        return await ToCardDtoAsync(c, ct);
    }

    public async Task<RateCardLineDto> AddRateCardLineAsync(long rateCardId, CreateRateCardLineRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var card = await db.RateCards.FirstOrDefaultAsync(c => c.Id == rateCardId && c.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"rate card {rateCardId} not found");
        var nextLineNo = (await db.RateCardLines.Where(l => l.RateCardId == rateCardId).MaxAsync(l => (int?)l.LineNumber, ct) ?? 0) + 1;
        var line = new RateCardLine
        {
            RateCardId    = rateCardId,
            LineNumber    = nextLineNo,
            ChargeCode    = req.ChargeCode,
            Description   = req.Description,
            UomCode       = req.UomCode,
            RateAmount    = req.RateAmount,
            RateCurrency  = req.RateCurrency,
            MinAmount     = req.MinAmount,
            MaxAmount     = req.MaxAmount,
            IsTaxable     = req.IsTaxable,
            TaxClass      = req.TaxClass,
        };
        db.RateCardLines.Add(line);
        card.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return ToLineDto(line);
    }

    public async Task<IReadOnlyList<RateCardLineDto>> GetRateCardLinesAsync(long rateCardId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        // Verify the card belongs to this tenant.
        var exists = await db.RateCards.AnyAsync(c => c.Id == rateCardId && c.TenantId == tenantId, ct);
        if (!exists) return Array.Empty<RateCardLineDto>();
        var rows = await db.RateCardLines.AsNoTracking()
            .Where(l => l.RateCardId == rateCardId)
            .OrderBy(l => l.LineNumber).ToListAsync(ct);
        return rows.Select(ToLineDto).ToList();
    }

    /* ===================================================================== Quotes ===================================================================== */

    public async Task<QuoteDto> CreateQuoteAsync(CreateQuoteRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var dup = await db.Quotes.AnyAsync(q => q.TenantId == tenantId && q.QuoteNumber == req.QuoteNumber, ct);
        if (dup) throw new InvalidOperationException($"quote_number '{req.QuoteNumber}' already exists");
        var now = clock.GetCurrentInstant();
        var quote = new Quote
        {
            TenantId          = tenantId,
            QuoteNumber       = req.QuoteNumber,
            CustomerPartyId   = req.CustomerPartyId,
            EnquiryRef        = req.EnquiryRef,
            Status            = QuoteStatus.Draft,
            OriginPortId      = req.OriginPortId,
            DestinationPortId = req.DestinationPortId,
            ServiceType       = req.ServiceType,
            ValidUntil        = req.ValidUntil,
            Notes             = req.Notes,
            CreatedBy         = 0,
            CreatedAt         = now,
            ModifiedAt        = now,
        };
        db.Quotes.Add(quote);
        Audit("Quote", quote.Id, "Created", null);
        await db.SaveChangesAsync(ct);
        return await ToQuoteDtoAsync(quote, ct);
    }

    public async Task<QuoteDto?> GetQuoteAsync(long id, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var q = await db.Quotes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == tenantId, ct);
        return q is null ? null : await ToQuoteDtoAsync(q, ct);
    }

    public async Task<IReadOnlyList<QuoteDto>> ListQuotesAsync(QuoteListQuery q, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var query = db.Quotes.AsNoTracking().Where(x => x.TenantId == tenantId);
        if (q.Status.HasValue)            query = query.Where(x => x.Status == q.Status.Value);
        if (q.CustomerPartyId.HasValue)   query = query.Where(x => x.CustomerPartyId == q.CustomerPartyId);
        var page = Math.Max(q.Page, 1);
        var ps = q.PageSize is <= 0 or > 200 ? 50 : q.PageSize;
        var rows = await query.OrderByDescending(x => x.CreatedAt).Skip((page - 1) * ps).Take(ps).ToListAsync(ct);
        var dtos = new List<QuoteDto>(rows.Count);
        foreach (var r in rows) dtos.Add(await ToQuoteDtoAsync(r, ct));
        return dtos;
    }

    public async Task<QuoteLineDto> AddQuoteLineAsync(long quoteId, CreateQuoteLineRequest req, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var quote = await db.Quotes.FirstOrDefaultAsync(q => q.Id == quoteId && q.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"quote {quoteId} not found");
        var nextNo = (await db.QuoteLines.Where(l => l.QuoteId == quoteId).MaxAsync(l => (int?)l.LineNumber, ct) ?? 0) + 1;
        var line = new QuoteLine
        {
            QuoteId      = quoteId,
            LineNumber   = nextNo,
            ChargeCode   = req.ChargeCode,
            Description  = req.Description,
            Quantity     = req.Quantity,
            UomCode      = req.UomCode,
            UnitPrice    = req.UnitPrice,
            Amount       = (req.Quantity ?? 0m) * (req.UnitPrice ?? 0m),
            Currency     = req.Currency,
            RateCardId   = req.RateCardId,
        };
        db.QuoteLines.Add(line);
        // Recompute total.
        await db.SaveChangesAsync(ct);
        var lineSum = await db.QuoteLines.Where(l => l.QuoteId == quoteId).SumAsync(l => l.Amount ?? 0m, ct);
        quote.TotalAmount    = lineSum;
        quote.TotalCurrency ??= req.Currency;
        quote.ModifiedAt     = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return ToQuoteLineDto(line);
    }

    public async Task<IReadOnlyList<QuoteLineDto>> GetQuoteLinesAsync(long quoteId, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var exists = await db.Quotes.AnyAsync(q => q.Id == quoteId && q.TenantId == tenantId, ct);
        if (!exists) return Array.Empty<QuoteLineDto>();
        var rows = await db.QuoteLines.AsNoTracking()
            .Where(l => l.QuoteId == quoteId)
            .OrderBy(l => l.LineNumber).ToListAsync(ct);
        return rows.Select(ToQuoteLineDto).ToList();
    }

    public async Task<QuoteDto> ChangeQuoteStatusAsync(long id, QuoteStatus newStatus, CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var q = await db.Quotes.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == tenantId, ct)
            ?? throw new InvalidOperationException($"quote {id} not found");
        var prev = q.Status;
        q.Status = newStatus;
        q.ModifiedAt = clock.GetCurrentInstant();
        Audit("Quote", id, $"StatusChanged:{prev}->{newStatus}", null);
        await db.SaveChangesAsync(ct);
        return await ToQuoteDtoAsync(q, ct);
    }

    /* ===================================================================== Surcharges + Contracts (read-only) ===================================================================== */

    public async Task<IReadOnlyList<SurchargeDto>> ListSurchargesAsync(CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var rows = await db.Surcharges.AsNoTracking()
            .Where(s => s.TenantId == tenantId)
            .OrderByDescending(s => s.ValidFrom).ToListAsync(ct);
        return rows.Select(s => new SurchargeDto(s.Id, s.Code, s.Name, s.SurchargeType,
            s.Amount, s.Currency, s.Percent, s.ValidFrom, s.ValidTo, s.IsActive)).ToList();
    }

    public async Task<IReadOnlyList<ContractDto>> ListContractsAsync(CancellationToken ct)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        var rows = await db.Contracts.AsNoTracking()
            .Where(c => c.TenantId == tenantId)
            .OrderByDescending(c => c.StartDate).ToListAsync(ct);
        return rows.Select(c => new ContractDto(c.Id, c.ContractNumber, c.CustomerPartyId, c.RateCardId,
            c.StartDate, c.EndDate, c.AutoRenew, c.PaymentTerms, c.Status, c.DocumentId)).ToList();
    }

    /* ===================================================================== helpers ===================================================================== */

    private void Audit(string entityType, long entityId, string action, object? details)
    {
        var tenantId = int.Parse(tenant.TenantId.Value);
        db.Audits.Add(new M14Audit
        {
            TenantId = tenantId, EntityType = entityType, EntityId = entityId,
            Action = action, PerformedBy = 0, PerformedAt = clock.GetCurrentInstant(),
            DetailsJson = details is null ? null : JsonSerializer.Serialize(details),
        });
    }

    private async Task<RateCardDto> ToCardDtoAsync(RateCard c, CancellationToken ct)
    {
        var lineCount = await db.RateCardLines.CountAsync(l => l.RateCardId == c.Id, ct);
        return new RateCardDto(c.Id, c.TenantId, c.CountryCode, c.CardNumber,
            c.CardType, c.Scope, c.PartyId, c.OriginPortId, c.DestinationPortId,
            c.ServiceType, c.ValidFrom, c.ValidTo, c.Currency, c.Status,
            c.ApprovedBy, c.ApprovedAt, lineCount, c.CreatedAt, c.ModifiedAt);
    }

    private async Task<QuoteDto> ToQuoteDtoAsync(Quote q, CancellationToken ct)
    {
        var lineCount = await db.QuoteLines.CountAsync(l => l.QuoteId == q.Id, ct);
        return new QuoteDto(q.Id, q.TenantId, q.QuoteNumber, q.CustomerPartyId, q.EnquiryRef,
            q.Status, q.OriginPortId, q.DestinationPortId, q.ServiceType,
            q.TotalAmount, q.TotalCurrency, q.ValidUntil,
            q.DocumentId, q.Notes, lineCount, q.CreatedAt, q.ModifiedAt);
    }

    private static RateCardLineDto ToLineDto(RateCardLine l) => new(
        l.Id, l.RateCardId, l.LineNumber, l.ChargeCode, l.Description,
        l.UomCode, l.RateAmount, l.RateCurrency,
        l.MinAmount, l.MaxAmount, l.IsTaxable, l.TaxClass);

    private static QuoteLineDto ToQuoteLineDto(QuoteLine l) => new(
        l.Id, l.QuoteId, l.LineNumber, l.ChargeCode, l.Description,
        l.Quantity, l.UomCode, l.UnitPrice, l.Amount, l.Currency, l.RateCardId);
}
