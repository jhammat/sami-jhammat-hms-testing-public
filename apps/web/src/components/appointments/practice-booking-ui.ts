import type {
  PracticeMoney,
  PracticeSlot,
} from "@wonflow/contracts";

import {
  addPracticeCalendarDays,
  getPracticeLocalDate,
} from "@wonflow/contracts";

export function formatPracticeBookingMoney(
  money: PracticeMoney,
  locale?: string,
): string {
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: money.currencyCode,
    });
    const resolvedOptions = formatter.resolvedOptions();
    const fractionDigits = resolvedOptions.maximumFractionDigits
      ?? resolvedOptions.minimumFractionDigits
      ?? 0;
    const divisor = 10 ** fractionDigits;
    return formatter.format(money.amountMinorUnits / divisor);
  } catch {
    return [
      money.amountMinorUnits.toLocaleString(locale),
      "minor units",
      money.currencyCode,
    ].join(" ");
  }
}

export function formatPracticeBookingSlot(
  slot: PracticeSlot,
  timezone: string,
  locale?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(new Date(slot.startsAt));
}

export function getPracticeBookingDateBounds(
  timezone: string,
  bookingHorizonDays: number,
  now: Date,
): {
  minimumDate: string;
  maximumDate: string;
} {
  const minimumDate = getPracticeLocalDate(now, timezone);
  return {
    minimumDate,
    maximumDate: addPracticeCalendarDays(minimumDate, bookingHorizonDays),
  };
}

export function createPracticeBookingIdempotencyKey(): string {
  return ["practice-booking", crypto.randomUUID()].join(":");
}
