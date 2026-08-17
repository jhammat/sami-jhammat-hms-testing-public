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
  WonFlowMockHospitalService,
} from "@wonflow/mock-data";

import type {
  WonFlowBranchDashboardSummary,
  WonFlowDashboardDataSource,
  WonFlowDashboardFinancialSummary,
  WonFlowDoctorDashboardProjection,
  WonFlowManagementDashboardProjection,
  WonFlowOperationsDashboardProjection,
  WonFlowOrganizationDashboardProjection,
  WonFlowPatientDashboardProjection,
  WonFlowPlatformDashboardProjection,
} from "./types";

interface WonFlowDashboardSnapshot {
  metadata:
    MockDatasetMetadata;

  organization:
    MockOrganization;

  branches:
    MockBranch[];

  patients:
    MockPatient[];

  practitioners:
    MockPractitioner[];

  appointments:
    MockAppointment[];

  queueEntries:
    MockQueueEntry[];

  admissions:
    MockAdmission[];

  invoices:
    MockInvoiceSummary[];
}

function createDashboardSource(
  metadata:
    MockDatasetMetadata,
): WonFlowDashboardDataSource {
  return {
    fictional:
      metadata.fictional,

    datasetName:
      metadata.name,

    datasetVersion:
      metadata.version,

    datasetSeed:
      metadata.seed,

    generatedAt:
      metadata.generatedAt,

    anchorDateTime:
      metadata.anchorDateTime,
  };
}

function percentage(
  completed: number,
  total: number,
): number {
  if (total === 0) {
    return 0;
  }

  return Number(
    (
      completed /
      total *
      100
    ).toFixed(1),
  );
}

function createFinancialSummary(
  invoices:
    readonly MockInvoiceSummary[],
): WonFlowDashboardFinancialSummary {
  return invoices.reduce<
    WonFlowDashboardFinancialSummary
  >(
    (
      summary,
      invoice,
    ) => ({
      currencyCode: "PKR",

      totalBilledMinorUnits:
        summary
          .totalBilledMinorUnits +
        invoice.totalMinorUnits,

      totalPaidMinorUnits:
        summary
          .totalPaidMinorUnits +
        invoice.paidMinorUnits,

      outstandingMinorUnits:
        summary
          .outstandingMinorUnits +
        invoice.balanceMinorUnits,
    }),
    {
      currencyCode: "PKR",
      totalBilledMinorUnits: 0,
      totalPaidMinorUnits: 0,
      outstandingMinorUnits: 0,
    },
  );
}

function isLiveQueueEntry(
  entry: MockQueueEntry,
): boolean {
  return (
    entry.status === "waiting" ||
    entry.status === "called" ||
    entry.status === "serving"
  );
}

function isDoctorOnDuty(
  practitioner:
    MockPractitioner,
): boolean {
  return (
    practitioner
      .operationalStatus !==
    "off-duty"
  );
}

function isActiveAdmission(
  admission:
    MockAdmission,
): boolean {
  return (
    admission.status !==
    "discharge-ready"
  );
}

function sortAppointmentAscending(
  left: MockAppointment,
  right: MockAppointment,
): number {
  return (
    Date.parse(
      left.scheduledStartAt,
    ) -
    Date.parse(
      right.scheduledStartAt,
    )
  );
}

function sortAppointmentDescending(
  left: MockAppointment,
  right: MockAppointment,
): number {
  return (
    Date.parse(
      right.scheduledStartAt,
    ) -
    Date.parse(
      left.scheduledStartAt,
    )
  );
}

async function loadDashboardSnapshot(
  service:
    WonFlowMockHospitalService,

  signal?: AbortSignal,
): Promise<WonFlowDashboardSnapshot> {
  const [
    metadata,
    organization,
    branches,
    patients,
    practitioners,
    appointments,
    queueEntries,
    admissions,
    invoices,
  ] = await Promise.all([
    service.getMetadata(signal),

    service.getOrganization(
      signal,
    ),

    service.listBranches(
      signal,
    ),

    service.listPatients(
      {
        limit: 100,
      },
      signal,
    ),

    service.listPractitioners(
      {
        limit: 100,
      },
      signal,
    ),

    service.listAppointments(
      {
        limit: 100,
      },
      signal,
    ),

    service.listQueueEntries(
      {
        limit: 100,
      },
      signal,
    ),

    service.listAdmissions(
      {
        limit: 100,
      },
      signal,
    ),

    service.listInvoices(
      {
        limit: 100,
      },
      signal,
    ),
  ]);

  return {
    metadata,
    organization,
    branches,

    patients:
      patients.items,

    practitioners:
      practitioners.items,

    appointments:
      appointments.items,

    queueEntries:
      queueEntries.items,

    admissions:
      admissions.items,

    invoices:
      invoices.items,
  };
}

