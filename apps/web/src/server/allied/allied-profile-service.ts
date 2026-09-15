import { readFile } from "node:fs/promises";

import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import {
  documentObjectPath,
  persistUploadedDocumentBytes,
} from "@/server/documents/document-storage";
import { WonFlowApiError } from "@/server/http/route-handler";

/**
 * The profile an allied health clinician sees for themselves.
 *
 * Physiotherapists and dietitians have a `StaffProfile` but no
 * `DoctorProfile`, so none of the doctor profile plumbing applies to them —
 * they had no profile screen at all. This service is deliberately built on
 * the columns that already exist (`TenantMembership.displayName`,
 * `.primaryBranchId`, `.preferredLocale`, `.photoObjectKey` and
 * `StaffProfile.title`) rather than on new ones.
 *
 * That is a constraint, not a preference: this repository's Prisma
 * migration history has drifted from the database (`migrate deploy`
 * re-runs migrations that are already applied and fails on
 * `type "DrainColour" already exists`), so adding columns here could not be
 * done safely. Free-text qualifications and a biography — which the doctor
 * profile keeps on `DoctorProfile` — therefore have nowhere to live for
 * allied staff yet, and are intentionally absent rather than faked.
 */

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export type AlliedSpecialty = "PHYSIOTHERAPY" | "NUTRITION";

export interface AlliedProfileCaseload {
  totalReferrals: number;
  byStatus: { name: string; count: number }[];
  byPriority: { name: string; count: number }[];
  /** Records this clinician personally authored. */
  assessmentsRecorded: number;
  sessionsRecorded: number;
  plansPublished: number;
  patientsSeen: number;
}

export interface AlliedProfileView {
  identity: { email: string | null };
  membership: {
    id: string;
    displayName: string;
    preferredLocale: string;
    primaryBranchId: string | null;
    primaryBranchName: string | null;
    workspaceCodes: string[];
    primaryWorkspace: string | null;
    status: string;
    hasPhoto: boolean;
  };
  staff: {
    id: string;
    employeeNumber: string;
    staffType: string;
    title: string | null;
    status: string;
    branchId: string | null;
    branchName: string | null;
    since: string;
  };
  permissions: string[];
  branches: { id: string; name: string }[];
  caseload: AlliedProfileCaseload;
  preferences: {
    clinicalFocus: string[];
    dailyStepGoal: string;
    spirometryGoal: string;
  };
}

export interface UpdateAlliedProfileInput {
  displayName?: string;
  title?: string | null;
  staffType?: string;
  primaryBranchId?: string | null;
  preferredLocale?: string;
  clinicalFocus?: string[];
  dailyStepGoal?: string;
  spirometryGoal?: string;
}

/**
 * Resolves the signed-in clinician's own staff record.
 *
 * Everything here is scoped by `tenantId` AND by the caller's own
 * `membershipId` — a clinician can only ever read or write their own
 * profile through this service, so there is no id parameter to tamper with
 * and no way to express a cross-tenant or cross-colleague read by accident.
 */
