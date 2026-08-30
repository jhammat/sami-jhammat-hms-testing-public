/**
 * Calendar days in the hospital's own timezone.
 *
 * Every "today" screen in the product used to build its window as
 * `new Date(\`${date}T00:00:00.000Z\`)` through `T23:59:59.999Z` — the UTC
 * day. Pakistan is UTC+5, so between midnight and 05:00 local the server's
 * "today" and the hospital's "today" are different days, and the split falls
 * in the middle of a night shift. Measured on real seeded data at 03:01
 * local: the clinic list held four appointments, the dashboard reported one.
 *
 * A calendar day is a property of a place, not of the server. These helpers
 * take the timezone explicitly so the caller has to say which place it means.
 *
 * What is deliberately NOT here: `@db.Date` columns. A date-only column has
 * no time component, and storing UTC midnight in it is the correct and
 * conventional encoding. `Patient.dateOfBirth`, `Queue.queueDate` and
 * `DoctorSitting.businessDate` keep doing exactly what they did — converting
 * those would shift dates by a day, which is the bug rather than the fix.
 */

/** The calendar date `instant` falls on in `timeZone`, as `YYYY-MM-DD`. */
export function businessDateIn(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Today's calendar date in `timeZone`, as `YYYY-MM-DD`. */
export function todayIn(timeZone: string): string {
  return businessDateIn(new Date(), timeZone);
}

/**
 * The offset of `timeZone` from UTC at `instant`, in minutes.
 *
 * Read from the zone itself rather than assumed, so a zone that observes
 * daylight saving gives the offset in force on that date instead of a fixed
 * one. `Asia/Karachi` does not, but `Europe/London` and `America/New_York`
 * do, and a hospital in either would otherwise see its day slip by an hour
 * for half the year.
 */
function offsetMinutes(instant: Date, timeZone: string): number {
  // `en-CA` with these options formats as `YYYY-MM-DD, HH:MM:SS`, which
  // Date.UTC can be fed directly. Comparing that reading against the same
  // instant in UTC gives the offset without hard-coding a table.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  // `hour` comes back as 24 at midnight under hour12:false in some engines.
  const hour = read("hour") % 24;

  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    hour,
    read("minute"),
    read("second"),
  );

  return Math.round((asUtc - instant.getTime()) / 60_000);
}

export interface DayWindow {
  /** First instant of the local day, in UTC. */
  start: Date;
  /** Last instant of the local day, in UTC. */
  end: Date;
}

/**
 * The UTC instants bounding a local calendar day.
 *
 * For `2026-08-30` in `Asia/Karachi` this is `2026-08-29T19:00:00.000Z`
 * through `2026-08-30T18:59:59.999Z` — which is what a Pakistani hospital
 * means by "the thirtieth", and what the UTC-day version got wrong.
 *
 * The offset is resolved twice: once from an approximate instant to find the
 * likely offset, then again from the candidate start. That second pass is
 * what keeps the window correct on a daylight-saving boundary, where the
 * offset at local midnight differs from the offset at midday.
 */
export function dayWindowIn(date: string, timeZone: string): DayWindow {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid business date: ${date}`);
  }

  const naiveMidnightUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  const firstPass = offsetMinutes(new Date(naiveMidnightUtc), timeZone);
  const candidate = new Date(naiveMidnightUtc - firstPass * 60_000);

  const secondPass = offsetMinutes(candidate, timeZone);
  const start = new Date(naiveMidnightUtc - secondPass * 60_000);

  // The end is derived from the NEXT local midnight rather than by adding 24
  // hours, so a day that is 23 or 25 hours long across a clock change still
  // ends where the local calendar says it does.
  const nextNaiveMidnightUtc = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0);
  const nextFirstPass = offsetMinutes(new Date(nextNaiveMidnightUtc), timeZone);
  const nextCandidate = new Date(nextNaiveMidnightUtc - nextFirstPass * 60_000);
  const nextSecondPass = offsetMinutes(nextCandidate, timeZone);
  const nextStart = new Date(nextNaiveMidnightUtc - nextSecondPass * 60_000);

  return { start, end: new Date(nextStart.getTime() - 1) };
}

/** A Prisma filter for a timestamp column falling on a local calendar day. */
export function dayFilterIn(date: string, timeZone: string): { gte: Date; lte: Date } {
  const { start, end } = dayWindowIn(date, timeZone);
  return { gte: start, lte: end };
}
