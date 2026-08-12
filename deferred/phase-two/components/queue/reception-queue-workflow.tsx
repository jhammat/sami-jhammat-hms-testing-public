"use client";

import Link from "next/link";

import {
  useCallback,
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
} from "@/components/feedback";

import {
  WonFlowActionBar,
  WonFlowActionButton,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  getTodayDateInputValue,
  readDemoAppointmentBookings,
  updateDemoAppointmentBookingStatus,
} from "@/lib/appointments";

import type {
  DemoAppointmentBooking,
} from "@/lib/appointments";

import {
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import {
  calculateDemoQueueWaitMinutes,
  createDemoQueueEntryFromAppointment,
  readDemoQueueEntries,
  sortDemoQueueEntries,
  updateDemoQueueEntryStatus,
} from "@/lib/queue";

import type {
  DemoQueueEntry,
  DemoQueuePriority,
  DemoQueueStatus,
} from "@/lib/queue";

import {
  formatWonFlowDashboardTime,
} from "@/lib/dashboard";

const INPUT_CLASS_NAME = [
  "h-9 w-full",
  "rounded-xl border",
  "border-slate-200",
  "bg-white px-3",
  "text-[11px] font-semibold",
  "text-slate-900",
  "outline-none transition",
  "placeholder:text-slate-400",
  "focus:border-indigo-400",
  "focus:ring-2",
  "focus:ring-indigo-100",
].join(" ");

function QueueIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M8 6h12M8 12h12M8 18h12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />

      <circle
        cx="4"
        cy="6"
        fill="currentColor"
        r="1"
      />

      <circle
        cx="4"
        cy="12"
        fill="currentColor"
        r="1"
      />

      <circle
        cx="4"
        cy="18"
        fill="currentColor"
        r="1"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="9"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M3.5 20a5.5 5.5 0 0 1 11 0M15 6.5a3 3 0 0 1 0 5.8M16.5 15a5 5 0 0 1 4 5"
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

function getInitials(
  value: string,
): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase(),
    )
    .join("");
}

function formatWaitMinutes(
  minutes: number,
): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remainingMinutes =
    minutes % 60;

  return remainingMinutes === 0
    ? `${hours} hr`
    : `${hours} hr ${remainingMinutes} min`;
}

function getQueueStatusClassName(
  status:
    DemoQueueStatus,
): string {
  switch (status) {
    case "waiting":
      return "bg-blue-50 text-blue-700 ring-blue-100";

    case "called":
      return "bg-amber-50 text-amber-700 ring-amber-100";

    case "serving":
      return "bg-violet-50 text-violet-700 ring-violet-100";

    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";

    case "skipped":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    case "cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-100";
  }
}

function getPriorityClassName(
  priority:
    DemoQueuePriority,
): string {
  switch (priority) {
    case "routine":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    case "urgent":
      return "bg-amber-50 text-amber-700 ring-amber-100";

    case "emergency":
      return "bg-rose-50 text-rose-700 ring-rose-100";
  }
}

function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center",
        "rounded-full px-2.5 py-1",
        "text-[11px] font-bold",
        "ring-1",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

interface ReceptionQueueContentProps {
  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function ReceptionQueueContent({
  branches,
  practitioners,
}: ReceptionQueueContentProps) {
  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    appointments,
    setAppointments,
  ] = useState<
    DemoAppointmentBooking[]
  >([]);

