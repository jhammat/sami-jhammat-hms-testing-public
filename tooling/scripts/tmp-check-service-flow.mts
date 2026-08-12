import { config } from "dotenv";

config({ path: ".env.local" });

const { database } = await import("../../packages/database/src/index.ts");
const { hospitalAdministrationService } = await import("../../apps/web/src/server/admin/hospital-administration-service.ts");

const organization = await database.organization.findFirst({ where: { archivedAt: null }, select: { id: true, tenantId: true, displayName: true, doctorFeeAuthority: true } });
const department = await database.department.findFirst({ where: { organizationId: organization!.id, isActive: true, archivedAt: null }, select: { id: true, name: true } });
console.log("organization", organization?.displayName, organization?.doctorFeeAuthority, "| department", department?.name);

const context = {
  scope: "tenant" as const,
  requestId: "tmp-check",
  userId: "tmp-check",
  identityId: "tmp-check",
  membershipId: null,
  sessionId: "tmp-check",
  workspace: "hospital-admin",
  locale: "en",
  timezone: "Asia/Karachi",
  currencyCode: "PKR",
  permissionCodes: ["organization.services.manage", "organization.services.read", "organization.profile.read"],
  sourceApplication: "web" as const,
  tenantId: organization!.tenantId,
  organizationId: organization!.id,
  branchId: null,
};

const created = await hospitalAdministrationService.createService(context, {
  name: "Temporary verification service",
  category: "LABORATORY",
  departmentId: department!.id,
  billingOwner: "DEPARTMENT",
  durationMinutes: 15,
  priceMinorUnits: 250000,
});
console.log("created ->", { code: created.code, departmentId: created.departmentId, billingOwner: created.billingOwner });

const second = await hospitalAdministrationService.createService(context, {
  name: "Temporary verification service two",
  category: "LABORATORY",
  durationMinutes: 20,
});
console.log("created ->", { code: second.code, departmentId: second.departmentId, billingOwner: second.billingOwner });

try {
  await hospitalAdministrationService.createService(context, { name: "Bad owner", category: "LABORATORY", billingOwner: "DEPARTMENT", durationMinutes: 15 });
  console.log("EXPECTED FAILURE DID NOT HAPPEN");
} catch (caught) {
  console.log("department-owner without department rejected ->", (caught as Error).message);
}

try {
  await hospitalAdministrationService.createService(context, { code: created.code, name: "Duplicate code", category: "LABORATORY", durationMinutes: 15 });
  console.log("EXPECTED FAILURE DID NOT HAPPEN");
} catch (caught) {
  console.log("duplicate custom code rejected ->", (caught as Error).message);
}

const listed = await hospitalAdministrationService.listServices(context);
console.log("listServices ->", listed.map((s) => ({ code: s.code, department: s.department?.name ?? null, billingOwner: s.billingOwner })));

await database.serviceDefinition.deleteMany({ where: { id: { in: [created.id, second.id] } } });
await database.auditEvent.deleteMany({ where: { requestId: "tmp-check" } });
console.log("cleaned up verification rows");
process.exit(0);
