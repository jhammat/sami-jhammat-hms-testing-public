import type { DemoStructuredLaboratoryResult } from "./laboratory-results";
import type { DemoStructuredRadiologyResult } from "./radiology-results";
import type { DemoLaboratoryResultReview } from "./laboratory-review";
import type { DemoRadiologyResultReview } from "./radiology-review";

/**
 * Compatibility cache for the doctor "report inbox" screen, not yet wired
 * to the live diagnostics API — tracked separately. Real results are
 * server-held; this in-memory cache is not localStorage and is never
 * primed, so it always starts (and stays) empty until that screen is
 * wired to a real endpoint. It exists only so it keeps compiling and
 * degrades to "no data" instead of reintroducing localStorage.
 */

const laboratoryResults: DemoStructuredLaboratoryResult[] = [];
const radiologyResults: DemoStructuredRadiologyResult[] = [];
const laboratoryReviews: DemoLaboratoryResultReview[] = [];
const radiologyReviews: DemoRadiologyResultReview[] = [];

export function readDemoStructuredLaboratoryResults(): DemoStructuredLaboratoryResult[] {
  return laboratoryResults;
}

export function readDemoStructuredRadiologyResults(): DemoStructuredRadiologyResult[] {
  return radiologyResults;
}

export function readDemoLaboratoryResultReviews(): DemoLaboratoryResultReview[] {
  return laboratoryReviews;
}

export function readDemoRadiologyResultReviews(): DemoRadiologyResultReview[] {
  return radiologyReviews;
}
