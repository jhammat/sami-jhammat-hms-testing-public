import { database } from "@wonflow/database";

import {
  formatMinute,
  localMinuteOfDay,
  localWallTimeToInstant,
  resolveEffectiveAvailability,
} from "./effective-availability";
import type { EffectiveAvailabilityWindow } from "./effective-availability";

/**
 * Server-side slot generation. Slots computed in the browser read a local
 * copy of the schedule and existing bookings that is already stale by the
 * time the person clicks a slot — two receptionists can both see the same
 * "open" slot and both book it. Every slot this returns reflects the
 * database at the moment of the request, and still gets a final conflict
 * check (and a database-level unique index) at booking time, since a slot
 * can go stale between being shown and being clicked.
 */

export interface BookableSlot {
  /** Local wall-clock time, e.g. "09:00". */
  start: string;
  end: string;
  label: string;
  available: boolean;
  /** Exact instants to send back unchanged when booking this slot. */
  startsAt: string;
  endsAt: string;
  /**
   * Consulting room for this slot, taken from the doctor's sitting for the
   * date. Null when the doctor has not recorded a sitting yet (the window
   * came from the hospital roster), so reception can tell the difference
   * between "Room 4" and "room not confirmed yet" rather than guessing.
   */
  roomLabel: string | null;
}

export interface RosteredDayHint {
  weekday: number;
  weekdayName: string;
  timing: string;
}

export interface BookableSlotsResult {
  slots: BookableSlot[];
  slotMinutes: number;
  maxSlots: number;
  doctorTimingLabel?: string;
  unavailableReason?: string;
  rosteredDays?: RosteredDayHint[];
  nextAvailableDate?: string;
}

