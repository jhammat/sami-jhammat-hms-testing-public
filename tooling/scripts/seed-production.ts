import { config } from "dotenv";

config({ path: ".env.local" });
config();

/**
 * All platform-level permission codes granted to the platform administrator.
 * Keep in sync with any platform permission checks in the application.
 */
const PLATFORM_PERMISSION_CODES = [
  "platform.tenants.read",
  "platform.tenants.manage",
  "platform.entitlements.manage",
  "platform.subscriptions.manage",
  "platform.support-access.manage",
  "platform.audit.read",
] as const;

async function main(): Promise<void> {
  const platformEmail = process.env.WONFLOW_PLATFORM_EMAIL?.trim().toLowerCase();
  const platformPassword = process.env.WONFLOW_PLATFORM_PASSWORD?.trim();

  if (!platformEmail || !platformPassword) {
    throw new Error(
      [
        "Missing required environment variables for production seed.",
        "  WONFLOW_PLATFORM_EMAIL   — email address of the platform administrator",
        "  WONFLOW_PLATFORM_PASSWORD — password (min 12 chars, upper + lower + digit)",
      ].join("\n"),
    );
  }

  const [{ database }, { hashPassword }] = await Promise.all([
    import("../../packages/database/src/index.js"),
    import("../../apps/web/src/lib/auth/password.js"),
  ]);

  // ── 1. Platform administrator ────────────────────────────────────────────
  const platformPasswordHash = await hashPassword(platformPassword);

  await database.identity.upsert({
    where: { normalizedEmail: platformEmail },
    create: {
      email: platformEmail,
      normalizedEmail: platformEmail,
      passwordHash: platformPasswordHash,
      mustChangePassword: true,
      status: "ACTIVE",
      isPlatformAdministrator: true,
      platformPermissionCodes: [...PLATFORM_PERMISSION_CODES],
      emailVerifiedAt: new Date(),
      passwordChangedAt: new Date(),
    },
    update: {
      isPlatformAdministrator: true,
      platformPermissionCodes: [...PLATFORM_PERMISSION_CODES],
      status: "ACTIVE",
      failedLoginCount: 0,
      lockedUntil: null,
      archivedAt: null,
    },
  });

  console.log(`✓ Platform administrator created: ${platformEmail}`);

  // ── 2. Initial tenant setup ──────────────────────────────────────────────
  // All four variables must be set together; if any are missing the tenant
  // bootstrapping is skipped so a partial configuration cannot partially
  // create records that would block a correct run later.
  const tenantSlug = process.env.WONFLOW_INITIAL_TENANT_SLUG?.trim();
  const tenantName = process.env.WONFLOW_INITIAL_TENANT_NAME?.trim();
  const adminEmail = process.env.WONFLOW_INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.WONFLOW_INITIAL_ADMIN_PASSWORD?.trim();

  if (!tenantSlug || !tenantName || !adminEmail || !adminPassword) {
    console.log(
      "\nInitial tenant setup skipped — set all four variables to enable it:" +
        "\n  WONFLOW_INITIAL_TENANT_SLUG" +
        "\n  WONFLOW_INITIAL_TENANT_NAME" +
        "\n  WONFLOW_INITIAL_ADMIN_EMAIL" +
        "\n  WONFLOW_INITIAL_ADMIN_PASSWORD",
    );
    console.log("\nProduction seed complete.");
    await database.$disconnect();
    return;
  }

  const adminPasswordHash = await hashPassword(adminPassword);

  // ── 2a. Tenant / Organization / Branch ──────────────────────────────────
  const tenant = await database.tenant.upsert({
    where: { slug: tenantSlug },
    create: { slug: tenantSlug, displayName: tenantName, status: "ACTIVE" },
    update: { displayName: tenantName, status: "ACTIVE", archivedAt: null },
  });

  const organization = await database.organization.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "MAIN" } },
    create: { tenantId: tenant.id, code: "MAIN", displayName: tenantName },
    update: { displayName: tenantName, status: "ACTIVE", archivedAt: null },
  });

  const branch = await database.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "MAIN" } },
    create: {
      tenantId: tenant.id,
      organizationId: organization.id,
      code: "MAIN",
      name: "Main Hospital",
      isMainBranch: true,
    },
    update: {
      organizationId: organization.id,
      name: "Main Hospital",
      status: "ACTIVE",
      isMainBranch: true,
      archivedAt: null,
    },
  });

  console.log(`✓ Tenant: ${tenant.slug}`);
  console.log(`✓ Organization: ${organization.code}`);
  console.log(`✓ Branch: ${branch.code}`);

  // ── 2b. Permission rows ──────────────────────────────────────────────────
  // Derived from the same source the application uses for enforcement so the
  // seeded set never drifts from the live permission registry.
  const { WORKSPACE_PERMISSION_CODES: workspacePermissions } = await import(
    "../../apps/web/src/server/access/workspace-roles.js"
  ) as { WORKSPACE_PERMISSION_CODES: Record<string, readonly string[]> };

  const allPermissionCodes = [
    ...new Set(Object.values(workspacePermissions).flat()),
  ];

  const permissionRows = await Promise.all(
    allPermissionCodes.map((code) =>
      database.permission.upsert({
        where: { code },
        create: { code, category: code.split(".")[0]!, label: code },
        update: {},
      }),
    ),
  );

  console.log(`✓ Permissions registered: ${permissionRows.length}`);

  // ── 2c. Hospital administrator identity ─────────────────────────────────
  const adminIdentity = await database.identity.upsert({
    where: { normalizedEmail: adminEmail },
    create: {
      email: adminEmail,
      normalizedEmail: adminEmail,
      passwordHash: adminPasswordHash,
      mustChangePassword: true,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      passwordChangedAt: new Date(),
    },
    update: {
      passwordHash: adminPasswordHash,
      mustChangePassword: true,
      status: "ACTIVE",
      failedLoginCount: 0,
      lockedUntil: null,
      archivedAt: null,
    },
  });

  // ── 2d. Membership ───────────────────────────────────────────────────────
  const adminMembership = await database.tenantMembership.upsert({
    where: { tenantId_identityId: { tenantId: tenant.id, identityId: adminIdentity.id } },
    create: {
      tenantId: tenant.id,
      identityId: adminIdentity.id,
      organizationId: organization.id,
      primaryBranchId: branch.id,
      displayName: "Hospital Administrator",
      status: "ACTIVE",
      workspaceCodes: ["ADMIN"],
      primaryWorkspace: "ADMIN",
    },
    update: {
      organizationId: organization.id,
      primaryBranchId: branch.id,
      displayName: "Hospital Administrator",
      status: "ACTIVE",
      workspaceCodes: ["ADMIN"],
      primaryWorkspace: "ADMIN",
      archivedAt: null,
    },
  });

  // ── 2e. ADMIN role with least-privilege permissions ──────────────────────
  const adminRole = await database.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "ADMIN" } },
    create: {
      tenantId: tenant.id,
      code: "ADMIN",
      name: "Hospital Administrator",
      isSystem: true,
    },
    update: { name: "Hospital Administrator", isActive: true, archivedAt: null },
  });

  // Replace membership roles atomically to keep the assignment clean on
  // re-runs without leaving stale role links from previous configurations.
  await database.membershipRole.deleteMany({
    where: { tenantId: tenant.id, membershipId: adminMembership.id },
  });
  await database.membershipRole.create({
    data: {
      tenantId: tenant.id,
      membershipId: adminMembership.id,
      roleId: adminRole.id,
      branchId: branch.id,
    },
  });

  const adminPermissionSet = new Set<string>(workspacePermissions["ADMIN"] ?? []);

  await database.rolePermission.deleteMany({
    where: { tenantId: tenant.id, roleId: adminRole.id },
  });

  for (const permission of permissionRows.filter((p) => adminPermissionSet.has(p.code))) {
    await database.rolePermission.upsert({
      where: {
        tenantId_roleId_permissionId: {
          tenantId: tenant.id,
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      create: { tenantId: tenant.id, roleId: adminRole.id, permissionId: permission.id },
      update: { effect: "ALLOW" },
    });
  }

  console.log(`✓ Hospital administrator created: ${adminEmail}`);
  console.log("\nProduction seed complete.");
  console.log("\nIMPORTANT: Both accounts are set to require a password change on first login.");
  console.table([
    { role: "Platform Admin", email: platformEmail, mustChangePassword: true },
    { role: "Hospital Admin", email: adminEmail, mustChangePassword: true },
  ]);

  await database.$disconnect();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
