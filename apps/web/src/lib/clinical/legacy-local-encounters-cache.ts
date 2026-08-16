import type { DemoClinicalEncounter } from "./encounters";

/**
 * Compatibility cache for screens not yet wired to the live encounters API
 * (doctor patient search — tracked separately). Consultations are
 * server-held (see @/lib/api/clinical); this in-memory cache is not
 * localStorage and is not primed by anything today, so it always starts
 * (and stays) empty until that screen is wired to a real endpoint. It
 * exists only so those screens keep compiling and degrade to "no data"
 * instead of reintroducing localStorage.
 */

let cache: DemoClinicalEncounter[] = [];

export function primeLegacyEncountersCache(encounters: readonly DemoClinicalEncounter[]): void {
  cache = [...encounters];
}

export function readDemoClinicalEncounters(): DemoClinicalEncounter[] {
  return cache;
}
