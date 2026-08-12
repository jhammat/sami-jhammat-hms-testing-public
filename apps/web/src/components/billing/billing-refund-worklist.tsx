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
  Clock3,
  ReceiptText,
  Search,
} from "lucide-react";

import type {
  MockBranch,
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
  approveDemoBillingRefundRequest,
  processDemoBillingRefundRequest,
  readDemoBillingRefundRequests,
  rejectDemoBillingRefundRequest,
  startDemoBillingRefundReview,
  synchronizePendingPharmacyRefundRequests,
} from "@/lib/billing";

import type {
  DemoBillingRefundMethod,
  DemoBillingRefundRequest,
  DemoBillingRefundStatus,
} from "@/lib/billing";

import {
  readDemoPharmacyReturnCases,
} from "@/lib/pharmacy";

import type {
  DemoPharmacyReturnCase,
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

type RefundStatusFilter =
  | "all"
  | DemoBillingRefundStatus;

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

function getStatusClassName(
  status:
    DemoBillingRefundStatus,
): string {
  switch (status) {
    case "requested":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "under-review":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "approved":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "processed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

interface BillingRefundContentProps {
  branches:
    readonly MockBranch[];

  initialReturnId?: string;
}

function BillingRefundContent({
  branches,
  initialReturnId,
}: BillingRefundContentProps) {
  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    returnCases,
    setReturnCases,
  ] = useState<
    DemoPharmacyReturnCase[]
  >([]);

  const [
    refundRequests,
    setRefundRequests,
  ] = useState<
    DemoBillingRefundRequest[]
  >([]);

  const [
    selectedRefundId,
    setSelectedRefundId,
  ] = useState("");

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    RefundStatusFilter
  >("all");

  const [
    reviewerName,
    setReviewerName,
  ] = useState("");

  const [
    reviewNote,
    setReviewNote,
  ] = useState("");

  const [
    refundMethod,
    setRefundMethod,
  ] = useState<
    DemoBillingRefundMethod
  >("cash");

  const [
    processedBy,
    setProcessedBy,
  ] = useState("");

  const [
    transactionReference,
    setTransactionReference,
  ] = useState("");

  const [
    processingNote,
    setProcessingNote,
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
      synchronizePendingPharmacyRefundRequests();

      const loadedRequests =
        readDemoBillingRefundRequests();

      setPatients(
        readDemoPatientRegistrations(),
      );

      setReturnCases(
        readDemoPharmacyReturnCases(),
      );

      setRefundRequests(
        loadedRequests,
      );

      if (
        initialReturnId !==
        undefined
      ) {
        const requestedRefund =
          loadedRequests.find(
            (request) =>
              request
                .sourceReturnCaseId ===
              initialReturnId,
          );

        if (
          requestedRefund !==
          undefined
        ) {
          setSelectedRefundId(
            (currentValue) =>
              currentValue ||
              requestedRefund.id,
          );
        }
      }
    }, [initialReturnId]);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    const eventNames = [
      "wonflow:demo-billing-refunds-changed",
      "wonflow:demo-pharmacy-returns-changed",
      "wonflow:demo-patients-changed",
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

  const returnCasesById =
    useMemo(
      () =>
        new Map(
          returnCases.map(
            (returnCase) => [
              returnCase.id,
              returnCase,
            ],
          ),
        ),
      [returnCases],
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

  const visibleRequests =
    useMemo(
      () =>
        refundRequests
          .filter(
            (request) => {
              if (
                statusFilter !==
                  "all" &&
                request.status !==
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
                  request.patientId,
                );

              return [
                request.refundNumber,
                request
                  .creditNoteNumber,
                request
                  .sourceReturnNumber,
                request
                  .sourceInvoiceNumber,
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
                request.status,
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
        refundRequests,
        statusFilter,
      ],
    );

  const selectedRequest =
    refundRequests.find(
      (request) =>
        request.id ===
        selectedRefundId,
    ) ??
    visibleRequests[0];

  const selectedReturn =
    selectedRequest ===
    undefined
      ? undefined
      : returnCasesById.get(
          selectedRequest
            .sourceReturnCaseId,
        );

  const selectedPatient =
    selectedRequest ===
    undefined
      ? undefined
      : patientsById.get(
          selectedRequest.patientId,
        );

  const selectedBranch =
    selectedRequest ===
    undefined
      ? undefined
      : branchesById.get(
          selectedRequest.branchId,
        );

  const statistics =
    useMemo(
      () => ({
        requested:
          refundRequests.filter(
            (request) =>
              request.status ===
              "requested",
          ).length,

        underReview:
          refundRequests.filter(
            (request) =>
              request.status ===
              "under-review",
          ).length,

        approved:
          refundRequests.filter(
            (request) =>
              request.status ===
              "approved",
          ).length,

        processed:
          refundRequests.filter(
            (request) =>
              request.status ===
              "processed",
          ).length,
      }),
      [refundRequests],
    );

  function selectRefund(
    refundId: string,
  ) {
    const request =
      refundRequests.find(
        (record) =>
          record.id ===
          refundId,
      );

    setSelectedRefundId(
      refundId,
    );

    setReviewerName(
      request?.reviewedBy ??
        "",
    );

    setReviewNote(
      request?.reviewNote ??
        "",
    );

    setRefundMethod(
      request?.refundMethod ??
        "cash",
    );

    setProcessedBy(
      request?.processedBy ??
        "",
    );

    setTransactionReference(
      request
        ?.transactionReference ??
        "",
    );

    setProcessingNote(
      request?.processingNote ??
        "",
    );

    setActionMessage(
      undefined,
    );
  }

  function synchronizeRefunds() {
    const createdRequests =
      synchronizePendingPharmacyRefundRequests();

    reloadLocalData();

    setActionMessage(
      createdRequests.length ===
      0
        ? "No new pharmacy refunds were waiting for billing."
        : `${createdRequests.length} refund request${createdRequests.length === 1 ? "" : "s"} synchronized.`,
    );
  }

  function startReview() {
    if (
      selectedRequest ===
      undefined
    ) {
      return;
    }

    const updatedRequest =
      startDemoBillingRefundReview(
        selectedRequest.id,
        reviewerName,
      );

    if (
      updatedRequest ===
      undefined
    ) {
      setActionMessage(
        "Enter the cashier or billing staff member reviewing this refund.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      "Refund review started.",
    );
  }

  function approveRefund() {
    if (
      selectedRequest ===
      undefined
    ) {
      return;
    }

    const updatedRequest =
      approveDemoBillingRefundRequest(
        selectedRequest.id,
        reviewerName,
        reviewNote,
      );

    if (
      updatedRequest ===
      undefined
    ) {
      setActionMessage(
        "The refund must be under review and have a valid reviewer.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      "Refund request approved.",
    );
  }

  function rejectRefund() {
    if (
      selectedRequest ===
      undefined
    ) {
      return;
    }

    const updatedRequest =
      rejectDemoBillingRefundRequest(
        selectedRequest.id,
        reviewerName,
        reviewNote,
      );

    if (
      updatedRequest ===
      undefined
    ) {
      setActionMessage(
        "Enter the reviewing staff member and a clear rejection reason.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      "Refund request rejected.",
    );
  }

  async function processRefund() {
    if (
      selectedRequest ===
      undefined
    ) {
      return;
    }

    const confirmed =
      await wonflowConfirm({
        title: "Process refund",
        message: `${formatCurrency(selectedRequest.amount)} is refunded to the patient and recorded against the invoice.`,
        confirmLabel: "Process refund",
      });

    if (!confirmed) {
      return;
    }

    const processedRequest =
      processDemoBillingRefundRequest({
        requestId:
          selectedRequest.id,

        refundMethod,

        processedBy,

        transactionReference,

        processingNote,
      });

    if (
      processedRequest ===
      undefined
    ) {
      setActionMessage(
        "Enter the responsible cashier and payment-reversal transaction reference.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      `${processedRequest.creditNoteNumber} generated. Refund processed successfully.`,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href="/operations/pharmacy/returns"
            >
              Pharmacy Returns
            </Link>

            <Link
              className="wf-button-secondary"
              href="/operations/billing/new"
            >
              Billing Counter
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
            label: "Billing",
            href:
              "/operations/billing/new",
          },
          {
            label:
              "Refunds and Credit Notes",
          },
        ]}
        description="Review refund requests, reverse payments and issue controlled credit notes."
        eyebrow="Billing and Cashier"
        leading={
          <BadgeDollarSign
            size={20}
          />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              Fictional financial data
            </span>

            <span>
              Browser-local processing
            </span>
          </>
        }
        title="Refunds and Credit Notes"
      />

      {actionMessage !==
      undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          {actionMessage}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WonFlowKpiCard
          helperText="Waiting for cashier review"
          icon={
            <Clock3 size={18} />
          }
          label="Requested"
          tone="blue"
          value={
            statistics.requested
          }
        />

        <WonFlowKpiCard
          helperText="Currently being reviewed"
          icon={
            <Search size={18} />
          }
          label="Under Review"
          tone="violet"
          value={
            statistics.underReview
          }
        />

        <WonFlowKpiCard
          helperText="Approved for payment reversal"
          icon={
            <AlertTriangle
              size={18}
            />
          }
          label="Approved"
          tone="amber"
          value={
            statistics.approved
          }
        />

        <WonFlowKpiCard
          helperText="Completed refunds and credit notes"
          icon={
            <CheckCircle2
              size={18}
            />
          }
          label="Processed"
          tone="emerald"
          value={
            statistics.processed
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
              placeholder="Search patient, MR, CNIC, refund, credit note, invoice or return"
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
                  RefundStatusFilter,
              );
            }}
            value={statusFilter}
          >
            <option value="all">
              All Refund Statuses
            </option>

            <option value="requested">
              Requested
            </option>

            <option value="under-review">
              Under Review
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="rejected">
              Rejected
            </option>

            <option value="processed">
              Processed
            </option>
          </select>

          <WonFlowActionButton
            onClick={
              synchronizeRefunds
            }
            variant="primary"
          >
            Sync Refunds
          </WonFlowActionButton>
        </div>
      </section>

      <div className="wf-workspace-rail">
        <div className="wf-workspace-rail-side">
          <WonFlowOperationalPanel
            description="Refund requests generated from completed pharmacy returns."
            status={
              <span className="wf-status wf-status-blue">
                {
                  visibleRequests.length
                }
                {" requests"}
              </span>
            }
            title="Refund Queue"
            tone="blue"
          >
            {visibleRequests.length ===
            0 ? (
              <WonFlowEmptyState
                description="Complete a pharmacy return with refund coordination, then synchronize refunds."
                title="No refund requests"
              />
            ) : (
              <div className="space-y-3">
                {visibleRequests.map(
                  (request) => {
                    const patient =
                      patientsById.get(
                        request.patientId,
                      );

                    const selected =
                      selectedRequest
                        ?.id ===
                      request.id;

                    return (
                      <button
                        className={[
                          "w-full rounded-2xl border p-4 text-left transition",
                          selected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                        ].join(" ")}
                        key={request.id}
                        onClick={() => {
                          selectRefund(
                            request.id,
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
                                request.refundNumber
                              }
                            </div>
                          </div>

                          <span
                            className={[
                              "rounded-full border px-2.5 py-1 text-[10px] font-black",
                              getStatusClassName(
                                request.status,
                              ),
                            ].join(" ")}
                          >
                            {humanizeValue(
                              request.status,
                            )}
                          </span>
                        </div>

                        <div className="mt-3 text-lg font-black text-slate-950">
                          {formatCurrency(
                            request.amount,
                          )}
                        </div>

                        <div className="mt-2 text-[11px] text-slate-500">
                          {
                            request.sourceReturnNumber
                          }
                        </div>

                        <div className="mt-1 text-[11px] text-slate-500">
                          {formatWonFlowDashboardDateTime(
                            request.createdAt,
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
          {selectedRequest ===
            undefined ||
          selectedPatient ===
            undefined ||
          selectedReturn ===
            undefined ? (
            <WonFlowOperationalPanel
              description="Select a refund request from the queue."
              title="Refund Workspace"
              tone="blue"
            >
              <WonFlowEmptyState
                description="No refund request is currently selected."
                title="Select a refund"
              />
            </WonFlowOperationalPanel>
          ) : (
            <div className="space-y-6">
              <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white">
                <div className="bg-blue-700 p-5 text-white">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">
                    Billing Refund Request
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
                      selectedRequest
                        .refundNumber
                    }
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryItem
                    label="Refund Amount"
                    value={formatCurrency(
                      selectedRequest.amount,
                    )}
                  />

                  <SummaryItem
                    label="Pharmacy Return"
                    value={
                      selectedRequest
                        .sourceReturnNumber
                    }
                  />

                  <SummaryItem
                    label="Original Invoice"
                    value={
                      selectedRequest
                        .sourceInvoiceNumber ||
                      "Not automatically matched"
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
                    label="CNIC / B-Form"
                    value={
                      selectedPatient
                        .draft
                        .cnicNumber
                    }
                  />

                  <SummaryItem
                    label="Requested By"
                    value={
                      selectedRequest
                        .requestedBy
                    }
                  />

                  <SummaryItem
                    label="Status"
                    value={humanizeValue(
                      selectedRequest.status,
                    )}
                  />

                  <SummaryItem
                    label="Created"
                    value={formatWonFlowDashboardDateTime(
                      selectedRequest.createdAt,
                    )}
                  />
                </div>
              </section>

              <Link
                className="wf-button-secondary"
                href={`/operations/patients/${encodeURIComponent(
                  selectedPatient.id,
                )}/billing`}
              >
                Patient Billing Ledger
              </Link>

              <WonFlowOperationalPanel
                description="Returned medicines used to calculate the patient refund."
                title="Refund Items"
                tone="violet"
              >
                <div className="wf-content-scroll">
                  <table className="w-full min-w-[800px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">
                          Medicine
                        </th>

                        <th className="px-3 py-3">
                          Condition
                        </th>

                        <th className="px-3 py-3">
                          Disposition
                        </th>

                        <th className="px-3 py-3 text-right">
                          Quantity
                        </th>

                        <th className="px-3 py-3 text-right">
                          Unit Value
                        </th>

                        <th className="px-3 py-3 text-right">
                          Refund Value
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedReturn.lines
                        .filter(
                          (line) =>
                            line.returnQuantity >
                            0,
                        )
                        .map(
                          (line) => (
                            <tr
                              className="border-b border-slate-100 last:border-0"
                              key={line.id}
                            >
                              <td className="px-3 py-3">
                                <div className="font-black text-slate-900">
                                  {
                                    line.stockDisplayName
                                  }
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  {
                                    line.strength
                                  }
                                </div>
                              </td>

                              <td className="px-3 py-3 text-xs font-bold">
                                {humanizeValue(
                                  line.packageCondition,
                                )}
                              </td>

                              <td className="px-3 py-3 text-xs font-bold">
                                {humanizeValue(
                                  line.disposition,
                                )}
                              </td>

                              <td className="px-3 py-3 text-right font-black">
                                {
                                  line.returnQuantity
                                }
                              </td>

                              <td className="px-3 py-3 text-right">
                                {formatCurrency(
                                  line.unitPrice,
                                )}
                              </td>

                              <td className="px-3 py-3 text-right font-black">
                                {formatCurrency(
                                  line.returnQuantity *
                                    line.unitPrice,
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                    </tbody>
                  </table>
                </div>
              </WonFlowOperationalPanel>

              {selectedRequest.status ===
              "requested" ? (
                <WonFlowOperationalPanel
                  description="Assign the refund request to a billing or cashier staff member."
                  title="Start Cashier Review"
                  tone="blue"
                >
                  <input
                    className={
                      wonFlowInputClassName
                    }
                    onChange={(
                      event,
                    ) => {
                      setReviewerName(
                        event.target.value,
                      );
                    }}
                    placeholder="Cashier or billing reviewer"
                    value={reviewerName}
                  />

                  <WonFlowActionButton
                    className="mt-4"
                    onClick={startReview}
                    variant="primary"
                  >
                    Start Review
                  </WonFlowActionButton>
                </WonFlowOperationalPanel>
              ) : null}

              {selectedRequest.status ===
              "under-review" ? (
                <WonFlowOperationalPanel
                  description="Approve the payment reversal or record why the refund cannot be issued."
                  title="Refund Decision"
                  tone="amber"
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setReviewerName(
                          event.target.value,
                        );
                      }}
                      placeholder="Reviewing billing staff"
                      value={
                        reviewerName
                      }
                    />

                    <textarea
                      className={
                        wonFlowTextareaClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setReviewNote(
                          event.target.value,
                        );
                      }}
                      placeholder="Approval note or rejection reason"
                      value={reviewNote}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <WonFlowActionButton
                      onClick={
                        rejectRefund
                      }
                      variant="danger"
                    >
                      Reject Refund
                    </WonFlowActionButton>

                    <WonFlowActionButton
                      onClick={
                        approveRefund
                      }
                      variant="primary"
                    >
                      Approve Refund
                    </WonFlowActionButton>
                  </div>
                </WonFlowOperationalPanel>
              ) : null}

              {selectedRequest.status ===
              "approved" ? (
                <WonFlowOperationalPanel
                  description="Record how the payment was reversed and the external or internal transaction reference."
                  icon={
                    <ReceiptText
                      size={18}
                    />
                  }
                  title="Process Payment Reversal"
                  tone="emerald"
                >
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
                      Approved Refund
                    </div>

                    <div className="mt-2 text-3xl font-black text-emerald-950">
                      {formatCurrency(
                        selectedRequest.amount,
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        Refund Method
                      </span>

                      <select
                        className={[
                          wonFlowInputClassName,
                          "mt-1.5",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          setRefundMethod(
                            event.target
                              .value as
                              DemoBillingRefundMethod,
                          );
                        }}
                        value={
                          refundMethod
                        }
                      >
                        <option value="cash">
                          Cash
                        </option>

                        <option value="card-reversal">
                          Card Reversal
                        </option>

                        <option value="bank-transfer">
                          Bank Transfer
                        </option>

                        <option value="account-credit">
                          Patient Account Credit
                        </option>
                      </select>
                    </label>

                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        Processed By
                      </span>

                      <input
                        className={[
                          wonFlowInputClassName,
                          "mt-1.5",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          setProcessedBy(
                            event.target.value,
                          );
                        }}
                        placeholder="Cashier or billing staff"
                        value={
                          processedBy
                        }
                      />
                    </label>

                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        Transaction Reference
                      </span>

                      <input
                        className={[
                          wonFlowInputClassName,
                          "mt-1.5",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          setTransactionReference(
                            event.target.value,
                          );
                        }}
                        placeholder="Cash voucher, card reversal or transfer reference"
                        value={
                          transactionReference
                        }
                      />
                    </label>

                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        Processing Note
                      </span>

                      <textarea
                        className={[
                          wonFlowTextareaClassName,
                          "mt-1.5 min-h-24",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          setProcessingNote(
                            event.target.value,
                          );
                        }}
                        value={
                          processingNote
                        }
                      />
                    </label>
                  </div>

                  <WonFlowActionButton
                    className="mt-4"
                    onClick={
                      processRefund
                    }
                    variant="primary"
                  >
                    Process Refund and Generate Credit Note
                  </WonFlowActionButton>
                </WonFlowOperationalPanel>
              ) : null}

              {selectedRequest.status ===
              "processed" ? (
                <section className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle2
                      className="text-emerald-700"
                      size={26}
                    />

                    <div>
                      <h2 className="text-xl font-black text-emerald-950">
                        Refund processed
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-emerald-700">
                        Credit note
                        {" "}
                        <strong>
                          {
                            selectedRequest.creditNoteNumber
                          }
                        </strong>
                        {" "}
                        has been generated for
                        {" "}
                        {formatCurrency(
                          selectedRequest.amount,
                        )}.
                      </p>

                      <Link
                        className="wf-button-primary mt-4"
                        href={`/operations/billing/refunds/${encodeURIComponent(
                          selectedRequest.id,
                        )}/receipt`}
                      >
                        Print Refund Receipt
                      </Link>
                    </div>
                  </div>
                </section>
              ) : null}

              {selectedRequest.status ===
              "rejected" ? (
                <section className="rounded-[22px] border border-rose-200 bg-rose-50 p-6">
                  <h2 className="text-xl font-black text-rose-950">
                    Refund rejected
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-rose-700">
                    {
                      selectedRequest.reviewNote ||
                      "No rejection reason was recorded."
                    }
                  </p>
                </section>
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

interface BillingRefundWorklistProps {
  initialReturnId?: string;
}

export function BillingRefundWorklist({
  initialReturnId,
}: BillingRefundWorklistProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "billing-refunds:branches",

      loader:
        (
          signal,
        ) =>
          hospitalService.listBranches(
            signal,
          ),

      isEmpty:
        (branches) =>
          branches.length === 0,
    });

  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital branch information is unavailable."
      emptyTitle="Billing refunds unavailable"
      loadingDescription="WonFlow is preparing refund requests and payment information."
      loadingTitle="Preparing billing refunds"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(branches) => (
        <BillingRefundContent
          branches={branches}
          initialReturnId={
            initialReturnId
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}
