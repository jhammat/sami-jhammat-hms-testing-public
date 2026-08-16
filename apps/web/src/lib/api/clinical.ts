import { apiGet, apiPost } from "./client";
import { resourceTags } from "./cache";
import { useApiMutation } from "./use-api-mutation";
import { useApiResource } from "./use-api-resource";
import type { UseApiResourceResult } from "./use-api-resource";
import type { UseApiMutationResult } from "./use-api-mutation";

/**
 * The clinical encounter data-access layer: starting/completing a
 * consultation, the encounter record, and its notes, observations,
 * diagnoses, diagnostic orders and prescriptions. The encounter is always
 * server-held — nothing here decides locally whether a patient has been
 * seen. See docs/architecture/clinical-encounters.md.
 */

export type EncounterStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "ENTERED_IN_ERROR";

export type ClinicalNoteStatus =
  | "DRAFT"
  | "SIGNED"
  | "RELEASED"
  | "AMENDED"
  | "VOID";

export type DiagnosisCertainty =
  | "PROVISIONAL"
  | "DIFFERENTIAL"
  | "CONFIRMED"
  | "REFUTED";

export type DiagnosticOrderType =
  | "LABORATORY"
  | "RADIOLOGY";

/** The single free-text consultation note this encounter autosaves. Other note types (e.g. nursing) are out of this task's scope. */
export const CONSULTATION_NOTE_TYPE = "consultation";

export interface ConsultationNoteContent {
  text: string;
}

