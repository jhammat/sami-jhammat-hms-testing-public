import type {
  IsoDateTime,
  ModuleCode,
  PermissionCode,
  PracticePrivilege,
  TenantTerminology,
  WonFlowId,
} from "@wonflow/contracts";

import {
  getWonFlowProfileModuleAvailability,
  resolveWonFlowModuleScopedItems,
  type WonFlowModuleAvailability,
} from "../feature-flags";

import {
  getWonFlowPortal,
} from "../portals";

import type {
  WonFlowFeatureFlagKey,
  WonFlowPortalCode,
  WonFlowResolvedFeatureFlags,
} from "../types";

export type RouteAreaCode =
  | "access"
  | "platform"
  | "organization"
  | "operations"
  | "doctor"
  | "management"
  | "patient";

export type RouteGroupFolder =
  | "(access)"
  | "(platform-admin)"
  | "(organization-admin)"
  | "(hospital-operations)"
  | "(doctor-workspace)"
  | "(management)"
  | "(patient-access)";

export interface RouteDefinition {
  code: string;

  area: RouteAreaCode;

  label: string;

  path: string;

  requiredModule?: ModuleCode;

  requiredPermission?: PermissionCode;

  dynamic: boolean;
}

export const ROUTE_GROUP_FOLDERS = {
  access: "(access)",
  platform: "(platform-admin)",
  organization:
    "(organization-admin)",
  operations:
    "(hospital-operations)",
  doctor: "(doctor-workspace)",
  management: "(management)",
  patient: "(patient-access)",
} as const satisfies Record<
  RouteAreaCode,
  RouteGroupFolder
>;

/**
 * One link displayed inside a portal navigation group.
 */
export interface WonFlowNavigationItem {
  code: string;

  label: string;

  path: string;

  requiredModule?: ModuleCode;

  /**
   * Every listed feature must be enabled.
   */
  requiredFeatureFlags?:
    readonly WonFlowFeatureFlagKey[];

  /**
   * At least one listed feature must be enabled.
   */
  requiredAnyFeatureFlags?:
    readonly WonFlowFeatureFlagKey[];

  /**
   * Practice staff must hold this privilege.
   *
   * Patient and platform navigation entries normally omit it.
   */
  requiredPrivilege?:
    PracticePrivilege;
}

export interface WonFlowNavigationGroup {
  code: string;

  label: string;

  items:
    readonly WonFlowNavigationItem[];
}

export interface WonFlowPortalNavigationTree {
  portalCode: WonFlowPortalCode;

  groups:
    readonly WonFlowNavigationGroup[];
}

/**
 * Tenant terminology supplied while resolving portal navigation.
 *
 * Navigation remains usable without this context by falling back to
 * generic WonFlow labels. When supplied, only terminology belonging to
 * the requested organization, language and effective time is used.
 */
export interface WonFlowNavigationTerminologyContext {
  organizationId: WonFlowId;

  languageCode: string;

  at: IsoDateTime;

  terminology:
    readonly TenantTerminology[];
}

/**
 * Returns the stable terminology key for a navigation group.
 */
export function getWonFlowNavigationGroupTermKey(
  groupCode: string,
): string {
  return `navigation.group.${groupCode}`;
}

/**
 * Returns the stable terminology key for a navigation item.
 */
export function getWonFlowNavigationItemTermKey(
  itemCode: string,
): string {
  return `navigation.item.${itemCode}`;
}

