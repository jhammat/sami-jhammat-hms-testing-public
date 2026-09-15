import { database } from "@wonflow/database";

export interface AccessibleBranch {
  id: string;
  name: string;
  isMainBranch: boolean;
}

const activeForTime = (from: Date | null, until: Date | null, now: Date) =>
  (!from || from <= now) && (!until || until >= now);

/**
 * The branches a signed-in staff member may actually work from.
 *
 * Derived from the same rows `resolvePermissionCodes` filters on, and
 * deliberately so: an assignment applies to a branch when it carries that
 * branch or carries none, so "which branches can this person hold a session
 * at" and "where do their permissions work" have to be the same answer. If
 * these two drifted apart, someone could switch into a branch where every
 * request then failed with a permission error — an account that looks signed
 * in and can do nothing.
 *
 * A role assignment with no branch is organization-wide, so it opens every
 * active branch. Otherwise only the named branches count.
 *
 * Direct permission grants are not consulted. They tune individual permissions
 * on top of a role; they are not what makes someone staff at a site, and a
 * DENY grant scoped to a branch would otherwise read as access to it.
 *
 * Returns an empty list when the membership holds no active role at all —
 * there is nothing to switch between, and the caller should show no switcher.
 */
export async function listAccessibleBranches(input: {
  membershipId: string;
  tenantId: string;
  organizationId: string;
}): Promise<AccessibleBranch[]> {
  const now = new Date();

  const assignments = await database.membershipRole.findMany({
    where: { tenantId: input.tenantId, membershipId: input.membershipId },
    select: {
      branchId: true,
      validFrom: true,
      validUntil: true,
      role: { select: { isActive: true, archivedAt: true } },
    },
  });

  const live = assignments.filter(
    (assignment) =>
      assignment.role.isActive &&
      assignment.role.archivedAt === null &&
      activeForTime(assignment.validFrom, assignment.validUntil, now),
  );

  if (live.length === 0) return [];

  const organizationWide = live.some((assignment) => assignment.branchId === null);
  const namedBranchIds = [...new Set(live.flatMap((assignment) => (assignment.branchId ? [assignment.branchId] : [])))];

  if (!organizationWide && namedBranchIds.length === 0) return [];

  return database.branch.findMany({
    where: {
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      archivedAt: null,
      status: "ACTIVE",
      ...(organizationWide ? {} : { id: { in: namedBranchIds } }),
    },
    select: { id: true, name: true, isMainBranch: true },
    orderBy: [{ isMainBranch: "desc" }, { name: "asc" }],
  });
}

/** Whether this membership may hold a session at `branchId`. */
export async function canAccessBranch(input: {
  membershipId: string;
  tenantId: string;
  organizationId: string;
  branchId: string;
}): Promise<boolean> {
  const branches = await listAccessibleBranches(input);
  return branches.some((branch) => branch.id === input.branchId);
}
