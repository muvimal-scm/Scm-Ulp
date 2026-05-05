using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.LastMile.Application;
using Ulp.LastMile.Domain.Entities;

namespace Ulp.LastMile.Infrastructure.Persistence;

public sealed class LastMileService(LastMileDbContext db, ITenantContext tenant, IClock clock) : ILastMileService
{
    private int Tid => int.Parse(tenant.TenantId.Value);

    /* ===== Bookings ===== */

    public async Task<CourierBookingDto> CreateBookingAsync(CreateCourierBookingRequest req, CancellationToken ct)
    {
        var dup = await db.Bookings.AnyAsync(b => b.TenantId == Tid && b.BookingNumber == req.BookingNumber, ct);
        if (dup) throw new InvalidOperationException($"booking '{req.BookingNumber}' already exists");
        var now = clock.GetCurrentInstant();
        var booking = new CourierBooking
        {
            TenantId = Tid, CountryCode = req.CountryCode, BookingNumber = req.BookingNumber,
            CourierType = req.CourierType,
            ShipperPartyId = req.ShipperPartyId, ConsigneePartyId = req.ConsigneePartyId,
            PickupAddressId = req.PickupAddressId, DeliveryAddressId = req.DeliveryAddressId,
            WeightKg = req.WeightKg, Pieces = req.Pieces, ServiceLevel = req.ServiceLevel,
            DeclaredValueAmount = req.DeclaredValueAmount, DeclaredValueCurrency = req.DeclaredValueCurrency,
            CodAmount = req.CodAmount, CodCurrency = req.CodCurrency,
            Status = CourierBookingStatus.Created,
            CreatedAt = now, ModifiedAt = now,
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync(ct);
        return ToBookingDtoSync(booking, 0, false);
    }

    public async Task<CourierBookingDetailDto?> GetBookingAsync(long id, CancellationToken ct)
    {
        var b = await db.Bookings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (b is null) return null;
        var attempts = await db.Attempts.AsNoTracking().Where(a => a.BookingId == id)
            .OrderByDescending(a => a.AttemptedAt).ToListAsync(ct);
        var pods = await db.Pods.AsNoTracking().Where(p => p.BookingId == id).ToListAsync(ct);
        var cods = await db.Cods.AsNoTracking().Where(c => c.BookingId == id).ToListAsync(ct);
        return new CourierBookingDetailDto(
            ToBookingDtoSync(b, attempts.Count, pods.Count > 0),
            attempts.Select(ToAttemptDto).ToList(),
            pods.Select(ToPodDto).ToList(),
            cods.Select(ToCodDto).ToList());
    }

    public async Task<IReadOnlyList<CourierBookingDto>> ListBookingsAsync(CourierBookingListQuery q, CancellationToken ct)
    {
        var query = db.Bookings.AsNoTracking().Where(b => b.TenantId == Tid);
        if (q.Status.HasValue)      query = query.Where(b => b.Status == q.Status.Value);
        if (q.CourierType.HasValue) query = query.Where(b => b.CourierType == q.CourierType.Value);
        if (!string.IsNullOrEmpty(q.CountryCode)) query = query.Where(b => b.CountryCode == q.CountryCode);
        var page = Math.Max(q.Page, 1);
        var ps = q.PageSize is <= 0 or > 200 ? 50 : q.PageSize;
        var rows = await query.OrderByDescending(b => b.CreatedAt).Skip((page - 1) * ps).Take(ps).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var attemptCounts = await db.Attempts.AsNoTracking().Where(a => ids.Contains(a.BookingId))
            .GroupBy(a => a.BookingId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        var podBookingIds = (await db.Pods.AsNoTracking().Where(p => ids.Contains(p.BookingId))
            .Select(p => p.BookingId).Distinct().ToListAsync(ct)).ToHashSet();
        return rows.Select(b => ToBookingDtoSync(b, attemptCounts.GetValueOrDefault(b.Id), podBookingIds.Contains(b.Id))).ToList();
    }

    public async Task<CourierBookingDto> ChangeBookingStatusAsync(long id, CourierBookingStatus next, CancellationToken ct)
    {
        var b = await db.Bookings.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"booking {id} not found");
        b.Status = next;
        b.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        var ac = await db.Attempts.AsNoTracking().CountAsync(a => a.BookingId == id, ct);
        var hasPod = await db.Pods.AsNoTracking().AnyAsync(p => p.BookingId == id, ct);
        return ToBookingDtoSync(b, ac, hasPod);
    }

    /* ===== Routes ===== */

    public async Task<RouteDto> CreateRouteAsync(CreateRouteRequest req, CancellationToken ct)
    {
        var dup = await db.Routes.AnyAsync(r => r.TenantId == Tid && r.RouteCode == req.RouteCode, ct);
        if (dup) throw new InvalidOperationException($"route '{req.RouteCode}' already exists");
        var r = new Route
        {
            TenantId = Tid, CountryCode = req.CountryCode, RouteCode = req.RouteCode,
            Name = req.Name, RouteType = req.RouteType, PlannedDate = req.PlannedDate,
            Status = RouteStatus.Planned,
            DriverUserId = req.DriverUserId, VehicleNo = req.VehicleNo,
        };
        db.Routes.Add(r);
        await db.SaveChangesAsync(ct);
        return ToRouteDtoSync(r, 0);
    }

    public async Task<RouteDetailDto?> GetRouteAsync(long id, CancellationToken ct)
    {
        var r = await db.Routes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (r is null) return null;
        var stops = await db.Stops.AsNoTracking().Where(s => s.RouteId == id)
            .OrderBy(s => s.Sequence).ToListAsync(ct);
        return new RouteDetailDto(ToRouteDtoSync(r, stops.Count), stops.Select(ToStopDto).ToList());
    }

    public async Task<IReadOnlyList<RouteDto>> ListRoutesAsync(CancellationToken ct)
    {
        var rows = await db.Routes.AsNoTracking().Where(r => r.TenantId == Tid)
            .OrderByDescending(r => r.PlannedDate).Take(200).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var counts = await db.Stops.AsNoTracking().Where(s => ids.Contains(s.RouteId))
            .GroupBy(s => s.RouteId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        return rows.Select(r => ToRouteDtoSync(r, counts.GetValueOrDefault(r.Id))).ToList();
    }

    /* ===== Manifests / PODs / COD / Attempts / Zones ===== */

    public async Task<IReadOnlyList<ManifestDto>> ListManifestsAsync(CancellationToken ct)
    {
        var rows = await db.Manifests.AsNoTracking().Where(m => m.TenantId == Tid)
            .OrderByDescending(m => m.GeneratedAt).Take(100).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var counts = await db.ManifestLines.AsNoTracking().Where(l => ids.Contains(l.ManifestId))
            .GroupBy(l => l.ManifestId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        return rows.Select(m => new ManifestDto(
            m.Id, m.ManifestNumber, m.RouteId, m.CourierType,
            m.TotalPieces, m.TotalWeightKg, m.GeneratedAt, counts.GetValueOrDefault(m.Id))).ToList();
    }

    public async Task<PodDto> RecordPodAsync(CreatePodRequest req, CancellationToken ct)
    {
        var p = new Pod
        {
            TenantId = Tid, BookingId = req.BookingId, SignedBy = req.SignedBy,
            SignatureImageDocId = req.SignatureImageDocId, PhotoDocId = req.PhotoDocId,
            GpsLat = req.GpsLat, GpsLng = req.GpsLng,
            CapturedAt = req.CapturedAt, CapturedByUserId = req.CapturedByUserId,
        };
        db.Pods.Add(p);
        await db.SaveChangesAsync(ct);
        return ToPodDto(p);
    }

    public async Task<IReadOnlyList<PodDto>> ListPodsAsync(long? bookingId, CancellationToken ct)
    {
        var q = db.Pods.AsNoTracking().Where(p => p.TenantId == Tid);
        if (bookingId.HasValue) q = q.Where(p => p.BookingId == bookingId.Value);
        var rows = await q.OrderByDescending(p => p.CapturedAt).Take(200).ToListAsync(ct);
        return rows.Select(ToPodDto).ToList();
    }

    public async Task<CodDto> RecordCodAsync(CreateCodRequest req, CancellationToken ct)
    {
        var c = new CodCollection
        {
            TenantId = Tid, BookingId = req.BookingId,
            AmountCollected = req.AmountCollected, Currency = req.Currency,
            PaymentMethod = req.PaymentMethod, CollectedAt = req.CollectedAt,
            SettledStatus = CodSettledStatus.Pending, ReferenceNo = req.ReferenceNo,
        };
        db.Cods.Add(c);
        await db.SaveChangesAsync(ct);
        return ToCodDto(c);
    }

    public async Task<IReadOnlyList<CodDto>> ListCodAsync(CodSettledStatus? status, CancellationToken ct)
    {
        var q = db.Cods.AsNoTracking().Where(c => c.TenantId == Tid);
        if (status.HasValue) q = q.Where(c => c.SettledStatus == status.Value);
        var rows = await q.OrderByDescending(c => c.CollectedAt).Take(200).ToListAsync(ct);
        return rows.Select(ToCodDto).ToList();
    }

    public async Task<DeliveryAttemptDto> RecordAttemptAsync(CreateAttemptRequest req, CancellationToken ct)
    {
        var nextNo = (await db.Attempts.Where(a => a.BookingId == req.BookingId)
            .MaxAsync(a => (int?)a.AttemptNo, ct) ?? 0) + 1;
        var a = new DeliveryAttempt
        {
            TenantId = Tid, BookingId = req.BookingId, AttemptNo = nextNo,
            AttemptedAt = req.AttemptedAt, Status = req.Status,
            FailureReason = req.FailureReason, NextAttemptDate = req.NextAttemptDate,
        };
        db.Attempts.Add(a);
        await db.SaveChangesAsync(ct);
        return ToAttemptDto(a);
    }

    public async Task<IReadOnlyList<DeliveryAttemptDto>> ListAttemptsAsync(long bookingId, CancellationToken ct) =>
        (await db.Attempts.AsNoTracking().Where(a => a.TenantId == Tid && a.BookingId == bookingId)
            .OrderBy(a => a.AttemptNo).ToListAsync(ct))
            .Select(ToAttemptDto).ToList();

    public async Task<IReadOnlyList<ZoneRateDto>> ListZoneRatesAsync(string? countryCode, CourierType? type, CancellationToken ct)
    {
        var q = db.ZoneRates.AsNoTracking().Where(z => z.TenantId == Tid);
        if (!string.IsNullOrEmpty(countryCode)) q = q.Where(z => z.CountryCode == countryCode);
        if (type.HasValue) q = q.Where(z => z.CourierType == type.Value);
        var rows = await q.OrderBy(z => z.CountryCode).ThenBy(z => z.ZoneCode).ThenBy(z => z.WeightSlabFromKg).Take(500).ToListAsync(ct);
        return rows.Select(z => new ZoneRateDto(
            z.Id, z.CountryCode, z.ZoneCode, z.CourierType,
            z.WeightSlabFromKg, z.WeightSlabToKg,
            z.RateAmount, z.RateCurrency, z.ValidFrom, z.ValidTo)).ToList();
    }

    /* ===== mappers ===== */

    private static CourierBookingDto ToBookingDtoSync(CourierBooking b, int attemptCount, bool hasPod) => new(
        b.Id, b.TenantId, b.CountryCode, b.BookingNumber, b.CourierType,
        b.ShipperPartyId, b.ConsigneePartyId,
        b.PickupAddressId, b.DeliveryAddressId,
        b.WeightKg, b.Pieces, b.ServiceLevel,
        b.DeclaredValueAmount, b.DeclaredValueCurrency,
        b.CodAmount, b.CodCurrency,
        b.Status, attemptCount, hasPod, b.CreatedAt, b.ModifiedAt);

    private static RouteDto ToRouteDtoSync(Route r, int stopCount) => new(
        r.Id, r.CountryCode, r.RouteCode, r.Name,
        r.RouteType, r.PlannedDate, r.Status,
        r.DriverUserId, r.VehicleNo, stopCount);

    private static RouteStopDto ToStopDto(RouteStop s) => new(
        s.Id, s.RouteId, s.Sequence, s.CountryCode,
        s.StopType, s.AddressId, s.PartyId, s.BookingId,
        s.ExpectedArrival, s.ActualArrival, s.Status);

    private static PodDto ToPodDto(Pod p) => new(
        p.Id, p.BookingId, p.SignedBy,
        p.SignatureImageDocId, p.PhotoDocId,
        p.GpsLat, p.GpsLng, p.CapturedAt, p.CapturedByUserId);

    private static CodDto ToCodDto(CodCollection c) => new(
        c.Id, c.BookingId, c.AmountCollected, c.Currency,
        c.PaymentMethod, c.CollectedAt, c.SettledStatus, c.ReferenceNo);

    private static DeliveryAttemptDto ToAttemptDto(DeliveryAttempt a) => new(
        a.Id, a.BookingId, a.AttemptNo, a.AttemptedAt,
        a.Status, a.FailureReason, a.NextAttemptDate);
}
