import { DateTime } from 'luxon';

/** Convert an API ISO 8601 timestamp into the tenant's local Luxon DateTime. */
export function toTenantLocal(isoUtc: string, tenantTimezone: string): DateTime {
  return DateTime.fromISO(isoUtc, { zone: 'utc' }).setZone(tenantTimezone);
}

/** Format an API ISO 8601 timestamp in the tenant's locale + timezone. */
export function formatInstant(
  isoUtc: string,
  tenantTimezone: string,
  tenantLocale: string,
  format: 'date' | 'datetime' | 'time' = 'datetime'
): string {
  const dt = toTenantLocal(isoUtc, tenantTimezone).setLocale(tenantLocale);
  switch (format) {
    case 'date': return dt.toLocaleString(DateTime.DATE_MED);
    case 'time': return dt.toLocaleString(DateTime.TIME_SIMPLE);
    case 'datetime':
    default: return dt.toLocaleString(DateTime.DATETIME_MED);
  }
}
