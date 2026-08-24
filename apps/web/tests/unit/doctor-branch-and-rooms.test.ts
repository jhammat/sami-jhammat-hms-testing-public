import { describe, expect, it } from "vitest";
import { database } from "@wonflow/database";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { doctorProfileService } from "@/server/doctor/doctor-profile-service";
import { QUEUE_ROOM_OPTIONS } from "@/lib/queue";
import { addTenantPicklistEntry, listTenantPicklistEntries } from "@/server/tenant/tenant-picklist-service";

describe("Doctor Custom Rooms and Hospital Branches", () => {
  it("allows doctors to create a hospital branch within their tenant/organization", async () => {
    const tenant = await database.tenant.create({
      data: {
        slug: `doctor-branch-${Date.now()}`,
        displayName: "Doctor Branch Test Clinic",
        status: "ACTIVE",
        defaultTimezone: "Asia/Karachi",
        defaultCurrencyCode: "PKR",
      },
    });

    const organization = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "MAIN",
        displayName: "Doctor Branch Organization",
        status: "ACTIVE",
      },
    });

    const identity = await database.identity.create({
      data: {
        email: `doctor${Date.now()}@example.test`,
        normalizedEmail: `doctor${Date.now()}@example.test`,
        status: "ACTIVE",
      },
    });

    const membership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: organization.id,
        identityId: identity.id,
        displayName: "Dr. Branch Tester",
        status: "ACTIVE",
        workspaceCodes: ["DOCTOR"],
      },
    });

    const staffProfile = await database.staffProfile.create({
      data: {
        tenantId: tenant.id,
        membershipId: membership.id,
        employeeNumber: `EMP-${Date.now()}`,
        status: "ACTIVE",
        staffType: "DOCTOR",
      },
    });

    const doctorProfile = await database.doctorProfile.create({
      data: {
        tenantId: tenant.id,
        staffProfileId: staffProfile.id,
        specialty: "General Medicine",
      },
    });

    const mockContext: WonFlowRequestContext = {
      scope: "tenant",
      tenantId: tenant.id,
      organizationId: organization.id,
      branchId: null,
      userId: identity.id,
      identityId: identity.id,
      membershipId: membership.id,
      sessionId: "00000000-0000-0000-0000-000000000000",
      requestId: "test-req-123",
      sourceApplication: "web",
      permissionCodes: ["organization.services.read"],
      workspace: "DOCTOR",
      locale: "en",
      timezone: "Asia/Karachi",
      currencyCode: "PKR",
    };

    // Create branch via doctor profile service
    const createdBranch = await doctorProfileService.createBranch(mockContext, {
      name: "North Wing Specialty Clinic",
      code: "NWSC",
      phone: "+92 300 9876543",
      address: "North Sector 5, Medical Tower",
    });

    expect(createdBranch.name).toBe("North Wing Specialty Clinic");
    expect(createdBranch.code).toBe("NWSC");

    // Verify it is listed in getProfile branches
    const profileData = await doctorProfileService.getProfile(mockContext);
    expect(profileData.branches.some((b) => b.id === createdBranch.id)).toBe(true);

    // Clean up
    await database.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
    await database.branch.deleteMany({ where: { tenantId: tenant.id } });
    await database.doctorProfile.deleteMany({ where: { tenantId: tenant.id } });
    await database.staffProfile.deleteMany({ where: { tenantId: tenant.id } });
    await database.tenantMembership.deleteMany({ where: { tenantId: tenant.id } });
    await database.identity.delete({ where: { id: identity.id } });
    await database.organization.delete({ where: { id: organization.id } });
    await database.tenant.delete({ where: { id: tenant.id } });
  });

  it("saves a custom consultation room for the whole hospital, not one browser", async () => {
    const tenant = await database.tenant.create({
      data: { slug: `rooms-${Date.now()}`, displayName: "Rooms Test Clinic", status: "ACTIVE" },
    });
    const organization = await database.organization.create({
      data: { tenantId: tenant.id, code: "MAIN", displayName: "Rooms Organization", status: "ACTIVE" },
    });

    const context = {
      scope: "tenant",
      tenantId: tenant.id,
      organizationId: organization.id,
      branchId: null,
      userId: "00000000-0000-0000-0000-000000000000",
      identityId: "00000000-0000-0000-0000-000000000000",
      membershipId: "00000000-0000-0000-0000-000000000000",
      sessionId: "00000000-0000-0000-0000-000000000000",
      requestId: `req-rooms-${Date.now()}`,
      sourceApplication: "web",
      permissionCodes: ["queues.manage"],
      workspace: "DOCTOR",
      locale: "en",
      timezone: "Asia/Karachi",
      currencyCode: "PKR",
    } as unknown as WonFlowRequestContext;

    const customName = `VIP Suite ${Date.now()}`;
    const created = await addTenantPicklistEntry(context, {
      kind: "CONSULTATION_ROOM",
      label: customName,
      metadata: { category: "consultation" },
    });
    expect(created.label).toBe(customName);

    // Readable by any other session in the same tenant — that is the point.
    const saved = await listTenantPicklistEntries(context, ["CONSULTATION_ROOM"]);
    expect(saved.some((entry) => entry.label === customName)).toBe(true);

    // Re-adding the same room under different casing must not duplicate it.
    const again = await addTenantPicklistEntry(context, {
      kind: "CONSULTATION_ROOM",
      label: customName.toUpperCase(),
      metadata: { category: "consultation" },
    });
    expect(again.id).toBe(created.id);
    expect((await listTenantPicklistEntries(context, ["CONSULTATION_ROOM"])).length).toBe(1);

    // The seeded rooms still ship in the bundle and are not stored per tenant.
    expect(QUEUE_ROOM_OPTIONS.length).toBeGreaterThan(0);

    await database.tenantPicklistEntry.deleteMany({ where: { tenantId: tenant.id } });
    await database.organization.delete({ where: { id: organization.id } });
    await database.tenant.delete({ where: { id: tenant.id } });
  });
});