function formatLabel(startMinute: number, endMinute: number): string {
  const formatTime = (minute: number): string => {
    const hour = Math.floor(minute / 60);
    const displayHour = hour % 12 || 12;
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${displayHour}:${String(minute % 60).padStart(2, "0")} ${suffix}`;
  };

  return `${formatTime(startMinute)} – ${formatTime(endMinute)}`;
}

function rangesOverlap(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number): boolean {
  return leftStart < rightEnd && leftEnd > rightStart;
}

export async function listBookableSlots(input: {
  tenantId: string;
  doctorId: string;
  branchId: string;
  /** YYYY-MM-DD */
  date: string;
  timezone: string;
  /** Fallback slot length when no doctor sitting supplies its own average. */
  fallbackSlotMinutes: number;
}): Promise<BookableSlotsResult> {
  const dateObj = new Date(`${input.date}T00:00:00.000Z`);

  if (Number.isNaN(dateObj.getTime())) {
    return { slots: [], slotMinutes: input.fallbackSlotMinutes, maxSlots: 0, unavailableReason: "The selected date is invalid." };
  }

  const weekday = dateObj.getUTCDay();

  const sitting =
    (await database.doctorSitting.findFirst({
      where: {
        tenantId: input.tenantId,
        doctorId: input.doctorId,
        ...(input.branchId ? { branchId: input.branchId } : {}),
        businessDate: dateObj,
      },
    })) ??
    (await database.doctorSitting.findFirst({
      where: {
        tenantId: input.tenantId,
        doctorId: input.doctorId,
        businessDate: dateObj,
      },
    }));

  let rules = await database.availabilityRule.findMany({
    where: {
      tenantId: input.tenantId,
      doctorId: input.doctorId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      isActive: true,
      weekday,
      validFrom: { lte: dateObj },
      OR: [{ validUntil: null }, { validUntil: { gte: dateObj } }],
    },
  });

  if (rules.length === 0) {
    rules = await database.availabilityRule.findMany({
      where: {
        tenantId: input.tenantId,
        doctorId: input.doctorId,
        isActive: true,
        weekday,
        validFrom: { lte: dateObj },
        OR: [{ validUntil: null }, { validUntil: { gte: dateObj } }],
      },
    });
  }

  let windows: EffectiveAvailabilityWindow[] = [];

  if (sitting) {
    if (sitting.status === "FINISHED") {
      return { slots: [], slotMinutes: input.fallbackSlotMinutes, maxSlots: 0, unavailableReason: "The doctor has finished sitting for this date." };
    }
    windows = [{
      doctorId: input.doctorId,
      branchId: input.branchId,
      ruleId: null,
      serviceId: null,
      startsMinute: sitting.startsMinute,
      endsMinute: sitting.endsMinute,
      capacity: 50,
      slotMinutes: sitting.averageConsultationMinutes || input.fallbackSlotMinutes,
      source: "DOCTOR_SITTING",
      rosterStartsMinute: null,
      rosterEndsMinute: null,
      sittingStatus: sitting.status,
      roomLabel: sitting.roomLabel,
    }];
  } else if (rules.length > 0) {
    windows = await resolveEffectiveAvailability({
      tenantId: input.tenantId,
      date: input.date,
      rules: rules.map((rule) => ({
        id: rule.id,
        doctorId: rule.doctorId,
        branchId: rule.branchId,
        serviceId: rule.serviceId,
        startsMinute: rule.startsMinute,
        endsMinute: rule.endsMinute,
        capacity: rule.capacity,
      })),
    });
  } else {
    const doctorRoster = await database.availabilityRule.findMany({
      where: {
        tenantId: input.tenantId,
        doctorId: input.doctorId,
        ...(input.branchId ? { branchId: input.branchId } : {}),
        isActive: true,
      },
      select: {
        weekday: true,
        startsMinute: true,
        endsMinute: true,
      },
      orderBy: [{ weekday: "asc" }, { startsMinute: "asc" }],
    });

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDayName = dayNames[weekday] ?? `Day ${weekday}`;

    if (doctorRoster.length === 0) {
      return {
        slots: [],
        slotMinutes: input.fallbackSlotMinutes,
        maxSlots: 0,
        doctorTimingLabel: "No rostered hours configured",
        unavailableReason: "The doctor has no rostered schedule configured at this branch.",
        rosteredDays: [],
      };
    }

    const dayMap = new Map<number, string[]>();
    for (const rule of doctorRoster) {
      const timing = formatLabel(rule.startsMinute, rule.endsMinute);
      const list = dayMap.get(rule.weekday) ?? [];
      list.push(timing);
      dayMap.set(rule.weekday, list);
    }

    const rosteredDays: RosteredDayHint[] = Array.from(dayMap.entries()).map(([w, timings]) => ({
      weekday: w,
      weekdayName: dayNames[w] ?? `Day ${w}`,
      timing: timings.join(", "),
    }));

    const rosterSummaries = rosteredDays.map((d) => `${d.weekdayName} (${d.timing})`);
    const availableWeekdays = new Set(doctorRoster.map((r) => r.weekday));

    let nextAvailableDate: string | undefined;
    for (let offset = 1; offset <= 14; offset++) {
      const nextDate = new Date(dateObj.getTime() + offset * 86_400_000);
      if (availableWeekdays.has(nextDate.getUTCDay())) {
        nextAvailableDate = nextDate.toISOString().slice(0, 10);
        break;
      }
    }

    return {
      slots: [],
      slotMinutes: input.fallbackSlotMinutes,
      maxSlots: 0,
      doctorTimingLabel: `Not rostered on ${currentDayName}`,
      unavailableReason: `Schedule not available on ${currentDayName}. Available days: ${rosterSummaries.join(", ")}.`,
      rosteredDays,
      nextAvailableDate,
    };
  }

  if (windows.length === 0) {
    return { slots: [], slotMinutes: input.fallbackSlotMinutes, maxSlots: 0, unavailableReason: "The doctor has no available sitting hours for this date." };
  }

  const dayStart = new Date(`${input.date}T00:00:00.000Z`);
  const dayEnd = new Date(`${input.date}T23:59:59.999Z`);

  const existingAppointments = await database.appointment.findMany({
    where: {
      tenantId: input.tenantId,
      ...(input.doctorId ? { doctorId: input.doctorId } : { branchId: input.branchId }),
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      // The window covers one calendar day in `timezone`; padding a day
      // either side keeps appointments near midnight from being missed by
      // a UTC-range query, and the local-minute check below does the exact
      // filtering.
      startsAt: { gte: new Date(dayStart.getTime() - 86_400_000), lte: new Date(dayEnd.getTime() + 86_400_000) },
    },
    select: { startsAt: true, endsAt: true },
  });

  const localDateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: input.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const bookedRanges = existingAppointments
    // Keep only appointments whose local start falls on the requested date;
    // the padded UTC range above may include neighbouring-day appointments.
    .filter((appointment) => localDateFormatter.format(appointment.startsAt) === input.date)
    .map((appointment) => ({
      start: localMinuteOfDay(appointment.startsAt, input.timezone),
      end: localMinuteOfDay(appointment.endsAt, input.timezone),
    }));

  /*
   * A slot that has already started cannot be booked.
   *
   * The generator only ever asked whether a slot collided with an existing
   * appointment, so on the current date every sitting hour that had already
   * passed came back `available: true` — and the booking screens select the
   * first available slot by default. At 09:00 the default selection on a
   * midnight-to-midnight sitting was 12:00 AM, which the server then rejected
   * with "Appointments cannot be booked in the past". The offer and the
   * refusal disagreed, and the refusal was right.
   */
  const isToday = localDateFormatter.format(new Date()) === input.date;
  const nowMinute = isToday ? localMinuteOfDay(new Date(), input.timezone) : -1;
  const hasPassed = (slotStart: number) => isToday && slotStart < nowMinute;

  const slots: BookableSlot[] = [];

  for (const window of windows) {
    const slotMinutes = window.slotMinutes ?? input.fallbackSlotMinutes;

    if (slotMinutes <= 0) {
      continue;
    }

    const overlappingBookings = bookedRanges.filter((range) =>
      rangesOverlap(window.startsMinute, window.endsMinute, range.start, range.end),
    );

    const windowAtCapacity = overlappingBookings.length >= window.capacity;

    for (
      let slotStart = window.startsMinute;
      slotStart + slotMinutes <= window.endsMinute;
      slotStart += slotMinutes
    ) {
      const slotEnd = slotStart + slotMinutes;

      const overlapsBooking = bookedRanges.some((range) => rangesOverlap(slotStart, slotEnd, range.start, range.end));

      slots.push({
        start: formatMinute(slotStart),
        end: formatMinute(slotEnd),
        label: formatLabel(slotStart, slotEnd),
        available: !windowAtCapacity && !overlapsBooking && !hasPassed(slotStart),
        startsAt: localWallTimeToInstant(input.date, slotStart, input.timezone).toISOString(),
        endsAt: localWallTimeToInstant(input.date, slotEnd, input.timezone).toISOString(),
        roomLabel: window.roomLabel,
      });
    }
  }

  /*
   * One button per clock time.
   *
   * Slots are generated per sitting window, and a doctor can legitimately have
   * two windows covering the same hour — a sitting plus a standing availability
   * rule, or two rooms. That pushed the same time into the list twice, which
   * reached the booking screens as duplicate React keys ("Encountered two
   * children with the same key") and, worse, as two identical buttons where
   * only one could be clicked meaningfully.
   *
   * Collapsing keeps the bookable one: a time the doctor can be booked at is
   * available, whichever window offered it.
   */
  const slotsByStart = new Map<string, BookableSlot>();
  for (const slot of slots) {
    const existing = slotsByStart.get(slot.startsAt);
    if (!existing || (!existing.available && slot.available)) {
      slotsByStart.set(slot.startsAt, slot);
    }
  }
  const uniqueSlots = [...slotsByStart.values()].sort((left, right) =>
    left.startsAt.localeCompare(right.startsAt),
  );

  const primaryWindow = windows[0];
  const totalStayMinutes = primaryWindow ? Math.max(0, primaryWindow.endsMinute - primaryWindow.startsMinute) : 0;
  const effectiveSlotMinutes = primaryWindow?.slotMinutes ?? input.fallbackSlotMinutes ?? 20;
  const maxSlots = effectiveSlotMinutes > 0 ? Math.floor(totalStayMinutes / effectiveSlotMinutes) : 0;
  const doctorTimingLabel = primaryWindow
    ? `${formatLabel(primaryWindow.startsMinute, primaryWindow.endsMinute)} (${Math.round((totalStayMinutes / 60) * 10) / 10} hrs)`
    : undefined;

  return {
    slots: uniqueSlots,
    slotMinutes: effectiveSlotMinutes,
    maxSlots,
    doctorTimingLabel,
    unavailableReason:
      uniqueSlots.length === 0
        ? "No appointment slots are available for this schedule."
        : uniqueSlots.every((slot) => !slot.available)
          ? // Every remaining slot being in the past is the ordinary end-of-day
            // case, not a full clinic; saying "already reserved" would send
            // reception looking for bookings that do not exist.
            isToday && uniqueSlots.every((slot) => hasPassed(localMinuteOfDay(new Date(slot.startsAt), input.timezone)))
            ? "The doctor's sitting hours for today have already passed. Choose a later date."
            : "All appointment slots are already reserved or the schedule has reached capacity."
          : undefined,
  };
}
