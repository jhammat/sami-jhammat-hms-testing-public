import type {
  WonFlowId,
} from "@wonflow/contracts";

import {
  createWonFlowDemoScenario,
} from "../scenario-registry";

import type {
  WonFlowDemoScenarioCode,
} from "../scenario-registry";

import type {
  MockAdmission,
  MockAppointment,
  MockAppointmentStatus,
  MockBranch,
  MockDatasetMetadata,
  MockInvoiceStatus,
  MockInvoiceSummary,
  MockOrganization,
  MockPatient,
  MockPractitioner,
  MockQueueEntry,
  MockQueueStatus,
} from "../types";

import {
  createWonFlowDemoRepositories,
} from "../repositories/demo-repositories";

import type {
  WonFlowDemoRepositories,
} from "../repositories/demo-repositories";

import type {
  MockRepositoryPage,
} from "../repositories/repository";

import {
  createWonFlowMockAsyncAdapter,
  WonFlowMockServiceError,
} from "./async-adapter";

import type {
  MockAsyncAdapterOptions,
  WonFlowMockAsyncAdapter,
} from "./async-adapter";

export interface DemoBaseListQuery {
  search?: string;
  branchId?: WonFlowId;

  offset?: number;
  limit?: number;
}

export interface DemoPractitionerQuery
  extends DemoBaseListQuery {
  specialtyCode?: string;
  operationalStatus?:
    MockPractitioner["operationalStatus"];
}

export interface DemoPatientQuery
  extends DemoBaseListQuery {
  administrativeSex?:
    MockPatient["administrativeSex"];
}

export interface DemoAppointmentQuery
  extends DemoBaseListQuery {
  patientId?: WonFlowId;
  practitionerId?: WonFlowId;
  status?: MockAppointmentStatus;
}

export interface DemoQueueQuery
  extends DemoBaseListQuery {
  patientId?: WonFlowId;
  practitionerId?: WonFlowId;
  status?: MockQueueStatus;
}

export interface DemoAdmissionQuery
  extends DemoBaseListQuery {
  patientId?: WonFlowId;
  practitionerId?: WonFlowId;
  status?: MockAdmission["status"];
}

export interface DemoInvoiceQuery
  extends DemoBaseListQuery {
  patientId?: WonFlowId;
  status?: MockInvoiceStatus;
}

export interface WonFlowDemoDashboardSummary {
  totalPatients: number;
  totalPractitioners: number;

  todayAppointments: number;
  waitingQueueEntries: number;

  activeAdmissions: number;

  outstandingInvoiceMinorUnits: number;
  currencyCode: "PKR";
}

export interface WonFlowDemoPatientOverview {
  patient: MockPatient;

  appointments: MockAppointment[];
  queueEntries: MockQueueEntry[];
  admissions: MockAdmission[];
  invoices: MockInvoiceSummary[];
}

export interface WonFlowMockHospitalService {
  getMetadata(
    signal?: AbortSignal,
  ): Promise<MockDatasetMetadata>;

  getOrganization(
    signal?: AbortSignal,
  ): Promise<MockOrganization>;

  listBranches(
    signal?: AbortSignal,
  ): Promise<MockBranch[]>;

  getDashboardSummary(
    signal?: AbortSignal,
  ): Promise<WonFlowDemoDashboardSummary>;

