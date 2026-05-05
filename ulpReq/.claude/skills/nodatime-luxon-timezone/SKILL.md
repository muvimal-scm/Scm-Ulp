---
name: nodatime-luxon-timezone
description: ULP v2.0 time and timezone handling — NodaTime on the .NET server, Luxon on the Angular client, IANA timezone IDs end-to-end. Use whenever code touches dates, times, or timezones — invoice posting dates, payroll cutoffs, customs filing windows, scheduled jobs, audit timestamps. Server-side `DateTime` and `DateTime.Now` are FORBIDDEN; use `Instant`/`ZonedDateTime`/`LocalDate` from NodaTime. Tenant timezone comes from `ITenantContext.Timezone`.
---

# NodaTime + Luxon + IANA Timezone Handling for ULP v2.0

## When this skill triggers
Any code reading or writing dates, times, intervals, durations; scheduling jobs; computing business-day windows; emitting timestamps to logs/audits; rendering dates to users; computing tax periods, fiscal years, or payroll windows.

## Top 3 reference repos
1. **nodatime/nodatime** (https://github.com/nodatime/nodatime) — Official. Read the user guide (`docs/`) front to back; this is the canonical reference.
2. **moment/luxon** (https://github.com/moment/luxon) — Official Luxon repo; modern replacement for Moment.js used in our Angular client.
3. **eggert/tz** (https://github.com/eggert/tz) — IANA TZ database source; ID conventions and update cadence.

## Core types — pick the right one

| NodaTime type | Use for |
|---|---|
| `Instant` | Point in time, UTC, no human calendar concept (audit log timestamp, message published-at) |
| `ZonedDateTime` | Instant projected into a specific timezone (display in tenant TZ) |
| `LocalDate` | Calendar date with no time (invoice date, birth date, statutory due date) |
| `LocalTime` | Time of day with no date (cutoff time "16:00") |
| `LocalDateTime` | Calendar moment without zone (form input before zone applied) |
| `Duration` | Elapsed time (job duration) |
| `Period` | Calendar arithmetic (months, years) — DST-safe |
| `Offset` | Fixed offset from UTC (rarely used directly) |

**Rule:** persist `Instant` for "when did this happen" events; persist `LocalDate` for calendar-only fields (invoice date, due date); never persist `DateTime` or `DateTimeOffset` in v2.0.

## Standard server setup

```csharp
// Program.cs — register clock and time zone provider
builder.Services.AddSingleton<IClock>(SystemClock.Instance);
builder.Services.AddSingleton<IDateTimeZoneProvider>(DateTimeZoneProviders.Tzdb);

// Inject and use:
public class InvoicePostingService(IClock clock, IDateTimeZoneProvider tz, ITenantContext tenant)
{
    public async Task<Invoice> PostAsync(InvoiceDraft d, CancellationToken ct)
    {
        var now      = clock.GetCurrentInstant();          // UTC, always
        var tenantTz = tz[tenant.Timezone];                // e.g., "Asia/Kolkata"
        var tenantNow = now.InZone(tenantTz);              // ZonedDateTime
        var postingDate = tenantNow.Date;                  // LocalDate in tenant TZ

        // Persist Instant for event time, LocalDate for calendar date
        return new Invoice {
            PostedAt    = now,            // Instant (UTC) → BIGINT(microseconds since epoch)
            PostingDate = postingDate     // LocalDate → DATE column
        };
    }
}
```

## Database column conventions

```sql
-- Calendar date (no time, no zone)
posting_date     DATE             NOT NULL,

-- Instant (event time)
posted_at_utc    BIGINT           NOT NULL,  -- microseconds since Unix epoch
                                              -- alternative: TIMESTAMP(6) UTC

-- Tenant-local time of day stored separately when relevant
cutoff_time      TIME(0)          NOT NULL,

-- IANA tz ID for display preferences
display_tz       VARCHAR(64)      NOT NULL DEFAULT 'Asia/Kolkata',
```

EF Core 8 mappings via `ValueConverter`:

```csharp
modelBuilder.Entity<Invoice>(b =>
{
    b.Property(i => i.PostedAt)
     .HasConversion(
        v => v.ToUnixTimeMilliseconds(),
        v => Instant.FromUnixTimeMilliseconds(v));

    b.Property(i => i.PostingDate)
     .HasConversion(
        v => v.ToDateOnly(),
        v => LocalDate.FromDateOnly(v));
});
```

## Client-side (Angular) with Luxon

```typescript
import { DateTime } from 'luxon';

// Receive Instant from API as ISO 8601 string
const postedAt = DateTime.fromISO(invoice.postedAt, { zone: 'utc' });

// Project into tenant's timezone for display
const tenantLocal = postedAt.setZone(tenant.timezone);   // 'Asia/Kolkata' | 'America/New_York'

// Format with locale
const formatted = tenantLocal.toLocaleString(DateTime.DATETIME_FULL, { locale: tenant.locale });
// → "2 May 2026, 14:30:00 IST" for en-IN
// → "May 2, 2026, 2:30:00 PM EDT" for en-US
```

## Scheduled jobs in tenant timezone

Hangfire / cron expressions are naive about timezones. Always convert tenant-local schedule to UTC at registration:

```csharp
// "Run at 02:00 in tenant's timezone" → compute UTC for next occurrence
var tenantLocal = new LocalDateTime(today.Year, today.Month, today.Day, 2, 0);
var zoned       = tenantLocal.InZoneStrictly(tz[tenant.Timezone]);
var nextUtc     = zoned.ToInstant().ToDateTimeUtc();
hangfire.Schedule(() => Job(tenant.Id), nextUtc - DateTime.UtcNow);
```

For DST-affected zones, prefer `InZoneLeniently` and document the choice for spring-forward gaps.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| `DateTime.Now` anywhere | Replaced by `IClock.GetCurrentInstant()` (UTC) |
| `DateTime.UtcNow` in services | Still bad — inject `IClock` so tests can mock |
| Storing tenant-local times as naive `DateTime` | Store `Instant` (event) or `LocalDate` + tz separately (calendar) |
| Cron jobs at "2 AM" without timezone | Always specify timezone; convert to UTC at registration |
| DST spring-forward gap (02:00–03:00 doesn't exist on certain dates) | Use `InZoneStrictly` and handle exception, or `InZoneLeniently` |
| DST fall-back overlap (01:30 happens twice) | Use `InZoneStrictly` and pick the resolver explicitly |
| Using `JS Date` on the client | Use Luxon `DateTime` everywhere; `JS Date` is timezone-naive in display |
| Hardcoded "IST" or "EDT" abbreviations | Use IANA IDs only ("Asia/Kolkata", "America/New_York"); abbreviations are ambiguous |

## Audit log convention

```json
{
  "timestamp": "2026-05-02T09:00:00Z",        // Instant, ISO 8601, always UTC, always with "Z"
  "tenantTimezone": "Asia/Kolkata",            // for replay tools
  "tenantLocalTime": "2026-05-02T14:30:00+05:30"  // optional convenience
}
```

## DO and DON'T

| DO | DON'T |
|---|---|
| Inject `IClock`; never call static "now" | Don't use `DateTime.Now` or `DateTime.UtcNow` directly |
| Use `Instant` for event time, `LocalDate` for calendar dates | Don't conflate the two |
| Use IANA tz IDs end-to-end | Don't use Windows tz IDs ("India Standard Time") or abbreviations ("IST") |
| Convert tenant-local to UTC at job registration | Don't pass tenant-local times to schedulers |
| Format on the client with Luxon + locale | Don't format on the server in a tenant locale; emit raw |
| Cover DST transitions in tests | Don't assume DST never happens — US has it, India doesn't |

## See also
- `multi-region-tenant-context` — provides `tenant.Timezone` and `tenant.Locale`.
- `serilog-logging` — `timestamp` field convention is `Instant` UTC ISO 8601.
- `hangfire-jobs` — scheduling pattern with explicit UTC conversion.
