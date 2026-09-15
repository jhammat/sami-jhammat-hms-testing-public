import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import { assertCareTeamPatientAccess, resolveCareTeamPatientScope } from "@/server/clinical/care-team-access";
import { requireClinicalPatientAccess } from "@/server/clinical/clinical-access";
import {
  CARE_TEAM_ACKNOWLEDGED_TEMPLATE,
  CARE_TEAM_UPDATE_TEMPLATE,
  notifyAuthorOfAcknowledgement,
} from "@/server/clinical/care-team-notifications";
import { WonFlowApiError } from "@/server/http/route-handler";

/**
 * The shared record of a patient's journey, across every discipline.
 *
 * Each role already had a good workspace, but the three clinical ones were
 * sealed from each other: a doctor held no `therapy.*` or `nutrition.*`
 * permission, a physiotherapist no `nutrition.*`, a dietitian no `therapy.*`.
 * So a dietitian could write a nutrition plan that neither the physiotherapist
 * nor the surgeon could read — not for want of a screen, but for want of the
 * right to read it. This is that right, granted in exactly one place, behind one
 * access rule (`assertCareTeamPatientAccess`), rather than widening each
 * discipline's own write-capable services.
 *
 * It is read-only by construction. Nothing here can change a clinical record;
 * the only write the care team gains is acknowledging what they have read.
 */

export const CARE_TIMELINE_ENTRY_TYPES = [
  "DIAGNOSIS",
  "PRESCRIPTION",
  "DIAGNOSTIC_ORDER",
  "THERAPY_ASSESSMENT",
  "THERAPY_SESSION",
  "NUTRITION_ASSESSMENT",
  "NUTRITION_PLAN",
  "REFERRAL",
  "CARE_PLAN",
  "CARE_PLAN_ALERT",
  "SYMPTOM",
  "DRAIN",
  "OBSERVATION",
] as const;

export type CareTimelineEntryType = (typeof CARE_TIMELINE_ENTRY_TYPES)[number];

export type CareTimelineDiscipline = "DOCTOR" | "PHYSIOTHERAPY" | "NUTRITION" | "PATIENT" | "SYSTEM";

export function isCareTimelineEntryType(value: unknown): value is CareTimelineEntryType {
  return typeof value === "string" && (CARE_TIMELINE_ENTRY_TYPES as readonly string[]).includes(value);
}

export interface CareTimelineAcknowledgement {
  membershipId: string;
  displayName: string;
  note: string | null;
  acknowledgedAt: string;
}

export interface CareTimelineEntry {
  /** `${type}:${recordId}` — stable and unique across the whole timeline. */
  key: string;
  type: CareTimelineEntryType;
  recordId: string;
  discipline: CareTimelineDiscipline;
  occurredAt: string;
  title: string;
  summary: string | null;
  details: Array<{ label: string; value: string }>;
  authorName: string | null;
  /**
   * The member who wrote the entry, when a staff member did. Used so nobody is
   * offered — or allowed — to acknowledge their own work.
   */
  authorMembershipId: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  acknowledgements: CareTimelineAcknowledgement[];
}

export interface CareTeamMemberSummary {
  role: "DOCTOR" | "PHYSIOTHERAPIST" | "NUTRITIONIST";
  staffProfileId: string;
  membershipId: string;
  displayName: string;
  title: string | null;
}

export interface CareTimeline {
  patient: { id: string; patientNumber: string; displayName: string };
  careTeam: CareTeamMemberSummary[];
  entries: CareTimelineEntry[];
  viewerMembershipId: string | null;
}

/**
 * How many of each kind of entry to read.
 *
 * A long recovery produces hundreds of patient-reported readings; without a cap
 * the timeline would pull every drain reading ever logged on each open. Clinical
 * decisions (diagnoses, plans, referrals) are few and uncapped in practice at
 * this size; the high-volume patient-reported streams are the ones this bounds.
 */
const RECENT_CLINICAL = 200;
const RECENT_PATIENT_REPORTED = 60;

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : new Date(0).toISOString());

/** Prisma Decimal, number or null → display string, without trailing float noise. */
function decimalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = typeof value === "object" && value !== null && "toString" in value ? String(value) : String(value);
  const numeric = Number(text);
  return Number.isFinite(numeric) ? String(Math.round(numeric * 100) / 100) : text;
}

