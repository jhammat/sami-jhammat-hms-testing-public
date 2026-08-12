import { config } from "dotenv";

config({ path: ".env.local" });
config();

if (process.env.NODE_ENV === "production" || process.env.WONFLOW_ENVIRONMENT === "production") {
  throw new Error("Development login seeding is disabled in production.");
}

async function main(): Promise<void> {
const [{ database }, { hashPassword }] = await Promise.all([
  import("../../packages/database/src/index.js"),
  import("../../apps/web/src/lib/auth/password.js"),
]);

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";
const passwordHash = await hashPassword(password);
const tenant = await database.tenant.upsert({
  where: { slug: "wonflow-development" },
  create: { slug: "wonflow-development", displayName: "WonFlow Development Hospital", status: "ACTIVE" },
  update: { displayName: "WonFlow Development Hospital", status: "ACTIVE", archivedAt: null },
});
const organization = await database.organization.upsert({
  where: { tenantId_code: { tenantId: tenant.id, code: "MAIN" } },
  create: { tenantId: tenant.id, code: "MAIN", displayName: "WonFlow Development Hospital" },
  update: { displayName: "WonFlow Development Hospital", status: "ACTIVE", archivedAt: null },
});
const branch = await database.branch.upsert({
  where: { tenantId_code: { tenantId: tenant.id, code: "MAIN" } },
  create: { tenantId: tenant.id, organizationId: organization.id, code: "MAIN", name: "Main Hospital", isMainBranch: true },
  update: { organizationId: organization.id, name: "Main Hospital", status: "ACTIVE", isMainBranch: true, archivedAt: null },
});

const permissions = [
  "appointments.manage", "appointments.read", "billing.invoices.manage", "encounters.manage", "encounters.read",
  "encounters.sign", "laboratory.orders.read", "laboratory.orders.manage", "laboratory.results.manage", "laboratory.results.release", "organization.audit.read", "organization.branches.manage",
  "organization.profile.manage", "organization.profile.read", "organization.roles.manage", "organization.roles.read",
  "organization.schedules.manage", "organization.schedules.read", "organization.services.manage",
  "organization.services.read", "organization.users.manage", "organization.users.read", "patients.manage", "patients.read",
  "pharmacy.dispensing.manage", "queues.manage",
  "radiology.orders.read", "radiology.orders.manage", "radiology.reports.manage", "radiology.reports.release",
] as const;
const permissionRows = await Promise.all(permissions.map((code) => database.permission.upsert({
  where: { code }, create: { code, category: code.split(".")[0]!, label: code }, update: {},
})));

/**
 * The permissions each workspace legitimately needs — shared with tenant
 * provisioning and staff invitation so seeded and real hospitals never drift.
 */
const { WORKSPACE_PERMISSION_CODES: workspacePermissions } = await import("../../apps/web/src/server/access/workspace-roles.js") as { WORKSPACE_PERMISSION_CODES: Record<string, readonly string[]> };

const accounts = [
  ["admin", "ADMIN", "Hospital Administrator"], ["reception", "RECEPTION", "Reception Officer"],
  ["doctor", "DOCTOR", "Doctor"], ["patient", "PATIENT", "Patient"],
  ["laboratory", "LABORATORY", "Laboratory Officer"], ["radiology", "RADIOLOGY", "Radiology Officer"],
  ["pharmacy", "PHARMACY", "Pharmacist"], ["billing", "BILLING", "Billing Officer"],
  ["management", "MANAGEMENT", "Hospital Manager"],
] as const;

for (const [name, workspace, displayName] of accounts) {
  const email = `${name}@wonflow.local`;
  const identity = await database.identity.upsert({
    where: { normalizedEmail: email },
    create: { email, normalizedEmail: email, passwordHash, mustChangePassword: false, status: "ACTIVE", emailVerifiedAt: new Date(), passwordChangedAt: new Date() },
    update: { email, passwordHash, mustChangePassword: false, status: "ACTIVE", failedLoginCount: 0, lockedUntil: null, archivedAt: null },
  });
  const membership = await database.tenantMembership.upsert({
    where: { tenantId_identityId: { tenantId: tenant.id, identityId: identity.id } },
    create: { tenantId: tenant.id, identityId: identity.id, organizationId: organization.id, primaryBranchId: branch.id, displayName, status: "ACTIVE", workspaceCodes: [workspace], primaryWorkspace: workspace },
    update: { organizationId: organization.id, primaryBranchId: branch.id, displayName, status: "ACTIVE", workspaceCodes: [workspace], primaryWorkspace: workspace, archivedAt: null },
  });
  const role = await database.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: workspace } },
    create: { tenantId: tenant.id, code: workspace, name: `${displayName} Development Role`, isSystem: true },
    update: { isActive: true, archivedAt: null },
  });
  await database.membershipRole.deleteMany({ where: { tenantId: tenant.id, membershipId: membership.id } });
  await database.membershipRole.create({ data: { tenantId: tenant.id, membershipId: membership.id, roleId: role.id, branchId: branch.id } });
  if (workspace === "DOCTOR") {
    const staffProfile = await database.staffProfile.upsert({
      where: { membershipId: membership.id },
      create: {
        tenantId: tenant.id,
        membershipId: membership.id,
        branchId: branch.id,
        employeeNumber: "DEV-DOCTOR-001",
        staffType: "DOCTOR",
        title: "Doctor",
      },
      update: {
        branchId: branch.id,
        staffType: "DOCTOR",
        status: "ACTIVE",
        title: "Doctor",
      },
    });
    await database.doctorProfile.upsert({
      where: { staffProfileId: staffProfile.id },
      create: {
        tenantId: tenant.id,
        staffProfileId: staffProfile.id,
        specialty: "General Medicine",
        publiclyBookable: true,
      },
      update: {
        specialty: "General Medicine",
        publiclyBookable: true,
      },
    });
  }
  // Least privilege: grant only the permissions the workspace actually needs.
  // Granting every permission to every role hides authorization regressions and
  // makes role separation impossible to test.
  const granted = new Set<string>(workspacePermissions[workspace] ?? []);
  await database.rolePermission.deleteMany({ where: { tenantId: tenant.id, roleId: role.id } });
  for (const permission of permissionRows.filter((row) => granted.has(row.code))) {
    await database.rolePermission.upsert({
      where: { tenantId_roleId_permissionId: { tenantId: tenant.id, roleId: role.id, permissionId: permission.id } },
      create: { tenantId: tenant.id, roleId: role.id, permissionId: permission.id }, update: { effect: "ALLOW" },
    });
  }
  if (workspace === "PATIENT") {
    const patient = await database.patient.upsert({
      where: { tenantId_patientNumber: { tenantId: tenant.id, patientNumber: "DEV-0001" } },
      create: { tenantId: tenant.id, patientNumber: "DEV-0001", givenName: "Development", familyName: "Patient", email, normalizedEmail: email },
      update: { email, normalizedEmail: email, status: "ACTIVE", archivedAt: null },
    });
    await database.patientAccess.upsert({
      where: { patientId_identityId: { patientId: patient.id, identityId: identity.id } },
      create: { patientId: patient.id, identityId: identity.id, relationship: "self", isPrimary: true },
      update: { isActive: true, isPrimary: true },
    });
  }
}

