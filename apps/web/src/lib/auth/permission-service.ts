import { database } from "@wonflow/database";
import type { WonFlowRequestContext, WonFlowTenantRequestContext } from "@wonflow/contracts";
import { WonFlowRequestContextError } from "@wonflow/contracts";
import { readSession } from "./session-server";

const activeForTime = (from: Date | null, until: Date | null, now: Date) => (!from || from <= now) && (!until || until >= now);

/**
 * Whether a branch-scoped grant applies to the branch the caller is signed in to.
 *
 * A grant carrying no branch is organization-wide and always applies. A grant
 * scoped to a branch applies when the caller is in that branch.
 *
 * The third case is the one that mattered: a caller whose session carries *no*
 * branch at all. `session.branchId` comes from `membership.primaryBranchId`
 * (account-service), and a membership can legitimately have none — an invitation
 * that never set one, or an administrator clearing it — while its role
 * assignments still carry the branch they were created against. Comparing a
 * real branch against `null` then failed for every assignment the membership
 * held, so the user kept their roles on paper and lost every permission behind
 * them: a blanket 403 across their whole portal, with an error message naming a
 * permission their role visibly grants.
 *
 * A missing branch is now read as "no branch filter to apply" rather than as a
 * branch that matches nothing. This cannot be used to widen access: the value
 * is derived server-side at sign-in and never accepted from the client
 * (`/api/auth/switch-workspace` changes only `workspace`), and the grants
 * considered are only ever the ones this membership already holds.
 */
const appliesToBranch = (grantBranchId: string | null, sessionBranchId: string | null) =>
  !grantBranchId || !sessionBranchId || grantBranchId === sessionBranchId;

export async function resolvePermissionCodes(input: { membershipId: string; tenantId: string; branchId: string | null }): Promise<string[]> {
  const now = new Date();
  const membership = await database.tenantMembership.findFirst({ where: { id: input.membershipId, tenantId: input.tenantId, status: "ACTIVE" },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      directGrants: { include: { permission: true } } } });
  if (!membership) return [];
  const allowed = new Set<string>(); const denied = new Set<string>();
  for (const assignment of membership.roles) {
    if (!appliesToBranch(assignment.branchId, input.branchId) || !activeForTime(assignment.validFrom, assignment.validUntil, now) || !assignment.role.isActive) continue;
    for (const relation of assignment.role.permissions) {
      const code = relation.permission.code;
      if (relation.effect === "DENY") { denied.add(code); allowed.delete(code); } else if (!denied.has(code)) allowed.add(code);
    }
  }
  for (const grant of membership.directGrants) {
    if (!appliesToBranch(grant.branchId, input.branchId) || !activeForTime(grant.validFrom, grant.validUntil, now)) continue;
    const code = grant.permission.code;
    if (grant.effect === "DENY") { denied.add(code); allowed.delete(code); } else if (!denied.has(code)) allowed.add(code);
  }
  return [...allowed].sort();
}

/**
 * The timezone the signed-in user's hospital actually keeps.
 *
 * This was hard-coded to "Asia/Karachi" for every tenant on the platform.
 * That is right for one customer and wrong for the next, and it is the value
 * every "today" window is measured against — so a hospital anywhere else
 * would have had its clinic day drawn in the wrong place.
 *
 * Resolution order is branch, then the tenant default, then UTC. A branch is
 * the most specific answer: a hospital group can genuinely span zones, and
 * the day belongs to the site the user is signed in to.
 */
async function resolveTimezone(input: {
  tenantId: string;
  branchId: string | null;
}): Promise<string> {
  if (input.branchId) {
    const branch = await database.branch.findFirst({
      where: { id: input.branchId, tenantId: input.tenantId },
      select: { timezone: true },
    });

    if (branch?.timezone) return branch.timezone;
  }

  const tenant = await database.tenant.findUnique({
    where: { id: input.tenantId },
    select: { defaultTimezone: true },
  });

  return tenant?.defaultTimezone || "UTC";
}

export async function requireRequestContext(): Promise<WonFlowRequestContext> {
  const session = await readSession();
  if (!session) throw new WonFlowRequestContextError("invalid-request-context", "Authentication is required.");
  if (session.passwordChangeRequired) throw new WonFlowRequestContextError("permission-required", "Change your temporary password before continuing.");
  if (session.role === "platform" && !session.tenantId) return { scope: "platform", requestId: crypto.randomUUID(),
    userId: session.identityId, identityId: session.identityId, membershipId: null, sessionId: session.sessionId, workspace: "platform", locale: "en", timezone: "UTC",
    currencyCode: "PKR", permissionCodes: session.permissionCodes, sourceApplication: "web", tenantId: null, organizationId: null, branchId: null };

  if (session.role === "patient") {
    if (!session.tenantId) throw new WonFlowRequestContextError("tenant-context-required", "Patient tenant is required.");
    const [organization, timezone] = await Promise.all([
      session.organizationId
        ? Promise.resolve({ id: session.organizationId })
        : database.organization.findFirst({ where: { tenantId: session.tenantId, status: "ACTIVE" }, select: { id: true } }),
      resolveTimezone({ tenantId: session.tenantId, branchId: session.branchId }),
    ]);
    if (!organization) throw new WonFlowRequestContextError("tenant-context-required", "Hospital organization not found.");
    const context: WonFlowTenantRequestContext = {
      scope: "tenant",
      requestId: crypto.randomUUID(),
      userId: session.identityId,
      identityId: session.identityId,
      membershipId: session.membershipId ?? null,
      sessionId: session.sessionId,
      workspace: "patient",
      locale: "en",
      timezone,
      currencyCode: "PKR",
      permissionCodes: session.permissionCodes,
      sourceApplication: "web",
      tenantId: session.tenantId,
      organizationId: organization.id,
      branchId: session.branchId ?? null,
    };
    return context;
  }

  if (!session.membershipId || !session.tenantId || !session.organizationId) throw new WonFlowRequestContextError("tenant-context-required", "Select an organization and workspace.");
  const [permissionCodes, timezone] = await Promise.all([
    resolvePermissionCodes({ membershipId: session.membershipId, tenantId: session.tenantId, branchId: session.branchId }),
    resolveTimezone({ tenantId: session.tenantId, branchId: session.branchId }),
  ]);
  const context: WonFlowTenantRequestContext = { scope: "tenant", requestId: crypto.randomUUID(), userId: session.membershipId,
    identityId: session.identityId, membershipId: session.membershipId,
    sessionId: session.sessionId, workspace: session.workspace?.toLowerCase() ?? "admin", locale: "en", timezone,
    currencyCode: "PKR", permissionCodes, sourceApplication: "web", tenantId: session.tenantId,
    organizationId: session.organizationId, branchId: session.branchId };
  return context;
}
