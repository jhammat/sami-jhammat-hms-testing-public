"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import type {
  MockAdmission,
  MockAppointment,
  MockInvoiceSummary,
  MockPatient,
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
  formatWonFlowDashboardMoney,
  formatWonFlowDashboardTime,
  useWonFlowPatientDashboard,
} from "@/lib/dashboard";

import type {
  WonFlowPatientDashboardProjection,
} from "@/lib/dashboard";

function PatientIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M5 21a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />

      <path
        d="M19 7h3M20.5 5.5v3"
        stroke="currentColor"
        strokeLinecap="round"
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

function HistoryIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 12a8 8 0 1 0 2.3-5.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />

      <path
        d="M4 5v5h5M12 8v5l3 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
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

function InvoiceIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />

      <path
        d="M9 8h6M9 12h6M9 16h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 7a3 3 0 0 1 3-3h11v4H7a3 3 0 0 0 0 6h13v6H7a3 3 0 0 1-3-3V7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />

      <path
        d="M17 11h4v5h-4a2.5 2.5 0 0 1 0-5Z"
        stroke="currentColor"
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

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />

      <path
        d="m8.5 12 2.2 2.2 4.8-5"
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

function getInvoiceStatusClass(
  status:
    MockInvoiceSummary["status"],
): string {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";

    case "partially-paid":
      return "bg-blue-50 text-blue-700 ring-blue-100";

    case "draft":
    case "issued":
      return "bg-amber-50 text-amber-700 ring-amber-100";

    case "overdue":
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

interface PatientDashboardContentProps {
  projection:
    WonFlowPatientDashboardProjection;

  patients:
    readonly MockPatient[];

  selectedPatientId:
    MockPatient["id"];

  onPatientChange(
    patientId:
      MockPatient["id"],
  ): void;

  onRefresh(): void;

  refreshing: boolean;
}

function PatientDashboardContent({
  projection,
  patients,
  selectedPatientId,
  onPatientChange,
  onRefresh,
  refreshing,
}: PatientDashboardContentProps) {
  const branchesById =
    useMemo(
      () =>
        new Map(
          projection.branches.map(
            (branch) => [
              branch.id,
              branch,
            ],
          ),
        ),
      [projection.branches],
    );

  const practitionersById =
    useMemo(
      () =>
        new Map(
          projection.practitioners.map(
            (practitioner) => [
              practitioner.id,
              practitioner,
            ],
          ),
        ),
      [projection.practitioners],
    );

  const nextAppointment =
    projection
      .upcomingAppointments[0];

  const nextDoctor =
    nextAppointment === undefined
      ? undefined
      : practitionersById.get(
          nextAppointment
            .practitionerId,
        );

  const nextBranch =
    nextAppointment === undefined
      ? undefined
      : branchesById.get(
          nextAppointment.branchId,
        );

  return (
    <div className="space-y-4">
      <WonFlowActionBar
        description="Select a patient profile and refresh their connected care information."
        filters={
          <label className="flex min-w-64 flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500">
              Patient profile
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
                onPatientChange(
                  event.target
                    .value as
                    MockPatient["id"],
                );
              }}
              value={
                selectedPatientId
              }
            >
              {patients.map(
                (patient) => (
                  <option
                    key={patient.id}
                    value={patient.id}
                  >
                    {patient.displayName}
                    {" — "}
                    {patient.mrNumber}
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
              : "Refresh My Care"}
          </WonFlowActionButton>
        }
        summary="Secure patient overview"
        title="Patient Access Controls"
      />

      <section
        className={[
          "relative isolate overflow-hidden rounded-[24px]",
          "border border-indigo-300/30",
          "bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.28),transparent_30%),linear-gradient(115deg,#0f172a_0%,#1d4ed8_48%,#6d28d9_100%)]",
          "p-4 text-white",
          "shadow-[0_22px_55px_rgba(30,64,175,0.25)]",
          "sm:p-5",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" />
        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={[
                "flex h-14 w-14",
                "shrink-0 items-center",
                "justify-center rounded-[18px]",
                "bg-white/16",
                "text-lg font-black",
                "ring-1 ring-white/35",
                "backdrop-blur",
              ].join(" ")}
            >
              {getInitials(
                projection
                  .patient
                  .displayName,
              )}
            </div>

            <div className="min-w-0">
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-100">
                My WonFlow Care
              </div>

              <h2 className="mt-1 truncate text-2xl font-black tracking-[-0.035em] text-white">
                {
                  projection
                    .patient
                    .displayName
                }
              </h2>

              <p className="mt-1 text-sm text-indigo-100">
                Medical record
                {" "}
                {
                  projection
                    .patient
                    .mrNumber
                }
              </p>
            </div>
          </div>

          <div className="rounded-[18px] bg-white/12 px-4 py-3.5 ring-1 ring-white/25 backdrop-blur-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-100">
              Next Appointment
            </div>

            {nextAppointment ===
            undefined ? (
              <div className="mt-3 text-sm font-semibold text-indigo-100">
                No upcoming appointment is currently scheduled.
              </div>
            ) : (
              <>
                <div className="mt-1.5 text-xl font-black">
                  {formatWonFlowDashboardDateTime(
                    nextAppointment
                      .scheduledStartAt,
                  )}
                </div>

                <div className="mt-2 text-sm font-bold text-white">
                  {
                    nextAppointment
                      .serviceName
                  }
                </div>

                <div className="mt-1 text-xs leading-5 text-indigo-100">
                  {nextDoctor
                    ?.displayName ??
                    "Doctor assignment pending"}
                  {" · "}
                  {nextBranch
                    ?.name ??
                    "Branch pending"}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <WonFlowKpiCard
          helperText="Confirmed future visits"
          icon={<CalendarIcon />}
          label="Upcoming Appointments"
          tone="blue"
          value={
            projection
              .summary
              .upcomingAppointments
          }
        />

        <WonFlowKpiCard
          helperText="Latest appointment activity"
          icon={<HistoryIcon />}
          label="Recent Visits"
          tone="violet"
          value={
            projection
              .recentAppointments
              .length
          }
        />

        <WonFlowKpiCard
          helperText="Current inpatient cases"
          icon={<BedIcon />}
          label="Active Admissions"
          tone="emerald"
          value={
            projection
              .summary
              .activeAdmissions
          }
        />

        <WonFlowKpiCard
          helperText="Invoices with remaining value"
          icon={<InvoiceIcon />}
          label="Outstanding Invoices"
          tone="amber"
          value={
            projection
              .summary
              .outstandingInvoices
          }
        />

        <WonFlowKpiCard
          helperText="Current unpaid balance"
          icon={<WalletIcon />}
          label="Outstanding Balance"
          tone="rose"
          value={formatWonFlowDashboardMoney(
            projection
              .summary
              .outstandingBalanceMinorUnits,

            projection
              .summary
              .currencyCode,
          )}
        />
      </div>

      <WonFlowOperationalPanel
        compact
        description="Move directly to your main care-information sections."
        title="My Care Navigation"
        tone="slate"
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              href:
                "#patient-upcoming",
              label:
                "Appointments",
              value:
                projection
                  .upcomingAppointments
                  .length,
              className:
                "from-blue-50 to-indigo-50 text-blue-800 ring-blue-100",
            },
            {
              href:
                "#patient-history",
              label:
                "Recent Activity",
              value:
                projection
                  .recentAppointments
                  .length,
              className:
                "from-violet-50 to-purple-50 text-violet-800 ring-violet-100",
            },
            {
              href:
                "#patient-admissions",
              label:
                "Admissions",
              value:
                projection
                  .activeAdmissions
                  .length,
              className:
                "from-emerald-50 to-teal-50 text-emerald-800 ring-emerald-100",
            },
            {
              href:
                "#patient-invoices",
              label:
                "Invoices",
              value:
                projection
                  .outstandingInvoices
                  .length,
              className:
                "from-amber-50 to-rose-50 text-amber-800 ring-amber-100",
            },
          ].map(
            (item) => (
              <Link
                className={[
                  "rounded-[16px]",
                  "bg-gradient-to-br",
                  "p-3 ring-1",
                  "transition",
                  "hover:-translate-y-0.5",
                  "hover:shadow-md",
                  item.className,
                ].join(" ")}
                href={item.href}
                key={item.href}
              >
                <div className="text-xl font-black">
                  {item.value}
                </div>

                <div className="mt-1 text-sm font-bold">
                  {item.label}
                </div>

                <div className="mt-2 text-[11px] font-semibold opacity-70">
                  Open section →
                </div>
              </Link>
            ),
          )}
        </div>
      </WonFlowOperationalPanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div id="patient-upcoming">
          <WonFlowOperationalPanel
            description="Your currently scheduled hospital appointments."
            icon={<CalendarIcon />}
            status={
              <StatusBadge
                className="bg-blue-50 text-blue-700 ring-blue-100"
                label={`${projection.upcomingAppointments.length} scheduled`}
              />
            }
            title="Upcoming Appointments"
            tone="blue"
          >
            {projection
              .upcomingAppointments
              .length === 0 ? (
              <WonFlowEmptyState
                description="There are no upcoming appointments for this profile."
                title="No upcoming appointments"
              />
            ) : (
              <div className="space-y-4">
                {projection
                  .upcomingAppointments
                  .map(
                    (
                      appointment,
                    ) => {
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
                        <article
                          className={[
                            "rounded-3xl border",
                            "border-blue-100",
                            "bg-gradient-to-br",
                            "from-white",
                            "to-blue-50/70",
                            "p-4 shadow-sm",
                          ].join(" ")}
                          key={
                            appointment.id
                          }
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">
                                {formatWonFlowDashboardTime(
                                  appointment
                                    .scheduledStartAt,
                                )}
                              </div>

                              <div className="mt-1 text-base font-black text-slate-950">
                                {
                                  appointment
                                    .serviceName
                                }
                              </div>

                              <div className="mt-2 text-sm text-slate-600">
                                {practitioner
                                  ?.displayName ??
                                  "Doctor assignment pending"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {branch
                                  ?.name ??
                                  "Hospital branch pending"}
                              </div>
                            </div>

                            <StatusBadge
                              className={getAppointmentStatusClass(
                                appointment.status,
                              )}
                              label={humanizeStatus(
                                appointment.status,
                              )}
                            />
                          </div>

                          <div className="mt-4 rounded-2xl bg-white p-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-100">
                            <strong className="text-slate-800">
                              Visit reason:
                            </strong>
                            {" "}
                            {
                              appointment
                                .reasonForVisit
                            }
                          </div>
                        </article>
                      );
                    },
                  )}
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>

        <WonFlowOperationalPanel
          description="Important information about accessing your care profile."
          icon={<ShieldIcon />}
          title="Privacy and Access"
          tone="violet"
        >
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
              <strong className="text-blue-900">
                Signed-in access
              </strong>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Access requires a secure login with your patient account. Only you can view this profile.
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <strong className="text-emerald-900">
                Shared care record
              </strong>

              <p className="mt-1 text-xs leading-5 text-emerald-700">
                One organization-level patient identity connects approved appointments, admissions and invoices.
              </p>
            </div>
          </div>
        </WonFlowOperationalPanel>
      </div>

      <div id="patient-history">
        <WonFlowOperationalPanel
          description="Your latest appointment and hospital-visit activity."
          icon={<HistoryIcon />}
          title="Recent Care Activity"
          tone="violet"
        >
          {projection
            .recentAppointments
            .length === 0 ? (
            <WonFlowEmptyState
              description="No recent appointment activity is available."
              title="No recent activity"
            />
          ) : (
            <div className="relative space-y-4 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-px before:bg-violet-100">
              {projection
                .recentAppointments
                .map(
                  (
                    appointment,
                  ) => {
                    const practitioner =
                      practitionersById.get(
                        appointment
                          .practitionerId,
                      );

                    return (
                      <article
                        className="relative flex gap-4"
                        key={
                          appointment.id
                        }
                      >
                        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 ring-4 ring-white">
                          <CalendarIcon />
                        </div>

                        <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-black text-slate-950">
                                {
                                  appointment
                                    .serviceName
                                }
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {formatWonFlowDashboardDateTime(
                                  appointment
                                    .scheduledStartAt,
                                )}
                              </div>
                            </div>

                            <StatusBadge
                              className={getAppointmentStatusClass(
                                appointment.status,
                              )}
                              label={humanizeStatus(
                                appointment.status,
                              )}
                            />
                          </div>

                          <div className="mt-3 text-xs text-slate-600">
                            {practitioner
                              ?.displayName ??
                              "Doctor information unavailable"}
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
            </div>
          )}
        </WonFlowOperationalPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div id="patient-admissions">
          <WonFlowOperationalPanel
            description="Current inpatient placements connected to your patient record."
            icon={<BedIcon />}
            status={
              <StatusBadge
                className="bg-emerald-50 text-emerald-700 ring-emerald-100"
                label={`${projection.activeAdmissions.length} active`}
              />
            }
            title="Active Admissions"
            tone="emerald"
          >
            {projection
              .activeAdmissions
              .length === 0 ? (
              <WonFlowEmptyState
                description="There are no active admissions connected to this patient."
                title="No active admissions"
              />
            ) : (
              <div className="space-y-4">
                {projection
                  .activeAdmissions
                  .map(
                    (admission) => (
                      <article
                        className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4"
                        key={
                          admission.id
                        }
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-slate-950">
                              {
                                admission
                                  .wardName
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                admission
                                  .admissionNumber
                              }
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

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-white p-3 ring-1 ring-emerald-100">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Room
                            </div>

                            <div className="mt-1 text-sm font-bold text-slate-700">
                              {
                                admission
                                  .roomName
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
                      </article>
                    ),
                  )}
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>

        <div id="patient-invoices">
          <WonFlowOperationalPanel
            description="Invoices that currently have a remaining patient balance."
            icon={<InvoiceIcon />}
            status={
              <StatusBadge
                className="bg-amber-50 text-amber-700 ring-amber-100"
                label={`${projection.outstandingInvoices.length} outstanding`}
              />
            }
            title="Outstanding Invoices"
            tone="amber"
          >
            {projection
              .outstandingInvoices
              .length === 0 ? (
              <WonFlowEmptyState
                description="There are no outstanding invoices for this patient."
                title="No outstanding balance"
              />
            ) : (
              <div className="space-y-3">
                {projection
                  .outstandingInvoices
                  .map(
                    (invoice) => (
                      <article
                        className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                        key={invoice.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-slate-950">
                              {
                                invoice
                                  .invoiceNumber
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              Issued
                              {" "}
                              {formatWonFlowDashboardDateTime(
                                invoice
                                  .issuedAt,
                              )}
                            </div>
                          </div>

                          <StatusBadge
                            className={getInvoiceStatusClass(
                              invoice.status,
                            )}
                            label={humanizeStatus(
                              invoice.status,
                            )}
                          />
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-4 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                          <span className="text-xs font-bold text-slate-500">
                            Remaining balance
                          </span>

                          <span className="text-lg font-black text-rose-700">
                            {formatWonFlowDashboardMoney(
                              invoice
                                .balanceMinorUnits,

                              invoice
                                .currencyCode,
                            )}
                          </span>
                        </div>
                      </article>
                    ),
                  )}
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>
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

export function PatientAccessDashboard() {
  const hospitalService =
    useWonFlowHospitalService();

  const [
    selectedPatientId,
    setSelectedPatientId,
  ] = useState<
    MockPatient["id"] |
    undefined
  >();

  const patientDirectory =
    useWonFlowAsyncData({
      key:
        "patient-access:directory",

      loader: (signal) =>
        hospitalService.listPatients(
          {
            limit: 100,
          },
          signal,
        ),

      isEmpty: (page) =>
        page.items.length === 0,
    });

  const patients =
    patientDirectory
      .data
      ?.items ??
    [];

  const activePatientId =
    selectedPatientId ??
    patients[0]?.id;

  const dashboard =
    useWonFlowPatientDashboard(
      activePatientId,
    );

  const refreshPatientAccess = () => {
    patientDirectory.reload();
    dashboard.reload();
  };

  return (
    <div className="space-y-4">
      <WonFlowPageHeader
        breadcrumbs={[
          {
            label:
              "Patient Access",
          },
          {
            label:
              "My Care Dashboard",
          },
        ]}
        description="A clear and secure overview of appointments, hospital activity, admissions and patient invoices."
        eyebrow="Patient Access"
        leading={<PatientIcon />}
        metadata={
          <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700 ring-1 ring-blue-100">
            Patient-focused view
          </span>
        }
        title="My Care Dashboard"
      />

      <WonFlowAsyncDataBoundary
        emptyDescription="No patient profiles are available."
        emptyTitle="No patients available"
        loadingDescription="WonFlow is preparing the patient directory."
        loadingTitle="Loading Patient Access"
        onRetry={
          patientDirectory.reload
        }
        state={
          patientDirectory
        }
      >
        {() => {
          if (
            activePatientId ===
            undefined
          ) {
            return (
              <WonFlowEmptyState
                description="A patient profile must be selected before the dashboard can load."
                title="Select a patient"
              />
            );
          }

          return (
            <WonFlowAsyncDataBoundary
              emptyDescription="No dashboard information is available for the selected patient."
              emptyTitle="No care information"
              loadingDescription="WonFlow is assembling appointments, admissions and invoices for the selected patient."
              loadingTitle="Preparing My Care"
              onRetry={
                dashboard.reload
              }
              state={dashboard}
            >
              {(projection) => (
                <PatientDashboardContent
                  onPatientChange={
                    setSelectedPatientId
                  }
                  onRefresh={
                    refreshPatientAccess
                  }
                  patients={patients}
                  projection={
                    projection
                  }
                  refreshing={
                    dashboard
                      .isRefreshing ||
                    patientDirectory
                      .isRefreshing
                  }
                  selectedPatientId={
                    activePatientId
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
