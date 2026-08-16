/**
 * The shared "encounter card" shape a few screens still display (doctor
 * consultation hub, patient search, doctor-api adapters). The encounter
 * itself is server-held — see @/lib/api/clinical and
 * docs/architecture/clinical-encounters.md. Starting, completing and
 * documenting a consultation all go through PATCH
 * /api/v1/doctor/queue/[appointmentId] and
 * /api/v1/doctor/encounters/[encounterId] and its sub-routes; nothing here
 * decides locally whether a patient has been seen.
 */

export type DemoClinicalEncounterType =
  | "outpatient"
  | "emergency"
  | "follow-up";

export type DemoClinicalEncounterStatus =
  | "open"
  | "in-consultation"
  | "paused"
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
