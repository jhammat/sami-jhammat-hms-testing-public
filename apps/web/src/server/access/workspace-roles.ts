import { database } from "@wonflow/database";

type TransactionClient = Parameters<Parameters<typeof database.$transaction>[0]>[0];

/**
 * The permissions each workspace legitimately needs.
 *
 * Tenant provisioning used to create only the ADMIN role, so a hospital that
 * invited a doctor or laboratory officer gave them a workspace with no role
 * behind it — every API call then failed with `Permission "x" is required`.
 * Provisioning and invitation both ensure these roles now, and the development
 * seed reuses this map so the two never drift.
 */
export const WORKSPACE_PERMISSION_CODES = {
  ADMIN: [
    "organization.profile.read", "organization.profile.manage", "organization.branches.manage",
    "organization.roles.read", "organization.roles.manage", "organization.users.read", "organization.users.manage",
    "organization.services.read", "organization.services.manage", "organization.schedules.read",
    "organization.schedules.manage", "organization.audit.read", "patients.read", "appointments.read",
  ],
  RECEPTION: [
    "patients.read", "patients.manage", "appointments.read", "appointments.manage", "queues.manage",
    "billing.invoices.manage", "billing.payments.manage", "organization.services.read", "organization.schedules.read",
  ],
  DOCTOR: [
    // patients.manage: a doctor can register a new patient themselves,
    // the same as reception, from the doctor portal's own registration
    // screen — not just read an existing record.
    "patients.read", "patients.manage", "appointments.read", "appointments.manage", "queues.manage",
    "encounters.read", "encounters.manage", "encounters.sign",
    "laboratory.orders.read", "laboratory.orders.manage",
    "radiology.orders.read", "radiology.orders.manage",
    "organization.services.read", "organization.schedules.read",
  ],
  LABORATORY: [
    "laboratory.orders.read", "laboratory.orders.manage", "laboratory.results.manage",
    "laboratory.results.release", "patients.read",
  ],
  RADIOLOGY: [
    "radiology.orders.read", "radiology.orders.manage", "radiology.reports.manage",
    "radiology.reports.release", "patients.read",
  ],
  PHARMACY: [
    "pharmacy.dispensing.manage", "pharmacy.catalogue.read", "pharmacy.catalogue.manage",
    "pharmacy.inventory.read", "pharmacy.inventory.manage", "pharmacy.suppliers.manage",
    "pharmacy.purchase-receipts.manage", "pharmacy.returns.manage", "patients.read",
  ],
  BILLING: ["billing.invoices.manage", "billing.payments.manage", "billing.refunds.manage", "patients.read", "appointments.read"],
  MANAGEMENT: [
    "organization.profile.read", "organization.audit.read", "organization.services.read",
    "patients.read", "appointments.read", "management.dashboard.read", "billing.invoices.read",
  ],
  // The patient portal authorizes through PatientAccess, not tenant permissions.
  PATIENT: [],
} as const satisfies Record<string, readonly string[]>;

export type WorkspaceRoleCode = keyof typeof WORKSPACE_PERMISSION_CODES;

const ROLE_NAMES: Record<WorkspaceRoleCode, string> = {
  ADMIN: "Tenant Administrator",
  RECEPTION: "Reception",
  DOCTOR: "Doctor",
  LABORATORY: "Laboratory",
  RADIOLOGY: "Radiology",
  PHARMACY: "Pharmacy",
  BILLING: "Billing",
  MANAGEMENT: "Management",
  PATIENT: "Patient",
};

/**
 * Creates any missing workspace role for a tenant and grants it its permissions.
 * Idempotent: existing roles keep their identity and only gain missing grants,
 * so an administrator's own additions to a role are never removed.
 */
export async function ensureWorkspaceRoles(tx: TransactionClient, tenantId: string, codes?: readonly WorkspaceRoleCode[]): Promise<void> {
  const wanted = codes ?? (Object.keys(WORKSPACE_PERMISSION_CODES) as WorkspaceRoleCode[]);
  for (const code of wanted) {
    const permissionCodes = WORKSPACE_PERMISSION_CODES[code];
    const role = await tx.role.upsert({
      where: { tenantId_code: { tenantId, code } },
      create: { tenantId, code, name: ROLE_NAMES[code], description: `${ROLE_NAMES[code]} workspace access.`, isSystem: true },
      update: { isActive: true, archivedAt: null },
    });
    for (const permissionCode of permissionCodes) {
      const permission = await tx.permission.upsert({
        where: { code: permissionCode },
        create: { code: permissionCode, category: permissionCode.split(".")[0]!, label: permissionCode },
        update: {},
      });
      await tx.rolePermission.upsert({
        where: { tenantId_roleId_permissionId: { tenantId, roleId: role.id, permissionId: permission.id } },
        create: { tenantId, roleId: role.id, permissionId: permission.id, effect: "ALLOW" },
        update: { effect: "ALLOW" },
      });
    }
  }
}

/**
 * Gives every active membership the roles matching its workspace codes.
 * Repairs memberships that were invited before their workspace role existed.
 */
export async function syncMembershipWorkspaceRoles(tx: TransactionClient, tenantId: string): Promise<number> {
  const [memberships, roles] = await Promise.all([
    tx.tenantMembership.findMany({
      where: { tenantId, archivedAt: null },
      select: { id: true, primaryBranchId: true, workspaceCodes: true, roles: { select: { roleId: true } } },
    }),
    tx.role.findMany({ where: { tenantId, isActive: true, archivedAt: null }, select: { id: true, code: true } }),
  ]);
  const roleByCode = new Map(roles.map((role) => [role.code, role.id]));
  let repaired = 0;
  for (const membership of memberships) {
    const assigned = new Set(membership.roles.map((assignment) => assignment.roleId));
    for (const code of membership.workspaceCodes) {
      const roleId = roleByCode.get(code);
      if (!roleId || assigned.has(roleId)) continue;
      await tx.membershipRole.create({ data: { tenantId, membershipId: membership.id, roleId, branchId: membership.primaryBranchId } });
      assigned.add(roleId);
      repaired += 1;
    }
  }
  return repaired;
}
