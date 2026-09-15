import { database } from "@wonflow/database";
import type { WorkspaceCode } from "@wonflow/database";

type TransactionClient = Parameters<Parameters<typeof database.$transaction>[0]>[0];

/**
 * The staff record each workspace implies.
 *
 * A `TenantMembership` says which portals someone may open; a `StaffProfile`
 * is the clinical identity every *other* screen addresses them by. A care plan
 * is assigned to a StaffProfile, a referral is assigned to a StaffProfile, a
 * therapy note is signed by one — so a clinician without one is invisible to
 * the rest of the hospital no matter how correct their membership is.
 *
 * Invitation only ever created the doctor's record. A physiotherapist or a
 * dietitian invited from hospital administration got a login, a role and no
 * staff record at all, which is why the "Physiotherapist" and "Dietitian"
 * pickers on the care plan and referral dialogs came up empty: there was
 * nothing in `StaffProfile` for the surgeon to choose. The allied portal
 * created one lazily the first time the clinician opened their own profile,
 * so the name appeared only after they had signed in themselves — long after
 * the surgeon needed it.
 *
 * `PATIENT` maps to nothing on purpose: a patient membership is not staff.
 */
const STAFF_TYPE_BY_WORKSPACE: Record<WorkspaceCode, string | null> = {
  DOCTOR: "DOCTOR",
  PHYSIOTHERAPIST: "PHYSIOTHERAPIST",
  NUTRITIONIST: "NUTRITIONIST",
  ADMIN: "ADMIN",
  RECEPTION: "RECEPTION",
  LABORATORY: "LABORATORY",
  RADIOLOGY: "RADIOLOGY",
  PHARMACY: "PHARMACY",
  BILLING: "BILLING",
  MANAGEMENT: "MANAGEMENT",
  PATIENT: null,
};

/**
 * Which staff record a multi-workspace membership should carry.
 *
 * One membership can hold several portals (a surgeon who also administers the
 * hospital), but `StaffProfile.membershipId` is unique, so exactly one type
 * has to win. Clinical roles come first because they are the ones other
 * clinicians look a colleague up by.
 */
const STAFF_TYPE_PRECEDENCE: readonly WorkspaceCode[] = [
  "DOCTOR",
  "PHYSIOTHERAPIST",
  "NUTRITIONIST",
  "MANAGEMENT",
  "LABORATORY",
  "RADIOLOGY",
  "PHARMACY",
  "BILLING",
  "RECEPTION",
  "ADMIN",
];

const EMPLOYEE_NUMBER_PREFIX: Record<string, string> = {
  DOCTOR: "DR",
  PHYSIOTHERAPIST: "PT",
  NUTRITIONIST: "RD",
};

const DEFAULT_TITLE: Record<string, string> = {
  PHYSIOTHERAPIST: "Physiotherapist",
  NUTRITIONIST: "Clinical Dietitian",
};

export const ALLIED_STAFF_TYPES = ["PHYSIOTHERAPIST", "NUTRITIONIST"] as const;

export function resolveStaffType(workspaceCodes: readonly WorkspaceCode[]): string | null {
  for (const code of STAFF_TYPE_PRECEDENCE) {
    if (workspaceCodes.includes(code)) return STAFF_TYPE_BY_WORKSPACE[code];
  }
  return null;
}

function employeeNumberFor(staffType: string, membershipId: string, wide = false): string {
  const prefix = EMPLOYEE_NUMBER_PREFIX[staffType] ?? "STF";
  const compact = membershipId.replace(/-/g, "").toUpperCase();
  return `${prefix}-${compact.slice(0, wide ? 12 : 8)}`;
}

const isUniqueConstraintError = (caught: unknown) =>
  typeof caught === "object" && caught !== null && (caught as { code?: string }).code === "P2002";

/**
 * Creates or refreshes the staff record behind a membership.
 *
 * Idempotent, and safe to call on every invitation and every workspace
 * change: the record is keyed on the membership, so an existing profile is
 * updated in place and keeps the employee number colleagues already know it
 * by. A membership that holds no staff workspace at all (a patient login) is
 * left alone rather than given an empty staff record.
 */
export async function syncStaffProfile(
  tx: TransactionClient,
  input: {
    tenantId: string;
    membershipId: string;
    workspaceCodes: readonly WorkspaceCode[];
    branchId?: string | null;
    title?: string | null;
  },
): Promise<{ id: string; staffType: string } | null> {
  const staffType = resolveStaffType(input.workspaceCodes);
  if (!staffType) return null;

  const update = {
    staffType,
    status: "ACTIVE" as const,
    ...(input.branchId !== undefined ? { branchId: input.branchId ?? null } : {}),
    ...(input.title !== undefined ? { title: input.title?.trim() || null } : {}),
  };

  for (const wide of [false, true]) {
    try {
      const staff = await tx.staffProfile.upsert({
        where: { membershipId: input.membershipId },
        create: {
          tenantId: input.tenantId,
          membershipId: input.membershipId,
          branchId: input.branchId ?? null,
          employeeNumber: employeeNumberFor(staffType, input.membershipId, wide),
          staffType,
          status: "ACTIVE",
          title: input.title?.trim() || DEFAULT_TITLE[staffType] || null,
        },
        update,
        select: { id: true, staffType: true },
      });
      return staff;
    } catch (caught) {
      // Two memberships whose ids share a leading prefix; widen and retry once.
      if (!wide && isUniqueConstraintError(caught)) continue;
      throw caught;
    }
  }

  return null;
}

/**
 * Gives every allied clinician in a tenant the staff record they should have
 * been created with, and reports how many were missing.
 *
 * This exists for hospitals that invited a physiotherapist or dietitian before
 * `syncStaffProfile` ran on invitation. Without it those clinicians stay
 * unpickable until they happen to sign in and open their own profile, which is
 * not something the surgeon waiting to assign them can do anything about.
 */
export async function backfillAlliedStaffProfiles(input: {
  tenantId: string;
  organizationId: string;
}): Promise<number> {
  const missing = await database.tenantMembership.findMany({
    where: {
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      archivedAt: null,
      status: { in: ["ACTIVE", "INVITED"] },
      workspaceCodes: { hasSome: [...ALLIED_STAFF_TYPES] },
      staffProfile: { is: null },
    },
    select: { id: true, workspaceCodes: true, primaryBranchId: true },
  });

  if (missing.length === 0) return 0;

  let created = 0;
  for (const membership of missing) {
    try {
      const staff = await syncStaffProfile(database as unknown as TransactionClient, {
        tenantId: input.tenantId,
        membershipId: membership.id,
        workspaceCodes: membership.workspaceCodes,
        branchId: membership.primaryBranchId,
      });
      if (staff) created += 1;
    } catch {
      // One malformed membership must not stop the picker from rendering the rest.
    }
  }

  return created;
}
