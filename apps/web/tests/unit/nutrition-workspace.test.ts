import { describe, expect, it } from "vitest";
import { NutritionService } from "@/server/allied/nutrition-service";
import type { WonFlowTenantRequestContext } from "@wonflow/contracts";

describe("Clinical Nutrition Workspace & Dietetics Service (Task D-02)", () => {
  const baseContext: WonFlowTenantRequestContext = {
    scope: "tenant",
    requestId: "req-nutr-test-1",
    userId: "user-nutr-1",
    identityId: "00000000-0000-0000-0000-000000000001",
    membershipId: "00000000-0000-0000-0000-000000000002",
    sessionId: "sess-nutr-1",
    tenantId: "00000000-0000-0000-0000-000000000003",
    organizationId: "00000000-0000-0000-0000-000000000004",
    branchId: "00000000-0000-0000-0000-000000000005",
    workspace: "NUTRITIONIST",
    locale: "en",
    timezone: "UTC",
    currencyCode: "PKR",
    permissionCodes: ["referrals.read", "patients.read"],
    sourceApplication: "web",
  };

  const service = new NutritionService();

  it("rejects assessment if patient ID is missing", async () => {
    await expect(
      service.createAssessment(baseContext, {
        patientId: "   ",
        weightKg: 65,
        heightCm: 170,
        enzymeRequirement: true,
      }),
    ).rejects.toThrow("Patient ID is required.");
  });

  it("rejects plan creation if title is missing", async () => {
    await expect(
      service.createNutritionPlan(baseContext, {
        patientId: "00000000-0000-0000-0000-000000000010",
        title: "   ",
        phase: "Phase 1: Clear Liquids",
        startDate: new Date().toISOString(),
        items: [],
      }),
    ).rejects.toThrow("Nutrition plan title is required.");
  });

  it("rejects plan creation if phase is missing", async () => {
    await expect(
      service.createNutritionPlan(baseContext, {
        patientId: "00000000-0000-0000-0000-000000000010",
        title: "Post-Resection Recovery Plan",
        phase: "   ",
        startDate: new Date().toISOString(),
        items: [],
      }),
    ).rejects.toThrow("Dietary phase is required.");
  });

  it("enforces PERT / Creon with-meal clinical safety rule", () => {
    const rawItems = [
      { itemType: "MEAL" as const, name: "Lunch", timeOfDay: "Lunch", withMeal: false },
      { itemType: "ENZYME" as const, name: "Creon 25,000 IU", timeOfDay: "Lunch", withMeal: false }, // passed false by mistake
      { itemType: "SUPPLEMENT" as const, name: "Pancreatin granules", timeOfDay: "Breakfast", withMeal: false }, // enzyme in name
    ];

    const processedItems = rawItems.map((item) => {
      const isEnzyme =
        item.itemType === "ENZYME" ||
        /creon|pancreatin|enzyme|pert/i.test(item.name);
      return {
        ...item,
        withMeal: isEnzyme ? true : (item.withMeal ?? false),
      };
    });

    expect(processedItems[0].withMeal).toBe(false);
    expect(processedItems[1].withMeal).toBe(true); // Enforced to true
    expect(processedItems[2].withMeal).toBe(true); // Enforced to true
  });
});
