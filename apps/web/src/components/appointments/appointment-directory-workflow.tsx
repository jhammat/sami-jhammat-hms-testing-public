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
  DataEmpty,
  DataError,
  DataLoading,
  SaveIndicator,
} from "@wonflow/ui";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";

import {
  WonFlowAsyncDataBoundary,
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
  WonFlowForbiddenError,
  useApiResource,
} from "@/lib/api";

import {
  listAppointments,
  listAppointmentSlots,
  useCancelAppointment,
  useCheckInAppointment,
  useRescheduleAppointment,
} from "@/lib/api/appointments";

import type {
  AppointmentRecord,
  AppointmentSlot,
  AppointmentStatus,
  ListAppointmentsResult,
} from "@/lib/api/appointments";

import {
  createInitialAppointmentDirectoryFilters,
  getTodayDateInputValue,
} from "@/lib/appointments";

import type {
  AppointmentDirectoryFilters,
  AppointmentDirectorySort,
  AppointmentDirectoryStatusFilter,
} from "@/lib/appointments";

import {
  formatWonFlowDashboardDateTime,
  formatWonFlowDashboardMoney,
  formatWonFlowDashboardTime,
} from "@/lib/dashboard";
import { toLocalDate } from "@/lib/time/local-date";

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

const PAGE_SIZE = 25;

type AppointmentViewMode =
  | "list"
  | "calendar";

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <rect height="16" rx="2" stroke="currentColor" strokeWidth="1.8" width="18" x="3" y="5" />
      <path d="M7 3v4M17 3v4M3 10h18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16.5 16.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8 12 2.6 2.6L16.5 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M20 7v5h-5M4 17v-5h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M6.1 9a7 7 0 0 1 11.7-2.4L20 12M4 12l2.2 5.4A7 7 0 0 0 17.9 15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function humanizeValue(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStatusClassName(status: AppointmentStatus): string {
  switch (status) {
    case "PENDING":
    case "CONFIRMED":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "CHECKED_IN":
    case "IN_QUEUE":
    case "IN_PROGRESS":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "CANCELLED":
      return "bg-rose-50 text-rose-700 ring-rose-100";
    case "NO_SHOW":
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={["inline-flex rounded-full", "px-2.5 py-1", "text-[11px] font-bold", "ring-1", getStatusClassName(status)].join(" ")}>
      {humanizeValue(status)}
    </span>
  );
}

