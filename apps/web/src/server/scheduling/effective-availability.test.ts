import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const findFirst = vi.fn();
const ruleFindMany = vi.fn();

vi.mock("@wonflow/database", () => ({
  database: {
    doctorSitting: {
      findMany: (...args: unknown[]) => findMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
    availabilityRule: {
      findMany: (...args: unknown[]) => ruleFindMany(...args),
    },
  },
}));

const { assertWithinEffectiveWindow, checkDoctorBookable, resolveEffectiveAvailability } = await import("./effective-availability");

const roster = {
  id: "rule-1",
  doctorId: "doctor-1",
  branchId: "branch-1",
  serviceId: "service-1",
  startsMinute: 9 * 60,
  endsMinute: 17 * 60,
  capacity: 1,
};

beforeEach(() => {
  findMany.mockReset();
  findFirst.mockReset();
  ruleFindMany.mockReset();
});

describe("resolveEffectiveAvailability", () => {
  it("falls back to the hospital roster when the doctor recorded no sitting", async () => {
    findMany.mockResolvedValue([]);

    const [window] = await resolveEffectiveAvailability({
      tenantId: "tenant-1",
      date: "2026-08-10",
      rules: [roster],
    });

    expect(window).toMatchObject({
      source: "HOSPITAL_ROSTER",
      startsMinute: 9 * 60,
      endsMinute: 17 * 60,
      slotMinutes: null,
    });
  });

  it("lets the doctor's sitting override the rostered arrival window", async () => {
    findMany.mockResolvedValue([{
      doctorId: "doctor-1",
      branchId: "branch-1",
      startsMinute: 11 * 60,
      endsMinute: 14 * 60,
      averageConsultationMinutes: 20,
      status: "AVAILABLE",
      roomLabel: "Room 3",
    }]);

    const [window] = await resolveEffectiveAvailability({
      tenantId: "tenant-1",
      date: "2026-08-10",
      rules: [roster],
    });

    expect(window).toMatchObject({
      source: "DOCTOR_SITTING",
      startsMinute: 11 * 60,
      endsMinute: 14 * 60,
      slotMinutes: 20,
      // The roster is retained so the UI can explain the override.
      rosterStartsMinute: 9 * 60,
      rosterEndsMinute: 17 * 60,
      roomLabel: "Room 3",
    });
  });

  it("removes the doctor entirely once the sitting is finished", async () => {
    findMany.mockResolvedValue([{
      doctorId: "doctor-1",
      branchId: "branch-1",
      startsMinute: 9 * 60,
      endsMinute: 17 * 60,
      averageConsultationMinutes: 15,
      status: "FINISHED",
      roomLabel: null,
    }]);

    const windows = await resolveEffectiveAvailability({
      tenantId: "tenant-1",
      date: "2026-08-10",
      rules: [roster],
    });

    expect(windows).toEqual([]);
  });

  it("applies a sitting only to the doctor and branch it belongs to", async () => {
    findMany.mockResolvedValue([{
      doctorId: "doctor-1",
      branchId: "branch-1",
      startsMinute: 11 * 60,
      endsMinute: 14 * 60,
      averageConsultationMinutes: 20,
      status: "AVAILABLE",
      roomLabel: null,
    }]);

    const windows = await resolveEffectiveAvailability({
      tenantId: "tenant-1",
      date: "2026-08-10",
      rules: [
        roster,
        { ...roster, id: "rule-2", doctorId: "doctor-2" },
        { ...roster, id: "rule-3", branchId: "branch-2" },
      ],
    });

    expect(windows.map((window) => window.source)).toEqual([
      "DOCTOR_SITTING",
      "HOSPITAL_ROSTER",
      "HOSPITAL_ROSTER",
    ]);
  });
});

describe("checkDoctorBookable (reception)", () => {
  const transaction = {
    doctorSitting: { findFirst: (...args: unknown[]) => findFirst(...args) },
    availabilityRule: { findMany: (...args: unknown[]) => ruleFindMany(...args) },
  } as never;

  const base = {
    tenantId: "tenant-1",
    doctorId: "doctor-1",
    branchId: "branch-1",
    timezone: "Asia/Karachi",
  };

  // 2026-08-10 is a Monday. Times below are Asia/Karachi (UTC+5).
  const at = (utc: string) => new Date(`2026-08-10T${utc}:00.000Z`);

  it("books against the roster when the doctor recorded no sitting", async () => {
    findFirst.mockResolvedValue(null);
    ruleFindMany.mockResolvedValue([{ startsMinute: 9 * 60, endsMinute: 17 * 60 }]);

    // 10:00–10:15 local
    await expect(checkDoctorBookable(transaction, { ...base, startsAt: at("05:00"), endsAt: at("05:15") }))
      .resolves.toEqual({ ok: true });
  });

  it("refuses a time the roster does not cover", async () => {
    findFirst.mockResolvedValue(null);
    ruleFindMany.mockResolvedValue([{ startsMinute: 9 * 60, endsMinute: 17 * 60 }]);

    // 18:00 local, past the roster end.
    await expect(checkDoctorBookable(transaction, { ...base, startsAt: at("13:00"), endsAt: at("13:15") }))
      .resolves.toMatchObject({ ok: false });
  });

  it("refuses a roster-valid time the doctor's sitting excludes", async () => {
    findFirst.mockResolvedValue({ startsMinute: 11 * 60, endsMinute: 14 * 60, status: "AVAILABLE" });

    // 10:00 local: inside the roster, before the sitting starts.
    await expect(checkDoctorBookable(transaction, { ...base, startsAt: at("05:00"), endsAt: at("05:15") }))
      .resolves.toMatchObject({ ok: false, reason: "That time is outside the doctor's sitting hours (11:00–14:00)." });
    // The roster must not even be consulted once a sitting exists.
    expect(ruleFindMany).not.toHaveBeenCalled();
  });

  it("accepts a time inside the sitting that the roster would have refused", async () => {
    findFirst.mockResolvedValue({ startsMinute: 18 * 60, endsMinute: 21 * 60, status: "AVAILABLE" });

    // 19:00 local: outside a 09:00-17:00 roster, but the doctor is sitting late.
    await expect(checkDoctorBookable(transaction, { ...base, startsAt: at("14:00"), endsAt: at("14:15") }))
      .resolves.toEqual({ ok: true });
  });

  it("refuses everything once the doctor has finished", async () => {
    findFirst.mockResolvedValue({ startsMinute: 9 * 60, endsMinute: 17 * 60, status: "FINISHED" });

    await expect(checkDoctorBookable(transaction, { ...base, startsAt: at("05:00"), endsAt: at("05:15") }))
      .resolves.toMatchObject({ ok: false, reason: "The doctor has finished sitting for this date." });
  });

  it("refuses when the doctor has neither a sitting nor rostered hours", async () => {
    findFirst.mockResolvedValue(null);
    ruleFindMany.mockResolvedValue([]);

    await expect(checkDoctorBookable(transaction, { ...base, startsAt: at("05:00"), endsAt: at("05:15") }))
      .resolves.toMatchObject({ ok: false, reason: "The doctor has no scheduled hours at this branch on that date." });
  });
});

describe("assertWithinEffectiveWindow", () => {
  const transaction = { doctorSitting: { findFirst: (...args: unknown[]) => findFirst(...args) } } as never;

  const base = {
    tenantId: "tenant-1",
    doctorId: "doctor-1",
    branchId: "branch-1",
    timezone: "Asia/Karachi",
    rosterStartsMinute: 9 * 60,
    rosterEndsMinute: 17 * 60,
  };

  it("accepts a slot inside the roster when no sitting exists", async () => {
    findFirst.mockResolvedValue(null);

    // 10:00–10:15 Asia/Karachi (UTC+5)
    const result = await assertWithinEffectiveWindow(transaction, {
      ...base,
      startsAt: new Date("2026-08-10T05:00:00.000Z"),
      endsAt: new Date("2026-08-10T05:15:00.000Z"),
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a slot outside the roster when no sitting exists", async () => {
    findFirst.mockResolvedValue(null);

    // 18:00 Asia/Karachi, past the 17:00 roster end.
    const result = await assertWithinEffectiveWindow(transaction, {
      ...base,
      startsAt: new Date("2026-08-10T13:00:00.000Z"),
      endsAt: new Date("2026-08-10T13:15:00.000Z"),
    });

    expect(result).toMatchObject({ ok: false });
  });

  it("rejects a slot that the roster allows but the doctor's sitting excludes", async () => {
    findFirst.mockResolvedValue({
      startsMinute: 11 * 60,
      endsMinute: 14 * 60,
      status: "AVAILABLE",
    });

    // 10:00 Asia/Karachi: inside the 09:00 roster, before the 11:00 sitting.
    const result = await assertWithinEffectiveWindow(transaction, {
      ...base,
      startsAt: new Date("2026-08-10T05:00:00.000Z"),
      endsAt: new Date("2026-08-10T05:15:00.000Z"),
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "That time is outside the doctor's sitting hours for this date.",
    });
  });

  it("rejects every slot once the doctor has finished sitting", async () => {
    findFirst.mockResolvedValue({
      startsMinute: 9 * 60,
      endsMinute: 17 * 60,
      status: "FINISHED",
    });

    const result = await assertWithinEffectiveWindow(transaction, {
      ...base,
      startsAt: new Date("2026-08-10T05:00:00.000Z"),
      endsAt: new Date("2026-08-10T05:15:00.000Z"),
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "The doctor has finished sitting for this date.",
    });
  });
});
