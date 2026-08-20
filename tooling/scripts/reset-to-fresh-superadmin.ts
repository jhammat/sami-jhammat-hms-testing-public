/**
 * Resets the entire database to a completely blank slate and creates ONLY
 * the Platform Superadministrator (Superadmin).
 *
 * All demo tenants, organizations, branches, doctor profiles, staff,
 * patients, appointments, encounters, prescriptions, diagnostic results,
 * invoices, payments, and mock data are completely wiped clean.
 *
 * Run with:
 *   pnpm db:reset:superadmin
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

if (process.env.NODE_ENV === "production" || process.env.WONFLOW_ENVIRONMENT === "production") {
  throw new Error("Database reset script is disabled in production.");
}

async function main(): Promise<void> {
  const [{ database }, { hashPassword }] = await Promise.all([
    import("../../packages/database/src/index.js"),
    import("../../apps/web/src/lib/auth/password.js"),
  ]);

  console.log("1. Wiping all database tables...");

  // Query all application tables in public schema
  const tables: Array<{ tablename: string }> = await database.$queryRawUnsafe(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename NOT LIKE '_prisma%'
  `);

  if (tables.length > 0) {
    const tableList = tables.map((t) => `"${t.tablename}"`).join(", ");
    await database.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} CASCADE;`);
    console.log(`✓ Cleaned ${tables.length} tables.`);
  }

  // Seed standard permissions dictionary so new tenants have all permissions available
  console.log("2. Seeding system permission definitions...");
  const { WORKSPACE_PERMISSION_CODES } = (await import(
    "../../apps/web/src/server/access/workspace-roles.js"
  )) as { WORKSPACE_PERMISSION_CODES: Record<string, readonly string[]> };

  const permissionCodes = [...new Set(Object.values(WORKSPACE_PERMISSION_CODES).flat())];
  await Promise.all(
    permissionCodes.map((code) =>
      database.permission.create({
        data: {
          code,
          category: code.split(".")[0]!,
          label: code,
        },
      }),
    ),
  );
  console.log(`✓ Seeded ${permissionCodes.length} workspace permissions.`);

  // Create clean Superadmin / Platform Administrator
  console.log("3. Creating Platform Superadmin account...");
  const platformEmail = (process.env.WONFLOW_PLATFORM_EMAIL ?? "platform@wonflow.local").trim().toLowerCase();
  const platformPassword =
    process.env.WONFLOW_PLATFORM_PASSWORD ?? process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";
  const platformPasswordHash = await hashPassword(platformPassword);

  const platformPermissions = [
    "platform.tenants.read",
    "platform.tenants.manage",
    "platform.entitlements.manage",
    "platform.subscriptions.manage",
    "platform.support-access.manage",
    "platform.audit.read",
  ];

  await database.identity.create({
    data: {
      email: platformEmail,
      normalizedEmail: platformEmail,
      passwordHash: platformPasswordHash,
      mustChangePassword: false,
      status: "ACTIVE",
      isPlatformAdministrator: true,
      platformPermissionCodes: platformPermissions,
      emailVerifiedAt: new Date(),
      passwordChangedAt: new Date(),
    },
  });

  console.log("\n=======================================================");
  console.log("✨ DATABASE CLEAN RESET COMPLETE: FRESH START WITH SUPERADMIN");
  console.log("=======================================================");
  console.table([
    {
      Role: "Super / Platform Administrator",
      Email: platformEmail,
      Password: platformPassword,
      URL: "http://localhost:3000/login -> /platform",
      Status: "ACTIVE (No tenants or demo data exist)",
    },
  ]);
  console.log("You can now login at http://localhost:3000/login and create your first hospital tenant from /platform/organizations/new!\n");

  await database.$disconnect();
}

main().catch((error: unknown) => {
  console.error("Failed to reset database:", error);
  process.exit(1);
});
