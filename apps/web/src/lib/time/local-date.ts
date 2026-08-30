/**
 * Today, as the person looking at the screen would write it.
 *
 * `new Date().toISOString().slice(0, 10)` is the UTC date, and every date
 * picker in the product used it to seed itself. East of Greenwich that is
 * wrong for the first hours of every day: at 03:00 in Karachi it offers
 * yesterday, so a receptionist opening the appointment book overnight is
 * shown the previous day's list and has to notice and correct it.
 *
 * `en-CA` formats as `YYYY-MM-DD`, which is the format every date input and
 * query parameter in the product already expects.
 */
export function todayLocalDate(): string {
  return toLocalDate(new Date());
}

/** The calendar date `instant` falls on in the viewer's own timezone. */
export function toLocalDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** `days` from today, as a local `YYYY-MM-DD`. Negative goes backwards. */
export function localDateOffsetByDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalDate(date);
}