export const ROUTES = {
  home: "/",

  auth: {
    login: "/auth/login",
    otp: "/auth/otp",
    recovery: "/auth/recovery",
    invitation: "/auth/invitation",
  },

  platform: {
    home: "/platform",
    organizations: "/platform/organizations",
    plans: "/platform/plans",
    modules: "/platform/modules",
    administrators: "/platform/administrators",
    support: "/platform/support",
    audit: "/platform/audit",
    health: "/platform/health",
    incidents: "/platform/incidents",
    settings: "/platform/settings",
  },

  organization: {
    home: "/admin",
    branches: "/admin/branches",
    departments: "/admin/departments",
    facilities: "/admin/facilities",
    workforce: "/admin/workforce",
    doctors: "/admin/doctors",
    roles: "/admin/roles",
    permissions: "/admin/permissions",
    modules: "/admin/modules",
    services: "/admin/services",
    masterData: "/admin/master-data",
    templates: "/admin/templates",
    policies: "/admin/policies",
    settings: "/admin/settings",
  },

  operations: {
    home: "/operations",
    patients: "/operations/patients",
    patientRegistration:
      "/operations/patients/register",
    appointments: "/operations/appointments",
    checkIn: "/operations/check-in",
    queue: "/operations/queue",
    referrals: "/operations/referrals",
    laboratory: "/operations/laboratory",
    radiology: "/operations/radiology",
    pharmacy: "/operations/pharmacy",
    billing: "/operations/billing",
    insurance: "/operations/insurance",
    inventory: "/operations/inventory",
    admissions: "/operations/admissions",
    wards: "/operations/wards",
    operationTheatre:
      "/operations/operation-theatre",
  },

  doctor: {
    home: "/doctor",

    setup: "/doctor/setup",

    schedule: "/doctor/schedule",

    patients: "/doctor/patients",

    appointments:
      "/doctor/appointments",

    documents: "/doctor/documents",

    consultations:
      "/doctor/consultations",

    messages: "/doctor/messages",

    countersignatures: "/doctor/countersignatures",

    locations: "/doctor/locations",

    services: "/doctor/services",

    team: "/doctor/team",

    policies:
      "/doctor/policies",

    payments: "/doctor/payments",

    audit: "/doctor/audit",

    inpatients: "/doctor/inpatients",

    /**
     * Compatibility alias for existing consumers.
     */
    admittedPatients:
      "/doctor/inpatients",

    tasks: "/doctor/tasks",

    reports: "/doctor/reports",

    referrals: "/doctor/referrals",
  },

  management: {
    home: "/management",
    branches: "/management/branches",
    departments: "/management/departments",
    doctors: "/management/doctors",
    appointments: "/management/appointments",
    patientFlow: "/management/patient-flow",
    laboratory: "/management/laboratory",
    radiology: "/management/radiology",
    pharmacy: "/management/pharmacy",
    finance: "/management/finance",
    insurance: "/management/insurance",
    inpatient: "/management/inpatient",
    quality: "/management/quality",
    audit: "/management/audit",
    exports: "/management/exports",
  },

  patient: {
    home: "/patient",

    doctors: "/patient/doctors",

    appointments:
      "/patient/appointments",

    documents: "/patient/documents",

    queue: "/patient/queue",

    consultations:
      "/patient/consultations",

    prescriptions:
      "/patient/prescriptions",

    laboratory:
      "/patient/results/laboratory",

    radiology:
      "/patient/results/radiology",

    bills: "/patient/bills",

    messages: "/patient/messages",

    family: "/patient/family",

    profile: "/patient/profile",

    notifications:
      "/patient/notifications",
  },
} as const;

/**
 * Phase 1 portal navigation.
 *
 * Practice navigation uses PracticePrivilege values rather than role
 * names. Member-level privilege overrides therefore affect navigation
 * without introducing role-specific UI conditions.
 */
