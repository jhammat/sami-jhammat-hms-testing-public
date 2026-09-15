import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext, WonFlowTenantRequestContext } from "@wonflow/contracts";

import { requireClinicalPatientAccess } from "@/server/clinical/clinical-access";
import { referralService } from "@/server/clinical/referral-service";
import { WonFlowApiError } from "@/server/http/route-handler";

/**
 * Who, on the care team, is asking.
 *
 * Taken from the workspace the session is signed in under rather than from the
 * staff record, because one person can hold several workspaces and what they
 * may see depends on the hat they are currently wearing.
 */
export type CareTeamDiscipline = "DOCTOR" | "PHYSIOTHERAPY" | "NUTRITION" | "OTHER";

export function careTeamDisciplineOf(context: WonFlowTenantRequestContext): CareTeamDiscipline {
  switch (context.workspace?.toUpperCase()) {
    case "PHYSIOTHERAPIST":
      return "PHYSIOTHERAPY";
    case "NUTRITIONIST":
      return "NUTRITION";
    case "DOCTOR":
      return "DOCTOR";
    default:
      return "OTHER";
  }
}

/**
 * The patients this caller may open a clinical record for, or `null` when no
 * per-patient restriction applies.
 *
 * This is the same rule the patient directory already enforces
 * (`resolveReferredPatientScope` in reception-service): an allied clinician
 * reaches the patients referred to their discipline and assigned to them or to
 * nobody; everyone else clinical is tenant-scoped. It is restated here as the
 * one shared definition so the care-team surfaces and the directory cannot
 * drift apart — two different answers to "may this person open this chart" is
 * how a leak gets built.
 */
export async function resolveCareTeamPatientScope(
  context: WonFlowTenantRequestContext,
): Promise<string[] | null> {
  const discipline = careTeamDisciplineOf(context);
  if (discipline !== "PHYSIOTHERAPY" && discipline !== "NUTRITION") return null;

  let staffProfileId: string | null = null;
  if (context.membershipId) {
    const staff = await database.staffProfile.findUnique({
      where: { membershipId: context.membershipId },
      select: { id: true },
    });
    staffProfileId = staff?.id ?? null;
  }

  return referralService.getActiveReferredPatientIds(context.tenantId, discipline, staffProfileId);
}

/**
 * Guards a care-team read of one patient's record.
 *
 * Three checks, in order, and the order is the point:
 *
 *  1. the caller holds a clinical role at all,
 *  2. the patient exists inside this tenant,
 *  3. the patient is inside the caller's referral scope.
 *
 * Steps 2 and 3 both answer "not found" rather than "forbidden". A caller who
 * may not see a patient must not be able to learn that the patient exists by
 * the difference between the two replies — probing ids is exactly how a
 * directory gets enumerated.
 */
export async function assertCareTeamPatientAccess(
  requestContext: WonFlowRequestContext,
  patientId: string,
): Promise<{ context: WonFlowTenantRequestContext; discipline: CareTeamDiscipline }> {
  const context = requireTenantContext(requestContext);
  requireClinicalPatientAccess(context);

  const trimmed = patientId?.trim();
  if (!trimmed) {
    throw new WonFlowApiError(400, "missing-patient-id", "A patient must be specified.");
  }

  const notFound = () =>
    new WonFlowApiError(404, "patient-not-found", "The patient could not be found.");

  // Patient ids are uuids. Anything else can match no patient, and passing it
  // to the database would raise a type error — a 500 instead of a clean 404.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) throw notFound();

  const patient = await database.patient.findFirst({
    where: { id: trimmed, tenantId: context.tenantId, status: { not: "ARCHIVED" } },
    select: { id: true },
  });
  if (!patient) throw notFound();

  const scope = await resolveCareTeamPatientScope(context);
  if (scope !== null && !scope.includes(trimmed)) throw notFound();

  return { context, discipline: careTeamDisciplineOf(context) };
}
