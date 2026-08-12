import {
  readDemoAppointmentBookings,
  updateDemoAppointmentBookingStatus,
} from "@/lib/appointments";

import type {
  DemoAppointmentBooking,
} from "@/lib/appointments";

import {
  getDemoDoctorSitting,
} from "@/lib/doctor-sittings";

import {
  readDemoQueueEntries,
  sortDemoQueueEntries,
  syncDemoDoctorSittingToQueueEntries,
  updateDemoQueueEntryStatus,
} from "@/lib/queue";

import type {
  DemoQueueEntry,
} from "@/lib/queue";

export type DemoClinicalEncounterType =
  | "outpatient"
  | "emergency"
  | "follow-up";

export type DemoClinicalEncounterStatus =
  | "open"
  | "in-consultation"
  | "completed"
  | "cancelled";

export interface DemoClinicalEncounter {
  id: string;

  encounterNumber: string;

  encounterType:
    DemoClinicalEncounterType;

  status:
    DemoClinicalEncounterStatus;

  patientId: string;
  branchId: string;
  practitionerId: string;

  appointmentId: string;
  queueEntryId: string;

  serviceName: string;
  reasonForVisit: string;

  roomId?: string;
  roomLabel?: string;

  openingNote: string;

  createdAt: string;
  startedAt: string;
  updatedAt: string;

  completedAt?: string;
  cancelledAt?: string;
}

export type StartDemoClinicalConsultationError =
  | "queue-entry-not-found"
  | "queue-entry-outside-context"
  | "sitting-not-available"
  | "sitting-on-break"
  | "patient-not-called"
  | "queue-entry-closed"
  | "another-consultation-serving"
  | "encounter-already-completed";

export type StartDemoClinicalConsultationResult =
  | {
      ok: true;
      encounter: DemoClinicalEncounter;
      queueEntry: DemoQueueEntry;
    }
  | {
      ok: false;
      error: StartDemoClinicalConsultationError;
      conflictingQueueEntry?: DemoQueueEntry;
    };

export type CompleteDemoClinicalConsultationResult =
  | {
      ok: true;
      encounter: DemoClinicalEncounter;
      queueEntry?: DemoQueueEntry;
      nextQueueEntry?: DemoQueueEntry;
      appointmentCompleted: boolean;
      alreadyCompleted: boolean;
    }
  | {
      ok: false;
      error:
        | "encounter-not-found"
        | "encounter-not-active"
        | "queue-entry-not-serving";
    };

const DEMO_CLINICAL_ENCOUNTER_STORAGE_KEY =
  "wonflow-demo-clinical-encounters";

function createEncounterIdentifier():
  string {
  if (
    typeof globalThis.crypto
      ?.randomUUID === "function"
  ) {
    return `encounter-${globalThis.crypto.randomUUID()}`;
  }

  return [
    "encounter",
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

function generateEncounterNumber():
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

  return `ENC-${datePart}-${randomPart}`;
}

function determineEncounterType(
  appointment: DemoAppointmentBooking | undefined,
  queueEntry: DemoQueueEntry,
): DemoClinicalEncounterType {
  if (
    (appointment?.priority ?? queueEntry.priority) ===
    "urgent"
  ) {
    return "emergency";
  }

  if (
    (appointment?.serviceName ?? queueEntry.serviceName)
      .toLocaleLowerCase()
      .includes("follow-up")
  ) {
    return "follow-up";
  }

  return "outpatient";
}

export function readDemoClinicalEncounters():
  DemoClinicalEncounter[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      DEMO_CLINICAL_ENCOUNTER_STORAGE_KEY,
    );

  if (storedValue === null) {
    return [];
  }

  try {
    const parsedValue:
      unknown =
      JSON.parse(storedValue);

    if (
      !Array.isArray(
        parsedValue,
      )
    ) {
      return [];
    }

    return parsedValue as
      DemoClinicalEncounter[];
  } catch {
    return [];
  }
}

export function writeDemoClinicalEncounters(
  encounters:
    readonly DemoClinicalEncounter[],
): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    DEMO_CLINICAL_ENCOUNTER_STORAGE_KEY,

    JSON.stringify(
      encounters.slice(
        0,
        500,
      ),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-clinical-encounters-changed",
    ),
  );
}

