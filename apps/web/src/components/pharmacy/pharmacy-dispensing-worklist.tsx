"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Pill,
  Search,
  ShoppingCart,
} from "lucide-react";

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
  WonFlowActionButton,
  WonFlowKpiCard,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  wonFlowInputClassName,
  wonFlowTextareaClassName,
} from "@/components/workflow";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  calculateDemoPharmacyCaseTotal,
  cancelDemoPharmacyDispensingCase,
  completeDemoPharmacyDispensing,
  initializeDemoPharmacyStock,
  isLikelyMatchingStockItem,
  readDemoPharmacyDispensingCases,
  readDemoPharmacyStock,
  saveDemoPharmacyDispensingCase,
  synchronizeCompletedPharmacyPrescriptions,
  validateDemoPharmacyDispensing,
} from "@/lib/pharmacy";

import type {
  DemoPharmacyCaseStatus,
  DemoPharmacyDispensingCase,
  DemoPharmacyDispensingLine,
  DemoPharmacyStockItem,
} from "@/lib/pharmacy";

import {
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import {
  formatWonFlowDashboardDateTime,
} from "@/lib/dashboard";

type PharmacyStatusFilter =
  | "all"
  | DemoPharmacyCaseStatus;

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

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

function cloneDispensingCase(
  dispensingCase:
    DemoPharmacyDispensingCase,
): DemoPharmacyDispensingCase {
  return {
    ...dispensingCase,

    lines:
      dispensingCase.lines.map(
        (line) => ({
          ...line,
        }),
      ),
  };
}

function getStatusClassName(
  status:
    DemoPharmacyCaseStatus,
): string {
  switch (status) {
    case "prescribed":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "queued":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "partially-dispensed":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "dispensed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

interface PharmacyWorklistContentProps {
  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function PharmacyWorklistContent({
  branches,
  practitioners,
}: PharmacyWorklistContentProps) {
  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    cases,
    setCases,
  ] = useState<
    DemoPharmacyDispensingCase[]
  >([]);

  const [
    stock,
    setStock,
  ] = useState<
    DemoPharmacyStockItem[]
  >([]);

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    PharmacyStatusFilter
  >("all");

  const [
    selectedCaseId,
    setSelectedCaseId,
  ] = useState("");

  const [
    draftCase,
    setDraftCase,
  ] = useState<
    DemoPharmacyDispensingCase |
    undefined
  >();

  const [
    validationErrors,
    setValidationErrors,
  ] = useState<string[]>([]);

  const [
    actionMessage,
    setActionMessage,
  ] = useState<
    string |
    undefined
  >();

  const reloadLocalData =
    useCallback(() => {
      initializeDemoPharmacyStock();

      setPatients(
        readDemoPatientRegistrations(),
      );

      setCases(
        readDemoPharmacyDispensingCases(),
      );

      setStock(
        readDemoPharmacyStock(),
      );
    }, []);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    const events = [
      "wonflow:demo-patients-changed",
      "wonflow:demo-pharmacy-cases-changed",
      "wonflow:demo-pharmacy-stock-changed",
      "storage",
    ];

    events.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          reloadLocalData,
        );
      },
    );

    return () => {
      events.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            reloadLocalData,
          );
        },
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

  const normalizedQuery =
    query
      .trim()
      .toLocaleLowerCase();

  const visibleCases =
    useMemo(
      () =>
        cases
          .filter(
            (
              dispensingCase,
            ) => {
              if (
                statusFilter !==
                  "all" &&
                dispensingCase.status !==
                  statusFilter
              ) {
                return false;
              }

              if (
                normalizedQuery ===
                ""
              ) {
                return true;
              }

              const patient =
                patientsById.get(
                  dispensingCase
                    .patientId,
                );

              const practitioner =
                practitionersById.get(
                  dispensingCase
                    .practitionerId,
                );

              const medicineNames =
                dispensingCase
                  .lines
                  .map(
                    (line) =>
                      line.medicineName,
                  )
                  .join(" ");

              return [
                dispensingCase
                  .prescriptionNumber,

                dispensingCase
                  .receiptNumber,

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

                medicineNames,

                dispensingCase.status,
              ]
                .join(" ")
                .toLocaleLowerCase()
                .includes(
                  normalizedQuery,
                );
            },
          )
          .sort(
            (
              left,
              right,
            ) => {
              const statusRank:
                Record<
                  DemoPharmacyCaseStatus,
                  number
                > = {
                prescribed: 0,
                queued: 1,
                "partially-dispensed": 2,
                dispensed: 3,
                cancelled: 4,
              };

              const difference =
                statusRank[
                  left.status
                ] -
                statusRank[
                  right.status
                ];

              if (
                difference !== 0
              ) {
                return difference;
              }

              return (
                new Date(
                  right.prescribedAt,
                ).getTime() -
                new Date(
                  left.prescribedAt,
                ).getTime()
              );
            },
          ),
      [
        cases,
        normalizedQuery,
        patientsById,
        practitionersById,
        statusFilter,
      ],
    );

  const selectedCase =
    cases.find(
      (
        dispensingCase,
      ) =>
        dispensingCase.id ===
        selectedCaseId,
    ) ??
    visibleCases[0];

  const activeCase =
    draftCase?.id ===
    selectedCase?.id
      ? draftCase
      : selectedCase;

  const selectedPatient =
    activeCase ===
    undefined
      ? undefined
      : patientsById.get(
          activeCase.patientId,
        );

  const selectedDoctor =
    activeCase ===
    undefined
      ? undefined
      : practitionersById.get(
          activeCase
            .practitionerId,
        );

  const selectedBranch =
    activeCase ===
    undefined
      ? undefined
      : branchesById.get(
          activeCase.branchId,
        );

  const statistics =
    useMemo(
      () => ({
        waiting:
          cases.filter(
            (
              dispensingCase,
            ) =>
              dispensingCase.status ===
                "prescribed" ||
              dispensingCase.status ===
                "queued",
          ).length,

        partial:
          cases.filter(
            (
              dispensingCase,
            ) =>
              dispensingCase.status ===
              "partially-dispensed",
          ).length,

        dispensed:
          cases.filter(
            (
              dispensingCase,
            ) =>
              dispensingCase.status ===
              "dispensed",
          ).length,

        lowStock:
          stock.filter(
            (item) =>
              item.availableQuantity <=
              item.reorderLevel,
          ).length,
      }),
      [
        cases,
        stock,
      ],
    );

  function selectCase(
    caseId: string,
  ) {
    const selected =
      cases.find(
        (
          dispensingCase,
        ) =>
          dispensingCase.id ===
          caseId,
      );

    setSelectedCaseId(
      caseId,
    );

    setDraftCase(
      selected === undefined
        ? undefined
        : cloneDispensingCase(
            selected,
          ),
    );

    setValidationErrors([]);

    setActionMessage(
      undefined,
    );
  }

  function updateDraftCase(
    changes:
      Partial<
        DemoPharmacyDispensingCase
      >,
  ) {
    setDraftCase(
      (currentCase) => {
        const baseCase =
          currentCase ??
          selectedCase;

        if (
          baseCase ===
          undefined
        ) {
          return currentCase;
        }

        return {
          ...baseCase,
          ...changes,
        };
      },
    );
  }

  function updateLine(
    lineId: string,

    changes:
      Partial<
        DemoPharmacyDispensingLine
      >,
  ) {
    setDraftCase(
      (currentCase) => {
        const baseCase =
          currentCase ??
          selectedCase;

        if (
          baseCase ===
          undefined
        ) {
          return currentCase;
        }

        return {
          ...baseCase,

          lines:
            baseCase.lines.map(
              (line) =>
                line.id ===
                lineId
                  ? {
                      ...line,
                      ...changes,
                    }
                  : line,
            ),
        };
      },
    );

    setValidationErrors([]);
  }

  function synchronizePrescriptions() {
    const createdCases =
      synchronizeCompletedPharmacyPrescriptions();

    reloadLocalData();

    setActionMessage(
      createdCases.length === 0
        ? "No new completed prescriptions were waiting for pharmacy dispatch."
        : `${createdCases.length} prescription${createdCases.length === 1 ? "" : "s"} dispatched to pharmacy.`,
    );
  }

  function saveDraft() {
    if (
      activeCase ===
      undefined
    ) {
      return;
    }

    const savedCase =
      saveDemoPharmacyDispensingCase(
        {
          ...activeCase,

          status:
            activeCase.status ===
            "prescribed"
              ? "queued"
              : activeCase.status,
        },
      );

    setDraftCase(
      cloneDispensingCase(
        savedCase,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Pharmacy dispensing draft saved.",
    );
  }

  async function completeDispensing() {
    if (
      activeCase ===
      undefined
    ) {
      return;
    }

    const errors =
      validateDemoPharmacyDispensing(
        activeCase,
        stock,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required dispensing information.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const confirmed =
      await wonflowConfirm({
        title: "Complete dispensing",
        message: "Pharmacy stock is deducted for every dispensed medicine.",
        confirmLabel: "Complete dispensing",
        tone: "primary",
      });

    if (!confirmed) {
      return;
    }

    const completed =
      completeDemoPharmacyDispensing(
        activeCase,
      );

    if (
      completed ===
      undefined
    ) {
      setActionMessage(
        "The dispensing transaction could not be completed.",
      );

      return;
    }

    setDraftCase(
      cloneDispensingCase(
        completed
          .dispensingCase,
      ),
    );

    reloadLocalData();

    setActionMessage(
      completed
        .dispensingCase
        .status ===
      "dispensed"
        ? "Prescription dispensed successfully."
        : "Prescription partially dispensed successfully.",
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function cancelCase() {
    if (
      activeCase ===
      undefined
    ) {
      return;
    }

    const confirmed =
      await wonflowConfirm({
        title: "Cancel prescription",
        message: `${activeCase.prescriptionNumber} is cancelled and leaves the dispensing queue.`,
        confirmLabel: "Cancel prescription",
      });

    if (!confirmed) {
      return;
    }

    const cancelledCase =
      cancelDemoPharmacyDispensingCase(
        activeCase.id,
      );

    if (
      cancelledCase ===
      undefined
    ) {
      setActionMessage(
        "This pharmacy case can no longer be cancelled.",
      );

      return;
    }

    setDraftCase(
      cloneDispensingCase(
        cancelledCase,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Pharmacy case cancelled.",
    );
  }

  const closed =
    activeCase?.status ===
      "dispensed" ||
    activeCase?.status ===
      "partially-dispensed" ||
    activeCase?.status ===
      "cancelled";

  const transactionTotal =
    activeCase ===
    undefined
      ? 0
      : calculateDemoPharmacyCaseTotal(
          activeCase,
          stock,
        );

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href="/operations/pharmacy/returns"
            >
              Medicine Returns
            </Link>

            <Link
              className="wf-button-secondary"
              href="/operations/pharmacy/inventory"
            >
              Inventory Management
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
            label: "Pharmacy",
          },
        ]}
        description="Validate prescriptions, select stock, approve substitutions and dispense medicines safely."
        eyebrow="Hospital Pharmacy"
        leading={
          <Pill size={20} />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              Fictional pharmacy data
            </span>

            <span>
              Browser-local inventory
            </span>
          </>
        }
        title="Pharmacy Dispensing"
      />

      {actionMessage !==
      undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          {actionMessage}
        </div>
      ) : null}

      {validationErrors.length >
      0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-rose-800">
            <AlertTriangle
              size={18}
            />

            Complete the dispensing details
          </div>

          <ul className="mt-3 space-y-1 text-xs leading-5 text-rose-700">
            {validationErrors.map(
              (error) => (
                <li key={error}>
                  • {error}
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WonFlowKpiCard
          helperText="Prescriptions waiting for dispensing"
          icon={
            <ShoppingCart
              size={18}
            />
          }
          label="Waiting"
          tone="blue"
          value={
            statistics.waiting
          }
        />

        <WonFlowKpiCard
          helperText="Prescriptions with incomplete supply"
          icon={
            <AlertTriangle
              size={18}
            />
          }
          label="Partially Dispensed"
          tone="amber"
          value={
            statistics.partial
          }
        />

        <WonFlowKpiCard
          helperText="Completed dispensing transactions"
          icon={
            <CheckCircle2
              size={18}
            />
          }
          label="Dispensed"
          tone="emerald"
          value={
            statistics.dispensed
          }
        />

        <WonFlowKpiCard
          helperText="Stock items at or below reorder level"
          icon={
            <Package size={18} />
          }
          label="Low Stock"
          tone="rose"
          value={
            statistics.lowStock
          }
        />
      </div>

      <section className="rounded-[18px] border border-slate-200 bg-white p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />

            <input
              className={[
                wonFlowInputClassName,
                "pl-10",
              ].join(" ")}
              onChange={(
                event,
              ) => {
                setQuery(
                  event.target.value,
                );
              }}
              placeholder="Search patient, MR number, CNIC, prescription or medicine"
              type="search"
              value={query}
            />
          </label>

          <select
            className={
              wonFlowInputClassName
            }
            onChange={(
              event,
            ) => {
              setStatusFilter(
                event.target
                  .value as
                  PharmacyStatusFilter,
              );
            }}
            value={statusFilter}
          >
            <option value="all">
              All Statuses
            </option>

            <option value="prescribed">
              Prescribed
            </option>

            <option value="queued">
              Queued
            </option>

            <option value="partially-dispensed">
              Partially Dispensed
            </option>

            <option value="dispensed">
              Dispensed
            </option>

            <option value="cancelled">
              Cancelled
            </option>
          </select>

          <WonFlowActionButton
            onClick={
              synchronizePrescriptions
            }
            variant="primary"
          >
            Sync Prescriptions
          </WonFlowActionButton>
        </div>
      </section>

      <div className="wf-workspace-rail">
        <div className="wf-workspace-rail-side">
          <WonFlowOperationalPanel
            description="Completed consultation prescriptions ordered by dispensing status."
            status={
              <span className="wf-status wf-status-blue">
                {
                  visibleCases.length
                }
                {" prescriptions"}
              </span>
            }
            title="Prescription Queue"
            tone="blue"
          >
            {visibleCases.length ===
            0 ? (
              <WonFlowEmptyState
                description="Complete a consultation containing medicines, then synchronize prescriptions."
                title="No pharmacy prescriptions"
              />
            ) : (
              <div className="space-y-3">
                {visibleCases.map(
                  (
                    dispensingCase,
                  ) => {
                    const patient =
                      patientsById.get(
                        dispensingCase
                          .patientId,
                      );

                    const selected =
                      activeCase?.id ===
                      dispensingCase.id;

                    return (
                      <button
                        className={[
                          "w-full rounded-2xl border p-4 text-left transition",
                          selected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                        ].join(" ")}
                        key={
                          dispensingCase.id
                        }
                        onClick={() => {
                          selectCase(
                            dispensingCase.id,
                          );
                        }}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-950">
                              {patient
                                ?.displayName ??
                                "Unknown patient"}
                            </div>

                            <div className="mt-1 text-xs font-bold text-blue-700">
                              {patient
                                ?.mrNumber ??
                                "No MR number"}
                            </div>
                          </div>

                          <span
                            className={[
                              "rounded-full border px-2.5 py-1 text-[10px] font-black",
                              getStatusClassName(
                                dispensingCase
                                  .status,
                              ),
                            ].join(" ")}
                          >
                            {humanizeValue(
                              dispensingCase
                                .status,
                            )}
                          </span>
                        </div>

                        <div className="mt-3 text-xs font-bold text-slate-700">
                          {
                            dispensingCase
                              .prescriptionNumber
                          }
                        </div>

                        <div className="mt-1 text-[11px] text-slate-500">
                          {
                            dispensingCase
                              .lines.length
                          }
                          {" medicine(s)"}
                        </div>

                        <div className="mt-3 text-[11px] text-slate-500">
                          {formatWonFlowDashboardDateTime(
                            dispensingCase
                              .prescribedAt,
                          )}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>

        <div className="wf-workspace-rail-main">
          {activeCase ===
            undefined ||
          selectedPatient ===
            undefined ? (
            <WonFlowOperationalPanel
              description="Select a prescription from the pharmacy queue."
              title="Dispensing Workspace"
              tone="slate"
            >
              <WonFlowEmptyState
                description="No prescription is currently selected."
                title="Select a prescription"
              />
            </WonFlowOperationalPanel>
          ) : (
            <div className="space-y-6">
              <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white">
                <div className="bg-blue-700 p-5 text-white">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">
                    Pharmacy Prescription
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    {
                      selectedPatient
                        .displayName
                    }
                  </h2>

                  <div className="mt-1 text-xs text-blue-100">
                    {
                      selectedPatient
                        .mrNumber
                    }
                    {" · "}
                    {
                      activeCase
                        .prescriptionNumber
                    }
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryItem
                    label="CNIC / B-Form"
                    value={
                      selectedPatient
                        .draft
                        .cnicNumber
                    }
                  />

                  <SummaryItem
                    label="Prescribing Doctor"
                    value={
                      selectedDoctor
                        ?.displayName ??
                      "Unknown doctor"
                    }
                  />

                  <SummaryItem
                    label="Hospital Branch"
                    value={
                      selectedBranch
                        ?.name ??
                      "Unknown branch"
                    }
                  />

                  <SummaryItem
                    label="Prescription Status"
                    value={humanizeValue(
                      activeCase.status,
                    )}
                  />
                </div>
              </section>

              <fieldset
                disabled={closed}
              >
                <WonFlowOperationalPanel
                  description="Select the exact stock item and quantity supplied for each prescribed medicine."
                  icon={
                    <Pill size={18} />
                  }
                  title="Medicine Dispensing"
                  tone="blue"
                >
                  <div className="space-y-4">
                    {activeCase.lines.map(
                      (line) => {
                        const selectedStock =
                          stock.find(
                            (item) =>
                              item.id ===
                              line
                                .selectedStockItemId,
                          );

                        const substitution =
                          selectedStock ===
                          undefined
                            ? false
                            : !isLikelyMatchingStockItem(
                                line,
                                selectedStock,
                              );

                        return (
                          <article
                            className="rounded-[18px] border border-slate-200 bg-slate-50/60 p-4"
                            key={line.id}
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <h3 className="text-base font-black text-slate-950">
                                  {
                                    line.medicineName
                                  }
                                  {line.strength
                                    ? ` ${line.strength}`
                                    : ""}
                                </h3>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {[
                                    line.dose,
                                    line.route,
                                    line.frequency,
                                    line.duration,
                                  ]
                                    .filter(
                                      Boolean,
                                    )
                                    .join(
                                      " · ",
                                    ) ||
                                    "No dosing details recorded"}
                                </p>

                                {line.instructions ? (
                                  <p className="mt-2 text-xs font-semibold text-blue-700">
                                    {
                                      line.instructions
                                    }
                                  </p>
                                ) : null}
                              </div>

                              <span className="wf-status wf-status-blue">
                                Prescribed:
                                {" "}
                                {
                                  line
                                    .prescribedQuantity
                                }
                              </span>
                            </div>

                            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_170px]">
                              <label>
                                <span className="text-xs font-bold text-slate-600">
                                  Pharmacy Stock Item
                                </span>

                                <select
                                  className={[
                                    wonFlowInputClassName,
                                    "mt-1.5",
                                  ].join(" ")}
                                  onChange={(
                                    event,
                                  ) => {
                                    updateLine(
                                      line.id,

                                      {
                                        selectedStockItemId:
                                          event
                                            .target
                                            .value,

                                        substitutionApproved:
                                          false,

                                        substitutionReason:
                                          "",
                                      },
                                    );
                                  }}
                                  value={
                                    line
                                      .selectedStockItemId
                                  }
                                >
                                  <option value="">
                                    Select stock item
                                  </option>

                                  {stock
                                    .filter(
                                      (item) =>
                                        item.active,
                                    )
                                    .map(
                                      (
                                        item,
                                      ) => (
                                        <option
                                          key={
                                            item.id
                                          }
                                          value={
                                            item.id
                                          }
                                        >
                                          {
                                            item.genericName
                                          }
                                          {" — "}
                                          {
                                            item.brandName
                                          }
                                          {" — "}
                                          {
                                            item.strength
                                          }
                                          {" — Stock "}
                                          {
                                            item.availableQuantity
                                          }
                                        </option>
                                      ),
                                    )}
                                </select>
                              </label>

                              <label>
                                <span className="text-xs font-bold text-slate-600">
                                  Dispense Quantity
                                </span>

                                <input
                                  className={[
                                    wonFlowInputClassName,
                                    "mt-1.5",
                                  ].join(" ")}
                                  inputMode="numeric"
                                  max={
                                    line
                                      .prescribedQuantity
                                  }
                                  min={0}
                                  onChange={(
                                    event,
                                  ) => {
                                    const parsedValue =
                                      Number(
                                        event
                                          .target
                                          .value,
                                      );

                                    updateLine(
                                      line.id,

                                      {
                                        dispensedQuantity:
                                          Number.isFinite(
                                            parsedValue,
                                          )
                                            ? Math.max(
                                                0,
                                                parsedValue,
                                              )
                                            : 0,
                                      },
                                    );
                                  }}
                                  type="number"
                                  value={
                                    line
                                      .dispensedQuantity
                                  }
                                />
                              </label>
                            </div>

                            {selectedStock !==
                            undefined ? (
                              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                <span className="wf-status wf-status-neutral">
                                  Available:
                                  {" "}
                                  {
                                    selectedStock
                                      .availableQuantity
                                  }
                                </span>

                                <span className="wf-status wf-status-neutral">
                                  Batch:
                                  {" "}
                                  {
                                    selectedStock
                                      .batchNumber
                                  }
                                </span>

                                <span className="wf-status wf-status-neutral">
                                  Expiry:
                                  {" "}
                                  {
                                    selectedStock
                                      .expiryDate
                                  }
                                </span>

                                <span className="wf-status wf-status-emerald">
                                  {formatCurrency(
                                    selectedStock
                                      .unitPrice,
                                  )}
                                  {" each"}
                                </span>
                              </div>
                            ) : null}

                            {substitution ? (
                              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <label className="flex items-start gap-3">
                                  <input
                                    checked={
                                      line
                                        .substitutionApproved
                                    }
                                    className="mt-1 h-4 w-4"
                                    onChange={(
                                      event,
                                    ) => {
                                      updateLine(
                                        line.id,

                                        {
                                          substitutionApproved:
                                            event
                                              .target
                                              .checked,
                                        },
                                      );
                                    }}
                                    type="checkbox"
                                  />

                                  <span>
                                    <span className="block text-sm font-black text-amber-900">
                                      Approve medicine substitution
                                    </span>

                                    <span className="mt-1 block text-xs leading-5 text-amber-700">
                                      The selected stock item does not directly match the prescribed medicine name.
                                    </span>
                                  </span>
                                </label>

                                <textarea
                                  className={[
                                    wonFlowTextareaClassName,
                                    "mt-3 min-h-20",
                                  ].join(" ")}
                                  onChange={(
                                    event,
                                  ) => {
                                    updateLine(
                                      line.id,

                                      {
                                        substitutionReason:
                                          event
                                            .target
                                            .value,
                                      },
                                    );
                                  }}
                                  placeholder="Reason and authorization for substitution"
                                  value={
                                    line
                                      .substitutionReason
                                  }
                                />
                              </div>
                            ) : null}
                          </article>
                        );
                      },
                    )}
                  </div>
                </WonFlowOperationalPanel>
              </fieldset>

              <fieldset
                disabled={closed}
              >
                <WonFlowOperationalPanel
                  description="Record the responsible pharmacy staff member and dispensing notes."
                  title="Dispensing Confirmation"
                  tone="emerald"
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        Pharmacist / Staff Member
                      </span>

                      <input
                        className={[
                          wonFlowInputClassName,
                          "mt-1.5",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          updateDraftCase({
                            pharmacistName:
                              event.target
                                .value,
                          });
                        }}
                        placeholder="Enter dispensing staff name"
                        value={
                          activeCase
                            .pharmacistName
                        }
                      />
                    </label>

                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        Dispensing Notes
                      </span>

                      <textarea
                        className={[
                          wonFlowTextareaClassName,
                          "mt-1.5 min-h-24",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          updateDraftCase({
                            dispensingNotes:
                              event.target
                                .value,
                          });
                        }}
                        placeholder="Counselling, supply limitations or pharmacy notes"
                        value={
                          activeCase
                            .dispensingNotes
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-blue-700">
                      Estimated Dispensing Total
                    </div>

                    <div className="mt-2 text-2xl font-black text-blue-950">
                      {formatCurrency(
                        transactionTotal,
                      )}
                    </div>
                  </div>
                </WonFlowOperationalPanel>
              </fieldset>

              {closed ? (
                <section className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-6">
                  <h2 className="text-xl font-black text-emerald-950">
                    {activeCase.status ===
                    "cancelled"
                      ? "Prescription cancelled"
                      : activeCase.status ===
                          "dispensed"
                        ? "Prescription dispensed"
                        : "Prescription partially dispensed"}
                  </h2>

                  {activeCase
                    .receiptNumber ? (
                    <Link
                      className="wf-button-primary mt-4"
                      href={`/operations/pharmacy/receipts/${encodeURIComponent(
                        activeCase.id,
                      )}`}
                    >
                      Print Dispensing Receipt
                    </Link>
                  ) : null}
                </section>
              ) : (
                <div className="wf-sticky-actions flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      Pharmacy dispensing
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Verify medicine, strength, quantity, batch and expiry before completing.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <WonFlowActionButton
                      onClick={cancelCase}
                      variant="danger"
                    >
                      Cancel Prescription
                    </WonFlowActionButton>

                    <WonFlowActionButton
                      onClick={saveDraft}
                      variant="secondary"
                    >
                      Save Draft
                    </WonFlowActionButton>

                    <WonFlowActionButton
                      onClick={
                        completeDispensing
                      }
                      variant="primary"
                    >
                      Complete Dispensing
                    </WonFlowActionButton>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
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
      <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 text-sm font-bold text-slate-800">
        {value || "Not recorded"}
      </dd>
    </div>
  );
}

export function PharmacyDispensingWorklist() {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "pharmacy-dispensing:directories",

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
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital directory information is unavailable."
      emptyTitle="Pharmacy unavailable"
      loadingDescription="WonFlow is preparing prescriptions, stock and pharmacy information."
      loadingTitle="Preparing pharmacy"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <PharmacyWorklistContent
          branches={
            directory.branches
          }
          practitioners={
            directory.practitioners
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}
