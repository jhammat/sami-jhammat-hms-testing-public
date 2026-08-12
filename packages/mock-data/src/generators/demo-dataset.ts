import type {
  IsoDateTime,
} from "@wonflow/contracts";

import {
  addDaysToIsoDateTime,
  addMinutesToIsoDateTime,
  createDateOfBirth,
  WONFLOW_DEMO_ANCHOR_DATE_TIME,
} from "../core/demo-clock";

import {
  createMockAdmissionNumber,
  createMockAppointmentNumber,
  createMockEmployeeNumber,
  createMockId,
  createMockInvoiceNumber,
  createMockMrNumber,
} from "../core/identifiers";

import {
  createSeededRandom,
} from "../core/seeded-random";

import {
  MOCK_BLOOD_GROUPS,
  MOCK_CITIES,
  MOCK_FAMILY_NAMES,
  MOCK_FEMALE_GIVEN_NAMES,
  MOCK_MALE_GIVEN_NAMES,
  MOCK_SERVICES,
  MOCK_SPECIALTIES,
  MOCK_VISIT_REASONS,
  MOCK_WARDS,
} from "../data/dictionaries";

import type {
  MockAdmission,
  MockAppointment,
  MockAppointmentStatus,
  MockBranch,
  MockDoctorOperationalStatus,
  MockInvoiceStatus,
  MockInvoiceSummary,
  MockPatient,
  MockPractitioner,
  MockQueueEntry,
  MockQueueStatus,
  WonFlowDemoDataset,
  WonFlowDemoDatasetOptions,
} from "../types";

const DEFAULT_OPTIONS = {
  seed: "wonflow-hospital-day-v1",
  locale: "en-PK",
  patientCount: 24,
  practitionerCount: 8,
  appointmentCount: 18,
  queueEntryCount: 10,
  admissionCount: 6,
  invoiceCount: 12,
} as const;

function positiveCount(
  value: number | undefined,
  fallback: number,
): number {
  if (
    value === undefined ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    return fallback;
  }

  return value;
}

function createEmailAddress(
  givenName: string,
  familyName: string,
  sequence: number,
): string {
  const localPart = [
    givenName,
    familyName,
    sequence,
  ]
    .join(".")
    .toLowerCase();

  return `${localPart}@patients.wonflow.example`;
}

function createFictionalPhoneNumber(
  sequence: number,
): string {
  return `+92 000 000 ${String(sequence).padStart(4, "0")}`;
}

