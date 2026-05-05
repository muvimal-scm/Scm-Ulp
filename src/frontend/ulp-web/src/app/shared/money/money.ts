/**
 * Mirror of the backend Money type.
 * API JSON shape: { "amount": "1180.00", "currency": "INR" } — amount is a string.
 */
export interface Money {
  amount: string;
  currency: string;
}

const MINOR_UNITS: Record<string, number> = {
  INR: 2, USD: 2, EUR: 2, GBP: 2, CAD: 2, AUD: 2, SGD: 2,
  JPY: 0, KRW: 0,
  BHD: 3, KWD: 3, OMR: 3,
};

export function formatMoney(money: Money, locale: string): string {
  const minor = MINOR_UNITS[money.currency] ?? 2;
  const value = Number.parseFloat(money.amount);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: minor,
    maximumFractionDigits: minor,
  }).format(value);
}

export function moneyZero(currency: string): Money {
  const minor = MINOR_UNITS[currency] ?? 2;
  return { amount: (0).toFixed(minor), currency };
}
