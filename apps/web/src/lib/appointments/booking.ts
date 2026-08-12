export type AppointmentDepartment =
  | "general-medicine"
  | "cardiology"
  | "orthopedics"
  | "pediatrics"
  | "gynecology"
  | "dermatology"
  | "ent"
  | "general-surgery";

export type AppointmentBookingSource =
  | "walk-in"
  | "phone"
  | "online"
  | "doctor-referral"
  | "hospital-referral";

export type AppointmentPriority =
  | "routine"
  | "urgent";

export type DemoAppointmentStatus =
  | "booked"
  | "checked-in"
  | "completed"
  | "cancelled"
  | "no-show";

export interface AppointmentService {
  id: string;
  code: string;

  name: string;

  department:
    AppointmentDepartment;

  durationMinutes: number;

  feeMinorUnits: number;
}

export interface AppointmentBookingDraft {
  patientId: string;
  branchId: string;

  department:
    AppointmentDepartment;

  serviceId: string;
  practitionerId: string;

  appointmentDate: string;
  slotStart: string;

  reasonForVisit: string;

  source:
    AppointmentBookingSource;

  priority:
    AppointmentPriority;

  notes: string;
}

export type AppointmentBookingErrors =
  Partial<
    Record<
      keyof AppointmentBookingDraft,
      string
    >
  >;

export interface AppointmentTimeSlot {
  start: string;
  end: string;

  label: string;

  available: boolean;
}

export interface DemoAppointmentBooking {
  id: string;

  appointmentNumber: string;

  patientId: string;
  branchId: string;

  practitionerId: string;

  serviceId: string;
  serviceCode: string;
  serviceName: string;

  department:
    AppointmentDepartment;

  appointmentDate: string;

  slotStart: string;
  slotEnd: string;

  scheduledStartAt: string;
  scheduledEndAt: string;

  durationMinutes: number;

  feeMinorUnits: number;
  currencyCode: "PKR";

  reasonForVisit: string;

  source:
    AppointmentBookingSource;

  priority:
    AppointmentPriority;

  status:
    DemoAppointmentStatus;

  notes: string;

  createdAt: string;
}

export const DEMO_APPOINTMENT_STORAGE_KEY =
  "wonflow-demo-appointment-bookings";

export const APPOINTMENT_DEPARTMENTS:
  readonly {
    value:
      AppointmentDepartment;

    label: string;
  }[] = [
    {
      value:
        "general-medicine",
      label:
        "General Medicine",
    },
    {
      value:
        "cardiology",
      label:
        "Cardiology",
    },
    {
      value:
        "orthopedics",
      label:
        "Orthopedics",
    },
    {
      value:
        "pediatrics",
      label:
        "Pediatrics",
    },
    {
      value:
        "gynecology",
      label:
        "Gynecology",
    },
    {
      value:
        "dermatology",
      label:
        "Dermatology",
    },
    {
      value:
        "ent",
      label:
        "ENT",
    },
    {
      value:
        "general-surgery",
      label:
        "General Surgery",
    },
  ];

export const APPOINTMENT_SERVICE_CATALOG:
  readonly AppointmentService[] =
  [
    {
      id:
        "appointment-general-consultation",

      code:
        "OPD-GEN",

      name:
        "General Consultation",

      department:
        "general-medicine",

      durationMinutes: 20,

      feeMinorUnits:
        200000,
    },
    {
      id:
        "appointment-follow-up",

      code:
        "OPD-FUP",

      name:
        "General Follow-up",

      department:
        "general-medicine",

      durationMinutes: 15,

      feeMinorUnits:
        120000,
    },
    {
      id:
        "appointment-cardiology-consultation",

      code:
        "OPD-CARD",

      name:
        "Cardiology Consultation",

      department:
        "cardiology",

      durationMinutes: 30,

      feeMinorUnits:
        400000,
    },
    {
      id:
        "appointment-cardiology-follow-up",

      code:
        "CARD-FUP",

      name:
        "Cardiology Follow-up",

      department:
        "cardiology",

      durationMinutes: 20,

      feeMinorUnits:
        250000,
    },
    {
      id:
        "appointment-orthopedic-consultation",

      code:
        "OPD-ORTH",

      name:
        "Orthopedic Consultation",

      department:
        "orthopedics",

      durationMinutes: 30,

      feeMinorUnits:
        350000,
    },
    {
      id:
        "appointment-pediatric-consultation",

      code:
        "OPD-PED",

      name:
        "Pediatric Consultation",

      department:
        "pediatrics",

      durationMinutes: 25,

      feeMinorUnits:
        300000,
    },
    {
      id:
        "appointment-gynecology-consultation",

      code:
        "OPD-GYN",

      name:
        "Gynecology Consultation",

      department:
        "gynecology",

      durationMinutes: 30,

      feeMinorUnits:
        350000,
    },
    {
      id:
        "appointment-dermatology-consultation",

      code:
        "OPD-DERM",

      name:
        "Dermatology Consultation",

      department:
        "dermatology",

      durationMinutes: 20,

      feeMinorUnits:
        300000,
    },
    {
      id:
        "appointment-ent-consultation",

      code:
        "OPD-ENT",

      name:
        "ENT Consultation",

      department:
        "ent",

      durationMinutes: 25,

      feeMinorUnits:
        300000,
    },
    {
      id:
        "appointment-surgery-consultation",

      code:
        "OPD-SURG",

      name:
        "General Surgery Consultation",

      department:
        "general-surgery",

      durationMinutes: 30,

      feeMinorUnits:
        400000,
    },
  ];

