"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import type {
  MockAdmission,
  MockAppointment,
  MockPractitioner,
  MockQueueEntry,
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
  WonFlowKpiCard,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  formatWonFlowDashboardDateTime,
  formatWonFlowDashboardTime,
  useWonFlowDoctorDashboard,
} from "@/lib/dashboard";

import type {
  WonFlowDoctorDashboardProjection,
} from "@/lib/dashboard";

function DoctorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M8 4v5a4 4 0 0 0 8 0V4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />

      <path
        d="M6 4h4M14 4h4M12 13v2a5 5 0 0 0 5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />

      <circle
        cx="19"
        cy="18"
        r="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

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

function PatientsIcon() {
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

function BedIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 19v-9M20 19v-6a3 3 0 0 0-3-3H9v7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />

      <path
        d="M4 17h16M6 10V7h4a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
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

function humanizeStatus(
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
  displayName: string,
): string {
  return displayName
    .replace("Dr. ", "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0).toUpperCase(),
    )
    .join("");
}

function getAppointmentStatusClass(
  status:
    MockAppointment["status"],
): string {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";

    case "in-consultation":
      return "bg-violet-50 text-violet-700 ring-violet-100";

    case "arrived":
    case "checked-in":
      return "bg-blue-50 text-blue-700 ring-blue-100";

    case "booked":
    case "confirmed":
      return "bg-amber-50 text-amber-700 ring-amber-100";

    case "cancelled":
    case "no-show":
      return "bg-rose-50 text-rose-700 ring-rose-100";
  }
}

