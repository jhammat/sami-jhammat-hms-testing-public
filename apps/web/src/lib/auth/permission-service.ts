import { database } from "@wonflow/database";
import type { WonFlowRequestContext, WonFlowTenantRequestContext } from "@wonflow/contracts";
import { WonFlowRequestContextError } from "@wonflow/contracts";
import { readSession } from "./session-server";

const activeForTime = (from: Date | null, until: Date | null, now: Date) => (!from || from <= now) && (!until || until >= now);

export async function resolvePermissionCodes(input: { membershipId: string; tenantId: string; branchId: string | null }): Promise<string[]> {
  const now = new Date();
  const membership = await database.tenantMembership.findFirst({ where: { id: input.membershipId, tenantId: input.tenantId, status: "ACTIVE" },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      directGrants: { include: { permission: true } } } });
  if (!membership) return [];
  const allowed = new Set<string>(); const denied = new Set<string>();
  for (const assignment of membership.roles) {
    if ((assignment.branchId && assignment.branchId !== input.branchId) || !activeForTime(assignment.validFrom, assignment.validUntil, now) || !assignment.role.isActive) continue;
    for (const relation of assignment.role.permissions) {
      const code = relation.permission.code;
      if (relation.effect === "DENY") { denied.add(code); allowed.delete(code); } else if (!denied.has(code)) allowed.add(code);
    }
  }
  for (const grant of membership.directGrants) {
    if ((grant.branchId && grant.branchId !== input.branchId) || !activeForTime(grant.validFrom, grant.validUntil, now)) continue;
    const code = grant.permission.code;
    if (grant.effect === "DENY") { denied.add(code); allowed.delete(code); } else if (!denied.has(code)) allowed.add(code);
  }
  return [...allowed].sort();
}

export async function requireRequestContext(): Promise<WonFlowRequestContext> {
  const session = await readSession();
  if (!session) throw new WonFlowRequestContextError("invalid-request-context", "Authentication is required.");
  if (session.passwordChangeRequired) throw new WonFlowRequestContextError("permission-required", "Change your temporary password before continuing.");
  if (session.role === "platform" && !session.tenantId) return { scope: "platform", requestId: crypto.randomUUID(),
    userId: session.identityId, identityId: session.identityId, membershipId: null, sessionId: session.sessionId, workspace: "platform", locale: "en", timezone: "UTC",
    currencyCode: "PKR", permissionCodes: session.permissionCodes, sourceApplication: "web", tenantId: null, organizationId: null, branchId: null };
  if (!session.membershipId || !session.tenantId || !session.organizationId) throw new WonFlowRequestContextError("tenant-context-required", "Select an organization and workspace.");
  const permissionCodes = await resolvePermissionCodes({ membershipId: session.membershipId, tenantId: session.tenantId, branchId: session.branchId });
  const context: WonFlowTenantRequestContext = { scope: "tenant", requestId: crypto.randomUUID(), userId: session.membershipId,
    identityId: session.identityId, membershipId: session.membershipId,
    sessionId: session.sessionId, workspace: session.workspace?.toLowerCase() ?? "admin", locale: "en", timezone: "Asia/Karachi",
    currencyCode: "PKR", permissionCodes, sourceApplication: "web", tenantId: session.tenantId,
    organizationId: session.organizationId, branchId: session.branchId };
  return context;
}