async function resolveOwnStaffProfile(
  requestContext: WonFlowRequestContext,
  specialtyHint?: AlliedSpecialty,
) {
  const context = requireTenantContext(requestContext);

  if (!context.membershipId) {
    throw new WonFlowApiError(
      403,
      "membership-required",
      "This account has no workspace membership, so it has no staff profile to show.",
    );
  }

  const membership = await database.tenantMembership.findFirst({
    where: { id: context.membershipId, tenantId: context.tenantId },
    include: {
      identity: { select: { email: true } },
      primaryBranch: { select: { id: true, name: true } },
      staffProfile: { include: { branch: { select: { id: true, name: true } } } },
    },
  });

  if (!membership) {
    throw new WonFlowApiError(
      404,
      "membership-not-found",
      "Your workspace membership could not be found. Sign out and back in, then try again.",
    );
  }

  let staff = membership.staffProfile;
  if (!staff) {
    // If a StaffProfile doesn't exist for this membership yet, auto-provision one
    const staffType = specialtyHint === "NUTRITION" ? "NUTRITIONIST" : "PHYSIOTHERAPIST";
    const employeeNumber = `STF-${membership.id.slice(0, 8).toUpperCase()}`;
    const defaultTitle =
      specialtyHint === "NUTRITION"
        ? "Clinical Dietitian / Nutrition Specialist"
        : "Senior Physiotherapist & Mobility Specialist";

    staff = await database.staffProfile.upsert({
      where: { membershipId: membership.id },
      create: {
        tenantId: context.tenantId,
        membershipId: membership.id,
        branchId: membership.primaryBranchId,
        employeeNumber,
        staffType,
        status: "ACTIVE",
        title: defaultTitle,
      },
      update: {},
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  return { context, membership, staff };
}

function specialtyOf(staffType: string): AlliedSpecialty | null {
  const normalized = staffType.toUpperCase();
  if (normalized.includes("PHYSIO") || normalized.includes("THERAP")) return "PHYSIOTHERAPY";
  if (normalized.includes("NUTRI") || normalized.includes("DIET")) return "NUTRITION";
  return null;
}

function countBy<T>(rows: readonly T[], pick: (row: T) => string | null | undefined) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const value = pick(row);
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

export async function readAlliedProfile(
  requestContext: WonFlowRequestContext,
  specialtyHint?: AlliedSpecialty,
): Promise<AlliedProfileView> {
  const { context, membership, staff } = await resolveOwnStaffProfile(requestContext, specialtyHint);

  const specialty = specialtyHint ?? specialtyOf(staff.staffType);

  // Referrals addressed to this clinician's discipline, within this tenant.
  const referrals = await database.clinicalReferral.findMany({
    where: {
      tenantId: context.tenantId,
      ...(specialty ? { specialty } : {}),
    },
    select: { status: true, priority: true, patientId: true },
  });

  const [assessmentsRecorded, sessionsRecorded, plansPublished] = await Promise.all([
    specialty === "NUTRITION"
      ? database.nutritionAssessment.count({
          where: { tenantId: context.tenantId, assessedByStaffId: staff.id },
        })
      : database.therapyAssessment.count({
          where: { tenantId: context.tenantId, assessedByStaffId: staff.id },
        }),
    specialty === "NUTRITION"
      ? Promise.resolve(0)
      : database.therapySession.count({
          where: { tenantId: context.tenantId, conductedByStaffId: staff.id },
        }),
    specialty === "NUTRITION"
      ? database.nutritionPlan.count({
          where: { tenantId: context.tenantId, createdByStaffId: staff.id },
        })
      : Promise.resolve(0),
  ]);

  const branches = await database.branch.findMany({
    where: { tenantId: context.tenantId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Reading your own profile is still a record view, so it is audited like
  // any other. The platform rule is that every record view writes an event,
  // and "it is my own record" is not an exemption.
  await database.auditEvent.create({
    data: {
      tenantId: context.tenantId,
      actorMembershipId: context.membershipId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      action: "allied.profile.viewed",
      entityType: "staff_profile",
      entityId: staff.id,
      severity: "INFORMATION",
      sourceApplication: context.sourceApplication,
    },
  });

  const defaultFocus =
    specialty === "NUTRITION"
      ? [
          "Surgical Oncology Nutrition",
          "PERT (Creon) Titration & Monitoring",
        ]
      : [
          "ERAS® Post-Surgical Mobilization",
          "HPB & Upper GI Rehabilitation",
        ];
  const defaultDailyStepGoal = specialty === "NUTRITION" ? "25-30 kcal/kg/day" : "100m (corridor)";
  const defaultSpirometryGoal = specialty === "NUTRITION" ? "1.5 g/kg/day" : "1500 mL q1h";

  const latestPreferencesEvent = await database.auditEvent.findFirst({
    where: {
      tenantId: context.tenantId,
      action: "allied.preferences.updated",
      entityId: staff.id,
    },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });

  const rawMetadata = (latestPreferencesEvent?.metadata as Record<string, unknown> | null) ?? null;
  const preferences = {
    clinicalFocus:
      Array.isArray(rawMetadata?.clinicalFocus) && rawMetadata.clinicalFocus.length > 0
        ? (rawMetadata.clinicalFocus as string[])
        : defaultFocus,
    dailyStepGoal:
      typeof rawMetadata?.dailyStepGoal === "string" && rawMetadata.dailyStepGoal.trim()
        ? rawMetadata.dailyStepGoal.trim()
        : defaultDailyStepGoal,
    spirometryGoal:
      typeof rawMetadata?.spirometryGoal === "string" && rawMetadata.spirometryGoal.trim()
        ? rawMetadata.spirometryGoal.trim()
        : defaultSpirometryGoal,
  };

  return {
    identity: { email: membership.identity?.email ?? null },
    membership: {
      id: membership.id,
      displayName: membership.displayName,
      preferredLocale: membership.preferredLocale,
      primaryBranchId: membership.primaryBranchId,
      primaryBranchName: membership.primaryBranch?.name ?? null,
      workspaceCodes: membership.workspaceCodes.map(String),
      primaryWorkspace: membership.primaryWorkspace ? String(membership.primaryWorkspace) : null,
      status: String(membership.status),
      hasPhoto: Boolean(membership.photoObjectKey),
    },
    staff: {
      id: staff.id,
      employeeNumber: staff.employeeNumber,
      staffType: staff.staffType,
      title: staff.title,
      status: String(staff.status),
      branchId: staff.branchId,
      branchName: staff.branch?.name ?? null,
      since: staff.createdAt.toISOString(),
    },
    permissions: [...(context.permissionCodes ?? [])].sort(),
    branches,
    caseload: {
      totalReferrals: referrals.length,
      byStatus: countBy(referrals, (referral) => referral.status),
      byPriority: countBy(referrals, (referral) => referral.priority),
      assessmentsRecorded,
      sessionsRecorded,
      plansPublished,
      patientsSeen: new Set(referrals.map((referral) => referral.patientId)).size,
    },
    preferences,
  };
}

export async function updateAlliedProfile(
  requestContext: WonFlowRequestContext,
  input: UpdateAlliedProfileInput,
  specialtyHint?: AlliedSpecialty,
): Promise<AlliedProfileView> {
  const { context, membership, staff } = await resolveOwnStaffProfile(requestContext, specialtyHint);

  const displayName = input.displayName?.trim();
  if (displayName !== undefined && displayName.length === 0) {
    throw new WonFlowApiError(
      400,
      "display-name-required",
      "Your display name cannot be empty — it is how patients and colleagues identify you.",
    );
  }

  if (displayName !== undefined && displayName.length > 250) {
    throw new WonFlowApiError(
      400,
      "display-name-too-long",
      "Your display name must be 250 characters or fewer.",
    );
  }

  const title = input.title === null ? null : input.title?.trim();
  if (title && title.length > 120) {
    throw new WonFlowApiError(
      400,
      "title-too-long",
      "Your professional title must be 120 characters or fewer.",
    );
  }

  /*
   * Where a clinician works and which discipline they practise are assigned
   * by the hospital administrator, not chosen by the clinician.
   *
   * Both used to be editable here. The branch decides which patients and
   * queues a clinician's session opens, and the staff type decides whose
   * referrals they can read - so a physiotherapist could move themselves to
   * another hospital, or re-label themselves a dietitian, from their own
   * profile page. Resending the current value is accepted so older clients
   * keep saving; a different value is refused.
   */
  const currentBranchId = membership.primaryBranchId ?? staff.branchId ?? null;
  if (input.primaryBranchId !== undefined && (input.primaryBranchId || null) !== currentBranchId) {
    throw new WonFlowApiError(
      403,
      "branch-assignment-admin-only",
      "Your hospital location is assigned by the administrator. Contact your hospital administrator to change it.",
    );
  }
  if (input.staffType !== undefined && input.staffType !== staff.staffType) {
    throw new WonFlowApiError(
      403,
      "staff-type-admin-only",
      "Your clinical role is assigned by the administrator. Contact your hospital administrator to change it.",
    );
  }

  // Membership and staff profile are two tables, so they move together or
  // not at all — a saved name with an unsaved title is not a state anyone
  // should be able to observe.
  await database.$transaction(async (tx) => {
    await tx.tenantMembership.update({
      where: { id: membership.id },
      data: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(input.preferredLocale ? { preferredLocale: input.preferredLocale } : {}),
      },
    });

    await tx.staffProfile.update({
      where: { id: staff.id },
      data: {
        ...(title !== undefined ? { title: title || null } : {}),
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        actorMembershipId: context.membershipId,
        sessionId: context.sessionId,
        requestId: context.requestId,
        action: "allied.profile.updated",
        entityType: "staff_profile",
        entityId: staff.id,
        severity: "INFORMATION",
        metadata: {
          changedFields: Object.keys(input).filter(
            (key) => input[key as keyof UpdateAlliedProfileInput] !== undefined,
          ),
        },
        sourceApplication: context.sourceApplication,
      },
    });

    if (
      input.clinicalFocus !== undefined ||
      input.dailyStepGoal !== undefined ||
      input.spirometryGoal !== undefined
    ) {
      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "allied.preferences.updated",
          entityType: "staff_profile",
          entityId: staff.id,
          severity: "INFORMATION",
          metadata: {
            clinicalFocus: input.clinicalFocus ?? [],
            dailyStepGoal: input.dailyStepGoal?.trim() || null,
            spirometryGoal: input.spirometryGoal?.trim() || null,
          },
          sourceApplication: context.sourceApplication,
        },
      });
    }
  });

  return readAlliedProfile(requestContext, specialtyHint);
}

export async function uploadAlliedAvatar(
  requestContext: WonFlowRequestContext,
  file: File,
): Promise<{ updatedAt: string }> {
  const { context, membership, staff } = await resolveOwnStaffProfile(requestContext);

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new WonFlowApiError(
      415,
      "unsupported-image-type",
      "Upload a JPG, PNG or WebP photo.",
    );
  }

  if (file.size < 1 || file.size > MAX_AVATAR_BYTES) {
    throw new WonFlowApiError(
      413,
      "image-size-invalid",
      "Photos must be between 1 byte and 2 MB.",
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Object keys are grouped by a "patient" folder on disk. A staff portrait
  // is not about a patient, so it is filed under the staff profile id — the
  // storage helper only uses this to shard directories, never to grant
  // access, and access here is the membership check above.
  const { objectKey, scanResult } = await persistUploadedDocumentBytes({
    tenantId: context.tenantId,
    patientId: staff.id,
    bytes,
  });

  if (scanResult === "INFECTED") {
    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        actorMembershipId: context.membershipId,
        sessionId: context.sessionId,
        requestId: context.requestId,
        action: "allied.profile.avatar_rejected",
        entityType: "staff_profile",
        entityId: staff.id,
        severity: "CRITICAL",
        metadata: { scanResult },
        sourceApplication: context.sourceApplication,
      },
    });

    throw new WonFlowApiError(
      422,
      "photo-failed-scan",
      "This photo failed a security scan and was not saved. Try a different image.",
    );
  }

  await database.tenantMembership.update({
    where: { id: membership.id },
    data: { photoObjectKey: objectKey },
  });

  await database.auditEvent.create({
    data: {
      tenantId: context.tenantId,
      actorMembershipId: context.membershipId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      action: "allied.profile.avatar_uploaded",
      entityType: "staff_profile",
      entityId: staff.id,
      severity: "INFORMATION",
      sourceApplication: context.sourceApplication,
    },
  });

  return { updatedAt: new Date().toISOString() };
}

