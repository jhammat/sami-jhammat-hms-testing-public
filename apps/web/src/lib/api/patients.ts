import type { IsoDate, IsoDateTime, WonFlowId } from "@wonflow/contracts";

import { apiDelete, apiGet, apiPost } from "./client";
import { resourceTags } from "./cache";
import { useApiMutation } from "./use-api-mutation";
import { useApiResource } from "./use-api-resource";
import type { UseApiResourceResult } from "./use-api-resource";
import type { UseApiMutationResult } from "./use-api-mutation";

/**
 * The patient directory and registration data-access layer. Everything the
 * patient screens need — list, register, duplicate-check, archive — goes
 * through /api/v1/patients and /api/v1/patients/[patientId]; nothing here
 * constructs a fetch by hand or reads/writes localStorage.
 */

export interface PatientIdentifierRecord {
  type: string;
  value: string;
  isPrimary: boolean;
}

export interface PatientAddress {
  text?: string;
  city?: string;
}

export interface PatientGuardianData {
  fatherName?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
}

export interface PatientConsentData {
  consentToContact?: boolean;
  patientCategory?: string;
  preferredLanguage?: string;
  bloodGroup?: string;
  referralSource?: string;
  notes?: string;
  alternateMobileNumber?: string;
}

export interface PatientRecord {
  id: WonFlowId;
  patientNumber: string;
  status: "ACTIVE" | "INACTIVE" | "DECEASED" | "ARCHIVED";
  givenName: string;
  middleName: string | null;
  familyName: string;
  dateOfBirth: IsoDate | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: PatientAddress | null;
  guardianData: PatientGuardianData | null;
  consentData: PatientConsentData | null;
  identifiers: readonly PatientIdentifierRecord[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ListPatientsQuery {
  query?: string;
  gender?: string;
  minimumAge?: number;
  maximumAge?: number;
  page?: number;
  pageSize?: number;
  sort?: "recent" | "name-ascending" | "mr-ascending" | "age-ascending" | "age-descending";
}

export interface ListPatientsSummary {
  totalPatients: number;
  malePatients: number;
  femalePatients: number;
}

export interface ListPatientsResult {
  patients: PatientRecord[];
  total: number;
  page: number;
  pageSize: number;
  summary: ListPatientsSummary;
}

export interface RegisterPatientInput {
  givenName: string;
  middleName?: string;
  familyName: string;
  dateOfBirth?: IsoDate;
  sex?: string;
  phone?: string;
  alternateMobileNumber?: string;
  email?: string;
  fatherName?: string;
  bloodGroup?: string;
  patientCategory?: string;
  preferredLanguage?: string;
  city?: string;
  addressLine?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  referralSource?: string;
  notes?: string;
  consentToContact?: boolean;
  /**
   * Which portal this registration came from — used only to pick a sensible
   * referralSource default when the caller doesn't supply one of their own
   * (reception's form always does, via its own dropdown; the doctor's own
   * "register a patient" page has no such field, so this is what tells a
   * doctor-registered patient apart from an untagged walk-in).
   */
  registeredVia?: "reception" | "doctor";
  identifiers?: readonly {
    type: string;
    system: string;
    value: string;
    isPrimary?: boolean;
  }[];
}

export interface RegisterPatientResult {
  patient: PatientRecord;
  possibleDuplicates: PatientRecord[];
}

export interface DuplicateCheckQuery {
  givenName?: string;
  familyName?: string;
  phone?: string;
}

const PATIENTS_TAG = "patients";

function patientTag(patientId: WonFlowId): string {
  return resourceTags(PATIENTS_TAG, patientId)[1];
}

export function listPatients(query: ListPatientsQuery, signal?: AbortSignal): Promise<ListPatientsResult> {
  return apiGet<ListPatientsResult>("/api/v1/patients", {
    query: {
      query: query.query,
      gender: query.gender,
      minimumAge: query.minimumAge,
      maximumAge: query.maximumAge,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
    },
    signal,
  });
}

/** Name+DOB or phone lookup, called before the record is saved so a duplicate can be shown inline. */
export function checkPatientDuplicates(lookup: DuplicateCheckQuery, signal?: AbortSignal): Promise<PatientRecord[]> {
  if (!lookup.givenName?.trim() && !lookup.familyName?.trim() && !lookup.phone?.trim()) {
    return Promise.resolve([]);
  }

  return apiGet<{ duplicates: PatientRecord[] }>("/api/v1/patients", {
    query: {
      duplicateCheck: "1",
      givenName: lookup.givenName,
      familyName: lookup.familyName,
      phone: lookup.phone,
    },
    signal,
  }).then((response) => response.duplicates);
}

export function registerPatient(input: RegisterPatientInput): Promise<RegisterPatientResult> {
  return apiPost<RegisterPatientResult, RegisterPatientInput>("/api/v1/patients", input);
}

export function archivePatient(patientId: WonFlowId): Promise<{ patient: PatientRecord }> {
  return apiDelete<{ patient: PatientRecord }>(`/api/v1/patients/${patientId}`);
}

/** The read side: paginated, server-filtered, cached under the "patients" tag and revalidated automatically after register/archive. */
export function usePatients(query: ListPatientsQuery): UseApiResourceResult<ListPatientsResult> {
  return useApiResource<ListPatientsResult>({
    key: `patients:${JSON.stringify(query)}`,
    tags: [PATIENTS_TAG],
    fetcher: (signal) => listPatients(query, signal),
    isEmpty: (result) => result.patients.length === 0,
  });
}

/** The write side: saveState drives SaveIndicator directly, and a successful registration revalidates every patients list. */
export function useRegisterPatient(): UseApiMutationResult<RegisterPatientResult, RegisterPatientInput> {
  return useApiMutation((input: RegisterPatientInput) => registerPatient(input), {
    invalidates: resourceTags(PATIENTS_TAG),
  });
}

export function useArchivePatient(): UseApiMutationResult<{ patient: PatientRecord }, WonFlowId> {
  return useApiMutation((patientId: WonFlowId) => archivePatient(patientId), {
    invalidates: (patientId) => [PATIENTS_TAG, patientTag(patientId)],
  });
}
