import { database } from "@wonflow/database";

/**
 * Availability has two layers:
 *
 *  - The hospital roster (`AvailabilityRule`), set by an administrator. This is
 *    the time the doctor is *expected to arrive* — a planning figure only.
 *  - The doctor's sitting (`DoctorSitting`), set by the doctor for one business
 *    date. This is when the doctor is *actually sitting*.
 *
 * When a sitting exists it overrides the roster for that doctor, branch and
 * date. Reception and the patient portal must both book against the resolved
 * window, never against the roster directly.
 */
export type AvailabilityWindowSource = "DOCTOR_SITTING" | "HOSPITAL_ROSTER";

export interface EffectiveAvailabilityWindow {
  doctorId: string;
  branchId: string;
  /** Rule the window derives from; null when it came from a sitting alone. */
  ruleId: string | null;
  serviceId: string | null;
  startsMinute: number;
  endsMinute: number;
  capacity: number;
  /** Preferred slot length. A sitting's own average wins when present. */
  slotMinutes: number | null;
  source: AvailabilityWindowSource;
  /** Set when a sitting replaced a roster window, for UI explanation. */
  rosterStartsMinute: number | null;
  rosterEndsMinute: number | null;
  sittingStatus: "PLANNED" | "AVAILABLE" | "ON_BREAK" | "FINISHED" | null;
  roomLabel: string | null;
}

function sittingKey(doctorId: string, branchId: string) {
  return `${doctorId}::${branchId}`;
}

/**
 * Resolves the bookable windows for one calendar date, applying sitting
 * overrides on top of the hospital roster.
 *
 * `rules` must already be filtered to the weekday and validity range of `date`.
 */
export async function resolveEffectiveAvailability(input: {
  tenantId: string;
  date: string;
  rules: ReadonlyArray<{
    id: string;
    doctorId: string;
    branchId: string;
    serviceId: string | null;
    startsMinute: number;
    endsMinute: number;
    capacity: number;
  }>;
}): Promise<EffectiveAvailabilityWindow[]> {
  const { tenantId, date, rules } = input;

  const doctorIds = [...new Set(rules.map((rule) => rule.doctorId))];
  const branchIds = [...new Set(rules.map((rule) => rule.branchId))];

  const sittings = doctorIds.length === 0
    ? []
    : await database.doctorSitting.findMany({
      where: {
        tenantId,
        businessDate: new Date(`${date}T00:00:00.000Z`),
        doctorId: { in: doctorIds },
        branchId: { in: branchIds },
      },
    });

  const sittingByDoctorBranch = new Map(
    sittings.map((sitting) => [sittingKey(sitting.doctorId, sitting.branchId), sitting]),
  );

  return rules.flatMap((rule): EffectiveAvailabilityWindow[] => {
    const sitting = sittingByDoctorBranch.get(sittingKey(rule.doctorId, rule.branchId));

    // No sitting recorded: the roster stands as the expected window.
    if (sitting === undefined) {
      return [{
        doctorId: rule.doctorId,
        branchId: rule.branchId,
        ruleId: rule.id,
        serviceId: rule.serviceId,
        startsMinute: rule.startsMinute,
        endsMinute: rule.endsMinute,
        capacity: rule.capacity,
        slotMinutes: null,
        source: "HOSPITAL_ROSTER" as const,
        rosterStartsMinute: null,
        rosterEndsMinute: null,
        sittingStatus: null,
        roomLabel: null,
      }];
    }

    // The doctor has finished for the day: nothing further is bookable.
    if (sitting.status === "FINISHED") return [];

    // The sitting overrides the roster.
    return [{
      doctorId: rule.doctorId,
      branchId: rule.branchId,
      ruleId: rule.id,
      serviceId: rule.serviceId,
      startsMinute: sitting.startsMinute,
      endsMinute: sitting.endsMinute,
      capacity: rule.capacity,
      slotMinutes: sitting.averageConsultationMinutes,
      source: "DOCTOR_SITTING" as const,
      rosterStartsMinute: rule.startsMinute,
      rosterEndsMinute: rule.endsMinute,
      sittingStatus: sitting.status,
      roomLabel: sitting.roomLabel,
    }];
  });
}