function detail(label: string, value: unknown): { label: string; value: string } | null {
  if (value === null || value === undefined) return null;
  const text = typeof value === "string" ? value.trim() : String(value);
  return text ? { label, value: text } : null;
}

const compact = <T,>(values: Array<T | null>): T[] => values.filter((value): value is T => value !== null);

const humanize = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export async function readCareTimeline(
  requestContext: WonFlowRequestContext,
  patientId: string,
): Promise<CareTimeline> {
  const { context } = await assertCareTeamPatientAccess(requestContext, patientId);
  // The access check trims the id; every query below must use the same value.
  patientId = patientId.trim();
  const tenantId = context.tenantId;
  const scope = { tenantId, patientId };

  const patient = await database.patient.findFirstOrThrow({
    where: { id: patientId, tenantId },
    select: { id: true, patientNumber: true, givenName: true, middleName: true, familyName: true },
  });

  const staffSelect = { select: { id: true, membershipId: true, title: true, membership: { select: { displayName: true } } } } as const;

  const [
    diagnoses,
    prescriptions,
    orders,
    therapyAssessments,
    therapySessions,
    nutritionAssessments,
    nutritionPlans,
    referrals,
    carePlans,
    alerts,
    symptoms,
    drains,
    observations,
  ] = await Promise.all([
    database.encounterDiagnosis.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: RECENT_CLINICAL,
    }),
    database.prescription.findMany({
      where: { ...scope, status: { not: "DRAFT" } },
      include: {
        items: { include: { medication: { select: { genericName: true, brandName: true, strength: true } } } },
        doctor: { select: { staffProfile: staffSelect } },
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_CLINICAL,
    }),
    database.diagnosticOrder.findMany({
      where: { ...scope, status: { not: "DRAFT" } },
      orderBy: { createdAt: "desc" },
      take: RECENT_CLINICAL,
    }),
    database.therapyAssessment.findMany({
      where: scope,
      include: { StaffProfile: staffSelect },
      orderBy: { assessedAt: "desc" },
      take: RECENT_CLINICAL,
    }),
    database.therapySession.findMany({
      where: scope,
      include: { StaffProfile: staffSelect },
      orderBy: { sessionDate: "desc" },
      take: RECENT_CLINICAL,
    }),
    database.nutritionAssessment.findMany({
      where: scope,
      include: { StaffProfile: staffSelect },
      orderBy: { assessedAt: "desc" },
      take: RECENT_CLINICAL,
    }),
    database.nutritionPlan.findMany({
      where: scope,
      include: { StaffProfile: staffSelect },
      orderBy: { createdAt: "desc" },
      take: RECENT_CLINICAL,
    }),
    database.clinicalReferral.findMany({
      where: scope,
      include: {
        DoctorProfile: { select: { staffProfile: staffSelect } },
        StaffProfile: staffSelect,
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_CLINICAL,
    }),
    database.carePlan.findMany({
      where: scope,
      include: {
        managingDoctor: { select: { staffProfile: staffSelect } },
        assignedTherapist: staffSelect,
        assignedNutritionist: staffSelect,
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_CLINICAL,
    }),
    database.carePlanAlert.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: RECENT_CLINICAL,
    }),
    database.symptomLog.findMany({
      where: scope,
      orderBy: { recordedAt: "desc" },
      take: RECENT_PATIENT_REPORTED,
    }),
    database.drainLog.findMany({
      where: scope,
      include: { drain: { select: { label: true, site: true } } },
      orderBy: { recordedAt: "desc" },
      take: RECENT_PATIENT_REPORTED,
    }),
    database.clinicalObservation.findMany({
      where: scope,
      orderBy: { observedAt: "desc" },
      take: RECENT_PATIENT_REPORTED,
    }),
  ]);

  // Author names for rows that only carry a membership id.
  const membershipIds = new Set<string>();
  diagnoses.forEach((row) => membershipIds.add(row.recordedByMembershipId));
  orders.forEach((row) => membershipIds.add(row.orderedByMembershipId));
  observations.forEach((row) => row.recordedByMembershipId && membershipIds.add(row.recordedByMembershipId));
  alerts.forEach((row) => row.acknowledgedByMembershipId && membershipIds.add(row.acknowledgedByMembershipId));

  const memberships = membershipIds.size
    ? await database.tenantMembership.findMany({
        where: { tenantId, id: { in: [...membershipIds] } },
        select: { id: true, displayName: true },
      })
    : [];
  const nameOf = new Map(memberships.map((member) => [member.id, member.displayName]));

  const entries: Omit<CareTimelineEntry, "acknowledgements">[] = [];

  for (const row of diagnoses) {
    entries.push({
      key: `DIAGNOSIS:${row.id}`,
      type: "DIAGNOSIS",
      recordId: row.id,
      discipline: "DOCTOR",
      occurredAt: iso(row.createdAt),
      title: `Diagnosis: ${row.display}`,
      summary: row.notes,
      details: compact([
        detail("ICD-10", row.code),
        detail("Certainty", humanize(row.certainty)),
        detail("Status", humanize(row.status)),
        row.isPrimary ? { label: "Primary", value: "Yes" } : null,
      ]),
      authorName: nameOf.get(row.recordedByMembershipId) ?? null,
      authorMembershipId: row.recordedByMembershipId,
      severity: "INFO",
    });
  }

  for (const row of prescriptions) {
    const author = row.doctor?.staffProfile;
    entries.push({
      key: `PRESCRIPTION:${row.id}`,
      type: "PRESCRIPTION",
      recordId: row.id,
      discipline: "DOCTOR",
      occurredAt: iso(row.prescribedAt ?? row.createdAt),
      title: `Prescription — ${row.items.length} ${row.items.length === 1 ? "medicine" : "medicines"}`,
      summary: row.instructions,
      details: row.items.map((item) => ({
        label: [item.medication.brandName ?? item.medication.genericName, item.medication.strength]
          .filter(Boolean)
          .join(" "),
        value: [item.dose, item.frequency, item.duration, item.route].filter(Boolean).join(" · "),
      })),
      authorName: author?.membership.displayName ?? null,
      authorMembershipId: author?.membershipId ?? null,
      severity: "INFO",
    });
  }

  for (const row of orders) {
    entries.push({
      key: `DIAGNOSTIC_ORDER:${row.id}`,
      type: "DIAGNOSTIC_ORDER",
      recordId: row.id,
      discipline: "DOCTOR",
      occurredAt: iso(row.orderedAt ?? row.createdAt),
      title: `${humanize(row.type)} ordered: ${row.name}`,
      summary: row.clinicalReason,
      details: compact([
        detail("Code", row.code),
        detail("Status", humanize(row.status)),
        detail("Priority", humanize(row.priority)),
      ]),
      authorName: nameOf.get(row.orderedByMembershipId) ?? null,
      authorMembershipId: row.orderedByMembershipId,
      severity: row.priority.toLowerCase() === "urgent" || row.priority.toLowerCase() === "stat" ? "WARNING" : "INFO",
    });
  }

  for (const row of therapyAssessments) {
    entries.push({
      key: `THERAPY_ASSESSMENT:${row.id}`,
      type: "THERAPY_ASSESSMENT",
      recordId: row.id,
      discipline: "PHYSIOTHERAPY",
      occurredAt: iso(row.assessedAt),
      title: "Physiotherapy assessment",
      summary: row.baselineNotes,
      details: compact([
        detail("Mobility score", row.mobilityScore),
        detail("Pain score", `${row.painScore}/10`),
        detail("Independence", humanize(row.independenceLevel)),
        detail("Respiratory function", row.respiratoryFunction),
        detail("Restrictions", row.surgicalRestrictions),
        detail("Goals", row.goals),
      ]),
      authorName: row.StaffProfile.membership.displayName,
      authorMembershipId: row.StaffProfile.membershipId,
      severity: row.painScore >= 7 ? "WARNING" : "INFO",
    });
  }

  for (const row of therapySessions) {
    entries.push({
      key: `THERAPY_SESSION:${row.id}`,
      type: "THERAPY_SESSION",
      recordId: row.id,
      discipline: "PHYSIOTHERAPY",
      occurredAt: iso(row.sessionDate),
      title: `Physiotherapy session — ${humanize(row.attendanceStatus)}`,
      summary: row.progressNotes,
      details: compact([
        row.painBefore !== null || row.painAfter !== null
          ? { label: "Pain", value: `${row.painBefore ?? "—"} → ${row.painAfter ?? "—"}` }
          : null,
        detail("Steps", row.stepsAchieved),
        row.spirometryAchievedMl !== null ? { label: "Spirometry", value: `${row.spirometryAchievedMl} ml` } : null,
        detail("Goals met", row.goalsMet),
        row.nextSessionDate ? { label: "Next session", value: row.nextSessionDate.toISOString() } : null,
      ]),
      authorName: row.StaffProfile.membership.displayName,
      authorMembershipId: row.StaffProfile.membershipId,
      severity: row.attendanceStatus !== "COMPLETED" ? "WARNING" : "INFO",
    });
  }

  for (const row of nutritionAssessments) {
    const weightChange = decimalText(row.weightChangeSinceSurgeryKg);
    entries.push({
      key: `NUTRITION_ASSESSMENT:${row.id}`,
      type: "NUTRITION_ASSESSMENT",
      recordId: row.id,
      discipline: "NUTRITION",
      occurredAt: iso(row.assessedAt),
      title: "Nutrition assessment",
      summary: row.notes ?? row.intakeNotes,
      details: compact([
        decimalText(row.weightKg) ? { label: "Weight", value: `${decimalText(row.weightKg)} kg` } : null,
        detail("BMI", decimalText(row.bmi)),
        weightChange ? { label: "Weight change since surgery", value: `${weightChange} kg` } : null,
        row.appetiteScore !== null ? { label: "Appetite", value: `${row.appetiteScore}/10` } : null,
        detail("GI symptoms", row.giSymptoms),
        row.enzymeRequirement ? { label: "Enzyme replacement", value: "Required" } : null,
      ]),
      authorName: row.StaffProfile.membership.displayName,
      authorMembershipId: row.StaffProfile.membershipId,
      severity: weightChange !== null && Number(weightChange) <= -5 ? "WARNING" : "INFO",
    });
  }

  for (const row of nutritionPlans) {
    entries.push({
      key: `NUTRITION_PLAN:${row.id}`,
      type: "NUTRITION_PLAN",
      recordId: row.id,
      discipline: "NUTRITION",
      occurredAt: iso(row.createdAt),
      title: `Nutrition plan: ${row.title}`,
      summary: row.notes,
      details: compact([
        detail("Phase", row.phase),
        row.caloricTargetKcal !== null ? { label: "Calories", value: `${row.caloricTargetKcal} kcal/day` } : null,
        row.proteinTargetGrams !== null ? { label: "Protein", value: `${row.proteinTargetGrams} g/day` } : null,
        row.fluidTargetMl !== null ? { label: "Fluid", value: `${row.fluidTargetMl} ml/day` } : null,
        detail("Avoid", row.foodsToAvoid),
        { label: "Status", value: row.isActive ? "Active" : "Inactive" },
      ]),
      authorName: row.StaffProfile.membership.displayName,
      authorMembershipId: row.StaffProfile.membershipId,
      severity: "INFO",
    });
  }

  for (const row of referrals) {
    const referrer = row.DoctorProfile?.staffProfile;
    const target =
      row.specialty === "PHYSIOTHERAPY" ? "physiotherapy" : row.specialty === "NUTRITION" ? "nutrition" : "a colleague";
    entries.push({
      key: `REFERRAL:${row.id}`,
      type: "REFERRAL",
      recordId: row.id,
      discipline: "DOCTOR",
      occurredAt: iso(row.createdAt),
      title: `Referred to ${target} — ${humanize(row.status)}`,
      summary: row.reason,
      details: compact([
        detail("Assigned to", row.StaffProfile?.membership.displayName ?? "Department queue"),
        detail("Priority", humanize(row.priority)),
        detail("Goal", row.goal),
        detail("Precautions", row.precautions),
        // The return leg: what the receiving clinician concluded, which until
        // now was written and then shown to nobody.
        detail("Outcome", row.outcomeNotes),
      ]),
      authorName: referrer?.membership.displayName ?? null,
      authorMembershipId: referrer?.membershipId ?? null,
      severity: row.priority === "EMERGENCY" ? "CRITICAL" : row.priority === "URGENT" ? "WARNING" : "INFO",
    });
  }

  for (const row of carePlans) {
    const doctor = row.managingDoctor?.staffProfile;
    entries.push({
      key: `CARE_PLAN:${row.id}`,
      type: "CARE_PLAN",
      recordId: row.id,
      discipline: "DOCTOR",
      occurredAt: iso(row.startDate),
      title: `Care plan: ${row.title}`,
      summary: null,
      details: compact([
        detail("Pathway", humanize(row.category)),
        detail("Status", humanize(row.status)),
        detail("Physiotherapist", row.assignedTherapist?.membership.displayName),
        detail("Dietitian", row.assignedNutritionist?.membership.displayName),
      ]),
      authorName: doctor?.membership.displayName ?? null,
      authorMembershipId: doctor?.membershipId ?? null,
      severity: "INFO",
    });
  }

  for (const row of alerts) {
    entries.push({
      key: `CARE_PLAN_ALERT:${row.id}`,
      type: "CARE_PLAN_ALERT",
      recordId: row.id,
      discipline: "SYSTEM",
      occurredAt: iso(row.createdAt),
      title: `Alert: ${row.title}`,
      summary: row.message,
      details: compact([
        detail("Severity", humanize(row.severity)),
        detail("Status", humanize(row.status)),
        detail("Resolution", row.resolutionNotes),
      ]),
      authorName: null,
      authorMembershipId: null,
      severity: row.severity === "CRITICAL" ? "CRITICAL" : row.severity === "HIGH" ? "WARNING" : "INFO",
    });
  }

  for (const row of symptoms) {
    entries.push({
      key: `SYMPTOM:${row.id}`,
      type: "SYMPTOM",
      recordId: row.id,
      discipline: row.source === "PATIENT" || row.source === "CAREGIVER" ? "PATIENT" : "DOCTOR",
      occurredAt: iso(row.recordedAt),
      title: `Symptom reported: ${row.symptomName}`,
      summary: row.freeText,
      details: compact([detail("Severity", `${row.severityLabel} (${row.severityScore})`)]),
      authorName: null,
      authorMembershipId: null,
      severity: row.severityScore >= 7 ? "WARNING" : "INFO",
    });
  }

  for (const row of drains) {
    entries.push({
      key: `DRAIN:${row.id}`,
      type: "DRAIN",
      recordId: row.id,
      discipline: row.source === "PATIENT" || row.source === "CAREGIVER" ? "PATIENT" : "DOCTOR",
      occurredAt: iso(row.recordedAt),
      title: `Drain output: ${row.volumeMl} ml`,
      summary: row.notes,
      details: compact([
        detail("Drain", [row.drain?.label, row.drain?.site].filter(Boolean).join(" · ")),
        detail("Colour", humanize(row.colour)),
        detail("Character", row.character ? humanize(row.character) : null),
        decimalText(row.amylaseValue)
          ? { label: "Amylase", value: `${decimalText(row.amylaseValue)} ${row.amylaseUnit ?? ""}`.trim() }
          : null,
      ]),
      authorName: null,
      authorMembershipId: null,
      severity: "INFO",
    });
  }

  for (const row of observations) {
    const value = row.valueNumber !== null ? decimalText(row.valueNumber) : row.valueText;
    entries.push({
      key: `OBSERVATION:${row.id}`,
      type: "OBSERVATION",
      recordId: row.id,
      discipline: row.source === "PATIENT" || row.source === "CAREGIVER" ? "PATIENT" : "DOCTOR",
      occurredAt: iso(row.observedAt),
      title: `${row.display}${value ? `: ${value}${row.unit ? ` ${row.unit}` : ""}` : ""}`,
      summary: null,
      details: compact([detail("Status", humanize(row.status))]),
      authorName: row.recordedByMembershipId ? (nameOf.get(row.recordedByMembershipId) ?? null) : null,
      authorMembershipId: row.recordedByMembershipId,
      severity: "INFO",
    });
  }

  // Every acknowledgement for this patient, in one query, keyed per entry.
  const acknowledgements = await database.clinicalAcknowledgement.findMany({
    where: { tenantId, patientId },
    include: { membership: { select: { displayName: true } } },
    orderBy: { acknowledgedAt: "asc" },
  });
  const acksByKey = new Map<string, CareTimelineAcknowledgement[]>();
  for (const ack of acknowledgements) {
    const key = `${ack.entryType}:${ack.entryId}`;
    const list = acksByKey.get(key) ?? [];
    list.push({
      membershipId: ack.membershipId,
      displayName: ack.membership.displayName,
      note: ack.note,
      acknowledgedAt: ack.acknowledgedAt.toISOString(),
    });
    acksByKey.set(key, list);
  }

  const timeline: CareTimelineEntry[] = entries
    .map((entry) => ({ ...entry, acknowledgements: acksByKey.get(entry.key) ?? [] }))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return {
    patient: {
      id: patient.id,
      patientNumber: patient.patientNumber,
      displayName: [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" "),
    },
    careTeam: buildCareTeam(carePlans, referrals),
    entries: timeline,
    viewerMembershipId: context.membershipId ?? null,
  };
}

