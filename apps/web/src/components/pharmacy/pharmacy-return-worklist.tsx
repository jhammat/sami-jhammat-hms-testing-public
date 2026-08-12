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
  BadgeDollarSign,
  CheckCircle2,
  PackageCheck,
  RotateCcw,
  Search,
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
  approveDemoPharmacyReturnCase,
  calculateDemoPharmacyReturnTotal,
  completeDemoPharmacyReturnCase,
  createDemoPharmacyReturnCase,
  getDemoPharmacyDispensingCaseReturnableQuantity,
  readDemoPharmacyDispensingCases,
  readDemoPharmacyReturnCases,
  rejectDemoPharmacyReturnCase,
  saveDemoPharmacyReturnCase,
  submitDemoPharmacyReturnCase,
  validateDemoPharmacyReturnCase,
} from "@/lib/pharmacy";

import type {
  DemoPharmacyDispensingCase,
  DemoPharmacyPackageCondition,
  DemoPharmacyReturnCase,
  DemoPharmacyReturnDisposition,
  DemoPharmacyReturnLine,
  DemoPharmacyReturnStatus,
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

type ReturnStatusFilter =
  | "all"
  | DemoPharmacyReturnStatus;

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

function cloneReturnCase(
  returnCase:
    DemoPharmacyReturnCase,
): DemoPharmacyReturnCase {
  return {
    ...returnCase,

    lines:
      returnCase.lines.map(
        (line) => ({
          ...line,
        }),
      ),
  };
}

function getStatusClassName(
  status:
    DemoPharmacyReturnStatus,
): string {
  switch (status) {
    case "draft":
      return "border-slate-200 bg-slate-100 text-slate-600";

    case "submitted":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "approved":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

interface PharmacyReturnContentProps {
  initialDispensingCaseId?: string;

  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function PharmacyReturnContent({
  initialDispensingCaseId,
  branches,
  practitioners,
}: PharmacyReturnContentProps) {
  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    dispensingCases,
    setDispensingCases,
  ] = useState<
    DemoPharmacyDispensingCase[]
  >([]);

  const [
    returnCases,
    setReturnCases,
  ] = useState<
    DemoPharmacyReturnCase[]
  >([]);

  const [
    sourceDispensingCaseId,
    setSourceDispensingCaseId,
  ] = useState(
    initialDispensingCaseId ??
      "",
  );

  const [
    selectedReturnCaseId,
    setSelectedReturnCaseId,
  ] = useState("");

  const [
    draftReturnCase,
    setDraftReturnCase,
  ] = useState<
    DemoPharmacyReturnCase |
    undefined
  >();

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    ReturnStatusFilter
  >("all");

  const [
    validationErrors,
    setValidationErrors,
  ] = useState<string[]>([]);

  const [
    approverName,
    setApproverName,
  ] = useState("");

  const [
    approvalNote,
    setApprovalNote,
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

      setDispensingCases(
        readDemoPharmacyDispensingCases(),
      );

      setReturnCases(
        readDemoPharmacyReturnCases(),
      );
    }, []);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    const eventNames = [
      "wonflow:demo-patients-changed",
      "wonflow:demo-pharmacy-cases-changed",
      "wonflow:demo-pharmacy-returns-changed",
      "wonflow:demo-pharmacy-stock-changed",
      "storage",
    ];

    eventNames.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          reloadLocalData,
        );
      },
    );

    return () => {
      eventNames.forEach(
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

  const eligibleDispensingCases =
    useMemo(
      () =>
        dispensingCases
          .filter(
            (dispensingCase) =>
              (
                dispensingCase.status ===
                  "dispensed" ||
                dispensingCase.status ===
                  "partially-dispensed"
              ) &&
              getDemoPharmacyDispensingCaseReturnableQuantity(
                dispensingCase,
              ) > 0,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.dispensedAt,
              ).getTime() -
              new Date(
                left.dispensedAt,
              ).getTime(),
          ),
      [dispensingCases],
    );

  const normalizedQuery =
    query
      .trim()
      .toLocaleLowerCase();

  const visibleReturnCases =
    useMemo(
      () =>
        returnCases
          .filter(
            (returnCase) => {
              if (
                statusFilter !==
                  "all" &&
                returnCase.status !==
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
                  returnCase.patientId,
                );

              return [
                returnCase.returnNumber,
                returnCase
                  .prescriptionNumber,
                returnCase
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
                returnCase.status,
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
            ) =>
              new Date(
                right.createdAt,
              ).getTime() -
              new Date(
                left.createdAt,
              ).getTime(),
          ),
      [
        normalizedQuery,
        patientsById,
        returnCases,
        statusFilter,
      ],
    );

  const selectedReturnCase =
    returnCases.find(
      (returnCase) =>
        returnCase.id ===
        selectedReturnCaseId,
    ) ??
    visibleReturnCases[0];

  const activeReturnCase =
    draftReturnCase?.id ===
    selectedReturnCase?.id
      ? draftReturnCase
      : selectedReturnCase;

  const selectedPatient =
    activeReturnCase ===
    undefined
      ? undefined
      : patientsById.get(
          activeReturnCase
            .patientId,
        );

  const selectedDoctor =
    activeReturnCase ===
    undefined
      ? undefined
      : practitionersById.get(
          activeReturnCase
            .practitionerId,
        );

  const selectedBranch =
    activeReturnCase ===
    undefined
      ? undefined
      : branchesById.get(
          activeReturnCase
            .branchId,
        );

  const statistics =
    useMemo(
      () => ({
        draft:
          returnCases.filter(
            (returnCase) =>
              returnCase.status ===
              "draft",
          ).length,

        waitingApproval:
          returnCases.filter(
            (returnCase) =>
              returnCase.status ===
              "submitted",
          ).length,

        completed:
          returnCases.filter(
            (returnCase) =>
              returnCase.status ===
              "completed",
          ).length,

        pendingRefund:
          returnCases.filter(
            (returnCase) =>
              returnCase
                .refundStatus ===
              "pending-cashier",
          ).length,
      }),
      [returnCases],
    );

  function selectReturnCase(
    returnCaseId: string,
  ) {
    const returnCase =
      returnCases.find(
        (record) =>
          record.id ===
          returnCaseId,
      );

    setSelectedReturnCaseId(
      returnCaseId,
    );

    setDraftReturnCase(
      returnCase === undefined
        ? undefined
        : cloneReturnCase(
            returnCase,
          ),
    );

    setApproverName(
      returnCase?.approvedBy ??
        "",
    );

    setApprovalNote(
      returnCase
        ?.approvalNote ??
        "",
    );

    setValidationErrors([]);

    setActionMessage(
      undefined,
    );
  }

  function beginReturn() {
    if (
      sourceDispensingCaseId ===
      ""
    ) {
      setActionMessage(
        "Select a completed dispensing transaction.",
      );

      return;
    }

    const createdReturn =
      createDemoPharmacyReturnCase(
        sourceDispensingCaseId,
      );

    if (
      createdReturn ===
      undefined
    ) {
      setActionMessage(
        "This dispensing transaction has no remaining returnable medicine.",
      );

      return;
    }

    reloadLocalData();

    setSelectedReturnCaseId(
      createdReturn.id,
    );

    setDraftReturnCase(
      cloneReturnCase(
        createdReturn,
      ),
    );

    setActionMessage(
      `${createdReturn.returnNumber} opened successfully.`,
    );
  }

  function updateReturnCase(
    changes:
      Partial<
        DemoPharmacyReturnCase
      >,
  ) {
    setDraftReturnCase(
      (currentReturn) => {
        const baseReturn =
          currentReturn ??
          selectedReturnCase;

        if (
          baseReturn ===
          undefined
        ) {
          return currentReturn;
        }

        return {
          ...baseReturn,
          ...changes,
        };
      },
    );

    setValidationErrors([]);
  }

  function updateReturnLine(
    lineId: string,

    changes:
      Partial<
        DemoPharmacyReturnLine
      >,
  ) {
    setDraftReturnCase(
      (currentReturn) => {
        const baseReturn =
          currentReturn ??
          selectedReturnCase;

        if (
          baseReturn ===
          undefined
        ) {
          return currentReturn;
        }

        return {
          ...baseReturn,

          lines:
            baseReturn.lines.map(
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

  function saveDraft() {
    if (
      activeReturnCase ===
      undefined ||
      activeReturnCase.status !==
      "draft"
    ) {
      return;
    }

    const savedReturn =
      saveDemoPharmacyReturnCase(
        activeReturnCase,
      );

    setDraftReturnCase(
      cloneReturnCase(
        savedReturn,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Medicine-return draft saved.",
    );
  }

  function submitReturn() {
    if (
      activeReturnCase ===
      undefined
    ) {
      return;
    }

    const errors =
      validateDemoPharmacyReturnCase(
        activeReturnCase,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required medicine-return information.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const submittedReturn =
      submitDemoPharmacyReturnCase(
        activeReturnCase,
      );

    if (
      submittedReturn ===
      undefined
    ) {
      setActionMessage(
        "The medicine return could not be submitted.",
      );

      return;
    }

    setDraftReturnCase(
      cloneReturnCase(
        submittedReturn,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Medicine return submitted for approval.",
    );
  }

  function approveReturn() {
    if (
      activeReturnCase ===
      undefined
    ) {
      return;
    }

    const approvedReturn =
      approveDemoPharmacyReturnCase(
        activeReturnCase,
        approverName,
        approvalNote,
      );

    if (
      approvedReturn ===
      undefined
    ) {
      setActionMessage(
        "Enter the approving pharmacy staff member and verify the return details.",
      );

      return;
    }

    setDraftReturnCase(
      cloneReturnCase(
        approvedReturn,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Medicine return approved.",
    );
  }

  function rejectReturn() {
    if (
      activeReturnCase ===
      undefined
    ) {
      return;
    }

    const rejectedReturn =
      rejectDemoPharmacyReturnCase(
        activeReturnCase,
        approverName,
        approvalNote,
      );

    if (
      rejectedReturn ===
      undefined
    ) {
      setActionMessage(
        "Enter the rejecting staff member and a rejection reason.",
      );

      return;
    }

    setDraftReturnCase(
      cloneReturnCase(
        rejectedReturn,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Medicine return rejected.",
    );
  }

  async function completeReturn() {
    if (
      activeReturnCase ===
      undefined
    ) {
      return;
    }

    const confirmed =
      await wonflowConfirm({
        title: "Complete medicine return",
        message: "Eligible sealed medicines are added back to pharmacy stock.",
        confirmLabel: "Complete return",
        tone: "primary",
      });

    if (!confirmed) {
      return;
    }

    const completed =
      completeDemoPharmacyReturnCase(
        activeReturnCase,
      );

    if (
      completed ===
      undefined
    ) {
      setActionMessage(
        "The medicine return could not be completed. Recheck quantities, packaging and stock-batch eligibility.",
      );

      return;
    }

    setDraftReturnCase(
      cloneReturnCase(
        completed.returnCase,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Medicine return completed successfully.",
    );
  }

  /* refund processing is handled by Billing */
  /*
    if (
      activeReturnCase ===
      undefined
    ) {
      return;
    }

    const completedRefund =
      completeDemoPharmacyRefundCoordination(
        activeReturnCase.id,
        refundStaff,
        refundReference,
        refundNote,
      );

    if (
      completedRefund ===
      undefined
    ) {
      setActionMessage(
        "Enter the cashier or staff member and the refund transaction reference.",
      );

      return;
    }

    setDraftReturnCase(
      cloneReturnCase(
        completedRefund,
      ),
    );

    setRefundStaff("");
    setRefundReference("");
    setRefundNote("");

    reloadLocalData();

    setActionMessage(
      "Refund coordination completed.",
    );
  }

  function rejectRefund() {
    if (
      activeReturnCase ===
      undefined
    ) {
      return;
    }

    const rejectedRefund =
      rejectDemoPharmacyRefundCoordination(
        activeReturnCase.id,
        refundStaff,
        refundNote,
      );

    if (
      rejectedRefund ===
      undefined
    ) {
      setActionMessage(
        "Enter the responsible staff member and refund-rejection reason.",
      );

      return;
    }

    setDraftReturnCase(
      cloneReturnCase(
        rejectedRefund,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Refund request rejected.",
    );
  }
  */

  const editable =
    activeReturnCase?.status ===
    "draft";

  const returnTotal =
    activeReturnCase ===
    undefined
      ? 0
      : calculateDemoPharmacyReturnTotal(
          activeReturnCase,
        );

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href="/operations/pharmacy"
            >
              Pharmacy Dispensing
            </Link>

            <Link
              className="wf-button-secondary"
              href="/operations/pharmacy/inventory"
            >
              Inventory
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
            href:
              "/operations/pharmacy",
          },
          {
            label:
              "Medicine Returns",
          },
        ]}
        description="Validate returned medicines, approve safe stock reversal and coordinate patient refunds."
        eyebrow="Pharmacy Returns"
        leading={
          <RotateCcw size={20} />
        }
        title="Medicine Returns and Reversals"
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

            Complete the return information
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
          helperText="Returns still being prepared"
          label="Draft Returns"
          tone="slate"
          value={statistics.draft}
        />

        <WonFlowKpiCard
          helperText="Waiting for pharmacy authorization"
          label="Waiting Approval"
          tone="blue"
          value={
            statistics.waitingApproval
          }
        />

        <WonFlowKpiCard
          helperText="Completed medicine returns"
          label="Completed"
          tone="emerald"
          value={
            statistics.completed
          }
        />

        <WonFlowKpiCard
          helperText="Returns waiting for cashier coordination"
          label="Pending Refund"
          tone="amber"
          value={
            statistics.pendingRefund
          }
        />
      </div>

      <WonFlowOperationalPanel
        description="Start a return from a completed or partially completed dispensing transaction."
        icon={
          <PackageCheck
            size={18}
          />
        }
        title="Start Medicine Return"
        tone="blue"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <select
            className={
              wonFlowInputClassName
            }
            onChange={(
              event,
            ) => {
              setSourceDispensingCaseId(
                event.target.value,
              );
            }}
            value={
              sourceDispensingCaseId
            }
          >
            <option value="">
              Select dispensing transaction
            </option>

            {eligibleDispensingCases.map(
              (dispensingCase) => {
                const patient =
                  patientsById.get(
                    dispensingCase
                      .patientId,
                  );

                return (
                  <option
                    key={
                      dispensingCase.id
                    }
                    value={
                      dispensingCase.id
                    }
                  >
                    {patient
                      ?.displayName ??
                      "Unknown patient"}
                    {" — "}
                    {patient
                      ?.mrNumber ??
                      "No MR"}
                    {" — "}
                    {
                      dispensingCase
                        .receiptNumber
                    }
                    {" — "}
                    {getDemoPharmacyDispensingCaseReturnableQuantity(
                      dispensingCase,
                    )}
                    {" unit(s) returnable"}
                  </option>
                );
              },
            )}
          </select>

          <WonFlowActionButton
            onClick={beginReturn}
            variant="primary"
          >
            Open Return
          </WonFlowActionButton>
        </div>
      </WonFlowOperationalPanel>

      <section className="rounded-[18px] border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
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
              placeholder="Search patient, MR, CNIC, return, receipt or prescription"
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
                  ReturnStatusFilter,
              );
            }}
            value={statusFilter}
          >
            <option value="all">
              All Return Statuses
            </option>

            <option value="draft">
              Draft
            </option>

            <option value="submitted">
              Submitted
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="rejected">
              Rejected
            </option>

            <option value="completed">
              Completed
            </option>
          </select>
        </div>
      </section>

      <div className="wf-workspace-rail">
        <div className="wf-workspace-rail-side">
          <WonFlowOperationalPanel
            description="Medicine returns ordered by creation date."
            status={
              <span className="wf-status wf-status-blue">
                {
                  visibleReturnCases.length
                }
                {" returns"}
              </span>
            }
            title="Return Queue"
            tone="blue"
          >
            {visibleReturnCases.length ===
            0 ? (
              <WonFlowEmptyState
                description="No medicine return matches the selected filters."
                title="No returns found"
              />
            ) : (
              <div className="space-y-3">
                {visibleReturnCases.map(
                  (returnCase) => {
                    const patient =
                      patientsById.get(
                        returnCase
                          .patientId,
                      );

                    const selected =
                      activeReturnCase
                        ?.id ===
                      returnCase.id;

                    return (
                      <button
                        className={[
                          "w-full rounded-2xl border p-4 text-left transition",
                          selected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                        ].join(" ")}
                        key={returnCase.id}
                        onClick={() => {
                          selectReturnCase(
                            returnCase.id,
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
                              {
                                returnCase.returnNumber
                              }
                            </div>
                          </div>

                          <span
                            className={[
                              "rounded-full border px-2.5 py-1 text-[10px] font-black",
                              getStatusClassName(
                                returnCase.status,
                              ),
                            ].join(" ")}
                          >
                            {humanizeValue(
                              returnCase.status,
                            )}
                          </span>
                        </div>

                        <div className="mt-3 text-[11px] text-slate-500">
                          {
                            returnCase.receiptNumber
                          }
                        </div>

                        <div className="mt-1 text-[11px] text-slate-500">
                          {formatWonFlowDashboardDateTime(
                            returnCase.createdAt,
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
          {activeReturnCase ===
            undefined ||
          selectedPatient ===
            undefined ? (
            <WonFlowOperationalPanel
              description="Select or start a medicine return."
              title="Return Workspace"
              tone="slate"
            >
              <WonFlowEmptyState
                description="No medicine return is currently selected."
                title="Select a return"
              />
            </WonFlowOperationalPanel>
          ) : (
            <div className="space-y-6">
              <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white">
                <div className="bg-blue-700 p-5 text-white">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">
                    Medicine Return
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
                      activeReturnCase
                        .returnNumber
                    }
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryItem
                    label="Receipt"
                    value={
                      activeReturnCase
                        .receiptNumber
                    }
                  />

                  <SummaryItem
                    label="Prescription"
                    value={
                      activeReturnCase
                        .prescriptionNumber
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
                </div>
              </section>

              <fieldset
                disabled={!editable}
              >
                <WonFlowOperationalPanel
                  description="Record the exact quantity, package condition, return reason and final disposition."
                  title="Returned Medicines"
                  tone="blue"
                >
                  <div className="space-y-4">
                    {activeReturnCase.lines.map(
                      (line) => (
                        <article
                          className="rounded-[18px] border border-slate-200 bg-slate-50/60 p-4"
                          key={line.id}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <h3 className="text-base font-black text-slate-950">
                                {
                                  line.stockDisplayName
                                }
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  line.strength
                                }
                                {" · Maximum returnable: "}
                                {
                                  line.maximumReturnableQuantity
                                }
                              </p>
                            </div>

                            <span className="wf-status wf-status-blue">
                              Dispensed:
                              {" "}
                              {
                                line.dispensedQuantity
                              }
                            </span>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Return Quantity
                              </span>

                              <input
                                className={[
                                  wonFlowInputClassName,
                                  "mt-1.5",
                                ].join(" ")}
                                max={
                                  line.maximumReturnableQuantity
                                }
                                min={0}
                                onChange={(
                                  event,
                                ) => {
                                  const value =
                                    Number(
                                      event.target.value,
                                    );

                                  updateReturnLine(
                                    line.id,
                                    {
                                      returnQuantity:
                                        Number.isFinite(
                                          value,
                                        )
                                          ? Math.max(
                                              0,
                                              Math.floor(
                                                value,
                                              ),
                                            )
                                          : 0,
                                    },
                                  );
                                }}
                                type="number"
                                value={
                                  line.returnQuantity
                                }
                              />
                            </label>

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Package Condition
                              </span>

                              <select
                                className={[
                                  wonFlowInputClassName,
                                  "mt-1.5",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  updateReturnLine(
                                    line.id,
                                    {
                                      packageCondition:
                                        event.target
                                          .value as
                                          DemoPharmacyPackageCondition,
                                    },
                                  );
                                }}
                                value={
                                  line.packageCondition
                                }
                              >
                                <option value="sealed">
                                  Sealed
                                </option>

                                <option value="opened">
                                  Opened
                                </option>

                                <option value="damaged">
                                  Damaged
                                </option>

                                <option value="expired">
                                  Expired
                                </option>
                              </select>
                            </label>

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Disposition
                              </span>

                              <select
                                className={[
                                  wonFlowInputClassName,
                                  "mt-1.5",
                                ].join(" ")}
                                onChange={(
                                  event,
                                ) => {
                                  updateReturnLine(
                                    line.id,
                                    {
                                      disposition:
                                        event.target
                                          .value as
                                          DemoPharmacyReturnDisposition,
                                    },
                                  );
                                }}
                                value={
                                  line.disposition
                                }
                              >
                                <option value="quarantine">
                                  Quarantine
                                </option>

                                <option value="restock">
                                  Return to Stock
                                </option>

                                <option value="destroy">
                                  Destroy
                                </option>
                              </select>
                            </label>

                            <label>
                              <span className="text-xs font-bold text-slate-600">
                                Refund Value
                              </span>

                              <input
                                className={[
                                  wonFlowInputClassName,
                                  "mt-1.5",
                                ].join(" ")}
                                disabled
                                value={formatCurrency(
                                  line.returnQuantity *
                                    line.unitPrice,
                                )}
                              />
                            </label>
                          </div>

                          <label className="mt-4 block">
                            <span className="text-xs font-bold text-slate-600">
                              Return Reason
                            </span>

                            <textarea
                              className={[
                                wonFlowTextareaClassName,
                                "mt-1.5 min-h-20",
                              ].join(" ")}
                              onChange={(
                                event,
                              ) => {
                                updateReturnLine(
                                  line.id,
                                  {
                                    reason:
                                      event.target.value,
                                  },
                                );
                              }}
                              placeholder="Wrong medicine, adverse reaction, treatment changed or another reason"
                              value={
                                line.reason
                              }
                            />
                          </label>
                        </article>
                      ),
                    )}
                  </div>
                </WonFlowOperationalPanel>

                <WonFlowOperationalPanel
                  description="Record the receiving staff member and whether financial refund coordination is required."
                  title="Return Confirmation"
                  tone="emerald"
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        Return Received By
                      </span>

                      <input
                        className={[
                          wonFlowInputClassName,
                          "mt-1.5",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          updateReturnCase({
                            receivedBy:
                              event.target.value,
                          });
                        }}
                        placeholder="Pharmacy staff member"
                        value={
                          activeReturnCase
                            .receivedBy
                        }
                      />
                    </label>

                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        General Return Note
                      </span>

                      <textarea
                        className={[
                          wonFlowTextareaClassName,
                          "mt-1.5 min-h-24",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          updateReturnCase({
                            returnNote:
                              event.target.value,
                          });
                        }}
                        value={
                          activeReturnCase
                            .returnNote
                        }
                      />
                    </label>
                  </div>

                  <label className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <input
                      checked={
                        activeReturnCase
                          .refundRequested
                      }
                      className="mt-1 h-4 w-4"
                      onChange={(
                        event,
                      ) => {
                        updateReturnCase({
                          refundRequested:
                            event.target.checked,

                          refundStatus:
                            event.target.checked
                              ? "pending-cashier"
                              : "not-requested",
                        });
                      }}
                      type="checkbox"
                    />

                    <span>
                      <span className="block text-sm font-black text-amber-900">
                        Patient refund coordination required
                      </span>

                      <span className="mt-1 block text-xs text-amber-700">
                        Refund value:
                        {" "}
                        {formatCurrency(
                          returnTotal,
                        )}
                      </span>
                    </span>
                  </label>
                </WonFlowOperationalPanel>
              </fieldset>

              {activeReturnCase.status ===
              "submitted" ? (
                <WonFlowOperationalPanel
                  description="Approve the return or record the reason it cannot be accepted."
                  title="Pharmacy Approval"
                  tone="violet"
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setApproverName(
                          event.target.value,
                        );
                      }}
                      placeholder="Approving pharmacy staff member"
                      value={
                        approverName
                      }
                    />

                    <textarea
                      className={
                        wonFlowTextareaClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setApprovalNote(
                          event.target.value,
                        );
                      }}
                      placeholder="Approval note or rejection reason"
                      value={
                        approvalNote
                      }
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <WonFlowActionButton
                      onClick={
                        rejectReturn
                      }
                      variant="danger"
                    >
                      Reject Return
                    </WonFlowActionButton>

                    <WonFlowActionButton
                      onClick={
                        approveReturn
                      }
                      variant="primary"
                    >
                      Approve Return
                    </WonFlowActionButton>
                  </div>
                </WonFlowOperationalPanel>
              ) : null}

              {activeReturnCase.status ===
                "completed" &&
              activeReturnCase
                .refundStatus ===
                "pending-cashier" ? (
                <WonFlowOperationalPanel
                  description="The medicine return is complete. Billing must approve and process the financial reversal."
                  icon={<BadgeDollarSign size={18} />}
                  title="Refund Waiting for Billing"
                  tone="amber"
                >
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-amber-700">
                      Refund Amount
                    </div>
                    <div className="mt-2 text-2xl font-black text-amber-950">
                      {formatCurrency(activeReturnCase.refundAmount)}
                    </div>
                  </div>
                  <Link
                    className="wf-button-primary mt-4"
                    href={`/operations/billing/refunds?returnId=${encodeURIComponent(activeReturnCase.id)}`}
                  >
                    Open Billing Refund
                  </Link>
                </WonFlowOperationalPanel>
              ) : null}

              {activeReturnCase.status ===
              "completed" ? (
                <section className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle2
                      className="text-emerald-700"
                      size={24}
                    />

                    <div>
                      <h2 className="text-xl font-black text-emerald-950">
                        Medicine return completed
                      </h2>

                      <p className="mt-2 text-sm text-emerald-700">
                        Eligible sealed medicines were returned to available stock. Other medicines remain quarantined or marked for destruction.
                      </p>

                      <Link
                        className="wf-button-secondary mt-4"
                        href={`/operations/patients/${encodeURIComponent(
                          selectedPatient.id,
                        )}/medicines`}
                      >
                        Patient Medicine History
                      </Link>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeReturnCase.status ===
              "draft" ? (
                <div className="wf-sticky-actions flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      Medicine return draft
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Verify quantities, packaging and disposition before submission.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <WonFlowActionButton
                      onClick={saveDraft}
                      variant="secondary"
                    >
                      Save Draft
                    </WonFlowActionButton>

                    <WonFlowActionButton
                      onClick={
                        submitReturn
                      }
                      variant="primary"
                    >
                      Submit for Approval
                    </WonFlowActionButton>
                  </div>
                </div>
              ) : null}

              {activeReturnCase.status ===
              "approved" ? (
                <div className="wf-sticky-actions flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      Return approved
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Completing the return may restore eligible medicine to available stock.
                    </div>
                  </div>

                  <WonFlowActionButton
                    onClick={
                      completeReturn
                    }
                    variant="primary"
                  >
                    Complete Return
                  </WonFlowActionButton>
                </div>
              ) : null}
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

interface PharmacyReturnWorklistProps {
  initialDispensingCaseId?: string;
}

export function PharmacyReturnWorklist({
  initialDispensingCaseId,
}: PharmacyReturnWorklistProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "pharmacy-returns:directories",

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
      emptyTitle="Medicine returns unavailable"
      loadingDescription="WonFlow is preparing dispensing and return information."
      loadingTitle="Preparing medicine returns"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <PharmacyReturnContent
          branches={
            directory.branches
          }
          initialDispensingCaseId={
            initialDispensingCaseId
          }
          practitioners={
            directory.practitioners
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}
