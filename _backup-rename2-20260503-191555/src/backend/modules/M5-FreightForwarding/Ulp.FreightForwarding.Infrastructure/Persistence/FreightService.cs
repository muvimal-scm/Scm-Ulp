using Microsoft.EntityFrameworkCore;
using NodaTime;
using Ulp.Core.Domain.Tenancy;
using Ulp.FreightForwarding.Application;
using Ulp.FreightForwarding.Domain.Entities;

namespace Ulp.FreightForwarding.Infrastructure.Persistence;

public sealed class FreightService(FreightForwardingDbContext db, ITenantContext tenant, IClock clock) : IFreightService
{
    private int Tid => int.Parse(tenant.TenantId.Value);

    /* ===== Bookings ===== */

    public async Task<BookingDto> CreateBookingAsync(CreateBookingRequest req, CancellationToken ct)
    {
        var dup = await db.Bookings.AnyAsync(b => b.TenantId == Tid && b.BookingNumber == req.BookingNumber, ct);
        if (dup) throw new InvalidOperationException($"booking '{req.BookingNumber}' already exists");

        var now = clock.GetCurrentInstant();
        var b = new Booking
        {
            TenantId             = Tid,
            CountryCode          = req.CountryCode,
            BookingNumber        = req.BookingNumber,
            CustomerPartyId      = req.CustomerPartyId,
            ShipperPartyId       = req.ShipperPartyId,
            ConsigneePartyId     = req.ConsigneePartyId,
            NotifyPartyId        = req.NotifyPartyId,
            TradeDirection       = req.TradeDirection,
            Mode                 = req.Mode,
            ServiceType          = req.ServiceType,
            Incoterm             = req.Incoterm,
            OriginPortId         = req.OriginPortId,
            DestinationPortId    = req.DestinationPortId,
            ExpectedPickupDate   = req.ExpectedPickupDate,
            ExpectedDeliveryDate = req.ExpectedDeliveryDate,
            DeclaredValueAmount  = req.DeclaredValueAmount,
            DeclaredValueCurrency= req.DeclaredValueCurrency,
            EstimatedCrd         = req.EstimatedCrd,
            FfAssignedPartyId    = req.FfAssignedPartyId,
            Remarks              = req.Remarks,
            Status               = BookingStatus.Draft,
            CreatedAt            = now,
            ModifiedAt           = now,
        };
        db.Bookings.Add(b);
        await db.SaveChangesAsync(ct);
        return await ToBookingDtoAsync(b, ct);
    }

    public async Task<BookingDetailDto?> GetBookingAsync(long id, CancellationToken ct)
    {
        var b = await db.Bookings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (b is null) return null;
        var lines = await db.BookingLines.AsNoTracking()
            .Where(l => l.BookingId == id).OrderBy(l => l.LineNumber).ToListAsync(ct);
        return new BookingDetailDto(await ToBookingDtoAsync(b, ct), lines.Select(ToLineDto).ToList());
    }

    public async Task<IReadOnlyList<BookingDto>> ListBookingsAsync(BookingListQuery q, CancellationToken ct)
    {
        var query = db.Bookings.AsNoTracking().Where(b => b.TenantId == Tid);
        if (q.Status.HasValue)          query = query.Where(b => b.Status == q.Status.Value);
        if (q.CustomerPartyId.HasValue) query = query.Where(b => b.CustomerPartyId == q.CustomerPartyId.Value);
        if (q.Mode.HasValue)            query = query.Where(b => b.Mode == q.Mode.Value);
        if (!string.IsNullOrEmpty(q.CountryCode)) query = query.Where(b => b.CountryCode == q.CountryCode);
        var page = Math.Max(q.Page, 1);
        var ps = q.PageSize is <= 0 or > 200 ? 50 : q.PageSize;
        var rows = await query.OrderByDescending(b => b.CreatedAt).Skip((page - 1) * ps).Take(ps).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var counts = await db.BookingLines.AsNoTracking()
            .Where(l => ids.Contains(l.BookingId))
            .GroupBy(l => l.BookingId)
            .Select(g => new { Id = g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Id, x => x.N, ct);
        return rows.Select(b => ToBookingDtoSync(b, counts.GetValueOrDefault(b.Id))).ToList();
    }

    public async Task<BookingDto> ChangeBookingStatusAsync(long id, BookingStatus next, CancellationToken ct)
    {
        var b = await db.Bookings.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"booking {id} not found");
        // SCM Milestone 2: CRD becomes mandatory once status >= OrderConfirmed (Draft is the only stage that can omit it).
        if (next != BookingStatus.Draft && b.EstimatedCrd is null)
            throw new InvalidOperationException("estimated_crd is required to advance past Draft");
        b.Status = next;
        b.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return await ToBookingDtoAsync(b, ct);
    }

