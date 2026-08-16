import type { DemoClinicalDocumentation } from "./documentation";

/**
 * Compatibility cache for screens not yet wired to the live clinical
 * documentation (patient search, diagnostics, pharmacy — tracked
 * separately). Real documentation is server-held; this in-memory cache is
 * not localStorage and is not primed by anything today, so it always
 * starts (and stays) empty until those screens are wired to a real
 * endpoint. It exists only so they keep compiling and degrade to "no
 * data" instead of reintroducing localStorage.
 */

const cache: DemoClinicalDocumentation[] = [];

export function readDemoClinicalDocumentation(): DemoClinicalDocumentation[] {
  return cache;
}
