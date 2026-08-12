"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  History,
  Pill,
  RotateCcw,
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
  WonFlowErrorState,
} from "@/components/feedback";

import {
  WonFlowKpiCard,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  getDemoPharmacyCompletedReturnedQuantity,
  getDemoPharmacyReturnsForPatient,
  readDemoPharmacyDispensingCases,
  readDemoPharmacyStock,
} from "@/lib/pharmacy";

import type {
  DemoPharmacyDispensingCase,
  DemoPharmacyReturnCase,
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

interface PatientMedicineHistoryContentProps {
  patientId: string;

  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function PatientMedicineHistoryContent({
  patientId,
  branches,
  practitioners,
}: PatientMedicineHistoryContentProps) {
  const [
    patient,
    setPatient,
  ] = useState<
    DemoPatientRegistrationResult |
    undefined
  >();

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
    stock,
    setStock,
  ] = useState<
    DemoPharmacyStockItem[]
  >([]);

  const [
    selectedCaseId,
    setSelectedCaseId,
  ] = useState("");

  const reloadHistory =
    useCallback(() => {
      setPatient(
        readDemoPatientRegistrations()
          .find(
            (record) =>
              record.id ===
              patientId,
          ),
      );

      setDispensingCases(
        readDemoPharmacyDispensingCases()
          .filter(
            (dispensingCase) =>
              dispensingCase.patientId ===
              patientId,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.dispensedAt ||
                  right.createdAt,
              ).getTime() -
              new Date(
                left.dispensedAt ||
                  left.createdAt,
              ).getTime(),
          ),
      );

      setReturnCases(
        getDemoPharmacyReturnsForPatient(
          patientId,
        ),
      );

      setStock(
        readDemoPharmacyStock(),
      );
    }, [patientId]);

  useEffect(() => {
    queueMicrotask(
      reloadHistory,
    );

    const eventNames = [
      "wonflow:demo-pharmacy-cases-changed",
      "wonflow:demo-pharmacy-returns-changed",
      "wonflow:demo-pharmacy-stock-changed",
      "storage",
    ];

    eventNames.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          reloadHistory,
        );
      },
    );

    return () => {
      eventNames.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            reloadHistory,
          );
        },
      );
    };
  }, [reloadHistory]);

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

  const stockById =
    useMemo(
      () =>
        new Map(
          stock.map(
            (item) => [
              item.id,
              item,
            ],
          ),
        ),
      [stock],
    );

  const selectedCase =
    dispensingCases.find(
      (dispensingCase) =>
        dispensingCase.id ===
        selectedCaseId,
    ) ??
    dispensingCases[0];

  const selectedReturns =
    selectedCase ===
    undefined
      ? []
      : returnCases.filter(
          (returnCase) =>
            returnCase
              .sourceDispensingCaseId ===
            selectedCase.id,
        );

  const statistics =
    useMemo(
      () => ({
        prescriptions:
          dispensingCases.length,

        dispensedUnits:
          dispensingCases.reduce(
            (
              total,
              dispensingCase,
            ) =>
              total +
              dispensingCase.lines.reduce(
                (
                  lineTotal,
                  line,
                ) =>
                  lineTotal +
                  line
                    .dispensedQuantity,

                0,
              ),

            0,
          ),

        returnedUnits:
          returnCases
            .filter(
              (returnCase) =>
                returnCase.status ===
                "completed",
            )
            .reduce(
              (
                total,
                returnCase,
              ) =>
                total +
                returnCase.lines.reduce(
                  (
                    lineTotal,
                    line,
                  ) =>
                    lineTotal +
                    line.returnQuantity,

                  0,
                ),

              0,
            ),

        pendingRefunds:
          returnCases.filter(
            (returnCase) =>
              returnCase
                .refundStatus ===
              "pending-cashier",
          ).length,
      }),
      [
        dispensingCases,
        returnCases,
      ],
    );

  if (
    patient === undefined
  ) {
    return (
      <WonFlowErrorState
        description="The requested patient record could not be found."
        title="Patient not found"
      />
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href={`/operations/patients/${encodeURIComponent(
                patient.id,
              )}/results`}
            >
              Laboratory Results
            </Link>

            <Link
              className="wf-button-secondary"
              href={`/operations/patients/${encodeURIComponent(
                patient.id,
              )}/imaging`}
            >
              Imaging Timeline
            </Link>

            <Link
              className="wf-button-secondary"
              href="/operations/patients"
            >
              Patient Directory
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
              "Patient Directory",
            href:
              "/operations/patients",
          },
          {
            label:
              "Medicine History",
          },
        ]}
        description="Review prescriptions, dispensed medicines, returned quantities and refund coordination."
        eyebrow="Patient Medical Record"
        leading={
          <History size={20} />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              {patient.mrNumber}
            </span>

            <span>
              {
                patient.draft
                  .cnicNumber
              }
            </span>
          </>
        }
        title={`${patient.displayName} — Medicine History`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WonFlowKpiCard
          helperText="Pharmacy dispensing records"
          label="Prescriptions"
          tone="blue"
          value={
            statistics.prescriptions
          }
        />

        <WonFlowKpiCard
          helperText="Total medicine units supplied"
          label="Dispensed Units"
          tone="emerald"
          value={
            statistics.dispensedUnits
          }
        />

        <WonFlowKpiCard
          helperText="Units accepted through completed returns"
          label="Returned Units"
          tone="violet"
          value={
            statistics.returnedUnits
          }
        />

        <WonFlowKpiCard
          helperText="Returns waiting for cashier action"
          label="Pending Refunds"
          tone="amber"
          value={
            statistics.pendingRefunds
          }
        />
      </div>

      {dispensingCases.length ===
      0 ? (
        <WonFlowOperationalPanel
          description="No pharmacy dispensing record exists for this patient."
          title="Medicine History"
          tone="slate"
        >
          <WonFlowEmptyState
            description="Dispensed prescriptions will appear here."
            title="No medicine history"
          />
        </WonFlowOperationalPanel>
      ) : (
        <div className="wf-workspace-rail">
          <div className="wf-workspace-rail-side">
            <WonFlowOperationalPanel
              description="Newest pharmacy transactions appear first."
              title="Prescription Timeline"
              tone="blue"
            >
              <div className="space-y-3">
                {dispensingCases.map(
                  (dispensingCase) => {
                    const selected =
                      selectedCase?.id ===
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
                          setSelectedCaseId(
                            dispensingCase.id,
                          );
                        }}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-slate-950">
                              {
                                dispensingCase
                                  .prescriptionNumber
                              }
                            </div>

                            <div className="mt-1 text-xs font-bold text-blue-700">
                              {
                                dispensingCase
                                  .receiptNumber ||
                                "No receipt"
                              }
                            </div>
                          </div>

                          <span className="wf-status wf-status-neutral">
                            {humanizeValue(
                              dispensingCase.status,
                            )}
                          </span>
                        </div>

                        <div className="mt-3 text-[11px] text-slate-500">
                          {formatWonFlowDashboardDateTime(
                            dispensingCase
                              .dispensedAt ||
                              dispensingCase
                                .createdAt,
                          )}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </WonFlowOperationalPanel>
          </div>

          <div className="wf-workspace-rail-main">
            {selectedCase ===
            undefined ? null : (
              <div className="space-y-6">
                <WonFlowOperationalPanel
                  description={`${practitionersById.get(
                    selectedCase
                      .practitionerId,
                  )?.displayName ?? "Unknown doctor"} · ${branchesById.get(
                    selectedCase.branchId,
                  )?.name ?? "Unknown branch"}`}
                  status={
                    selectedCase
                      .receiptNumber ? (
                      <Link
                        className="wf-button-secondary"
                        href={`/operations/pharmacy/receipts/${encodeURIComponent(
                          selectedCase.id,
                        )}`}
                      >
                        Print Receipt
                      </Link>
                    ) : undefined
                  }
                  title={
                    selectedCase
                      .prescriptionNumber
                  }
                  tone="blue"
                >
                  <div className="wf-content-scroll">
                    <table className="w-full min-w-[900px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-3">
                            Medicine
                          </th>

                          <th className="px-3 py-3">
                            Instructions
                          </th>

                          <th className="px-3 py-3 text-right">
                            Dispensed
                          </th>

                          <th className="px-3 py-3 text-right">
                            Returned
                          </th>

                          <th className="px-3 py-3 text-right">
                            Remaining
                          </th>

                          <th className="px-3 py-3 text-right">
                            Value
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedCase.lines.map(
                          (line) => {
                            const stockItem =
                              stockById.get(
                                line.selectedStockItemId,
                              );

                            const returnedQuantity =
                              getDemoPharmacyCompletedReturnedQuantity(
                                selectedCase.id,
                                line.id,
                              );

                            const remainingQuantity =
                              Math.max(
                                0,

                                line.dispensedQuantity -
                                  returnedQuantity,
                              );

                            return (
                              <tr
                                className="border-b border-slate-100 last:border-0"
                                key={line.id}
                              >
                                <td className="px-3 py-3">
                                  <div className="font-black text-slate-900">
                                    {stockItem
                                      ?.brandName ??
                                      line.medicineName}
                                  </div>

                                  <div className="mt-1 text-xs text-slate-500">
                                    {stockItem
                                      ?.genericName ??
                                      line.medicineName}
                                    {" · "}
                                    {stockItem
                                      ?.strength ??
                                      line.strength}
                                  </div>
                                </td>

                                <td className="px-3 py-3 text-xs">
                                  {[
                                    line.dose,
                                    line.frequency,
                                    line.duration,
                                  ]
                                    .filter(
                                      Boolean,
                                    )
                                    .join(" · ") ||
                                    line.instructions ||
                                    "As directed"}
                                </td>

                                <td className="px-3 py-3 text-right font-black">
                                  {
                                    line.dispensedQuantity
                                  }
                                </td>

                                <td className="px-3 py-3 text-right font-black text-violet-700">
                                  {
                                    returnedQuantity
                                  }
                                </td>

                                <td className="px-3 py-3 text-right font-black text-blue-700">
                                  {
                                    remainingQuantity
                                  }
                                </td>

                                <td className="px-3 py-3 text-right font-bold">
                                  {formatCurrency(
                                    line.dispensedQuantity *
                                      (
                                        stockItem
                                          ?.unitPrice ??
                                        0
                                      ),
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      className="wf-button-primary"
                      href={`/operations/pharmacy/returns?caseId=${encodeURIComponent(
                        selectedCase.id,
                      )}`}
                    >
                      <RotateCcw
                        size={16}
                      />
                      Start Medicine Return
                    </Link>
                  </div>
                </WonFlowOperationalPanel>

                <WonFlowOperationalPanel
                  description="Returns associated with the selected dispensing transaction."
                  title="Return History"
                  tone="violet"
                >
                  {selectedReturns.length ===
                  0 ? (
                    <WonFlowEmptyState
                      description="No medicine return exists for this dispensing transaction."
                      title="No returns recorded"
                    />
                  ) : (
                    <div className="space-y-3">
                      {selectedReturns.map(
                        (returnCase) => (
                          <article
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                            key={
                              returnCase.id
                            }
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="font-black text-slate-950">
                                  {
                                    returnCase.returnNumber
                                  }
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  {formatWonFlowDashboardDateTime(
                                    returnCase.completedAt ||
                                      returnCase.updatedAt,
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <span className="wf-status wf-status-neutral">
                                  {humanizeValue(
                                    returnCase.status,
                                  )}
                                </span>

                                <span className="wf-status wf-status-neutral">
                                  Refund:
                                  {" "}
                                  {humanizeValue(
                                    returnCase.refundStatus,
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {returnCase.lines
                                .filter(
                                  (line) =>
                                    line.returnQuantity >
                                    0,
                                )
                                .map(
                                  (line) => (
                                    <div
                                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                                      key={
                                        line.id
                                      }
                                    >
                                      <div className="text-xs font-black text-slate-900">
                                        {
                                          line.stockDisplayName
                                        }
                                      </div>

                                      <div className="mt-2 text-[11px] text-slate-500">
                                        Returned:
                                        {" "}
                                        {
                                          line.returnQuantity
                                        }
                                      </div>

                                      <div className="mt-1 text-[11px] text-slate-500">
                                        {humanizeValue(
                                          line.disposition,
                                        )}
                                      </div>
                                    </div>
                                  ),
                                )}
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </WonFlowOperationalPanel>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PatientMedicineHistoryProps {
  patientId: string;
}

export function PatientMedicineHistory({
  patientId,
}: PatientMedicineHistoryProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        `patient-medicine-history:${patientId}`,

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
      emptyTitle="Medicine history unavailable"
      loadingDescription="WonFlow is preparing the patient’s dispensing and return history."
      loadingTitle="Preparing medicine history"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <PatientMedicineHistoryContent
          branches={
            directory.branches
          }
          patientId={patientId}
          practitioners={
            directory.practitioners
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}