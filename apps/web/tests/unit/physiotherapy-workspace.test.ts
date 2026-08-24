import { describe, expect, it } from "vitest";
import { PhysiotherapyService } from "@/server/allied/physiotherapy-service";
import type { WonFlowTenantRequestContext } from "@wonflow/contracts";

describe("Physiotherapy Workspace & Mobility Service (Task D-01)", () => {
  const baseContext: WonFlowTenantRequestContext = {
    scope: "tenant",
    requestId: "req-pt-test-1",
    userId: "user-pt-1",
    identityId: "00000000-0000-0000-0000-000000000001",
    membershipId: "00000000-0000-0000-0000-000000000002",
    sessionId: "sess-pt-1",
    tenantId: "00000000-0000-0000-0000-000000000003",
    organizationId: "00000000-0000-0000-0000-000000000004",
    branchId: "00000000-0000-0000-0000-000000000005",
    workspace: "PHYSIOTHERAPIST",
    locale: "en",
    timezone: "UTC",
    currencyCode: "PKR",
    permissionCodes: ["referrals.read", "patients.read"],
    sourceApplication: "web",
  };

  const service = new PhysiotherapyService();

  it("rejects assessment if patient ID is missing", async () => {
    await expect(
      service.createAssessment(baseContext, {
        patientId: "   ",
        mobilityScore: 5,
        painScore: 2,
        independenceLevel: "ASSISTED_AMBULATION",
      }),
    ).rejects.toThrow("Patient ID is required.");
  });

  it("rejects assessment if mobility score is out of 0-10 bounds", async () => {
    await expect(
      service.createAssessment(baseContext, {
        patientId: "00000000-0000-0000-0000-000000000010",
        mobilityScore: 12,
        painScore: 3,
        independenceLevel: "ASSISTED_AMBULATION",
      }),
    ).rejects.toThrow("Mobility score must be between 0 and 10.");
  });

  it("rejects assessment if pain score is negative", async () => {
    await expect(
      service.createAssessment(baseContext, {
        patientId: "00000000-0000-0000-0000-000000000010",
        mobilityScore: 5,
        painScore: -1,
        independenceLevel: "ASSISTED_AMBULATION",
      }),
    ).rejects.toThrow("Pain score must be between 0 and 10.");
  });

  it("rejects exercise definition creation if name is missing", async () => {
    await expect(
      service.createExerciseDefinition(baseContext, {
        name: "   ",
        category: "RESPIRATORY",
        instruction: "Breathe deeply",
      }),
    ).rejects.toThrow("Exercise name is required.");
  });

  it("rejects exercise definition creation if instructions are missing", async () => {
    await expect(
      service.createExerciseDefinition(baseContext, {
        name: "Incentive Spirometry",
        category: "RESPIRATORY",
        instruction: "   ",
      }),
    ).rejects.toThrow("Exercise instructions are required.");
  });

  it("rejects therapy session log if patient ID is missing", async () => {
    await expect(
      service.logSession(baseContext, {
        patientId: "   ",
        attendanceStatus: "COMPLETED",
        stepsAchieved: 100,
      }),
    ).rejects.toThrow("Patient ID is required.");
  });

  it("rejects exercise assignment if exercise name is missing", async () => {
    await expect(
      service.assignExercise(baseContext, {
        patientId: "00000000-0000-0000-0000-000000000010",
        exerciseName: "   ",
        category: "MOBILITY",
        instructions: "Walk corridor",
        scheduledFor: new Date().toISOString(),
      }),
    ).rejects.toThrow("Exercise name is required.");
  });
});
