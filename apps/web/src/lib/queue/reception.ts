import type {
  DemoAppointmentBooking,
} from "@/lib/appointments";

import {
  getActiveDemoDoctorSitting,
} from "@/lib/doctor-sittings";

import type {
  DemoDoctorSitting,
} from "@/lib/doctor-sittings";

export type DemoQueuePriority =
  | "routine"
  | "urgent"
  | "emergency";

export type DemoQueueStatus =
  | "waiting"
  | "called"
  | "serving"
  | "completed"
  | "skipped"
  | "cancelled";

export type DemoReceptionPaymentStatus =
  | "paid"
  | "partial"
  | "unpaid";

export interface DemoReceptionQueueServiceSnapshot {
  id: string;
  name: string;
  category: string;
  price: number;
}

export interface DemoReceptionQueueSnapshot {
  patient: {
    displayName: string;
    mrNumber: string;
    identityType: string;
    identityNumber: string;
    mobileNumber: string;
    gender: string;
    ageYears: number;
    dateOfBirth: string;
    ageIsEstimated: boolean;
    bloodGroup: string;
    allergies: string;
    medicalAlert: string;
  };
  practitioner: {
    displayName: string;
    specialtyName: string;
  };
  visit: {
    purpose: string;
    consultationType: string;
    reasonForVisit: string;
    appointmentDate: string;
    appointmentTime: string;
    services: DemoReceptionQueueServiceSnapshot[];
  };
  billing: {
    currencyCode: "PKR";
    subtotal: number;
    discount: number;
    total: number;
    received: number;
    balance: number;
    change: number;
    paymentMethod: string;
    paymentStatus: DemoReceptionPaymentStatus;
  };
}

export interface QueueRoomOption {
  id: string;
  label: string;
  category:
    | "consultation"
    | "triage"
    | "procedure";
}

export interface DemoQueueEntry {
  id: string;

  tokenNumber: string;
  sequenceNumber: number;

  businessDate: string;

  appointmentId: string;

  patientId: string;
  branchId: string;
  practitionerId: string;

  serviceName: string;

  priority:
    DemoQueuePriority;

  status:
    DemoQueueStatus;

  roomId?: string;
  roomLabel?: string;
  doctorSittingId?: string;
  estimatedStartAt?: string;
  averageConsultationMinutes?: number;

  checkedInAt: string;

  calledAt?: string;
  serviceStartedAt?: string;
  completedAt?: string;
  skippedAt?: string;
  cancelledAt?: string;

  notes: string;

  source?:
    | "appointment"
    | "reception-desk";

  sourceReference?: string;

  snapshot?: DemoReceptionQueueSnapshot;
}

export const QUEUE_UPDATED_EVENT =
  "wonflow:demo-queue-changed";

export const QUEUE_ROOMS_CHANGED_EVENT = "wonflow:queue-rooms-changed";

// In-memory, session-lived state: the doctor's live queue call/skip/finish
// panel still runs on this demo model (no queue-status-transition endpoints
// exist yet — see FIX-19 report), so it keeps working, but nothing here
// survives a reload or is shared across users, unlike real persisted data.
let demoQueueEntries: DemoQueueEntry[] = [];
let customQueueRooms: QueueRoomOption[] = [];

export const QUEUE_ROOM_OPTIONS:
  readonly QueueRoomOption[] = [
    {
      id: "opd-room-01",
      label: "OPD Room 01",
      category: "consultation",
    },
    {
      id: "opd-room-02",
      label: "OPD Room 02",
      category: "consultation",
    },
    {
      id: "opd-room-03",
      label: "OPD Room 03",
      category: "consultation",
    },
    {
      id: "opd-room-04",
      label: "OPD Room 04",
      category: "consultation",
    },
    {
      id: "opd-room-05",
      label: "OPD Room 05",
      category: "consultation",
    },
    {
      id: "opd-room-06",
      label: "OPD Room 06",
      category: "consultation",
    },
    {
      id: "triage-room-01",
      label: "Triage Room 01",
      category: "triage",
    },
    {
      id: "procedure-room-01",
      label: "Procedure Room 01",
      category: "procedure",
    },
  ];

export function readQueueRoomOptions(): QueueRoomOption[] {
  return [...QUEUE_ROOM_OPTIONS, ...customQueueRooms];
}

