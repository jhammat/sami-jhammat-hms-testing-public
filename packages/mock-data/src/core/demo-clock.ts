import type {
  IsoDateTime,
} from "@wonflow/contracts";

export const WONFLOW_DEMO_ANCHOR_DATE_TIME =
  "2026-07-25T08:00:00+05:00" as IsoDateTime;

export function addMinutesToIsoDateTime(
  source: IsoDateTime,
  minutes: number,
): IsoDateTime {
  const sourceTime =
    Date.parse(source);

  if (Number.isNaN(sourceTime)) {
    throw new Error(
      "The source date-time is invalid.",
    );
  }

  return new Date(
    sourceTime +
    minutes * 60_000,
  ).toISOString() as IsoDateTime;
}

export function addDaysToIsoDateTime(
  source: IsoDateTime,
  days: number,
): IsoDateTime {
  return addMinutesToIsoDateTime(
    source,
    days * 24 * 60,
  );
}

export function createDateOfBirth(
  ageYears: number,
  month: number,
  day: number,
): string {
  const anchor =
    new Date(WONFLOW_DEMO_ANCHOR_DATE_TIME);

  const year =
    anchor.getUTCFullYear() - ageYears;

  const date = new Date(
    Date.UTC(
      year,
      Math.max(0, Math.min(11, month)),
      Math.max(1, Math.min(28, day)),
    ),
  );

  return date
    .toISOString()
    .slice(0, 10);
}