import type {
  MockAdmission,
  MockAppointment,
  MockBranch,
  MockDatasetMetadata,
  MockInvoiceSummary,
  MockOrganization,
  MockPatient,
  MockPractitioner,
  MockQueueEntry,
  WonFlowDemoPatientOverview,
} from "@wonflow/mock-data";

export interface WonFlowDashboardDataSource {
  fictional: boolean;

  datasetName: string;
  datasetVersion: string;
  datasetSeed: string;

  generatedAt:
    MockDatasetMetadata["generatedAt"];

  anchorDateTime:
    MockDatasetMetadata["anchorDateTime"];
}

export interface WonFlowDashboardFinancialSummary {
  currencyCode: "PKR";

  totalBilledMinorUnits: number;
  totalPaidMinorUnits: number;
  outstandingMinorUnits: number;
}

export interface WonFlowPlatformDashboardProjection {
  source:
    WonFlowDashboardDataSource;

  organization:
    MockOrganization;

  branches:
    MockBranch[];

  summary: {
    organizationCount: number;
    branchCount: number;

    practitionerCount: number;
    patientCount: number;

    appointmentCount: number;
    queueEntryCount: number;

    admissionCount: number;
    invoiceCount: number;
  };
}

export interface WonFlowBranchDashboardSummary {
  branch: MockBranch;

  practitionerCount: number;
  patientCount: number;

  todayAppointmentCount: number;
  liveQueueCount: number;

  activeAdmissionCount: number;

  outstandingInvoiceMinorUnits:
    number;
}

export interface WonFlowOrganizationDashboardProjection {
  source:
    WonFlowDashboardDataSource;

  organization:
    MockOrganization;

  branches:
    MockBranch[];

  branchSummaries:
    WonFlowBranchDashboardSummary[];

  totals: {
    patients: number;
    practitioners: number;

    todayAppointments: number;
    liveQueueEntries: number;

    activeAdmissions: number;
    doctorsOnDuty: number;
  };

  financial:
    WonFlowDashboardFinancialSummary;
}

export interface WonFlowOperationsDashboardProjection {
  source:
    WonFlowDashboardDataSource;

  organization:
    MockOrganization;

  branches:
    MockBranch[];

  patients:
    MockPatient[];

  practitioners:
    MockPractitioner[];

  summary: {
    totalPatients: number;
    totalPractitioners: number;

    todayAppointments: number;
    liveQueueEntries: number;

    activeAdmissions: number;
    doctorsOnDuty: number;

    outstandingInvoiceMinorUnits:
      number;

    currencyCode: "PKR";
  };

  todayAppointments:
    MockAppointment[];

  liveQueue:
    MockQueueEntry[];

  activeAdmissions:
    MockAdmission[];

  doctorsOnDuty:
    MockPractitioner[];

  outstandingInvoices:
    MockInvoiceSummary[];
}

export interface WonFlowDoctorDashboardProjection {
  source:
    WonFlowDashboardDataSource;

  practitioner:
    MockPractitioner;

  patients:
    MockPatient[];

  summary: {
    todayAppointments: number;
    completedAppointments: number;

    waitingPatients: number;
    uniquePatientsToday: number;

    activeAdmissions: number;
  };

  appointments:
    MockAppointment[];

  currentQueue:
    MockQueueEntry[];

  activeAdmissions:
    MockAdmission[];
}

export interface WonFlowManagementDashboardProjection {
  source:
    WonFlowDashboardDataSource;

  organization:
    MockOrganization;

  branches:
    MockBranch[];

  summary: {
    patients: number;
    practitioners: number;

    appointments: number;
    completedAppointments: number;

    appointmentCompletionRate:
      number;

    queueEntries: number;
    completedQueueEntries: number;

    queueCompletionRate: number;

    activeAdmissions: number;
  };

  financial:
    WonFlowDashboardFinancialSummary;

  branchPerformance:
    WonFlowBranchDashboardSummary[];
}

export interface WonFlowPatientDashboardProjection {
  source:
    WonFlowDashboardDataSource;

  patient:
    MockPatient;

  branches:
    MockBranch[];

  practitioners:
    MockPractitioner[];

  overview:
    WonFlowDemoPatientOverview;

  summary: {
    upcomingAppointments: number;
    activeAdmissions: number;

    outstandingInvoices: number;
    outstandingBalanceMinorUnits:
      number;

    currencyCode: "PKR";
  };

  upcomingAppointments:
    MockAppointment[];

  recentAppointments:
    MockAppointment[];

  activeAdmissions:
    MockAdmission[];

  outstandingInvoices:
    MockInvoiceSummary[];
}

/**
 * Tenant-scoped hospital administration data returned by the production API.
 * This deliberately does not reuse the mock-data contracts above: a newly
 * provisioned hospital must render its real empty state, never demo records.
 */
export interface WonFlowLiveOrganizationDashboardBranch {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  isMainBranch: boolean;
  timezone: string;
  currencyCode: string;
}

export interface WonFlowLiveBranchDashboardSummary {
  branch: WonFlowLiveOrganizationDashboardBranch;
  practitionerCount: number;
  todayAppointmentCount: number;
  liveQueueCount: number;
  openInvoiceCount: number;
  outstandingInvoiceMinorUnits: number;
}

export interface WonFlowLiveOrganizationDashboardProjection {
  source: {
    kind: "live";
    generatedAt: string;
    timezone: string;
  };
  organization: {
    id: string;
    name: string;
    logoDataUrl?: string | null;
    logoObjectKey?: string | null;
  };
  branches: WonFlowLiveOrganizationDashboardBranch[];
  branchSummaries: WonFlowLiveBranchDashboardSummary[];
  totals: {
    patients: number;
    practitioners: number;
    todayAppointments: number;
    liveQueueEntries: number;
    activeBranches: number;
    openInvoices: number;
  };
  financial: {
    currencyCode: string;
    totalBilledMinorUnits: number;
    totalPaidMinorUnits: number;
    outstandingMinorUnits: number;
  };
}