export const WONFLOW_PORTAL_NAVIGATION_TREES = [
  {
    portalCode: "organization-admin",
    groups: [
      {
        code: "organization-setup",
        label: "Organization",
        items: [
          { code: "organization.setup", label: "Setup", path: "/admin/setup", requiredModule: "ORGANIZATION", requiredPrivilege: "team.manage" },
          { code: "organization.locations", label: "Locations and schedules", path: "/admin/locations", requiredModule: "ORGANIZATION", requiredPrivilege: "locations.manage" },
          { code: "organization.services", label: "Services and fees", path: "/admin/services", requiredModule: "SERVICES", requiredPrivilege: "catalogue.manage" },
          { code: "organization.team", label: "Team and permissions", path: "/admin/team", requiredModule: "ACCESS", requiredPrivilege: "team.manage" },
          { code: "organization.policies", label: "Policies", path: "/admin/policies", requiredModule: "ORGANIZATION", requiredPrivilege: "team.manage" },
          { code: "organization.content", label: "Content and templates", path: "/admin/content", requiredModule: "DOCUMENTS", requiredPrivilege: "team.manage" },
          { code: "organization.audit", label: "Organization audit", path: "/admin/audit", requiredModule: "AUDIT", requiredPrivilege: "audit.view" },
        ],
      },
    ],
  },
  {
    portalCode: "reception",
    groups: [
      {
        code: "reception",
        label: "Reception",
        items: [
          {
            code: "reception.desk",
            label: "Reception Desk",
            path: "/operations/reception",
            requiredModule: "RECEPTION_DESK",
          },
        ],
      },
    ],
  },
  {
    portalCode:
      "practice-doctor",

    groups: [
      {
        code: "workspace",

        label: "Workspace",

        items: [
          {
            code:
              "practice.dashboard",

            label: "Dashboard",

            path:
              ROUTES.doctor.home,

            requiredModule:
              "CLINICAL",

            requiredPrivilege:
              "dashboard.view",
          },
          {
            code:
              "practice.schedule",

            label: "Schedule",

            path:
              ROUTES.doctor.schedule,

            requiredModule:
              "SCHEDULING",

            requiredFeatureFlags: [
              "practice-booking",
            ],

            requiredPrivilege:
              "schedule.view",
          },
          {
            code:
              "practice.patients",

            label: "Patients",

            path:
              ROUTES.doctor.patients,

            requiredModule:
              "PATIENTS",

            requiredPrivilege:
              "patients.view",
          },
          {
            code:
              "practice.appointments",

            label: "Appointments",

            path:
              ROUTES.doctor
                .appointments,

            requiredModule:
              "APPOINTMENTS",

            requiredFeatureFlags: [
              "practice-booking",
            ],

            requiredPrivilege:
              "appointments.view",
          },
        ],
      },
      {
        code: "patient-care",

        label: "Patient Care",

        items: [
          {
            code:
              "practice.documents",

            label: "Document review",

            path:
              ROUTES.doctor.documents,

            requiredModule:
              "DOCUMENTS",

            requiredFeatureFlags: [
              "practice-documents",
            ],

            requiredPrivilege:
              "documents.review",
          },
          {
            code: "practice.countersignatures",
            label: "Countersignatures",
            path: ROUTES.doctor.countersignatures,
            requiredModule: "DOCUMENTS",
            requiredFeatureFlags: ["practice-documents"],
            requiredPrivilege: "consultations.countersign",
          },
          {
            code:
              "practice.consultations",

            label: "Consultations",

            path:
              ROUTES.doctor
                .consultations,

            requiredModule:
              "CLINICAL",

            requiredPrivilege:
              "consultations.view",
          },
          {
            code:
              "practice.messages",

            label: "Messages",

            path:
              ROUTES.doctor.messages,

            requiredModule:
              "MESSAGING",

            requiredFeatureFlags: [
              "practice-messaging",
            ],

            requiredPrivilege:
              "messages.view",
          },
        ],
      },
      {
        code:
          "practice-management",

        label:
          "Practice Management",

        items: [
          {
            code:
              "practice.locations",

            label: "Locations",

            path:
              ROUTES.doctor.locations,

            requiredModule:
              "ORGANIZATION",

            requiredPrivilege:
              "locations.manage",
          },
          {
            code:
              "practice.catalogue",

            label:
              "Service Catalogue",

            path:
              ROUTES.doctor.services,

            requiredModule:
              "SERVICES",

            requiredFeatureFlags: [
              "practice-booking",
            ],

            requiredPrivilege:
              "catalogue.manage",
          },
          {
            code:
              "practice.team",

            label:
              "Team & Permissions",

            path:
              ROUTES.doctor.team,

            requiredModule:
              "ACCESS",

            requiredFeatureFlags: [
              "practice-team-management",
            ],

            requiredPrivilege:
              "team.manage",
          },
          {
            code:
              "practice.policies",

            label:
              "Policies & Content",

            path:
              ROUTES.doctor.policies,

            requiredModule:
              "ORGANIZATION",

            /**
             * Coarse navigation visibility only.
             *
             * The service performs the exact organization-owner authorization.
             */
            requiredPrivilege:
              "team.manage",
          },
          {
            code:
              "practice.payments",

            label: "Payments",

            path:
              ROUTES.doctor.payments,

            requiredModule:
              "BILLING",

            requiredAnyFeatureFlags: [
              "practice-payments-online",
              "practice-payments-offline",
            ],

            requiredPrivilege:
              "payments.view",
          },
          {
            code:
              "practice.audit",

            label: "Audit",

            path:
              ROUTES.doctor.audit,

            requiredModule:
              "AUDIT",

            requiredPrivilege:
              "audit.view",
          },
        ],
      },
    ],
  },
  {
    portalCode:
      "patient-portal",

    groups: [
      {
        code: "patient-care",

        label: "My Care",

        items: [
          {
            code:
              "patient.home",

            label: "Home",

            path:
              ROUTES.patient.home,

            requiredModule:
              "PATIENT_ACCESS",
          },
          {
            code:
              "patient.appointments",

            label: "Appointments",

            path:
              ROUTES.patient
                .appointments,

            requiredModule:
              "APPOINTMENTS",

            requiredFeatureFlags: [
              "patient-portal",
              "practice-booking",
            ],
          },
          {
            code:
              "patient.documents",

            label: "Documents",

            path:
              ROUTES.patient.documents,

            requiredModule:
              "DOCUMENTS",

            requiredFeatureFlags: [
              "patient-portal",
              "practice-documents",
            ],
          },
          {
            code:
              "patient.messages",

            label: "Messages",

            path:
              ROUTES.patient.messages,

            requiredModule:
              "MESSAGING",

            requiredFeatureFlags: [
              "patient-portal",
              "practice-messaging",
            ],
          },
          {
            code:
              "patient.payments",

            label:
              "Payments & Receipts",

            path:
              ROUTES.patient.bills,

            requiredModule:
              "BILLING",

            requiredFeatureFlags: [
              "patient-portal",
            ],

            requiredAnyFeatureFlags: [
              "practice-payments-online",
              "practice-payments-offline",
            ],
          },
        ],
      },
      {
        code: "patient-account",

        label: "Account",

        items: [
          {
            code:
              "patient.family",

            label:
              "Family & Guardians",

            path:
              ROUTES.patient.family,

            requiredModule:
              "PATIENT_ACCESS",

            requiredFeatureFlags: [
              "patient-portal",
            ],
          },
          {
            code:
              "patient.profile",

            label:
              "Profile & Consent",

            path:
              ROUTES.patient.profile,

            requiredModule:
              "PATIENT_ACCESS",

            requiredFeatureFlags: [
              "patient-portal",
            ],
          },
        ],
      },
    ],
  },
  {
    portalCode:
      "platform-admin",

    groups: [
      {
        code:
          "platform-control",

        label:
          "Platform Control",

        items: [
          {
            code:
              "platform.dashboard",

            label: "Dashboard",

            path:
              ROUTES.platform.home,

            requiredModule:
              "PLATFORM",
          },
          {
            code:
              "platform.organizations",

            label:
              "Organizations",

            path:
              ROUTES.platform
                .organizations,

            requiredModule:
              "ORGANIZATION",
          },
          {
            code:
              "platform.plans",

            label:
              "Subscriptions",

            path:
              ROUTES.platform.plans,

            requiredModule:
              "PLATFORM",
          },
          {
            code:
              "platform.modules",

            label:
              "Module Entitlements",

            path:
              ROUTES.platform.modules,

            requiredModule:
              "PLATFORM",
          },
          {
            code:
              "platform.support",

            label:
              "Support Access",

            path:
              ROUTES.platform.support,

            requiredModule:
              "ACCESS",
          },
          {
            code:
              "platform.audit",

            label:
              "Platform Audit",

            path:
              ROUTES.platform.audit,

            requiredModule:
              "AUDIT",
          },
        ],
      },
    ],
  },
] as const satisfies readonly WonFlowPortalNavigationTree[];

