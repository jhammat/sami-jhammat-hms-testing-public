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
  WonFlowDemoDataset,
} from "../types";

import {
  InMemoryMockRepository,
} from "./repository";

export interface WonFlowDemoRepositories {
  metadata: MockDatasetMetadata;
  organization: MockOrganization;

  branches:
    InMemoryMockRepository<MockBranch>;

  practitioners:
    InMemoryMockRepository<MockPractitioner>;

  patients:
    InMemoryMockRepository<MockPatient>;

  appointments:
    InMemoryMockRepository<MockAppointment>;

  queueEntries:
    InMemoryMockRepository<MockQueueEntry>;

  admissions:
    InMemoryMockRepository<MockAdmission>;

  invoices:
    InMemoryMockRepository<MockInvoiceSummary>;
}

function cloneFixture<TValue>(
  value: TValue,
): TValue {
  return structuredClone(value);
}

export function createWonFlowDemoRepositories(
  dataset: WonFlowDemoDataset,
): WonFlowDemoRepositories {
  return {
    metadata:
      cloneFixture(
        dataset.metadata,
      ),

    organization:
      cloneFixture(
        dataset.organization,
      ),

    branches:
      new InMemoryMockRepository(
        dataset.branches,
      ),

    practitioners:
      new InMemoryMockRepository(
        dataset.practitioners,
      ),

    patients:
      new InMemoryMockRepository(
        dataset.patients,
      ),

    appointments:
      new InMemoryMockRepository(
        dataset.appointments,
      ),

    queueEntries:
      new InMemoryMockRepository(
        dataset.queueEntries,
      ),

    admissions:
      new InMemoryMockRepository(
        dataset.admissions,
      ),

    invoices:
      new InMemoryMockRepository(
        dataset.invoices,
      ),
  };
}