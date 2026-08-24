import { describe, expect, it } from "vitest";
import {
  WORKSPACE_PERMISSION_CODES,
  type WorkspaceRoleCode,
} from "@/server/access/workspace-roles";

describe("Workspace Roles & Permissions (Task B-01)", () => {
  it("defines correct permissions for PHYSIOTHERAPIST", () => {
    const permissions = WORKSPACE_PERMISSION_CODES.PHYSIOTHERAPIST;
    expect(permissions).toContain("patients.read");
    expect(permissions).toContain("therapy.assessments.read");
    expect(permissions).toContain("therapy.assessments.manage");
    expect(permissions).toContain("therapy.plans.manage");
    expect(permissions).toContain("therapy.sessions.manage");
    expect(permissions).toContain("careplans.read");
    expect(permissions).toContain("careplans.assign");
    expect(permissions).toContain("observations.patient.read");
    expect(permissions).toContain("documents.view");
    expect(permissions).toContain("documents.upload");
    expect(permissions).toContain("education.read");
    expect(permissions).toContain("education.assign");
    expect(permissions).toContain("referrals.read");
  });

  it("defines correct permissions for NUTRITIONIST", () => {
    const permissions = WORKSPACE_PERMISSION_CODES.NUTRITIONIST;
    expect(permissions).toContain("patients.read");
    expect(permissions).toContain("nutrition.assessments.read");
    expect(permissions).toContain("nutrition.assessments.manage");
    expect(permissions).toContain("nutrition.plans.manage");
    expect(permissions).toContain("careplans.read");
    expect(permissions).toContain("careplans.assign");
    expect(permissions).toContain("observations.patient.read");
    expect(permissions).toContain("documents.view");
    expect(permissions).toContain("documents.upload");
    expect(permissions).toContain("education.read");
    expect(permissions).toContain("education.assign");
    expect(permissions).toContain("referrals.read");
  });

  it("extends DOCTOR with care plans, referrals, drains, and alerts permissions", () => {
    const permissions = WORKSPACE_PERMISSION_CODES.DOCTOR;
    expect(permissions).toContain("careplans.manage");
    expect(permissions).toContain("careplans.template.manage");
    expect(permissions).toContain("referrals.create");
    expect(permissions).toContain("alerts.configure");
    expect(permissions).toContain("alerts.acknowledge");
    expect(permissions).toContain("drains.read");
    expect(permissions).toContain("observations.patient.read");
    expect(permissions).toContain("education.manage");
  });

  it("includes all workspace codes in WORKSPACE_PERMISSION_CODES", () => {
    const codes: WorkspaceRoleCode[] = [
      "ADMIN",
      "RECEPTION",
      "DOCTOR",
      "PHYSIOTHERAPIST",
      "NUTRITIONIST",
      "LABORATORY",
      "RADIOLOGY",
      "PHARMACY",
      "BILLING",
      "MANAGEMENT",
      "PATIENT",
    ];
    for (const code of codes) {
      expect(WORKSPACE_PERMISSION_CODES).toHaveProperty(code);
    }
  });
});