function encodeRouteValue(value: string): string {
  return encodeURIComponent(value);
}

export const routeBuilders = {
  platformOrganization:
    (organizationId: string) =>
      `${ROUTES.platform.organizations}/${encodeRouteValue(
        organizationId,
      )}`,

  branch:
    (branchId: string) =>
      `${ROUTES.organization.branches}/${encodeRouteValue(
        branchId,
      )}`,

  department:
    (departmentId: string) =>
      `${ROUTES.organization.departments}/${encodeRouteValue(
        departmentId,
      )}`,

  service:
    (serviceId: string) =>
      `${ROUTES.organization.services}/${encodeRouteValue(
        serviceId,
      )}`,

  operationsPatient:
    (patientId: string) =>
      `${ROUTES.operations.patients}/${encodeRouteValue(
        patientId,
      )}`,

  operationsAppointment:
    (appointmentId: string) =>
      `${ROUTES.operations.appointments}/${encodeRouteValue(
        appointmentId,
      )}`,

  doctorPatient:
    (patientId: string) =>
      `${ROUTES.doctor.patients}/${encodeRouteValue(
        patientId,
      )}`,

  doctorConsultation:
    (encounterId: string) =>
      `/doctor/consultations/${encodeRouteValue(
        encounterId,
      )}`,

  patientDoctor:
    (doctorId: string) =>
      `${ROUTES.patient.doctors}/${encodeRouteValue(
        doctorId,
      )}`,

  patientAppointment:
    (appointmentId: string) =>
      `${ROUTES.patient.appointments}/${encodeRouteValue(
        appointmentId,
      )}`,

  patientBill:
    (invoiceId: string) =>
      `${ROUTES.patient.bills}/${encodeRouteValue(
        invoiceId,
      )}`,
} as const;