function createBranchSummaries(
  snapshot:
    WonFlowDashboardSnapshot,
): WonFlowBranchDashboardSummary[] {
  const anchorDate =
    snapshot.metadata
      .anchorDateTime
      .slice(0, 10);

  return snapshot.branches.map(
    (branch) => {
      const branchAppointments =
        snapshot.appointments.filter(
          (appointment) =>
            appointment.branchId ===
            branch.id,
        );

      const branchQueue =
        snapshot.queueEntries.filter(
          (entry) =>
            entry.branchId ===
            branch.id,
        );

      const branchAdmissions =
        snapshot.admissions.filter(
          (admission) =>
            admission.branchId ===
            branch.id,
        );

      const branchInvoices =
        snapshot.invoices.filter(
          (invoice) =>
            invoice.branchId ===
            branch.id,
        );

      return {
        branch,

        practitionerCount:
          snapshot.practitioners
            .filter(
              (practitioner) =>
                practitioner
                  .primaryBranchId ===
                branch.id,
            )
            .length,

        patientCount:
          snapshot.patients
            .filter(
              (patient) =>
                patient
                  .homeBranchId ===
                branch.id,
            )
            .length,

        todayAppointmentCount:
          branchAppointments
            .filter(
              (appointment) =>
                appointment
                  .scheduledStartAt
                  .slice(0, 10) ===
                anchorDate,
            )
            .length,

        liveQueueCount:
          branchQueue
            .filter(
              isLiveQueueEntry,
            )
            .length,

        activeAdmissionCount:
          branchAdmissions
            .filter(
              isActiveAdmission,
            )
            .length,

        outstandingInvoiceMinorUnits:
          branchInvoices.reduce(
            (
              total,
              invoice,
            ) =>
              total +
              invoice
                .balanceMinorUnits,
            0,
          ),
      };
    },
  );
}

export async function loadWonFlowPlatformDashboard(
  service:
    WonFlowMockHospitalService,

  signal?: AbortSignal,
): Promise<WonFlowPlatformDashboardProjection> {
  const snapshot =
    await loadDashboardSnapshot(
      service,
      signal,
    );

  return {
    source:
      createDashboardSource(
        snapshot.metadata,
      ),

    organization:
      snapshot.organization,

    branches:
      snapshot.branches,

    summary: {
      organizationCount: 1,

      branchCount:
        snapshot.branches.length,

      practitionerCount:
        snapshot
          .practitioners
          .length,

      patientCount:
        snapshot.patients.length,

      appointmentCount:
        snapshot
          .appointments
          .length,

      queueEntryCount:
        snapshot
          .queueEntries
          .length,

      admissionCount:
        snapshot.admissions.length,

      invoiceCount:
        snapshot.invoices.length,
    },
  };
}

export async function loadWonFlowOrganizationDashboard(
  service:
    WonFlowMockHospitalService,

  signal?: AbortSignal,
): Promise<WonFlowOrganizationDashboardProjection> {
  const snapshot =
    await loadDashboardSnapshot(
      service,
      signal,
    );

  const anchorDate =
    snapshot.metadata
      .anchorDateTime
      .slice(0, 10);

  const todayAppointments =
    snapshot.appointments.filter(
      (appointment) =>
        appointment
          .scheduledStartAt
          .slice(0, 10) ===
        anchorDate,
    );

  const liveQueue =
    snapshot.queueEntries.filter(
      isLiveQueueEntry,
    );

  const activeAdmissions =
    snapshot.admissions.filter(
      isActiveAdmission,
    );

  const doctorsOnDuty =
    snapshot.practitioners.filter(
      isDoctorOnDuty,
    );

  return {
    source:
      createDashboardSource(
        snapshot.metadata,
      ),

    organization:
      snapshot.organization,

    branches:
      snapshot.branches,

    branchSummaries:
      createBranchSummaries(
        snapshot,
      ),

    totals: {
      patients:
        snapshot.patients.length,

      practitioners:
        snapshot
          .practitioners
          .length,

      todayAppointments:
        todayAppointments.length,

      liveQueueEntries:
        liveQueue.length,

      activeAdmissions:
        activeAdmissions.length,

      doctorsOnDuty:
        doctorsOnDuty.length,
    },

    financial:
      createFinancialSummary(
        snapshot.invoices,
      ),
  };
}

