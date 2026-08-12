import {
  createWonFlowDemoDataset,
} from "./generators/demo-dataset";

import type {
  WonFlowDemoDataset,
  WonFlowDemoScenarioDefinition,
} from "./types";

export const WONFLOW_DEMO_SCENARIOS:
  readonly WonFlowDemoScenarioDefinition[] = [
    {
      code: "hospital-day",
      name: "Standard Hospital Day",
      description:
        "Balanced appointments, queues, inpatient activity and billing records.",

      options: {
        seed:
          "wonflow-hospital-day-v1",

        patientCount: 24,
        practitionerCount: 8,
        appointmentCount: 18,
        queueEntryCount: 10,
        admissionCount: 6,
        invoiceCount: 12,
      },
    },
    {
      code: "busy-opd",
      name: "Busy OPD Morning",
      description:
        "Higher appointment and queue volumes for reception and doctor-workspace testing.",

      options: {
        seed:
          "wonflow-busy-opd-v1",

        patientCount: 40,
        practitionerCount: 10,
        appointmentCount: 32,
        queueEntryCount: 24,
        admissionCount: 4,
        invoiceCount: 20,
      },
    },
    {
      code: "inpatient-focus",
      name: "Inpatient and Discharge Day",
      description:
        "A demonstration scenario with greater inpatient and discharge activity.",

      options: {
        seed:
          "wonflow-inpatient-focus-v1",

        patientCount: 30,
        practitionerCount: 9,
        appointmentCount: 12,
        queueEntryCount: 6,
        admissionCount: 14,
        invoiceCount: 16,
      },
    },
  ];

export type WonFlowDemoScenarioCode =
  | "hospital-day"
  | "busy-opd"
  | "inpatient-focus";

export function getWonFlowDemoScenarioDefinition(
  code: WonFlowDemoScenarioCode,
): WonFlowDemoScenarioDefinition {
  const definition =
    WONFLOW_DEMO_SCENARIOS.find(
      (scenario) =>
        scenario.code === code,
    );

  if (definition === undefined) {
    throw new Error(
      `Unknown WonFlow demonstration scenario: ${code}`,
    );
  }

  return definition;
}

export function createWonFlowDemoScenario(
  code: WonFlowDemoScenarioCode,
): WonFlowDemoDataset {
  const definition =
    getWonFlowDemoScenarioDefinition(
      code,
    );

  return createWonFlowDemoDataset(
    definition.options,
  );
}