export const WONFLOW_ROUTE_DEFINITIONS = [
  {
    code: "platform.home",
    area: "platform",
    label: "Platform Dashboard",
    path: ROUTES.platform.home,
    requiredModule: "PLATFORM",
    requiredPermission: "platform.read",
    dynamic: false,
  },
  {
    code: "platform.organizations",

    area:
      "platform",

    label:
      "Tenant Organizations",

    path:
      ROUTES.platform.organizations,

    requiredModule:
      "ORGANIZATION",

    requiredPermission:
      "organization.read",

    dynamic:
      false,
  },
  {
    code: "organization.home",
    area: "organization",
    label: "Organization Dashboard",
    path: ROUTES.organization.home,
    requiredModule: "ORGANIZATION",
    requiredPermission: "organization.read",
    dynamic: false,
  },
  {
    code: "operations.home",
    area: "operations",
    label: "Hospital Operations Dashboard",
    path: ROUTES.operations.home,
    requiredModule: "PATIENTS",
    requiredPermission: "patient.read",
    dynamic: false,
  },
  {
    code: "doctor.setup",
    area: "doctor",
    label: "Practice Setup",
    path: ROUTES.doctor.setup,
    requiredModule: "ORGANIZATION",
    dynamic: false,
  },
  {
    code: "doctor.locations",
    area: "doctor",
    label: "Practice Locations",
    path: ROUTES.doctor.locations,
    requiredModule: "ORGANIZATION",
    dynamic: false,
  },
  {
    code: "doctor.services",
    area: "doctor",
    label: "Service Catalogue",
    path: ROUTES.doctor.services,
    requiredModule: "SERVICES",
    dynamic: false,
  },
  {
    code: "doctor.team",
    area: "doctor",
    label: "Team & Permissions",
    path: ROUTES.doctor.team,
    requiredModule: "ACCESS",
    dynamic: false,
  },
  {
    code: "doctor.policies",
    area: "doctor",
    label: "Policies & Content",
    path: ROUTES.doctor.policies,
    requiredModule: "ORGANIZATION",
    dynamic: false,
  },
  {
    code: "doctor.home",
    area: "doctor",
    label: "Doctor Command Center",
    path: ROUTES.doctor.home,
    requiredModule: "CLINICAL",
    requiredPermission: "encounter.read",
    dynamic: false,
  },
  {
    code: "management.home",
    area: "management",
    label: "Management Dashboard",
    path: ROUTES.management.home,
    requiredModule: "REPORTING",
    requiredPermission: "report.read",
    dynamic: false,
  },
  {
    code: "patient.home",
    area: "patient",
    label: "Patient Home",
    path: ROUTES.patient.home,
    requiredModule: "PATIENT_ACCESS",
    requiredPermission: "patient-access.read",
    dynamic: false,
  },
  {
    code: "operations.patient-detail",
    area: "operations",
    label: "Patient Record",
    path: "/operations/patients/[patientId]",
    requiredModule: "PATIENTS",
    requiredPermission: "patient.read",
    dynamic: true,
  },
  {
    code: "doctor.patient-detail",
    area: "doctor",
    label: "Doctor Patient Workspace",
    path: "/doctor/patients/[patientId]",
    requiredModule: "CLINICAL",
    requiredPermission: "patient.read",
    dynamic: true,
  },
  {
    code: "doctor.consultation",
    area: "doctor",
    label: "Consultation Workspace",
    path: "/doctor/consultations/[encounterId]",
    requiredModule: "CLINICAL",
    requiredPermission: "encounter.update",
    dynamic: true,
  },
  {
    code: "patient.appointment-detail",
    area: "patient",
    label: "Patient Appointment",
    path: "/patient/appointments/[appointmentId]",
    requiredModule: "PATIENT_ACCESS",
    requiredPermission: "appointment.read",
    dynamic: true,
  },
  {
    code:
      "doctor.inpatients",

    area: "doctor",

    label:
      "Doctor Inpatients",

    path:
      ROUTES.doctor.inpatients,

    requiredModule: "WARD",

    dynamic: false,
  },
  {
    code:
      "doctor.inpatient-progress-note-print",

    area: "doctor",

    label:
      "Print Inpatient Progress Note",

    path:
      "/doctor/inpatients/[admissionId]/progress-note/print",

    requiredModule: "WARD",

    dynamic: true,
  },
] as const satisfies readonly RouteDefinition[];

