export const WONFLOW_CONTRACT_PACKAGE_NAME =
  "@wonflow/contracts" as const;

export const WONFLOW_CONTRACT_SCHEMA_VERSION =
  "0.1.0" as const;

export type WonFlowContractDomain =
  | "organization"
  | "access"
  | "platform"
  | "patient"
  | "scheduling"
  | "appointments"
  | "operations"
  | "clinical"
  | "diagnostics"
  | "pharmacy"
  | "finance"
  | "insurance"
  | "inpatient"
  | "surgery";

export interface WonFlowContractModuleMetadata {
  domain: WonFlowContractDomain;

  title: string;
  description: string;

  sourceFiles: readonly string[];

  containsClinicalData: boolean;
  containsFinancialData: boolean;
  containsPersonallyIdentifiableInformation: boolean;

  organizationScoped: boolean;
  branchScoped: boolean;

  auditRequired: boolean;
}

export const WONFLOW_CONTRACT_MODULES = [
  {
    domain: "organization",
    title: "Organization Structure",
    description:
      "Organizations, branches, departments, operational units and service points.",
    sourceFiles: [
      "organization/hierarchy.ts",
    ],
    containsClinicalData: false,
    containsFinancialData: false,
    containsPersonallyIdentifiableInformation: false,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "access",
    title: "Access Control",
    description:
      "Roles, permissions, access scopes and authorization decisions.",
    sourceFiles: [
      "access/authorization.ts",
    ],
    containsClinicalData: false,
    containsFinancialData: false,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "platform",
    title: "Platform Modules",
    description:
      "WonFlow module registry, availability and dependency rules.",
    sourceFiles: [
      "platform/modules.ts",
    ],
    containsClinicalData: false,
    containsFinancialData: false,
    containsPersonallyIdentifiableInformation: false,
    organizationScoped: true,
    branchScoped: false,
    auditRequired: true,
  },
  {
    domain: "patient",
    title: "Patient Identity and Journeys",
    description:
      "Patient identity, encounters and connected care journeys.",
    sourceFiles: [
      "patient/identity.ts",
      "patient/encounter.ts",
      "patient/journey.ts",
    ],
    containsClinicalData: true,
    containsFinancialData: false,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "scheduling",
    title: "Doctor Scheduling",
    description:
      "Doctor availability, schedule exceptions, slots and live status.",
    sourceFiles: [
      "scheduling/doctor-availability.ts",
    ],
    containsClinicalData: false,
    containsFinancialData: false,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "appointments",
    title: "Appointments",
    description:
      "Booking, reservation, confirmation, cancellation and rescheduling.",
    sourceFiles: [
      "appointments/appointment.ts",
    ],
    containsClinicalData: true,
    containsFinancialData: false,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "operations",
    title: "Check-In and Queues",
    description:
      "Patient arrival, check-in, tokens, queues and service progression.",
    sourceFiles: [
      "operations/check-in-queue.ts",
    ],
    containsClinicalData: true,
    containsFinancialData: false,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "clinical",
    title: "Clinical Care",
    description:
      "Consultations, notes, treatment plans and medication prescribing.",
    sourceFiles: [
      "clinical/consultation.ts",
      "clinical/medication.ts",
    ],
    containsClinicalData: true,
    containsFinancialData: false,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "diagnostics",
    title: "Diagnostics",
    description:
      "Laboratory and radiology orders, results, reporting and escalation.",
    sourceFiles: [
      "diagnostics/laboratory.ts",
      "diagnostics/radiology.ts",
    ],
    containsClinicalData: true,
    containsFinancialData: false,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "pharmacy",
    title: "Pharmacy",
    description:
      "Pharmacist review, stock allocation, dispensing and counselling.",
    sourceFiles: [
      "pharmacy/dispensing.ts",
    ],
    containsClinicalData: true,
    containsFinancialData: true,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "finance",
    title: "Billing and Payments",
    description:
      "Charges, invoices, payments, refunds, credits and cashier activity.",
    sourceFiles: [
      "finance/billing.ts",
    ],
    containsClinicalData: false,
    containsFinancialData: true,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "insurance",
    title: "Insurance and Claims",
    description:
      "Coverage, eligibility, authorization, claims, denials and appeals.",
    sourceFiles: [
      "insurance/claims.ts",
    ],
    containsClinicalData: true,
    containsFinancialData: true,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "inpatient",
    title: "Inpatient Care",
    description:
      "Admissions, beds, wards, nursing, eMAR, transfers and discharge.",
    sourceFiles: [
      "inpatient/admission.ts",
      "inpatient/nursing.ts",
    ],
    containsClinicalData: true,
    containsFinancialData: true,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
  {
    domain: "surgery",
    title: "Surgery and Operation Theatre",
    description:
      "Theatre scheduling, surgery, anaesthesia, implants and recovery.",
    sourceFiles: [
      "surgery/operation-theatre.ts",
    ],
    containsClinicalData: true,
    containsFinancialData: true,
    containsPersonallyIdentifiableInformation: true,
    organizationScoped: true,
    branchScoped: true,
    auditRequired: true,
  },
] as const satisfies readonly WonFlowContractModuleMetadata[];

export function getWonFlowContractModule(
  domain: WonFlowContractDomain,
): WonFlowContractModuleMetadata | undefined {
  return WONFLOW_CONTRACT_MODULES.find(
    (
      moduleDefinition: WonFlowContractModuleMetadata,
    ) => moduleDefinition.domain === domain,
  );
}