  listPatients(
    query?: DemoPatientQuery,
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockPatient>
  >;

  getPatientById(
    patientId: WonFlowId,
    signal?: AbortSignal,
  ): Promise<MockPatient>;

  getPatientOverview(
    patientId: WonFlowId,
    signal?: AbortSignal,
  ): Promise<WonFlowDemoPatientOverview>;

  listPractitioners(
    query?: DemoPractitionerQuery,
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockPractitioner>
  >;

  listAppointments(
    query?: DemoAppointmentQuery,
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockAppointment>
  >;

  listQueueEntries(
    query?: DemoQueueQuery,
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockQueueEntry>
  >;

  listAdmissions(
    query?: DemoAdmissionQuery,
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockAdmission>
  >;

  listInvoices(
    query?: DemoInvoiceQuery,
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockInvoiceSummary>
  >;
}

export interface CreateWonFlowMockServiceOptions
  extends MockAsyncAdapterOptions {
  scenario?:
    WonFlowDemoScenarioCode;
}

function normalizeSearch(
  value: string | undefined,
): string | undefined {
  const normalized =
    value
      ?.trim()
      .toLocaleLowerCase();

  return normalized === ""
    ? undefined
    : normalized;
}

function matchesSearch(
  search: string | undefined,
  ...values:
    Array<string | undefined>
): boolean {
  if (search === undefined) {
    return true;
  }

  return values.some(
    (value) =>
      value
        ?.toLocaleLowerCase()
        .includes(search) === true,
  );
}

function compareText(
  left: string,
  right: string,
): number {
  return left.localeCompare(
    right,
    "en",
    {
      sensitivity: "base",
    },
  );
}

function compareDateAscending(
  left: string,
  right: string,
): number {
  return (
    Date.parse(left) -
    Date.parse(right)
  );
}

function compareDateDescending(
  left: string,
  right: string,
): number {
  return (
    Date.parse(right) -
    Date.parse(left)
  );
}

function createNotFoundError(
  entityName: string,
  id: WonFlowId,
): WonFlowMockServiceError {
  return new WonFlowMockServiceError(
    "not-found",
    `${entityName} was not found: ${id}`,
  );
}

export class InMemoryWonFlowMockHospitalService
  implements WonFlowMockHospitalService {
  public constructor(
    private readonly repositories:
      WonFlowDemoRepositories,

    private readonly adapter:
      WonFlowMockAsyncAdapter,
  ) {}

  public getMetadata(
    signal?: AbortSignal,
  ): Promise<MockDatasetMetadata> {
    return this.adapter.execute(
      () =>
        structuredClone(
          this.repositories.metadata,
        ),

      {
        signal,
        operationName:
          "getMetadata",
      },
    );
  }

  public getOrganization(
    signal?: AbortSignal,
  ): Promise<MockOrganization> {
    return this.adapter.execute(
      () =>
        structuredClone(
          this.repositories.organization,
        ),

      {
        signal,
        operationName:
          "getOrganization",
      },
    );
  }

  public listBranches(
    signal?: AbortSignal,
  ): Promise<MockBranch[]> {
    return this.adapter.execute(
      () =>
        this.repositories.branches
          .findMany({
            limit: 100,
            sort: (
              left,
              right,
            ) =>
              compareText(
                left.name,
                right.name,
              ),
          })
          .items,

      {
        signal,
        operationName:
          "listBranches",
      },
    );
  }

  public getDashboardSummary(
    signal?: AbortSignal,
  ): Promise<WonFlowDemoDashboardSummary> {
    return this.adapter.execute(
      () => {
        const anchorDate =
          this.repositories.metadata
            .anchorDateTime
            .slice(0, 10);

        const todayAppointments =
          this.repositories
            .appointments
            .count(
              (appointment) =>
                appointment
                  .scheduledStartAt
                  .slice(0, 10) ===
                anchorDate,
            );

        const waitingQueueEntries =
          this.repositories
            .queueEntries
            .count(
              (entry) =>
                entry.status ===
                  "waiting" ||
                entry.status ===
                  "called",
            );

        const activeAdmissions =
          this.repositories
            .admissions
            .count();

        const outstandingInvoiceMinorUnits =
          this.repositories
            .invoices
            .all()
            .reduce(
              (
                total,
                invoice,
              ) =>
                total +
                invoice.balanceMinorUnits,
              0,
            );

        return {
          totalPatients:
            this.repositories
              .patients
              .count(),

          totalPractitioners:
            this.repositories
              .practitioners
              .count(),

          todayAppointments,
          waitingQueueEntries,
          activeAdmissions,

          outstandingInvoiceMinorUnits,
          currencyCode: "PKR",
        };
      },

      {
        signal,
        operationName:
          "getDashboardSummary",
      },
    );
  }

  public listPatients(
    query: DemoPatientQuery = {},
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockPatient>
  > {
    const search =
      normalizeSearch(
        query.search,
      );

    return this.adapter.execute(
      () =>
        this.repositories
          .patients
          .findMany({
            offset: query.offset,
            limit: query.limit,

            filter: (patient) =>
              (
                query.branchId ===
                  undefined ||
                patient.homeBranchId ===
                  query.branchId
              ) &&
              (
                query.administrativeSex ===
                  undefined ||
                patient.administrativeSex ===
                  query.administrativeSex
              ) &&
              matchesSearch(
                search,
                patient.displayName,
                patient.mrNumber,
                patient.phoneNumber,
                patient.emailAddress,
                patient.city,
              ),

            sort: (
              left,
              right,
            ) =>
              compareText(
                left.displayName,
                right.displayName,
              ),
          }),

      {
        signal,
        operationName:
          "listPatients",
      },
    );
  }

  public getPatientById(
    patientId: WonFlowId,
    signal?: AbortSignal,
  ): Promise<MockPatient> {
    return this.adapter.execute(
      () => {
        const patient =
          this.repositories
            .patients
            .findById(patientId);

        if (patient === undefined) {
          throw createNotFoundError(
            "Patient",
            patientId,
          );
        }

        return patient;
      },

      {
        signal,
        operationName:
          "getPatientById",
      },
    );
  }

  public getPatientOverview(
    patientId: WonFlowId,
    signal?: AbortSignal,
  ): Promise<WonFlowDemoPatientOverview> {
    return this.adapter.execute(
      () => {
        const patient =
          this.repositories
            .patients
            .findById(patientId);

        if (patient === undefined) {
          throw createNotFoundError(
            "Patient",
            patientId,
          );
        }

        return {
          patient,

          appointments:
            this.repositories
              .appointments
              .all()
              .filter(
                (appointment) =>
                  appointment.patientId ===
                  patientId,
              )
              .sort(
                (
                  left,
                  right,
                ) =>
                  compareDateDescending(
                    left.scheduledStartAt,
                    right.scheduledStartAt,
                  ),
              ),

          queueEntries:
            this.repositories
              .queueEntries
              .all()
              .filter(
                (entry) =>
                  entry.patientId ===
                  patientId,
              ),

          admissions:
            this.repositories
              .admissions
              .all()
              .filter(
                (admission) =>
                  admission.patientId ===
                  patientId,
              )
              .sort(
                (
                  left,
                  right,
                ) =>
                  compareDateDescending(
                    left.admittedAt,
                    right.admittedAt,
                  ),
              ),

          invoices:
            this.repositories
              .invoices
              .all()
              .filter(
                (invoice) =>
                  invoice.patientId ===
                  patientId,
              )
              .sort(
                (
                  left,
                  right,
                ) =>
                  compareDateDescending(
                    left.issuedAt,
                    right.issuedAt,
                  ),
              ),
        };
      },

      {
        signal,
        operationName:
          "getPatientOverview",
      },
    );
  }

  public listPractitioners(
    query:
      DemoPractitionerQuery = {},
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockPractitioner>
  > {
    const search =
      normalizeSearch(
        query.search,
      );

    return this.adapter.execute(
      () =>
        this.repositories
          .practitioners
          .findMany({
            offset: query.offset,
            limit: query.limit,

            filter:
              (practitioner) =>
                (
                  query.branchId ===
                    undefined ||
                  practitioner
                    .primaryBranchId ===
                    query.branchId
                ) &&
                (
                  query.specialtyCode ===
                    undefined ||
                  practitioner
                    .specialtyCode ===
                    query.specialtyCode
                ) &&
                (
                  query.operationalStatus ===
                    undefined ||
                  practitioner
                    .operationalStatus ===
                    query.operationalStatus
                ) &&
                matchesSearch(
                  search,
                  practitioner
                    .displayName,
                  practitioner
                    .employeeNumber,
                  practitioner
                    .specialtyName,
                ),

            sort:
              (
                left,
                right,
              ) =>
                compareText(
                  left.displayName,
                  right.displayName,
                ),
          }),

      {
        signal,
        operationName:
          "listPractitioners",
      },
    );
  }

  public listAppointments(
    query:
      DemoAppointmentQuery = {},
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockAppointment>
  > {
    const search =
      normalizeSearch(
        query.search,
      );

    return this.adapter.execute(
      () =>
        this.repositories
          .appointments
          .findMany({
            offset: query.offset,
            limit: query.limit,

            filter:
              (appointment) =>
                (
                  query.branchId ===
                    undefined ||
                  appointment.branchId ===
                    query.branchId
                ) &&
                (
                  query.patientId ===
                    undefined ||
                  appointment.patientId ===
                    query.patientId
                ) &&
                (
                  query.practitionerId ===
                    undefined ||
                  appointment
                    .practitionerId ===
                    query.practitionerId
                ) &&
                (
                  query.status ===
                    undefined ||
                  appointment.status ===
                    query.status
                ) &&
                matchesSearch(
                  search,
                  appointment
                    .appointmentNumber,
                  appointment
                    .serviceName,
                  appointment
                    .reasonForVisit,
                ),

            sort:
              (
                left,
                right,
              ) =>
                compareDateAscending(
                  left.scheduledStartAt,
                  right.scheduledStartAt,
                ),
          }),

      {
        signal,
        operationName:
          "listAppointments",
      },
    );
  }

  public listQueueEntries(
    query:
      DemoQueueQuery = {},
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockQueueEntry>
  > {
    const search =
      normalizeSearch(
        query.search,
      );

    return this.adapter.execute(
      () =>
        this.repositories
          .queueEntries
          .findMany({
            offset: query.offset,
            limit: query.limit,

            filter:
              (entry) =>
                (
                  query.branchId ===
                    undefined ||
                  entry.branchId ===
                    query.branchId
                ) &&
                (
                  query.patientId ===
                    undefined ||
                  entry.patientId ===
                    query.patientId
                ) &&
                (
                  query.practitionerId ===
                    undefined ||
                  entry.practitionerId ===
                    query.practitionerId
                ) &&
                (
                  query.status ===
                    undefined ||
                  entry.status ===
                    query.status
                ) &&
                matchesSearch(
                  search,
                  entry.tokenNumber,
                ),

            sort:
              (
                left,
                right,
              ) =>
                left.queuePosition -
                right.queuePosition,
          }),

      {
        signal,
        operationName:
          "listQueueEntries",
      },
    );
  }

  public listAdmissions(
    query:
      DemoAdmissionQuery = {},
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockAdmission>
  > {
    const search =
      normalizeSearch(
        query.search,
      );

    return this.adapter.execute(
      () =>
        this.repositories
          .admissions
          .findMany({
            offset: query.offset,
            limit: query.limit,

            filter:
              (admission) =>
                (
                  query.branchId ===
                    undefined ||
                  admission.branchId ===
                    query.branchId
                ) &&
                (
                  query.patientId ===
                    undefined ||
                  admission.patientId ===
                    query.patientId
                ) &&
                (
                  query.practitionerId ===
                    undefined ||
                  admission
                    .attendingPractitionerId ===
                    query.practitionerId
                ) &&
                (
                  query.status ===
                    undefined ||
                  admission.status ===
                    query.status
                ) &&
                matchesSearch(
                  search,
                  admission
                    .admissionNumber,
                  admission.wardName,
                  admission.roomName,
                  admission.bedName,
                ),

            sort:
              (
                left,
                right,
              ) =>
                compareDateDescending(
                  left.admittedAt,
                  right.admittedAt,
                ),
          }),

      {
        signal,
        operationName:
          "listAdmissions",
      },
    );
  }

  public listInvoices(
    query:
      DemoInvoiceQuery = {},
    signal?: AbortSignal,
  ): Promise<
    MockRepositoryPage<MockInvoiceSummary>
  > {
    const search =
      normalizeSearch(
        query.search,
      );

    return this.adapter.execute(
      () =>
        this.repositories
          .invoices
          .findMany({
            offset: query.offset,
            limit: query.limit,

            filter:
              (invoice) =>
                (
                  query.branchId ===
                    undefined ||
                  invoice.branchId ===
                    query.branchId
                ) &&
                (
                  query.patientId ===
                    undefined ||
                  invoice.patientId ===
                    query.patientId
                ) &&
                (
                  query.status ===
                    undefined ||
                  invoice.status ===
                    query.status
                ) &&
                matchesSearch(
                  search,
                  invoice.invoiceNumber,
                ),

            sort:
              (
                left,
                right,
              ) =>
                compareDateDescending(
                  left.issuedAt,
                  right.issuedAt,
                ),
          }),

      {
        signal,
        operationName:
          "listInvoices",
      },
    );
  }
}

export function createWonFlowMockHospitalService(
  options:
    CreateWonFlowMockServiceOptions = {},
): WonFlowMockHospitalService {
  const scenario =
    options.scenario ??
    "hospital-day";

  const dataset =
    createWonFlowDemoScenario(
      scenario,
    );

  const repositories =
    createWonFlowDemoRepositories(
      dataset,
    );

  const adapter =
    createWonFlowMockAsyncAdapter({
      seed:
        options.seed ??
        `${scenario}-service-v1`,

      minimumLatencyMs:
        options.minimumLatencyMs,

      maximumLatencyMs:
        options.maximumLatencyMs,

      failureRate:
        options.failureRate,
    });

  return new InMemoryWonFlowMockHospitalService(
    repositories,
    adapter,
  );
}