/**
 * Returns only routes whose required modules are available.
 *
 * Provisioning and demo mode may use the default profile-derived
 * availability. Live tenant code supplies its resolved module codes.
 */
export function getEnabledWonFlowRouteDefinitions(
  availability:
    WonFlowModuleAvailability =
      getWonFlowProfileModuleAvailability(),
): RouteDefinition[] {
  return resolveWonFlowModuleScopedItems(
    WONFLOW_ROUTE_DEFINITIONS,
    availability,
  );
}

/**
 * Finds the navigation tree for one Phase 1 portal.
 */
export function getWonFlowPortalNavigationTree(
  portalCode: WonFlowPortalCode,
): WonFlowPortalNavigationTree {
  const tree =
    WONFLOW_PORTAL_NAVIGATION_TREES.find(
      (candidate) =>
        candidate.portalCode ===
        portalCode,
    );

  if (tree === undefined) {
    throw new Error(
      `Unknown WonFlow portal navigation: ${portalCode}`,
    );
  }

  return tree;
}

/**
 * Determines whether one terminology override may be used for the
 * current tenant, language and effective timestamp.
 */
function isWonFlowNavigationTerminologyEffective(
  terminology: TenantTerminology,
  context:
    WonFlowNavigationTerminologyContext,
): boolean {
  if (
    terminology.organizationId !==
    context.organizationId
  ) {
    return false;
  }

  if (
    terminology.languageCode !==
    context.languageCode
  ) {
    return false;
  }

  if (terminology.status !== "active") {
    return false;
  }

  if (
    terminology.effectiveFrom !==
      undefined &&
    terminology.effectiveFrom >
      context.at
  ) {
    return false;
  }

  if (
    terminology.effectiveTo !==
      undefined &&
    terminology.effectiveTo <
      context.at
  ) {
    return false;
  }

  return true;
}