export function addCustomConsultationRoom(labelInput: string): QueueRoomOption {
  const label = labelInput.trim();
  if (label.length < 2) throw new Error("Enter a room name with at least 2 characters.");
  const rooms = readQueueRoomOptions();
  const existing = rooms.find((room) => room.label.toLowerCase() === label.toLowerCase());
  if (existing) return existing;
  const room: QueueRoomOption = {
    id: `custom-room-${crypto.randomUUID()}`,
    label,
    category: "consultation",
  };
  customQueueRooms = [...customQueueRooms, room];
  if (typeof window !== "undefined") window.dispatchEvent(new Event(QUEUE_ROOMS_CHANGED_EVENT));
  return room;
}

function createQueueIdentifier():
  string {
  if (
    typeof globalThis.crypto
      ?.randomUUID === "function"
  ) {
    return `queue-${globalThis.crypto.randomUUID()}`;
  }

  return [
    "queue",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function padQueueSequence(
  value: number,
): string {
  return String(value)
    .padStart(3, "0");
}

function getNextQueueSequence(
  entries:
    readonly DemoQueueEntry[],

  branchId: string,
  businessDate: string,
): number {
  const currentSequences =
    entries
      .filter(
        (entry) =>
          entry.branchId ===
            branchId &&
          entry.businessDate ===
            businessDate,
      )
      .map(
        (entry) =>
          entry.sequenceNumber,
      );

  if (
    currentSequences.length === 0
  ) {
    return 1;
  }

  return (
    Math.max(
      ...currentSequences,
    ) + 1
  );
}

export function readDemoQueueEntries():
  DemoQueueEntry[] {
  return demoQueueEntries;
}

export function writeDemoQueueEntries(
  entries:
    readonly DemoQueueEntry[],
): void {
  demoQueueEntries = entries.slice(0, 500);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new Event(
        QUEUE_UPDATED_EVENT,
      ),
    );
  }
}

export function createDemoQueueEntryFromAppointment(
  appointment:
    DemoAppointmentBooking,

  priority:
    DemoQueuePriority =
      appointment.priority,
): DemoQueueEntry {
  const entries =
    readDemoQueueEntries();

  const existingEntry =
    entries.find(
      (entry) =>
        entry.appointmentId ===
          appointment.id &&
        entry.status !==
          "cancelled",
    );

  if (
    existingEntry !==
    undefined
  ) {
    return existingEntry;
  }

  const sequenceNumber =
    getNextQueueSequence(
      entries,
      appointment.branchId,
      appointment.appointmentDate,
    );

  const activeSitting = getActiveDemoDoctorSitting({
    practitionerId: appointment.practitionerId,
    branchId: appointment.branchId,
    businessDate: appointment.appointmentDate,
  });

  const entry:
    DemoQueueEntry = {
    id:
      createQueueIdentifier(),

    tokenNumber:
      `Q-${padQueueSequence(
        sequenceNumber,
      )}`,

    sequenceNumber,

    businessDate:
      appointment.appointmentDate,

    appointmentId:
      appointment.id,

    patientId:
      appointment.patientId,

    branchId:
      appointment.branchId,

    practitionerId:
      appointment.practitionerId,

    serviceName:
      appointment.serviceName,

    priority,

    status: "waiting",

    doctorSittingId: activeSitting?.id,
    roomId: activeSitting?.roomId,
    roomLabel: activeSitting?.roomLabel,

    checkedInAt:
      new Date().toISOString(),

    notes: "",

    source: "appointment",
  };

  writeDemoQueueEntries([
    entry,
    ...entries,
  ]);

  return entry;
}

