import { beforeEach, describe, expect, it, vi } from "vitest";

const findManySitting = vi.fn();
const findFirstSitting = vi.fn();
const findManyRule = vi.fn();
const findManyAppointment = vi.fn();

vi.mock("@wonflow/database", () => ({
  database: {
    doctorSitting: {
      findMany: (...args: unknown[]) => findManySitting(...args),
      findFirst: (...args: unknown[]) => findFirstSitting(...args),
    },
    availabilityRule: {
      findMany: (...args: unknown[]) => findManyRule(...args),
    },
    appointment: {
      findMany: (...args: unknown[]) => findManyAppointment(...args),
    },
  },
}));

const { listBookableSlots } = await import("./appointment-slots");

beforeEach(() => {
  findManySitting.mockReset().mockResolvedValue([]);
  findFirstSitting.mockReset();
  findManyRule.mockReset();
  findManyAppointment.mockReset().mockResolvedValue([]);
});

describe("listBookableSlots schedule availability & hints", () => {
  it("returns schedule not available with roster hints and next available date when doctor is not rostered on that weekday", async () => {
    // No doctor sitting
    findFirstSitting.mockResolvedValue(null);

    // Call 1 & 2 in listBookableSlots: rules for the specific date/weekday -> empty
    // Call 3 in listBookableSlots: doctorRoster for all days -> doctor is rostered on Wednesday (3) and Sunday (0)
    findManyRule
      .mockResolvedValueOnce([]) // rules for date + branch
      .mockResolvedValueOnce([]) // rules for date fallback
      .mockResolvedValueOnce([
        { weekday: 0, startsMinute: 600, endsMinute: 1080 }, // Sun 10:00 AM - 06:00 PM
        { weekday: 3, startsMinute: 900, endsMinute: 1320 }, // Wed 03:00 PM - 10:00 PM
      ]);

    // Requesting a Tuesday (e.g. 2026-09-15 is Tuesday, UTC day 2)
    const result = await listBookableSlots({
      tenantId: "tenant-1",
      doctorId: "doc-1",
      branchId: "branch-1",
      date: "2026-09-15",
      timezone: "UTC",
      fallbackSlotMinutes: 20,
    });

    expect(result.slots).toHaveLength(0);
    expect(result.maxSlots).toBe(0);
    expect(result.unavailableReason).toContain("Schedule not available on Tuesday");
    expect(result.unavailableReason).toContain("Wednesday");
    expect(result.unavailableReason).toContain("Sunday");
    expect(result.doctorTimingLabel).toBe("Not rostered on Tuesday");
    expect(result.rosteredDays).toBeDefined();
    expect(result.rosteredDays).toHaveLength(2);
    expect(result.rosteredDays?.[0]?.weekdayName).toBe("Sunday");
    expect(result.rosteredDays?.[1]?.weekdayName).toBe("Wednesday");
    // Next day after Tuesday 2026-09-15 where doctor is rostered (Wednesday 2026-09-16)
    expect(result.nextAvailableDate).toBe("2026-09-16");
  });

  it("generates real bookable slots when doctor has rostered hours on that weekday", async () => {
    findFirstSitting.mockResolvedValue(null);
    findManyAppointment.mockResolvedValue([]);

    // Wednesday 2026-09-16 (UTC day 3)
    findManyRule.mockResolvedValueOnce([
      {
        id: "rule-1",
        doctorId: "doc-1",
        branchId: "branch-1",
        serviceId: "svc-1",
        weekday: 3,
        startsMinute: 540, // 09:00 AM
        endsMinute: 660,   // 11:00 AM (2 hours = 6 slots of 20 mins)
        capacity: 1,
      },
    ]);

    const result = await listBookableSlots({
      tenantId: "tenant-1",
      doctorId: "doc-1",
      branchId: "branch-1",
      date: "2026-09-16",
      timezone: "UTC",
      fallbackSlotMinutes: 20,
    });

    expect(result.slots.length).toBeGreaterThan(0);
    expect(result.unavailableReason).toBeUndefined();
    expect(result.doctorTimingLabel).toContain("9:00 AM – 11:00 AM");
  });
});
