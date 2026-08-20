import {
  archivePatient,
  checkPatientDuplicates,
  listPatients,
} from "@/lib/api/patients";

import type {
  ListPatientsQuery,
  ListPatientsResult,
  PatientRecord,
} from "@/lib/api/patients";

import { createInitialPatientRegistrationDraft } from "./registration";
import type { DemoPatientRegistrationResult } from "./registration";

const readText = (source: unknown, key: string): string => {
  if (!source) return "";
  let obj: Record<string, unknown> | null = null;
  if (typeof source === "string") {
    try {
      obj = JSON.parse(source) as Record<string, unknown>;
    } catch {
      return source.trim();
    }
  } else if (typeof source === "object") {
    obj = source as Record<string, unknown>;
  }
  if (!obj || typeof obj !== "object") return "";
  const value = obj[key];
  return typeof value === "string" ? value : "";
};

const readBoolean = (source: unknown, key: string, fallback: boolean): boolean => {
  if (typeof source !== "object" || source === null) return fallback;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : fallback;
};

const toGender = (sex: string | null): DemoPatientRegistrationResult["draft"]["gender"] => {
  const value = sex?.trim().toLowerCase();
  return value === "male" || value === "female" || value === "other" ? value : "unknown";
};

const toPatientCategory = (value: string): DemoPatientRegistrationResult["draft"]["patientCategory"] => {
  return value === "insurance" || value === "corporate" || value === "government" || value === "charity" ? value : "self-pay";
};

const toPreferredLanguage = (value: string): DemoPatientRegistrationResult["draft"]["preferredLanguage"] => {
  return value === "ur" ? "ur" : "en";
};

/**
 * Presents a database patient in the shape every patient screen renders.
 *
 * These screens were written against browser-stored demo registrations, so
 * this mapping keeps that shape while every field underneath it comes from
 * the tenant database. Fields with no dedicated Patient column (father
 * name, blood group, patient category, referral source, ...) round-trip
 * through the record's address/guardianData/consentData JSON, matching how
 * @/server/reception/reception-service.ts writes them.
 */
export function toDirectoryEntry(patient: PatientRecord): DemoPatientRegistrationResult {
  const draft = createInitialPatientRegistrationDraft("");
  const primaryIdentifier = patient.identifiers.find((identifier) => identifier.isPrimary) ?? patient.identifiers[0];

  return {
    id: patient.id,
    mrNumber: patient.patientNumber,
    displayName: [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" "),
    registeredAt: patient.createdAt,
    draft: {
      ...draft,
      givenName: patient.givenName,
      middleName: patient.middleName ?? "",
      fatherName: readText(patient.guardianData, "fatherName") || readText(patient.guardianData, "name") || readText(patient.guardianData, "guardianName") || "",
      gender: toGender(patient.sex),
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : "",
      mobileNumber: patient.phone ?? "",
      alternateMobileNumber: readText(patient.consentData, "alternateMobileNumber"),
      emailAddress: patient.email ?? "",
      cnicNumber: primaryIdentifier?.value ?? "",
      bloodGroup: readText(patient.consentData, "bloodGroup") || readText(patient.guardianData, "bloodGroup") || (typeof (patient as unknown as { bloodGroup?: string }).bloodGroup === "string" ? ((patient as unknown as { bloodGroup?: string }).bloodGroup ?? "") : ""),
      patientCategory: toPatientCategory(readText(patient.consentData, "patientCategory")),
      preferredLanguage: toPreferredLanguage(readText(patient.consentData, "preferredLanguage")),
      city: readText(patient.address, "city"),
      addressLine: readText(patient.address, "text") || readText(patient.address, "addressLine") || readText(patient.address, "line") || readText(patient.address, "street") || (typeof patient.address === "string" ? patient.address : ""),
      emergencyContactName: readText(patient.guardianData, "emergencyContactName"),
      emergencyContactRelation: readText(patient.guardianData, "emergencyContactRelation"),
      emergencyContactPhone: readText(patient.guardianData, "emergencyContactPhone") || readText(patient.guardianData, "emergencyContact") || readText(patient.guardianData, "phone") || readText(patient.consentData, "alternateMobileNumber"),
      referralSource: readText(patient.consentData, "referralSource") || "walk-in",
      notes: readText(patient.consentData, "notes"),
      consentToContact: readBoolean(patient.consentData, "consentToContact", true),
    },
  };
}

export interface DirectoryPage {
  patients: DemoPatientRegistrationResult[];
  total: number;
  page: number;
  pageSize: number;
  summary: ListPatientsResult["summary"];
}

/** Paginated, server-filtered directory read. Search, gender and age-range filters all evaluate on the server. */
export async function fetchDirectoryPage(query: ListPatientsQuery, signal?: AbortSignal): Promise<DirectoryPage> {
  const result = await listPatients(query, signal);
  return {
    patients: result.patients.map(toDirectoryEntry),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    summary: result.summary,
  };
}

/** Server-side name+mobile duplicate lookup, for an inline warning before the registration form is saved. */
export async function fetchDuplicatePatients(lookup: { givenName?: string; familyName?: string; phone?: string }, signal?: AbortSignal): Promise<DemoPatientRegistrationResult[]> {
  const duplicates = await checkPatientDuplicates(lookup, signal);
  return duplicates.map(toDirectoryEntry);
}

/** Archives the patient; clinical history is retained, the record leaves the directory. */
export async function removeDirectoryPatient(patientId: string): Promise<void> {
  await archivePatient(patientId);
}