/**
 * Who is looking after this patient right now, de-duplicated.
 *
 * Drawn from active care plans first (the people named on the plan) and then
 * from active referrals, so a clinician referred in without being named on a
 * plan still appears.
 */
function buildCareTeam(
  carePlans: Array<{
    status: string;
    managingDoctor: { staffProfile: StaffLite } | null;
    assignedTherapist: StaffLite | null;
    assignedNutritionist: StaffLite | null;
  }>,
  referrals: Array<{ status: string; specialty: string; StaffProfile: StaffLite | null }>,
): CareTeamMemberSummary[] {
  const team = new Map<string, CareTeamMemberSummary>();
  const add = (role: CareTeamMemberSummary["role"], staff: StaffLite | null | undefined) => {
    if (!staff || team.has(`${role}:${staff.id}`)) return;
    team.set(`${role}:${staff.id}`, {
      role,
      staffProfileId: staff.id,
      membershipId: staff.membershipId,
      displayName: staff.membership.displayName,
      title: staff.title,
    });
  };

  for (const plan of carePlans) {
    if (plan.status !== "ACTIVE") continue;
    add("DOCTOR", plan.managingDoctor?.staffProfile);
    add("PHYSIOTHERAPIST", plan.assignedTherapist);
    add("NUTRITIONIST", plan.assignedNutritionist);
  }

  for (const referral of referrals) {
    if (!["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(referral.status)) continue;
    if (referral.specialty === "PHYSIOTHERAPY") add("PHYSIOTHERAPIST", referral.StaffProfile);
    else if (referral.specialty === "NUTRITION") add("NUTRITIONIST", referral.StaffProfile);
    else if (referral.specialty === "DOCTOR") add("DOCTOR", referral.StaffProfile);
  }

  return [...team.values()];
}

type StaffLite = { id: string; membershipId: string; title: string | null; membership: { displayName: string } };

/**
 * Which table an entry type lives in, and how to confirm one record belongs to
 * one patient in one tenant.
 *
 * Acknowledging takes a record id from the client, so it must never trust that
 * id: without this, a clinician could acknowledge a record belonging to a
 * patient outside their scope just by knowing its id, and have their name
 * stamped on a chart they cannot see.
 */
export async function careTimelineRecordBelongsToPatient(
  type: CareTimelineEntryType,
  recordId: string,
  tenantId: string,
  patientId: string,
): Promise<boolean> {
  const where = { id: recordId, tenantId, patientId };
  const select = { id: true } as const;

  switch (type) {
    case "DIAGNOSIS":
      return Boolean(await database.encounterDiagnosis.findFirst({ where, select }));
    case "PRESCRIPTION":
      return Boolean(await database.prescription.findFirst({ where, select }));
    case "DIAGNOSTIC_ORDER":
      return Boolean(await database.diagnosticOrder.findFirst({ where, select }));
    case "THERAPY_ASSESSMENT":
      return Boolean(await database.therapyAssessment.findFirst({ where, select }));
    case "THERAPY_SESSION":
      return Boolean(await database.therapySession.findFirst({ where, select }));
    case "NUTRITION_ASSESSMENT":
      return Boolean(await database.nutritionAssessment.findFirst({ where, select }));
    case "NUTRITION_PLAN":
      return Boolean(await database.nutritionPlan.findFirst({ where, select }));
    case "REFERRAL":
      return Boolean(await database.clinicalReferral.findFirst({ where, select }));
    case "CARE_PLAN":
      return Boolean(await database.carePlan.findFirst({ where, select }));
    case "CARE_PLAN_ALERT":
      return Boolean(await database.carePlanAlert.findFirst({ where, select }));
    case "SYMPTOM":
      return Boolean(await database.symptomLog.findFirst({ where, select }));
    case "DRAIN":
      return Boolean(await database.drainLog.findFirst({ where, select }));
    case "OBSERVATION":
      return Boolean(await database.clinicalObservation.findFirst({ where, select }));
    default: {
      // Exhaustiveness: a new entry type added above without a case here is a
      // compile error, not a silent "not found".
      const unreachable: never = type;
      throw new WonFlowApiError(400, "invalid-entry-type", `Unknown entry type ${String(unreachable)}.`);
    }
  }
}

/**
 * One clinician confirming they have read another's entry.
 *
 * The entry is looked up through the timeline rather than by id alone, and that
 * is the safety property: the timeline is already scoped by
 * `assertCareTeamPatientAccess`, so an entry that is not on this caller's view of
 * this patient cannot be acknowledged — whatever id the request carries.
 *
 * Idempotent on (tenant, entry, member): acknowledging twice updates the note
 * and keeps one row.
 */
export async function acknowledgeCareTimelineEntry(
  requestContext: WonFlowRequestContext,
  input: { patientId: string; entryType: unknown; recordId: unknown; note?: unknown },
): Promise<CareTimelineAcknowledgement> {
  if (!isCareTimelineEntryType(input.entryType)) {
    throw new WonFlowApiError(400, "invalid-entry-type", "That kind of record cannot be acknowledged.");
  }
  const recordId = typeof input.recordId === "string" ? input.recordId.trim() : "";
  if (!recordId) {
    throw new WonFlowApiError(400, "missing-record-id", "Choose the entry to acknowledge.");
  }
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim().slice(0, 1000) : null;

  const timeline = await readCareTimeline(requestContext, input.patientId);
  const entry = timeline.entries.find((candidate) => candidate.key === `${input.entryType}:${recordId}`);
  if (!entry) {
    throw new WonFlowApiError(404, "entry-not-found", "That entry is not on this patient's record.");
  }

  const { context } = await assertCareTeamPatientAccess(requestContext, input.patientId);
  const membershipId = context.membershipId;
  if (!membershipId) {
    throw new WonFlowApiError(403, "membership-required", "Only hospital staff can acknowledge entries.");
  }
  if (entry.authorMembershipId && entry.authorMembershipId === membershipId) {
    throw new WonFlowApiError(
      400,
      "cannot-acknowledge-own-entry",
      "This is your own entry. Acknowledgement is for colleagues confirming they have read it.",
    );
  }

  const alreadyAcknowledged = entry.acknowledgements.some((ack) => ack.membershipId === membershipId);

  const saved = await database.clinicalAcknowledgement.upsert({
    where: {
      tenantId_entryType_entryId_membershipId: {
        tenantId: context.tenantId,
        entryType: input.entryType,
        entryId: recordId,
        membershipId,
      },
    },
    create: {
      tenantId: context.tenantId,
      patientId: timeline.patient.id,
      entryType: input.entryType,
      entryId: recordId,
      membershipId,
      note,
    },
    update: { note },
    include: { membership: { select: { displayName: true } } },
  });

  await database.auditEvent.create({
    data: {
      tenantId: context.tenantId,
      branchId: context.branchId,
      actorMembershipId: membershipId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      action: "clinical.care_timeline.acknowledged",
      entityType: "care-timeline-entry",
      entityId: entry.key,
      severity: "INFORMATION",
      sourceApplication: context.sourceApplication,
      metadata: { patientId: timeline.patient.id, entryType: input.entryType, recordId },
    },
  });

  // The author hears about it once, not on every note edit.
  if (!alreadyAcknowledged) {
    await notifyAuthorOfAcknowledgement({
      tenantId: context.tenantId,
      patientId: timeline.patient.id,
      authorMembershipId: entry.authorMembershipId,
      actorMembershipId: membershipId,
      entryType: entry.type,
      recordId,
      title: entry.title,
      discipline: entry.discipline,
      note,
    });
  }

  return {
    membershipId: saved.membershipId,
    displayName: saved.membership.displayName,
    note: saved.note,
    acknowledgedAt: saved.acknowledgedAt.toISOString(),
  };
}

/** Withdraws the caller's own acknowledgement — for a click made by mistake. */
export async function withdrawCareTimelineAcknowledgement(
  requestContext: WonFlowRequestContext,
  input: { patientId: string; entryType: unknown; recordId: unknown },
): Promise<{ removed: boolean }> {
  if (!isCareTimelineEntryType(input.entryType)) {
    throw new WonFlowApiError(400, "invalid-entry-type", "That kind of record cannot be acknowledged.");
  }
  const recordId = typeof input.recordId === "string" ? input.recordId.trim() : "";
  if (!recordId) {
    throw new WonFlowApiError(400, "missing-record-id", "Choose the entry.");
  }

  const { context } = await assertCareTeamPatientAccess(requestContext, input.patientId);
  if (!context.membershipId) {
    throw new WonFlowApiError(403, "membership-required", "Only hospital staff can acknowledge entries.");
  }

  // Scoped to the caller's own row and this patient: nobody can withdraw a
  // colleague's acknowledgement, or one recorded against another patient.
  const result = await database.clinicalAcknowledgement.deleteMany({
    where: {
      tenantId: context.tenantId,
      patientId: input.patientId.trim(),
      entryType: input.entryType,
      entryId: recordId,
      membershipId: context.membershipId,
    },
  });

  if (result.count > 0) {
    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: context.branchId,
        actorMembershipId: context.membershipId,
        sessionId: context.sessionId,
        requestId: context.requestId,
        action: "clinical.care_timeline.acknowledgement_withdrawn",
        entityType: "care-timeline-entry",
        entityId: `${input.entryType}:${recordId}`,
        severity: "INFORMATION",
        sourceApplication: context.sourceApplication,
        metadata: { patientId: input.patientId.trim() },
      },
    });
  }

  return { removed: result.count > 0 };
}

