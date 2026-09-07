import { describe, expect, it } from "vitest";

import { homePathForRole, type WonFlowRole } from "@/lib/auth/accounts";
import {
  canRoleOpen,
  rolesForPortalPath,
  rolesUnderPortalPath,
} from "@/lib/auth/portal-access";
import { audienceOf } from "@/lib/auth/portal-directory";

const ALL_ROLES: WonFlowRole[] = [
  "platform",
  "admin",
  "reception",
  "doctor",
  "patient",
  "laboratory",
  "radiology",
  "pharmacy",
  "billing",
  "management",
  "physiotherapist",
  "nutritionist",
];

/**
 * The portal boundary.
 *
 * Before this table existed, a session cookie was the only thing any portal
 * checked: reception could open `/doctor` by typing it or by following a
 * sidebar link that pointed there, and a patient session could do the same.
 * These cases are the ones that were actually reported, so they are the ones
 * pinned here.
 */
describe("Portal access boundary", () => {
  it("keeps every other role out of the doctor workspace", () => {
    for (const role of ALL_ROLES) {
      expect(canRoleOpen(role, "/doctor")).toBe(role === "doctor");
      expect(canRoleOpen(role, "/doctor/careplans")).toBe(role === "doctor");
      expect(canRoleOpen(role, "/doctor/consultations")).toBe(role === "doctor");
    }
  });

  it("keeps staff out of the patient's own record", () => {
    for (const role of ALL_ROLES) {
      expect(canRoleOpen(role, "/patient")).toBe(role === "patient");
      expect(canRoleOpen(role, "/patient/documents")).toBe(role === "patient");
    }
  });

  it("leaves patient self-registration open, since nobody is signed in yet", () => {
    expect(rolesForPortalPath("/patient/register")).toBeNull();

    for (const role of ALL_ROLES) {
      expect(canRoleOpen(role, "/patient/register")).toBe(true);
    }
  });

  it("keeps a patient session out of every hospital portal", () => {
    for (const path of [
      "/doctor",
      "/admin",
      "/platform",
      "/management",
      "/organization",
      "/operations",
      "/operations/reception",
      "/operations/billing",
      "/operations/pharmacy",
      "/operations/laboratory",
      "/operations/radiology",
      "/operations/physiotherapy",
      "/operations/nutrition",
    ]) {
      expect(canRoleOpen("patient", path)).toBe(false);
    }
  });

  it("gives each department counter its own area", () => {
    expect(canRoleOpen("laboratory", "/operations/laboratory")).toBe(true);
    expect(canRoleOpen("radiology", "/operations/laboratory")).toBe(false);
    expect(canRoleOpen("pharmacy", "/operations/radiology")).toBe(false);
    expect(canRoleOpen("reception", "/operations/pharmacy")).toBe(false);

    // Reception takes payment at the desk, so the counter is shared.
    expect(canRoleOpen("reception", "/operations/billing/new")).toBe(true);
    expect(canRoleOpen("billing", "/operations/billing/new")).toBe(true);
    expect(canRoleOpen("doctor", "/operations/billing/new")).toBe(false);
  });

  it("keeps the two allied workspaces apart, and shares only the alert console", () => {
    expect(canRoleOpen("physiotherapist", "/operations/physiotherapy")).toBe(true);
    expect(canRoleOpen("physiotherapist", "/operations/nutrition")).toBe(false);
    expect(canRoleOpen("nutritionist", "/operations/physiotherapy")).toBe(false);

    for (const role of ["doctor", "physiotherapist", "nutritionist"] as const) {
      expect(canRoleOpen(role, "/operations/alerts")).toBe(true);
    }
    expect(canRoleOpen("reception", "/operations/alerts")).toBe(false);
  });

  it("matches on whole path segments, so a look-alike prefix is not a way in", () => {
    // "/doctors-lounge" is not "/doctor/...", and must not inherit its rule.
    expect(rolesForPortalPath("/doctors-lounge")).toBeNull();
    expect(rolesForPortalPath("/operations-archive")).toBeNull();
  });

  it("never redirects a role somewhere it would be turned away from again", () => {
    for (const role of ALL_ROLES) {
      expect(canRoleOpen(role, homePathForRole(role))).toBe(true);
    }
  });

  it("admits every role that works beneath /operations to the shared parent", () => {
    const underOperations = rolesUnderPortalPath("/operations");

    for (const role of [
      "reception",
      "billing",
      "pharmacy",
      "laboratory",
      "radiology",
      "physiotherapist",
      "nutritionist",
      "doctor",
    ] as const) {
      expect(underOperations).toContain(role);
    }

    // The parent is broad, but not so broad that a patient walks in.
    expect(underOperations).not.toContain("patient");
  });
});

/**
 * The sign-in screen's first step. It asks which side you are on, and that
 * answer used to be thrown away — patient credentials typed under "Hospital
 * staff" signed in exactly as if the right door had been chosen.
 */
describe("Sign-in audiences", () => {
  it("puts the patient portal on its own side, and every staff portal on the other", () => {
    expect(audienceOf("patient")).toBe("patient");

    for (const role of ALL_ROLES.filter((candidate) => candidate !== "patient")) {
      expect(audienceOf(role)).toBe("hospital");
    }
  });
});
