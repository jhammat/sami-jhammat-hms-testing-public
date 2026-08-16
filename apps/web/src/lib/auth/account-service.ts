import { database } from "@wonflow/database";
import type { WorkspaceCode } from "@wonflow/database";
import { homePathForRole } from "./accounts";
import type { WonFlowRole } from "./accounts";
import { verifyPassword } from "./password";

const MAX_FAILURES = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface AvailableLoginContext {
  membershipId: string | null; tenantId: string | null; organizationId: string | null;
  branchId: string | null; workspace: WorkspaceCode | null; role: WonFlowRole;
  organizationLabel: string; branchLabel: string | null; homePath: string;
}
export interface AuthenticatedAccount {
  identityId: string; email: string; displayName: string;
  contexts: AvailableLoginContext[]; requiresMfa: boolean; mustChangePassword: boolean;
  /** Set when every one of this identity's memberships belongs to a suspended organization — the login route surfaces this distinctly rather than a generic "no access" message. */
  suspendedOrganizationLabel: string | null;
}

const workspaceRoles: Record<WorkspaceCode, WonFlowRole> = {
  ADMIN: "admin", RECEPTION: "reception", DOCTOR: "doctor", PATIENT: "patient",
  LABORATORY: "laboratory", RADIOLOGY: "radiology", PHARMACY: "pharmacy",
  BILLING: "billing", MANAGEMENT: "management",
};

export async function authenticateAccount(email: string, password: string): Promise<AuthenticatedAccount | null> {
  const identity = await database.identity.findUnique({
    where: { normalizedEmail: email.trim().toLowerCase() },
    include: {
      memberships: { where: { status: "ACTIVE" }, include: { organization: true, primaryBranch: true, tenant: true } },
      mfaCredentials: { where: { status: "ACTIVE" }, select: { id: true } },
    },
  });
  if (!identity?.passwordHash || identity.status !== "ACTIVE" || (identity.lockedUntil && identity.lockedUntil > new Date())) return null;
  if (!(await verifyPassword(password, identity.passwordHash))) {
    const failures = identity.failedLoginCount + 1;
    await database.identity.update({ where: { id: identity.id }, data: {
      failedLoginCount: failures, lockedUntil: failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      status: failures >= MAX_FAILURES ? "LOCKED" : identity.status,
    } });
    return null;
  }
  await database.identity.update({ where: { id: identity.id }, data: { failedLoginCount: 0, lockedUntil: null, lastAuthenticatedAt: new Date() } });
  const contexts: AvailableLoginContext[] = [];
  let suspendedOrganizationLabel: string | null = null;
  if (identity.isPlatformAdministrator) contexts.push({ membershipId: null, tenantId: null, organizationId: null, branchId: null, workspace: null, role: "platform", organizationLabel: "WonFlow Platform", branchLabel: null, homePath: homePathForRole("platform") });
  for (const membership of identity.memberships) {
    if (membership.tenant.status !== "ACTIVE") {
      if (membership.tenant.status === "SUSPENDED") suspendedOrganizationLabel = membership.organization.displayName;
      continue;
    }
    for (const workspace of membership.workspaceCodes) {
      const role = workspaceRoles[workspace];
      contexts.push({ membershipId: membership.id, tenantId: membership.tenantId, organizationId: membership.organizationId,
        branchId: membership.primaryBranchId, workspace, role, organizationLabel: membership.organization.displayName,
        branchLabel: membership.primaryBranch?.name ?? null, homePath: homePathForRole(role) });
    }
  }
  return { identityId: identity.id, email: identity.email, displayName: identity.memberships[0]?.displayName ?? identity.email,
    contexts, requiresMfa: identity.mfaCredentials.length > 0, mustChangePassword: identity.mustChangePassword,
    suspendedOrganizationLabel: contexts.length === 0 ? suspendedOrganizationLabel : null };
}
