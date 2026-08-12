import type {
  IsoDateTime,
  WonFlowId,
} from "../organization/hierarchy";

export type ModuleCode =
  | "PLATFORM"
  | "ORGANIZATION"
  | "ACCESS"
  | "MASTER_DATA"
  | "DOCUMENTS"
  | "NOTIFICATIONS"
  | "AUDIT"
  | "SERVICES"
  | "WORKFORCE"
  | "SCHEDULING"
  | "PATIENTS"
  | "APPOINTMENTS"
  | "RECEPTION_DESK"
  | "QUEUE"
  | "CLINICAL"
  | "LABORATORY"
  | "BLOOD_BANK"
  | "RADIOLOGY"
  | "INVENTORY"
  | "PHARMACY"
  | "BILLING"
  | "BILLING_COUNTER"
  | "INSURANCE"
  | "WARD"
  | "OPERATION_THEATRE"
  | "CSSD"
  | "TELEMEDICINE"
  | "MESSAGING"
  | "REPORTING"
  | "PATIENT_ACCESS"
  | "DENTISTRY";

export type ModuleCategory =
  | "platform"
  | "administration"
  | "foundation"
  | "operations"
  | "clinical"
  | "diagnostics"
  | "finance"
  | "inpatient"
  | "communication"
  | "analytics"
  | "patient"
  | "specialty";

export type ModuleScopeLevel =
  | "platform"
  | "organization"
  | "branch"
  | "department";

export type ModuleLifecycleStatus =
  | "draft"
  | "active"
  | "deprecated"
  | "retired";

export type ModuleActivationStatus =
  | "disabled"
  | "pending-configuration"
  | "enabled"
  | "suspended";

export type ModuleOverrideValue =
  | "inherit"
  | "enabled"
  | "disabled";

export type ModuleDependencyKind =
  | "required"
  | "recommended"
  | "optional"
  | "conflicts-with";

export type ModuleConfigurationValue =
  | string
  | number
  | boolean
  | null
  | ModuleConfigurationValue[]
  | {
      [key: string]: ModuleConfigurationValue;
    };

export interface ModuleDefinition {
  code: ModuleCode;
  name: string;
  description: string;
  category: ModuleCategory;

  /**
   * Core modules cannot normally be disabled because the platform
   * requires them for safe operation.
   */
  isCore: boolean;

  defaultEnabled: boolean;

  organizationConfigurable: boolean;
  branchConfigurable: boolean;
  departmentConfigurable: boolean;

  patientFacing: boolean;
  staffFacing: boolean;

  /**
   * Indicates that the organization must possess a valid commercial,
   * contractual or deployment entitlement.
   */
  entitlementRequired: boolean;

  supportedScopes: readonly ModuleScopeLevel[];

  lifecycleStatus: ModuleLifecycleStatus;
  sortOrder: number;
}

export interface ModuleDependency {
  moduleCode: ModuleCode;
  dependsOnModuleCode: ModuleCode;
  kind: ModuleDependencyKind;
  reason: string;

  /**
   * Optional feature-level condition.
   *
   * Example:
   * Telemedicine may recommend Patient Access only when patients join
   * consultations through the WonFlow mobile experience.
   */
  requiredForFeatureCode?: string;
}

export interface ModuleEntitlement {
  id: WonFlowId;

  organizationId: WonFlowId;
  moduleCode: ModuleCode;

  entitlementCode?: string;

  status:
    | "active"
    | "expired"
    | "suspended"
    | "revoked";

  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;