  const [
    queueEntries,
    setQueueEntries,
  ] = useState<
    DemoQueueEntry[]
  >([]);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    getTodayDateInputValue,
  );

  const [
    selectedBranchId,
    setSelectedBranchId,
  ] = useState("all");

  const [
    selectedPractitionerId,
    setSelectedPractitionerId,
  ] = useState("all");

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<
    "all" |
    DemoQueueStatus
  >("all");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    actionMessage,
    setActionMessage,
  ] = useState<
    string |
    undefined
  >();

  const reloadLocalData =
    useCallback(() => {
      setPatients(
        readDemoPatientRegistrations(),
      );

      setAppointments(
        readDemoAppointmentBookings(),
      );

      setQueueEntries(
        readDemoQueueEntries(),
      );
    }, []);

  useEffect(() => {
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
      "wonflow:demo-queue-changed",
      reloadLocalData,
    );

    window.addEventListener(
      "storage",
      reloadLocalData,
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
        "wonflow:demo-queue-changed",
        reloadLocalData,
      );

      window.removeEventListener(
        "storage",
        reloadLocalData,
      );
    };
  }, [reloadLocalData]);

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

  const practitionerFilterOptions =
    useMemo(() => {
      const options = new Map<
        string,
        {
          id: string;
          displayName: string;
          specialtyName: string;
        }
      >();

      practitioners.forEach((practitioner) => {
        options.set(practitioner.id, {
          id: practitioner.id,
          displayName: practitioner.displayName,
          specialtyName: practitioner.specialtyName,
        });
      });

      queueEntries.forEach((entry) => {
        const practitioner =
          entry.snapshot?.practitioner;

        if (
          practitioner === undefined ||
          options.has(entry.practitionerId)
        ) {
          return;
        }

        options.set(entry.practitionerId, {
          id: entry.practitionerId,
          displayName: practitioner.displayName,
          specialtyName: practitioner.specialtyName,
        });
      });

      return [...options.values()].sort(
        (left, right) =>
          left.displayName.localeCompare(
            right.displayName,
          ),
      );
    }, [
      practitioners,
      queueEntries,
    ]);

  const queuedAppointmentIds =
    useMemo(
      () =>
        new Set(
          queueEntries
            .filter(
              (entry) =>
                entry.status !==
                "cancelled",
            )
            .map(
              (entry) =>
                entry.appointmentId,
            ),
        ),
      [queueEntries],
    );

  const normalizedSearch =
    searchText
      .trim()
      .toLocaleLowerCase();

  const appointmentsReadyForCheckIn =
    useMemo(
      () =>
        appointments
          .filter(
            (appointment) => {
              if (
                appointment.status !==
                "booked"
              ) {
                return false;
              }

              if (
                appointment
                  .appointmentDate !==
                selectedDate
              ) {
                return false;
              }

              if (
                selectedBranchId !==
                  "all" &&
                appointment.branchId !==
                  selectedBranchId
              ) {
                return false;
              }

              if (
                selectedPractitionerId !==
                  "all" &&
                appointment
                  .practitionerId !==
                  selectedPractitionerId
              ) {
                return false;
              }

              if (
                queuedAppointmentIds.has(
                  appointment.id,
                )
              ) {
                return false;
              }

              if (
                normalizedSearch === ""
              ) {
                return true;
              }

              const patient =
                patientsById.get(
                  appointment.patientId,
                );

              const practitioner =
                practitionersById.get(
                  appointment
                    .practitionerId,
                );

              const searchableText = [
                appointment
                  .appointmentNumber,

                appointment
                  .serviceName,

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

                practitioner
                  ?.displayName ??
                  "",
              ]
                .join(" ")
                .toLocaleLowerCase();

              return searchableText.includes(
                normalizedSearch,
              );
            },
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                left
                  .scheduledStartAt,
              ).getTime() -
              new Date(
                right
                  .scheduledStartAt,
              ).getTime(),
          ),
      [
        appointments,
        normalizedSearch,
        patientsById,
        practitionersById,
        queuedAppointmentIds,
        selectedBranchId,
        selectedDate,
        selectedPractitionerId,
      ],
    );

  const visibleQueueEntries =
    useMemo(
      () =>
        sortDemoQueueEntries(
          queueEntries.filter(
            (entry) => {
              if (
                entry.businessDate !==
                selectedDate
              ) {
                return false;
              }

              if (
                selectedBranchId !==
                  "all" &&
                entry.branchId !==
                  selectedBranchId
              ) {
                return false;
              }

              if (
                selectedPractitionerId !==
                  "all" &&
                entry.practitionerId !==
                  selectedPractitionerId
              ) {
                return false;
              }

              if (
                selectedStatus !==
                  "all" &&
                entry.status !==
                  selectedStatus
              ) {
                return false;
              }

              if (
                normalizedSearch === ""
              ) {
                return true;
              }

              const patient =
                patientsById.get(
                  entry.patientId,
                );

              const practitioner =
                practitionersById.get(
                  entry.practitionerId,
                );

              const searchableText = [
                entry.tokenNumber,
                entry.serviceName,

                patient
                  ?.displayName ??
                  entry.snapshot?.patient.displayName ??
                  "",

                patient
                  ?.mrNumber ??
                  entry.snapshot?.patient.mrNumber ??
                  "",

                patient
                  ?.draft
                  .cnicNumber ??
                  entry.snapshot?.patient.identityNumber ??
                  "",

                entry.snapshot?.patient.mobileNumber ?? "",

                practitioner
                  ?.displayName ??
                  entry.snapshot?.practitioner.displayName ??
                  "",

                entry.snapshot?.practitioner.specialtyName ?? "",
                entry.snapshot?.visit.reasonForVisit ?? "",
                entry.snapshot?.billing.paymentStatus ?? "",

                entry.roomLabel ??
                  "",
              ]
                .join(" ")
                .toLocaleLowerCase();

              return searchableText.includes(
                normalizedSearch,
              );
            },
          ),
        ),
      [
        normalizedSearch,
        patientsById,
        practitionersById,
        queueEntries,
        selectedBranchId,
        selectedDate,
        selectedPractitionerId,
        selectedStatus,
      ],
    );

  const queueStatistics =
    useMemo(() => {
      const dateEntries =
        queueEntries.filter(
          (entry) =>
            entry.businessDate ===
              selectedDate &&
            (
              selectedBranchId ===
                "all" ||
              entry.branchId ===
                selectedBranchId
            ),
        );

      const waitingEntries =
        dateEntries.filter(
          (entry) =>
            entry.status ===
            "waiting",
        );

      const averageWaitMinutes =
        waitingEntries.length === 0
          ? 0
          : Math.round(
              waitingEntries.reduce(
                (
                  total,
                  entry,
                ) =>
                  total +
                  calculateDemoQueueWaitMinutes(
                    entry,
                  ),
                0,
              ) /
                waitingEntries.length,
            );

      return {
        waiting:
          waitingEntries.length,

        called:
          dateEntries.filter(
            (entry) =>
              entry.status ===
              "called",
          ).length,

        serving:
          dateEntries.filter(
            (entry) =>
              entry.status ===
              "serving",
          ).length,

        urgent:
          dateEntries.filter(
            (entry) =>
              entry.priority === "urgent" &&
              entry.status !== "completed" &&
              entry.status !== "cancelled",
          ).length,

        averageWaitMinutes,
      };
    }, [
      queueEntries,
      selectedBranchId,
      selectedDate,
    ]);

  function checkInAppointment(
    appointment:
      DemoAppointmentBooking,
  ) {
    const queueEntry =
      createDemoQueueEntryFromAppointment(
        appointment,
        appointment.priority,
      );

    updateDemoAppointmentBookingStatus(
      appointment.id,
      "checked-in",
    );

    reloadLocalData();

    setActionMessage(
      `Patient checked in successfully. Token ${queueEntry.tokenNumber} generated.`,
    );
  }

  return (
    <div className="space-y-3">
      <WonFlowActionBar
        description="Search appointments and live queue tokens by patient, MR number, CNIC, doctor or service."
        filters={
          <>
            <label className="relative min-w-64 flex-1">
              <span className="sr-only">
                Search reception queue
              </span>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <SearchIcon />
              </span>

              <input
                className={[
                  INPUT_CLASS_NAME,
                  "pl-10",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setSearchText(
                    event.target.value,
                  );
                }}
                placeholder="Patient, MR, CNIC, token, doctor or service"
                type="search"
                value={searchText}
              />
            </label>

            <input
              aria-label="Queue date"
              className="h-9 min-w-36 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 outline-none"
              onChange={(
                event,
              ) => {
                setSelectedDate(
                  event.target.value,
                );
              }}
              type="date"
              value={selectedDate}
            />

            <select
              aria-label="Queue branch"
              className="h-9 min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 outline-none"
              onChange={(
                event,
              ) => {
                setSelectedBranchId(
                  event.target.value,
                );
              }}
              value={
                selectedBranchId
              }
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
          </>
        }
        secondaryActions={
          <WonFlowActionButton
            icon={<RefreshIcon />}
            onClick={
              reloadLocalData
            }
            variant="ghost"
          >
            Refresh Queue
          </WonFlowActionButton>
        }
        summary={
          `${queueStatistics.waiting} waiting`
        }
        title="Reception Queue Controls"
      />

      {actionMessage !==
      undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          {actionMessage}
        </div>
      ) : null}

      <WonFlowOperationalPanel
        compact
        description="Filter the queue by doctor and operational state."
        icon={<QueueIcon />}
        title="Live Queue Filters"
        tone="slate"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            aria-label="Filter by doctor"
            className={INPUT_CLASS_NAME}
            onChange={(
              event,
            ) => {
              setSelectedPractitionerId(
                event.target.value,
              );
            }}
            value={
              selectedPractitionerId
            }
          >
            <option value="all">
              All Doctors
            </option>

            {practitionerFilterOptions.map(
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
                  {" — "}
                  {
                    practitioner
                      .specialtyName
                  }
                </option>
              ),
            )}
          </select>

          <select
            aria-label="Filter queue status"
            className={INPUT_CLASS_NAME}
            onChange={(
              event,
            ) => {
              setSelectedStatus(
                event.target
                  .value as
                  "all" |
                  DemoQueueStatus,
              );
            }}
            value={selectedStatus}
          >
            <option value="all">
              All Queue States
            </option>

            <option value="waiting">
              Waiting
            </option>

            <option value="called">
              Called
            </option>

            <option value="serving">
              Serving
            </option>

            <option value="completed">
              Completed
            </option>

            <option value="skipped">
              Skipped
            </option>

            <option value="cancelled">
              Cancelled
            </option>
          </select>
        </div>
      </WonFlowOperationalPanel>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <CompactQueueStat
          label="Waiting"
          tone="blue"
          value={queueStatistics.waiting}
        />
        <CompactQueueStat
          label="Called"
          tone="amber"
          value={queueStatistics.called}
        />
        <CompactQueueStat
          label="Serving"
          tone="violet"
          value={queueStatistics.serving}
        />
        <CompactQueueStat
          label="Urgent"
          tone="rose"
          value={queueStatistics.urgent}
        />
        <CompactQueueStat
          label="Average Wait"
          tone="emerald"
          value={formatWaitMinutes(
            queueStatistics.averageWaitMinutes,
          )}
        />
      </div>

      <WonFlowOperationalPanel
        description="Booked appointments that have not yet entered the live queue."
        icon={<UsersIcon />}
        status={
          <StatusBadge
            className="bg-blue-50 text-blue-700 ring-blue-100"
            label={`${appointmentsReadyForCheckIn.length} ready`}
          />
        }
        title="Reception Check-In"
        tone="blue"
      >
        {appointmentsReadyForCheckIn.length ===
        0 ? (
          <WonFlowEmptyState
            description="No booked appointment is waiting for reception check-in on the selected date."
            title="No appointments ready"
          />
        ) : (
          <div className="wf-content-scroll">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  <th className="pb-3">
                    Time
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
                    Priority
                  </th>

                  <th className="pb-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {appointmentsReadyForCheckIn.map(
                  (appointment) => {
                    const patient =
                      patientsById.get(
                        appointment
                          .patientId,
                      );

                    const practitioner =
                      practitionersById.get(
                        appointment
                          .practitionerId,
                      );

                    const branch =
                      branchesById.get(
                        appointment
                          .branchId,
                      );

                    return (
                      <tr
                        className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40"
                        key={
                          appointment.id
                        }
                      >
                        <td className="py-4 pr-4 text-sm font-black text-indigo-700">
                          {formatWonFlowDashboardTime(
                            appointment
                              .scheduledStartAt,
                          )}
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

                        <td className="py-4 pr-4 text-sm font-semibold text-slate-700">
                          {
                            appointment
                              .serviceName
                          }
                        </td>

                        <td className="py-4 pr-4 text-sm font-semibold text-slate-600">
                          {branch
                            ?.name ??
                            "Unknown branch"}
                        </td>

                        <td className="py-4 pr-4">
                          <StatusBadge
                            className={getPriorityClassName(
                              appointment.priority,
                            )}
                            label={humanizeValue(
                              appointment.priority,
                            )}
                          />
                        </td>

                        <td className="py-4 text-right">
                          <button
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                            onClick={() => {
                              checkInAppointment(
                                appointment,
                              );
                            }}
                            type="button"
                          >
                            Check In
                          </button>
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

      <WonFlowOperationalPanel
        description="Patients currently moving through the hospital reception and consultation queue."
        icon={<QueueIcon />}
        status={
          <StatusBadge
            className="bg-violet-50 text-violet-700 ring-violet-100"
            label={`${visibleQueueEntries.length} queue records`}
          />
        }
        title="Live Patient Queue"
        tone="violet"
      >
        {visibleQueueEntries.length ===
        0 ? (
          <WonFlowEmptyState
            description="No queue record matches the current date and filters."
            title="Queue is empty"
          />
        ) : (
          <div className="wf-content-scroll">
            <table className="w-full min-w-[1050px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[9px] uppercase tracking-[0.1em] text-slate-400">
                  <th className="pb-3">
                    Token
                  </th>

                  <th className="pb-3">
                    Patient
                  </th>

                  <th className="pb-3">
                    Doctor / Service
                  </th>

                  <th className="pb-3">
                    Priority
                  </th>

                  <th className="pb-3">
                    Wait
                  </th>

                  <th className="pb-3">
                    Room
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
                {visibleQueueEntries.map(
                  (entry) => {
                    const patient =
                      patientsById.get(
                        entry.patientId,
                      );

                    const practitioner =
                      practitionersById.get(
                        entry
                          .practitionerId,
                      );

                    const snapshot = entry.snapshot;
                    const patientName =
                      patient?.displayName ??
                      snapshot?.patient.displayName ??
                      "Unknown patient";
                    const mrNumber =
                      patient?.mrNumber ??
                      snapshot?.patient.mrNumber ??
                      "No MR number";
                    const identityNumber =
                      patient?.draft.cnicNumber ??
                      snapshot?.patient.identityNumber ??
                      "No identity";
                    const doctorName =
                      practitioner?.displayName ??
                      snapshot?.practitioner.displayName ??
                      "Unknown doctor";
                    const specialtyName =
                      snapshot?.practitioner.specialtyName ??
                      practitioner?.specialtyName ??
                      "";
                    const reasonForVisit =
                      snapshot?.visit.reasonForVisit ??
                      entry.notes;
                    const paymentStatus =
                      snapshot?.billing.paymentStatus;

                    return (
                      <tr
                        className="border-b border-slate-100 align-top last:border-0 hover:bg-violet-50/30"
                        key={entry.id}
                      >
                        <td className="py-2.5 pr-4">
                          <div className="flex h-9 min-w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 px-2 text-[10px] font-black text-white shadow-sm">
                            {
                              entry.tokenNumber
                            }
                          </div>
                        </td>

                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[9px] font-black text-indigo-700">
                              {getInitials(patientName)}
                            </div>

                            <div>
                              <div className="text-[11px] font-black text-slate-950">
                                {patientName}
                              </div>

                              <div className="mt-0.5 text-[9px] font-bold text-indigo-600">
                                {mrNumber}
                              </div>

                              <div className="mt-0.5 font-mono text-[9px] text-slate-500">
                                {identityNumber}
                              </div>

                              {paymentStatus !== undefined ? (
                                <span
                                  className={[
                                    "mt-1 inline-flex rounded-full px-2 py-0.5",
                                    "text-[8px] font-black uppercase",
                                    paymentStatus === "paid"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : paymentStatus === "partial"
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-rose-50 text-rose-700",
                                  ].join(" ")}
                                >
                                  {paymentStatus}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 pr-4">
                          <div className="text-[11px] font-bold text-slate-800">
                            {doctorName}
                          </div>

                          <div className="mt-0.5 text-[9px] font-semibold text-indigo-600">
                            {specialtyName}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-500">
                            {entry.serviceName}
                          </div>

                          {reasonForVisit !== "" ? (
                            <div
                              className="mt-1 max-w-[240px] truncate text-[9px] font-medium text-slate-400"
                              title={reasonForVisit}
                            >
                              {reasonForVisit}
                            </div>
                          ) : null}
                        </td>

                        <td className="py-2.5 pr-4">
                          <StatusBadge
                            className={getPriorityClassName(
                              entry.priority,
                            )}
                            label={humanizeValue(entry.priority)}
                          />
                        </td>

                        <td className="py-2.5 pr-4">
                          <div className="text-[11px] font-black text-slate-800">
                            {formatWaitMinutes(
                              calculateDemoQueueWaitMinutes(
                                entry,
                              ),
                            )}
                          </div>

                          <div className="mt-0.5 text-[9px] text-slate-400">
                            Since check-in
                          </div>
                        </td>

                        <td className="py-2.5 pr-4">
                          <div className="text-[11px] font-black text-slate-800">
                            {entry.roomLabel ?? "Doctor sitting not started"}
                          </div>
                          <div className="mt-0.5 text-[9px] text-slate-400">
                            Assigned by doctor
                          </div>
                        </td>

                        <td className="py-2.5 pr-4">
                          <StatusBadge
                            className={getQueueStatusClassName(
                              entry.status,
                            )}
                            label={humanizeValue(
                              entry.status,
                            )}
                          />
                        </td>

                        <td className="py-2.5 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700"
                              href={`/doctor/consultations?queueEntryId=${encodeURIComponent(
                                entry.id,
                              )}`}
                            >
                              View
                            </Link>

                            <button
                              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                              onClick={() => window.print()}
                              type="button"
                            >
                              Print Token
                            </button>

                            {entry.status !== "completed" &&
                            entry.status !== "cancelled" ? (
                              <button
                                className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Cancel ${entry.tokenNumber}?`,
                                    )
                                  ) {
                                    updateDemoQueueEntryStatus(
                                      entry.id,
                                      "cancelled",
                                    );
                                    reloadLocalData();
                                  }
                                }}
                                type="button"
                              >
                                Cancel
                              </button>
                            ) : null}
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
    </div>
  );
}

export function ReceptionQueueWorkflow() {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "reception-queue:directories",

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
    <div className="space-y-3">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
              href="/operations/appointments"
            >
              Appointments
            </Link>

            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm"
              href="/operations/appointments/new"
            >
              Book Appointment
            </Link>
          </div>
        }
        breadcrumbs={[
          {
            label:
              "Hospital Operations",
            href: "/operations",
          },
          {
            label:
              "Reception",
          },
          {
            label:
              "Live Queue",
          },
        ]}
        description="Check in booked patients, generate queue tokens, assign rooms and manage the live consultation queue."
        eyebrow="Reception and Queue Management"
        leading={<QueueIcon />}
        metadata={
          <>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 ring-1 ring-emerald-100">
              Live patient flow
            </span>

            <span>
              Fictional browser-local queue
            </span>
          </>
        }
        title="Reception Check-In and Live Queue"
      />

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-blue-50 px-4 py-3 text-xs leading-5 text-slate-600">
        <strong className="text-violet-800">
          Demonstration mode:
        </strong>
        {" "}
        Queue tokens and state changes are fictional and stored locally in this browser.
      </div>

      <WonFlowAsyncDataBoundary
        emptyDescription="No hospital branches are available for reception queue management."
        emptyTitle="Queue unavailable"
        loadingDescription="WonFlow is preparing branches, doctors and reception information."
        loadingTitle="Preparing live patient queue"
        onRetry={
          directories.reload
        }
        state={directories}
      >
        {(directory) => (
          <ReceptionQueueContent
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

function CompactQueueStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone:
    | "blue"
    | "amber"
    | "violet"
    | "rose"
    | "emerald";
}) {
  const toneClassName = {
    blue: "border-blue-100 bg-blue-50/70 text-blue-800",
    amber: "border-amber-100 bg-amber-50/70 text-amber-800",
    violet: "border-violet-100 bg-violet-50/70 text-violet-800",
    rose: "border-rose-100 bg-rose-50/70 text-rose-800",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-800",
  }[tone];

  return (
    <div
      className={[
        "flex min-h-14 items-center justify-between",
        "rounded-xl border px-3 py-2",
        toneClassName,
      ].join(" ")}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.1em] opacity-70">
        {label}
      </div>
      <div className="text-lg font-black">
        {value}
      </div>
    </div>
  );
}