/**
 * Publish a bookable consultation so the patient booking catalogue, the
 * reception appointment desk and the doctor schedule have something to work
 * with. Without an active service and availability rules every booking screen
 * correctly renders "No published schedules" and no flow can be exercised.
 */
// Pinned to the doctor@wonflow.local login specifically, not an arbitrary
// doctor: an unordered findFirst here previously could resolve to any of the
// dummy doctors created by other test runs, so the "live" video-consultation
// appointment below sometimes belonged to a doctor nobody was logged in as —
// an intermittent failure in the video-consultation e2e spec that had nothing
// to do with the code under test.
const developmentDoctor = await database.doctorProfile.findFirst({
  where: { tenantId: tenant.id, staffProfile: { membership: { identity: { normalizedEmail: "doctor@wonflow.local" } } } },
  select: { id: true },
});

if (developmentDoctor) {
  const consultationService = await database.serviceDefinition.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "DEV-OPD-CONSULT" } },
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      doctorId: developmentDoctor.id,
      code: "DEV-OPD-CONSULT",
      name: "General Medicine Consultation",
      category: "Consultation",
      description: "Standard outpatient consultation used by the development dataset.",
      durationMinutes: 20,
      priceMinorUnits: 150_000,
      currencyCode: "PKR",
      publiclyBookable: true,
      isActive: true,
    },
    update: {
      branchId: branch.id,
      doctorId: developmentDoctor.id,
      name: "General Medicine Consultation",
      category: "Consultation",
      durationMinutes: 20,
      priceMinorUnits: 150_000,
      currencyCode: "PKR",
      publiclyBookable: true,
      isActive: true,
    },
  });

  /** An online-mode service so the video consultation module is exercisable. */
  const onlineService = await database.serviceDefinition.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "DEV-ONLINE-CONSULT" } },
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      doctorId: developmentDoctor.id,
      code: "DEV-ONLINE-CONSULT",
      name: "Online Video Consultation",
      category: "Consultation",
      description: "Remote consultation delivered over secure video.",
      durationMinutes: 20,
      priceMinorUnits: 120_000,
      currencyCode: "PKR",
      publiclyBookable: true,
      consultationMode: "ONLINE",
      isActive: true,
    },
    update: {
      branchId: branch.id,
      doctorId: developmentDoctor.id,
      name: "Online Video Consultation",
      category: "Consultation",
      durationMinutes: 20,
      priceMinorUnits: 120_000,
      currencyCode: "PKR",
      publiclyBookable: true,
      consultationMode: "ONLINE",
      isActive: true,
    },
  });

  // Monday to Saturday, 09:00-17:00 local branch time.
  const validFrom = new Date("2020-01-01T00:00:00.000Z");

  /**
   * The clinics must not overlap. Slot capacity is enforced per doctor across
   * every service, so two services sharing one window would compete for the
   * same appointments and halve the bookable day.
   */
  const clinics = [
    { service: consultationService, startsMinute: 9 * 60, endsMinute: 17 * 60 },
    { service: onlineService, startsMinute: 17 * 60, endsMinute: 21 * 60 },
  ];

  for (const clinic of clinics) {
    const service = clinic.service;
    for (const weekday of [1, 2, 3, 4, 5, 6]) {
      const existingRule = await database.availabilityRule.findFirst({
        where: {
          tenantId: tenant.id,
          doctorId: developmentDoctor.id,
          branchId: branch.id,
          serviceId: service.id,
          weekday,
        },
        select: { id: true },
      });

      const ruleData = {
        startsMinute: clinic.startsMinute,
        endsMinute: clinic.endsMinute,
        capacity: 1,
        validFrom,
        validUntil: null,
        isActive: true,
      };

      if (existingRule) {
        await database.availabilityRule.update({ where: { id: existingRule.id }, data: ruleData });
        continue;
      }

      await database.availabilityRule.create({
        data: {
          tenantId: tenant.id,
          doctorId: developmentDoctor.id,
          branchId: branch.id,
          serviceId: service.id,
          weekday,
          ...ruleData,
        },
      });
    }
  }
}