export async function loadWonFlowOperationsDashboard(
  service:
    WonFlowMockHospitalService,

  signal?: AbortSignal,
): Promise<WonFlowOperationsDashboardProjection> {
  const snapshot =
    await loadDashboardSnapshot(
      service,
      signal,
    );

  const anchorDate =
    snapshot.metadata
      .anchorDateTime
      .slice(0, 10);

  const todayAppointments =
    snapshot.appointments
      .filter(
        (appointment) =>
          appointment
            .scheduledStartAt
            .slice(0, 10) ===
          anchorDate,
      )
      .sort(
        sortAppointmentAscending,
      );

  const liveQueue =
    snapshot.queueEntries
      .filter(
        isLiveQueueEntry,
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.queuePosition -
          right.queuePosition,
      );

  const activeAdmissions =
    snapshot.admissions
      .filter(
        isActiveAdmission,
      );

  const doctorsOnDuty =
    snapshot.practitioners
      .filter(
        isDoctorOnDuty,
      );

  const outstandingInvoices =
    snapshot.invoices
      .filter(
        (invoice) =>
          invoice
            .balanceMinorUnits > 0,
      );

  return {
    source:
      createDashboardSource(
        snapshot.metadata,
      ),

    organization:
      snapshot.organization,

    branches:
      snapshot.branches,

    patients:
      snapshot.patients,

    practitioners:
      snapshot.practitioners,

    summary: {
      totalPatients:
        snapshot.patients.length,

      totalPractitioners:
        snapshot
          .practitioners
          .length,

      todayAppointments:
        todayAppointments.length,

      liveQueueEntries:
        liveQueue.length,

      activeAdmissions:
        activeAdmissions.length,

      doctorsOnDuty:
        doctorsOnDuty.length,

      outstandingInvoiceMinorUnits:
        outstandingInvoices.reduce(
          (
            total,
            invoice,
          ) =>
            total +
            invoice
              .balanceMinorUnits,
          0,
        ),

      currencyCode: "PKR",
    },

    todayAppointments,
    liveQueue,
    activeAdmissions,
    doctorsOnDuty,
    outstandingInvoices,
  };
}

export async function loadWonFlowDoctorDashboard(
  service:
    WonFlowMockHospitalService,

  practitionerId:
    MockPractitioner["id"],

  signal?: AbortSignal,
): Promise<WonFlowDoctorDashboardProjection> {
  const [
    metadata,
    practitioners,
    patients,
    appointments,
    queueEntries,
    admissions,
  ] = await Promise.all([
    service.getMetadata(signal),

    service.listPractitioners(
      {
        limit: 100,
      },
      signal,
    ),

    service.listPatients(
      {
        limit: 100,
      },
      signal,
    ),

    service.listAppointments(
      {
        practitionerId,
        limit: 100,
      },
      signal,
    ),

    service.listQueueEntries(
      {
        practitionerId,
        limit: 100,
      },
      signal,
    ),

    service.listAdmissions(
      {
        practitionerId,
        limit: 100,
      },
      signal,
    ),
  ]);

  const practitioner =
    practitioners.items.find(
      (candidate) =>
        candidate.id ===
        practitionerId,
    );

  if (practitioner === undefined) {
    throw new Error(`Practitioner was not found: ${practitionerId}`);
  }

  const anchorDate =
    metadata.anchorDateTime
      .slice(0, 10);

  const todayAppointments =
    appointments.items
      .filter(
        (appointment) =>
          appointment
            .scheduledStartAt
            .slice(0, 10) ===
          anchorDate,
      )
      .sort(
        sortAppointmentAscending,
      );

  const completedAppointments =
    todayAppointments.filter(
      (appointment) =>
        appointment.status ===
        "completed",
    );

  const currentQueue =
    queueEntries.items
      .filter(
        isLiveQueueEntry,
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.queuePosition -
          right.queuePosition,
      );

  const activeAdmissions =
    admissions.items.filter(
      isActiveAdmission,
    );

  const uniquePatientIds =
    new Set(
      todayAppointments.map(
        (appointment) =>
          appointment.patientId,
      ),
    );

  return {
    source:
      createDashboardSource(
        metadata,
      ),

    practitioner,

    patients:
      patients.items,

    summary: {
      todayAppointments:
        todayAppointments.length,

      completedAppointments:
        completedAppointments.length,

      waitingPatients:
        currentQueue.length,

      uniquePatientsToday:
        uniquePatientIds.size,

      activeAdmissions:
        activeAdmissions.length,
    },

    appointments:
      todayAppointments,

    currentQueue,
    activeAdmissions,
  };
}