export interface EncounterNoteRecord {
  id: string;
  encounterId: string;
  noteType: string;
  content: unknown;
  status: ClinicalNoteStatus;
  version: number;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EncounterDiagnosisRecord {
  id: string;
  codeSystem: string | null;
  code: string | null;
  display: string;
  certainty: DiagnosisCertainty;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
}

export interface DiagnosticOrderRecord {
  id: string;
  type: DiagnosticOrderType;
  status: string;
  priority: string;
  code: string;
  name: string;
  specimenOrBodySite: string | null;
  clinicalReason: string | null;
  orderedAt: string | null;
}

export interface PrescriptionItemRecord {
  id: string;
  medicationId: string;
  medication: { id: string; name: string } | null;
  dose: string;
  route: string | null;
  frequency: string;
  duration: string | null;
  quantity: string | null;
  instructions: string | null;
}

export interface PrescriptionRecord {
  id: string;
  status: string;
  instructions: string | null;
  items: PrescriptionItemRecord[];
  createdAt: string;
}

export interface EncounterPatientSummary {
  id: string;
  patientNumber: string;
  givenName: string;
  middleName: string | null;
  familyName: string;
  dateOfBirth: string | null;
  sex: string | null;
  identifiers: readonly { type: string; value: string; isPrimary: boolean }[];
  allergies: readonly { id: string; substance: string; severity: string }[];
  observations: readonly {
    id: string;
    code: string;
    display: string;
    valueNumber: string | null;
    valueText: string | null;
    unit: string | null;
    observedAt: string;
  }[];
}

export interface EncounterRecord {
  id: string;
  patientId: string;
  appointmentId: string | null;
  doctorId: string | null;
  branchId: string;
  status: EncounterStatus;
  reason: string | null;
  signedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: EncounterPatientSummary;
  notes: EncounterNoteRecord[];
  diagnoses: EncounterDiagnosisRecord[];
  diagnosticOrders: DiagnosticOrderRecord[];
  prescriptions: PrescriptionRecord[];
}

const ENCOUNTERS_TAG = "encounters";

function encounterTag(encounterId: string): string {
  return resourceTags(ENCOUNTERS_TAG, encounterId)[1];
}

export function getEncounter(encounterId: string, signal?: AbortSignal): Promise<{ encounter: EncounterRecord }> {
  return apiGet<{ encounter: EncounterRecord }>(`/api/v1/doctor/encounters/${encounterId}`, { signal });
}

export function useEncounter(encounterId: string): UseApiResourceResult<{ encounter: EncounterRecord }> {
  return useApiResource<{ encounter: EncounterRecord }>({
    key: `encounter:${encounterId}`,
    tags: [ENCOUNTERS_TAG, encounterTag(encounterId)],
    fetcher: (signal) => getEncounter(encounterId, signal),
    isEmpty: () => false,
  });
}

export interface SaveNoteDraftInput {
  noteId?: string;
  noteType: string;
  content: unknown;
  version?: number;
}

/** Creates the note on the first save, then updates it in place with optimistic-concurrency versioning on every later save — this is the autosave primitive. */
export function saveNoteDraft(encounterId: string, input: SaveNoteDraftInput): Promise<{ note: EncounterNoteRecord }> {
  return apiPost<{ note: EncounterNoteRecord }, SaveNoteDraftInput>(`/api/v1/doctor/encounters/${encounterId}/notes`, input);
}

export function signNote(encounterId: string, noteId: string): Promise<{ note: EncounterNoteRecord }> {
  return apiPost<{ note: EncounterNoteRecord }, Record<string, never>>(`/api/v1/doctor/encounters/${encounterId}/notes/${noteId}/sign`, {});
}

export interface AddDiagnosisInput {
  codeSystem?: string;
  code?: string;
  display: string;
  certainty: DiagnosisCertainty;
  isPrimary?: boolean;
  notes?: string;
}

export function addDiagnosis(encounterId: string, input: AddDiagnosisInput): Promise<{ diagnosis: EncounterDiagnosisRecord }> {
  return apiPost<{ diagnosis: EncounterDiagnosisRecord }, AddDiagnosisInput>(`/api/v1/doctor/encounters/${encounterId}/diagnoses`, input);
}

export interface RecordObservationInput {
  code: string;
  display: string;
  valueNumber?: number;
  valueText?: string;
  unit?: string;
  observedAt: string;
}

export function recordObservation(encounterId: string, input: RecordObservationInput): Promise<{ observation: EncounterPatientSummary["observations"][number] }> {
  return apiPost<{ observation: EncounterPatientSummary["observations"][number] }, RecordObservationInput>(`/api/v1/doctor/encounters/${encounterId}/observations`, input);
}

export interface CreateOrderInput {
  type: DiagnosticOrderType;
  code: string;
  name: string;
  priority?: string;
  specimenOrBodySite?: string;
  clinicalReason?: string;
}

export function createOrder(encounterId: string, input: CreateOrderInput): Promise<{ order: DiagnosticOrderRecord }> {
  return apiPost<{ order: DiagnosticOrderRecord }, CreateOrderInput>(`/api/v1/doctor/encounters/${encounterId}/orders`, input);
}

export interface CreatePrescriptionInput {
  instructions?: string;
  items: readonly {
    medicationId: string;
    dose: string;
    route?: string;
    frequency: string;
    duration?: string;
    quantity?: number;
    instructions?: string;
  }[];
}

export function createPrescription(encounterId: string, input: CreatePrescriptionInput): Promise<{ prescription: PrescriptionRecord }> {
  return apiPost<{ prescription: PrescriptionRecord }, CreatePrescriptionInput>(`/api/v1/doctor/encounters/${encounterId}/prescriptions`, input);
}

/** SaveIndicator-driven autosave: saveState tracks idle/saving/saved/failed, and the note text is never cleared on failure. */
export function useSaveNoteDraft(encounterId: string): UseApiMutationResult<{ note: EncounterNoteRecord }, SaveNoteDraftInput> {
  return useApiMutation((input: SaveNoteDraftInput) => saveNoteDraft(encounterId, input), {
    invalidates: [ENCOUNTERS_TAG, encounterTag(encounterId)],
  });
}

/**
 * Signing (or countersigning) a note. The server alone decides whether the
 * caller may sign this specific note — a supervised clinician gets a 403
 * on their own note no matter what the client sends; only their assigned
 * supervisor's countersignature succeeds.
 */
export function useSignNote(encounterId: string): UseApiMutationResult<{ note: EncounterNoteRecord }, string> {
  return useApiMutation((noteId: string) => signNote(encounterId, noteId), {
    invalidates: [ENCOUNTERS_TAG, encounterTag(encounterId)],
  });
}

export function useAddDiagnosis(encounterId: string): UseApiMutationResult<{ diagnosis: EncounterDiagnosisRecord }, AddDiagnosisInput> {
  return useApiMutation((input: AddDiagnosisInput) => addDiagnosis(encounterId, input), {
    invalidates: [ENCOUNTERS_TAG, encounterTag(encounterId)],
  });
}

export function useRecordObservation(encounterId: string): UseApiMutationResult<{ observation: EncounterPatientSummary["observations"][number] }, RecordObservationInput> {
  return useApiMutation((input: RecordObservationInput) => recordObservation(encounterId, input), {
    invalidates: [ENCOUNTERS_TAG, encounterTag(encounterId)],
  });
}

export function useCreateOrder(encounterId: string): UseApiMutationResult<{ order: DiagnosticOrderRecord }, CreateOrderInput> {
  return useApiMutation((input: CreateOrderInput) => createOrder(encounterId, input), {
    invalidates: [ENCOUNTERS_TAG, encounterTag(encounterId)],
  });
}

export function useCreatePrescription(encounterId: string): UseApiMutationResult<{ prescription: PrescriptionRecord }, CreatePrescriptionInput> {
  return useApiMutation((input: CreatePrescriptionInput) => createPrescription(encounterId, input), {
    invalidates: [ENCOUNTERS_TAG, encounterTag(encounterId)],
  });
}
