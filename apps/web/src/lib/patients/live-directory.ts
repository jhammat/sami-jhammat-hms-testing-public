import { phaseOneApi } from "@/lib/api/phase-one-api";

import { createInitialPatientRegistrationDraft } from "./registration";
import type { DemoPatientRegistrationResult } from "./registration";

interface LivePatient {
  id: string;
  patientNumber: string;
  givenName: string;
  middleName: string | null;
  familyName: string;
  dateOfBirth: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: unknown;
  guardianData: unknown;
  createdAt: string;
  identifiers?: Array<{ type: string; value: string; isPrimary: boolean }>;
}

const readText = (source: unknown, key: string): string => {
  if (typeof source !== "object" || source === null) return "";
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
};

const toGender = (sex: string | null): DemoPatientRegistrationResult["draft"]["gender"] => {
  const value = sex?.trim().toLowerCase();
  return value === "male" || value === "female" || value === "other" ? value : "unknown";
};

/**
 * Presents a database patient in the shape the directory screen renders.
 *
 * The directory was written against browser-stored demo registrations, so
 * patients registered at reception — which writes to the tenant database — never
 * appeared. Mapping here keeps that screen intact while it reads live records.
 */
export function toDirectoryEntry(patient: LivePatient): DemoPatientRegistrationResult {
  const draft = createInitialPatientRegistrationDraft("");
  const primaryIdentifier = patient.identifiers?.find((identifier) => identifier.isPrimary) ?? patient.identifiers?.[0];
  return {
    id: patient.id,
    mrNumber: patient.patientNumber,
    displayName: [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" "),
    registeredAt: patient.createdAt,
    draft: {
      ...draft,
      givenName: patient.givenName,
      middleName: patient.middleName ?? "",
      fatherName: readText(patient.guardianData, "fatherName"),
      gender: toGender(patient.sex),
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : "",
      mobileNumber: patient.phone ?? "",
      emailAddress: patient.email ?? "",
      cnicNumber: primaryIdentifier?.value ?? "",
      addressLine: readText(patient.address, "text"),
      emergencyContactPhone: readText(patient.guardianData, "emergencyContact"),
    },
  };
}

export async function fetchDirectoryPatients(signal?: AbortSignal): Promise<DemoPatientRegistrationResult[]> {
  const { patients } = await phaseOneApi<{ patients: LivePatient[] }>("/api/v1/patients", { signal });
  return patients.map(toDirectoryEntry);
}

/** Archives the patient; clinical history is retained, the record leaves the directory. */
export async function removeDirectoryPatient(patientId: string): Promise<void> {
  await phaseOneApi(`/api/v1/patients/${patientId}`, { method: "DELETE" });
}
