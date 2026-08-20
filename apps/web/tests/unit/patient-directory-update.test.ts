import { describe, expect, it } from "vitest";
import { database } from "@wonflow/database";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { receptionService } from "@/server/reception/reception-service";
import { fetchDirectoryPage } from "@/lib/patients";

describe("Patient Directory Demographics and Update Workflow", () => {
  it("updates patient demographics, CNIC, blood group, address and emergency contact and returns them in the directory", async () => {
    const tenant = await database.tenant.create({
      data: {
        slug: `patient-dir-${Date.now()}`,
        displayName: "Patient Directory Hospital",
        status: "ACTIVE",
        defaultTimezone: "Asia/Karachi",
        defaultCurrencyCode: "PKR",
      },
    });

    const organization = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "MAIN",
        displayName: "Main Org",
        status: "ACTIVE",
      },
    });

    const branch = await database.branch.create({
      data: {
        tenantId: tenant.id,
        organizationId: organization.id,
        code: "BR-1",
        name: "Main Branch",
        status: "ACTIVE",
      },
    });

    const identity = await database.identity.create({
      data: {
        email: `staff${Date.now()}@example.test`,
        normalizedEmail: `staff${Date.now()}@example.test`,
        status: "ACTIVE",
      },
    });

    const membership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: organization.id,
        identityId: identity.id,
        displayName: "Reception Desk Staff",
        status: "ACTIVE",
        workspaceCodes: ["RECEPTION", "BILLING"],
      },
    });

    const mockContext: WonFlowRequestContext = {
      scope: "tenant",
      tenantId: tenant.id,
      organizationId: organization.id,
      branchId: branch.id,
      userId: identity.id,
      identityId: identity.id,
      membershipId: membership.id,
      sessionId: "00000000-0000-0000-0000-000000000000",
      requestId: "req-pat-123",
      sourceApplication: "web",
      permissionCodes: ["patients.manage", "patients.read"],
      workspace: "RECEPTION",
      locale: "en",
      timezone: "Asia/Karachi",
      currencyCode: "PKR",
    };

    // Register initial patient
    const registered = await receptionService.registerPatient(mockContext, {
      givenName: "Fatima",
      familyName: "Zahra",
      dateOfBirth: "1995-04-12",
      sex: "female",
      phone: "+92 300 1234567",
      email: "fatima@example.com",
      identifiers: [
        {
          type: "NATIONAL_ID",
          system: "pk.nadra.cnic",
          value: "35201-1234567-1",
          isPrimary: true,
        },
      ],
      guardianData: {
        fatherName: "Muhammad Ali",
        emergencyContactName: "Tariq Ali",
        emergencyContactPhone: "+92 321 7654321",
        emergencyContactRelation: "Brother",
      },
      consentData: {
        bloodGroup: "B+",
        patientCategory: "corporate",
        notes: "No penicillin allergy",
      },
    });

    expect(registered.patient.patientNumber).toBeDefined();
    expect(registered.patient.givenName).toBe("Fatima");

    // Update patient demographics
    const updated = await receptionService.updatePatient(mockContext, registered.patient.id, {
      givenName: "Fatima",
      familyName: "Ali",
      fatherName: "Muhammad Tariq Ali",
      bloodGroup: "O+",
      dateOfBirth: "1994-08-20",
      sex: "female",
      phone: "+92 300 9998887",
      address: {
        text: "House 45, Street 12, Gulberg III",
        city: "Lahore",
      },
      guardianData: {
        fatherName: "Muhammad Tariq Ali",
        emergencyContactName: "Ayesha Tariq",
        emergencyContactPhone: "+92 333 4445556",
        emergencyContactRelation: "Sister",
      },
      consentData: {
        bloodGroup: "O+",
        patientCategory: "insurance",
      },
      identifiers: [
        {
          type: "NATIONAL_ID",
          system: "pk.nadra.cnic",
          value: "35202-9876543-2",
          isPrimary: true,
        },
      ],
    });

    expect(updated.givenName).toBe("Fatima");
    expect(updated.familyName).toBe("Ali");
    expect(updated.dateOfBirth?.toISOString().slice(0, 10)).toBe("1994-08-20");

    // Fetch patient directly
    const fetched = await receptionService.getPatient(mockContext, registered.patient.id);
    expect(fetched.identifiers[0]?.value).toBe("35202-9876543-2");
    expect((fetched.consentData as { bloodGroup?: string })?.bloodGroup).toBe("O+");
    expect((fetched.guardianData as { fatherName?: string })?.fatherName).toBe("Muhammad Tariq Ali");
    expect((fetched.guardianData as { emergencyContactPhone?: string })?.emergencyContactPhone).toBe("+92 333 4445556");

    // Cleanup
    await database.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
    await database.patientIdentifier.deleteMany({ where: { patientId: registered.patient.id } });
    await database.patient.delete({ where: { id: registered.patient.id } });
    await database.branch.deleteMany({ where: { tenantId: tenant.id } });
    await database.tenantMembership.deleteMany({ where: { tenantId: tenant.id } });
    await database.identity.delete({ where: { id: identity.id } });
    await database.organization.delete({ where: { id: organization.id } });
    await database.tenant.delete({ where: { id: tenant.id } });
  });
});