/**
 * Resolves one navigation label from tenant terminology.
 *
 * shortLabel is preferred because navigation space is constrained.
 * singularLabel is used when no short label exists. The generic
 * WonFlow label remains the final fallback.
 */
function resolveWonFlowNavigationLabel(
  termKey: string,
  fallbackLabel: string,
  context?:
    WonFlowNavigationTerminologyContext,
): string {
  if (context === undefined) {
    return fallbackLabel;
  }

  const override =
    context.terminology.find(
      (terminology) =>
        terminology.termKey ===
          termKey &&
        isWonFlowNavigationTerminologyEffective(
          terminology,
          context,
        ),
    );

  if (override === undefined) {
    return fallbackLabel;
  }

  return (
    override.shortLabel ??
    override.singularLabel
  );
}

function areWonFlowNavigationFeaturesEnabled(
  item: WonFlowNavigationItem,
  flags: WonFlowResolvedFeatureFlags,
): boolean {
  if (
    item.requiredFeatureFlags !==
      undefined &&
    !item.requiredFeatureFlags.every(
      (featureFlag) =>
        flags[featureFlag],
    )
  ) {
    return false;
  }

  if (
    item.requiredAnyFeatureFlags !==
      undefined &&
    item.requiredAnyFeatureFlags
      .length > 0 &&
    !item.requiredAnyFeatureFlags.some(
      (featureFlag) =>
        flags[featureFlag],
    )
  ) {
    return false;
  }

  return true;
}

function hasWonFlowNavigationPrivilege(
  item: WonFlowNavigationItem,
  privileges:
    ReadonlySet<PracticePrivilege>,
): boolean {
  return (
    item.requiredPrivilege ===
      undefined ||
    privileges.has(
      item.requiredPrivilege,
    )
  );
}

/**
 * Resolves visible navigation from:
 *
 * - the portal's feature flag,
 * - tenant-resolved module availability,
 * - item-level feature flags,
 * - resolved PracticePrivilege values, and
 * - effective TenantTerminology overrides.
 *
 * Role names are deliberately not used. Generic labels remain as
 * fallbacks when a tenant has not configured an override.
 */
export function resolveWonFlowPortalNavigation(
  portalCode: WonFlowPortalCode,
  flags: WonFlowResolvedFeatureFlags,
  practicePrivileges:
    readonly PracticePrivilege[] = [],
  availability:
    WonFlowModuleAvailability =
      getWonFlowProfileModuleAvailability(),
  terminologyContext?:
    WonFlowNavigationTerminologyContext,
): WonFlowNavigationGroup[] {
  const portal =
    getWonFlowPortal(
      portalCode,
    );

  if (!flags[portal.featureFlag]) {
    return [];
  }

  const navigation =
    getWonFlowPortalNavigationTree(
      portalCode,
    );

  const privilegeSet =
    new Set<PracticePrivilege>(
      practicePrivileges,
    );

  return navigation.groups
    .map(
      (
        group,
      ): WonFlowNavigationGroup => {
        const visibleItems =
          resolveWonFlowModuleScopedItems(
            group.items,
            availability,
          )
            .filter(
              (item) =>
                areWonFlowNavigationFeaturesEnabled(
                  item,
                  flags,
                ) &&
                hasWonFlowNavigationPrivilege(
                  item,
                  privilegeSet,
                ),
            )
            .map(
              (
                item,
              ): WonFlowNavigationItem => ({
                ...item,

                label:
                  resolveWonFlowNavigationLabel(
                    getWonFlowNavigationItemTermKey(
                      item.code,
                    ),
                    item.label,
                    terminologyContext,
                  ),
              }),
            );

        return {
          code: group.code,

          label:
            resolveWonFlowNavigationLabel(
              getWonFlowNavigationGroupTermKey(
                group.code,
              ),
              group.label,
              terminologyContext,
            ),

          items: visibleItems,
        };
      },
    )
    .filter(
      (group) =>
        group.items.length > 0,
    );
}