function patientDisplayName(patient: AppointmentRecord["patient"]): string {
  return [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" ");
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createMonthCells(monthDate: Date): { date: Date; dateKey: string; currentMonth: boolean }[] {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_value, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      dateKey: formatDateInput(date),
      currentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

interface AppointmentDirectoryContentProps {
  branches: readonly MockBranch[];
  practitioners: readonly MockPractitioner[];
}

function AppointmentDirectoryContent({
  branches,
  practitioners,
}: AppointmentDirectoryContentProps) {
  const [filters, setFilters] = useState<AppointmentDirectoryFilters>(createInitialAppointmentDirectoryFilters);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<AppointmentViewMode>("list");

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const currentDate = new Date();
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  });

  const [rescheduleBookingId, setRescheduleBookingId] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState<AppointmentSlot | undefined>();
  const [rescheduleSlots, setRescheduleSlots] = useState<AppointmentSlot[]>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleUnavailableReason, setRescheduleUnavailableReason] = useState<string | undefined>();

  const [actionMessage, setActionMessage] = useState<string | undefined>();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(filters.query);
    }, 300);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filters.query]);

  useEffect(() => {
    queueMicrotask(() => {
      setPage(1);
    });
  }, [
    debouncedQuery,
    filters.branchId,
    filters.practitionerId,
    filters.status,
    filters.appointmentDate,
    filters.sort,
  ]);

  const listQuery = useMemo(
    () => ({
      query: debouncedQuery.trim() || undefined,
      branchId: filters.branchId === "all" ? undefined : filters.branchId,
      practitionerId: filters.practitionerId === "all" ? undefined : filters.practitionerId,
      status: filters.status === "all" ? undefined : filters.status,
      date: filters.appointmentDate || undefined,
      sort: filters.sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedQuery, filters.branchId, filters.practitionerId, filters.status, filters.appointmentDate, filters.sort, page],
  );

  const directory = useApiResource<ListAppointmentsResult>({
    key: `appointments:${JSON.stringify(listQuery)}`,
    tags: ["appointments"],
    fetcher: (signal) => listAppointments(listQuery, signal),
    isEmpty: (result) => result.appointments.length === 0,
  });

  const appointments = directory.data?.appointments ?? [];

  // The calendar needs one count per day across the visible month,
  // independent of the list's single-day filter and page.
  const calendarCells = useMemo(() => createMonthCells(calendarMonth), [calendarMonth]);
  const monthStart = calendarCells[0]?.dateKey;
  const monthEnd = calendarCells[calendarCells.length - 1]?.dateKey;

  const monthQuery = useMemo(
    () => ({
      branchId: filters.branchId === "all" ? undefined : filters.branchId,
      practitionerId: filters.practitionerId === "all" ? undefined : filters.practitionerId,
      status: filters.status === "all" ? undefined : filters.status,
      dateFrom: monthStart,
      dateTo: monthEnd,
      pageSize: 100,
    }),
    [filters.branchId, filters.practitionerId, filters.status, monthStart, monthEnd],
  );

  const monthDirectory = useApiResource<ListAppointmentsResult>({
    key: `appointments:calendar:${JSON.stringify(monthQuery)}`,
    tags: ["appointments"],
    enabled: viewMode === "calendar",
    fetcher: (signal) => listAppointments(monthQuery, signal),
    isEmpty: (result) => result.appointments.length === 0,
  });

  const bookingCountByDate = useMemo(() => {
    const countMap = new Map<string, number>();
    (monthDirectory.data?.appointments ?? []).forEach((appointment) => {
      const dateKey = appointment.startsAt.slice(0, 10);
      countMap.set(dateKey, (countMap.get(dateKey) ?? 0) + 1);
    });
    return countMap;
  }, [monthDirectory.data]);

  const branchesById = useMemo(() => new Map(branches.map((branch) => [branch.id, branch])), [branches]);

  const {
    mutate: rescheduleAppointment,
    saveState: rescheduleSaveState,
    error: rescheduleError,
    reset: resetRescheduleMutation,
  } = useRescheduleAppointment();

  const {
    mutate: cancelAppointmentMutation,
  } = useCancelAppointment();

  const {
    mutate: checkInAppointmentMutation,
  } = useCheckInAppointment();

  const rescheduleBooking = appointments.find((booking) => booking.id === rescheduleBookingId);

  useEffect(() => {
    if (rescheduleBooking === undefined || rescheduleDate === "") {
      queueMicrotask(() => {
        setRescheduleSlots([]);
        setRescheduleUnavailableReason(undefined);
      });
      return;
    }

    if (rescheduleBooking.doctorId === null) {
      queueMicrotask(() => {
        setRescheduleSlots([]);
        setRescheduleUnavailableReason("This appointment has no assigned doctor to compute availability for.");
      });
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      setRescheduleSlotsLoading(true);
    });

    listAppointmentSlots(
      {
        doctorId: rescheduleBooking.doctorId,
        branchId: rescheduleBooking.branchId,
        date: rescheduleDate,
        durationMinutes: rescheduleBooking.service?.durationMinutes,
      },
      controller.signal,
    )
      .then((result) => {
        setRescheduleSlots(result.slots);
        setRescheduleUnavailableReason(result.unavailableReason);
      })
      .catch(() => {
        setRescheduleSlots([]);
        setRescheduleUnavailableReason("Available times could not be loaded.");
      })
      .finally(() => {
        setRescheduleSlotsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [rescheduleBooking, rescheduleDate]);

  function updateFilter<TField extends keyof AppointmentDirectoryFilters>(
    field: TField,
    value: AppointmentDirectoryFilters[TField],
  ) {
    setFilters((currentFilters) => ({ ...currentFilters, [field]: value }));
  }

  function clearFilters() {
    setFilters(createInitialAppointmentDirectoryFilters());
  }

  async function checkInPatient(booking: AppointmentRecord) {
    try {
      const result = await checkInAppointmentMutation({
        appointmentId: booking.id,
        // The LOCAL date of the appointment, not the UTC one. Slicing the
        // ISO string put a 01:43 local appointment at a UTC+5 site into
        // the previous day's queue, where reception would never find it.
        input: { queueDate: toLocalDate(new Date(booking.startsAt)) },
      });
      const queueEntry = result.queueEntry as { tokenNumber?: number } | undefined;
      setActionMessage(
        queueEntry?.tokenNumber !== undefined
          ? `Patient checked in. Queue token ${queueEntry.tokenNumber} generated.`
          : "Patient checked in.",
      );
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "The appointment could not be checked in.");
    }
  }

  async function cancelAppointment(booking: AppointmentRecord) {
    const confirmed = await wonflowConfirm({
      title: "Cancel appointment",
      message: `The appointment for ${patientDisplayName(booking.patient)} is cancelled and the slot is released.`,
      confirmLabel: "Cancel appointment",
    });
    if (!confirmed) return;

    try {
      await cancelAppointmentMutation({ appointmentId: booking.id, reason: "Cancelled from the appointment directory." });
      setActionMessage("Appointment cancelled.");
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "The appointment could not be cancelled.");
    }
  }

  function openReschedule(booking: AppointmentRecord) {
    setRescheduleBookingId(booking.id);
    setRescheduleDate(booking.startsAt.slice(0, 10));
    setRescheduleSlot(undefined);
    setActionMessage(undefined);
    resetRescheduleMutation();
  }

  function closeReschedule() {
    setRescheduleBookingId("");
    setRescheduleDate("");
    setRescheduleSlot(undefined);
  }

  async function saveReschedule() {
    if (rescheduleBooking === undefined || rescheduleSlot === undefined) {
      setActionMessage("Select a new date and available time.");
      return;
    }

    try {
      await rescheduleAppointment({
        appointmentId: rescheduleBooking.id,
        input: { startsAt: rescheduleSlot.startsAt, endsAt: rescheduleSlot.endsAt },
      });

      closeReschedule();
      setActionMessage("Appointment rescheduled successfully.");
    } catch {
      // rescheduleError (from useRescheduleAppointment) already carries the
      // typed failure — on a 409 it names the conflict; the slot list
      // itself is refetched below so the person sees what is actually free.
      setRescheduleDate((current) => current);
    }
  }

  return (
    <div className="space-y-6">
      <WonFlowActionBar
        description="Search appointments by patient, MR number, doctor or reason."
        filters={
          <>
            <label className="relative min-w-64 flex-1">
              <span className="sr-only">Search appointments</span>
              <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                autoFocus
                className={[INPUT_CLASS_NAME, "pl-10"].join(" ")}
                onChange={(event) => {
                  updateFilter("query", event.target.value);
                }}
                placeholder="Patient, MR, doctor or reason"
                type="search"
                value={filters.query}
              />
            </label>

            <select
              aria-label="Appointment sort order"
              className="h-11 min-w-52 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none"
              onChange={(event) => {
                updateFilter("sort", event.target.value as AppointmentDirectorySort);
              }}
              value={filters.sort}
            >
              <option value="time-ascending">Earliest Appointment</option>
              <option value="time-descending">Latest Appointment</option>
            </select>
          </>
        }
        primaryActions={
          <WonFlowActionButton icon={<RefreshIcon />} onClick={directory.reload} variant="primary">
            Refresh Appointments
          </WonFlowActionButton>
        }
        secondaryActions={
          <WonFlowActionButton onClick={clearFilters} variant="ghost">
            Clear Filters
          </WonFlowActionButton>
        }
        summary={`${directory.data?.total ?? 0} of ${directory.data?.summary.total ?? 0} appointments`}
        title="Appointment Search"
      />

      {actionMessage !== undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          {actionMessage}
        </div>
      ) : null}

      <WonFlowOperationalPanel compact description="Filter appointments by branch, doctor, status and date." title="Appointment Filters" tone="slate">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select
            aria-label="Filter by branch"
            className={INPUT_CLASS_NAME}
            onChange={(event) => {
              updateFilter("branchId", event.target.value);
            }}
            value={filters.branchId}
          >
            <option value="all">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>

          <select
            aria-label="Filter by doctor"
            className={INPUT_CLASS_NAME}
            onChange={(event) => {
              updateFilter("practitionerId", event.target.value);
            }}
            value={filters.practitionerId}
          >
            <option value="all">All Doctors</option>
            {practitioners.map((practitioner) => (
              <option key={practitioner.id} value={practitioner.id}>{practitioner.displayName}</option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            className={INPUT_CLASS_NAME}
            onChange={(event) => {
              updateFilter("status", event.target.value as AppointmentDirectoryStatusFilter);
            }}
            value={filters.status}
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="IN_QUEUE">In Queue</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>

          <input
            aria-label="Filter by appointment date"
            className={INPUT_CLASS_NAME}
            onChange={(event) => {
              updateFilter("appointmentDate", event.target.value);
            }}
            type="date"
            value={filters.appointmentDate}
          />
        </div>
      </WonFlowOperationalPanel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WonFlowKpiCard helperText="Matching current filters" icon={<CalendarIcon />} label="Appointments" tone="blue" value={directory.data?.summary.total ?? 0} />
        <WonFlowKpiCard helperText="Awaiting patient arrival" icon={<ClockIcon />} label="Booked" tone="violet" value={directory.data?.summary.booked ?? 0} />
        <WonFlowKpiCard helperText="Patients currently checked in" icon={<ClockIcon />} label="Checked In" tone="amber" value={directory.data?.summary.checkedIn ?? 0} />
        <WonFlowKpiCard helperText="Finished appointments" icon={<CheckIcon />} label="Completed" tone="emerald" value={directory.data?.summary.completed ?? 0} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={["min-h-10 rounded-xl", "px-4 text-sm font-bold", viewMode === "list" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700"].join(" ")}
          onClick={() => {
            setViewMode("list");
          }}
          type="button"
        >
          List View
        </button>

        <button
          className={["min-h-10 rounded-xl", "px-4 text-sm font-bold", viewMode === "calendar" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700"].join(" ")}
          onClick={() => {
            setViewMode("calendar");
          }}
          type="button"
        >
          Calendar View
        </button>
      </div>

      {viewMode === "calendar" ? (
        <WonFlowOperationalPanel description="Select a date to filter the appointment directory." icon={<CalendarIcon />} title="Appointment Calendar" tone="violet">
          <div className="flex items-center justify-between gap-4">
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
              onClick={() => {
                setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
              }}
              type="button"
            >
              ← Previous
            </button>

            <h3 className="text-lg font-black text-slate-950">
              {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(calendarMonth)}
            </h3>

            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
              onClick={() => {
                setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
              }}
              type="button"
            >
              Next →
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-[11px] font-black uppercase tracking-wide text-slate-400">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarCells.map((cell) => {
              const count = bookingCountByDate.get(cell.dateKey) ?? 0;
              const selected = filters.appointmentDate === cell.dateKey;

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
                    updateFilter("appointmentDate", cell.dateKey);
                    setViewMode("list");
                  }}
                  type="button"
                >
                  <div className="text-sm font-black">{cell.date.getDate()}</div>
                  {count > 0 ? (
                    <div className={["mt-3 rounded-full", "px-2 py-1", "text-center text-[10px]", "font-bold", selected ? "bg-white/15" : "bg-indigo-50 text-indigo-700"].join(" ")}>
                      {count} appointment{count === 1 ? "" : "s"}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </WonFlowOperationalPanel>
      ) : directory.status === "loading" ? (
        <WonFlowOperationalPanel description="Loading appointments." icon={<CalendarIcon />} title="Appointment Directory" tone="blue">
          <DataLoading label="Loading appointments" rows={8} shape="table" />
        </WonFlowOperationalPanel>
      ) : directory.status === "error" ? (
        <DataError detail={directory.error?.message} onRetry={directory.reload} what="the appointment directory" />
      ) : directory.status === "empty" && (directory.data?.summary.total ?? 0) === 0 ? (
        <WonFlowOperationalPanel description="No appointments have been booked yet." title="No Appointments" tone="amber">
          <DataEmpty
            action={
              <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white" href="/operations/reception">
                Book Appointment
              </Link>
            }
            itemLabel="appointments"
            title="No appointment records"
          />
        </WonFlowOperationalPanel>
      ) : (
        <WonFlowOperationalPanel description="Manage booked appointments, patient arrival and scheduling changes." icon={<CalendarIcon />} title="Appointment Directory" tone="blue">
          {appointments.length === 0 ? (
            <DataEmpty
              action={{ label: "Clear filters", onClick: clearFilters }}
              description="No appointment matches the current search and filters."
              itemLabel="matching appointments"
              title="No matching appointments"
            />
          ) : (
            <>
              <div className="wf-content-scroll">
                <table className="w-full min-w-[1260px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                      <th className="pb-3">Date and Time</th>
                      <th className="pb-3">Patient</th>
                      <th className="pb-3">Doctor</th>
                      <th className="pb-3">Service</th>
                      <th className="pb-3">Branch</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {appointments.map((booking) => {
                      const branch = branchesById.get(booking.branchId);

                      return (
                        <tr className="border-b border-slate-100 align-top last:border-0 hover:bg-blue-50/40" key={booking.id}>
                          <td className="py-4 pr-4">
                            <div className="text-sm font-black text-indigo-700">{formatWonFlowDashboardTime(booking.startsAt)}</div>
                            <div className="mt-1 text-xs text-slate-500">{formatWonFlowDashboardDateTime(booking.startsAt)}</div>
                          </td>

                          <td className="py-4 pr-4">
                            <div className="text-sm font-black text-slate-950">{patientDisplayName(booking.patient)}</div>
                            <div className="mt-1 text-xs font-bold text-indigo-600">{booking.patient.patientNumber}</div>
                          </td>

                          <td className="py-4 pr-4">
                            <div className="text-sm font-bold text-slate-800">{booking.doctor?.staffProfile.membership.displayName ?? "Unassigned"}</div>
                            <div className="mt-1 text-xs text-slate-500">{booking.doctor?.specialty ?? ""}</div>
                          </td>

                          <td className="py-4 pr-4">
                            <div className="text-sm font-bold text-slate-800">{booking.service?.name ?? "Consultation"}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {booking.service?.durationMinutes ?? 0} minutes
                              {booking.service?.priceMinorUnits !== undefined && booking.service?.priceMinorUnits !== null
                                ? ` · ${formatWonFlowDashboardMoney(booking.service.priceMinorUnits, booking.service.currencyCode)}`
                                : ""}
                            </div>
                          </td>

                          <td className="py-4 pr-4 text-sm font-semibold text-slate-600">{branch?.name ?? "Unknown branch"}</td>

                          <td className="py-4 pr-4">
                            <StatusBadge status={booking.status} />
                          </td>

                          <td className="py-4 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {booking.status === "PENDING" || booking.status === "CONFIRMED" ? (
                                <button
                                  className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 ring-1 ring-amber-200"
                                  onClick={() => {
                                    void checkInPatient(booking);
                                  }}
                                  type="button"
                                >
                                  Check In
                                </button>
                              ) : null}

                              {booking.status === "PENDING" || booking.status === "CONFIRMED" ? (
                                <button
                                  className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200"
                                  onClick={() => {
                                    openReschedule(booking);
                                  }}
                                  type="button"
                                >
                                  Reschedule
                                </button>
                              ) : null}

                              {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && booking.status !== "NO_SHOW" ? (
                                <button
                                  className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200"
                                  onClick={() => {
                                    void cancelAppointment(booking);
                                  }}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              ) : null}

                              <Link
                                className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
                                href={`/operations/billing/new?patientId=${encodeURIComponent(booking.patientId)}`}
                              >
                                Create Bill
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {directory.data !== undefined && directory.data.total > PAGE_SIZE ? (
                <nav aria-label="Appointment directory pagination" className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={page <= 1}
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1));
                    }}
                    type="button"
                  >
                    Previous
                  </button>

                  <span>
                    Page {directory.data.page} of {Math.max(1, Math.ceil(directory.data.total / PAGE_SIZE))}
                  </span>

                  <button
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={directory.data.page * PAGE_SIZE >= directory.data.total}
                    onClick={() => {
                      setPage((current) => current + 1);
                    }}
                    type="button"
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </>
          )}
        </WonFlowOperationalPanel>
      )}

      {rescheduleBooking !== undefined ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-indigo-100 bg-white shadow-2xl">
            <div className="bg-linear-to-r from-blue-600 to-violet-600 p-5 text-white">
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-blue-100">Reschedule Appointment</div>
              <div className="mt-2 text-xl font-black">{rescheduleBooking.service?.name ?? "Appointment"}</div>
              <div className="mt-1 text-sm text-indigo-100">{patientDisplayName(rescheduleBooking.patient)}</div>
            </div>

            <div className="p-5">
              <label className="block">
                <span className="text-xs font-bold text-slate-500">New Appointment Date</span>
                <input
                  className={[INPUT_CLASS_NAME, "mt-1.5"].join(" ")}
                  min={getTodayDateInputValue()}
                  onChange={(event) => {
                    setRescheduleDate(event.target.value);
                    setRescheduleSlot(undefined);
                  }}
                  type="date"
                  value={rescheduleDate}
                />
              </label>

              <div className="mt-5">
                <div className="text-sm font-black text-slate-900">Available Times</div>

                {rescheduleSlotsLoading ? (
                  <DataLoading label="Loading available times" rows={3} shape="cards" />
                ) : rescheduleSlots.length === 0 ? (
                  <DataEmpty
                    action={<span />}
                    description={rescheduleUnavailableReason ?? "Select a date with available doctor times."}
                    itemLabel="available times"
                    title="No available times"
                  />
                ) : (
                  <>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {rescheduleSlots.map((slot) => (
                        <button
                          className={[
                            "min-h-11 rounded-xl",
                            "border px-3",
                            "text-xs font-bold",
                            !slot.available
                              ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400 line-through"
                              : rescheduleSlot?.start === slot.start
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700",
                          ].join(" ")}
                          disabled={!slot.available}
                          key={slot.start}
                          onClick={() => {
                            setRescheduleSlot(slot);
                          }}
                          type="button"
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>

                    {rescheduleUnavailableReason !== undefined ? (
                      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{rescheduleUnavailableReason}</p>
                    ) : null}
                  </>
                )}
              </div>

              {rescheduleError instanceof WonFlowForbiddenError ? (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" role="alert">
                  You do not have access to reschedule appointments. This requires the appointments.manage permission.
                </p>
              ) : rescheduleError !== undefined ? (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" role="alert">
                  {rescheduleError.message}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
                <SaveIndicator state={rescheduleSaveState} />

                <button className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700" onClick={closeReschedule} type="button">
                  Close
                </button>

                <button
                  className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={rescheduleSaveState === "saving" || rescheduleSlot === undefined}
                  onClick={() => {
                    void saveReschedule();
                  }}
                  type="button"
                >
                  {rescheduleSaveState === "saving" ? "Saving…" : "Save New Appointment Time"}
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
  const hospitalService = useWonFlowHospitalService();

  const directories = useWonFlowAsyncData({
    key: "appointment-directory:directories",
    loader: async (signal) => {
      const [branches, practitioners] = await Promise.all([
        hospitalService.listBranches(signal),
        hospitalService.listPractitioners({ limit: 100 }, signal),
      ]);
      return { branches, practitioners: practitioners.items };
    },
    isEmpty: (directory) => directory.branches.length === 0,
  });

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <Link className="inline-flex min-h-10 items-center justify-center rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm" href="/operations/reception">
            Book Appointment
          </Link>
        }
        breadcrumbs={[
          { label: "Hospital Operations", href: "/operations" },
          { label: "Appointments" },
          { label: "Appointment Directory" },
        ]}
        description="Search, view, reschedule, cancel and check in patient appointments."
        eyebrow="Appointment Management"
        leading={<CalendarIcon />}
        metadata={
          <>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700 ring-1 ring-blue-100">Calendar and list views</span>
            <span>Live tenant appointments</span>
          </>
        }
        title="Appointment Directory"
      />

      <WonFlowAsyncDataBoundary
        emptyDescription="No hospital branches are available for appointment management."
        emptyTitle="Appointment directory unavailable"
        loadingDescription="WonFlow is preparing hospital branch and practitioner information."
        loadingTitle="Preparing appointment directory"
        onRetry={directories.reload}
        state={directories}
      >
        {(directory) => (
          <AppointmentDirectoryContent branches={directory.branches} practitioners={directory.practitioners} />
        )}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
