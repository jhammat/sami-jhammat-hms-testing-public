import { describe, expect, it } from "vitest";
import { ReferralService } from "@/server/clinical/referral-service";
import type { WonFlowTenantRequestContext } from "@wonflow/contracts";

describe("Clinical Referral Service (Tasks B-02 & D-03)", () => {
  const baseContext: WonFlowTenantRequestContext = {
    scope: "tenant",
    requestId: "req-test-1",
    userId: "user-test-1",
    identityId: "00000000-0000-0000-0000-000000000001",
    membershipId: "00000000-0000-0000-0000-000000000002",
    sessionId: "sess-test-1",
    tenantId: "00000000-0000-0000-0000-000000000003",
    organizationId: "00000000-0000-0000-0000-000000000004",
    branchId: "00000000-0000-0000-0000-000000000005",
    workspace: "DOCTOR",
    locale: "en",
    timezone: "UTC",
    currencyCode: "PKR",
    permissionCodes: ["referrals.create", "referrals.read", "patients.read"],
    sourceApplication: "web",
  };

  const service = new ReferralService();

  it("rejects creation if caller lacks referrals.create or careplans.manage", async () => {
    const unprivilegedContext: WonFlowTenantRequestContext = {
      ...baseContext,
      permissionCodes: ["patients.read"],
    };

    await expect(
      service.createReferral(unprivilegedContext, {
        patientId: "00000000-0000-0000-0000-000000000010",
        specialty: "PHYSIOTHERAPY",
        reason: "Post-op rehabilitation",
      }),
    ).rejects.toThrow("You do not have permission to create clinical referrals.");
  });

  it("rejects creation if specialty is invalid", async () => {
    await expect(
      service.createReferral(baseContext, {
        patientId: "00000000-0000-0000-0000-000000000010",
        specialty: "CARDIOLOGY",
        reason: "Heart checkup",
      }),
    ).rejects.toThrow("Referral specialty must be PHYSIOTHERAPY or NUTRITION.");
  });

  it("rejects creation if reason is missing", async () => {
    await expect(
      service.createReferral(baseContext, {
        patientId: "00000000-0000-0000-0000-000000000010",
        specialty: "NUTRITION",
        reason: "   ",
      }),
    ).rejects.toThrow("Referral reason is required.");
  });

  it("rejects acceptance if referral is not found", async () => {
    await expect(
      service.acceptReferral(baseContext, "00000000-0000-0000-0000-000000000099"),
    ).rejects.toThrow("The referral could not be found.");
  });

  it("rejects completion if referral is not found", async () => {
    await expect(
      service.completeReferral(baseContext, "00000000-0000-0000-0000-000000000099", {
        outcomeNotes: "Patient discharged",
      }),
    ).rejects.toThrow("The referral could not be found.");
  });

  it("rejects cancellation if referral is not found", async () => {
    await expect(
      service.cancelReferral(baseContext, "00000000-0000-0000-0000-000000000099", "Not indicated"),
    ).rejects.toThrow("The referral could not be found.");
  });
});
