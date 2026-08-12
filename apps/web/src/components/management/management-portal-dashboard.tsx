"use client";

import {
  useMemo,
  useState,
} from "react";

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
  formatWonFlowDashboardMoney,
  formatWonFlowDashboardPercentage,
  useWonFlowManagementDashboard,
} from "@/lib/dashboard";

import type {
  WonFlowBranchDashboardSummary,
  WonFlowManagementDashboardProjection,
} from "@/lib/dashboard";

function ManagementIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M5 20V10M12 20V4M19 20v-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />

      <path
        d="M3 20h18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
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

function AlertIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 8v5M12 16.5h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />

      <path
        d="M10.2 4.8 3.5 16.4A2.4 2.4 0 0 0 5.6 20h12.8a2.4 2.4 0 0 0 2.1-3.6L13.8 4.8a2.1 2.1 0 0 0-3.6 0Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function calculateCollectionRate(
  paidMinorUnits: number,
  billedMinorUnits: number,
): number {
  if (billedMinorUnits === 0) {
    return 0;
  }

  return Number(
    (
      paidMinorUnits /
      billedMinorUnits *
      100
    ).toFixed(1),
  );
}

function clampPercentage(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(100, value),
  );
}

type BranchSortMetric =
  | "activity"
  | "patients"
  | "appointments"
  | "outstanding";

interface ManagementDashboardContentProps {
  projection:
    WonFlowManagementDashboardProjection;

  onRefresh(): void;

  refreshing: boolean;
}