/**
 * An online appointment that is live right now, so the video consultation room
 * is joinable on sight rather than only inside a future booking window.
 */
const onlineServiceRecord = await database.serviceDefinition.findFirst({
  where: { tenantId: tenant.id, code: "DEV-ONLINE-CONSULT" },
  select: { id: true, durationMinutes: true },
});

const seedPatient = await database.patient.findFirst({
  where: { tenantId: tenant.id, patientNumber: "DEV-0001" },
  select: { id: true },
});

if (developmentDoctor && onlineServiceRecord && seedPatient) {
  const startsAt = new Date(Date.now() - 5 * 60_000);
  const endsAt = new Date(startsAt.getTime() + onlineServiceRecord.durationMinutes * 60_000);

  // Must also match doctorId: a live call for this patient with any other
  // doctor (e.g. left over from a run before a doctor was reassigned) would
  // otherwise satisfy this check and block a fresh one from ever being
  // created for the doctor this seed is actually pinning appointments to.
  const liveCall = await database.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      patientId: seedPatient.id,
      doctorId: developmentDoctor.id,
      consultationMode: "ONLINE",
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"] },
      startsAt: { lte: new Date() },
      endsAt: { gte: new Date() },
    },
    select: { id: true },
  });

  if (!liveCall) {
    await database.appointment.create({
      data: {
        tenantId: tenant.id,
        patientId: seedPatient.id,
        doctorId: developmentDoctor.id,
        branchId: branch.id,
        serviceId: onlineServiceRecord.id,
        consultationMode: "ONLINE",
        status: "CONFIRMED",
        source: "SEED",
        reason: "Live online consultation for development",
        startsAt,
        endsAt,
        idempotencyKey: `seed-live-video-${startsAt.toISOString()}`,
      },
    });
  }
}

