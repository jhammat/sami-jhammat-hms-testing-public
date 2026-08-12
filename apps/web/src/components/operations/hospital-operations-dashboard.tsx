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
  MockPractitioner,
  MockQueueEntry,
} from "@wonflow/mock-data";

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
  formatWonFlowDashboardDateTime,
  formatWonFlowDashboardMoney,
  formatWonFlowDashboardTime,
  useWonFlowOperationsDashboard,
} from "@/lib/dashboard";

import type {
  WonFlowOperationsDashboardProjection,
} from "@/lib/dashboard";

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

    case "cancelled":
    case "no-show":
      return "bg-rose-50 text-rose-700 ring-rose-100";

    case "booked":
    case "confirmed":
      return "bg-amber-50 text-amber-700 ring-amber-100";
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

function getDoctorStatusClass(
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

function getInvoiceStatusClass(
  status:
    MockInvoiceSummary["status"],
): string {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";

    case "partially-paid":
      return "bg-blue-50 text-blue-700 ring-blue-100";

    case "issued":
    case "draft":
      return "bg-slate-100 text-slate-600 ring-slate-200";

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

interface HospitalOperationsDashboardContentProps {
  projection:
    WonFlowOperationsDashboardProjection;

  onRefresh(): void;

  refreshing: boolean;
}

function HospitalOperationsDashboardContent({
  projection,
  onRefresh,
  refreshing,
}: HospitalOperationsDashboardContentProps) {
  const [
    selectedBranchId,
    setSelectedBranchId,
  ] = useState("all");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const normalizedSearch =
    searchText
      .trim()
      .toLocaleLowerCase();

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

  const matchesSelectedBranch = (
    branchId: string,
  ): boolean =>
    selectedBranchId === "all" ||
    branchId === selectedBranchId;

  const branchPatients =
    useMemo(
      () =>
        projection.patients.filter(
          (patient) =>
            selectedBranchId ===
              "all" ||
            patient.homeBranchId ===
              selectedBranchId,
        ),
      [
        projection.patients,
        selectedBranchId,
      ],
    );

  const branchAppointments =
    useMemo(
      () =>
        projection
          .todayAppointments
          .filter(
            (appointment) =>
              matchesSelectedBranch(
                appointment.branchId,
              ),
          ),
      [
        projection.todayAppointments,
        selectedBranchId,
      ],
    );

  const branchQueue =
    useMemo(
      () =>
        projection.liveQueue.filter(
          (entry) =>
            matchesSelectedBranch(
              entry.branchId,
            ),
        ),
      [
        projection.liveQueue,
        selectedBranchId,
      ],
    );

  const branchAdmissions =
    useMemo(
      () =>
        projection
          .activeAdmissions
          .filter(
            (admission) =>
              matchesSelectedBranch(
                admission.branchId,
              ),
          ),
      [
        projection.activeAdmissions,
        selectedBranchId,
      ],
    );

  const branchDoctors =
    useMemo(
      () =>
        projection
          .doctorsOnDuty
          .filter(
            (practitioner) =>
              selectedBranchId ===
                "all" ||
              practitioner
                .primaryBranchId ===
                selectedBranchId,
          ),
      [
        projection.doctorsOnDuty,
        selectedBranchId,
      ],
    );

  const branchInvoices =
    useMemo(
      () =>
        projection
          .outstandingInvoices
          .filter(
            (invoice) =>
              matchesSelectedBranch(
                invoice.branchId,
              ),
          ),
      [
        projection.outstandingInvoices,
        selectedBranchId,
      ],
    );

  const filteredAppointments =
    useMemo(
      () =>
        branchAppointments.filter(
          (appointment) => {
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

            return [
              appointment
                .appointmentNumber,
              appointment.serviceName,
              appointment
                .reasonForVisit,
              patient?.displayName,
              patient?.mrNumber,
              practitioner?.displayName,
              practitioner
                ?.specialtyName,
            ].some(
              (value) =>
                value
                  ?.toLocaleLowerCase()
                  .includes(
                    normalizedSearch,
                  ) === true,
            );
          },
        ),
      [
        branchAppointments,
        normalizedSearch,
        patientsById,
        practitionersById,
      ],
    );

  const filteredQueue =
    useMemo(
      () =>
        branchQueue.filter(
          (entry) => {
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

            return [
              entry.tokenNumber,
              patient?.displayName,
              patient?.mrNumber,
              practitioner?.displayName,
            ].some(
              (value) =>
                value
                  ?.toLocaleLowerCase()
                  .includes(
                    normalizedSearch,
                  ) === true,
            );
          },
        ),
      [
        branchQueue,
        normalizedSearch,
        patientsById,
        practitionersById,
      ],
    );

  const filteredAdmissions =
    useMemo(
      () =>
        branchAdmissions.filter(
          (admission) => {
            if (
              normalizedSearch === ""
            ) {
              return true;
            }

            const patient =
              patientsById.get(
                admission.patientId,
              );

            return [
              admission
                .admissionNumber,
              admission.wardName,
              admission.roomName,
              admission.bedName,
              patient?.displayName,
              patient?.mrNumber,
            ].some(
              (value) =>
                value
                  ?.toLocaleLowerCase()
                  .includes(
                    normalizedSearch,
                  ) === true,
            );
          },
        ),
      [
        branchAdmissions,
        normalizedSearch,
        patientsById,
      ],
    );

  const filteredDoctors =
    useMemo(
      () =>
        branchDoctors.filter(
          (practitioner) => {
            if (
              normalizedSearch === ""
            ) {
              return true;
            }

            return [
              practitioner.displayName,
              practitioner.specialtyName,
              practitioner
                .employeeNumber,
            ].some(
              (value) =>
                value
                  .toLocaleLowerCase()
                  .includes(
                    normalizedSearch,
                  ),
            );
          },
        ),
      [
        branchDoctors,
        normalizedSearch,
      ],
    );

  const filteredInvoices =
    useMemo(
      () =>
        branchInvoices.filter(
          (invoice) => {
            if (
              normalizedSearch === ""
            ) {
              return true;
            }

            const patient =
              patientsById.get(
                invoice.patientId,
              );

            return [
              invoice.invoiceNumber,
              patient?.displayName,
              patient?.mrNumber,
            ].some(
              (value) =>
                value
                  ?.toLocaleLowerCase()
                  .includes(
                    normalizedSearch,
                  ) === true,
            );
          },
        ),
      [
        branchInvoices,
        normalizedSearch,
        patientsById,
      ],
    );

  const outstandingBalance =
    branchInvoices.reduce(
      (
        total,
        invoice,
      ) =>
        total +
        invoice.balanceMinorUnits,
      0,
    );

  const selectedBranch =
    projection.branches.find(
      (branch) =>
        branch.id ===
        selectedBranchId,
    );

  const branchActivity =
    useMemo(
      () =>
        projection.branches.map(
          (branch) => {
            const appointments =
              projection
                .todayAppointments
                .filter(
                  (appointment) =>
                    appointment
                      .branchId ===
                    branch.id,
                )
                .length;

            const queue =
              projection.liveQueue
                .filter(
                  (entry) =>
                    entry.branchId ===
                    branch.id,
                )
                .length;

            const admissions =
              projection
                .activeAdmissions
                .filter(
                  (admission) =>
                    admission
                      .branchId ===
                    branch.id,
                )
                .length;

            return {
              branch,
              appointments,
              queue,
              admissions,
              activity:
                appointments +
                queue +
                admissions,
            };
          },
        ),
      [
        projection.branches,
        projection.todayAppointments,
        projection.liveQueue,
        projection.activeAdmissions,
      ],
    );

  const maximumBranchActivity =
    Math.max(
      1,
      ...branchActivity.map(
        (item) => item.activity,
      ),
    );

  const filtersActive =
    selectedBranchId !==
      "all" ||
    searchText.trim() !== "";

  return (
    <div className="space-y-6">
      <WonFlowActionBar
        description="Search and filter the complete hospital operations view."
        filters={
          <>
            <label className="relative min-w-56 flex-1">
              <span className="sr-only">
                Search hospital operations
              </span>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <SearchIcon />
              </span>

              <input
                className={[
                  "h-11 w-full",
                  "rounded-xl border",
                  "border-slate-200",
                  "bg-slate-50",
                  "pl-10 pr-4",
                  "text-sm text-slate-900",
                  "outline-none transition",
                  "placeholder:text-slate-400",
                  "focus:border-blue-400",
                  "focus:bg-white",
                  "focus:ring-2",
                  "focus:ring-blue-100",
                ].join(" ")}
                onChange={(
                  event,
                ) => {
                  setSearchText(
                    event.target.value,
                  );
                }}
                placeholder="Search patient, MR number, doctor, token or invoice"
                type="search"
                value={searchText}
              />
            </label>

            <select
              aria-label="Select hospital branch"
              className={[
                "h-11 min-w-52",
                "rounded-xl border",
                "border-slate-200",
                "bg-white px-3.5",
                "text-sm font-semibold",
                "text-slate-700",
                "outline-none transition",
                "focus:border-blue-400",
                "focus:ring-2",
                "focus:ring-blue-100",
              ].join(" ")}
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
                All hospital branches
              </option>

              {projection.branches.map(
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
        primaryActions={
          <WonFlowActionButton
            icon={<RefreshIcon />}
            onClick={onRefresh}
            variant="primary"
          >
            {refreshing
              ? "Refreshing"
              : "Refresh Dashboard"}
          </WonFlowActionButton>
        }
        secondaryActions={
          filtersActive ? (
            <WonFlowActionButton
              onClick={() => {
                setSearchText("");
                setSelectedBranchId(
                  "all",
                );
              }}
              variant="ghost"
            >
              Clear Filters
            </WonFlowActionButton>
          ) : undefined
        }
        summary={
          selectedBranch ===
          undefined
            ? `${projection.branches.length} branches connected`
            : selectedBranch.name
        }
        title="Operational Controls"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <WonFlowKpiCard
          helperText={
            selectedBranch ===
            undefined
              ? "Across the organization"
              : selectedBranch.name
          }
          icon={<UsersIcon />}
          label="Total Patients"
          tone="blue"
          value={
            branchPatients.length
          }
        />

        <WonFlowKpiCard
          helperText="Scheduled for the demonstration day"
          icon={<CalendarIcon />}
          label="Today’s Appointments"
          tone="violet"
          value={
            branchAppointments.length
          }
        />

        <WonFlowKpiCard
          helperText="Waiting, called or currently serving"
          icon={<QueueIcon />}
          label="Live Queue"
          tone="amber"
          value={
            branchQueue.length
          }
        />

        <WonFlowKpiCard
          helperText="Current inpatient operational cases"
          icon={<BedIcon />}
          label="Active Admissions"
          tone="emerald"
          value={
            branchAdmissions.length
          }
        />

        <WonFlowKpiCard
          helperText="Available or currently delivering care"
          icon={<DoctorIcon />}
          label="Doctors On Duty"
          tone="violet"
          value={
            branchDoctors.length
          }
        />

        <WonFlowKpiCard
          helperText="Outstanding patient balances"
          icon={<WalletIcon />}
          label="Outstanding Balance"
          tone="rose"
          value={formatWonFlowDashboardMoney(
            outstandingBalance,
            projection
              .summary
              .currencyCode,
          )}
        />
      </div>

      <WonFlowOperationalPanel
        compact
        description="Jump directly to the most active operational areas."
        title="Quick Navigation"
        tone="slate"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              href:
                "#today-appointments",
              label:
                "Today’s Appointments",
              value:
                branchAppointments.length,
              className:
                "from-blue-50 to-indigo-50 text-blue-800 ring-blue-100",
            },
            {
              href: "#live-queue",
              label:
                "Live Patient Queue",
              value:
                branchQueue.length,
              className:
                "from-amber-50 to-orange-50 text-amber-800 ring-amber-100",
            },
            {
              href:
                "#active-admissions",
              label:
                "Active Admissions",
              value:
                branchAdmissions.length,
              className:
                "from-emerald-50 to-teal-50 text-emerald-800 ring-emerald-100",
            },
            {
              href:
                "#outstanding-invoices",
              label:
                "Outstanding Invoices",
              value:
                branchInvoices.length,
              className:
                "from-rose-50 to-pink-50 text-rose-800 ring-rose-100",
            },
          ].map(
            (action) => (
              <Link
                className={[
                  "group rounded-2xl",
                  "bg-gradient-to-br",
                  "p-4 ring-1",
                  "transition",
                  "hover:-translate-y-0.5",
                  "hover:shadow-md",
                  action.className,
                ].join(" ")}
                href={action.href}
                key={action.href}
              >
                <div className="text-2xl font-black">
                  {action.value}
                </div>

                <div className="mt-1 text-sm font-bold">
                  {action.label}
                </div>

                <div className="mt-3 text-xs font-semibold opacity-70 transition group-hover:translate-x-1">
                  Open section →
                </div>
              </Link>
            ),
          )}
        </div>
      </WonFlowOperationalPanel>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.7fr)]">
        <div
          id="today-appointments"
        >
          <WonFlowOperationalPanel
            action={
              <span className="text-xs font-bold text-slate-500">
                {
                  filteredAppointments
                    .length
                }
                {" "}
                displayed
              </span>
            }
            description="Current outpatient schedule with live patient and doctor context."
            icon={<CalendarIcon />}
            status={
              <StatusBadge
                className="bg-blue-50 text-blue-700 ring-blue-100"
                label="Live schedule"
              />
            }
            title="Today’s Appointments"
            tone="blue"
          >
            {filteredAppointments.length ===
            0 ? (
              <WonFlowEmptyState
                description="No appointments match the selected branch and search filters."
                title="No appointments found"
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
                        Doctor
                      </th>

                      <th className="pb-3 text-right font-extrabold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAppointments.map(
                      (
                        appointment,
                      ) => {
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

                            <td className="py-4">
                              <div className="text-sm font-semibold text-slate-700">
                                {
                                  appointment
                                    .serviceName
                                }
                              </div>

                              <div className="mt-1 max-w-48 truncate text-xs text-slate-500">
                                {
                                  appointment
                                    .reasonForVisit
                                }
                              </div>
                            </td>

                            <td className="py-4">
                              <div className="text-sm font-semibold text-slate-800">
                                {practitioner
                                  ?.displayName ??
                                  "Unassigned"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {practitioner
                                  ?.specialtyName ??
                                  "No specialty"}
                              </div>
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

        <div id="live-queue">
          <WonFlowOperationalPanel
            description="Patient tokens currently moving through outpatient service points."
            icon={<QueueIcon />}
            status={
              <StatusBadge
                className="bg-amber-50 text-amber-700 ring-amber-100"
                label={`${branchQueue.length} active`}
              />
            }
            title="Live Patient Queue"
            tone="amber"
          >
            {filteredQueue.length ===
            0 ? (
              <WonFlowEmptyState
                description="No live queue entries match the selected filters."
                title="Queue is clear"
              />
            ) : (
              <div className="space-y-3">
                {filteredQueue
                  .slice(0, 8)
                  .map(
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

                      return (
                        <div
                          className={[
                            "flex items-center",
                            "gap-3 rounded-2xl",
                            "border border-slate-100",
                            "bg-slate-50/70 p-3",
                          ].join(" ")}
                          key={entry.id}
                        >
                          <div
                            className={[
                              "flex h-11 w-11",
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

                            <div className="mt-1 truncate text-xs text-slate-500">
                              {practitioner
                                ?.displayName ??
                                "Unassigned doctor"}
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

      <div className="grid gap-6 xl:grid-cols-2">
        <WonFlowOperationalPanel
          description="Practitioners currently available or delivering patient care."
          icon={<DoctorIcon />}
          status={
            <StatusBadge
              className="bg-emerald-50 text-emerald-700 ring-emerald-100"
              label={`${branchDoctors.length} on duty`}
            />
          }
          title="Doctors On Duty"
          tone="violet"
        >
          {filteredDoctors.length ===
          0 ? (
            <WonFlowEmptyState
              description="No doctors match the selected branch and search filters."
              title="No doctors found"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredDoctors
                .slice(0, 8)
                .map(
                  (practitioner) => (
                    <div
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm"
                      key={
                        practitioner.id
                      }
                    >
                      <div
                        className={[
                          "flex h-11 w-11",
                          "shrink-0 items-center",
                          "justify-center rounded-2xl",
                          "bg-gradient-to-br",
                          "from-blue-100",
                          "to-violet-100",
                          "text-sm font-black",
                          "text-indigo-700",
                          "ring-1 ring-indigo-200",
                        ].join(" ")}
                      >
                        {getInitials(
                          practitioner
                            .displayName,
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-slate-950">
                          {
                            practitioner
                              .displayName
                          }
                        </div>

                        <div className="mt-1 truncate text-xs text-slate-500">
                          {
                            practitioner
                              .specialtyName
                          }
                        </div>
                      </div>

                      <StatusBadge
                        className={getDoctorStatusClass(
                          practitioner
                            .operationalStatus,
                        )}
                        label={humanizeStatus(
                          practitioner
                            .operationalStatus,
                        )}
                      />
                    </div>
                  ),
                )}
            </div>
          )}
        </WonFlowOperationalPanel>

        <div id="active-admissions">
          <WonFlowOperationalPanel
            description="Current inpatient placements requiring operational awareness."
            icon={<BedIcon />}
            status={
              <StatusBadge
                className="bg-blue-50 text-blue-700 ring-blue-100"
                label={`${branchAdmissions.length} active`}
              />
            }
            title="Active Admissions"
            tone="emerald"
          >
            {filteredAdmissions.length ===
            0 ? (
              <WonFlowEmptyState
                description="No admissions match the selected branch and search filters."
                title="No active admissions"
              />
            ) : (
              <div className="space-y-3">
                {filteredAdmissions
                  .slice(0, 7)
                  .map(
                    (admission) => {
                      const patient =
                        patientsById.get(
                          admission.patientId,
                        );

                      return (
                        <div
                          className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5"
                          key={
                            admission.id
                          }
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-950">
                                {patient
                                  ?.displayName ??
                                  "Unknown patient"}
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

                          <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-white p-3 text-xs">
                            <div>
                              <div className="font-semibold text-slate-400">
                                Placement
                              </div>

                              <div className="mt-1 font-bold text-slate-700">
                                {
                                  admission
                                    .wardName
                                }
                              </div>
                            </div>

                            <div>
                              <div className="font-semibold text-slate-400">
                                Bed
                              </div>

                              <div className="mt-1 font-bold text-slate-700">
                                {
                                  admission
                                    .bedName
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <WonFlowOperationalPanel
          description="Combined appointments, queue activity and admissions by branch."
          title="Branch Activity"
          tone="blue"
        >
          <div className="space-y-5">
            {branchActivity.map(
              (item) => {
                const percentage =
                  Math.max(
                    6,
                    Math.round(
                      (
                        item.activity /
                        maximumBranchActivity
                      ) *
                        100,
                    ),
                  );

                return (
                  <div
                    key={
                      item.branch.id
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">
                          {
                            item.branch
                              .name
                          }
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {item.appointments}
                          {" "}
                          appointments ·
                          {" "}
                          {item.queue}
                          {" "}
                          queue ·
                          {" "}
                          {item.admissions}
                          {" "}
                          admissions
                        </div>
                      </div>

                      <div className="text-lg font-black text-indigo-700">
                        {item.activity}
                      </div>
                    </div>

                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={[
                          "h-full rounded-full",
                          "bg-gradient-to-r",
                          "from-blue-500",
                          "to-violet-500",
                        ].join(" ")}
                        style={{
                          width:
                            `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </WonFlowOperationalPanel>

        <div id="outstanding-invoices">
          <WonFlowOperationalPanel
            description="Patient accounts with remaining balances."
            icon={<WalletIcon />}
            status={
              <StatusBadge
                className="bg-rose-50 text-rose-700 ring-rose-100"
                label={`${branchInvoices.length} invoices`}
              />
            }
            title="Outstanding Invoices"
            tone="rose"
          >
            {filteredInvoices.length ===
            0 ? (
              <WonFlowEmptyState
                description="No outstanding invoices match the selected filters."
                title="No invoices found"
              />
            ) : (
              <div className="wf-content-scroll">
                <table className="w-full min-w-[680px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                      <th className="pb-3 font-extrabold">
                        Patient
                      </th>

                      <th className="pb-3 font-extrabold">
                        Invoice
                      </th>

                      <th className="pb-3 font-extrabold">
                        Issued
                      </th>

                      <th className="pb-3 text-right font-extrabold">
                        Balance
                      </th>

                      <th className="pb-3 text-right font-extrabold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredInvoices
                      .slice(0, 8)
                      .map(
                        (invoice) => {
                          const patient =
                            patientsById.get(
                              invoice.patientId,
                            );

                          return (
                            <tr
                              className="border-b border-slate-100 last:border-0"
                              key={
                                invoice.id
                              }
                            >
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
                                  invoice
                                    .invoiceNumber
                                }
                              </td>

                              <td className="py-4 text-xs text-slate-500">
                                {formatWonFlowDashboardDateTime(
                                  invoice
                                    .issuedAt,
                                )}
                              </td>

                              <td className="py-4 text-right text-sm font-black text-rose-700">
                                {formatWonFlowDashboardMoney(
                                  invoice
                                    .balanceMinorUnits,
                                  invoice
                                    .currencyCode,
                                )}
                              </td>

                              <td className="py-4 text-right">
                                <StatusBadge
                                  className={getInvoiceStatusClass(
                                    invoice.status,
                                  )}
                                  label={humanizeStatus(
                                    invoice.status,
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

export function HospitalOperationsDashboard() {
  const dashboard =
    useWonFlowOperationsDashboard();

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className={[
                "inline-flex min-h-10",
                "items-center justify-center",
                "rounded-xl border",
                "border-cyan-200",
                "bg-cyan-50",
                "px-4 py-2",
                "text-sm font-bold",
                "text-cyan-700",
                "transition",
                "hover:bg-cyan-100",
              ].join(" ")}
              href="/operations/laboratory"
            >
              Laboratory
            </Link>

            <Link
              className={[
                "inline-flex min-h-10",
                "items-center justify-center",
                "rounded-xl border",
                "border-violet-200",
                "bg-violet-50",
                "px-4 py-2",
                "text-sm font-bold",
                "text-violet-700",
                "transition",
                "hover:bg-violet-100",
              ].join(" ")}
              href="/operations/radiology"
            >
              Radiology
            </Link>

            <Link
              className={[
                "inline-flex min-h-10",
                "items-center justify-center",
                "rounded-xl border",
                "border-violet-200",
                "bg-violet-50",
                "px-4 py-2",
                "text-sm font-bold",
                "text-violet-700",
                "transition",
                "hover:bg-violet-100",
              ].join(" ")}
              href="/operations/queue"
            >
              Live Queue
            </Link>

            <Link
              className={[
                "inline-flex min-h-10",
                "items-center justify-center",
                "rounded-xl border",
                "border-blue-200",
                "bg-blue-50",
                "px-4 py-2",
                "text-sm font-bold",
                "text-blue-700",
                "transition",
                "hover:bg-blue-100",
              ].join(" ")}
              href="/operations/appointments"
            >
              Appointments
            </Link>

            <Link
              className={[
                "inline-flex min-h-10",
                "items-center justify-center",
                "rounded-xl border",
                "border-slate-200",
                "bg-white",
                "px-4 py-2",
                "text-sm font-bold",
                "text-slate-700",
                "transition",
                "hover:bg-slate-100",
              ].join(" ")}
              href="/operations/patients"
            >
              Patient Directory
            </Link>

            <Link
              className={[
                "inline-flex min-h-10",
                "items-center justify-center",
                "rounded-xl border",
                "border-emerald-200",
                "bg-emerald-50",
                "px-4 py-2",
                "text-sm font-bold",
                "text-emerald-700",
                "transition",
                "hover:bg-emerald-100",
              ].join(" ")}
              href="/operations/appointments/new"
            >
              Book Appointment
            </Link>

            <Link
              className={[
                "inline-flex min-h-10",
                "items-center justify-center",
                "rounded-xl border",
                "border-indigo-200",
                "bg-indigo-50",
                "px-4 py-2",
                "text-sm font-bold",
                "text-indigo-700",
                "transition",
                "hover:bg-indigo-100",
              ].join(" ")}
              href="/operations/billing/new"
            >
              Create Bill
            </Link>

            <Link
              className={[
                "inline-flex min-h-10",
                "items-center justify-center",
                "rounded-xl",
                "bg-gradient-to-r",
                "from-blue-600",
                "to-indigo-600",
                "px-4 py-2",
                "text-sm font-bold",
                "text-white shadow-sm",
                "transition",
                "hover:from-blue-700",
                "hover:to-indigo-700",
              ].join(" ")}
              href="/operations/patients/register"
            >
              Register Patient
            </Link>
          </div>
        }
        breadcrumbs={[
          {
            label:
              "Hospital Operations",
          },
          {
            label:
              "Command Centre",
          },
        ]}
        description="A live operational view of appointments, queues, practitioners, admissions and patient financial activity."
        eyebrow="Hospital Operations"
        leading={<QueueIcon />}
        metadata={
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 ring-1 ring-emerald-100">
            Operational overview
          </span>
        }
        title="Hospital Operations Command Centre"
      />

      <WonFlowAsyncDataBoundary
        emptyDescription="No operational dashboard records are currently available."
        emptyTitle="No hospital activity"
        loadingDescription="WonFlow is assembling appointments, queues, admissions and financial information."
        loadingTitle="Preparing hospital operations"
        onRetry={dashboard.reload}
        state={dashboard}
      >
        {(projection) => (
          <HospitalOperationsDashboardContent
            onRefresh={
              dashboard.reload
            }
            projection={
              projection
            }
            refreshing={
              dashboard.isRefreshing
            }
          />
        )}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