export function createWonFlowDemoDataset(
  suppliedOptions: WonFlowDemoDatasetOptions = {},
): WonFlowDemoDataset {
  const options = {
    seed:
      suppliedOptions.seed ??
      DEFAULT_OPTIONS.seed,

    locale:
      suppliedOptions.locale ??
      DEFAULT_OPTIONS.locale,

    patientCount: positiveCount(
      suppliedOptions.patientCount,
      DEFAULT_OPTIONS.patientCount,
    ),

    practitionerCount: positiveCount(
      suppliedOptions.practitionerCount,
      DEFAULT_OPTIONS.practitionerCount,
    ),

    appointmentCount: positiveCount(
      suppliedOptions.appointmentCount,
      DEFAULT_OPTIONS.appointmentCount,
    ),

    queueEntryCount: positiveCount(
      suppliedOptions.queueEntryCount,
      DEFAULT_OPTIONS.queueEntryCount,
    ),

    admissionCount: positiveCount(
      suppliedOptions.admissionCount,
      DEFAULT_OPTIONS.admissionCount,
    ),

    invoiceCount: positiveCount(
      suppliedOptions.invoiceCount,
      DEFAULT_OPTIONS.invoiceCount,
    ),
  };

  const random =
    createSeededRandom(options.seed);

  const generatedAt =
    WONFLOW_DEMO_ANCHOR_DATE_TIME;

  const organization = {
    id: createMockId("organization", 1),
    code: "WF-DEMO-ORG",
    name: "WonFlow Demo Health Network",
    shortName: "WonFlow Demo",
    fictional: true,
    defaultLocale: options.locale,
    defaultCurrencyCode: "PKR",
    createdAt: generatedAt,
  } as const;

  const branchDefinitions = [
    {
      code: "WF-DEMO-CENTRAL",
      name: "WonFlow Central Demo Hospital",
      city: "Islamabad",
    },
    {
      code: "WF-DEMO-NORTH",
      name: "WonFlow North Demo Medical Centre",
      city: "Rawalpindi",
    },
    {
      code: "WF-DEMO-WEST",
      name: "WonFlow West Demo Clinic",
      city: "Peshawar",
    },
  ] as const;

  const branches: MockBranch[] =
    branchDefinitions.map(
      (branchDefinition, index) => ({
        id: createMockId(
          "branch",
          index + 1,
        ),

        organizationId:
          organization.id,

        code:
          branchDefinition.code,

        name:
          branchDefinition.name,

        city:
          branchDefinition.city,

        fictional: true,
        active: true,

        createdAt: generatedAt,
      }),
    );

  const practitioners: MockPractitioner[] =
    Array.from(
      {
        length:
          options.practitionerCount,
      },
      (_, index) => {
        const administrativeSex =
          index % 2 === 0
            ? "female"
            : "male";

        const givenName =
          administrativeSex === "female"
            ? random.pick(
                MOCK_FEMALE_GIVEN_NAMES,
              )
            : random.pick(
                MOCK_MALE_GIVEN_NAMES,
              );

        const familyName =
          random.pick(
            MOCK_FAMILY_NAMES,
          );

        const specialty =
          MOCK_SPECIALTIES[
            index %
            MOCK_SPECIALTIES.length
          ];

        const branch =
          branches[
            index %
            branches.length
          ];

        if (
          specialty === undefined ||
          branch === undefined
        ) {
          throw new Error(
            "Unable to generate practitioner fixtures.",
          );
        }

        const statuses:
          readonly MockDoctorOperationalStatus[] = [
            "available",
            "in-consultation",
            "available",
            "on-break",
            "in-procedure",
            "off-duty",
          ];

        const operationalStatus =
          statuses[
            index %
            statuses.length
          ];

        if (
          operationalStatus === undefined
        ) {
          throw new Error(
            "Unable to generate practitioner status.",
          );
        }

        return {
          id: createMockId(
            "practitioner",
            index + 1,
          ),

          organizationId:
            organization.id,

          primaryBranchId:
            branch.id,

          employeeNumber:
            createMockEmployeeNumber(
              index + 1,
            ),

          displayName:
            `Dr. ${givenName} ${familyName}`,

          givenName,
          familyName,

          specialtyCode:
            specialty.code,

          specialtyName:
            specialty.name,

          roleCodes: [
            "doctor",
            "practitioner",
          ],

          operationalStatus,

          fictional: true,

          createdAt: generatedAt,
        };
      },
    );

  const patients: MockPatient[] =
    Array.from(
      {
        length:
          options.patientCount,
      },
      (_, index) => {
        const administrativeSex =
          index % 2 === 0
            ? "female"
            : "male";

        const givenName =
          administrativeSex === "female"
            ? random.pick(
                MOCK_FEMALE_GIVEN_NAMES,
              )
            : random.pick(
                MOCK_MALE_GIVEN_NAMES,
              );

        const familyName =
          random.pick(
            MOCK_FAMILY_NAMES,
          );

        const ageYears =
          random.integer(2, 82);

        const branch =
          random.pick(branches);

        const emergencyContactGivenName =
          random.pick(
            administrativeSex === "female"
              ? MOCK_MALE_GIVEN_NAMES
              : MOCK_FEMALE_GIVEN_NAMES,
          );

        return {
          id: createMockId(
            "patient",
            index + 1,
          ),

          organizationId:
            organization.id,

          homeBranchId:
            branch.id,

          mrNumber:
            createMockMrNumber(
              index + 1,
            ),

          displayName:
            `${givenName} ${familyName}`,

          givenName,
          familyName,

          administrativeSex,

          dateOfBirth:
            createDateOfBirth(
              ageYears,
              random.integer(0, 11),
              random.integer(1, 28),
            ),

          ageYears,

          phoneNumber:
            createFictionalPhoneNumber(
              index + 1,
            ),

          emailAddress:
            createEmailAddress(
              givenName,
              familyName,
              index + 1,
            ),

          city:
            random.pick(MOCK_CITIES),

          bloodGroup:
            random.pick(
              MOCK_BLOOD_GROUPS,
            ),

          emergencyContactName:
            `${emergencyContactGivenName} ${familyName}`,

          fictional: true,

          createdAt:
            addDaysToIsoDateTime(
              generatedAt,
              -random.integer(
                1,
                365,
              ),
            ),
        };
      },
    );

  const appointmentStatuses:
    readonly MockAppointmentStatus[] = [
      "confirmed",
      "arrived",
      "checked-in",
      "in-consultation",
      "completed",
      "booked",
      "no-show",
      "cancelled",
    ];

  const appointments: MockAppointment[] =
    Array.from(
      {
        length:
          options.appointmentCount,
      },
      (_, index) => {
        const patient =
          patients[
            index %
            patients.length
          ];

        const practitioner =
          practitioners[
            index %
            practitioners.length
          ];

        if (
          patient === undefined ||
          practitioner === undefined
        ) {
          throw new Error(
            "Patients and practitioners are required before appointments can be generated.",
          );
        }

        const branch =
          branches.find(
            (candidate) =>
              candidate.id ===
              practitioner.primaryBranchId,
          ) ?? branches[0];

        const service =
          MOCK_SERVICES[
            index %
            MOCK_SERVICES.length
          ];

        const status =
          appointmentStatuses[
            index %
            appointmentStatuses.length
          ];

        if (
          branch === undefined ||
          service === undefined ||
          status === undefined
        ) {
          throw new Error(
            "Unable to generate appointment fixtures.",
          );
        }

        const scheduledStartAt =
          addMinutesToIsoDateTime(
            generatedAt,
            30 + index * 20,
          );

        return {
          id: createMockId(
            "appointment",
            index + 1,
          ),

          organizationId:
            organization.id,

          branchId:
            branch.id,

          patientId:
            patient.id,

          practitionerId:
            practitioner.id,

          appointmentNumber:
            createMockAppointmentNumber(
              index + 1,
            ),

          serviceCode:
            service.code,

          serviceName:
            service.name,

          status,

          scheduledStartAt,

          scheduledEndAt:
            addMinutesToIsoDateTime(
              scheduledStartAt,
              20,
            ),

          reasonForVisit:
            random.pick(
              MOCK_VISIT_REASONS,
            ),

          fictional: true,

          createdAt:
            addDaysToIsoDateTime(
              generatedAt,
              -random.integer(1, 20),
            ),
        };
      },
    );

  const queueStatuses:
    readonly MockQueueStatus[] = [
      "waiting",
      "waiting",
      "called",
      "serving",
      "completed",
    ];

  const availableQueueCount =
    Math.min(
      options.queueEntryCount,
      appointments.length,
    );

  const queueEntries: MockQueueEntry[] =
    Array.from(
      {
        length:
          availableQueueCount,
      },
      (_, index) => {
        const appointment =
          appointments[index];

        const status =
          queueStatuses[
            index %
            queueStatuses.length
          ];

        if (
          appointment === undefined ||
          status === undefined
        ) {
          throw new Error(
            "Unable to generate queue fixtures.",
          );
        }

        const arrivedAt =
          addMinutesToIsoDateTime(
            appointment.scheduledStartAt,
            -random.integer(5, 25),
          );

        return {
          id: createMockId(
            "queue-entry",
            index + 1,
          ),

          organizationId:
            appointment.organizationId,

          branchId:
            appointment.branchId,

          appointmentId:
            appointment.id,

          patientId:
            appointment.patientId,

          practitionerId:
            appointment.practitionerId,

          tokenNumber:
            `A-${String(index + 1).padStart(3, "0")}`,

          queuePosition:
            index + 1,

          status,

          arrivedAt,

          calledAt:
            status === "called" ||
            status === "serving" ||
            status === "completed"
              ? addMinutesToIsoDateTime(
                  arrivedAt,
                  random.integer(5, 20),
                )
              : undefined,

          fictional: true,
        };
      },
    );

  const availableAdmissionCount =
    Math.min(
      options.admissionCount,
      patients.length,
      practitioners.length,
    );

  const admissionStatuses:
    readonly MockAdmission["status"][] = [
      "admitted",
      "admitted",
      "transfer-pending",
      "discharge-planning",
      "discharge-ready",
      "awaiting-bed",
    ];

  const admissions: MockAdmission[] =
    Array.from(
      {
        length:
          availableAdmissionCount,
      },
      (_, index) => {
        const patient =
          patients[index];

        const practitioner =
          practitioners[
            index %
            practitioners.length
          ];

        const ward =
          MOCK_WARDS[
            index %
            MOCK_WARDS.length
          ];

        const status =
          admissionStatuses[
            index %
            admissionStatuses.length
          ];

        if (
          patient === undefined ||
          practitioner === undefined ||
          ward === undefined ||
          status === undefined
        ) {
          throw new Error(
            "Unable to generate inpatient fixtures.",
          );
        }

        const admittedAt =
          addDaysToIsoDateTime(
            generatedAt,
            -random.integer(1, 8),
          );

        return {
          id: createMockId(
            "admission",
            index + 1,
          ),

          organizationId:
            organization.id,

          branchId:
            patient.homeBranchId,

          patientId:
            patient.id,

          attendingPractitionerId:
            practitioner.id,

          admissionNumber:
            createMockAdmissionNumber(
              index + 1,
            ),

          wardName:
            ward.wardName,

          roomName:
            ward.roomName,

          bedName:
            ward.bedName,

          status,

          admittedAt,

          expectedDischargeAt:
            addDaysToIsoDateTime(
              admittedAt,
              random.integer(2, 10),
            ),

          fictional: true,
        };
      },
    );

  const invoiceStatuses:
    readonly MockInvoiceStatus[] = [
      "issued",
      "partially-paid",
      "paid",
      "overdue",
      "draft",
    ];

  const availableInvoiceCount =
    Math.min(
      options.invoiceCount,
      patients.length,
    );

  const invoices: MockInvoiceSummary[] =
    Array.from(
      {
        length:
          availableInvoiceCount,
      },
      (_, index) => {
        const patient =
          patients[index];

        const status =
          invoiceStatuses[
            index %
            invoiceStatuses.length
          ];

        if (
          patient === undefined ||
          status === undefined
        ) {
          throw new Error(
            "Unable to generate invoice fixtures.",
          );
        }

        const totalMinorUnits =
          random.integer(
            150_000,
            8_500_000,
          );

        const paidMinorUnits =
          status === "paid"
            ? totalMinorUnits
            : status === "partially-paid"
              ? Math.floor(
                  totalMinorUnits * 0.5,
                )
              : 0;

        return {
          id: createMockId(
            "invoice",
            index + 1,
          ),

          organizationId:
            organization.id,

          branchId:
            patient.homeBranchId,

          patientId:
            patient.id,

          invoiceNumber:
            createMockInvoiceNumber(
              index + 1,
            ),

          status,

          currencyCode: "PKR",

          totalMinorUnits,
          paidMinorUnits,

          balanceMinorUnits:
            totalMinorUnits -
            paidMinorUnits,

          issuedAt:
            addDaysToIsoDateTime(
              generatedAt,
              -random.integer(0, 30),
            ),

          fictional: true,
        };
      },
    );

  return {
    metadata: {
      id: createMockId(
        "dataset",
        1,
      ),

      name:
        "WonFlow Hospital Day Demo",

      description:
        "Deterministic fictional hospital data for interface development and stakeholder demonstrations.",

      version: "1.0.0",
      seed: options.seed,

      fictional: true,

      locale: options.locale,

      generatedAt,
      anchorDateTime:
        WONFLOW_DEMO_ANCHOR_DATE_TIME,

      recordCounts: {
        organizations: 1,
        branches:
          branches.length,
        practitioners:
          practitioners.length,
        patients:
          patients.length,
        appointments:
          appointments.length,
        queueEntries:
          queueEntries.length,
        admissions:
          admissions.length,
        invoices:
          invoices.length,
      },
    },

    organization,
    branches,
    practitioners,
    patients,
    appointments,
    queueEntries,
    admissions,
    invoices,
  };
}