/**
 * Seed a consultation encounter with laboratory orders so the diagnostics
 * module can be exercised end to end: collect specimen, enter a result,
 * release it, and confirm it reaches the patient portal and ordering doctor.
 */
const developmentPatient = await database.patient.findFirst({
  where: { tenantId: tenant.id, patientNumber: "DEV-0001" },
  select: { id: true },
});

const doctorMembership = await database.tenantMembership.findFirst({
  where: { tenantId: tenant.id, primaryWorkspace: "DOCTOR" },
  select: { id: true },
});

if (developmentDoctor && developmentPatient && doctorMembership) {
  const encounter =
    (await database.encounter.findFirst({
      where: { tenantId: tenant.id, patientId: developmentPatient.id, reason: "Development diagnostics encounter" },
      select: { id: true },
    })) ??
    (await database.encounter.create({
      data: {
        tenantId: tenant.id,
        patientId: developmentPatient.id,
        branchId: branch.id,
        doctorId: developmentDoctor.id,
        status: "IN_PROGRESS",
        reason: "Development diagnostics encounter",
        startedAt: new Date(),
      },
      select: { id: true },
    }));

  const diagnosticOrders = [
    { type: "LABORATORY", code: "CBC", name: "Complete Blood Count", specimen: "Blood", reason: "Fatigue and recurrent fever", priority: "routine" },
    { type: "LABORATORY", code: "LFT", name: "Liver Function Test", specimen: "Blood", reason: "Baseline before therapy", priority: "routine" },
    { type: "LABORATORY", code: "TROP-I", name: "Troponin I", specimen: "Blood", reason: "Chest pain, rule out infarction", priority: "urgent" },
    { type: "RADIOLOGY", code: "CXR-PA", name: "Chest X-Ray (PA view)", specimen: "Chest", reason: "Persistent cough for three weeks", priority: "routine" },
    { type: "RADIOLOGY", code: "USG-ABD", name: "Ultrasound Abdomen", specimen: "Abdomen", reason: "Right upper quadrant pain", priority: "routine" },
    { type: "RADIOLOGY", code: "CT-HEAD", name: "CT Brain (plain)", specimen: "Head", reason: "Head injury, rule out bleed", priority: "urgent" },
  ] as const;

  /**
   * Keep a minimum pool of open orders per department. Releasing a result
   * completes its order, and the end-to-end suite runs across two browser
   * projects, so a fixed set would be exhausted partway through a run.
   */
  const OPEN_ORDERS_PER_TYPE = 8;

  for (const type of ["LABORATORY", "RADIOLOGY"] as const) {
    const openCount = await database.diagnosticOrder.count({
      where: {
        tenantId: tenant.id,
        encounterId: encounter.id,
        type,
        status: { notIn: ["COMPLETED", "CANCELLED", "ENTERED_IN_ERROR"] },
      },
    });

    const templates = diagnosticOrders.filter((order) => order.type === type);

    for (let index = openCount; index < OPEN_ORDERS_PER_TYPE; index += 1) {
      const template = templates[index % templates.length]!;
      await database.diagnosticOrder.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          patientId: developmentPatient.id,
          encounterId: encounter.id,
          orderedByMembershipId: doctorMembership.id,
          type: template.type,
          status: "ORDERED",
          priority: template.priority,
          code: template.code,
          name: template.name,
          specimenOrBodySite: template.specimen,
          clinicalReason: template.reason,
          orderedAt: new Date(),
        },
      });
    }
  }
}

const platformEmail = "platform@wonflow.local";
await database.identity.upsert({
  where: { normalizedEmail: platformEmail },
  create: { email: platformEmail, normalizedEmail: platformEmail, passwordHash, mustChangePassword: false, status: "ACTIVE", isPlatformAdministrator: true, platformPermissionCodes: ["platform.tenants.read", "platform.tenants.manage", "platform.entitlements.manage", "platform.subscriptions.manage", "platform.support-access.manage", "platform.audit.read"], emailVerifiedAt: new Date(), passwordChangedAt: new Date() },
  update: { passwordHash, mustChangePassword: false, status: "ACTIVE", isPlatformAdministrator: true, failedLoginCount: 0, lockedUntil: null, archivedAt: null },
});

console.table([...accounts.map(([name, workspace]) => ({ workspace, email: `${name}@wonflow.local`, password })), { workspace: "PLATFORM", email: platformEmail, password }]);
await database.$disconnect();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