export interface CareTeamPatientListItem {
  patientId: string;
  patientNumber: string;
  displayName: string;
  carePlanTitle: string | null;
  unreadUpdates: number;
}

/**
 * The patients this viewer is looking after, with how many team updates on each
 * they have not read yet.
 *
 * An allied clinician's list is exactly their referral scope — the same set
 * `assertCareTeamPatientAccess` lets them open, so nothing listed here can
 * then refuse to load. A doctor's list is the patients they manage on an
 * active care plan, have referred on, or have been referred as a colleague.
 */
export async function listCareTeamPatients(requestContext: WonFlowRequestContext): Promise<CareTeamPatientListItem[]> {
  const context = requireTenantContext(requestContext);
  requireClinicalPatientAccess(context);
  const tenantId = context.tenantId;

  let patientIds: string[];
  const scope = await resolveCareTeamPatientScope(context);
  if (scope !== null) {
    patientIds = scope;
  } else if (!context.membershipId) {
    patientIds = [];
  } else {
    const me = context.membershipId;
    const [plans, raised, received] = await Promise.all([
      database.carePlan.findMany({
        where: { tenantId, status: "ACTIVE", managingDoctor: { staffProfile: { membershipId: me } } },
        select: { patientId: true },
      }),
      database.clinicalReferral.findMany({
        where: {
          tenantId,
          status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
          DoctorProfile: { staffProfile: { membershipId: me } },
        },
        select: { patientId: true },
      }),
      database.clinicalReferral.findMany({
        where: {
          tenantId,
          specialty: "DOCTOR",
          status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
          StaffProfile: { membershipId: me },
        },
        select: { patientId: true },
      }),
    ]);
    patientIds = [...new Set([...plans, ...raised, ...received].map((row) => row.patientId))];
  }

  if (patientIds.length === 0) return [];

  const [patients, plans, unread] = await Promise.all([
    database.patient.findMany({
      where: { tenantId, id: { in: patientIds }, status: { not: "ARCHIVED" } },
      select: { id: true, patientNumber: true, givenName: true, middleName: true, familyName: true },
    }),
    database.carePlan.findMany({
      where: { tenantId, patientId: { in: patientIds }, status: "ACTIVE" },
      select: { patientId: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    database.notification.groupBy({
      by: ["patientId"],
      where: {
        tenantId,
        identityId: context.identityId,
        channel: "IN_APP",
        status: { in: ["PENDING", "QUEUED", "SENT"] },
        templateCode: { in: [CARE_TEAM_UPDATE_TEMPLATE, CARE_TEAM_ACKNOWLEDGED_TEMPLATE] },
        patientId: { in: patientIds },
      },
      _count: { _all: true },
    }),
  ]);

  const planTitle = new Map<string, string>();
  for (const plan of plans) if (!planTitle.has(plan.patientId)) planTitle.set(plan.patientId, plan.title);
  const unreadBy = new Map(unread.map((row) => [row.patientId ?? "", row._count._all]));

  return patients
    .map((patient) => ({
      patientId: patient.id,
      patientNumber: patient.patientNumber,
      displayName: [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" "),
      carePlanTitle: planTitle.get(patient.id) ?? null,
      unreadUpdates: unreadBy.get(patient.id) ?? 0,
    }))
    .sort((left, right) => right.unreadUpdates - left.unreadUpdates || left.displayName.localeCompare(right.displayName));
}
