import type {
  AppointmentBookingSource,
  AppointmentTimeSlot,
  DemoAppointmentBooking,
} from "@/lib/appointments";

import {
  readDemoAppointmentBookings,
} from "@/lib/appointments";

import {
  readDemoDoctorSchedules,
} from "@/lib/doctor-schedules";

import type {
  DemoDoctorSchedule,
} from "@/lib/doctor-schedules";

export interface DemoDoctorBookingAvailability {
  schedules:
    DemoDoctorSchedule[];

  slots:
    AppointmentTimeSlot[];

  appointmentDurationMinutes:
    number;

  unavailableReason?: string;
}

function timeToMinutes(
  value: string,
): number {
  const [
    hourText,
    minuteText,
  ] = value.split(":");

  return (
    Number(hourText) * 60 +
    Number(minuteText)
  );
}

function minutesToTime(
  value: number,
): string {
  const hours =
    Math.floor(value / 60);

  const minutes =
    value % 60;

  return [
    String(hours).padStart(
      2,
      "0",
    ),
    String(minutes).padStart(
      2,
      "0",
    ),
  ].join(":");
}

function formatTime(
  value: string,
): string {
  const [
    hourText,
    minuteText,
  ] = value.split(":");

  const hour =
    Number(hourText);

  const displayHour =
    hour % 12 || 12;

  const suffix =
    hour >= 12
      ? "PM"
      : "AM";

  return `${displayHour}:${minuteText} ${suffix}`;
}

function rangesOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): boolean {
  return (
    leftStart < rightEnd &&
    leftEnd > rightStart
  );
}

function isActiveBooking(
  booking:
    DemoAppointmentBooking,
): boolean {
  return (
    booking.status !==
      "cancelled" &&
    booking.status !==
      "no-show"
  );
}

function parseAppointmentDate(
  value: string,
): Date | undefined {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (match === null) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(
    year,
    month - 1,
    day,
    12,
  );

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}

export function getDemoDoctorBookingAvailability(
  input: {
    practitionerId: string;
    branchId: string;
    appointmentDate: string;
    bookingSource?:
      AppointmentBookingSource;

    existingBookings?:
      readonly DemoAppointmentBooking[];
  },
): DemoDoctorBookingAvailability {
  if (
    input.practitionerId === "" ||
    input.branchId === "" ||
    input.appointmentDate === ""
  ) {
    return {
      schedules: [],
      slots: [],
      appointmentDurationMinutes:
        0,
      unavailableReason:
        "Select a doctor, branch and appointment date.",
    };
  }

  const date =
    parseAppointmentDate(
      input.appointmentDate,
    );

  if (
    date === undefined
  ) {
    return {
      schedules: [],
      slots: [],
      appointmentDurationMinutes:
        0,
      unavailableReason:
        "The selected appointment date is invalid.",
    };
  }

  const dayOfWeek =
    date.getDay();

  const matchingSchedules =
    readDemoDoctorSchedules()
      .filter(
        (schedule) =>
          schedule.practitionerId ===
            input.practitionerId &&
          schedule.branchId ===
            input.branchId &&
          schedule.dayOfWeek ===
            dayOfWeek &&
          schedule.active,
      )
      .sort(
        (left, right) =>
          left.startTime
            .localeCompare(
              right.startTime,
            ),
      );

  const schedules =
    input.bookingSource ===
    "walk-in"
      ? matchingSchedules.filter(
          (schedule) =>
            schedule.allowWalkIns,
        )
      : matchingSchedules;

  if (schedules.length === 0) {
    return {
      schedules: [],
      slots: [],
      appointmentDurationMinutes:
        0,
      unavailableReason:
        matchingSchedules.length > 0 &&
        input.bookingSource ===
          "walk-in"
          ? "This doctor does not accept walk-in bookings during the selected schedule."
          : "This doctor has no active schedule at the selected branch on this day.",
    };
  }

  const bookings =
    (
      input.existingBookings ??
      readDemoAppointmentBookings()
    )
      .filter(
        (booking) =>
          booking.practitionerId ===
            input.practitionerId &&
          booking.branchId ===
            input.branchId &&
          booking.appointmentDate ===
            input.appointmentDate &&
          isActiveBooking(booking),
      );

  const slots:
    AppointmentTimeSlot[] =
    [];

  schedules.forEach(
    (schedule) => {
      const duration =
        schedule
          .appointmentDurationMinutes;

      const scheduleStart =
        timeToMinutes(
          schedule.startTime,
        );

      const scheduleEnd =
        timeToMinutes(
          schedule.endTime,
        );

      const bookingsInsideBlock =
        bookings.filter(
          (booking) =>
            rangesOverlap(
              scheduleStart,
              scheduleEnd,
              timeToMinutes(
                booking.slotStart,
              ),
              timeToMinutes(
                booking.slotEnd,
              ),
            ),
        );

      const blockAtCapacity =
        bookingsInsideBlock.length >=
        schedule.maximumPatients;

      for (
        let slotStart =
          scheduleStart;

        slotStart + duration <=
          scheduleEnd;

        slotStart += duration
      ) {
        const slotEnd =
          slotStart + duration;

        const overlapsBooking =
          bookings.some(
            (booking) =>
              rangesOverlap(
                slotStart,
                slotEnd,
                timeToMinutes(
                  booking.slotStart,
                ),
                timeToMinutes(
                  booking.slotEnd,
                ),
              ),
          );

        const start =
          minutesToTime(
            slotStart,
          );

        const end =
          minutesToTime(
            slotEnd,
          );

        slots.push({
          start,
          end,

          label:
            `${formatTime(start)} – ${formatTime(end)}`,

          available:
            !blockAtCapacity &&
            !overlapsBooking,
        });
      }
    },
  );

  return {
    schedules,
    slots,

    appointmentDurationMinutes:
      schedules[0]
        ?.appointmentDurationMinutes ??
      0,

    unavailableReason:
      slots.length === 0
        ? "No appointment slots are available for this schedule."
        : slots.every(
              (slot) =>
                !slot.available,
            )
          ? "All appointment slots are already reserved or the schedule has reached capacity."
        : undefined,
  };
}

export function hasDemoDoctorScheduleForDate(
  input: {
    practitionerId: string;
    branchId: string;
    appointmentDate: string;
    bookingSource?:
      AppointmentBookingSource;
  },
): boolean {
  return getDemoDoctorBookingAvailability(
    input,
  ).schedules.length > 0;
}
