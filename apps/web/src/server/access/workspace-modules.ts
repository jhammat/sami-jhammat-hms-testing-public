/**
 * Which entitlement module each staff workspace belongs to.
 *
 * A hospital that has not licensed the laboratory module should not be able
 * to create laboratory logins for it, so the invite screen offers only the
 * workspaces the tenant is actually entitled to. That rule lives here, in
 * one place, rather than being restated by every screen that needs it.
 *
 * Workspaces mapped to `null` are core: every tenant has doctors, an
 * administrator and someone on the front desk, and gating those would leave
 * a hospital unable to staff itself.
 */

import { database } from "@wonflow/database";

/** Module codes the platform administrator can toggle per tenant. */
export const PLATFORM_MODULE_CODES = [
  "practice-dashboard",
  "practice-booking",
  "practice-documents",
  "practice-messaging",
  "practice-team-management",
  "patient-portal",
  "public-booking-page",
  "mobile-apps",
  "reception-desk",
  "billing-counter",
  "laboratory",
  "radiology",
  "pharmacy",
  "physiotherapy",
  "nutrition",
] as const;

export type PlatformModuleCode = (typeof PLATFORM_MODULE_CODES)[number];

export const WORKSPACE_MODULE: Record<string, PlatformModuleCode | null> = {
  // Core — never gated.
  ADMIN: null,
  DOCTOR: null,
  MANAGEMENT: null,
  PATIENT: null,

  RECEPTION: "reception-desk",
  BILLING: "billing-counter",
  LABORATORY: "laboratory",
  RADIOLOGY: "radiology",
  PHARMACY: "pharmacy",
  PHYSIOTHERAPIST: "physiotherapy",
  NUTRITIONIST: "nutrition",
};

/**
 * The modules a tenant may use.
 *
 * A module with no row is treated as ENABLED. Entitlement rows are written
 * only when somebody makes a decision about a module, so an absent row means
 * "nobody has said otherwise" rather than "denied" — defaulting it closed
 * would silently switch off every workspace for tenants provisioned before a
 * module existed, including the two allied-health ones added here.
 * Disabling is therefore always an explicit act, and is recorded as one.
 */
export async function readEnabledModules(tenantId: string): Promise<Set<string>> {
  const rows = await database.tenantEntitlement.findMany({
    where: { tenantId },
    select: { moduleCode: true, enabled: true },
  });

  const disabled = new Set(
    rows.filter((row) => !row.enabled).map((row) => row.moduleCode),
  );

  return new Set(PLATFORM_MODULE_CODES.filter((code) => !disabled.has(code)));
}

/** Whether a staff workspace can be used in this tenant. */
export function isWorkspaceEntitled(
  workspaceCode: string,
  enabledModules: Set<string>,
): boolean {
  const required = WORKSPACE_MODULE[workspaceCode];
  if (required === undefined) return false;
  if (required === null) return true;
  return enabledModules.has(required);
}