    public async Task<BookingLineDto> AddBookingLineAsync(long bookingId, CreateBookingLineRequest req, CancellationToken ct)
    {
        var b = await db.Bookings.FirstOrDefaultAsync(x => x.Id == bookingId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"booking {bookingId} not found");
        var nextLine = (await db.BookingLines.Where(l => l.BookingId == bookingId)
            .MaxAsync(l => (int?)l.LineNumber, ct) ?? 0) + 1;
        var line = new BookingLine
        {
            TenantId      = Tid,
            BookingId     = bookingId,
            LineNumber    = nextLine,
            Description   = req.Description,
            HsCode        = req.HsCode,
            Pieces        = req.Pieces,
            PackagingType = req.PackagingType,
            GrossWeightKg = req.GrossWeightKg,
            VolumeCbm     = req.VolumeCbm,
            IsHazmat      = req.IsHazmat,
            IsPerishable  = req.IsPerishable,
        };
        db.BookingLines.Add(line);
        b.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return ToLineDto(line);
    }

    /* ===== Shipments ===== */

    public async Task<ShipmentDto> CreateShipmentAsync(CreateShipmentRequest req, CancellationToken ct)
    {
        var dup = await db.Shipments.AnyAsync(s => s.TenantId == Tid && s.ShipmentNumber == req.ShipmentNumber, ct);
        if (dup) throw new InvalidOperationException($"shipment '{req.ShipmentNumber}' already exists");

        var now = clock.GetCurrentInstant();
        var s = new Shipment
        {
            TenantId            = Tid,
            CountryCode         = req.CountryCode,
            ShipmentNumber      = req.ShipmentNumber,
            BookingId           = req.BookingId,
            Mode                = req.Mode,
            CarrierPartyId      = req.CarrierPartyId,
            VesselOrFlight      = req.VesselOrFlight,
            VoyageOrFlightNo    = req.VoyageOrFlightNo,
            Etd                 = req.Etd,
            Eta                 = req.Eta,
            OriginPortId        = req.OriginPortId,
            DestinationPortId   = req.DestinationPortId,
            Status              = ShipmentStatus.Booked,
            Remarks             = req.Remarks,
            CreatedAt           = now,
            ModifiedAt          = now,
        };
        db.Shipments.Add(s);
        await db.SaveChangesAsync(ct);
        return await ToShipmentDtoAsync(s, ct);
    }

