/**
 * Repairs hospitals provisioned before workspace roles existed.
 *
 * Tenant provisioning used to create only the ADMIN role, so staff invited into
 * the Doctor, Laboratory, Reception, Radiology, Pharmacy, Billing or Management
 * workspaces were left with no role and therefore no permissions — their portals
 * failed with `Permission "…" is required`.
 *
 * Creates every missing workspace role with its permissions, then gives each
 * active membership the roles matching its workspace codes. Safe to re-run.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main(): Promise<void> {
  const [{ database }, { ensureWorkspaceRoles, syncMembershipWorkspaceRoles }] = await Promise.all([
    import("../../packages/database/src/index.js"),
    import("../../apps/web/src/server/access/workspace-roles.js"),
  ]);

  const tenants = await database.tenant.findMany({ where: { archivedAt: null }, select: { id: true, displayName: true } });
  for (const tenant of tenants) {
    const repaired = await database.$transaction(async (tx) => {
      await ensureWorkspaceRoles(tx, tenant.id);
      return syncMembershipWorkspaceRoles(tx, tenant.id);
    }, { timeout: 60_000 });
    const roles = await database.role.count({ where: { tenantId: tenant.id } });
    console.log(`${tenant.displayName}: ${roles} roles present, ${repaired} membership role assignment${repaired === 1 ? "" : "s"} repaired.`);
  }
  process.exit(0);
}

void main();