  grantedByUserId?: WonFlowId;
  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface OrganizationModuleActivation {
  id: WonFlowId;

  organizationId: WonFlowId;
  moduleCode: ModuleCode;

  status: ModuleActivationStatus;

  enabledAt?: IsoDateTime;
  enabledByUserId?: WonFlowId;

  disabledAt?: IsoDateTime;
  disabledByUserId?: WonFlowId;
  disabledReason?: string;

  suspendedAt?: IsoDateTime;
  suspendedByUserId?: WonFlowId;
  suspendedReason?: string;

  configurationCompletedAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BranchModuleOverride {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;
  moduleCode: ModuleCode;

  value: ModuleOverrideValue;

  reason?: string;

  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;

  changedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DepartmentModuleOverride {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;
  branchDepartmentId: WonFlowId;
  moduleCode: ModuleCode;

  value: ModuleOverrideValue;

  reason?: string;

  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;

  changedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ModuleFeatureFlag {
  id: WonFlowId;

  organizationId: WonFlowId;
  moduleCode: ModuleCode;

  featureCode: string;
  name: string;
  description?: string;

  enabled: boolean;

  branchId?: WonFlowId;
  branchDepartmentId?: WonFlowId;

  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;

  changedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ModuleConfiguration {
  id: WonFlowId;

  organizationId: WonFlowId;
  moduleCode: ModuleCode;

  branchId?: WonFlowId;
  branchDepartmentId?: WonFlowId;

  key: string;
  value: ModuleConfigurationValue;

  /**
   * Sensitive configuration is never returned to normal browser clients.
   */
  isSensitive: boolean;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ModuleResolutionContext {
  organizationId: WonFlowId;
  branchId?: WonFlowId;
  branchDepartmentId?: WonFlowId;

  entitledModuleCodes: readonly ModuleCode[];
  organizationActivations: readonly OrganizationModuleActivation[];
  branchOverrides: readonly BranchModuleOverride[];
  departmentOverrides: readonly DepartmentModuleOverride[];
  featureFlags: readonly ModuleFeatureFlag[];

  occurredAt: IsoDateTime;
}

export interface ModuleResolutionReason {
  moduleCode: ModuleCode;

  type:
    | "core-module"
    | "organization-enabled"
    | "organization-disabled"
    | "pending-configuration"
    | "suspended"
    | "missing-entitlement"
    | "branch-enabled"
    | "branch-disabled"
    | "department-enabled"
    | "department-disabled"
    | "missing-required-dependency"
    | "conflicting-module";

  message: string;
}

export interface ModuleResolutionResult {
  enabledModuleCodes: ModuleCode[];
  disabledModuleCodes: ModuleCode[];
  reasons: ModuleResolutionReason[];

  resolvedAt: IsoDateTime;
}

export interface ModuleRegistry {
  modules: readonly ModuleDefinition[];
  dependencies: readonly ModuleDependency[];
}

export const WONFLOW_MODULES = [
  {
    code: "PLATFORM",
    name: "WonFlow Platform",
    description:
      "Platform-level organization, entitlement, support and health management.",
    category: "platform",
    isCore: true,
    defaultEnabled: true,
    organizationConfigurable: false,
    branchConfigurable: false,
    departmentConfigurable: false,
    patientFacing: false,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["platform"],
    lifecycleStatus: "active",
    sortOrder: 10,
  },
  {
    code: "ORGANIZATION",
    name: "Organization Administration",
    description:
      "Organizations, branches, departments, facilities and configuration.",
    category: "administration",
    isCore: true,
    defaultEnabled: true,
    organizationConfigurable: false,
    branchConfigurable: false,
    departmentConfigurable: false,
    patientFacing: false,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 20,
  },
  {
    code: "ACCESS",
    name: "Identity and Access",
    description:
      "Users, roles, permissions, assignments, sessions and access policies.",
    category: "foundation",
    isCore: true,
    defaultEnabled: true,
    organizationConfigurable: false,
    branchConfigurable: false,
    departmentConfigurable: false,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 30,
  },
  {
    code: "MASTER_DATA",
    name: "Master Data",
    description:
      "Controlled reusable reference values, classifications and option lists.",
    category: "foundation",
    isCore: true,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: false,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 40,
  },
  {
    code: "DOCUMENTS",
    name: "Documents and Files",
    description:
      "Secure patient, staff, clinical, operational and financial documents.",
    category: "foundation",
    isCore: true,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 50,
  },
  {
    code: "NOTIFICATIONS",
    name: "Notifications",
    description:
      "Email, SMS, push, in-application notifications and reminders.",
    category: "communication",
    isCore: true,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 60,
  },
  {
    code: "AUDIT",
    name: "Audit and Activity",
    description:
      "Security, configuration, clinical, financial and operational audit trails.",
    category: "foundation",
    isCore: true,
    defaultEnabled: true,
    organizationConfigurable: false,
    branchConfigurable: false,
    departmentConfigurable: false,
    patientFacing: false,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization"],
    lifecycleStatus: "active",
    sortOrder: 70,
  },
  {
    code: "SERVICES",
    name: "Service Catalogue",
    description:
      "Configurable hospital services, prices, workflows and dynamic forms.",
    category: "foundation",
    isCore: true,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 80,
  },
  {
    code: "WORKFORCE",
    name: "Workforce",
    description:
      "Employees, doctors, credentials, assignments and workforce records.",
    category: "administration",
    isCore: false,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: false,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 90,
  },
  {
    code: "SCHEDULING",
    name: "Doctor Scheduling",
    description:
      "Availability, sessions, leave, resources, capacity and slot generation.",
    category: "operations",
    isCore: false,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 100,
  },
  {
    code: "PATIENTS",
    name: "Patient Management",
    description:
      "Organization-wide patient identity, registration and patient records.",
    category: "operations",
    isCore: true,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: false,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch"],
    lifecycleStatus: "active",
    sortOrder: 110,
  },
  {
    code: "APPOINTMENTS",
    name: "Appointments",
    description:
      "Staff, walk-in, referral and patient online appointment booking.",
    category: "operations",
    isCore: false,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 120,
  },
  {
    code: "RECEPTION_DESK",
    name: "Reception Desk",
    description:
      "Front-desk patient registration, appointment handling, arrivals and reception workflows.",
    category: "operations",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: false,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: [
      "organization",
      "branch",
      "department",
    ],
    lifecycleStatus: "active",
    sortOrder: 125,
  },
  {
    code: "QUEUE",
    name: "Queue and Patient Flow",
    description:
      "Check-in, tokens, waiting areas, patient movement and operational status.",
    category: "operations",
    isCore: false,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 130,
  },
  {
    code: "CLINICAL",
    name: "Clinical Care",
    description:
      "Consultations, notes, diagnoses, treatment plans and clinical tasks.",
    category: "clinical",
    isCore: false,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 140,
  },
  {
    code: "LABORATORY",
    name: "Laboratory",
    description:
      "Orders, samples, results, verification and critical-result workflows.",
    category: "diagnostics",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 150,
  },
  {
    code: "BLOOD_BANK",
    name: "Blood Bank",
    description:
      "Blood-product inventory, requests, compatibility workflows and controlled issue records.",
    category: "diagnostics",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: false,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: [
      "organization",
      "branch",
      "department",
    ],
    lifecycleStatus: "active",
    sortOrder: 155,
  },
  {
    code: "RADIOLOGY",
    name: "Radiology",
    description:
      "Imaging schedules, worklists, studies, reports and critical findings.",
    category: "diagnostics",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 160,
  },
  {
    code: "INVENTORY",
    name: "Inventory and Procurement",
    description:
      "Stock, purchasing, receiving, transfers, batches and expiry management.",
    category: "operations",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: false,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 170,
  },
  {
    code: "PHARMACY",
    name: "Pharmacy",
    description:
      "Prescription review, substitution, dispensing and patient counselling.",
    category: "clinical",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 180,
  },
  {
    code: "BILLING",
    name: "Billing and Payments",
    description:
      "Invoices, charges, payments, discounts, refunds and receivables.",
    category: "finance",
    isCore: false,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 190,
  },
  {
    code: "BILLING_COUNTER",
    name: "Billing Counter",
    description:
      "Dedicated cashier, counter collection and hospital billing-desk workflows.",
    category: "finance",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: false,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: [
      "organization",
      "branch",
      "department",
    ],
    lifecycleStatus: "active",
    sortOrder: 195,
  },
  {
    code: "INSURANCE",
    name: "Insurance",
    description:
      "Coverage, authorizations, claims and insurer-related workflows.",
    category: "finance",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 200,
  },
  {
    code: "WARD",
    name: "Ward and Admission",
    description:
      "Admissions, beds, nursing observations, transfers and discharge.",
    category: "inpatient",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 210,
  },
  {
    code: "OPERATION_THEATRE",
    name: "Operation Theatre",
    description:
      "Theatre scheduling, procedures, teams, checklists and recovery.",
    category: "inpatient",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 220,
  },
  {
    code: "CSSD",
    name: "Central Sterile Services",
    description:
      "Instrument decontamination, sterilization, tray preparation and sterile-supply workflows.",
    category: "operations",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: false,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: [
      "organization",
      "branch",
      "department",
    ],
    lifecycleStatus: "active",
    sortOrder: 225,
  },
  {
    code: "TELEMEDICINE",
    name: "Telemedicine",
    description:
      "Video, phone and remote consultation workflows.",
    category: "communication",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 230,
  },
  {
    code: "MESSAGING",
    name: "Secure Messaging",
    description:
      "Controlled patient, care-team and operational communication.",
    category: "communication",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 240,
  },
  {
    code: "REPORTING",
    name: "Management Reporting",
    description:
      "Operational, clinical, financial, quality and executive reporting.",
    category: "analytics",
    isCore: false,
    defaultEnabled: true,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: false,
    staffFacing: true,
    entitlementRequired: false,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 250,
  },
  {
    code: "PATIENT_ACCESS",
    name: "Patient Access",
    description:
      "Patient web, PWA and Android access to approved services and records.",
    category: "patient",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: false,
    departmentConfigurable: false,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: ["organization"],
    lifecycleStatus: "active",
    sortOrder: 260,
  },
  {
    code: "DENTISTRY",
    name: "Dentistry",
    description:
      "Dental workflows, services, treatment plans and odontogram extensions.",
    category: "specialty",
    isCore: false,
    defaultEnabled: false,
    organizationConfigurable: true,
    branchConfigurable: true,
    departmentConfigurable: true,
    patientFacing: true,
    staffFacing: true,
    entitlementRequired: true,
    supportedScopes: ["organization", "branch", "department"],
    lifecycleStatus: "active",
    sortOrder: 270,
  },
] as const satisfies readonly ModuleDefinition[];

export const WONFLOW_MODULE_DEPENDENCIES = [
  {
    moduleCode: "ORGANIZATION",
    dependsOnModuleCode: "PLATFORM",
    kind: "required",
    reason: "Hospital organizations are managed by the WonFlow platform.",
  },
  {
    moduleCode: "ACCESS",
    dependsOnModuleCode: "ORGANIZATION",
    kind: "required",
    reason: "User assignments require organization and branch context.",
  },
  {
    moduleCode: "MASTER_DATA",
    dependsOnModuleCode: "ACCESS",
    kind: "required",
    reason: "Reference-data configuration must be permission controlled.",
  },
  {
    moduleCode: "DOCUMENTS",
    dependsOnModuleCode: "ACCESS",
    kind: "required",
    reason: "Document access requires secure authorization.",
  },
  {
    moduleCode: "NOTIFICATIONS",
    dependsOnModuleCode: "ACCESS",
    kind: "required",
    reason: "Notifications require verified users and recipients.",
  },
  {
    moduleCode: "AUDIT",
    dependsOnModuleCode: "ACCESS",
    kind: "required",
    reason: "Audit records require authenticated actor context.",
  },
  {
    moduleCode: "SERVICES",
    dependsOnModuleCode: "MASTER_DATA",
    kind: "required",
    reason: "Services use controlled reference data and option values.",
  },
  {
    moduleCode: "WORKFORCE",
    dependsOnModuleCode: "ACCESS",
    kind: "required",
    reason: "Workforce users require accounts, roles and assignments.",
  },
  {
    moduleCode: "SCHEDULING",
    dependsOnModuleCode: "WORKFORCE",
    kind: "required",
    reason: "Schedules require doctors and workforce assignments.",
  },
  {
    moduleCode: "SCHEDULING",
    dependsOnModuleCode: "SERVICES",
    kind: "required",
    reason: "Availability and slot duration depend on services.",
  },
  {
    moduleCode: "PATIENTS",
    dependsOnModuleCode: "MASTER_DATA",
    kind: "required",
    reason: "Patient registration uses controlled demographic values.",
  },
  {
    moduleCode: "PATIENTS",
    dependsOnModuleCode: "ACCESS",
    kind: "required",
    reason: "Patient records require permission-controlled access.",
  },
  {
    moduleCode: "APPOINTMENTS",
    dependsOnModuleCode: "PATIENTS",
    kind: "required",
    reason: "Appointments are linked to patients or provisional patients.",
  },
  {
    moduleCode: "APPOINTMENTS",
    dependsOnModuleCode: "SCHEDULING",
    kind: "required",
    reason: "Bookings require valid availability and generated slots.",
  },
  {
    moduleCode: "APPOINTMENTS",
    dependsOnModuleCode: "SERVICES",
    kind: "required",
    reason: "Appointments are made for configured services.",
  },
  {
    moduleCode: "QUEUE",
    dependsOnModuleCode: "APPOINTMENTS",
    kind: "required",
    reason: "Queue entries commonly originate from appointments or walk-ins.",
  },
  {
    moduleCode: "QUEUE",
    dependsOnModuleCode: "PATIENTS",
    kind: "required",
    reason: "Patient flow requires a patient identity.",
  },
  {
    moduleCode: "CLINICAL",
    dependsOnModuleCode: "PATIENTS",
    kind: "required",
    reason: "Clinical care is recorded against a patient.",
  },
  {
    moduleCode: "CLINICAL",
    dependsOnModuleCode: "WORKFORCE",
    kind: "required",
    reason: "Clinical actions require authorized practitioners.",
  },
  {
    moduleCode: "CLINICAL",
    dependsOnModuleCode: "SERVICES",
    kind: "required",
    reason: "Clinical orders and procedures use the service catalogue.",
  },
  {
    moduleCode: "LABORATORY",
    dependsOnModuleCode: "PATIENTS",
    kind: "required",
    reason: "Laboratory orders and results belong to patients.",
  },
  {
    moduleCode: "LABORATORY",
    dependsOnModuleCode: "SERVICES",
    kind: "required",
    reason: "Laboratory tests are configured services.",
  },
  {
    moduleCode: "LABORATORY",
    dependsOnModuleCode: "CLINICAL",
    kind: "recommended",
    reason: "Clinical ordering and result review improve laboratory workflow.",
  },
  {
    moduleCode: "RADIOLOGY",
    dependsOnModuleCode: "PATIENTS",
    kind: "required",
    reason: "Radiology studies and reports belong to patients.",
  },
  {
    moduleCode: "RADIOLOGY",
    dependsOnModuleCode: "SERVICES",
    kind: "required",
    reason: "Imaging studies are configured services.",
  },
  {
    moduleCode: "RADIOLOGY",
    dependsOnModuleCode: "CLINICAL",
    kind: "recommended",
    reason: "Clinical ordering and report review improve radiology workflow.",
  },
  {
    moduleCode: "INVENTORY",
    dependsOnModuleCode: "MASTER_DATA",
    kind: "required",
    reason: "Inventory requires standardized items and classifications.",
  },
  {
    moduleCode: "PHARMACY",
    dependsOnModuleCode: "PATIENTS",
    kind: "required",
    reason: "Dispensing activity belongs to patients.",
  },
  {
    moduleCode: "PHARMACY",
    dependsOnModuleCode: "SERVICES",
    kind: "required",
    reason: "Medicines and dispensing actions use configured catalogue data.",
  },
  {
    moduleCode: "PHARMACY",
    dependsOnModuleCode: "INVENTORY",
    kind: "required",
    reason: "Dispensing requires available stock and inventory movement.",
  },
  {
    moduleCode: "PHARMACY",
    dependsOnModuleCode: "CLINICAL",
    kind: "recommended",
    reason: "Clinical prescriptions provide the primary dispensing workflow.",
  },
  {
    moduleCode: "BILLING",
    dependsOnModuleCode: "PATIENTS",
    kind: "required",
    reason: "Invoices and payments belong to patient accounts.",
  },
  {
    moduleCode: "BILLING",
    dependsOnModuleCode: "SERVICES",
    kind: "required",
    reason: "Charges are generated from configured services.",
  },
  {
    moduleCode: "INSURANCE",
    dependsOnModuleCode: "BILLING",
    kind: "required",
    reason: "Coverage and claims affect invoices and patient-payable amounts.",
  },
  {
    moduleCode: "WARD",
    dependsOnModuleCode: "PATIENTS",
    kind: "required",
    reason: "Admissions and inpatient care belong to patients.",
  },
  {
    moduleCode: "WARD",
    dependsOnModuleCode: "CLINICAL",
    kind: "required",
    reason: "Inpatient care requires clinical documentation and tasks.",
  },
  {
    moduleCode: "OPERATION_THEATRE",
    dependsOnModuleCode: "CLINICAL",
    kind: "required",
    reason: "Procedures require clinical records and care teams.",
  },
  {
    moduleCode: "OPERATION_THEATRE",
    dependsOnModuleCode: "SCHEDULING",
    kind: "required",
    reason: "Theatres, teams and procedures require scheduling.",
  },
  {
    moduleCode: "TELEMEDICINE",
    dependsOnModuleCode: "APPOINTMENTS",
    kind: "required",
    reason: "Remote consultations require appointments and availability.",
  },
  {
    moduleCode: "TELEMEDICINE",
    dependsOnModuleCode: "PATIENT_ACCESS",
    kind: "recommended",
    reason: "Patient Access provides the preferred patient joining experience.",
  },
  {
    moduleCode: "TELEMEDICINE",
    dependsOnModuleCode: "NOTIFICATIONS",
    kind: "recommended",
    reason: "Remote consultations require reminders and joining instructions.",
  },
  {
    moduleCode: "MESSAGING",
    dependsOnModuleCode: "PATIENTS",
    kind: "required",
    reason: "Patient conversations require a patient context.",
  },
  {
    moduleCode: "MESSAGING",
    dependsOnModuleCode: "ACCESS",
    kind: "required",
    reason: "Secure messages require verified users and authorization.",
  },
  {
    moduleCode: "MESSAGING",
    dependsOnModuleCode: "PATIENT_ACCESS",
    kind: "recommended",
    reason: "Patient Access provides the patient messaging interface.",
  },
  {
    moduleCode: "REPORTING",
    dependsOnModuleCode: "ORGANIZATION",
    kind: "required",
    reason: "Reports require organization and branch context.",
  },
  {
    moduleCode: "REPORTING",
    dependsOnModuleCode: "ACCESS",
    kind: "required",
    reason: "Report visibility and export require authorization.",
  },
  {
    moduleCode: "REPORTING",
    dependsOnModuleCode: "AUDIT",
    kind: "recommended",
    reason: "Audit records improve governance and compliance reporting.",
  },
  {
    moduleCode: "PATIENT_ACCESS",
    dependsOnModuleCode: "PATIENTS",
    kind: "required",
    reason: "Patient accounts link to organization patient identities.",
  },
  {
    moduleCode: "PATIENT_ACCESS",
    dependsOnModuleCode: "APPOINTMENTS",
    kind: "required",
    reason: "Patient Access provides appointment booking and management.",
  },
  {
    moduleCode: "PATIENT_ACCESS",
    dependsOnModuleCode: "DOCUMENTS",
    kind: "required",
    reason: "Released reports and uploads require secure document handling.",
  },
  {
    moduleCode: "PATIENT_ACCESS",
    dependsOnModuleCode: "NOTIFICATIONS",
    kind: "required",
    reason: "Patients require verification, reminders and updates.",
  },
  {
    moduleCode: "DENTISTRY",
    dependsOnModuleCode: "CLINICAL",
    kind: "required",
    reason: "Dentistry extends the shared clinical-care model.",
  },
  {
    moduleCode: "DENTISTRY",
    dependsOnModuleCode: "SERVICES",
    kind: "required",
    reason: "Dental procedures are configured through the service catalogue.",
  },
  {
    moduleCode: "DENTISTRY",
    dependsOnModuleCode: "BILLING",
    kind: "recommended",
    reason: "Dental services commonly generate charges and treatment estimates.",
  },
  {
    moduleCode: "DENTISTRY",
    dependsOnModuleCode: "INVENTORY",
    kind: "recommended",
    reason: "Dental procedures may consume controlled materials and stock.",
  },
] as const satisfies readonly ModuleDependency[];

export const WONFLOW_MODULE_REGISTRY: ModuleRegistry = {
  modules: WONFLOW_MODULES,
  dependencies: WONFLOW_MODULE_DEPENDENCIES,
};