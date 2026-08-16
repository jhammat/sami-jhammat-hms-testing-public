import { database } from "@wonflow/database";

import {
  formatMinute,
  localMinuteOfDay,
  localWallTimeToInstant,
  resolveEffectiveAvailability,
} from "./effective-availability";

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

export interface BookableSlotsResult {
  slots: BookableSlot[];
  slotMinutes: number;
  unavailableReason?: string;
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
    return { slots: [], slotMinutes: input.fallbackSlotMinutes, unavailableReason: "The selected date is invalid." };
  }

  const weekday = dateObj.getUTCDay();

  const rules = await database.availabilityRule.findMany({
    where: {
      tenantId: input.tenantId,
      doctorId: input.doctorId,
      branchId: input.branchId,
      isActive: true,
      weekday,
      validFrom: { lte: dateObj },
      OR: [{ validUntil: null }, { validUntil: { gte: dateObj } }],
    },
  });

  if (rules.length === 0) {
    return { slots: [], slotMinutes: input.fallbackSlotMinutes, unavailableReason: "The doctor has no scheduled hours at this branch on this date." };
  }

  const windows = await resolveEffectiveAvailability({
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

  if (windows.length === 0) {
    return { slots: [], slotMinutes: input.fallbackSlotMinutes, unavailableReason: "The doctor has finished sitting for this date." };
  }

  const dayStart = new Date(`${input.date}T00:00:00.000Z`);
  const dayEnd = new Date(`${input.date}T23:59:59.999Z`);

  const existingAppointments = await database.appointment.findMany({
    where: {
      tenantId: input.tenantId,
      doctorId: input.doctorId,
      branchId: input.branchId,
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
        available: !windowAtCapacity && !overlapsBooking,
        startsAt: localWallTimeToInstant(input.date, slotStart, input.timezone).toISOString(),
        endsAt: localWallTimeToInstant(input.date, slotEnd, input.timezone).toISOString(),
        roomLabel: window.roomLabel,
      });
    }
  }

  return {
    slots,
    slotMinutes: windows[0]?.slotMinutes ?? input.fallbackSlotMinutes,
    unavailableReason:
      slots.length === 0
        ? "No appointment slots are available for this schedule."
        : slots.every((slot) => !slot.available)
          ? "All appointment slots are already reserved or the schedule has reached capacity."
          : undefined,
  };
}