function createIdentifier(
  prefix: string,
): string {
  if (
    typeof globalThis.crypto
      ?.randomUUID ===
    "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return [
    prefix,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function padNumber(
  value: number,
): string {
  return String(value)
    .padStart(2, "0");
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

  return `${padNumber(
    hours,
  )}:${padNumber(minutes)}`;
}

function formatSlotLabel(
  start: string,
  end: string,
): string {
  const formatTime =
    (
      value: string,
    ): string => {
      const [
        hourText,
        minuteText,
      ] = value.split(":");

      const hour =
        Number(hourText);

      const suffix =
        hour >= 12
          ? "PM"
          : "AM";

      const displayHour =
        hour % 12 || 12;

      return `${displayHour}:${minuteText} ${suffix}`;
    };

  return `${formatTime(
    start,
  )} – ${formatTime(end)}`;
}

function rangesOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): boolean {
  return (
    leftStart <
      rightEnd &&
    leftEnd >
      rightStart
  );
}

export function getDefaultAppointmentDate():
  string {
  const currentDate =
    new Date();

  currentDate.setDate(
    currentDate.getDate() +
      1,
  );

  return [
    currentDate.getFullYear(),
    padNumber(
      currentDate.getMonth() +
        1,
    ),
    padNumber(
      currentDate.getDate(),
    ),
  ].join("-");
}

export function getTodayDateInputValue():
  string {
  const currentDate =
    new Date();

  return [
    currentDate.getFullYear(),
    padNumber(
      currentDate.getMonth() +
        1,
    ),
    padNumber(
      currentDate.getDate(),
    ),
  ].join("-");
}

export function createInitialAppointmentBookingDraft(
  patientId: string,
  branchId: string,
): AppointmentBookingDraft {
  return {
    patientId,
    branchId,

    department:
      "general-medicine",

    serviceId: "",
    practitionerId: "",

    appointmentDate:
      getDefaultAppointmentDate(),

    slotStart: "",

    reasonForVisit: "",

    source: "walk-in",

    priority: "routine",

    notes: "",
  };
}

export function getDepartmentLabel(
  department:
    AppointmentDepartment,
): string {
  return (
    APPOINTMENT_DEPARTMENTS
      .find(
        (record) =>
          record.value ===
          department,
      )
      ?.label ??
    department
  );
}

export function getAppointmentService(
  serviceId: string,
): AppointmentService |
  undefined {
  return APPOINTMENT_SERVICE_CATALOG
    .find(
      (service) =>
        service.id ===
        serviceId,
    );
}

export function generateAppointmentTimeSlots(
  input: {
    appointmentDate: string;

    practitionerId: string;

    durationMinutes: number;

    existingBookings:
      readonly DemoAppointmentBooking[];
  },
): AppointmentTimeSlot[] {
  if (
    input.appointmentDate ===
      "" ||
    input.practitionerId ===
      "" ||
    input.durationMinutes <= 0
  ) {
    return [];
  }

  const appointmentDate =
    new Date(
      `${input.appointmentDate}T12:00:00`,
    );

  if (
    Number.isNaN(
      appointmentDate
        .getTime(),
    )
  ) {
    return [];
  }

  const dayOfWeek =
    appointmentDate.getDay();

  const workingStart =
    dayOfWeek === 0
      ? 10 * 60
      : 9 * 60;

  const workingEnd =
    dayOfWeek === 0
      ? 14 * 60
      : dayOfWeek === 6
        ? 15 * 60
        : 17 * 60;

  const lunchStart =
    13 * 60;

  const lunchEnd =
    14 * 60;

  const relevantBookings =
    input.existingBookings
      .filter(
        (booking) =>
          booking
            .appointmentDate ===
            input
              .appointmentDate &&
          booking
            .practitionerId ===
            input
              .practitionerId &&
          booking.status !==
            "cancelled",
      );

  const slots:
    AppointmentTimeSlot[] =
    [];

  for (
    let slotStart =
      workingStart;
    slotStart +
      input.durationMinutes <=
      workingEnd;
    slotStart += 15
  ) {
    const slotEnd =
      slotStart +
      input.durationMinutes;

    const overlapsLunch =
      dayOfWeek !== 0 &&
      rangesOverlap(
        slotStart,
        slotEnd,
        lunchStart,
        lunchEnd,
      );

    if (overlapsLunch) {
      continue;
    }

    const start =
      minutesToTime(
        slotStart,
      );

    const end =
      minutesToTime(
        slotEnd,
      );

    const overlapsBooking =
      relevantBookings.some(
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

    slots.push({
      start,
      end,

      label:
        formatSlotLabel(
          start,
          end,
        ),

      available:
        !overlapsBooking,
    });
  }

  return slots;
}

export function validateAppointmentBooking(
  draft:
    AppointmentBookingDraft,
): AppointmentBookingErrors {
  const errors:
    AppointmentBookingErrors =
    {};

  if (
    draft.patientId === ""
  ) {
    errors.patientId =
      "Select a patient.";
  }

  if (
    draft.branchId === ""
  ) {
    errors.branchId =
      "Select a hospital branch.";
  }

  if (
    draft.serviceId === ""
  ) {
    errors.serviceId =
      "Select an appointment service.";
  }

  if (
    draft.practitionerId ===
    ""
  ) {
    errors.practitionerId =
      "Select an available doctor.";
  }

  if (
    draft.appointmentDate ===
    ""
  ) {
    errors.appointmentDate =
      "Select an appointment date.";
  } else if (
    !isValidAppointmentDateValue(
      draft.appointmentDate,
    )
  ) {
    errors.appointmentDate =
      "Select a valid appointment date.";
  } else if (
    draft.appointmentDate <
    getTodayDateInputValue()
  ) {
    errors.appointmentDate =
      "Appointment dates cannot be in the past.";
  }

  if (
    draft.slotStart === ""
  ) {
    errors.slotStart =
      "Select an available time.";
  }

  if (
    draft.reasonForVisit
      .trim()
      .length < 3
  ) {
    errors.reasonForVisit =
      "Enter the reason for the visit.";
  }

  return errors;
}

function isValidAppointmentDateValue(
  value: string,
): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (match === null) {
    return false;
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

  return (
    date.getFullYear() === year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() === day
  );
}

function generateAppointmentNumber():
  string {
  const currentDate =
    new Date();

  const datePart = [
    currentDate.getFullYear(),
    padNumber(
      currentDate.getMonth() +
        1,
    ),
    padNumber(
      currentDate.getDate(),
    ),
  ].join("");

  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `APT-${datePart}-${randomPart}`;
}

export interface CreateDemoAppointmentBookingOptions {
  durationMinutes?: number;
  feeMinorUnits?: number;
}

export function createDemoAppointmentBooking(
  draft:
    AppointmentBookingDraft,
  options:
    CreateDemoAppointmentBookingOptions =
      {},
): DemoAppointmentBooking {
  const service =
    getAppointmentService(
      draft.serviceId,
    );

  if (
    service === undefined
  ) {
    throw new Error(
      "The selected appointment service does not exist.",
    );
  }

  const effectiveDurationMinutes =
    options.durationMinutes ??
    service.durationMinutes;

  const effectiveFeeMinorUnits =
    options.feeMinorUnits ??
    service.feeMinorUnits;

  if (
    !Number.isSafeInteger(
      effectiveDurationMinutes,
    ) ||
    effectiveDurationMinutes <= 0
  ) {
    throw new Error(
      "The appointment duration must be a positive whole number of minutes.",
    );
  }

  if (
    !Number.isSafeInteger(
      effectiveFeeMinorUnits,
    ) ||
    effectiveFeeMinorUnits < 0
  ) {
    throw new Error(
      "The appointment fee must be a non-negative amount in minor units.",
    );
  }

  const startMinutes =
    timeToMinutes(
      draft.slotStart,
    );

  const slotEnd =
    minutesToTime(
      startMinutes +
        effectiveDurationMinutes,
    );

  const scheduledStartAt =
    new Date(
      `${draft.appointmentDate}T${draft.slotStart}:00`,
    ).toISOString();

  const scheduledEndAt =
    new Date(
      `${draft.appointmentDate}T${slotEnd}:00`,
    ).toISOString();

  return {
    id:
      createIdentifier(
        "demo-appointment",
      ),

    appointmentNumber:
      generateAppointmentNumber(),

    patientId:
      draft.patientId,

    branchId:
      draft.branchId,

    practitionerId:
      draft.practitionerId,

    serviceId:
      service.id,

    serviceCode:
      service.code,

    serviceName:
      service.name,

    department:
      service.department,

    appointmentDate:
      draft.appointmentDate,

    slotStart:
      draft.slotStart,

    slotEnd,

    scheduledStartAt,
    scheduledEndAt,

    durationMinutes:
      effectiveDurationMinutes,

    feeMinorUnits:
      effectiveFeeMinorUnits,

    currencyCode: "PKR",

    reasonForVisit:
      draft.reasonForVisit
        .trim(),

    source:
      draft.source,

    priority:
      draft.priority,

    status: "booked",

    notes:
      draft.notes.trim(),

    createdAt:
      new Date()
        .toISOString(),
  };
}

function isStoredAppointmentBooking(
  value: unknown,
): value is DemoAppointmentBooking {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const booking =
    value as Partial<
      DemoAppointmentBooking
    >;
  const validSources:
    readonly AppointmentBookingSource[] =
    [
      "walk-in",
      "phone",
      "online",
      "doctor-referral",
      "hospital-referral",
    ];
  const validPriorities:
    readonly AppointmentPriority[] =
    ["routine", "urgent"];
  const validStatuses:
    readonly DemoAppointmentStatus[] =
    [
      "booked",
      "checked-in",
      "completed",
      "cancelled",
      "no-show",
    ];
  const isTime = (candidate: unknown) =>
    typeof candidate === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(
      candidate,
    );

  return (
    typeof booking.id === "string" &&
    typeof booking.appointmentNumber ===
      "string" &&
    typeof booking.patientId ===
      "string" &&
    typeof booking.branchId ===
      "string" &&
    typeof booking.practitionerId ===
      "string" &&
    typeof booking.serviceId ===
      "string" &&
    typeof booking.serviceCode ===
      "string" &&
    typeof booking.serviceName ===
      "string" &&
    APPOINTMENT_DEPARTMENTS.some(
      (department) =>
        department.value ===
        booking.department,
    ) &&
    typeof booking.appointmentDate ===
      "string" &&
    isValidAppointmentDateValue(
      booking.appointmentDate,
    ) &&
    isTime(booking.slotStart) &&
    isTime(booking.slotEnd) &&
    typeof booking.scheduledStartAt ===
      "string" &&
    !Number.isNaN(
      Date.parse(
        booking.scheduledStartAt,
      ),
    ) &&
    typeof booking.scheduledEndAt ===
      "string" &&
    !Number.isNaN(
      Date.parse(
        booking.scheduledEndAt,
      ),
    ) &&
    Number.isSafeInteger(
      booking.durationMinutes,
    ) &&
    Number(booking.durationMinutes) > 0 &&
    Number.isSafeInteger(
      booking.feeMinorUnits,
    ) &&
    Number(booking.feeMinorUnits) >= 0 &&
    booking.currencyCode === "PKR" &&
    typeof booking.reasonForVisit ===
      "string" &&
    validSources.includes(
      booking.source as
        AppointmentBookingSource,
    ) &&
    validPriorities.includes(
      booking.priority as
        AppointmentPriority,
    ) &&
    validStatuses.includes(
      booking.status as
        DemoAppointmentStatus,
    ) &&
    typeof booking.notes === "string" &&
    typeof booking.createdAt === "string"
  );
}

export function readDemoAppointmentBookings():
  DemoAppointmentBooking[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage
      .getItem(
        DEMO_APPOINTMENT_STORAGE_KEY,
      );

  if (
    storedValue === null
  ) {
    return [];
  }

  try {
    const parsedValue:
      unknown =
      JSON.parse(
        storedValue,
      );

    if (
      !Array.isArray(
        parsedValue,
      )
    ) {
      return [];
    }

    return parsedValue.filter(
      isStoredAppointmentBooking,
    );
  } catch {
    return [];
  }
}

export function persistDemoAppointmentBooking(
  booking:
    DemoAppointmentBooking,
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const bookings =
    readDemoAppointmentBookings();

  const updatedBookings =
    [
      booking,
      ...bookings,
    ].slice(0, 200);

  window.localStorage
    .setItem(
      DEMO_APPOINTMENT_STORAGE_KEY,
      JSON.stringify(
        updatedBookings,
      ),
    );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-appointments-changed",
    ),
  );
}

