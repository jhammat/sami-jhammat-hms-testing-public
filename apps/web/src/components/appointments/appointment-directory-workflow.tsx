"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  MockBranch,
  MockPractitioner,
} from "@wonflow/mock-data";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";

import {
  WonFlowAsyncDataBoundary,
  WonFlowEmptyState,
  wonflowConfirm,
} from "@/components/feedback";

import {
  WonFlowActionBar,
  WonFlowActionButton,
  WonFlowKpiCard,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  calculateAppointmentDirectoryStatistics,
  createInitialAppointmentDirectoryFilters,
  filterAndSortDemoAppointments,
  readDemoAppointmentBookings,
  rescheduleDemoAppointmentBooking,
  updateDemoAppointmentBookingStatus,
} from "@/lib/appointments";

import {
  getDemoDoctorBookingAvailability,
} from "@/lib/doctor-booking";

import {
  DOCTOR_SCHEDULES_CHANGED_EVENT,
} from "@/lib/doctor-schedules";

import type {
  AppointmentDirectoryFilters,
  AppointmentDirectorySort,
  AppointmentDirectoryStatusFilter,
  DemoAppointmentBooking,
} from "@/lib/appointments";

import {
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import {
  createDemoQueueEntryFromAppointment,
} from "@/lib/queue";

import {
  formatWonFlowDashboardDateTime,
  formatWonFlowDashboardMoney,
  formatWonFlowDashboardTime,
} from "@/lib/dashboard";

const INPUT_CLASS_NAME = [
  "h-11 w-full",
  "rounded-xl border",
  "border-slate-200",
  "bg-white px-3.5",
  "text-sm text-slate-900",
  "outline-none transition",
  "placeholder:text-slate-400",
  "focus:border-blue-400",
  "focus:ring-2",
  "focus:ring-blue-100",
].join(" ");

type AppointmentViewMode =
  | "list"
  | "calendar";

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        x="3"
        y="5"
      />

      <path
        d="M7 3v4M17 3v4M3 10h18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="m8 12 2.6 2.6L16.5 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M20 7v5h-5M4 17v-5h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />

      <path
        d="M6.1 9a7 7 0 0 1 11.7-2.4L20 12M4 12l2.2 5.4A7 7 0 0 0 17.9 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function humanizeValue(
  value: string,
): string {
  return value
    .replaceAll("-", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

function getStatusClassName(
  status:
    DemoAppointmentBooking["status"],
): string {
  switch (status) {
    case "booked":
      return "bg-blue-50 text-blue-700 ring-blue-100";

    case "checked-in":
      return "bg-amber-50 text-amber-700 ring-amber-100";

    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";

    case "cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-100";

    case "no-show":
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function StatusBadge({
  status,
}: {
  status:
    DemoAppointmentBooking["status"];
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full",
        "px-2.5 py-1",
        "text-[11px] font-bold",
        "ring-1",
        getStatusClassName(
          status,
        ),
      ].join(" ")}
    >
      {humanizeValue(
        status,
      )}
    </span>
  );
}

function formatDateInput(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createMonthCells(
  monthDate: Date,
): {
  date: Date;
  dateKey: string;
  currentMonth: boolean;
}[] {
  const firstDay =
    new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
    );

  const gridStart =
    new Date(firstDay);

  gridStart.setDate(
    firstDay.getDate() -
      firstDay.getDay(),
  );

  return Array.from(
    {
      length: 42,
    },
    (
      _value,
      index,
    ) => {
      const date =
        new Date(
          gridStart,
        );

      date.setDate(
        gridStart.getDate() +
          index,
      );

      return {
        date,

        dateKey:
          formatDateInput(
            date,
          ),

        currentMonth:
          date.getMonth() ===
          monthDate.getMonth(),
      };
    },
  );
}

interface AppointmentDirectoryContentProps {
  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function AppointmentDirectoryContent({
  branches,
  practitioners,
}: AppointmentDirectoryContentProps) {
  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    bookings,
    setBookings,
  ] = useState<
    DemoAppointmentBooking[]
  >([]);

  const [
    filters,
    setFilters,
  ] = useState<
    AppointmentDirectoryFilters
  >(
    createInitialAppointmentDirectoryFilters,
  );

  const [
    viewMode,
    setViewMode,
  ] = useState<
    AppointmentViewMode
  >("list");

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(
    () => {
      const currentDate =
        new Date();

      return new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
    },
  );

  const [
    rescheduleBookingId,
    setRescheduleBookingId,
  ] = useState("");

  const [
    rescheduleDate,
    setRescheduleDate,
  ] = useState("");

  const [
    rescheduleSlot,
    setRescheduleSlot,
  ] = useState("");

  const [
    availabilityRevision,
    setAvailabilityRevision,
  ] = useState(0);

  const [
    actionMessage,
    setActionMessage,
  ] = useState<
    string |
    undefined
  >();

  function reloadLocalData() {
    setPatients(
      readDemoPatientRegistrations(),
    );

    setBookings(
      readDemoAppointmentBookings(),
    );
  }

  useEffect(() => {
    const reloadAvailability =
      () => {
        setAvailabilityRevision(
          (current) =>
            current + 1,
        );
      };

    queueMicrotask(
      reloadLocalData,
    );

    window.addEventListener(
      "wonflow:demo-patients-changed",
      reloadLocalData,
    );

    window.addEventListener(
      "wonflow:demo-appointments-changed",
      reloadLocalData,
    );

    window.addEventListener(
      DOCTOR_SCHEDULES_CHANGED_EVENT,
      reloadAvailability,
    );

    window.addEventListener(
      "storage",
      reloadLocalData,
    );

    window.addEventListener(
      "storage",
      reloadAvailability,
    );

    return () => {
      window.removeEventListener(
        "wonflow:demo-patients-changed",
        reloadLocalData,
      );

      window.removeEventListener(
        "wonflow:demo-appointments-changed",
        reloadLocalData,
      );

      window.removeEventListener(
        DOCTOR_SCHEDULES_CHANGED_EVENT,
        reloadAvailability,
      );

      window.removeEventListener(
        "storage",
        reloadLocalData,
      );

      window.removeEventListener(
        "storage",
        reloadAvailability,
      );
    };
  }, []);

  const patientsById =
    useMemo(
      () =>
        new Map(
          patients.map(
            (patient) => [
              patient.id,
              patient,
            ],
          ),
        ),
      [patients],
    );

  const branchesById =
    useMemo(
      () =>
        new Map(
          branches.map(
            (branch) => [
              branch.id,
              branch,
            ],
          ),
        ),
      [branches],
    );

  const practitionersById =
    useMemo(
      () =>
        new Map(
          practitioners.map(
            (practitioner) => [
              practitioner.id,
              practitioner,
            ],
          ),
        ),
      [practitioners],
    );

  const filteredBookings =
    useMemo(
      () =>
        filterAndSortDemoAppointments(
          bookings,
          patients,
          branches,
          practitioners,
          filters,
        ),
      [
        bookings,
        branches,
        filters,
        patients,
        practitioners,
      ],
    );

  const statistics =
    useMemo(
      () =>
        calculateAppointmentDirectoryStatistics(
          bookings,
          filteredBookings,
        ),
      [
        bookings,
        filteredBookings,
      ],
    );

  const calendarCells =
    useMemo(
      () =>
        createMonthCells(
          calendarMonth,
        ),
      [calendarMonth],
    );

  const bookingCountByDate =
    useMemo(() => {
      const countMap =
        new Map<
          string,
          number
        >();

      bookings.forEach(
        (booking) => {
          countMap.set(
            booking.appointmentDate,

            (
              countMap.get(
                booking.appointmentDate,
              ) ?? 0
            ) + 1,
          );
        },
      );

      return countMap;
    }, [bookings]);

  const rescheduleBooking =
    bookings.find(
      (booking) =>
        booking.id ===
        rescheduleBookingId,
    );

  const rescheduleAvailability =
    useMemo(() => {
      void availabilityRevision;

      if (
        rescheduleBooking ===
        undefined ||
        rescheduleDate ===
        ""
      ) {
        return getDemoDoctorBookingAvailability({
          practitionerId: "",
          branchId: "",
          appointmentDate: "",
        });
      }

      return getDemoDoctorBookingAvailability({
        appointmentDate:
          rescheduleDate,

        practitionerId:
          rescheduleBooking
            .practitionerId,

        branchId:
          rescheduleBooking.branchId,

        bookingSource:
          rescheduleBooking.source,

        existingBookings:
          bookings.filter(
            (booking) =>
              booking.id !==
              rescheduleBooking.id,
          ),
      });
    }, [
      availabilityRevision,
      bookings,
      rescheduleBooking,
      rescheduleDate,
    ]);

  const rescheduleSlots =
    rescheduleAvailability.slots;

  function updateFilter<
    TField extends
      keyof AppointmentDirectoryFilters,
  >(
    field: TField,
    value:
      AppointmentDirectoryFilters[TField],
  ) {
    setFilters(
      (currentFilters) => ({
        ...currentFilters,
        [field]: value,
      }),
    );
  }

  function clearFilters() {
    setFilters(
      createInitialAppointmentDirectoryFilters(),
    );
  }

  function checkInPatient(
    bookingId: string,
  ) {
    const booking =
      bookings.find(
        (record) =>
          record.id ===
          bookingId,
      );

    if (
      booking === undefined
    ) {
      setActionMessage(
        "The selected appointment could not be found.",
      );

      return;
    }

    const queueEntry =
      createDemoQueueEntryFromAppointment(
        booking,
        booking.priority,
      );

    updateDemoAppointmentBookingStatus(
      bookingId,
      "checked-in",
    );

    reloadLocalData();

    setActionMessage(
      `Patient checked in. Queue token ${queueEntry.tokenNumber} generated.`,
    );
  }

  function completeAppointment(
    bookingId: string,
  ) {
    updateDemoAppointmentBookingStatus(
      bookingId,
      "completed",
    );

    reloadLocalData();

    setActionMessage(
      "Appointment marked as completed.",
    );
  }

  async function cancelAppointment(
    booking:
      DemoAppointmentBooking,
  ) {
    const patient =
      patientsById.get(
        booking.patientId,
      );

    const confirmed =
      await wonflowConfirm({
        title: "Cancel appointment",
        message: `The appointment for ${patient?.displayName ?? "this patient"} is cancelled and the slot is released.`,
        confirmLabel: "Cancel appointment",
      });

    if (!confirmed) {
      return;
    }

    updateDemoAppointmentBookingStatus(
      booking.id,
      "cancelled",
    );

    reloadLocalData();

    setActionMessage(
      "Appointment cancelled.",
    );
  }

  function openReschedule(
    booking:
      DemoAppointmentBooking,
  ) {
    setRescheduleBookingId(
      booking.id,
    );

    setRescheduleDate(
      booking.appointmentDate,
    );

    setRescheduleSlot("");

    setActionMessage(
      undefined,
    );
  }

  function saveReschedule() {
    if (
      rescheduleBooking ===
      undefined ||
      rescheduleDate ===
      "" ||
      rescheduleSlot ===
      ""
    ) {
      setActionMessage(
        "Select a new date and available time.",
      );

      return;
    }

    const latestBookings =
      readDemoAppointmentBookings();

    const latestAvailability =
      getDemoDoctorBookingAvailability({
        practitionerId:
          rescheduleBooking
            .practitionerId,

        branchId:
          rescheduleBooking.branchId,

        appointmentDate:
          rescheduleDate,

        bookingSource:
          rescheduleBooking.source,

        existingBookings:
          latestBookings.filter(
            (booking) =>
              booking.id !==
              rescheduleBooking.id,
          ),
      });

    const selectedSlot =
      latestAvailability.slots.find(
        (slot) =>
          slot.start ===
          rescheduleSlot,
      );

    if (
      selectedSlot ===
        undefined ||
      !selectedSlot.available
    ) {
      setActionMessage(
        "The selected time is no longer available.",
      );

      return;
    }

    const durationMinutes =
      latestAvailability.schedules.find(
        (schedule) =>
          rescheduleSlot >=
            schedule.startTime &&
          rescheduleSlot <
            schedule.endTime,
      )?.appointmentDurationMinutes;

    if (
      durationMinutes ===
      undefined
    ) {
      setActionMessage(
        "The selected doctor schedule is no longer available.",
      );

      return;
    }

    try {
      rescheduleDemoAppointmentBooking(
        rescheduleBooking.id,
        rescheduleDate,
        rescheduleSlot,
        {
          durationMinutes,
        },
      );
    } catch (caught) {
      setActionMessage(
        caught instanceof Error
          ? caught.message
          : "Unable to reschedule this appointment.",
      );

      return;
    }

    reloadLocalData();

    setRescheduleBookingId("");
    setRescheduleDate("");
    setRescheduleSlot("");

    setActionMessage(
      "Appointment rescheduled successfully.",
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowActionBar
        description="Search appointments by patient, MR number, CNIC, appointment number, doctor or service."
        filters={
          <>
            <label className="relative min-w-64 flex-1">
              <span className="sr-only">
                Search appointments
              </span>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <SearchIcon />
              </span>

              <input
                autoFocus
                className={[
                  INPUT_CLASS_NAME,
                  "pl-10",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  updateFilter(
                    "query",
                    event.target.value,
                  );
                }}
                placeholder="Patient, MR, CNIC, appointment, doctor or service"
                type="search"
                value={filters.query}
              />
            </label>

            <select
              aria-label="Appointment sort order"
              className="h-11 min-w-52 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none"
              onChange={(
                event,
              ) => {
                updateFilter(
                  "sort",
                  event.target
                    .value as
                    AppointmentDirectorySort,
                );
              }}
              value={filters.sort}
            >
              <option value="time-ascending">
                Earliest Appointment
              </option>

              <option value="time-descending">
                Latest Appointment
              </option>

              <option value="patient-ascending">
                Patient Name A–Z
              </option>

              <option value="recently-created">
                Recently Created
              </option>
            </select>
          </>
        }
        primaryActions={
          <WonFlowActionButton
            icon={<RefreshIcon />}
            onClick={
              reloadLocalData
            }
            variant="primary"
          >
            Refresh Appointments
          </WonFlowActionButton>
        }
        secondaryActions={
          <WonFlowActionButton
            onClick={clearFilters}
            variant="ghost"
          >
            Clear Filters
          </WonFlowActionButton>
        }
        summary={`${statistics.filteredAppointments} of ${statistics.totalAppointments} appointments`}
        title="Appointment Search"
      />

      {actionMessage !==
      undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          {actionMessage}
        </div>
      ) : null}

      <WonFlowOperationalPanel
        compact
        description="Filter appointments by branch, doctor, status and date."
        title="Appointment Filters"
        tone="slate"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select
            aria-label="Filter by branch"
            className={INPUT_CLASS_NAME}
            onChange={(
              event,
            ) => {
              updateFilter(
                "branchId",
                event.target.value,
              );
            }}
            value={filters.branchId}
          >
            <option value="all">
              All Branches
            </option>

            {branches.map(
              (branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.name}
                </option>
              ),
            )}
          </select>

          <select
            aria-label="Filter by doctor"
            className={INPUT_CLASS_NAME}
            onChange={(
              event,
            ) => {
              updateFilter(
                "practitionerId",
                event.target.value,
              );
            }}
            value={
              filters.practitionerId
            }
          >
            <option value="all">
              All Doctors
            </option>

            {practitioners.map(
              (practitioner) => (
                <option
                  key={
                    practitioner.id
                  }
                  value={
                    practitioner.id
                  }
                >
                  {
                    practitioner
                      .displayName
                  }
                </option>
              ),
            )}
          </select>

          <select
            aria-label="Filter by status"
            className={INPUT_CLASS_NAME}
            onChange={(
              event,
            ) => {
              updateFilter(
                "status",
                event.target
                  .value as
                  AppointmentDirectoryStatusFilter,
              );
            }}
            value={filters.status}
          >
            <option value="all">
              All Statuses
            </option>

            <option value="booked">
              Booked
            </option>

            <option value="checked-in">
              Checked In
            </option>

            <option value="completed">
              Completed
            </option>

            <option value="cancelled">
              Cancelled
            </option>

            <option value="no-show">
              No Show
            </option>
          </select>

          <input
            aria-label="Filter by appointment date"
            className={INPUT_CLASS_NAME}
            onChange={(
              event,
            ) => {
              updateFilter(
                "appointmentDate",
                event.target.value,
              );
            }}
            type="date"
            value={
              filters.appointmentDate
            }
          />
        </div>
      </WonFlowOperationalPanel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <WonFlowKpiCard
          helperText="All browser-local appointment records"
          icon={<CalendarIcon />}
          label="Appointments"
          tone="blue"
          value={
            statistics.totalAppointments
          }
        />

        <WonFlowKpiCard
          helperText="Awaiting patient arrival"
          icon={<ClockIcon />}
          label="Booked"
          tone="violet"
          value={
            statistics.bookedAppointments
          }
        />

        <WonFlowKpiCard
          helperText="Patients currently checked in"
          icon={<ClockIcon />}
          label="Checked In"
          tone="amber"
          value={
            statistics.checkedInAppointments
          }
        />

        <WonFlowKpiCard
          helperText="Finished appointments"
          icon={<CheckIcon />}
          label="Completed"
          tone="emerald"
          value={
            statistics.completedAppointments
          }
        />

        <WonFlowKpiCard
          helperText="Cancelled appointment records"
          icon={<CalendarIcon />}
          label="Cancelled"
          tone="rose"
          value={
            statistics.cancelledAppointments
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={[
            "min-h-10 rounded-xl",
            "px-4 text-sm font-bold",
            viewMode === "list"
              ? "bg-indigo-600 text-white"
              : "border border-slate-200 bg-white text-slate-700",
          ].join(" ")}
          onClick={() => {
            setViewMode(
              "list",
            );
          }}
          type="button"
        >
          List View
        </button>

        <button
          className={[
            "min-h-10 rounded-xl",
            "px-4 text-sm font-bold",
            viewMode === "calendar"
              ? "bg-indigo-600 text-white"
              : "border border-slate-200 bg-white text-slate-700",
          ].join(" ")}
          onClick={() => {
            setViewMode(
              "calendar",
            );
          }}
          type="button"
        >
          Calendar View
        </button>
      </div>

      {bookings.length === 0 ? (
        <WonFlowOperationalPanel
          description="No browser-local appointments have been booked."
          title="No Appointments"
          tone="amber"
        >
          <WonFlowEmptyState
            description="Book the first patient appointment to begin the appointment directory."
            title="No appointment records"
          />

          <Link
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
            href="/operations/appointments/new"
          >
            Book Appointment
          </Link>
        </WonFlowOperationalPanel>
      ) : viewMode ===
        "calendar" ? (
        <WonFlowOperationalPanel
          description="Select a date to filter the appointment directory."
          icon={<CalendarIcon />}
          title="Appointment Calendar"
          tone="violet"
        >
          <div className="flex items-center justify-between gap-4">
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
              onClick={() => {
                setCalendarMonth(
                  new Date(
                    calendarMonth
                      .getFullYear(),

                    calendarMonth
                      .getMonth() -
                      1,

                    1,
                  ),
                );
              }}
              type="button"
            >
              ← Previous
            </button>

            <h3 className="text-lg font-black text-slate-950">
              {new Intl.DateTimeFormat(
                "en-US",
                {
                  month: "long",
                  year: "numeric",
                },
              ).format(
                calendarMonth,
              )}
            </h3>

            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
              onClick={() => {
                setCalendarMonth(
                  new Date(
                    calendarMonth
                      .getFullYear(),

                    calendarMonth
                      .getMonth() +
                      1,

                    1,
                  ),
                );
              }}
              type="button"
            >
              Next →
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-[11px] font-black uppercase tracking-wide text-slate-400">
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map(
              (day) => (
                <div key={day}>
                  {day}
                </div>
              ),
            )}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarCells.map(
              (cell) => {
                const count =
                  bookingCountByDate.get(
                    cell.dateKey,
                  ) ?? 0;

                const selected =
                  filters.appointmentDate ===
                  cell.dateKey;

                return (
                  <button
                    className={[
                      "min-h-20 rounded-2xl",
                      "border p-2 text-left",
                      "transition",
                      selected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : cell.currentMonth
                          ? "border-slate-100 bg-white hover:border-indigo-200 hover:bg-indigo-50"
                          : "border-slate-100 bg-slate-50 text-slate-400",
                    ].join(" ")}
                    key={cell.dateKey}
                    onClick={() => {
                      updateFilter(
                        "appointmentDate",
                        cell.dateKey,
                      );

                      setViewMode(
                        "list",
                      );
                    }}
                    type="button"
                  >
                    <div className="text-sm font-black">
                      {cell.date.getDate()}
                    </div>

                    {count > 0 ? (
                      <div
                        className={[
                          "mt-3 rounded-full",
                          "px-2 py-1",
                          "text-center text-[10px]",
                          "font-bold",
                          selected
                            ? "bg-white/15"
                            : "bg-indigo-50 text-indigo-700",
                        ].join(" ")}
                      >
                        {count}
                        {" "}
                        appointment
                        {count === 1
                          ? ""
                          : "s"}
                      </div>
                    ) : null}
                  </button>
                );
              },
            )}
          </div>
        </WonFlowOperationalPanel>
      ) : (
        <WonFlowOperationalPanel
          description="Manage booked appointments, patient arrival and scheduling changes."
          icon={<CalendarIcon />}
          title="Appointment Directory"
          tone="blue"
        >
          {filteredBookings.length ===
          0 ? (
            <WonFlowEmptyState
              description="No appointment matches the current search and filters."
              title="No matching appointments"
            />
          ) : (
            <div className="wf-content-scroll">
              <table className="w-full min-w-[1260px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                    <th className="pb-3">
                      Date and Time
                    </th>

                    <th className="pb-3">
                      Patient
                    </th>

                    <th className="pb-3">
                      Doctor
                    </th>

                    <th className="pb-3">
                      Service
                    </th>

                    <th className="pb-3">
                      Branch
                    </th>

                    <th className="pb-3">
                      Status
                    </th>

                    <th className="pb-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map(
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
                          booking
                            .practitionerId,
                        );

                      return (
                        <tr
                          className="border-b border-slate-100 align-top last:border-0 hover:bg-blue-50/40"
                          key={booking.id}
                        >
                          <td className="py-4 pr-4">
                            <div className="text-sm font-black text-indigo-700">
                              {formatWonFlowDashboardTime(
                                booking
                                  .scheduledStartAt,
                              )}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {formatWonFlowDashboardDateTime(
                                booking
                                  .scheduledStartAt,
                              )}
                            </div>

                            <div className="mt-1 text-[11px] font-bold text-slate-400">
                              {
                                booking
                                  .appointmentNumber
                              }
                            </div>
                          </td>

                          <td className="py-4 pr-4">
                            <div className="text-sm font-black text-slate-950">
                              {patient
                                ?.displayName ??
                                "Unknown patient"}
                            </div>

                            <div className="mt-1 text-xs font-bold text-indigo-600">
                              {patient
                                ?.mrNumber ??
                                "No MR number"}
                            </div>

                            <div className="mt-1 font-mono text-[11px] text-slate-500">
                              {patient
                                ?.draft
                                .cnicNumber ??
                                "No CNIC"}
                            </div>
                          </td>

                          <td className="py-4 pr-4">
                            <div className="text-sm font-bold text-slate-800">
                              {practitioner
                                ?.displayName ??
                                "Unknown doctor"}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {practitioner
                                ?.specialtyName ??
                                ""}
                            </div>
                          </td>

                          <td className="py-4 pr-4">
                            <div className="text-sm font-bold text-slate-800">
                              {
                                booking
                                  .serviceName
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                booking
                                  .durationMinutes
                              }
                              {" minutes · "}
                              {formatWonFlowDashboardMoney(
                                booking
                                  .feeMinorUnits,

                                "PKR",
                              )}
                            </div>
                          </td>

                          <td className="py-4 pr-4 text-sm font-semibold text-slate-600">
                            {branch
                              ?.name ??
                              "Unknown branch"}
                          </td>

                          <td className="py-4 pr-4">
                            <StatusBadge
                              status={
                                booking.status
                              }
                            />
                          </td>

                          <td className="py-4 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {booking.status ===
                              "booked" ? (
                                <button
                                  className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 ring-1 ring-amber-200"
                                  onClick={() => {
                                    checkInPatient(
                                      booking.id,
                                    );
                                  }}
                                  type="button"
                                >
                                  Check In
                                </button>
                              ) : null}

                              {booking.status ===
                              "checked-in" ? (
                                <button
                                  className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200"
                                  onClick={() => {
                                    completeAppointment(
                                      booking.id,
                                    );
                                  }}
                                  type="button"
                                >
                                  Complete
                                </button>
                              ) : null}

                              {booking.status ===
                                "booked" ||
                              booking.status ===
                                "checked-in" ? (
                                <button
                                  className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200"
                                  onClick={() => {
                                    openReschedule(
                                      booking,
                                    );
                                  }}
                                  type="button"
                                >
                                  Reschedule
                                </button>
                              ) : null}

                              {booking.status !==
                                "cancelled" &&
                              booking.status !==
                                "completed" ? (
                                <button
                                  className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200"
                                  onClick={() => {
                                    cancelAppointment(
                                      booking,
                                    );
                                  }}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              ) : null}

                              <Link
                                className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
                                href={`/operations/billing/new?patientId=${encodeURIComponent(
                                  booking.patientId,
                                )}`}
                              >
                                Create Bill
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </WonFlowOperationalPanel>
      )}

      {rescheduleBooking !==
      undefined ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-indigo-100 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-5 text-white">
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-blue-100">
                Reschedule Appointment
              </div>

              <div className="mt-2 text-xl font-black">
                {
                  rescheduleBooking
                    .appointmentNumber
                }
              </div>

              <div className="mt-1 text-sm text-indigo-100">
                {
                  rescheduleBooking
                    .serviceName
                }
              </div>
            </div>

            <div className="p-5">
              <label className="block">
                <span className="text-xs font-bold text-slate-500">
                  New Appointment Date
                </span>

                <input
                  className={[
                    INPUT_CLASS_NAME,
                    "mt-1.5",
                  ].join(" ")}
                  min={
                    formatDateInput(
                      new Date(),
                    )
                  }
                  onChange={(
                    event,
                  ) => {
                    setRescheduleDate(
                      event.target.value,
                    );

                    setRescheduleSlot(
                      "",
                    );
                  }}
                  type="date"
                  value={
                    rescheduleDate
                  }
                />
              </label>

              <div className="mt-5">
                <div className="text-sm font-black text-slate-900">
                  Available Times
                </div>

                {rescheduleSlots.length ===
                0 ? (
                  <WonFlowEmptyState
                    description={
                      rescheduleAvailability
                        .unavailableReason ??
                      "Select a date with available doctor times."
                    }
                    title="No available times"
                  />
                ) : (
                  <>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {rescheduleSlots.map(
                        (slot) => (
                          <button
                            className={[
                              "min-h-11 rounded-xl",
                              "border px-3",
                              "text-xs font-bold",
                              !slot.available
                                ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400 line-through"
                                : rescheduleSlot ===
                                    slot.start
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
                            ].join(" ")}
                            disabled={
                              !slot.available
                            }
                            key={
                              slot.start
                            }
                            onClick={() => {
                              setRescheduleSlot(
                                slot.start,
                              );
                            }}
                            type="button"
                          >
                            {slot.label}
                          </button>
                        ),
                      )}
                    </div>

                    {rescheduleAvailability
                      .unavailableReason !==
                    undefined ? (
                      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                        {
                          rescheduleAvailability
                            .unavailableReason
                        }
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
                  onClick={() => {
                    setRescheduleBookingId(
                      "",
                    );

                    setRescheduleDate(
                      "",
                    );

                    setRescheduleSlot(
                      "",
                    );
                  }}
                  type="button"
                >
                  Close
                </button>

                <button
                  className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white"
                  onClick={
                    saveReschedule
                  }
                  type="button"
                >
                  Save New Appointment Time
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export function AppointmentDirectoryWorkflow() {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "appointment-directory:directories",

      loader:
        async (
          signal,
        ) => {
          const [
            branches,
            practitioners,
          ] = await Promise.all([
            hospitalService
              .listBranches(
                signal,
              ),

            hospitalService
              .listPractitioners(
                {
                  limit: 100,
                },
                signal,
              ),
          ]);

          return {
            branches,

            practitioners:
              practitioners.items,
          };
        },

      isEmpty:
        (directory) =>
          directory
            .branches
            .length === 0,
    });

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm"
            href="/operations/appointments/new"
          >
            Book Appointment
          </Link>
        }
        breadcrumbs={[
          {
            label:
              "Hospital Operations",
            href: "/operations",
          },
          {
            label:
              "Appointments",
          },
          {
            label:
              "Appointment Directory",
          },
        ]}
        description="Search, view, reschedule, cancel and check in patient appointments."
        eyebrow="Appointment Management"
        leading={<CalendarIcon />}
        metadata={
          <>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700 ring-1 ring-blue-100">
              Calendar and list views
            </span>

            <span>
              Fictional browser-local appointments
            </span>
          </>
        }
        title="Appointment Directory"
      />

      <WonFlowAsyncDataBoundary
        emptyDescription="No hospital branches are available for appointment management."
        emptyTitle="Appointment directory unavailable"
        loadingDescription="WonFlow is preparing hospital branch and practitioner information."
        loadingTitle="Preparing appointment directory"
        onRetry={
          directories.reload
        }
        state={directories}
      >
        {(directory) => (
          <AppointmentDirectoryContent
            branches={
              directory.branches
            }
            practitioners={
              directory.practitioners
            }
          />
        )}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