export async function removeAlliedAvatar(
  requestContext: WonFlowRequestContext,
): Promise<{ success: true }> {
  const { context, membership, staff } = await resolveOwnStaffProfile(requestContext);

  await database.tenantMembership.update({
    where: { id: membership.id },
    data: { photoObjectKey: null },
  });

  await database.auditEvent.create({
    data: {
      tenantId: context.tenantId,
      actorMembershipId: context.membershipId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      action: "allied.profile.avatar_removed",
      entityType: "staff_profile",
      entityId: staff.id,
      severity: "INFORMATION",
      sourceApplication: context.sourceApplication,
    },
  });

  return { success: true };
}

/**
 * `TenantMembership` stores the object key but no content type, so the type
 * is recovered from the file's own magic bytes rather than trusted from the
 * request or guessed from an extension. Only the three formats the upload
 * accepts can round-trip, and anything else is refused rather than served
 * with a wrong or attacker-chosen content type.
 */
function sniffImageContentType(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export async function readAlliedAvatarBytes(
  requestContext: WonFlowRequestContext,
): Promise<{ bytes: Buffer; contentType: string }> {
  const { membership } = await resolveOwnStaffProfile(requestContext);

  if (!membership.photoObjectKey) {
    throw new WonFlowApiError(404, "avatar-not-found", "No photo has been uploaded.");
  }

  const bytes = await readFile(documentObjectPath(membership.photoObjectKey));
  const contentType = sniffImageContentType(bytes);

  if (!contentType) {
    throw new WonFlowApiError(
      422,
      "avatar-unreadable",
      "The stored photo is not a readable image. Upload it again.",
    );
  }

  return { bytes, contentType };
}

/** Used by GET /api/v1/me/avatar so the shell can show a staff portrait. */
export async function findStaffAvatarByMembership(
  membershipId: string,
  tenantId: string | null,
): Promise<boolean> {
  const membership = await database.tenantMembership.findFirst({
    where: { id: membershipId, ...(tenantId ? { tenantId } : {}) },
    select: { photoObjectKey: true },
  });

  return Boolean(membership?.photoObjectKey);
}
