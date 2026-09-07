import { hasPermission } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";

/**
 * The permissions that mean "this person is clinical staff".
 *
 * Any one of them is enough. Doctors hold the encounter and drain permissions;
 * physiotherapists and dietitians hold `observations.patient.read`, which is
 * what lets them open the chart of a patient referred to them.
 */
const CLINICAL_READ_PERMISSIONS = [
  "observations.patient.read",
  "drains.read",
  "encounters.read",
  "careplans.read",
] as const;

/**
 * Guards the patient-scoped clinical endpoints under `/api/v1/patients/[patientId]/…`.
 *
 * Those routes took the patient id straight from the URL and called their
 * service with nothing but `requireRequestContext()` — no permission check at
 * all. Every one of them was therefore readable by *any* authenticated member
 * of the tenant. Verified against a running server: an account holding only the
 * BILLING role (billing, payments, refunds, patients.read, appointments.read —
 * no clinical permission whatsoever) could fetch an arbitrary patient's surgical
 * drain output, symptom diary and medication adherence, and received 200 on all
 * three.
 *
 * This does not attempt to be the full care-team model — a referral- or
 * assignment-scoped grant per patient is the right long-term answer and is
 * tracked separately. It closes the part that is indefensible today: reading a
 * stranger's clinical record while holding no clinical role at all.
 */
export function requireClinicalPatientAccess(context: WonFlowRequestContext): void {
  if (CLINICAL_READ_PERMISSIONS.some((permission) => hasPermission(context, permission))) return;

  throw new WonFlowApiError(
    403,
    "clinical-access-required",
    "Viewing a patient's clinical record requires a clinical role.",
  );
}
