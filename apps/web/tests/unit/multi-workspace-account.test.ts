import { describe, expect, it } from "vitest";
import type { WorkspaceCode } from "@wonflow/database";
import { homePathForRole, type WonFlowRole } from "@/lib/auth/accounts";
import { audienceOf, PORTAL_DIRECTORY } from "@/lib/auth/portal-directory";
import { workspaceRoles } from "@/lib/auth/account-service";
import { canRoleOpen } from "@/lib/auth/portal-access";

describe("Multi-Workspace Account & Portal Routing", () => {
  it("correctly maps multiple workspaces (Doctor, Billing, Admin) to their roles and home paths", () => {
    const userWorkspaces: WorkspaceCode[] = ["DOCTOR", "BILLING", "ADMIN"];

    const mappedRoles = userWorkspaces.map((ws) => workspaceRoles[ws]);
    expect(mappedRoles).toEqual(["doctor", "billing", "admin"]);

    const homePaths = mappedRoles.map((role) => homePathForRole(role));
    expect(homePaths).toEqual(["/doctor", "/operations/billing", "/admin"]);

    for (const role of mappedRoles) {
      expect(audienceOf(role)).toBe("hospital");
      expect(PORTAL_DIRECTORY[role].audience).toBe("hospital");
    }
  });

  it("ensures patient credentials belong strictly to the patient audience", () => {
    const patientRole: WonFlowRole = "patient";
    expect(audienceOf(patientRole)).toBe("patient");
    expect(homePathForRole(patientRole)).toBe("/patient");
    expect(canRoleOpen(patientRole, "/patient")).toBe(true);
    expect(canRoleOpen(patientRole, "/doctor")).toBe(false);
    expect(canRoleOpen(patientRole, "/admin")).toBe(false);
    expect(canRoleOpen(patientRole, "/operations/billing")).toBe(false);
  });

  it("ensures hospital staff credentials belong strictly to the hospital audience", () => {
    const hospitalRoles: WonFlowRole[] = [
      "doctor",
      "billing",
      "admin",
      "reception",
      "pharmacy",
      "laboratory",
      "radiology",
      "management",
      "physiotherapist",
      "nutritionist",
    ];

    for (const role of hospitalRoles) {
      expect(audienceOf(role)).toBe("hospital");
      expect(canRoleOpen(role, "/patient")).toBe(false);
    }
  });

  it("all workspace codes have matching descriptors in portal directory", () => {
    const allWorkspaces: WorkspaceCode[] = [
      "ADMIN",
      "RECEPTION",
      "DOCTOR",
      "PATIENT",
      "LABORATORY",
      "RADIOLOGY",
      "PHARMACY",
      "BILLING",
      "MANAGEMENT",
      "PHYSIOTHERAPIST",
      "NUTRITIONIST",
    ];

    for (const code of allWorkspaces) {
      const role = workspaceRoles[code];
      expect(role).toBeDefined();
      expect(PORTAL_DIRECTORY[role]).toBeDefined();
      expect(PORTAL_DIRECTORY[role].label).toBeTruthy();
      expect(PORTAL_DIRECTORY[role].description).toBeTruthy();
    }
  });
});
