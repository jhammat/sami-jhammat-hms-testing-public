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
    "careplans.manage", "careplans.template.manage",
    "referrals.create", "alerts.configure", "alerts.acknowledge",
    "drains.read", "observations.patient.read", "education.manage",
  ],
  PHYSIOTHERAPIST: [
    "patients.read",
    "therapy.assessments.read", "therapy.assessments.manage",
    "therapy.plans.manage", "therapy.sessions.manage",
    "careplans.read", "careplans.assign",
    "observations.patient.read",
    "documents.view", "documents.upload",
    "education.read", "education.assign",
    "referrals.read",
  ],
  NUTRITIONIST: [
    "patients.read",
    "nutrition.assessments.read", "nutrition.assessments.manage",
    "nutrition.plans.manage",
    "careplans.read", "careplans.assign",
    "observations.patient.read",
    "documents.view", "documents.upload",
    "education.read", "education.assign",
    "referrals.read",
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
  PHYSIOTHERAPIST: "Physiotherapist",
  NUTRITIONIST: "Clinical Dietitian / Nutritionist",
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

/**
 * Assigns a membership's workspace roles across every branch the person works at.
 *
 * `MembershipRole` is already the branch boundary — `resolvePermissionCodes`
 * keeps an assignment only when its `branchId` is unset or matches the branch
 * the caller is signed in to — so covering several sites is one role row per
 * (role, branch) pair. Staff creation only ever wrote a single row carrying the
 * primary branch, which is why a doctor or dietitian working at two hospitals
 * in a group could be given exactly one of them and silently lost every
 * permission at the other.
 *
 * An empty `branchIds` means organization-wide: one row per role with no
 * branch, which every branch matches.
 *
 * Rows outside the target set are removed, so this both grants and revokes and
 * can be called with the full intended state on every save.
 */
export async function syncMembershipBranchRoles(
  tx: TransactionClient,
  input: {
    tenantId: string;
    membershipId: string;
    roleIds: readonly string[];
    branchIds: readonly string[];
  },
): Promise<void> {
  const branchKeys: (string | null)[] = input.branchIds.length > 0 ? [...new Set(input.branchIds)] : [null];

  const existing = await tx.membershipRole.findMany({
    where: { tenantId: input.tenantId, membershipId: input.membershipId },
    select: { id: true, roleId: true, branchId: true },
  });

  const wanted = new Set(input.roleIds.flatMap((roleId) => branchKeys.map((branchId) => `${roleId}::${branchId ?? ""}`)));
  const held = new Set<string>();
  const stale: string[] = [];

  for (const row of existing) {
    const key = `${row.roleId}::${row.branchId ?? ""}`;
    if (wanted.has(key) && !held.has(key)) {
      held.add(key);
    } else {
      stale.push(row.id);
    }
  }

  if (stale.length > 0) {
    await tx.membershipRole.deleteMany({ where: { id: { in: stale } } });
  }

  const missing = [...wanted].filter((key) => !held.has(key));
  if (missing.length === 0) return;

  await tx.membershipRole.createMany({
    data: missing.map((key) => {
      const [roleId = "", branchId = ""] = key.split("::");
      return {
        tenantId: input.tenantId,
        membershipId: input.membershipId,
        roleId,
        branchId: branchId || null,
      };
    }),
  });
}
