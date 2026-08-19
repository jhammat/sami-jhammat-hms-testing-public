import { describe, expect, it } from "vitest";
import { database } from "@wonflow/database";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { doctorProfileService } from "@/server/doctor/doctor-profile-service";
import { addCustomConsultationRoom, readQueueRoomOptions } from "@/lib/queue";

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

  it("registers custom consultation rooms in room options", () => {
    const initialRooms = readQueueRoomOptions();
    const customName = `VIP Suite ${Date.now()}`;
    const newRoom = addCustomConsultationRoom(customName, "consultation");

    expect(newRoom.label).toBe(customName);
    expect(newRoom.category).toBe("consultation");

    const updatedRooms = readQueueRoomOptions();
    expect(updatedRooms.some((r) => r.label === customName)).toBe(true);
  });
});