export function updateDemoQueueEntryStatus(
  entryId: string,
  status:
    DemoQueueStatus,
): DemoQueueEntry |
  undefined {
  const entries =
    readDemoQueueEntries();

  const existingEntry =
    entries.find(
      (entry) =>
        entry.id === entryId,
    );

  if (
    existingEntry === undefined
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updatedEntry:
    DemoQueueEntry = {
    ...existingEntry,
    status,

    calledAt:
      status === "called"
        ? timestamp
        : existingEntry.calledAt,

    serviceStartedAt:
      status === "serving"
        ? timestamp
        : existingEntry
            .serviceStartedAt,

    completedAt:
      status === "completed"
        ? timestamp
        : existingEntry.completedAt,

    skippedAt:
      status === "skipped"
        ? timestamp
        : existingEntry.skippedAt,

    cancelledAt:
      status === "cancelled"
        ? timestamp
        : existingEntry.cancelledAt,
  };

  const updatedEntries = entries.map(
      (entry) =>
        entry.id === entryId
          ? updatedEntry
          : entry,
  );

  const activeDoctorEntries = updatedEntries
    .filter(
      (entry) =>
        entry.practitionerId === updatedEntry.practitionerId &&
        entry.businessDate === updatedEntry.businessDate &&
        entry.status !== "completed" &&
        entry.status !== "cancelled",
    )
    .sort(
      (left, right) =>
        left.sequenceNumber - right.sequenceNumber,
    );
  const recalculatedEntries = updatedEntries.map((entry) => {
    const position = activeDoctorEntries.findIndex(
      (item) => item.id === entry.id,
    );

    if (position < 0) {
      return entry;
    }

    return {
      ...entry,
      estimatedStartAt: new Date(
        Date.now() +
          position *
            (entry.averageConsultationMinutes ?? 15) *
            60_000,
      ).toISOString(),
    };
  });

  writeDemoQueueEntries(recalculatedEntries);

  return updatedEntry;
}

export function assignDemoQueueEntryRoom(
  entryId: string,
  roomId: string,
): DemoQueueEntry |
  undefined {
  const entries =
    readDemoQueueEntries();

  const existingEntry =
    entries.find(
      (entry) =>
        entry.id === entryId,
    );

  if (
    existingEntry === undefined
  ) {
    return undefined;
  }

  const room =
    QUEUE_ROOM_OPTIONS.find(
      (option) =>
        option.id === roomId,
    );

  const updatedEntry:
    DemoQueueEntry = {
    ...existingEntry,

    roomId:
      room?.id,

    roomLabel:
      room?.label,
  };

  writeDemoQueueEntries(
    entries.map(
      (entry) =>
        entry.id === entryId
          ? updatedEntry
          : entry,
    ),
  );

  return updatedEntry;
}

export function syncDemoDoctorSittingToQueueEntries(
  sitting: DemoDoctorSitting,
): number {
  const entries = readDemoQueueEntries();
  let updatedCount = 0;
  const updatedEntries = entries.map((entry) => {
    const belongsToSitting =
      entry.practitionerId === sitting.practitionerId &&
      entry.branchId === sitting.branchId &&
      entry.businessDate === sitting.businessDate;
    const activeQueueEntry =
      entry.status !== "completed" &&
      entry.status !== "cancelled";

    if (!belongsToSitting || !activeQueueEntry) {
      return entry;
    }

    updatedCount += 1;
    return {
      ...entry,
      doctorSittingId: sitting.id,
      roomId: sitting.roomId,
      roomLabel: sitting.roomLabel,
    };
  });

  if (updatedCount > 0) {
    writeDemoQueueEntries(updatedEntries);
  }

  return updatedCount;
}

export function updateDemoQueueEntryPriority(
  entryId: string,
  priority:
    DemoQueuePriority,
): DemoQueueEntry |
  undefined {
  const entries =
    readDemoQueueEntries();

  const existingEntry =
    entries.find(
      (entry) =>
        entry.id === entryId,
    );

  if (
    existingEntry === undefined
  ) {
    return undefined;
  }

  const updatedEntry:
    DemoQueueEntry = {
    ...existingEntry,
    priority,
  };

  writeDemoQueueEntries(
    entries.map(
      (entry) =>
        entry.id === entryId
          ? updatedEntry
          : entry,
    ),
  );

  return updatedEntry;
}

export function calculateDemoQueueWaitMinutes(
  entry:
    DemoQueueEntry,
  currentTime:
    Date = new Date(),
): number {
  const checkedInTime =
    new Date(
      entry.checkedInAt,
    ).getTime();

  if (
    Number.isNaN(
      checkedInTime,
    )
  ) {
    return 0;
  }

  const waitEndTime =
    entry.calledAt ===
    undefined
      ? currentTime.getTime()
      : new Date(
          entry.calledAt,
        ).getTime();

  return Math.max(
    0,
    Math.floor(
      (
        waitEndTime -
        checkedInTime
      ) /
      60000,
    ),
  );
}

export function sortDemoQueueEntries(
  entries:
    readonly DemoQueueEntry[],
): DemoQueueEntry[] {
  const priorityRank:
    Record<
      DemoQueuePriority,
      number
    > = {
    emergency: 0,
    urgent: 1,
    routine: 2,
  };

  const statusRank:
    Record<
      DemoQueueStatus,
      number
    > = {
    serving: 0,
    called: 1,
    waiting: 2,
    skipped: 3,
    completed: 4,
    cancelled: 5,
  };

  return [...entries].sort(
    (
      left,
      right,
    ) => {
      const statusDifference =
        statusRank[left.status] -
        statusRank[right.status];

      if (
        statusDifference !== 0
      ) {
        return statusDifference;
      }

      const priorityDifference =
        priorityRank[
          left.priority
        ] -
        priorityRank[
          right.priority
        ];

      if (
        priorityDifference !== 0
      ) {
        return priorityDifference;
      }

      return (
        left.sequenceNumber -
        right.sequenceNumber
      );
    },
  );
}
