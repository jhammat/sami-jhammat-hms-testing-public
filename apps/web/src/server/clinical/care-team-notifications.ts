import { database } from "@wonflow/database";

export const CARE_TEAM_UPDATE_TEMPLATE = "care-team-update";
export const CARE_TEAM_ACKNOWLEDGED_TEMPLATE = "care-team-acknowledged";

/** What a care-team notification carries; the inbox and the timeline both read this. */
export interface CareTeamNotificationPayload {
  patientId: string;
  patientName: string;
  patientNumber: string;
  entryType: string;
  recordId: string;
  title: string;
  discipline: string;
  actorName: string;
  note?: string | null;
}

/**
 * The membership ids of everyone currently looking after a patient.
 *
 * The same definition the timeline uses for its care-team header: the people
 * named on an active care plan, the clinicians assigned to an active referral,
 * and the doctor who raised it.
 */
export async function careTeamMembershipIds(tenantId: string, patientId: string): Promise<string[]> {
  const [plans, referrals] = await Promise.all([
    database.carePlan.findMany({
      where: { tenantId, patientId, status: "ACTIVE" },
      select: {
        managingDoctor: { select: { staffProfile: { select: { membershipId: true } } } },
        assignedTherapist: { select: { membershipId: true } },
        assignedNutritionist: { select: { membershipId: true } },
      },
    }),
    database.clinicalReferral.findMany({
      where: { tenantId, patientId, status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] } },
      select: {
        StaffProfile: { select: { membershipId: true } },
        DoctorProfile: { select: { staffProfile: { select: { membershipId: true } } } },
      },
    }),
  ]);

  const ids = new Set<string>();
  for (const plan of plans) {
    if (plan.managingDoctor?.staffProfile.membershipId) ids.add(plan.managingDoctor.staffProfile.membershipId);
    if (plan.assignedTherapist?.membershipId) ids.add(plan.assignedTherapist.membershipId);
    if (plan.assignedNutritionist?.membershipId) ids.add(plan.assignedNutritionist.membershipId);
  }
  for (const referral of referrals) {
    if (referral.StaffProfile?.membershipId) ids.add(referral.StaffProfile.membershipId);
    if (referral.DoctorProfile?.staffProfile.membershipId) ids.add(referral.DoctorProfile.staffProfile.membershipId);
  }
  return [...ids];
}

async function deliver(input: {
  tenantId: string;
  patientId: string;
  recipientMembershipIds: string[];
  actorMembershipId: string | null;
  templateCode: string;
  payload: Omit<CareTeamNotificationPayload, "patientName" | "patientNumber" | "actorName">;
}): Promise<number> {
  const recipients = input.recipientMembershipIds.filter((id) => id !== input.actorMembershipId);
  if (recipients.length === 0) return 0;

  const [patient, actor, members] = await Promise.all([
    database.patient.findFirst({
      where: { id: input.patientId, tenantId: input.tenantId },
      select: { patientNumber: true, givenName: true, familyName: true },
    }),
    input.actorMembershipId
      ? database.tenantMembership.findFirst({
          where: { id: input.actorMembershipId, tenantId: input.tenantId },
          select: { displayName: true },
        })
      : null,
    database.tenantMembership.findMany({
      // Only people who can still sign in: an archived or suspended colleague
      // would otherwise collect notifications nobody will ever read.
      where: { tenantId: input.tenantId, id: { in: recipients }, status: "ACTIVE", archivedAt: null },
      select: { identityId: true },
    }),
  ]);
  if (!patient) return 0;

  const identityIds = [...new Set(members.map((member) => member.identityId))];
  if (identityIds.length === 0) return 0;

  const payload: CareTeamNotificationPayload = {
    ...input.payload,
    patientName: `${patient.givenName} ${patient.familyName}`.trim(),
    patientNumber: patient.patientNumber,
    actorName: actor?.displayName ?? "A colleague",
  };

  const now = new Date();
  const result = await database.notification.createMany({
    data: identityIds.map((identityId) => ({
      tenantId: input.tenantId,
      identityId,
      patientId: input.patientId,
      channel: "IN_APP" as const,
      // SENT = in the inbox and unread; the inbox marks it DELIVERED once seen.
      status: "SENT" as const,
      sentAt: now,
      templateCode: input.templateCode,
      payload: payload as unknown as object,
    })),
  });
  return result.count;
}

/**
 * Tells the rest of the care team that one of them has added to the record.
 *
 * Deliberately never throws. It runs after the clinical write has committed,
 * and a nutrition plan must not be reported as failed — or retried into a
 * duplicate — because a notification could not be written.
 */
export async function notifyCareTeamOfEntry(input: {
  tenantId: string;
  patientId: string;
  actorMembershipId: string | null;
  entryType: string;
  recordId: string;
  title: string;
  discipline: string;
}): Promise<void> {
  try {
    const recipients = await careTeamMembershipIds(input.tenantId, input.patientId);
    await deliver({
      tenantId: input.tenantId,
      patientId: input.patientId,
      recipientMembershipIds: recipients,
      actorMembershipId: input.actorMembershipId,
      templateCode: CARE_TEAM_UPDATE_TEMPLATE,
      payload: {
        patientId: input.patientId,
        entryType: input.entryType,
        recordId: input.recordId,
        title: input.title,
        discipline: input.discipline,
      },
    });
  } catch (error) {
    console.error("[care-team] Failed to notify the care team:", error);
  }
}

/** Tells the author of an entry that a colleague has acknowledged it. Never throws. */
export async function notifyAuthorOfAcknowledgement(input: {
  tenantId: string;
  patientId: string;
  authorMembershipId: string | null;
  actorMembershipId: string | null;
  entryType: string;
  recordId: string;
  title: string;
  discipline: string;
  note: string | null;
}): Promise<void> {
  if (!input.authorMembershipId) return;
  try {
    await deliver({
      tenantId: input.tenantId,
      patientId: input.patientId,
      recipientMembershipIds: [input.authorMembershipId],
      actorMembershipId: input.actorMembershipId,
      templateCode: CARE_TEAM_ACKNOWLEDGED_TEMPLATE,
      payload: {
        patientId: input.patientId,
        entryType: input.entryType,
        recordId: input.recordId,
        title: input.title,
        discipline: input.discipline,
        note: input.note,
      },
    });
  } catch (error) {
    console.error("[care-team] Failed to notify the entry author:", error);
  }
}