/**
 * Confirms a proposed appointment falls inside the doctor's resolved window.
 * Used at booking time so a slot cannot be claimed against a stale roster after
 * the doctor has shortened or ended their sitting.
 */
export async function assertWithinEffectiveWindow(
  transaction: Pick<typeof database, "doctorSitting">,
  input: {
    tenantId: string;
    doctorId: string;
    branchId: string;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
    rosterStartsMinute: number;
    rosterEndsMinute: number;
  },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const businessDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: input.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(input.startsAt);

  const sitting = await transaction.doctorSitting.findFirst({
    where: {
      tenantId: input.tenantId,
      doctorId: input.doctorId,
      branchId: input.branchId,
      businessDate: new Date(`${businessDate}T00:00:00.000Z`),
    },
  });

  const startMinute = localMinuteOfDay(input.startsAt, input.timezone);
  const endMinute = localMinuteOfDay(input.endsAt, input.timezone);

  if (sitting === undefined || sitting === null) {
    return startMinute >= input.rosterStartsMinute && endMinute <= input.rosterEndsMinute
      ? { ok: true }
      : { ok: false, reason: "That time is outside the doctor's scheduled hours." };
  }

  if (sitting.status === "FINISHED") {
    return { ok: false, reason: "The doctor has finished sitting for this date." };
  }

  return startMinute >= sitting.startsMinute && endMinute <= sitting.endsMinute
    ? { ok: true }
    : { ok: false, reason: "That time is outside the doctor's sitting hours for this date." };
}

/**
 * Guard for staff-initiated booking (reception, operations).
 *
 * Reception must book against the doctor's actual sitting hours. The hospital
 * roster only applies on dates where the doctor has not recorded a sitting.
 * Throws nothing — returns a reason string the caller turns into an API error.
 */
export async function checkDoctorBookable(
  transaction: Pick<typeof database, "doctorSitting" | "availabilityRule">,
  input: {
    tenantId: string;
    doctorId: string;
    branchId: string;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
  },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const businessDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: input.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(input.startsAt);

  const startMinute = localMinuteOfDay(input.startsAt, input.timezone);
  const endMinute = localMinuteOfDay(input.endsAt, input.timezone);

  const sitting = await transaction.doctorSitting.findFirst({
    where: {
      tenantId: input.tenantId,
      doctorId: input.doctorId,
      branchId: input.branchId,
      businessDate: new Date(`${businessDate}T00:00:00.000Z`),
    },
  });

  // A recorded sitting is authoritative for the date.
  if (sitting) {
    if (sitting.status === "FINISHED") {
      return { ok: false, reason: "The doctor has finished sitting for this date." };
    }
    return startMinute >= sitting.startsMinute && endMinute <= sitting.endsMinute
      ? { ok: true }
      : { ok: false, reason: `That time is outside the doctor's sitting hours (${formatMinute(sitting.startsMinute)}–${formatMinute(sitting.endsMinute)}).` };
  }

  // No sitting: fall back to the rostered arrival hours.
  const date = new Date(`${businessDate}T00:00:00.000Z`);
  const rules = await transaction.availabilityRule.findMany({
    where: {
      tenantId: input.tenantId,
      doctorId: input.doctorId,
      branchId: input.branchId,
      isActive: true,
      weekday: date.getUTCDay(),
      validFrom: { lte: date },
      OR: [{ validUntil: null }, { validUntil: { gte: date } }],
    },
  });

  if (rules.length === 0) {
    return { ok: false, reason: "The doctor has no scheduled hours at this branch on that date." };
  }

  return rules.some((rule) => startMinute >= rule.startsMinute && endMinute <= rule.endsMinute)
    ? { ok: true }
    : { ok: false, reason: "That time is outside the doctor's scheduled hours." };
}

function formatMinute(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function localMinuteOfDay(value: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(lookup.hour) * 60 + Number(lookup.minute);
}
