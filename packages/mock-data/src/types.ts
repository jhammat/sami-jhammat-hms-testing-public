import type {
  IsoDateTime,
  WonFlowId,
} from "@wonflow/contracts";

export type MockLocale =
  | "en-PK"
  | "ur-PK";

export type MockAdministrativeSex =
  | "male"
  | "female"
  | "other"
  | "unknown";

export type MockDoctorOperationalStatus =
  | "available"
  | "in-consultation"
  | "on-break"
  | "in-procedure"
  | "off-duty";

export type MockAppointmentStatus =
  | "booked"
  | "confirmed"
  | "arrived"
  | "checked-in"
  | "in-consultation"
  | "completed"
  | "cancelled"
  | "no-show";

export type MockQueueStatus =
  | "waiting"
  | "called"
  | "serving"
  | "completed"
  | "skipped";

export type MockAdmissionStatus =
  | "awaiting-bed"
  | "admitted"
  | "transfer-pending"
  | "discharge-planning"
  | "discharge-ready";

export type MockInvoiceStatus =
  | "draft"
  | "issued"
  | "partially-paid"
  | "paid"
  | "overdue";

export interface MockDatasetMetadata {
  id: WonFlowId;

  name: string;
  description: string;

  version: string;
  seed: string;

  fictional: true;

  locale: MockLocale;
  generatedAt: IsoDateTime;
  anchorDateTime: IsoDateTime;

  recordCounts: {
    organizations: number;
    branches: number;
    practitioners: number;
    patients: number;
    appointments: number;
    queueEntries: number;
    admissions: number;
    invoices: number;
  };
}

export interface MockOrganization {
  id: WonFlowId;

  code: string;
  name: string;
  shortName: string;

  fictional: true;

  defaultLocale: MockLocale;
  defaultCurrencyCode: "PKR";

  createdAt: IsoDateTime;
}

export interface MockBranch {
  id: WonFlowId;

  organizationId: WonFlowId;

  code: string;
  name: string;
  city: string;

  fictional: true;

  active: boolean;

  createdAt: IsoDateTime;
}

export interface MockPractitioner {
  id: WonFlowId;

  organizationId: WonFlowId;
  primaryBranchId: WonFlowId;

  employeeNumber: string;

  displayName: string;
  givenName: string;
  familyName: string;

  profileImageUrl?: string;

  specialtyCode: string;
  specialtyName: string;

  roleCodes: string[];

  operationalStatus: MockDoctorOperationalStatus;

  fictional: true;

  createdAt: IsoDateTime;
}

export interface MockPatient {
  id: WonFlowId;

  organizationId: WonFlowId;
  homeBranchId: WonFlowId;

  mrNumber: string;

  displayName: string;
  givenName: string;
  familyName: string;

  administrativeSex: MockAdministrativeSex;

  dateOfBirth: string;
  ageYears: number;

  phoneNumber: string;
  emailAddress?: string;

  city: string;
  bloodGroup?: string;

  emergencyContactName: string;

  fictional: true;

  createdAt: IsoDateTime;
}

export interface MockAppointment {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  patientId: WonFlowId;
  practitionerId: WonFlowId;

  appointmentNumber: string;

  serviceCode: string;
  serviceName: string;

  status: MockAppointmentStatus;

  scheduledStartAt: IsoDateTime;
  scheduledEndAt: IsoDateTime;

  reasonForVisit: string;

  fictional: true;

  createdAt: IsoDateTime;
}

export interface MockQueueEntry {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  appointmentId: WonFlowId;
  patientId: WonFlowId;
  practitionerId: WonFlowId;

  tokenNumber: string;
  queuePosition: number;

  status: MockQueueStatus;

  arrivedAt: IsoDateTime;
  calledAt?: IsoDateTime;

  fictional: true;
}

export interface MockAdmission {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  patientId: WonFlowId;
  attendingPractitionerId: WonFlowId;

  admissionNumber: string;

  wardName: string;
  roomName: string;
  bedName: string;

  status: MockAdmissionStatus;

  admittedAt: IsoDateTime;
  expectedDischargeAt?: IsoDateTime;

  fictional: true;
}

export interface MockInvoiceSummary {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  patientId: WonFlowId;

  invoiceNumber: string;

  status: MockInvoiceStatus;

  currencyCode: "PKR";

  totalMinorUnits: number;
  paidMinorUnits: number;
  balanceMinorUnits: number;

  issuedAt: IsoDateTime;

  fictional: true;
}

export interface WonFlowDemoDataset {
  metadata: MockDatasetMetadata;

  organization: MockOrganization;
  branches: MockBranch[];

  practitioners: MockPractitioner[];
  patients: MockPatient[];

  appointments: MockAppointment[];
  queueEntries: MockQueueEntry[];

  admissions: MockAdmission[];
  invoices: MockInvoiceSummary[];
}

export interface WonFlowDemoDatasetOptions {
  seed?: string;

  locale?: MockLocale;

  patientCount?: number;
  practitionerCount?: number;
  appointmentCount?: number;
  queueEntryCount?: number;
  admissionCount?: number;
  invoiceCount?: number;
}

export interface WonFlowDemoScenarioDefinition {
  code: string;
  name: string;
  description: string;

  options: Required<
    Pick<
      WonFlowDemoDatasetOptions,
      | "seed"
      | "patientCount"
      | "practitionerCount"
      | "appointmentCount"
      | "queueEntryCount"
      | "admissionCount"
      | "invoiceCount"
    >
  >;
}