    public async Task<ShipmentDetailDto?> GetShipmentAsync(long id, CancellationToken ct)
    {
        var s = await db.Shipments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct);
        if (s is null) return null;
        var containers = await db.Containers.AsNoTracking().Where(c => c.ShipmentId == id).ToListAsync(ct);
        var milestones = await db.Milestones.AsNoTracking().Where(m => m.ShipmentId == id)
            .OrderByDescending(m => m.OccurredAt).ToListAsync(ct);
        var mbls   = await db.Mbls.AsNoTracking().Where(m => m.ShipmentId == id).ToListAsync(ct);
        var awbs   = await db.Awbs.AsNoTracking().Where(a => a.ShipmentId == id).ToListAsync(ct);
        var charges= await db.ChargeLines.AsNoTracking().Where(c => c.ShipmentId == id).ToListAsync(ct);
        return new ShipmentDetailDto(
            await ToShipmentDtoAsync(s, ct),
            containers.Select(ToContainerDto).ToList(),
            milestones.Select(ToMilestoneDto).ToList(),
            mbls.Select(ToMblDto).ToList(),
            awbs.Select(ToAwbDto).ToList(),
            charges.Select(ToChargeDto).ToList());
    }

    public async Task<IReadOnlyList<ShipmentDto>> ListShipmentsAsync(ShipmentListQuery q, CancellationToken ct)
    {
        var query = db.Shipments.AsNoTracking().Where(s => s.TenantId == Tid);
        if (q.Status.HasValue) query = query.Where(s => s.Status == q.Status.Value);
        if (q.Mode.HasValue)   query = query.Where(s => s.Mode == q.Mode.Value);
        if (!string.IsNullOrEmpty(q.CountryCode)) query = query.Where(s => s.CountryCode == q.CountryCode);

        // SCM Milestone 2 Control Tower filters (2026-05-03)
        if (!string.IsNullOrEmpty(q.ShipmentNumber)) query = query.Where(s => s.ShipmentNumber.Contains(q.ShipmentNumber));
        if (q.OriginPortId.HasValue)                 query = query.Where(s => s.OriginPortId == q.OriginPortId.Value);
        if (q.DestinationPortId.HasValue)            query = query.Where(s => s.DestinationPortId == q.DestinationPortId.Value);
        if (q.EtaFrom.HasValue || q.EtaTo.HasValue)
        {
            var fromU = q.EtaFrom.HasValue ? Instant.FromDateTimeUtc(DateTime.SpecifyKind(new DateTime(q.EtaFrom.Value.Year, q.EtaFrom.Value.Month, q.EtaFrom.Value.Day), DateTimeKind.Utc)) : (Instant?)null;
            var toU   = q.EtaTo.HasValue   ? Instant.FromDateTimeUtc(DateTime.SpecifyKind(new DateTime(q.EtaTo.Value.Year,   q.EtaTo.Value.Month,   q.EtaTo.Value.Day  ).AddDays(1), DateTimeKind.Utc)) : (Instant?)null;
            if (fromU.HasValue) query = query.Where(s => s.Eta.HasValue && s.Eta >= fromU);
            if (toU.HasValue)   query = query.Where(s => s.Eta.HasValue && s.Eta <  toU);
        }

        // Direction + customer require joining the booking; restrict shipment IDs by booking match.
        if (q.Direction.HasValue || q.CustomerPartyId.HasValue)
        {
            var bq = db.Bookings.AsNoTracking().Where(b => b.TenantId == Tid);
            if (q.Direction.HasValue)       bq = bq.Where(b => b.TradeDirection == q.Direction.Value);
            if (q.CustomerPartyId.HasValue) bq = bq.Where(b => b.CustomerPartyId == q.CustomerPartyId.Value);
            var bookingIds = await bq.Select(b => (long?)b.Id).ToListAsync(ct);
            query = query.Where(s => s.BookingId.HasValue && bookingIds.Contains(s.BookingId));
        }

        // MBL / HBL / Container number â€” resolve to shipment IDs
        if (!string.IsNullOrEmpty(q.MblNumber))
        {
            var mblShipIds = await db.Mbls.AsNoTracking()
                .Where(m => m.TenantId == Tid && m.MblNumber.Contains(q.MblNumber))
                .Select(m => m.ShipmentId).Distinct().ToListAsync(ct);
            query = query.Where(s => mblShipIds.Contains(s.Id));
        }
        if (!string.IsNullOrEmpty(q.HblNumber))
        {
            var mblIds = await db.Hbls.AsNoTracking()
                .Where(h => h.TenantId == Tid && h.HblNumber.Contains(q.HblNumber) && h.MblId.HasValue)
                .Select(h => h.MblId!.Value).Distinct().ToListAsync(ct);
            var hblShipIds = await db.Mbls.AsNoTracking()
                .Where(m => mblIds.Contains(m.Id))
                .Select(m => m.ShipmentId).Distinct().ToListAsync(ct);
            query = query.Where(s => hblShipIds.Contains(s.Id));
        }
        if (!string.IsNullOrEmpty(q.ContainerNumber))
        {
            var containerShipIds = await db.Containers.AsNoTracking()
                .Where(c => c.TenantId == Tid && c.ContainerNumber.Contains(q.ContainerNumber))
                .Select(c => c.ShipmentId).Distinct().ToListAsync(ct);
            query = query.Where(s => containerShipIds.Contains(s.Id));
        }

        // SCM Milestone 1+2 watchlist filter â€” restrict to current user's starred shipments.
        if (q.StarredOnly && !string.IsNullOrEmpty(q.UserSub))
        {
            var starredIds = await db.Watchlist.AsNoTracking()
                .Where(w => w.TenantId == Tid && w.UserSub == q.UserSub)
                .Select(w => w.ShipmentId).ToListAsync(ct);
            query = query.Where(s => starredIds.Contains(s.Id));
        }

        var page = Math.Max(q.Page, 1);
        var ps = q.PageSize is <= 0 or > 200 ? 50 : q.PageSize;
        var rows = await query.OrderByDescending(s => s.CreatedAt).Skip((page - 1) * ps).Take(ps).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var cCounts = await db.Containers.AsNoTracking().Where(c => ids.Contains(c.ShipmentId))
            .GroupBy(c => c.ShipmentId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        var mCounts = await db.Milestones.AsNoTracking().Where(m => ids.Contains(m.ShipmentId))
            .GroupBy(m => m.ShipmentId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);

        // Per-row IsStarred flag â€” fetch the user's full watchlist set in one query.
        var starredSet = string.IsNullOrEmpty(q.UserSub)
            ? new HashSet<long>()
            : (await db.Watchlist.AsNoTracking()
                  .Where(w => w.TenantId == Tid && w.UserSub == q.UserSub && ids.Contains(w.ShipmentId))
                  .Select(w => w.ShipmentId).ToListAsync(ct)).ToHashSet();

        // SCM Milestone 1+2: active hold + due reminder counts per row.
        var holdCounts = await db.Holds.AsNoTracking()
            .Where(h => ids.Contains(h.ShipmentId) && h.ClearedAt == null && h.TenantId == Tid)
            .GroupBy(h => h.ShipmentId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);
        var nowI = clock.GetCurrentInstant();
        var dueRemCounts = await db.Reminders.AsNoTracking()
            .Where(r => ids.Contains(r.ShipmentId) && r.TenantId == Tid
                     && r.Status == ReminderStatus.Pending && r.DueAt <= nowI)
            .GroupBy(r => r.ShipmentId).Select(g => new { Id = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.N, ct);

        return rows.Select(s => ToShipmentDtoSync(
            s,
            cCounts.GetValueOrDefault(s.Id),
            mCounts.GetValueOrDefault(s.Id),
            starredSet.Contains(s.Id),
            holdCounts.GetValueOrDefault(s.Id),
            dueRemCounts.GetValueOrDefault(s.Id))).ToList();
    }

    public async Task<ShipmentDto> ChangeShipmentStatusAsync(long id, ShipmentStatus next, CancellationToken ct)
    {
        var s = await db.Shipments.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"shipment {id} not found");
        s.Status = next;
        s.ModifiedAt = clock.GetCurrentInstant();
        if (next == ShipmentStatus.Departed && s.Atd is null) s.Atd = clock.GetCurrentInstant();
        if (next == ShipmentStatus.Arrived  && s.Ata is null) s.Ata = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return await ToShipmentDtoAsync(s, ct);
    }

    /* ===== MBL/HBL/AWB ===== */

    public async Task<MblDto> AddMblAsync(long shipmentId, CreateMblRequest req, CancellationToken ct)
    {
        var s = await db.Shipments.FirstOrDefaultAsync(x => x.Id == shipmentId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"shipment {shipmentId} not found");
        var dup = await db.Mbls.AnyAsync(m => m.TenantId == Tid && m.MblNumber == req.MblNumber, ct);
        if (dup) throw new InvalidOperationException($"MBL '{req.MblNumber}' already exists");
        var m = new Mbl
        {
            TenantId               = Tid,
            CountryCode            = req.CountryCode,
            ShipmentId             = shipmentId,
            MblNumber              = req.MblNumber,
            BlType                 = req.BlType,
            IssuedByCarrierPartyId = req.IssuedByCarrierPartyId,
            ReleaseType            = req.ReleaseType,
            IssueDate              = req.IssueDate,
            OnBoardDate            = req.OnBoardDate,
            Status                 = BlStatus.Issued,
        };
        db.Mbls.Add(m);
        await db.SaveChangesAsync(ct);
        return ToMblDto(m);
    }

    public async Task<HblDto> AddHblAsync(CreateHblRequest req, CancellationToken ct)
    {
        var dup = await db.Hbls.AnyAsync(h => h.TenantId == Tid && h.HblNumber == req.HblNumber, ct);
        if (dup) throw new InvalidOperationException($"HBL '{req.HblNumber}' already exists");
        var h = new Hbl
        {
            TenantId         = Tid,
            CountryCode      = req.CountryCode,
            MblId            = req.MblId,
            HblNumber        = req.HblNumber,
            ShipperPartyId   = req.ShipperPartyId,
            ConsigneePartyId = req.ConsigneePartyId,
            NotifyPartyId    = req.NotifyPartyId,
            ReleaseType      = req.ReleaseType,
            IssueDate        = req.IssueDate,
            Status           = BlStatus.Issued,
        };
        db.Hbls.Add(h);
        await db.SaveChangesAsync(ct);
        return ToHblDto(h);
    }

    public async Task<AwbDto> AddAwbAsync(long shipmentId, CreateAwbRequest req, CancellationToken ct)
    {
        var s = await db.Shipments.FirstOrDefaultAsync(x => x.Id == shipmentId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"shipment {shipmentId} not found");
        var dup = await db.Awbs.AnyAsync(a => a.TenantId == Tid && a.AwbNumber == req.AwbNumber, ct);
        if (dup) throw new InvalidOperationException($"AWB '{req.AwbNumber}' already exists");
        var a = new Awb
        {
            TenantId        = Tid,
            ShipmentId      = shipmentId,
            AwbType         = req.AwbType,
            AwbNumber       = req.AwbNumber,
            ParentAwbId     = req.ParentAwbId,
            IataCarrierCode = req.IataCarrierCode,
            FlightNumber    = req.FlightNumber,
            Status          = AwbStatus.Issued,
        };
        db.Awbs.Add(a);
        await db.SaveChangesAsync(ct);
        return ToAwbDto(a);
    }

    public async Task<IReadOnlyList<MblDto>> ListMblsAsync(long shipmentId, CancellationToken ct) =>
        (await db.Mbls.AsNoTracking().Where(m => m.TenantId == Tid && m.ShipmentId == shipmentId).ToListAsync(ct))
            .Select(ToMblDto).ToList();

    public async Task<IReadOnlyList<HblDto>> ListHblsAsync(long? mblId, CancellationToken ct)
    {
        var q = db.Hbls.AsNoTracking().Where(h => h.TenantId == Tid);
        if (mblId.HasValue) q = q.Where(h => h.MblId == mblId.Value);
        return (await q.OrderByDescending(h => h.Id).Take(200).ToListAsync(ct)).Select(ToHblDto).ToList();
    }

    public async Task<IReadOnlyList<AwbDto>> ListAwbsAsync(long shipmentId, CancellationToken ct) =>
        (await db.Awbs.AsNoTracking().Where(a => a.TenantId == Tid && a.ShipmentId == shipmentId).ToListAsync(ct))
            .Select(ToAwbDto).ToList();

    /* ===== Containers ===== */

    public async Task<ContainerDto> AddContainerAsync(long shipmentId, CreateContainerRequest req, CancellationToken ct)
    {
        var s = await db.Shipments.FirstOrDefaultAsync(x => x.Id == shipmentId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"shipment {shipmentId} not found");
        var c = new Container
        {
            TenantId        = Tid,
            ShipmentId      = shipmentId,
            ContainerNumber = req.ContainerNumber,
            ContainerType   = req.ContainerType,
            SealNumber      = req.SealNumber,
            TareWeightKg    = req.TareWeightKg,
            CargoWeightKg   = req.CargoWeightKg,
            FreeDays        = req.FreeDays,
            Status          = ContainerStatus.Empty,
        };
        db.Containers.Add(c);
        await db.SaveChangesAsync(ct);
        return ToContainerDto(c);
    }

    public async Task<IReadOnlyList<ContainerDto>> ListContainersAsync(long shipmentId, CancellationToken ct) =>
        (await db.Containers.AsNoTracking().Where(c => c.TenantId == Tid && c.ShipmentId == shipmentId).ToListAsync(ct))
            .Select(ToContainerDto).ToList();

    public async Task<ContainerDto> ChangeContainerStatusAsync(long id, ContainerStatus next, CancellationToken ct)
    {
        var c = await db.Containers.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"container {id} not found");
        var now = clock.GetCurrentInstant();
        c.Status = next;
        if (next == ContainerStatus.Loaded     && c.LoadedAt is null)     c.LoadedAt = now;
        if (next == ContainerStatus.Discharged && c.DischargedAt is null) c.DischargedAt = now;
        if (next == ContainerStatus.GatedOut   && c.GateOutAt is null)    c.GateOutAt = now;
        if (next == ContainerStatus.Returned   && c.EmptyReturnedAt is null) c.EmptyReturnedAt = now;
        await db.SaveChangesAsync(ct);
        return ToContainerDto(c);
    }

    /* ===== Milestones ===== */

    public async Task<MilestoneDto> AddMilestoneAsync(long shipmentId, CreateMilestoneRequest req, CancellationToken ct)
    {
        var s = await db.Shipments.FirstOrDefaultAsync(x => x.Id == shipmentId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"shipment {shipmentId} not found");
        var m = new Milestone
        {
            TenantId       = Tid,
            ShipmentId     = shipmentId,
            MilestoneCode  = req.MilestoneCode,
            OccurredAt     = req.OccurredAt,
            LocationPortId = req.LocationPortId,
            Source         = req.Source,
            Remarks        = req.Remarks,
        };
        db.Milestones.Add(m);
        await db.SaveChangesAsync(ct);
        return ToMilestoneDto(m);
    }

    public async Task<IReadOnlyList<MilestoneDto>> ListMilestonesAsync(long shipmentId, CancellationToken ct) =>
        (await db.Milestones.AsNoTracking().Where(m => m.TenantId == Tid && m.ShipmentId == shipmentId)
            .OrderByDescending(m => m.OccurredAt).ToListAsync(ct))
            .Select(ToMilestoneDto).ToList();

    /* ===== Charges ===== */

    public async Task<ChargeLineDto> AddChargeAsync(long shipmentId, CreateChargeRequest req, CancellationToken ct)
    {
        var s = await db.Shipments.FirstOrDefaultAsync(x => x.Id == shipmentId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"shipment {shipmentId} not found");
        var c = new ChargeLine
        {
            TenantId          = Tid,
            ShipmentId        = shipmentId,
            ChargeCode        = req.ChargeCode,
            RateCardId        = req.RateCardId,
            Quantity          = req.Quantity,
            UomCode           = req.UomCode,
            UnitPriceAmount   = req.UnitPriceAmount,
            UnitPriceCurrency = req.UnitPriceCurrency,
            AmountAmount      = req.AmountAmount,
            AmountCurrency    = req.AmountCurrency,
            IsBillable        = req.IsBillable,
            InvoiceStatus     = ChargeInvoiceStatus.Pending,
        };
        db.ChargeLines.Add(c);
        await db.SaveChangesAsync(ct);
        return ToChargeDto(c);
    }

    public async Task<IReadOnlyList<ChargeLineDto>> ListChargesAsync(long shipmentId, CancellationToken ct) =>
        (await db.ChargeLines.AsNoTracking().Where(c => c.TenantId == Tid && c.ShipmentId == shipmentId).ToListAsync(ct))
            .Select(ToChargeDto).ToList();

    /* ===== Read-only roll-ups ===== */

    public async Task<IReadOnlyList<ConsolDto>> ListConsolsAsync(CancellationToken ct) =>
        (await db.Consols.AsNoTracking().Where(c => c.TenantId == Tid)
            .OrderByDescending(c => c.CreatedAt).Take(100).ToListAsync(ct))
            .Select(c => new ConsolDto(c.Id, c.ConsolNumber, c.ConsolType, c.MasterShipmentId, c.Status, c.CreatedAt)).ToList();

    public async Task<IReadOnlyList<DemurrageEventDto>> ListDemurrageAsync(long? containerId, CancellationToken ct)
    {
        var q = db.DemurrageEvents.AsNoTracking().Where(d => d.TenantId == Tid);
        if (containerId.HasValue) q = q.Where(d => d.ContainerId == containerId.Value);
        var rows = await q.OrderByDescending(d => d.StartDate).Take(200).ToListAsync(ct);
        return rows.Select(d => new DemurrageEventDto(
            d.Id, d.ContainerId, d.EventType, d.StartDate, d.EndDate, d.Days,
            d.RateAmount, d.RateCurrency, d.TotalAmount, d.TotalCurrency, d.Status)).ToList();
    }

    /* ===== SCM Milestone 1 â€” internal memo notes ===== */

    public async Task<ShipmentMemoDto> AddMemoAsync(long shipmentId, AddMemoRequest req, CancellationToken ct)
    {
        var s = await db.Shipments.FirstOrDefaultAsync(x => x.Id == shipmentId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"shipment {shipmentId} not found");
        var m = new ShipmentMemo
        {
            TenantId = Tid, ShipmentId = shipmentId,
            AuthorUserId = req.AuthorUserId,
            Body = req.Body, IsPinned = req.IsPinned,
            CreatedAt = clock.GetCurrentInstant(),
        };
        db.Memos.Add(m);
        await db.SaveChangesAsync(ct);
        return ToMemoDto(m);
    }

    public async Task<IReadOnlyList<ShipmentMemoDto>> ListMemosAsync(long shipmentId, CancellationToken ct) =>
        (await db.Memos.AsNoTracking()
            .Where(m => m.TenantId == Tid && m.ShipmentId == shipmentId)
            .OrderByDescending(m => m.IsPinned).ThenByDescending(m => m.CreatedAt)
            .Take(200).ToListAsync(ct))
            .Select(ToMemoDto).ToList();

    private static ShipmentMemoDto ToMemoDto(ShipmentMemo m) =>
        new(m.Id, m.ShipmentId, m.AuthorUserId, m.Body, m.IsPinned, m.CreatedAt);

    /* ===== SCM Milestone 1+2 â€” watchlist (starred shipments per user) ===== */

    public async Task<bool> StarShipmentAsync(long shipmentId, string userSub, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(userSub)) throw new InvalidOperationException("user_sub is required");
        var shipExists = await db.Shipments.AsNoTracking().AnyAsync(x => x.Id == shipmentId && x.TenantId == Tid, ct);
        if (!shipExists) throw new InvalidOperationException($"shipment {shipmentId} not found");
        var existing = await db.Watchlist.FirstOrDefaultAsync(
            w => w.TenantId == Tid && w.UserSub == userSub && w.ShipmentId == shipmentId, ct);
        if (existing is not null) return false;
        db.Watchlist.Add(new UserWatchlistEntry
        {
            TenantId = Tid, UserSub = userSub, ShipmentId = shipmentId,
            StarredAt = clock.GetCurrentInstant(),
        });
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> UnstarShipmentAsync(long shipmentId, string userSub, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(userSub)) throw new InvalidOperationException("user_sub is required");
        var existing = await db.Watchlist.FirstOrDefaultAsync(
            w => w.TenantId == Tid && w.UserSub == userSub && w.ShipmentId == shipmentId, ct);
        if (existing is null) return false;
        db.Watchlist.Remove(existing);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<long>> ListWatchlistShipmentIdsAsync(string userSub, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(userSub)) return Array.Empty<long>();
        return await db.Watchlist.AsNoTracking()
            .Where(w => w.TenantId == Tid && w.UserSub == userSub)
            .OrderByDescending(w => w.StarredAt)
            .Select(w => w.ShipmentId).ToListAsync(ct);
    }

    /* ===== SCM Milestone 1+2 â€” operational holds ===== */

    public async Task<ShipmentHoldDto> PlaceHoldAsync(long shipmentId, PlaceHoldRequest req, long? raisedByUserId, CancellationToken ct)
    {
        var s = await db.Shipments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == shipmentId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"shipment {shipmentId} not found");
        // Don't double-stack the same active hold type â€” return the existing one.
        var existing = await db.Holds.FirstOrDefaultAsync(
            h => h.ShipmentId == shipmentId && h.HoldType == req.HoldType && h.ClearedAt == null && h.TenantId == Tid, ct);
        if (existing is not null) return ToHoldDto(existing);
        var h = new ShipmentHold
        {
            TenantId = Tid, ShipmentId = shipmentId,
            HoldType = req.HoldType, Reason = req.Reason,
            RaisedBy = raisedByUserId, RaisedAt = clock.GetCurrentInstant(),
        };
        db.Holds.Add(h);
        await db.SaveChangesAsync(ct);
        return ToHoldDto(h);
    }

    public async Task<ShipmentHoldDto> ClearHoldAsync(long holdId, ClearHoldRequest req, long? clearedByUserId, CancellationToken ct)
    {
        var h = await db.Holds.FirstOrDefaultAsync(x => x.Id == holdId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"hold {holdId} not found");
        if (h.ClearedAt is not null) return ToHoldDto(h);  // already cleared, idempotent
        h.ClearedBy = clearedByUserId;
        h.ClearedAt = clock.GetCurrentInstant();
        h.ResolutionNote = req.ResolutionNote;
        await db.SaveChangesAsync(ct);
        return ToHoldDto(h);
    }

    public async Task<IReadOnlyList<ShipmentHoldDto>> ListHoldsAsync(long shipmentId, bool includeCleared, CancellationToken ct)
    {
        var q = db.Holds.AsNoTracking().Where(h => h.TenantId == Tid && h.ShipmentId == shipmentId);
        if (!includeCleared) q = q.Where(h => h.ClearedAt == null);
        var rows = await q.OrderByDescending(h => h.RaisedAt).ToListAsync(ct);
        return rows.Select(ToHoldDto).ToList();
    }

    private static ShipmentHoldDto ToHoldDto(ShipmentHold h) => new(
        h.Id, h.ShipmentId, h.HoldType, h.Reason,
        h.RaisedBy, h.RaisedAt,
        h.ClearedBy, h.ClearedAt, h.ResolutionNote,
        IsActive: h.ClearedAt == null);

    /* ===== SCM Milestone 1+2 â€” date-driven reminders ===== */

    public async Task<ShipmentReminderDto> AddReminderAsync(long shipmentId, AddReminderRequest req, CancellationToken ct)
    {
        var s = await db.Shipments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == shipmentId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"shipment {shipmentId} not found");
        var now = clock.GetCurrentInstant();
        var r = new ShipmentReminder
        {
            TenantId = Tid, ShipmentId = shipmentId, ContainerId = req.ContainerId,
            ReminderKind = req.ReminderKind, Title = req.Title, Notes = req.Notes,
            DueAt = req.DueAt, AssignedUserSub = req.AssignedUserSub,
            Status = ReminderStatus.Pending,
            CreatedAt = now, ModifiedAt = now,
        };
        db.Reminders.Add(r);
        await db.SaveChangesAsync(ct);
        return ToReminderDto(r);
    }

    public async Task<IReadOnlyList<ShipmentReminderDto>> ListRemindersAsync(ReminderListQuery q, CancellationToken ct)
    {
        var query = db.Reminders.AsNoTracking().Where(r => r.TenantId == Tid);
        if (q.ShipmentId.HasValue)            query = query.Where(r => r.ShipmentId == q.ShipmentId.Value);
        if (q.Status.HasValue)                query = query.Where(r => r.Status == q.Status.Value);
        if (!string.IsNullOrEmpty(q.AssignedUserSub)) query = query.Where(r => r.AssignedUserSub == q.AssignedUserSub);
        if (q.DueNow)
        {
            var now = clock.GetCurrentInstant();
            query = query.Where(r => r.Status == ReminderStatus.Pending && r.DueAt <= now);
        }
        var page = Math.Max(q.Page, 1);
        var ps = q.PageSize is <= 0 or > 200 ? 100 : q.PageSize;
        var rows = await query.OrderBy(r => r.DueAt).Skip((page - 1) * ps).Take(ps).ToListAsync(ct);
        return rows.Select(ToReminderDto).ToList();
    }

    public async Task<ShipmentReminderDto> ChangeReminderStatusAsync(long reminderId, ReminderStatus next, Instant? snoozeUntil, CancellationToken ct)
    {
        var r = await db.Reminders.FirstOrDefaultAsync(x => x.Id == reminderId && x.TenantId == Tid, ct)
            ?? throw new InvalidOperationException($"reminder {reminderId} not found");
        r.Status = next;
        // Snooze pushes the due date forward; everything else just moves status.
        if (next == ReminderStatus.Snoozed && snoozeUntil.HasValue)
        {
            r.DueAt  = snoozeUntil.Value;
            r.Status = ReminderStatus.Pending;  // a "snooze" returns to Pending at the new due date
        }
        r.ModifiedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(ct);
        return ToReminderDto(r);
    }

    /// <summary>
    /// Phase-1 implementation of the reminder dispatcher. Pulls all Pending
    /// reminders with DueAt &lt;= now, marks them Sent, stamps LastFiredAt.
    /// In Phase 5 a Hangfire recurring job calls this; in Phase 1 the Reminders
    /// page exposes a "Run due reminders" button that fires the same handler.
    /// Email dispatch is intentionally NOT wired here yet â€” the visible state
    /// change in the UI is enough for the milestone close. Email goes through
    /// M27 when AssignedUserSub mapping to address is added (Phase 5).
    /// </summary>
    public async Task<RemindersFiredDto> RunDueRemindersAsync(CancellationToken ct)
    {
        var now = clock.GetCurrentInstant();
        var due = await db.Reminders
            .Where(r => r.TenantId == Tid && r.Status == ReminderStatus.Pending && r.DueAt <= now)
            .ToListAsync(ct);
        if (due.Count == 0) return new RemindersFiredDto(0, 0, 0);
        foreach (var r in due)
        {
            r.Status = ReminderStatus.Sent;
            r.LastFiredAt = now;
            r.ModifiedAt = now;
        }
        await db.SaveChangesAsync(ct);
        return new RemindersFiredDto(due.Count, due.Count, 0);
    }

    private static ShipmentReminderDto ToReminderDto(ShipmentReminder r) => new(
        r.Id, r.ShipmentId, r.ContainerId,
        r.ReminderKind, r.Title, r.Notes,
        r.DueAt, r.AssignedUserSub,
        r.Status, r.CreatedAt, r.ModifiedAt, r.LastFiredAt);

    /* ===== mappers ===== */

    private async Task<BookingDto> ToBookingDtoAsync(Booking b, CancellationToken ct)
    {
        var n = await db.BookingLines.AsNoTracking().CountAsync(l => l.BookingId == b.Id, ct);
        return ToBookingDtoSync(b, n);
    }

    private static BookingDto ToBookingDtoSync(Booking b, int lineCount) => new(
        b.Id, b.TenantId, b.CountryCode, b.BookingNumber, b.CustomerPartyId,
        b.TradeDirection, b.Mode, b.ServiceType, b.Incoterm,
        b.OriginPortId, b.DestinationPortId,
        b.ExpectedPickupDate, b.ExpectedDeliveryDate, b.Status,
        b.TotalPieces, b.TotalGrossWeightKg, b.TotalVolumeCbm,
        b.DeclaredValueAmount, b.DeclaredValueCurrency,
        b.EstimatedCrd, b.FfAssignedPartyId,
        lineCount, b.CreatedAt, b.ModifiedAt);

    private static BookingLineDto ToLineDto(BookingLine l) => new(
        l.Id, l.BookingId, l.LineNumber, l.Description,
        l.HsCode, l.Pieces, l.PackagingType, l.GrossWeightKg, l.VolumeCbm, l.IsHazmat, l.IsPerishable);

    private async Task<ShipmentDto> ToShipmentDtoAsync(Shipment s, CancellationToken ct)
    {
        var c = await db.Containers.AsNoTracking().CountAsync(x => x.ShipmentId == s.Id, ct);
        var m = await db.Milestones.AsNoTracking().CountAsync(x => x.ShipmentId == s.Id, ct);
        var hc = await db.Holds.AsNoTracking().CountAsync(h => h.ShipmentId == s.Id && h.ClearedAt == null, ct);
        var nowI = clock.GetCurrentInstant();
        var dr = await db.Reminders.AsNoTracking().CountAsync(
            r => r.ShipmentId == s.Id && r.Status == ReminderStatus.Pending && r.DueAt <= nowI, ct);
        // IsStarred is per-user; non-list callers (Get/Status-change) don't have a UserSub in scope, so default false.
        return ToShipmentDtoSync(s, c, m, isStarred: false, activeHoldCount: hc, dueReminderCount: dr);
    }

    private static ShipmentDto ToShipmentDtoSync(
        Shipment s, int containerCount, int milestoneCount, bool isStarred,
        int activeHoldCount, int dueReminderCount) => new(
        s.Id, s.TenantId, s.CountryCode, s.ShipmentNumber, s.BookingId,
        s.Mode, s.CarrierPartyId, s.VesselOrFlight, s.VoyageOrFlightNo,
        s.Etd, s.Eta, s.Atd, s.Ata,
        s.OriginPortId, s.DestinationPortId, s.Status,
        containerCount, milestoneCount, isStarred,
        activeHoldCount, dueReminderCount,
        s.CreatedAt, s.ModifiedAt);

    private static MblDto ToMblDto(Mbl m) => new(
        m.Id, m.ShipmentId, m.CountryCode, m.MblNumber, m.BlType,
        m.IssuedByCarrierPartyId, m.ReleaseType, m.IssueDate, m.OnBoardDate, m.DocumentId, m.Status);

    private static HblDto ToHblDto(Hbl h) => new(
        h.Id, h.MblId, h.CountryCode, h.HblNumber,
        h.ShipperPartyId, h.ConsigneePartyId, h.NotifyPartyId,
        h.ReleaseType, h.IssueDate, h.DocumentId, h.Status);

    private static AwbDto ToAwbDto(Awb a) => new(
        a.Id, a.ShipmentId, a.AwbType, a.AwbNumber, a.ParentAwbId,
        a.IataCarrierCode, a.FlightNumber, a.DocumentId, a.Status);

    private static ContainerDto ToContainerDto(Container c) => new(
        c.Id, c.ShipmentId, c.ContainerNumber, c.ContainerType,
        c.SealNumber, c.TareWeightKg, c.CargoWeightKg,
        c.PackedAt, c.LoadedAt, c.DischargedAt, c.GateOutAt,
        c.FreeDays, c.Status);

    private static MilestoneDto ToMilestoneDto(Milestone m) => new(
        m.Id, m.ShipmentId, m.MilestoneCode, m.OccurredAt,
        m.LocationPortId, m.Source, m.Remarks);

    private static ChargeLineDto ToChargeDto(ChargeLine c) => new(
        c.Id, c.ShipmentId, c.ChargeCode, c.RateCardId,
        c.Quantity, c.UomCode,
        c.UnitPriceAmount, c.UnitPriceCurrency,
        c.AmountAmount, c.AmountCurrency,
        c.IsBillable, c.InvoiceStatus);
}