function getQueueStatusClass(
  status:
    MockQueueEntry["status"],
): string {
  switch (status) {
    case "waiting":
      return "bg-amber-50 text-amber-700 ring-amber-100";

    case "called":
      return "bg-blue-50 text-blue-700 ring-blue-100";

    case "serving":
      return "bg-violet-50 text-violet-700 ring-violet-100";

    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";

    case "skipped":
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getPractitionerStatusClass(
  status:
    MockPractitioner["operationalStatus"],
): string {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";

    case "in-consultation":
    case "in-procedure":
      return "bg-violet-50 text-violet-700 ring-violet-100";

    case "on-break":
      return "bg-amber-50 text-amber-700 ring-amber-100";

    case "off-duty":
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getAdmissionStatusClass(
  status:
    MockAdmission["status"],
): string {
  switch (status) {
    case "admitted":
      return "bg-blue-50 text-blue-700 ring-blue-100";

    case "awaiting-bed":
      return "bg-amber-50 text-amber-700 ring-amber-100";

    case "transfer-pending":
      return "bg-violet-50 text-violet-700 ring-violet-100";

    case "discharge-planning":
      return "bg-cyan-50 text-cyan-700 ring-cyan-100";

    case "discharge-ready":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
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

interface DoctorDashboardContentProps {
  projection:
    WonFlowDoctorDashboardProjection;

  practitioners:
    readonly MockPractitioner[];

  selectedPractitionerId:
    MockPractitioner["id"];

  onPractitionerChange(
    practitionerId:
      MockPractitioner["id"],
  ): void;

  onRefresh(): void;

  refreshing: boolean;
}

function DoctorDashboardContent({
  projection,
  practitioners,
  selectedPractitionerId,
  onPractitionerChange,
  onRefresh,
  refreshing,
}: DoctorDashboardContentProps) {
  const patientsById =
    useMemo(
      () =>
        new Map(
          projection.patients.map(
            (patient) => [
              patient.id,
              patient,
            ],
          ),
        ),
      [projection.patients],
    );

  const nextAppointment =
    projection.appointments.find(
      (appointment) =>
        appointment.status !==
          "completed" &&
        appointment.status !==
          "cancelled" &&
        appointment.status !==
          "no-show",
    );

  const nextPatient =
    nextAppointment === undefined
      ? undefined
      : patientsById.get(
          nextAppointment.patientId,
        );

  return (
    <div className="space-y-6">
      <WonFlowActionBar
        description="Switch the active demonstration doctor and refresh their workspace."
        filters={
          <label className="flex min-w-64 flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500">
              Active doctor
            </span>

            <select
              className={[
                "h-11 rounded-xl",
                "border border-slate-200",
                "bg-white px-3.5",
                "text-sm font-semibold",
                "text-slate-800",
                "outline-none transition",
                "focus:border-blue-400",
                "focus:ring-2",
                "focus:ring-blue-100",
              ].join(" ")}
              onChange={(
                event,
              ) => {
                onPractitionerChange(
                  event.target.value,
                );
              }}
              value={
                selectedPractitionerId
              }
            >
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
                      practitioner.displayName
                    }
                    {" — "}
                    {
                      practitioner.specialtyName
                    }
                  </option>
                ),
              )}
            </select>
          </label>
        }
        primaryActions={
          <WonFlowActionButton
            icon={<RefreshIcon />}
            onClick={onRefresh}
            variant="primary"
          >
            {refreshing
              ? "Refreshing"
              : "Refresh Workspace"}
          </WonFlowActionButton>
        }
        summary={
          <StatusBadge
            className={getPractitionerStatusClass(
              projection
                .practitioner
                .operationalStatus,
            )}
            label={humanizeStatus(
              projection
                .practitioner
                .operationalStatus,
            )}
          />
        }
        title="Doctor Workspace Controls"
      />

      <section
        className={[
          "overflow-hidden rounded-3xl",
          "border border-indigo-100",
          "bg-gradient-to-r",
          "from-blue-600",
          "via-indigo-600",
          "to-violet-600",
          "p-5 text-white",
          "shadow-lg",
          "shadow-indigo-600/15",
          "sm:p-6",
        ].join(" ")}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={[
                "flex h-16 w-16",
                "shrink-0 items-center",
                "justify-center rounded-3xl",
                "bg-white/15",
                "text-xl font-black",
                "ring-1 ring-white/25",
                "backdrop-blur",
              ].join(" ")}
            >
              {getInitials(
                projection
                  .practitioner
                  .displayName,
              )}
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
                Doctor Workspace
              </div>

              <h2 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">
                {
                  projection
                    .practitioner
                    .displayName
                }
              </h2>

              <p className="mt-1 text-sm text-indigo-100">
                {
                  projection
                    .practitioner
                    .specialtyName
                }
                {" · "}
                Employee
                {" "}
                {
                  projection
                    .practitioner
                    .employeeNumber
                }
              </p>
            </div>
          </div>

          {nextAppointment !==
          undefined ? (
            <div
              className={[
                "min-w-72 rounded-2xl",
                "bg-white/12 p-4",
                "ring-1 ring-white/20",
                "backdrop-blur",
              ].join(" ")}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-blue-100">
                Next patient
              </div>

              <div className="mt-2 text-base font-extrabold">
                {nextPatient
                  ?.displayName ??
                  "Patient record"}
              </div>

              <div className="mt-1 text-sm text-indigo-100">
                {formatWonFlowDashboardTime(
                  nextAppointment
                    .scheduledStartAt,
                )}
                {" · "}
                {
                  nextAppointment
                    .serviceName
                }
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/12 px-4 py-3 text-sm font-semibold text-indigo-100 ring-1 ring-white/20">
              No upcoming appointment
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <WonFlowKpiCard
          helperText="Scheduled for the demonstration day"
          icon={<CalendarIcon />}
          label="Today’s Appointments"
          tone="blue"
          value={
            projection
              .summary
              .todayAppointments
          }
        />

        <WonFlowKpiCard
          helperText="Consultations already completed"
          icon={<CheckIcon />}
          label="Completed"
          tone="emerald"
          value={
            projection
              .summary
              .completedAppointments
          }
        />

        <WonFlowKpiCard
          helperText="Waiting, called or serving"
          icon={<QueueIcon />}
          label="Current Queue"
          tone="amber"
          value={
            projection
              .summary
              .waitingPatients
          }
        />

        <WonFlowKpiCard
          helperText="Distinct patients scheduled today"
          icon={<PatientsIcon />}
          label="Unique Patients"
          tone="violet"
          value={
            projection
              .summary
              .uniquePatientsToday
          }
        />

        <WonFlowKpiCard
          helperText="Current inpatient responsibility"
          icon={<BedIcon />}
          label="Active Inpatients"
          tone="rose"
          value={
            projection
              .summary
              .activeAdmissions
          }
        />
      </div>

      <WonFlowOperationalPanel
        compact
        description="Move directly to today’s main clinical work areas."
        title="Clinical Quick Navigation"
        tone="slate"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              href:
                "#doctor-schedule",
              label:
                "Today’s Schedule",
              value:
                projection
                  .appointments
                  .length,
              className:
                "from-blue-50 to-indigo-50 text-blue-800 ring-blue-100",
            },
            {
              href:
                "#doctor-queue",
              label:
                "Current Queue",
              value:
                projection
                  .currentQueue
                  .length,
              className:
                "from-amber-50 to-orange-50 text-amber-800 ring-amber-100",
            },
            {
              href:
                "#doctor-inpatients",
              label:
                "Inpatient Cases",
              value:
                projection
                  .activeAdmissions
                  .length,
              className:
                "from-violet-50 to-rose-50 text-violet-800 ring-violet-100",
            },
          ].map(
            (item) => (
              <Link
                className={[
                  "rounded-2xl",
                  "bg-gradient-to-br",
                  "p-4 ring-1",
                  "transition",
                  "hover:-translate-y-0.5",
                  "hover:shadow-md",
                  item.className,
                ].join(" ")}
                href={item.href}
                key={item.href}
              >
                <div className="text-2xl font-black">
                  {item.value}
                </div>

                <div className="mt-1 text-sm font-bold">
                  {item.label}
                </div>

                <div className="mt-3 text-xs font-semibold opacity-70">
                  Open section →
                </div>
              </Link>
            ),
          )}
        </div>
      </WonFlowOperationalPanel>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.7fr)]">
        <div id="doctor-schedule">
          <WonFlowOperationalPanel
            description="Today’s complete appointment schedule with patient and consultation context."
            icon={<CalendarIcon />}
            status={
              <StatusBadge
                className="bg-blue-50 text-blue-700 ring-blue-100"
                label={`${projection.appointments.length} appointments`}
              />
            }
            title="Today’s Clinical Schedule"
            tone="blue"
          >
            {projection
              .appointments
              .length === 0 ? (
              <WonFlowEmptyState
                description="This doctor has no appointments scheduled for the demonstration day."
                title="No appointments scheduled"
              />
            ) : (
              <div className="wf-content-scroll">
                <table className="w-full min-w-[780px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                      <th className="pb-3 font-extrabold">
                        Time
                      </th>

                      <th className="pb-3 font-extrabold">
                        Patient
                      </th>

                      <th className="pb-3 font-extrabold">
                        Service
                      </th>

                      <th className="pb-3 font-extrabold">
                        Visit Reason
                      </th>

                      <th className="pb-3 text-right font-extrabold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {projection
                      .appointments
                      .map(
                        (
                          appointment,
                        ) => {
                          const patient =
                            patientsById.get(
                              appointment
                                .patientId,
                            );

                          return (
                            <tr
                              className="border-b border-slate-100 transition hover:bg-blue-50/40 last:border-0"
                              key={
                                appointment.id
                              }
                            >
                              <td className="py-4">
                                <div className="text-sm font-black text-indigo-700">
                                  {formatWonFlowDashboardTime(
                                    appointment
                                      .scheduledStartAt,
                                  )}
                                </div>

                                <div className="mt-1 text-xs text-slate-400">
                                  {
                                    appointment
                                      .appointmentNumber
                                  }
                                </div>
                              </td>

                              <td className="py-4">
                                <div className="text-sm font-bold text-slate-950">
                                  {patient
                                    ?.displayName ??
                                    "Unknown patient"}
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  {patient
                                    ?.mrNumber ??
                                    "No MR number"}
                                </div>
                              </td>

                              <td className="py-4 text-sm font-semibold text-slate-700">
                                {
                                  appointment
                                    .serviceName
                                }
                              </td>

                              <td className="max-w-52 py-4 text-sm text-slate-600">
                                <span className="line-clamp-2">
                                  {
                                    appointment
                                      .reasonForVisit
                                  }
                                </span>
                              </td>

                              <td className="py-4 text-right">
                                <StatusBadge
                                  className={getAppointmentStatusClass(
                                    appointment.status,
                                  )}
                                  label={humanizeStatus(
                                    appointment.status,
                                  )}
                                />
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

        <div id="doctor-queue">
          <WonFlowOperationalPanel
            description="Patients currently waiting or being served by this doctor."
            icon={<QueueIcon />}
            status={
              <StatusBadge
                className="bg-amber-50 text-amber-700 ring-amber-100"
                label={`${projection.currentQueue.length} active`}
              />
            }
            title="Current Patient Queue"
            tone="amber"
          >
            {projection
              .currentQueue
              .length === 0 ? (
              <WonFlowEmptyState
                description="There are no patients currently waiting in this doctor’s queue."
                title="Queue is clear"
              />
            ) : (
              <div className="space-y-3">
                {projection
                  .currentQueue
                  .map(
                    (entry) => {
                      const patient =
                        patientsById.get(
                          entry.patientId,
                        );

                      return (
                        <div
                          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5"
                          key={entry.id}
                        >
                          <div
                            className={[
                              "flex h-12 w-12",
                              "shrink-0 items-center",
                              "justify-center rounded-2xl",
                              "bg-gradient-to-br",
                              "from-amber-100",
                              "to-orange-100",
                              "text-sm font-black",
                              "text-amber-800",
                              "ring-1 ring-amber-200",
                            ].join(" ")}
                          >
                            {
                              entry.tokenNumber
                            }
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-slate-950">
                              {patient
                                ?.displayName ??
                                "Unknown patient"}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              Queue position
                              {" "}
                              {
                                entry.queuePosition
                              }
                            </div>
                          </div>

                          <StatusBadge
                            className={getQueueStatusClass(
                              entry.status,
                            )}
                            label={humanizeStatus(
                              entry.status,
                            )}
                          />
                        </div>
                      );
                    },
                  )}
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>
      </div>

      <div id="doctor-inpatients">
        <WonFlowOperationalPanel
          description="Current admitted patients connected to this practitioner."
          icon={<BedIcon />}
          status={
            <StatusBadge
              className="bg-violet-50 text-violet-700 ring-violet-100"
              label={`${projection.activeAdmissions.length} cases`}
            />
          }
          title="Active Inpatient Cases"
          tone="violet"
        >
          {projection
            .activeAdmissions
            .length === 0 ? (
            <WonFlowEmptyState
              description="This doctor currently has no connected inpatient cases."
              title="No active inpatient cases"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projection
                .activeAdmissions
                .map(
                  (admission) => {
                    const patient =
                      patientsById.get(
                        admission.patientId,
                      );

                    return (
                      <article
                        className={[
                          "rounded-2xl border",
                          "border-slate-100",
                          "bg-gradient-to-br",
                          "from-white",
                          "to-violet-50/60",
                          "p-4 shadow-sm",
                        ].join(" ")}
                        key={
                          admission.id
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-slate-950">
                              {patient
                                ?.displayName ??
                                "Unknown patient"}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {patient
                                ?.mrNumber ??
                                admission
                                  .admissionNumber}
                            </div>
                          </div>

                          <StatusBadge
                            className={getAdmissionStatusClass(
                              admission.status,
                            )}
                            label={humanizeStatus(
                              admission.status,
                            )}
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Ward
                            </div>

                            <div className="mt-1 text-sm font-bold text-slate-700">
                              {
                                admission
                                  .wardName
                              }
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Bed
                            </div>

                            <div className="mt-1 text-sm font-bold text-slate-700">
                              {
                                admission
                                  .bedName
                              }
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 text-xs leading-5 text-slate-500">
                          Admitted
                          {" "}
                          {formatWonFlowDashboardDateTime(
                            admission
                              .admittedAt,
                          )}
                        </div>
                      </article>
                    );
                  },
                )}
            </div>
          )}
        </WonFlowOperationalPanel>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-blue-50 px-4 py-3 text-xs leading-5 text-slate-600">
        <strong className="text-violet-800">
          Demonstration source:
        </strong>
        {" "}
        {projection.source.datasetName}
        {" · "}
        Version
        {" "}
        {projection.source.datasetVersion}
      </div>
    </div>
  );
}

export function DoctorWorkspaceDashboard() {
  const hospitalService =
    useWonFlowHospitalService();

  const [
    selectedPractitionerId,
    setSelectedPractitionerId,
  ] = useState<
    MockPractitioner["id"] |
    undefined
  >();

  const practitionerDirectory =
    useWonFlowAsyncData({
      key:
        "doctor-workspace:practitioners",

      loader: (signal) =>
        hospitalService
          .listPractitioners(
            {
              limit: 100,
            },
            signal,
          ),

      isEmpty: (page) =>
        page.items.length === 0,
    });

  const practitioners =
    practitionerDirectory
      .data
      ?.items ??
    [];

  const activePractitionerId =
    selectedPractitionerId ??
    practitioners.find(
      (practitioner) =>
        practitioner
          .operationalStatus !==
        "off-duty",
    )?.id ??
    practitioners[0]?.id;

  const dashboard =
    useWonFlowDoctorDashboard(
      activePractitionerId,
    );

  const refreshWorkspace = () => {
    practitionerDirectory.reload();
    dashboard.reload();
  };

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href="/doctor/results"
            >
              Laboratory Results
            </Link>

            <Link
              className="wf-button-secondary"
              href="/doctor/radiology-results"
            >
              Radiology Results
            </Link>

            <Link
              className={[
                "inline-flex min-h-10",
                "items-center justify-center",
                "rounded-xl",
                "bg-gradient-to-r",
                "from-violet-600",
                "to-indigo-600",
                "px-4 py-2",
                "text-sm font-bold",
                "text-white shadow-sm",
                "transition",
                "hover:from-violet-700",
                "hover:to-indigo-700",
              ].join(" ")}
              href="/doctor/consultations"
            >
              Open Patient Queue
            </Link>
          </div>
        }
        breadcrumbs={[
          {
            label:
              "Doctor Workspace",
          },
          {
            label:
              "Clinical Dashboard",
          },
        ]}
        description="A focused clinical workspace for today’s appointments, waiting patients and active inpatient responsibilities."
        eyebrow="Clinical Workspace"
        leading={<DoctorIcon />}
        metadata={
          <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700 ring-1 ring-blue-100">
            Doctor-focused view
          </span>
        }
        title="Doctor Clinical Dashboard"
      />

      <WonFlowAsyncDataBoundary
        emptyDescription="No practitioner records are available in the current demonstration scenario."
        emptyTitle="No doctors available"
        loadingDescription="WonFlow is preparing the practitioner directory."
        loadingTitle="Loading doctor workspace"
        onRetry={
          practitionerDirectory.reload
        }
        state={
          practitionerDirectory
        }
      >
        {() => {
          if (
            activePractitionerId ===
            undefined
          ) {
            return (
              <WonFlowEmptyState
                description="A practitioner must be selected before the clinical workspace can load."
                title="Select a doctor"
              />
            );
          }

          return (
            <WonFlowAsyncDataBoundary
              emptyDescription="The selected doctor has no dashboard information."
              emptyTitle="No clinical activity"
              loadingDescription="WonFlow is assembling the selected doctor’s appointments, queue and inpatient cases."
              loadingTitle="Preparing clinical dashboard"
              onRetry={
                dashboard.reload
              }
              state={dashboard}
            >
              {(projection) => (
                <DoctorDashboardContent
                  onPractitionerChange={
                    setSelectedPractitionerId
                  }
                  onRefresh={
                    refreshWorkspace
                  }
                  practitioners={
                    practitioners
                  }
                  projection={
                    projection
                  }
                  refreshing={
                    dashboard
                      .isRefreshing ||
                    practitionerDirectory
                      .isRefreshing
                  }
                  selectedPractitionerId={
                    activePractitionerId
                  }
                />
              )}
            </WonFlowAsyncDataBoundary>
          );
        }}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
