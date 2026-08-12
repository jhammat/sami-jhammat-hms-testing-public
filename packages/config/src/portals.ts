import type {
  WonFlowPortalCode,
  WonFlowPortalConfiguration,
  WonFlowResolvedFeatureFlags,
} from "./types";

/**
 * Portals included in the WonFlow Phase 1 default profile.
 *
 * Portal availability is controlled through resolved feature flags.
 * Navigation inside each portal is resolved separately using modules
 * and practice privileges.
 */
export const WONFLOW_PORTALS = [
  {
    code: "organization-admin",
    name: "Organization Administration",
    description: "Tenant-owned setup, locations, schedules, services, fees, team permissions, policies and content.",
    routePrefix: "/admin",
    routeGroup: "(organization-admin)",
    featureFlag: "organizationAdministration",
    intendedUsers: ["Organization Owner", "Authorized Administrator"],
    patientFacing: false,
    staffFacing: true,
    administrationFacing: true,
  },
  {
    code: "practice-doctor",

    name: "Practice Portal",

    description:
      "Independent-practice scheduling, patients, consultations, documents, messaging, payments and team administration.",

    routePrefix: "/doctor",

    routeGroup:
      "(doctor-workspace)",

    featureFlag:
      "doctorWorkspace",

    intendedUsers: [
      "Practice Owner",
      "Consultant",
      "Senior Registrar",
      "Resident",
      "House Surgeon",
      "Clinical Dietitian",
      "Coordinator",
    ],

    patientFacing: false,
    staffFacing: true,
    administrationFacing: false,
  },
  {
    code: "reception",

    name: "Reception Portal",

    description:
      "Patient search, registration, visit routing, services, live queue, counter payments and printing.",

    routePrefix: "/operations/reception",

    routeGroup:
      "(hospital-operations)",

    featureFlag:
      "hospitalOperations",

    intendedUsers: [
      "Receptionist",
      "Front Desk Coordinator",
      "Cashier",
    ],

    patientFacing: false,
    staffFacing: true,
    administrationFacing: false,
  },
  {
    code: "patient-portal",

    name: "Patient Portal",

    description:
      "Patient and representative access to appointments, documents, consent, payments and practice messaging.",

    routePrefix: "/patient",

    routeGroup:
      "(patient-access)",

    featureFlag:
      "patient-portal",

    intendedUsers: [
      "Patient",
      "Parent",
      "Guardian",
      "Spouse",
      "Authorized Representative",
    ],

    patientFacing: true,
    staffFacing: false,
    administrationFacing: false,
  },
  {
    code: "platform-admin",

    name: "WonFlow Platform Administration",

    description:
      "Tenant provisioning, subscriptions, module entitlements, support access and platform governance.",

    routePrefix: "/platform",

    routeGroup:
      "(platform-admin)",

    featureFlag:
      "platformAdministration",

    intendedUsers: [
      "Platform Super Admin",
      "Platform Support",
      "Platform Security",
    ],

    patientFacing: false,
    staffFacing: false,
    administrationFacing: true,
  },
] as const satisfies readonly WonFlowPortalConfiguration[];

/**
 * Finds one configured Phase 1 portal.
 */
export function getWonFlowPortal(
  code: WonFlowPortalCode,
): WonFlowPortalConfiguration {
  const portal =
    WONFLOW_PORTALS.find(
      (
        candidate:
          WonFlowPortalConfiguration,
      ) => candidate.code === code,
    );

  if (portal === undefined) {
    throw new Error(
      `Unknown WonFlow portal: ${code}`,
    );
  }

  return portal;
}

/**
 * Compatibility name retained for existing configuration consumers.
 */
export const getPortalDefinition =
  getWonFlowPortal;

/**
 * Returns portals whose top-level feature flag is enabled.
 */
export function getEnabledWonFlowPortals(
  flags: WonFlowResolvedFeatureFlags,
): WonFlowPortalConfiguration[] {
  return WONFLOW_PORTALS.filter(
    (
      portal:
        WonFlowPortalConfiguration,
    ) => flags[portal.featureFlag],
  );
}
