import type { AppointmentStatus } from "@/lib/api/appointments";

/**
 * Filter state for the appointment directory. Filtering, sorting and
 * statistics all evaluate server-side (@/lib/api/appointments) — this
 * module only shapes what the filter controls need.
 */

export type AppointmentDirectoryStatusFilter =
  | "all"
  | AppointmentStatus;

export type AppointmentDirectorySort =
  | "time-ascending"
  | "time-descending";

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
