"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  MockBranch,
} from "@wonflow/mock-data";

import {
  DataEmpty,
  DataError,
  DataLoading,
} from "@wonflow/ui";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";

import {
  WonFlowAsyncDataBoundary,
  WonFlowEmptyState,
  useWonFlowConfirm,
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
  useApiResource,
} from "@/lib/api";

import type {
  ListPatientsQuery,
} from "@/lib/api/patients";

import {
  createInitialPatientDirectoryFilters,
  fetchDirectoryPage,
  getDemoPatientRegistrationAge,
  primeLegacyPatientDirectoryCache,
  removeDirectoryPatient,
} from "@/lib/patients";

import type {
  DirectoryPage,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
  PatientDirectoryFilters,
  PatientDirectoryGenderFilter,
  PatientDirectorySort,
} from "@/lib/patients";

import {
  formatWonFlowDashboardDateTime,
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


function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeLinecap="round"
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
  name: string,
): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0)
          .toUpperCase(),
    )
    .join("");
}

function getGenderBadgeClass(
  gender: string,
): string {
  switch (gender) {
    case "female":
      return "bg-rose-50 text-rose-700 ring-rose-100";

    case "male":
      return "bg-blue-50 text-blue-700 ring-blue-100";

    case "other":
      return "bg-violet-50 text-violet-700 ring-violet-100";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
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

interface PatientDirectoryContentProps {
  branches:
    readonly MockBranch[];
}

function PatientDirectoryContent({
  branches,
}: PatientDirectoryContentProps) {
  const [
    filters,
    setFilters,
  ] = useState<
    PatientDirectoryFilters
  >(
    createInitialPatientDirectoryFilters,
  );

  // Debounced so the server is queried after typing pauses, not on every
  // keystroke.
  const [
    debouncedQuery,
    setDebouncedQuery,
  ] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(filters.query);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filters.query]);

  const [page, setPage] = useState(1);
  const pageSize = 25;

  // A changed search term or filter always starts back at page 1.
  useEffect(() => {
    queueMicrotask(() => {
      setPage(1);
    });
  }, [
    debouncedQuery,
    filters.gender,
    filters.minimumAge,
    filters.maximumAge,
    filters.sort,
  ]);

  const [
    selectedPatientId,
    setSelectedPatientId,
  ] = useState(
    () =>
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("patientId") ?? "",
  );

  const [removingId, setRemovingId] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { confirm, dialog: confirmDialog } = useWonFlowConfirm();

  const listQuery = useMemo<ListPatientsQuery>(
    () => ({
      query: debouncedQuery.trim() || undefined,
      gender: filters.gender === "all" ? undefined : filters.gender,
      minimumAge: filters.minimumAge.trim() === "" ? undefined : Number(filters.minimumAge),
      maximumAge: filters.maximumAge.trim() === "" ? undefined : Number(filters.maximumAge),
      sort: filters.sort,
      page,
      pageSize,
    }),
    [
      debouncedQuery,
      filters.gender,
      filters.maximumAge,
      filters.minimumAge,
      filters.sort,
      page,
    ],
  );

  const directory = useApiResource<DirectoryPage>({
    key: `patient-directory:${JSON.stringify(listQuery)}`,
    tags: ["patients"],
    fetcher: (signal) => fetchDirectoryPage(listQuery, signal),
    isEmpty: (result) => result.patients.length === 0,
  });

  const registrations = directory.data?.patients ?? [];
  const directoryData = directory.data;

  // Screens not yet wired to the live API (billing, diagnostics, pharmacy)
  // resolve a patient by id from this in-memory cache; keep it warm.
  useEffect(() => {
    if (directoryData !== undefined && directoryData.patients.length > 0) {
      primeLegacyPatientDirectoryCache(directoryData.patients);
    }
  }, [directoryData]);

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

  const selectedPatient =
    registrations.find(
      (registration) =>
        registration.id ===
        selectedPatientId,
    ) ??
    registrations[0];

  function updateFilter<
    TField extends
      keyof PatientDirectoryFilters,
  >(
    field: TField,
    value:
      PatientDirectoryFilters[TField],
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
      createInitialPatientDirectoryFilters(),
    );
  }

  async function removePatient(patient: DemoPatientRegistrationResult) {
    const confirmed = await confirm({
      title: "Remove patient",
      message: `${patient.displayName} (${patient.mrNumber}) leaves the patient directory. Appointments, invoices and clinical history are retained for audit.`,
      confirmLabel: "Remove patient",
    });
    if (!confirmed) return;
    setRemovingId(patient.id);
    setRemoveError("");
    try {
      await removeDirectoryPatient(patient.id);
      setSelectedPatientId("");
      directory.reload();
    } catch (caught) {
      setRemoveError(caught instanceof Error ? caught.message : "The patient could not be removed.");
    } finally {
      setRemovingId("");
    }
  }

  return (
    <div className="space-y-4">
      {confirmDialog}
      <WonFlowActionBar
        description="Search patients by name, MR number, CNIC, father name or phone number."
        filters={
          <>
            <label className="relative min-w-64 flex-1">
              <span className="sr-only">
                Search patients
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
                placeholder="Name, MR, CNIC, father name or phone"
                type="search"
                value={filters.query}
              />

              {/* Matches surface directly under the box, the way the reception
                  desk presents them, so a match can be opened without reading
                  the table below. */}
              {filters.query.trim() !== "" ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-[0_18px_44px_rgba(79,70,229,0.16)]">
                  {registrations.length === 0 ? (
                    <p className="px-4 py-3 text-xs font-semibold text-slate-500">No patient matches “{filters.query.trim()}”.</p>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto">
                      {registrations.slice(0, 8).map((registration) => (
                        <li key={registration.id}>
                          <button
                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-indigo-50 ${registration.id === selectedPatientId ? "bg-indigo-50/70" : ""}`}
                            onClick={() => setSelectedPatientId(registration.id)}
                            type="button"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-[10px] font-black text-white">
                              {registration.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join("").toLocaleUpperCase() || "PT"}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-slate-900">{registration.displayName}</span>
                              <span className="block truncate text-[11px] font-semibold text-slate-500">
                                {registration.mrNumber}
                                {registration.draft.mobileNumber ? ` · ${registration.draft.mobileNumber}` : ""}
                                {registration.draft.cnicNumber ? ` · ${registration.draft.cnicNumber}` : ""}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {registrations.length > 8 ? (
                    <p className="border-t border-slate-100 px-4 py-2 text-[10px] font-bold text-slate-500">
                      Showing 8 of {registrations.length} matches — refine the search or use the list below.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </label>

            <select
              aria-label="Sort patients"
              className="h-11 min-w-52 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              onChange={(
                event,
              ) => {
                updateFilter(
                  "sort",
                  event.target
                    .value as
                    PatientDirectorySort,
                );
              }}
              value={filters.sort}
            >
              <option value="recent">
                Recently Registered
              </option>

              <option value="name-ascending">
                Patient Name A–Z
              </option>

              <option value="mr-ascending">
                MR Number
              </option>

              <option value="age-ascending">
                Age: Youngest First
              </option>

              <option value="age-descending">
                Age: Oldest First
              </option>
            </select>
          </>
        }
        primaryActions={
          <WonFlowActionButton
            icon={<RefreshIcon />}
            onClick={
              directory.reload
            }
            variant="primary"
          >
            Refresh Directory
          </WonFlowActionButton>
        }
        secondaryActions={
          <>
            <WonFlowActionButton
              onClick={() => setFiltersOpen((open) => !open)}
              variant="ghost"
            >
              {filtersOpen ? "Hide filters" : "Filters"}
            </WonFlowActionButton>

            <WonFlowActionButton
              onClick={clearFilters}
              variant="ghost"
            >
              Clear Filters
            </WonFlowActionButton>
          </>
        }
        summary={
          `${directory.data?.total ?? 0} of ${directory.data?.summary.totalPatients ?? 0} patients`
        }
        title="Patient Search"
      />

      {/* Filters stay collapsed so the search, counts and list fit one screen. */}
      <div className={filtersOpen ? "" : "hidden"}>
      <WonFlowOperationalPanel
        compact
        description="Refine the patient directory using hospital-relevant filters."
        icon={<FilterIcon />}
        title="Directory Filters"
        tone="slate"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="text-xs font-bold text-slate-500">
              Registration Branch
            </span>

            <select
              className={[
                INPUT_CLASS_NAME,
                "mt-1.5",
              ].join(" ")}
              onChange={(
                event,
              ) => {
                updateFilter(
                  "branchId",
                  event.target.value,
                );
              }}
              value={
                filters.branchId
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
          </label>

          <label>
            <span className="text-xs font-bold text-slate-500">
              Gender
            </span>

            <select
              className={[
                INPUT_CLASS_NAME,
                "mt-1.5",
              ].join(" ")}
              onChange={(
                event,
              ) => {
                updateFilter(
                  "gender",
                  event.target
                    .value as
                    PatientDirectoryGenderFilter,
                );
              }}
              value={filters.gender}
            >
              <option value="all">
                All Genders
              </option>

              <option value="female">
                Female
              </option>

              <option value="male">
                Male
              </option>

              <option value="other">
                Other
              </option>

              <option value="unknown">
                Not Recorded
              </option>
            </select>
          </label>

          <label>
            <span className="text-xs font-bold text-slate-500">
              Minimum Age
            </span>

            <input
              className={[
                INPUT_CLASS_NAME,
                "mt-1.5",
              ].join(" ")}
              max="130"
              min="0"
              onChange={(
                event,
              ) => {
                updateFilter(
                  "minimumAge",
                  event.target.value,
                );
              }}
              placeholder="0"
              type="number"
              value={
                filters.minimumAge
              }
            />
          </label>

          <label>
            <span className="text-xs font-bold text-slate-500">
              Maximum Age
            </span>

            <input
              className={[
                INPUT_CLASS_NAME,
                "mt-1.5",
              ].join(" ")}
              max="130"
              min="0"
              onChange={(
                event,
              ) => {
                updateFilter(
                  "maximumAge",
                  event.target.value,
                );
              }}
              placeholder="130"
              type="number"
              value={
                filters.maximumAge
              }
            />
          </label>
        </div>
      </WonFlowOperationalPanel>
      </div>

      {/* A single strip instead of four cards: the same counts, one row tall. */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-white/80 px-3 py-2 shadow-sm">
        {[
          { label: "Total", value: directory.data?.summary.totalPatients ?? 0, tone: "text-indigo-700 bg-indigo-50" },
          { label: "Matching", value: directory.data?.total ?? 0, tone: "text-violet-700 bg-violet-50" },
          { label: "Male", value: directory.data?.summary.malePatients ?? 0, tone: "text-emerald-700 bg-emerald-50" },
          { label: "Female", value: directory.data?.summary.femalePatients ?? 0, tone: "text-rose-700 bg-rose-50" },
        ].map((stat) => (
          <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold ${stat.tone}`} key={stat.label}>
            {stat.label}
            <strong className="text-sm tabular-nums">{stat.value}</strong>
          </span>
        ))}
      </div>

      {directory.status ===
      "loading" ? (
        <WonFlowOperationalPanel
          description="Loading the patient directory."
          title="Registered Patients"
          tone="blue"
        >
          <DataLoading
            label="Loading patients"
            rows={8}
            shape="table"
          />
        </WonFlowOperationalPanel>
      ) : directory.status ===
        "error" ? (
        <DataError
          detail={
            directory.error
              ?.message
          }
          onRetry={
            directory.reload
          }
          what="the patient directory"
        />
      ) : directory.status ===
          "empty" &&
        (
          directory.data
            ?.summary
            .totalPatients ??
          0
        ) === 0 ? (
        <WonFlowOperationalPanel
          description="No patients are registered for this hospital yet."
          title="No Registered Patients"
          tone="amber"
        >
          <DataEmpty
            action={
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                href="/operations/patients/register"
              >
                Register First Patient
              </Link>
            }
            itemLabel="patients"
            title="No patient records"
          />
        </WonFlowOperationalPanel>
      ) : (
        <div className="wf-workflow-split">
          <div className="wf-workflow-main">
            <WonFlowOperationalPanel
            description="Registered patient identities matching the current search."
            icon={<UsersIcon />}
            status={
              <StatusBadge
                className="bg-blue-50 text-blue-700 ring-blue-100"
                label={`${registrations.length} records`}
              />
            }
            title="Registered Patients"
            tone="blue"
          >
            {registrations.length ===
            0 ? (
              <DataEmpty
                action={{
                  label:
                    "Clear filters",
                  onClick:
                    clearFilters,
                }}
                description="No patient matches the selected search and filters."
                itemLabel="matching patients"
                title="No matching patients"
              />
            ) : (
              <>
                {/* The list scrolls inside its panel so the summary and actions
                    stay reachable without scrolling the whole page. */}
                <div className="hidden max-h-[26rem] overflow-auto lg:block">
                  <table className="w-full min-w-[1120px] border-separate border-spacing-y-2 text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                        <th className="pb-3 font-extrabold">
                          Patient
                        </th>

                        <th className="pb-3 font-extrabold">
                          MR Number
                        </th>

                        <th className="pb-3 font-extrabold">
                          CNIC / B-Form
                        </th>

                        <th className="pb-3 font-extrabold">
                          Father / Guardian
                        </th>

                        <th className="pb-3 font-extrabold">
                          Gender / Age
                        </th>

                        <th className="pb-3 font-extrabold">
                          Mobile
                        </th>

                        <th className="pb-3 font-extrabold">
                          Branch
                        </th>

                        <th className="pb-3 text-right font-extrabold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {registrations.map(
                        (
                          registration,
                        ) => {
                          const age =
                            getDemoPatientRegistrationAge(
                              registration,
                            );

                          const branch =
                            branchesById.get(
                              registration
                                .draft
                                .branchId,
                            );

                          const isSelected =
                            selectedPatient
                              ?.id ===
                            registration.id;

                          return (
                            <tr
                              className={[
                                "group transition [&>td]:border-y [&>td]:border-slate-100 [&>td]:bg-white [&>td:first-child]:rounded-l-2xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-2xl [&>td:last-child]:border-r",
                                isSelected
                                  ? "[&>td]:border-indigo-200 [&>td]:bg-indigo-50/80 shadow-[0_8px_24px_rgba(79,70,229,0.08)]"
                                  : "hover:[&>td]:border-blue-200 hover:[&>td]:bg-blue-50/45 hover:shadow-[0_8px_24px_rgba(37,99,235,0.07)]",
                              ].join(" ")}
                              key={
                                registration.id
                              }
                            >
                              <td className="py-4 pr-4">
                                <button
                                  className="flex items-center gap-3 text-left"
                                  onClick={() => {
                                    setSelectedPatientId(
                                      registration.id,
                                    );
                                  }}
                                  type="button"
                                >
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 text-xs font-black text-indigo-700 ring-1 ring-indigo-200">
                                    {getInitials(
                                      registration.displayName,
                                    )}
                                  </span>

                                  <span>
                                    <span className="block text-sm font-extrabold text-slate-950">
                                      {
                                        registration.displayName
                                      }
                                    </span>

                                    <span className="mt-1 block text-xs text-slate-500">
                                      {
                                        humanizeValue(
                                          registration
                                            .draft
                                            .patientCategory,
                                        )
                                      }
                                    </span>
                                  </span>
                                </button>
                              </td>

                              <td className="py-4 pr-4 text-sm font-black text-indigo-700">
                                {
                                  registration.mrNumber
                                }
                              </td>

                              <td className="py-4 pr-4 font-mono text-xs font-semibold text-slate-600">
                                {
                                  registration
                                    .draft
                                    .cnicNumber
                                }
                              </td>

                              <td className="py-4 pr-4 text-sm font-semibold text-slate-700">
                                {
                                  registration
                                    .draft
                                    .fatherName
                                }
                              </td>

                              <td className="py-4 pr-4">
                                <StatusBadge
                                  className={getGenderBadgeClass(
                                    registration
                                      .draft
                                      .gender,
                                  )}
                                  label={`${humanizeValue(
                                    registration
                                      .draft
                                      .gender,
                                  )}${age === undefined ? "" : ` · ${age} years`}`}
                                />
                              </td>

                              <td className="py-4 pr-4 text-sm font-semibold text-slate-700">
                                {
                                  registration
                                    .draft
                                    .mobileNumber
                                }
                              </td>

                              <td className="py-4 pr-4 text-sm font-semibold text-slate-600">
                                {branch
                                  ?.name ??
                                  "Unknown branch"}
                              </td>

                              <td className="py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                                    onClick={() => {
                                      setSelectedPatientId(
                                        registration.id,
                                      );
                                    }}
                                    type="button"
                                  >
                                    Open
                                  </button>

                                  <Link
                                    className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                                    href={`/operations/appointments/new?patientId=${encodeURIComponent(
                                      registration.id,
                                    )}`}
                                  >
                                    Book
                                  </Link>

                                  <Link
                                    className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
                                    href={`/operations/billing/new?patientId=${encodeURIComponent(
                                      registration.id,
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

                <div className="max-h-[26rem] space-y-3 overflow-auto lg:hidden">
                  {registrations.map(
                    (
                      registration,
                    ) => {
                      const age =
                        getDemoPatientRegistrationAge(
                          registration,
                        );

                      const branch =
                        branchesById.get(
                          registration
                            .draft
                            .branchId,
                        );

                      return (
                        <article
                          className="rounded-[20px] border border-indigo-100/80 bg-gradient-to-br from-white via-blue-50/35 to-violet-50/55 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.08)]"
                          key={
                            registration.id
                          }
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 text-xs font-black text-indigo-700">
                              {getInitials(
                                registration.displayName,
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-black text-slate-950">
                                {
                                  registration.displayName
                                }
                              </div>

                              <div className="mt-1 text-xs font-bold text-indigo-700">
                                {
                                  registration.mrNumber
                                }
                              </div>
                            </div>

                            <StatusBadge
                              className={getGenderBadgeClass(
                                registration
                                  .draft
                                  .gender,
                              )}
                              label={
                                age === undefined
                                  ? humanizeValue(
                                      registration
                                        .draft
                                        .gender,
                                    )
                                  : `${age} years`
                              }
                            />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                            <MobileSummary
                              label="CNIC"
                              value={
                                registration
                                  .draft
                                  .cnicNumber
                              }
                            />

                            <MobileSummary
                              label="Mobile"
                              value={
                                registration
                                  .draft
                                  .mobileNumber
                              }
                            />

                            <MobileSummary
                              label="Father"
                              value={
                                registration
                                  .draft
                                  .fatherName
                              }
                            />

                            <MobileSummary
                              label="Branch"
                              value={
                                branch?.name ??
                                "Unknown"
                              }
                            />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
                              onClick={() => {
                                setSelectedPatientId(
                                  registration.id,
                                );
                              }}
                              type="button"
                            >
                              Open Patient
                            </button>

                            <Link
                              className="flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white"
                              href={`/operations/billing/new?patientId=${encodeURIComponent(
                                registration.id,
                              )}`}
                            >
                              Create Bill
                            </Link>
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              </>
            )}
            </WonFlowOperationalPanel>

            {directory.data !==
              undefined &&
            directory.data.total >
              pageSize ? (
              <nav
                aria-label="Patient directory pagination"
                className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm"
              >
                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    page <= 1
                  }
                  onClick={() => {
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current -
                            1,
                        ),
                    );
                  }}
                  type="button"
                >
                  Previous
                </button>

                <span>
                  Page {directory.data.page} of{" "}
                  {Math.max(
                    1,
                    Math.ceil(
                      directory
                        .data
                        .total /
                        pageSize,
                    ),
                  )}
                </span>

                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    directory
                      .data
                      .page *
                      pageSize >=
                    directory
                      .data
                      .total
                  }
                  onClick={() => {
                    setPage(
                      (current) =>
                        current +
                        1,
                    );
                  }}
                  type="button"
                >
                  Next
                </button>
              </nav>
            ) : null}
          </div>

          <aside className="wf-workflow-aside space-y-3 xl:sticky xl:top-4 xl:self-start">
            <PatientSummaryPanel
              branchesById={
                branchesById
              }
              patient={
                selectedPatient
              }
            />

            {selectedPatient !== undefined ? (
              <div className="rounded-[20px] border border-rose-200 bg-rose-50/60 p-4">
                <h3 className="text-xs font-black text-rose-900">Remove patient</h3>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-rose-800">
                  {selectedPatient.displayName} leaves the directory. Appointments, invoices and clinical history are retained for audit.
                </p>
                {removeError !== "" ? <p className="mt-2 text-[11px] font-bold text-rose-700" role="alert">{removeError}</p> : null}
                <button
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={removingId !== ""}
                  onClick={() => void removePatient(selectedPatient)}
                  type="button"
                >
                  {removingId === selectedPatient.id ? "Removing…" : "Delete patient"}
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}

function PatientSummaryPanel({
  patient,
  branchesById,
}: {
  patient:
    DemoPatientRegistrationResult |
    undefined;

  branchesById:
    ReadonlyMap<
      string,
      MockBranch
    >;
}) {
  if (patient === undefined) {
    return (
      <WonFlowOperationalPanel
        description="Select a patient from the directory."
        title="Patient Summary"
        tone="slate"
      >
        <WonFlowEmptyState
          description="No patient is currently selected."
          title="Select a patient"
        />
      </WonFlowOperationalPanel>
    );
  }

  const age =
    getDemoPatientRegistrationAge(
      patient,
    );

  const branch =
    branchesById.get(
      patient.draft.branchId,
    );

  return (
    <section className="overflow-hidden rounded-[24px] border border-indigo-200/70 bg-white shadow-[0_18px_50px_rgba(79,70,229,0.12)]">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.38),transparent_36%),linear-gradient(120deg,#172554,#1d4ed8_52%,#6d28d9)] p-5 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white/15 text-base font-black ring-1 ring-white/25">
            {getInitials(
              patient.displayName,
            )}
          </div>

          <div className="min-w-0">
            <div className="truncate text-lg font-black">
              {patient.displayName}
            </div>

            <div className="mt-1 text-xs font-bold text-indigo-100">
              {patient.mrNumber}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <dl className="space-y-4">
          <SummaryItem
            label="Father / Guardian"
            value={
              patient.draft
                .fatherName
            }
          />

          <SummaryItem
            label="CNIC / B-Form"
            value={
              patient.draft
                .cnicNumber
            }
          />

          <SummaryItem
            label="Gender and Age"
            value={[
              humanizeValue(
                patient.draft
                  .gender,
              ),

              age === undefined
                ? undefined
                : `${age} years`,
            ]
              .filter(Boolean)
              .join(" · ")}
          />

          <SummaryItem
            label="Mobile"
            value={
              patient.draft
                .mobileNumber
            }
          />

          <SummaryItem
            label="Registration Branch"
            value={
              branch?.name ??
              "Unknown branch"
            }
          />

          <SummaryItem
            label="Patient Category"
            value={humanizeValue(
              patient.draft
                .patientCategory,
            )}
          />

          <SummaryItem
            label="Registered"
            value={formatWonFlowDashboardDateTime(
              patient.registeredAt,
            )}
          />
        </dl>

        <div className="mt-6 space-y-2">
          <Link
            className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700"
            href={`/operations/patients/${encodeURIComponent(
              patient.id,
            )}/results`}
          >
            Laboratory Results
          </Link>

          <Link
            className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700"
            href={`/operations/patients/${encodeURIComponent(
              patient.id,
            )}/imaging`}
          >
            Imaging Timeline
          </Link>

          <Link
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
            href={`/operations/patients/${encodeURIComponent(
              patient.id,
            )}/medicines`}
          >
            Medicine History
          </Link>

          <Link
            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
            href={`/operations/patients/${encodeURIComponent(
              patient.id,
            )}/billing`}
          >
            Billing Ledger
          </Link>

          <Link
            className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700"
            href="/operations/insurance"
          >
            Insurance Claims
          </Link>

          <Link
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700"
            href={`/operations/inpatient/wards?patientId=${encodeURIComponent(
              patient.id,
            )}`}
          >
            Admit Patient
          </Link>

          <Link
            className="flex min-h-11 w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
            href={`/operations/appointments/new?patientId=${encodeURIComponent(
              patient.id,
            )}`}
          >
            Book Appointment
          </Link>

          <Link
            className="flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-sm font-bold text-white transition hover:from-emerald-700 hover:to-teal-700"
            href={`/operations/billing/new?patientId=${encodeURIComponent(
              patient.id,
            )}`}
          >
            Add Services and Create Bill
          </Link>

          <Link
            className="flex min-h-11 w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
            href="/operations/patients/register"
          >
            Register New Patient
          </Link>
        </div>

        <div className="mt-5 rounded-2xl bg-violet-50 p-4 text-xs leading-5 text-violet-700 ring-1 ring-violet-100">
          <div className="flex items-start gap-2">
            <ShieldIcon />

            <span>
              Live tenant record. Access is authorised by hospital permissions and written to the audit trail.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 break-words text-sm font-bold text-slate-800">
        {value || "Not recorded"}
      </dd>
    </div>
  );
}

function MobileSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 truncate font-semibold text-slate-700">
        {value || "Not recorded"}
      </div>
    </div>
  );
}

export function PatientDirectoryWorkflow() {
  const hospitalService =
    useWonFlowHospitalService();

  const branches =
    useWonFlowAsyncData({
      key:
        "patient-directory:branches",

      loader: (signal) =>
        hospitalService.listBranches(
          signal,
        ),

      isEmpty: (items) =>
        items.length === 0,
    });

  return (
    <div className="space-y-4">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
              href="/operations/billing/new"
            >
              Create Bill
            </Link>

            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700"
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
            href: "/operations",
          },
          {
            label:
              "Patients",
          },
          {
            label:
              "Patient Directory",
          },
        ]}
        description="Search registered patients using MR number, CNIC, father name, phone, gender, age and hospital branch."
        eyebrow="Patient Management"
        leading={<PatientIcon />}
        metadata={
          <>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700 ring-1 ring-blue-100">
              Fast counter search
            </span>

            <span>
              Live tenant records
            </span>
          </>
        }
        title="Patient Directory"
      />

      <WonFlowAsyncDataBoundary
        emptyDescription="No hospital branches are available for the patient directory."
        emptyTitle="Directory unavailable"
        loadingDescription="WonFlow is preparing the hospital branch directory."
        loadingTitle="Preparing patient directory"
        onRetry={branches.reload}
        state={branches}
      >
        {(branchRecords) => (
          <PatientDirectoryContent
            branches={
              branchRecords
            }
          />
        )}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
