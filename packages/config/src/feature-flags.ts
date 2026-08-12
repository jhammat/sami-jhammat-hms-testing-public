import {
  WONFLOW_MODULES,
  type ModuleCode,
} from "@wonflow/contracts";

import type {
  WonFlowFeatureFlagDefinition,
  WonFlowFeatureFlagKey,
  WonFlowPublicEnvironment,
  WonFlowResolvedFeatureFlags,
} from "./types";

/**
 * Module codes derived directly from the WonFlow module registry.
 *
 * Profiles cannot reference a module code that is absent from
 * WONFLOW_MODULES.
 */
export type WonFlowRegisteredModuleCode =
  (typeof WONFLOW_MODULES)[number]["code"];

export const WONFLOW_PRACTICE_FEATURE_FLAGS = [
  "practice-booking",
  "practice-documents",
  "practice-messaging",
  "practice-payments-online",
  "practice-payments-offline",
  "practice-team-management",
  "patient-portal",
  "public-booking-page",
  "mobile-apps",
] as const satisfies readonly WonFlowFeatureFlagKey[];

export type WonFlowPracticeFeatureFlagKey =
  (typeof WONFLOW_PRACTICE_FEATURE_FLAGS)[number];

/**
 * A named deployment profile controls feature availability and
 * explicitly disabled modules.
 */
export interface WonFlowModuleProfile {
  code: string;

  name: string;

  description: string;

  enabledFeatureFlags:
    readonly WonFlowFeatureFlagKey[];

  /**
   * Module codes are derived from WONFLOW_MODULES, preventing profiles
   * from referencing unregistered module names.
   */
  disabledModuleCodes:
    readonly WonFlowRegisteredModuleCode[];
}

/**
 * Module availability supplied to route and navigation resolution.
 *
 * During new-tenant provisioning this may be derived from a default
 * profile. At runtime it must come from the tenant's resolved module
 * entitlements and OrganizationModuleActivation records.
 */
export interface WonFlowModuleAvailability {
  enabledModuleCodes:
    readonly ModuleCode[];
}

/**
 * Shared shape used by route definitions and navigation entries.
 */
export interface WonFlowModuleScopedItem {
  requiredModule?: ModuleCode;
}

/**
 * Default module profile for newly provisioned Phase 1 tenants.
 *
 * A tenant's effective availability is controlled by its organization
 * module entitlements and activations.
 *
 * WARD is the existing WonFlow registry code for inpatient care.
 *
 * The disabled codes below are the modules whose screens are parked in
 * `deferred/phase-two/`, plus REPORTING and DENTISTRY which have no
 * implementation yet. Everything absent from this list ships in Phase 1
 * and is covered by the end-to-end suite.
 */
export const WONFLOW_PHASE_ONE_PROFILE = {
  code: "wonflow-phase-one",

  name: "WonFlow Phase 1 default profile",

  description:
    "Practice booking, documents, messaging, payments, team management, patient access and mobile applications.",

  enabledFeatureFlags:
    WONFLOW_PRACTICE_FEATURE_FLAGS,

  disabledModuleCodes: [
    "WARD",
    "INSURANCE",
    "BLOOD_BANK",
    "QUEUE",
    "OPERATION_THEATRE",
    "CSSD",
    "REPORTING",
    "DENTISTRY",
  ],
} as const satisfies WonFlowModuleProfile;

