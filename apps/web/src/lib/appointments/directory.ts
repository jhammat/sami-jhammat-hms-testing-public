import type {
  MockBranch,
  MockPractitioner,
} from "@wonflow/mock-data";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import type {
  DemoAppointmentBooking,
  DemoAppointmentStatus,
} from "./booking";

export type AppointmentDirectoryStatusFilter =
  | "all"
  | DemoAppointmentStatus;

export type AppointmentDirectorySort =
  | "time-ascending"
  | "time-descending"
  | "patient-ascending"
  | "recently-created";

export interface AppointmentDirectoryFilters {
  query: string;

  branchId: string;
  practitionerId: string;

  status:
    AppointmentDirectoryStatusFilter;

  appointmentDate: string;

  sort:
    AppointmentDirectorySort;
}

export interface AppointmentDirectoryStatistics {
  totalAppointments: number;
  filteredAppointments: number;

  bookedAppointments: number;
  checkedInAppointments: number;

  completedAppointments: number;
  cancelledAppointments: number;
}

export function createInitialAppointmentDirectoryFilters():
  AppointmentDirectoryFilters {
  return {
    query: "",

    branchId: "all",
    practitionerId: "all",

    status: "all",

    appointmentDate: "",

    sort:
      "time-ascending",
  };
}

function normalizeSearchText(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase();
}

export function filterAndSortDemoAppointments(
  bookings:
    readonly DemoAppointmentBooking[],

  patients:
    readonly DemoPatientRegistrationResult[],

  branches:
    readonly MockBranch[],

  practitioners:
    readonly MockPractitioner[],

  filters:
    AppointmentDirectoryFilters,
): DemoAppointmentBooking[] {
  const patientsById =
    new Map(
      patients.map(
        (patient) => [
          patient.id,
          patient,
        ],
      ),
    );

  const branchesById =
    new Map(
      branches.map(
        (branch) => [
          branch.id,
          branch,
        ],
      ),
    );

  const practitionersById =
    new Map(
      practitioners.map(
        (practitioner) => [
          practitioner.id,
          practitioner,
        ],
      ),
    );

  const normalizedQuery =
    normalizeSearchText(
      filters.query,
    );

  const filteredBookings =
    bookings.filter(
      (booking) => {
        const patient =
          patientsById.get(
            booking.patientId,
          );

        const branch =
          branchesById.get(
            booking.branchId,
          );

        const practitioner =
          practitionersById.get(
            booking.practitionerId,
          );

        if (
          normalizedQuery !== ""
        ) {
          const searchableValues = [
            booking
              .appointmentNumber,

            booking.serviceCode,
            booking.serviceName,

            booking.reasonForVisit,

            patient
              ?.displayName ??
              "",

            patient
              ?.mrNumber ??
              "",

            patient
              ?.draft
              .cnicNumber ??
              "",

            patient
              ?.draft
              .mobileNumber ??
              "",

            branch?.name ?? "",

            practitioner
              ?.displayName ??
              "",

            practitioner
              ?.specialtyName ??
              "",
          ]
            .join(" ")
            .toLocaleLowerCase();

          const compactQuery =
            normalizedQuery.replace(
              /[\s\-()]/g,
              "",
            );

          const compactSearchableValues =
            searchableValues.replace(
              /[\s\-()]/g,
              "",
            );

          if (
            !searchableValues.includes(
              normalizedQuery,
            ) &&
            !compactSearchableValues.includes(
              compactQuery,
            )
          ) {
            return false;
          }
        }

        if (
          filters.branchId !==
            "all" &&
          booking.branchId !==
            filters.branchId
        ) {
          return false;
        }

        if (
          filters.practitionerId !==
            "all" &&
          booking.practitionerId !==
            filters.practitionerId
        ) {
          return false;
        }

        if (
          filters.status !==
            "all" &&
          booking.status !==
            filters.status
        ) {
          return false;
        }

        if (
          filters.appointmentDate !==
            "" &&
          booking.appointmentDate !==
            filters.appointmentDate
        ) {
          return false;
        }

        return true;
      },
    );

  return [
    ...filteredBookings,
  ].sort(
    (
      left,
      right,
    ) => {
      switch (filters.sort) {
        case "time-ascending":
          return (
            new Date(
              left
                .scheduledStartAt,
            ).getTime() -
            new Date(
              right
                .scheduledStartAt,
            ).getTime()
          );

        case "time-descending":
          return (
            new Date(
              right
                .scheduledStartAt,
            ).getTime() -
            new Date(
              left
                .scheduledStartAt,
            ).getTime()
          );

        case "patient-ascending": {
          const leftPatient =
            patientsById.get(
              left.patientId,
            );

          const rightPatient =
            patientsById.get(
              right.patientId,
            );

          return (
            leftPatient
              ?.displayName ??
            ""
          ).localeCompare(
            rightPatient
              ?.displayName ??
            "",
            "en",
            {
              sensitivity:
                "base",
            },
          );
        }

        case "recently-created":
          return (
            new Date(
              right.createdAt,
            ).getTime() -
            new Date(
              left.createdAt,
            ).getTime()
          );
      }
    },
  );
}

export function calculateAppointmentDirectoryStatistics(
  bookings:
    readonly DemoAppointmentBooking[],

  filteredBookings:
    readonly DemoAppointmentBooking[],
): AppointmentDirectoryStatistics {
  return {
    totalAppointments:
      bookings.length,

    filteredAppointments:
      filteredBookings.length,

    bookedAppointments:
      bookings.filter(
        (booking) =>
          booking.status ===
          "booked",
      ).length,

    checkedInAppointments:
      bookings.filter(
        (booking) =>
          booking.status ===
          "checked-in",
      ).length,

    completedAppointments:
      bookings.filter(
        (booking) =>
          booking.status ===
          "completed",
      ).length,

    cancelledAppointments:
      bookings.filter(
        (booking) =>
          booking.status ===
          "cancelled",
      ).length,
  };
}