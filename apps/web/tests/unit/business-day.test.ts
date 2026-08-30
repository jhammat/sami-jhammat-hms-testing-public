import { describe, expect, it } from "vitest";

import { businessDateIn, dayWindowIn, todayIn } from "@/server/time/business-day";

/**
 * A calendar day belongs to a place.
 *
 * These cases are the ones the UTC-day version got wrong: a hospital east of
 * Greenwich in the small hours, and any hospital at all across a clock
 * change. The Karachi numbers are the exact window the doctor dashboard was
 * missing when it reported one appointment on a list of four.
 */
describe("business day windows", () => {
  it("bounds a Karachi day at 19:00 the previous UTC day", () => {
    const { start, end } = dayWindowIn("2026-08-30", "Asia/Karachi");

    // Asia/Karachi is UTC+5 year round.
    expect(start.toISOString()).toBe("2026-08-29T19:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-30T18:59:59.999Z");
  });

  it("includes an appointment at 00:31 local, which the UTC day excluded", () => {
    const { start, end } = dayWindowIn("2026-08-30", "Asia/Karachi");

    // 2026-08-29T19:31Z is 00:31 on the 30th in Karachi.
    const justAfterLocalMidnight = new Date("2026-08-29T19:31:04.625Z");

    expect(justAfterLocalMidnight >= start).toBe(true);
    expect(justAfterLocalMidnight <= end).toBe(true);

    // The old behaviour, for contrast: the UTC day for "2026-08-30" starts at
    // midnight UTC, which is 05:00 local, and misses it entirely.
    expect(justAfterLocalMidnight >= new Date("2026-08-30T00:00:00.000Z")).toBe(false);
  });

  it("excludes the instant just before the local day begins", () => {
    const { start } = dayWindowIn("2026-08-30", "Asia/Karachi");
    expect(new Date("2026-08-29T18:59:59.999Z") < start).toBe(true);
  });

  it("is exactly 24 hours on an ordinary day", () => {
    const { start, end } = dayWindowIn("2026-08-30", "Asia/Karachi");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it("behaves as the plain UTC day when the zone is UTC", () => {
    const { start, end } = dayWindowIn("2026-08-30", "UTC");

    expect(start.toISOString()).toBe("2026-08-30T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-30T23:59:59.999Z");
  });

  it("handles a zone west of Greenwich", () => {
    const { start, end } = dayWindowIn("2026-08-30", "America/New_York");

    // EDT is UTC-4 in August.
    expect(start.toISOString()).toBe("2026-08-30T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-31T03:59:59.999Z");
  });

  it("gives a 23-hour day when the clocks go forward", () => {
    // London moves to BST at 01:00 UTC on 29 March 2026.
    const { start, end } = dayWindowIn("2026-03-29", "Europe/London");
    const hours = (end.getTime() + 1 - start.getTime()) / 3_600_000;

    expect(hours).toBe(23);
  });

  it("gives a 25-hour day when the clocks go back", () => {
    // London returns to GMT at 02:00 local on 25 October 2026.
    const { start, end } = dayWindowIn("2026-10-25", "Europe/London");
    const hours = (end.getTime() + 1 - start.getTime()) / 3_600_000;

    expect(hours).toBe(25);
  });

  it("leaves no gap or overlap between consecutive days", () => {
    const first = dayWindowIn("2026-03-29", "Europe/London");
    const second = dayWindowIn("2026-03-30", "Europe/London");

    expect(second.start.getTime() - first.end.getTime()).toBe(1);
  });

  it("reads the calendar date an instant falls on", () => {
    // 19:31 UTC on the 29th is already the 30th in Karachi.
    expect(businessDateIn(new Date("2026-08-29T19:31:00.000Z"), "Asia/Karachi")).toBe("2026-08-30");
    expect(businessDateIn(new Date("2026-08-29T19:31:00.000Z"), "UTC")).toBe("2026-08-29");
  });

  it("round-trips: today's date in a zone is inside that zone's day window", () => {
    for (const zone of ["Asia/Karachi", "UTC", "America/New_York", "Europe/London"]) {
      const today = todayIn(zone);
      const { start, end } = dayWindowIn(today, zone);
      const now = new Date();

      expect(now >= start, `${zone} start`).toBe(true);
      expect(now <= end, `${zone} end`).toBe(true);
    }
  });

  it("refuses a malformed date rather than silently returning the epoch", () => {
    expect(() => dayWindowIn("not-a-date", "UTC")).toThrow();
  });
});