function ManagementDashboardContent({
  projection,
  onRefresh,
  refreshing,
}: ManagementDashboardContentProps) {
  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    sortMetric,
    setSortMetric,
  ] = useState<
    BranchSortMetric
  >("activity");

  const normalizedSearch =
    searchText
      .trim()
      .toLocaleLowerCase();

  const collectionRate =
    calculateCollectionRate(
      projection
        .financial
        .totalPaidMinorUnits,

      projection
        .financial
        .totalBilledMinorUnits,
    );

  const outstandingRate =
    projection
      .financial
      .totalBilledMinorUnits === 0
      ? 0
      : Number(
          (
            projection
              .financial
              .outstandingMinorUnits /
            projection
              .financial
              .totalBilledMinorUnits *
            100
          ).toFixed(1),
        );

  const filteredBranches =
    useMemo(() => {
      const matchingBranches =
        projection
          .branchPerformance
          .filter(
            (summary) =>
              normalizedSearch === "" ||
              summary.branch.name
                .toLocaleLowerCase()
                .includes(
                  normalizedSearch,
                ),
          );

      return [
        ...matchingBranches,
      ].sort(
        (
          left,
          right,
        ) => {
          switch (sortMetric) {
            case "patients":
              return (
                right.patientCount -
                left.patientCount
              );

            case "appointments":
              return (
                right
                  .todayAppointmentCount -
                left
                  .todayAppointmentCount
              );

            case "outstanding":
              return (
                right
                  .outstandingInvoiceMinorUnits -
                left
                  .outstandingInvoiceMinorUnits
              );

            case "activity":
              return (
                (
                  right
                    .todayAppointmentCount +
                  right.liveQueueCount +
                  right
                    .activeAdmissionCount
                ) -
                (
                  left
                    .todayAppointmentCount +
                  left.liveQueueCount +
                  left
                    .activeAdmissionCount
                )
              );
          }
        },
      );
    }, [
      normalizedSearch,
      projection.branchPerformance,
      sortMetric,
    ]);

  const maximumBranchActivity =
    Math.max(
      1,
      ...projection
        .branchPerformance
        .map(
          (summary) =>
            summary
              .todayAppointmentCount +
            summary.liveQueueCount +
            summary
              .activeAdmissionCount,
        ),
    );

  const managementAttentionItems =
    [
      {
        title:
          "Outstanding patient balance",

        value:
          formatWonFlowDashboardMoney(
            projection
              .financial
              .outstandingMinorUnits,

            projection
              .financial
              .currencyCode,
          ),

        description:
          `${formatWonFlowDashboardPercentage(
            outstandingRate,
          )} of total billed value remains outstanding.`,

        tone:
          outstandingRate > 30
            ? "rose"
            : "amber",
      },

      {
        title:
          "Appointment completion",

        value:
          formatWonFlowDashboardPercentage(
            projection
              .summary
              .appointmentCompletionRate,
          ),

        description:
          `${projection.summary.completedAppointments} of ${projection.summary.appointments} appointments are complete.`,

        tone:
          projection
            .summary
            .appointmentCompletionRate >=
          70
            ? "emerald"
            : "amber",
      },

      {
        title:
          "Queue completion",

        value:
          formatWonFlowDashboardPercentage(
            projection
              .summary
              .queueCompletionRate,
          ),

        description:
          `${projection.summary.completedQueueEntries} of ${projection.summary.queueEntries} queue entries are complete.`,

        tone:
          projection
            .summary
            .queueCompletionRate >=
          70
            ? "emerald"
            : "violet",
      },
    ] as const;

  return (
    <div className="space-y-6">
      <WonFlowActionBar
        description="Search branches and change the executive comparison order."
        filters={
          <>
            <label className="relative min-w-56 flex-1">
              <span className="sr-only">
                Search branches
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
                  "text-sm",
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
                placeholder="Search hospital branch"
                type="search"
                value={searchText}
              />
            </label>

            <select
              aria-label="Sort branch performance"
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
                setSortMetric(
                  event.target
                    .value as
                    BranchSortMetric,
                );
              }}
              value={sortMetric}
            >
              <option value="activity">
                Sort by activity
              </option>

              <option value="patients">
                Sort by patients
              </option>

              <option value="appointments">
                Sort by appointments
              </option>

              <option value="outstanding">
                Sort by outstanding value
              </option>
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
              : "Refresh Executive View"}
          </WonFlowActionButton>
        }
        secondaryActions={
          searchText !== "" ? (
            <WonFlowActionButton
              onClick={() => {
                setSearchText("");
              }}
              variant="ghost"
            >
              Clear Search
            </WonFlowActionButton>
          ) : undefined
        }
        summary={
          `${projection.branches.length} connected branches`
        }
        title="Management Controls"
      />

      <section
        className={[
          "overflow-hidden",
          "rounded-3xl",
          "border border-indigo-100",
          "bg-gradient-to-r",
          "from-slate-950",
          "via-indigo-950",
          "to-blue-950",
          "p-5 text-white",
          "shadow-xl",
          "shadow-indigo-950/10",
          "sm:p-6",
          "xl:p-7",
        ].join(" ")}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] xl:items-center">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-200">
              Executive Overview
            </div>

            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {
                projection
                  .organization
                  .name
              }
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Consolidated operational and financial visibility across all connected hospital branches.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-100 ring-1 ring-white/15">
                {
                  projection
                    .branches
                    .length
                }
                {" "}
                branches
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-violet-100 ring-1 ring-white/15">
                {
                  projection
                    .summary
                    .patients
                }
                {" "}
                patients
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100 ring-1 ring-white/15">
                {
                  projection
                    .summary
                    .practitioners
                }
                {" "}
                practitioners
              </span>
            </div>
          </div>

          <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-200">
                  Collection Rate
                </div>

                <div className="mt-2 text-4xl font-black">
                  {formatWonFlowDashboardPercentage(
                    collectionRate,
                  )}
                </div>
              </div>

              <WalletIcon />
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300"
                style={{
                  width:
                    `${clampPercentage(
                      collectionRate,
                    )}%`,
                }}
              />
            </div>

            <div className="mt-3 text-xs leading-5 text-slate-300">
              {formatWonFlowDashboardMoney(
                projection
                  .financial
                  .totalPaidMinorUnits,

                projection
                  .financial
                  .currencyCode,
              )}
              {" "}
              collected from
              {" "}
              {formatWonFlowDashboardMoney(
                projection
                  .financial
                  .totalBilledMinorUnits,

                projection
                  .financial
                  .currencyCode,
              )}
              .
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <WonFlowKpiCard
          helperText="Organization-wide registered patients"
          icon={<UsersIcon />}
          label="Patients"
          tone="blue"
          value={
            projection
              .summary
              .patients
          }
        />

        <WonFlowKpiCard
          helperText="Connected doctors and clinical staff"
          icon={<DoctorIcon />}
          label="Practitioners"
          tone="violet"
          value={
            projection
              .summary
              .practitioners
          }
        />

        <WonFlowKpiCard
          helperText={`${projection.summary.completedAppointments} completed`}
          icon={<CalendarIcon />}
          label="Appointment Completion"
          tone="emerald"
          value={formatWonFlowDashboardPercentage(
            projection
              .summary
              .appointmentCompletionRate,
          )}
        />

        <WonFlowKpiCard
          helperText={`${projection.summary.completedQueueEntries} queue entries completed`}
          icon={<QueueIcon />}
          label="Queue Completion"
          tone="amber"
          value={formatWonFlowDashboardPercentage(
            projection
              .summary
              .queueCompletionRate,
          )}
        />

        <WonFlowKpiCard
          helperText="Current organization-wide inpatient cases"
          icon={<BedIcon />}
          label="Active Admissions"
          tone="rose"
          value={
            projection
              .summary
              .activeAdmissions
          }
        />

        <WonFlowKpiCard
          helperText="Remaining patient balances"
          icon={<WalletIcon />}
          label="Outstanding Balance"
          tone="rose"
          value={formatWonFlowDashboardMoney(
            projection
              .financial
              .outstandingMinorUnits,

            projection
              .financial
              .currencyCode,
          )}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <WonFlowOperationalPanel
          description="Operational completion across appointments and patient queues."
          icon={<ManagementIcon />}
          title="Operational Completion"
          tone="blue"
        >
          <div className="space-y-6">
            <CompletionMetric
              completed={
                projection
                  .summary
                  .completedAppointments
              }
              label="Appointments completed"
              rate={
                projection
                  .summary
                  .appointmentCompletionRate
              }
              total={
                projection
                  .summary
                  .appointments
              }
              tone="blue"
            />

            <CompletionMetric
              completed={
                projection
                  .summary
                  .completedQueueEntries
              }
              label="Queue entries completed"
              rate={
                projection
                  .summary
                  .queueCompletionRate
              }
              total={
                projection
                  .summary
                  .queueEntries
              }
              tone="violet"
            />
          </div>
        </WonFlowOperationalPanel>

        <WonFlowOperationalPanel
          description="Executive indicators that may require review."
          icon={<AlertIcon />}
          title="Management Attention"
          tone="amber"
        >
          <div className="space-y-3">
            {managementAttentionItems.map(
              (item) => (
                <AttentionCard
                  description={
                    item.description
                  }
                  key={item.title}
                  title={item.title}
                  tone={item.tone}
                  value={item.value}
                />
              ),
            )}
          </div>
        </WonFlowOperationalPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.75fr)_minmax(0,1.25fr)]">
        <WonFlowOperationalPanel
          description="Billed, collected and outstanding patient account values."
          icon={<WalletIcon />}
          title="Financial Collection"
          tone="emerald"
        >
          <div className="space-y-4">
            <FinancialRow
              label="Total billed"
              tone="slate"
              value={formatWonFlowDashboardMoney(
                projection
                  .financial
                  .totalBilledMinorUnits,

                projection
                  .financial
                  .currencyCode,
              )}
            />

            <FinancialRow
              label="Collected"
              tone="emerald"
              value={formatWonFlowDashboardMoney(
                projection
                  .financial
                  .totalPaidMinorUnits,

                projection
                  .financial
                  .currencyCode,
              )}
            />

            <FinancialRow
              label="Outstanding"
              tone="rose"
              value={formatWonFlowDashboardMoney(
                projection
                  .financial
                  .outstandingMinorUnits,

                projection
                  .financial
                  .currencyCode,
              )}
            />

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>
                  Collection progress
                </span>

                <span>
                  {formatWonFlowDashboardPercentage(
                    collectionRate,
                  )}
                </span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                  style={{
                    width:
                      `${clampPercentage(
                        collectionRate,
                      )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </WonFlowOperationalPanel>

        <WonFlowOperationalPanel
          description="Combined appointments, queue load and inpatient activity across hospital branches."
          icon={<ManagementIcon />}
          title="Branch Activity Comparison"
          tone="violet"
        >
          {filteredBranches.length ===
          0 ? (
            <WonFlowEmptyState
              description="No branch matches the current management search."
              title="No branches found"
            />
          ) : (
            <div className="space-y-5">
              {filteredBranches.map(
                (summary) => (
                  <BranchActivityRow
                    key={
                      summary.branch.id
                    }
                    maximumActivity={
                      maximumBranchActivity
                    }
                    summary={summary}
                  />
                ),
              )}
            </div>
          )}
        </WonFlowOperationalPanel>
      </div>

      <WonFlowOperationalPanel
        description="Detailed operational and financial comparison for every connected branch."
        icon={<ManagementIcon />}
        title="Branch Performance Table"
        tone="slate"
      >
        {filteredBranches.length ===
        0 ? (
          <WonFlowEmptyState
            description="No branch performance records match the search."
            title="No branch information"
          />
        ) : (
          <div className="wf-content-scroll">
            <table className="w-full min-w-[920px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  <th className="pb-3 font-extrabold">
                    Branch
                  </th>

                  <th className="pb-3 text-right font-extrabold">
                    Patients
                  </th>

                  <th className="pb-3 text-right font-extrabold">
                    Practitioners
                  </th>

                  <th className="pb-3 text-right font-extrabold">
                    Appointments
                  </th>

                  <th className="pb-3 text-right font-extrabold">
                    Live Queue
                  </th>

                  <th className="pb-3 text-right font-extrabold">
                    Admissions
                  </th>

                  <th className="pb-3 text-right font-extrabold">
                    Outstanding
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredBranches.map(
                  (summary) => (
                    <tr
                      className="border-b border-slate-100 transition hover:bg-blue-50/40 last:border-0"
                      key={
                        summary.branch.id
                      }
                    >
                      <td className="py-4">
                        <div className="text-sm font-extrabold text-slate-950">
                          {
                            summary
                              .branch
                              .name
                          }
                        </div>
                      </td>

                      <td className="py-4 text-right text-sm font-bold text-slate-700">
                        {
                          summary
                            .patientCount
                        }
                      </td>

                      <td className="py-4 text-right text-sm font-bold text-slate-700">
                        {
                          summary
                            .practitionerCount
                        }
                      </td>

                      <td className="py-4 text-right text-sm font-bold text-blue-700">
                        {
                          summary
                            .todayAppointmentCount
                        }
                      </td>

                      <td className="py-4 text-right text-sm font-bold text-amber-700">
                        {
                          summary
                            .liveQueueCount
                        }
                      </td>

                      <td className="py-4 text-right text-sm font-bold text-violet-700">
                        {
                          summary
                            .activeAdmissionCount
                        }
                      </td>

                      <td className="py-4 text-right text-sm font-black text-rose-700">
                        {formatWonFlowDashboardMoney(
                          summary
                            .outstandingInvoiceMinorUnits,

                          projection
                            .financial
                            .currencyCode,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </WonFlowOperationalPanel>

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

function CompletionMetric({
  label,
  completed,
  total,
  rate,
  tone,
}: {
  label: string;
  completed: number;
  total: number;
  rate: number;
  tone: "blue" | "violet";
}) {
  const progressClassName =
    tone === "blue"
      ? "from-blue-500 to-cyan-500"
      : "from-violet-500 to-fuchsia-500";

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-extrabold text-slate-900">
            {label}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            {completed}
            {" "}
            completed from
            {" "}
            {total}
          </div>
        </div>

        <div className="text-2xl font-black text-slate-950">
          {formatWonFlowDashboardPercentage(
            rate,
          )}
        </div>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={[
            "h-full rounded-full",
            "bg-gradient-to-r",
            progressClassName,
          ].join(" ")}
          style={{
            width:
              `${clampPercentage(
                rate,
              )}%`,
          }}
        />
      </div>
    </div>
  );
}

function FinancialRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "slate"
    | "emerald"
    | "rose";
}) {
  const toneClassName = {
    slate:
      "bg-slate-50 text-slate-800 ring-slate-100",

    emerald:
      "bg-emerald-50 text-emerald-800 ring-emerald-100",

    rose:
      "bg-rose-50 text-rose-800 ring-rose-100",
  }[tone];

  return (
    <div
      className={[
        "flex items-center",
        "justify-between gap-4",
        "rounded-2xl p-4 ring-1",
        toneClassName,
      ].join(" ")}
    >
      <span className="text-sm font-bold">
        {label}
      </span>

      <span className="text-lg font-black">
        {value}
      </span>
    </div>
  );
}

function AttentionCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone:
    | "emerald"
    | "amber"
    | "violet"
    | "rose";
}) {
  const toneClassName = {
    emerald:
      "border-emerald-100 bg-emerald-50/70 text-emerald-900",

    amber:
      "border-amber-100 bg-amber-50/70 text-amber-900",

    violet:
      "border-violet-100 bg-violet-50/70 text-violet-900",

    rose:
      "border-rose-100 bg-rose-50/70 text-rose-900",
  }[tone];

  return (
    <div
      className={[
        "rounded-2xl border",
        "p-4",
        toneClassName,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-extrabold">
          {title}
        </div>

        <div className="text-lg font-black">
          {value}
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 opacity-75">
        {description}
      </p>
    </div>
  );
}

function BranchActivityRow({
  summary,
  maximumActivity,
}: {
  summary:
    WonFlowBranchDashboardSummary;

  maximumActivity: number;
}) {
  const activity =
    summary.todayAppointmentCount +
    summary.liveQueueCount +
    summary.activeAdmissionCount;

  const percentage =
    Math.max(
      5,
      Math.round(
        activity /
        maximumActivity *
        100,
      ),
    );

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-900">
            {summary.branch.name}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            {
              summary
                .todayAppointmentCount
            }
            {" "}
            appointments ·
            {" "}
            {
              summary
                .liveQueueCount
            }
            {" "}
            queue ·
            {" "}
            {
              summary
                .activeAdmissionCount
            }
            {" "}
            admissions
          </div>
        </div>

        <div className="text-xl font-black text-indigo-700">
          {activity}
        </div>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
          style={{
            width:
              `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

export function ManagementPortalDashboard() {
  const dashboard =
    useWonFlowManagementDashboard();

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        breadcrumbs={[
          {
            label:
              "Management Portal",
          },
          {
            label:
              "Executive Dashboard",
          },
        ]}
        description="Hospital-wide operational, financial and branch-performance visibility for leadership."
        eyebrow="Management Intelligence"
        leading={
          <ManagementIcon />
        }
        metadata={
          <span className="rounded-full bg-violet-50 px-2.5 py-1 font-bold text-violet-700 ring-1 ring-violet-100">
            Executive overview
          </span>
        }
        title="Management Executive Dashboard"
      />

      <WonFlowAsyncDataBoundary
        emptyDescription="No management records are available in the current demonstration scenario."
        emptyTitle="No executive information"
        loadingDescription="WonFlow is assembling hospital-wide operational, branch and financial indicators."
        loadingTitle="Preparing executive dashboard"
        onRetry={dashboard.reload}
        state={dashboard}
      >
        {(projection) => (
          <ManagementDashboardContent
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