export function createOrGetDemoClinicalEncounterFromQueue(
  input: {
    queueEntry:
      DemoQueueEntry;

    appointment:
      DemoAppointmentBooking | undefined;
  },
): DemoClinicalEncounter {
  const encounters =
    readDemoClinicalEncounters();

  const existingEncounter =
    encounters.find(
      (encounter) =>
        encounter.queueEntryId ===
          input.queueEntry.id &&
        encounter.status !==
          "cancelled",
    );

  if (
    existingEncounter !==
    undefined
  ) {
    return existingEncounter;
  }

  const timestamp =
    new Date().toISOString();

  const encounter:
    DemoClinicalEncounter = {
    id:
      createEncounterIdentifier(),

    encounterNumber:
      generateEncounterNumber(),

    encounterType:
      determineEncounterType(
        input.appointment,
        input.queueEntry,
      ),

    status:
      "in-consultation",

    patientId:
      input.queueEntry.patientId,

    branchId:
      input.queueEntry.branchId,

    practitionerId:
      input.queueEntry
        .practitionerId,

    appointmentId:
      input.appointment?.id ??
      input.queueEntry.appointmentId,

    queueEntryId:
      input.queueEntry.id,

    serviceName:
      input.appointment?.serviceName ??
      input.queueEntry.serviceName,

    reasonForVisit:
      input.appointment?.reasonForVisit ??
      input.queueEntry.snapshot?.visit.reasonForVisit ??
      input.queueEntry.notes,

    roomId:
      input.queueEntry.roomId,

    roomLabel:
      input.queueEntry.roomLabel,

    openingNote: "",

    createdAt: timestamp,
    startedAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoClinicalEncounters([
    encounter,
    ...encounters,
  ]);

  return encounter;
}

export function startDemoClinicalConsultationFromQueue(
  input: {
    queueEntryId: string;
    practitionerId: string;
    branchId: string;
    businessDate: string;
  },
): StartDemoClinicalConsultationResult {
  const queueEntries =
    readDemoQueueEntries();

  const queueEntry =
    queueEntries.find(
      (entry) =>
        entry.id ===
        input.queueEntryId,
    );

  if (queueEntry === undefined) {
    return {
      ok: false,
      error: "queue-entry-not-found",
    };
  }

  if (
    queueEntry.practitionerId !==
      input.practitionerId ||
    queueEntry.branchId !==
      input.branchId ||
    queueEntry.businessDate !==
      input.businessDate
  ) {
    return {
      ok: false,
      error:
        "queue-entry-outside-context",
    };
  }

  const sitting =
    getDemoDoctorSitting({
      practitionerId:
        queueEntry.practitionerId,
      branchId:
        queueEntry.branchId,
      businessDate:
        queueEntry.businessDate,
    });

  if (
    sitting === undefined ||
    sitting.status ===
      "not-started" ||
    sitting.status === "finished"
  ) {
    return {
      ok: false,
      error: "sitting-not-available",
    };
  }

  if (sitting.status === "on-break") {
    return {
      ok: false,
      error: "sitting-on-break",
    };
  }

  if (queueEntry.status === "waiting") {
    return {
      ok: false,
      error: "patient-not-called",
    };
  }

  if (
    queueEntry.status !== "called" &&
    queueEntry.status !== "serving"
  ) {
    return {
      ok: false,
      error: "queue-entry-closed",
    };
  }

  const conflictingQueueEntry =
    queueEntries.find(
      (entry) =>
        entry.id !== queueEntry.id &&
        entry.practitionerId ===
          queueEntry.practitionerId &&
        entry.businessDate ===
          queueEntry.businessDate &&
        entry.status === "serving",
    );

  if (
    conflictingQueueEntry !==
    undefined
  ) {
    return {
      ok: false,
      error:
        "another-consultation-serving",
      conflictingQueueEntry,
    };
  }

  const existingEncounter =
    readDemoClinicalEncounters().find(
      (encounter) =>
        encounter.queueEntryId ===
          queueEntry.id &&
        encounter.status !==
          "cancelled",
    );

  if (
    existingEncounter?.status ===
    "completed"
  ) {
    return {
      ok: false,
      error:
        "encounter-already-completed",
    };
  }

  syncDemoDoctorSittingToQueueEntries(sitting);

  const synchronizedQueueEntries =
    readDemoQueueEntries();
  const synchronizedQueueEntry =
    synchronizedQueueEntries.find(
      (entry) =>
        entry.id === queueEntry.id,
    );

  if (synchronizedQueueEntry === undefined) {
    return {
      ok: false,
      error: "queue-entry-not-found",
    };
  }

  const lateConflict =
    synchronizedQueueEntries.find(
      (entry) =>
        entry.id !==
          synchronizedQueueEntry.id &&
        entry.practitionerId ===
          synchronizedQueueEntry.practitionerId &&
        entry.businessDate ===
          synchronizedQueueEntry.businessDate &&
        entry.status === "serving",
    );

  if (lateConflict !== undefined) {
    return {
      ok: false,
      error:
        "another-consultation-serving",
      conflictingQueueEntry:
        lateConflict,
    };
  }

  if (
    synchronizedQueueEntry.status !==
      "called" &&
    synchronizedQueueEntry.status !==
      "serving"
  ) {
    return {
      ok: false,
      error:
        synchronizedQueueEntry.status ===
        "waiting"
          ? "patient-not-called"
          : "queue-entry-closed",
    };
  }

  const servingQueueEntry =
    synchronizedQueueEntry.status ===
    "serving"
      ? synchronizedQueueEntry
      : updateDemoQueueEntryStatus(
          synchronizedQueueEntry.id,
          "serving",
        );

  if (servingQueueEntry === undefined) {
    return {
      ok: false,
      error: "queue-entry-not-found",
    };
  }

  const appointment =
    readDemoAppointmentBookings().find(
      (booking) =>
        booking.id ===
          servingQueueEntry.appointmentId &&
        booking.patientId ===
          servingQueueEntry.patientId &&
        booking.practitionerId ===
          servingQueueEntry.practitionerId &&
        booking.branchId ===
          servingQueueEntry.branchId,
    );

  const encounter =
    createOrGetDemoClinicalEncounterFromQueue(
      {
        queueEntry:
          servingQueueEntry,
        appointment,
      },
    );

  const activeEncounter =
    encounter.status === "open"
      ? updateDemoClinicalEncounterStatus(
          encounter.id,
          "in-consultation",
        ) ?? encounter
      : encounter;

  return {
    ok: true,
    encounter: activeEncounter,
    queueEntry: servingQueueEntry,
  };
}

export function completeDemoClinicalConsultation(
  encounterId: string,
): CompleteDemoClinicalConsultationResult {
  const encounters =
    readDemoClinicalEncounters();

  const existingEncounter =
    encounters.find(
      (encounter) =>
        encounter.id === encounterId,
    );

  if (existingEncounter === undefined) {
    return {
      ok: false,
      error: "encounter-not-found",
    };
  }

  if (
    existingEncounter.status ===
    "cancelled"
  ) {
    return {
      ok: false,
      error: "encounter-not-active",
    };
  }

  const queueEntry =
    readDemoQueueEntries().find(
      (entry) =>
        entry.id ===
        existingEncounter.queueEntryId,
    );

  if (
    queueEntry !== undefined &&
    queueEntry.status !== "serving" &&
    queueEntry.status !== "completed"
  ) {
    return {
      ok: false,
      error: "queue-entry-not-serving",
    };
  }

  const alreadyCompleted =
    existingEncounter.status ===
    "completed";

  const completedEncounter =
    alreadyCompleted
      ? existingEncounter
      : updateDemoClinicalEncounterStatus(
          existingEncounter.id,
          "completed",
        ) ?? existingEncounter;

  const completedQueueEntry =
    queueEntry === undefined ||
    queueEntry.status === "completed"
      ? queueEntry
      : updateDemoQueueEntryStatus(
          queueEntry.id,
          "completed",
        ) ?? queueEntry;

  const appointment =
    readDemoAppointmentBookings().find(
      (booking) =>
        booking.id ===
        existingEncounter.appointmentId,
    );

  const completedAppointment =
    appointment === undefined ||
    appointment.status === "cancelled" ||
    appointment.status === "no-show"
      ? undefined
      : appointment.status === "completed"
        ? appointment
        : updateDemoAppointmentBookingStatus(
            appointment.id,
            "completed",
          );

  const nextQueueEntry =
    queueEntry === undefined
      ? undefined
      : sortDemoQueueEntries(
          readDemoQueueEntries().filter(
            (entry) =>
              entry.practitionerId ===
                queueEntry.practitionerId &&
              entry.branchId ===
                queueEntry.branchId &&
              entry.businessDate ===
                queueEntry.businessDate &&
              entry.status === "waiting",
          ),
        )[0];

  return {
    ok: true,
    encounter: completedEncounter,
    queueEntry: completedQueueEntry,
    nextQueueEntry,
    appointmentCompleted:
      completedAppointment?.status ===
      "completed",
    alreadyCompleted,
  };
}

export function updateDemoClinicalEncounterOpeningNote(
  encounterId: string,
  openingNote: string,
): DemoClinicalEncounter |
  undefined {
  const encounters =
    readDemoClinicalEncounters();

  const existingEncounter =
    encounters.find(
      (encounter) =>
        encounter.id ===
        encounterId,
    );

  if (
    existingEncounter ===
    undefined
  ) {
    return undefined;
  }

  const updatedEncounter:
    DemoClinicalEncounter = {
    ...existingEncounter,

    openingNote:
      openingNote.trim(),

    updatedAt:
      new Date().toISOString(),
  };

  writeDemoClinicalEncounters(
    encounters.map(
      (encounter) =>
        encounter.id ===
        encounterId
          ? updatedEncounter
          : encounter,
    ),
  );

  return updatedEncounter;
}

export function updateDemoClinicalEncounterStatus(
  encounterId: string,
  status:
    DemoClinicalEncounterStatus,
): DemoClinicalEncounter |
  undefined {
  const encounters =
    readDemoClinicalEncounters();

  const existingEncounter =
    encounters.find(
      (encounter) =>
        encounter.id ===
        encounterId,
    );

  if (
    existingEncounter ===
    undefined
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updatedEncounter:
    DemoClinicalEncounter = {
    ...existingEncounter,

    status,

    updatedAt: timestamp,

    completedAt:
      status === "completed"
        ? timestamp
        : existingEncounter
            .completedAt,

    cancelledAt:
      status === "cancelled"
        ? timestamp
        : existingEncounter
            .cancelledAt,
  };

  writeDemoClinicalEncounters(
    encounters.map(
      (encounter) =>
        encounter.id ===
        encounterId
          ? updatedEncounter
          : encounter,
    ),
  );

  return updatedEncounter;
}