export async function loadWonFlowManagementDashboard(
  service:
    WonFlowMockHospitalService,

  signal?: AbortSignal,
): Promise<WonFlowManagementDashboardProjection> {
  const snapshot =
    await loadDashboardSnapshot(
      service,
      signal,
    );

  const completedAppointments =
    snapshot.appointments.filter(
      (appointment) =>
        appointment.status ===
        "completed",
    );

  const completedQueueEntries =
    snapshot.queueEntries.filter(
      (entry) =>
        entry.status ===
        "completed",
    );

  return {
    source:
      createDashboardSource(
        snapshot.metadata,
      ),

    organization:
      snapshot.organization,

    branches:
      snapshot.branches,

    summary: {
      patients:
        snapshot.patients.length,

      practitioners:
        snapshot
          .practitioners
          .length,

      appointments:
        snapshot
          .appointments
          .length,

      completedAppointments:
        completedAppointments.length,

      appointmentCompletionRate:
        percentage(
          completedAppointments
            .length,

          snapshot
            .appointments
            .length,
        ),

      queueEntries:
        snapshot
          .queueEntries
          .length,

      completedQueueEntries:
        completedQueueEntries.length,

      queueCompletionRate:
        percentage(
          completedQueueEntries
            .length,

          snapshot
            .queueEntries
            .length,
        ),

      activeAdmissions:
        snapshot.admissions
          .filter(
            isActiveAdmission,
          )
          .length,
    },

    financial:
      createFinancialSummary(
        snapshot.invoices,
      ),

    branchPerformance:
      createBranchSummaries(
        snapshot,
      ),
  };
}

export async function loadWonFlowPatientDashboard(
  service:
    WonFlowMockHospitalService,

  patientId:
    MockPatient["id"],

  signal?: AbortSignal,
): Promise<WonFlowPatientDashboardProjection> {
  const [
    metadata,
    overview,
    branches,
    practitioners,
  ] = await Promise.all([
    service.getMetadata(signal),

    service.getPatientOverview(
      patientId,
      signal,
    ),

    service.listBranches(
      signal,
    ),

    service.listPractitioners(
      {
        limit: 100,
      },
      signal,
    ),
  ]);

  const anchorTime =
    Date.parse(
      metadata.anchorDateTime,
    );

  const upcomingAppointments =
    overview.appointments
      .filter(
        (appointment) =>
          Date.parse(
            appointment
              .scheduledStartAt,
          ) >= anchorTime &&
          (
            appointment.status ===
              "booked" ||
            appointment.status ===
              "confirmed" ||
            appointment.status ===
              "arrived" ||
            appointment.status ===
              "checked-in"
          ),
      )
      .sort(
        sortAppointmentAscending,
      );

  const recentAppointments =
    [...overview.appointments]
      .sort(
        sortAppointmentDescending,
      )
      .slice(0, 5);

  const activeAdmissions =
    overview.admissions.filter(
      isActiveAdmission,
    );

  const outstandingInvoices =
    overview.invoices.filter(
      (invoice) =>
        invoice
          .balanceMinorUnits > 0,
    );

  return {
    source:
      createDashboardSource(
        metadata,
      ),

    patient:
      overview.patient,

    branches,

    practitioners:
      practitioners.items,

    overview,

    summary: {
      upcomingAppointments:
        upcomingAppointments.length,

      activeAdmissions:
        activeAdmissions.length,

      outstandingInvoices:
        outstandingInvoices.length,

      outstandingBalanceMinorUnits:
        outstandingInvoices.reduce(
          (
            total,
            invoice,
          ) =>
            total +
            invoice
              .balanceMinorUnits,
          0,
        ),

      currencyCode: "PKR",
    },

    upcomingAppointments,
    recentAppointments,
    activeAdmissions,
    outstandingInvoices,
  };
}