export const WONFLOW_FEATURE_FLAG_DEFINITIONS = [
  {
    key: "platformAdministration",
    title: "Platform Administration",
    description:
      "Enables the WonFlow platform-super-admin interface.",
    productionCritical: true,
    publiclyVisible: true,
  },
  {
    key: "organizationAdministration",
    title: "Organization Administration",
    description:
      "Enables organization and hospital configuration.",
    productionCritical: true,
    publiclyVisible: true,
  },
  {
    key: "hospitalOperations",
    title: "Hospital Operations",
    description:
      "Enables reception, queues, diagnostics, pharmacy, wards and finance workspaces.",
    productionCritical: true,
    publiclyVisible: true,
  },
  {
    key: "doctorWorkspace",
    title: "Doctor Workspace",
    description:
      "Enables doctor consultation and clinical-care interfaces.",
    productionCritical: true,
    publiclyVisible: true,
  },
  {
    key: "managementPortal",
    title: "Management Portal",
    description:
      "Enables executive and operational reporting interfaces.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "patientAccess",
    title: "Patient Access",
    description:
      "Enables the patient-facing responsive interface.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "progressiveWebApp",
    title: "Progressive Web App",
    description:
      "Enables installable patient web-app capabilities.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "androidPackaging",
    title: "Android Packaging",
    description:
      "Represents Capacitor-based Android application packaging.",
    productionCritical: false,
    publiclyVisible: false,
  },
  {
    key: "demoData",
    title: "Fictional Demo Data",
    description:
      "Enables deterministic fictional demonstration records.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "backendApi",
    title: "Production API Mode",
    description:
      "Uses controlled backend APIs instead of local mock projections.",
    productionCritical: true,
    publiclyVisible: true,
  },
  {
    key: "realTimeUpdates",
    title: "Real-Time Updates",
    description:
      "Enables server-backed operational event updates.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "englishLocalization",
    title: "English Localization",
    description:
      "Enables English user-interface content.",
    productionCritical: true,
    publiclyVisible: true,
  },
  {
    key: "urduLocalization",
    title: "Urdu Localization",
    description:
      "Enables Urdu and right-to-left interface support.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "practice-booking",
    title: "Practice Booking",
    description:
      "Enables independent-practice services, generated slots and appointment booking.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "practice-documents",
    title: "Practice Documents",
    description:
      "Enables patient uploads, document review and controlled release.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "practice-messaging",
    title: "Practice Messaging",
    description:
      "Enables patient-to-practice messaging, triage and escalation.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "practice-payments-online",
    title: "Practice Online Payments",
    description:
      "Enables online practice payment intents and gateway settlement workflows.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "practice-payments-offline",
    title: "Practice Offline Payments",
    description:
      "Enables tenant-configured offline and external-facility payment recording.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "practice-team-management",
    title: "Practice Team Management",
    description:
      "Enables care-team membership, supervision and privilege management.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "patient-portal",
    title: "Patient Portal",
    description:
      "Enables patient accounts, appointments, documents, consent and messaging.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "public-booking-page",
    title: "Public Booking Page",
    description:
      "Enables the public appointment-booking entry page.",
    productionCritical: false,
    publiclyVisible: true,
  },
  {
    key: "mobile-apps",
    title: "Mobile Apps",
    description:
      "Enables patient and clinician mobile application experiences.",
    productionCritical: false,
    publiclyVisible: true,
  },
] as const satisfies readonly WonFlowFeatureFlagDefinition[];

/**
 * Checks whether a feature is enabled by a named profile.
 */
export function isWonFlowProfileFeatureEnabled(
  profile: WonFlowModuleProfile,
  key: WonFlowFeatureFlagKey,
): boolean {
  return profile.enabledFeatureFlags.some(
    (enabledKey) =>
      enabledKey === key,
  );
}

/**
 * Checks whether a registered module is enabled by a profile.
 */
export function isWonFlowModuleEnabledInProfile(
  moduleCode: ModuleCode,
  profile:
    WonFlowModuleProfile =
      WONFLOW_PHASE_ONE_PROFILE,
): boolean {
  return !profile.disabledModuleCodes.some(
    (disabledCode) =>
      disabledCode === moduleCode,
  );
}

/**
 * Returns all registry modules that remain enabled by a profile.
 */
export function getEnabledWonFlowModuleCodes(
  profile:
    WonFlowModuleProfile =
      WONFLOW_PHASE_ONE_PROFILE,
): WonFlowRegisteredModuleCode[] {
  return WONFLOW_MODULES
    .filter(
      (module) =>
        isWonFlowModuleEnabledInProfile(
          module.code,
          profile,
        ),
    )
    .map(
      (module) =>
        module.code,
    );
}

/**
 * Builds module availability from a provisioning profile.
 *
 * Production runtime code should instead provide enabled module codes
 * from the tenant's resolved entitlements and activations.
 */
