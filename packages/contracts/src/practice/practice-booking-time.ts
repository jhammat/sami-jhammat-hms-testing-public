import type {
  CalendarDate,
  LocalTime,
  Weekday,
} from "../index";

const WEEKDAYS: readonly Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function readZonedParts(
  value: Date,
  timeZone: string,
): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

/** Converts a clinic-local date and time to an absolute instant. */
export function practiceLocalDateTimeToDate(
  localDate: CalendarDate,
  localTime: LocalTime,
  timeZone: string,
): Date {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute, second = 0] = localTime.split(":").map(Number);
  if ([year, month, day, hour, minute, second].some((part) => !Number.isInteger(part))) {
    return new Date(Number.NaN);
  }
  const desiredAsUtc = Date.UTC(year!, month! - 1, day!, hour!, minute!, second);
  let candidate = desiredAsUtc;
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = readZonedParts(new Date(candidate), timeZone);
    const observedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    candidate += desiredAsUtc - observedAsUtc;
  }
  return new Date(candidate);
}

export function getPracticeLocalDate(value: Date, timeZone: string): CalendarDate {
  const parts = readZonedParts(value, timeZone);
  return [parts.year, parts.month, parts.day].join("-");
}

export function addPracticeCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year!, month! - 1, day! + days));
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function getPracticeCalendarWeekday(date: CalendarDate): Weekday {
  const [year, month, day] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay()]!;
}