export function writeDemoAppointmentBookings(
  bookings:
    readonly DemoAppointmentBooking[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    DEMO_APPOINTMENT_STORAGE_KEY,
    JSON.stringify(
      bookings.slice(0, 200),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-appointments-changed",
    ),
  );
}

export function updateDemoAppointmentBookingStatus(
  bookingId: string,
  status:
    DemoAppointmentStatus,
): DemoAppointmentBooking |
  undefined {
  const bookings =
    readDemoAppointmentBookings();

  const existingBooking =
    bookings.find(
      (booking) =>
        booking.id ===
        bookingId,
    );

  if (
    existingBooking ===
    undefined
  ) {
    return undefined;
  }

  const updatedBooking:
    DemoAppointmentBooking =
    {
      ...existingBooking,
      status,
    };

  writeDemoAppointmentBookings(
    bookings.map(
      (booking) =>
        booking.id ===
        bookingId
          ? updatedBooking
          : booking,
    ),
  );

  return updatedBooking;
}

export interface RescheduleDemoAppointmentBookingOptions {
  durationMinutes?: number;
}

export function rescheduleDemoAppointmentBooking(
  bookingId: string,
  appointmentDate: string,
  slotStart: string,
  options:
    RescheduleDemoAppointmentBookingOptions =
    {},
): DemoAppointmentBooking |
  undefined {
  const bookings =
    readDemoAppointmentBookings();

  const existingBooking =
    bookings.find(
      (booking) =>
        booking.id ===
        bookingId,
    );

  if (
    existingBooking ===
    undefined
  ) {
    return undefined;
  }

  if (
    !isValidAppointmentDateValue(
      appointmentDate,
    ) ||
    appointmentDate <
      getTodayDateInputValue()
  ) {
    throw new Error(
      "Select a valid current or future appointment date.",
    );
  }

  const startMinutes =
    timeToMinutes(
      slotStart,
    );

  const effectiveDurationMinutes =
    options.durationMinutes ??
    existingBooking.durationMinutes;

  if (
    !Number.isSafeInteger(
      effectiveDurationMinutes,
    ) ||
    effectiveDurationMinutes <= 0
  ) {
    throw new Error(
      "The appointment duration must be a positive whole number of minutes.",
    );
  }

  const slotEnd =
    minutesToTime(
      startMinutes +
        effectiveDurationMinutes,
    );

  const scheduledStartAt =
    new Date(
      `${appointmentDate}T${slotStart}:00`,
    ).toISOString();

  const scheduledEndAt =
    new Date(
      `${appointmentDate}T${slotEnd}:00`,
    ).toISOString();

  const updatedBooking:
    DemoAppointmentBooking =
    {
      ...existingBooking,

      appointmentDate,

      slotStart,
      slotEnd,

      scheduledStartAt,
      scheduledEndAt,

      durationMinutes:
        effectiveDurationMinutes,

      status: "booked",
    };

  writeDemoAppointmentBookings(
    bookings.map(
      (booking) =>
        booking.id ===
        bookingId
          ? updatedBooking
          : booking,
    ),
  );

  return updatedBooking;
}