export function getWonFlowProfileModuleAvailability(
  profile:
    WonFlowModuleProfile =
      WONFLOW_PHASE_ONE_PROFILE,
): WonFlowModuleAvailability {
  return {
    enabledModuleCodes:
      getEnabledWonFlowModuleCodes(
        profile,
      ),
  };
}

/**
 * Checks module availability supplied by the tenant-resolution layer.
 */
export function isWonFlowModuleAvailable(
  moduleCode: ModuleCode,
  availability:
    WonFlowModuleAvailability,
): boolean {
  return availability
    .enabledModuleCodes
    .some(
      (enabledModuleCode) =>
        enabledModuleCode ===
        moduleCode,
    );
}

/**
 * Removes routes or navigation entries whose required module is not
 * available to the tenant.
 *
 * The default availability is used for provisioning and demo mode.
 * Live callers must pass tenant-resolved enabled module codes.
 */
export function resolveWonFlowModuleScopedItems<
  T extends WonFlowModuleScopedItem,
>(
  items: readonly T[],
  availability:
    WonFlowModuleAvailability =
      getWonFlowProfileModuleAvailability(),
): T[] {
  return items.filter(
    (item) =>
      item.requiredModule ===
        undefined ||
      isWonFlowModuleAvailable(
        item.requiredModule,
        availability,
      ),
  );
}

export function resolveWonFlowFeatureFlags(
  environment:
    WonFlowPublicEnvironment,
): WonFlowResolvedFeatureFlags {
  const apiMode =
    environment
      .NEXT_PUBLIC_WONFLOW_DATA_MODE ===
    "api";

  const patientAccess =
    environment
      .NEXT_PUBLIC_WONFLOW_ENABLE_PATIENT_ACCESS;

  const demoData =
    environment
      .NEXT_PUBLIC_WONFLOW_ENABLE_DEMO &&
    environment
      .NEXT_PUBLIC_WONFLOW_DATA_MODE ===
      "mock";

  return {
    platformAdministration: true,
    organizationAdministration: true,
    hospitalOperations: true,
    doctorWorkspace: true,
    managementPortal: false,

    patientAccess,

    progressiveWebApp:
      patientAccess,

    /**
     * Android packaging is enabled later,
     * after the responsive patient experience
     * is approved.
     */
    androidPackaging: false,

    demoData,

    backendApi: apiMode,

    /**
     * Real-time server events require
     * production API mode.
     */
    realTimeUpdates: apiMode,

    englishLocalization: true,
    urduLocalization: true,

    "practice-booking":
      isWonFlowProfileFeatureEnabled(
        WONFLOW_PHASE_ONE_PROFILE,
        "practice-booking",
      ),

    "practice-documents":
      isWonFlowProfileFeatureEnabled(
        WONFLOW_PHASE_ONE_PROFILE,
        "practice-documents",
      ),

    "practice-messaging":
      isWonFlowProfileFeatureEnabled(
        WONFLOW_PHASE_ONE_PROFILE,
        "practice-messaging",
      ),

    "practice-payments-online":
      isWonFlowProfileFeatureEnabled(
        WONFLOW_PHASE_ONE_PROFILE,
        "practice-payments-online",
      ),

    "practice-payments-offline":
      isWonFlowProfileFeatureEnabled(
        WONFLOW_PHASE_ONE_PROFILE,
        "practice-payments-offline",
      ),

    "practice-team-management":
      isWonFlowProfileFeatureEnabled(
        WONFLOW_PHASE_ONE_PROFILE,
        "practice-team-management",
      ),

    "patient-portal":
      isWonFlowProfileFeatureEnabled(
        WONFLOW_PHASE_ONE_PROFILE,
        "patient-portal",
      ),

    "public-booking-page":
      isWonFlowProfileFeatureEnabled(
        WONFLOW_PHASE_ONE_PROFILE,
        "public-booking-page",
      ),

    "mobile-apps":
      isWonFlowProfileFeatureEnabled(
        WONFLOW_PHASE_ONE_PROFILE,
        "mobile-apps",
      ),
  };
}

export function isWonFlowFeatureEnabled(
  flags: WonFlowResolvedFeatureFlags,
  key: keyof WonFlowResolvedFeatureFlags,
): boolean {
  return flags[key];
}
