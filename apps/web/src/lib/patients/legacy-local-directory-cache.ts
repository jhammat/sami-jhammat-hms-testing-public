import type { DemoPatientRegistrationResult } from "./registration";

/**
 * Compatibility cache for screens not yet wired to the live patients API
 * (billing, diagnostics, pharmacy and doctor screens — tracked separately,
 * see FIX-04's follow-ups). Patient registration and the patient directory
 * (FIX-04) read PostgreSQL directly through @/lib/api/patients; this
 * in-memory cache lets the remaining screens keep resolving "the patient
 * with this id" synchronously without reintroducing localStorage. It is
 * primed opportunistically whenever the directory loads a page, and starts
 * empty each session — the same cold-start behaviour those screens already
 * had when localStorage was empty.
 */

let cache: DemoPatientRegistrationResult[] = [];

export function primeLegacyPatientDirectoryCache(
  patients: readonly DemoPatientRegistrationResult[],
): void {
  cache = [...patients];
}

export function readDemoPatientRegistrations(): DemoPatientRegistrationResult[] {
  return cache;
}
