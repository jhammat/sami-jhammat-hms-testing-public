"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Printer,
} from "lucide-react";

import type {
  MockBranch,
  MockPractitioner,
} from "@wonflow/mock-data";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";

import {
  WonFlowBrandMark,
} from "@/components/design";

import {
  WonFlowAsyncDataBoundary,
  WonFlowErrorState,
} from "@/components/feedback";

import {
  WonFlowActionButton,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  calculateDemoPharmacyCaseTotal,
  readDemoPharmacyDispensingCases,
  readDemoPharmacyStock,
} from "@/lib/pharmacy";

import type {
  DemoPharmacyDispensingCase,
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

interface PrintablePharmacyReceiptContentProps {
  caseId: string;

  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function PrintablePharmacyReceiptContent({
  caseId,
  branches,
  practitioners,
}: PrintablePharmacyReceiptContentProps) {
  const [
    dispensingCase,
    setDispensingCase,
  ] = useState<
    DemoPharmacyDispensingCase |
    undefined
  >();

  const [
    patient,
    setPatient,
  ] = useState<
    DemoPatientRegistrationResult |
    undefined
  >();

  const [
    stock,
    setStock,
  ] = useState<
    DemoPharmacyStockItem[]
  >([]);

  const loadReceipt =
    useCallback(() => {
      const currentCase =
        readDemoPharmacyDispensingCases()
          .find(
            (record) =>
              record.id ===
              caseId,
          );

      setDispensingCase(
        currentCase,
      );

      setStock(
        readDemoPharmacyStock(),
      );

      setPatient(
        currentCase ===
        undefined
          ? undefined
          : readDemoPatientRegistrations()
              .find(
                (record) =>
                  record.id ===
                  currentCase
                    .patientId,
              ),
      );
    }, [caseId]);

  useEffect(() => {
    queueMicrotask(
      loadReceipt,
    );
  }, [loadReceipt]);

  if (
    dispensingCase ===
      undefined ||
    patient === undefined ||
    dispensingCase
      .receiptNumber ===
      ""
  ) {
    return (
      <WonFlowErrorState
        description="The completed pharmacy-dispensing receipt could not be loaded."
        title="Dispensing receipt unavailable"
      />
    );
  }

  const practitioner =
    practitioners.find(
      (record) =>
        record.id ===
        dispensingCase
          .practitionerId,
    );

  const branch =
    branches.find(
      (record) =>
        record.id ===
        dispensingCase.branchId,
    );

  const total =
    calculateDemoPharmacyCaseTotal(
      dispensingCase,
      stock,
    );

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <Link
            className="wf-button-secondary"
            href="/operations/pharmacy"
          >
            Return to Pharmacy
          </Link>

          <Link
            className="wf-button-secondary"
            href={`/operations/pharmacy/returns?caseId=${encodeURIComponent(
              dispensingCase.id,
            )}`}
          >
            Start Medicine Return
          </Link>

          <Link
            className="wf-button-secondary"
            href={`/operations/patients/${encodeURIComponent(
              patient.id,
            )}/medicines`}
          >
            Patient Medicine History
          </Link>
        </div>

        <WonFlowActionButton
          icon={
            <Printer size={17} />
          }
          onClick={() => {
            window.print();
          }}
          variant="primary"
        >
          Print Dispensing Receipt
        </WonFlowActionButton>
      </div>

      <article className="wf-print-report mx-auto max-w-[850px] bg-white p-8 text-slate-950 shadow-sm print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-blue-700 pb-5">
          <div className="flex items-center gap-4">
            <WonFlowBrandMark
              size={52}
            />

            <div>
              <h1 className="text-xl font-black tracking-[-0.04em]">
                WonFlow Central Demo Hospital
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Pharmacy Dispensing Receipt
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Receipt
            </div>

            <div className="mt-1 font-mono text-sm font-bold">
              {
                dispensingCase
                  .receiptNumber
              }
            </div>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 rounded-xl border border-slate-200 p-5 text-sm lg:grid-cols-4">
          <ReceiptField
            label="Patient"
            value={
              patient.displayName
            }
          />

          <ReceiptField
            label="MR Number"
            value={patient.mrNumber}
          />

          <ReceiptField
            label="CNIC / B-Form"
            value={
              patient.draft
                .cnicNumber
            }
          />

          <ReceiptField
            label="Prescription"
            value={
              dispensingCase
                .prescriptionNumber
            }
          />

          <ReceiptField
            label="Prescribing Doctor"
            value={
              practitioner
                ?.displayName ??
              "Unknown doctor"
            }
          />

          <ReceiptField
            label="Branch"
            value={
              branch?.name ??
              "Unknown branch"
            }
          />

          <ReceiptField
            label="Dispensed By"
            value={
              dispensingCase
                .pharmacistName
            }
          />

          <ReceiptField
            label="Dispensed"
            value={formatWonFlowDashboardDateTime(
              dispensingCase
                .dispensedAt,
            )}
          />
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Dispensed Medicines
          </h2>

          <table className="mt-3 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100">
                <th className="px-3 py-3">
                  Medicine
                </th>

                <th className="px-3 py-3">
                  Instructions
                </th>

                <th className="px-3 py-3 text-right">
                  Quantity
                </th>

                <th className="px-3 py-3 text-right">
                  Unit Price
                </th>

                <th className="px-3 py-3 text-right">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {dispensingCase
                .lines
                .filter(
                  (line) =>
                    line
                      .dispensedQuantity >
                    0,
                )
                .map(
                  (line) => {
                    const stockItem =
                      stock.find(
                        (item) =>
                          item.id ===
                          line
                            .selectedStockItemId,
                      );

                    const amount =
                      line
                        .dispensedQuantity *
                      (
                        stockItem
                          ?.unitPrice ??
                        0
                      );

                    return (
                      <tr
                        className="border-b border-slate-200"
                        key={line.id}
                      >
                        <td className="px-3 py-3">
                          <div className="font-bold">
                            {stockItem
                              ?.brandName ??
                              line
                                .medicineName}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-500">
                            {stockItem
                              ?.genericName ??
                              line
                                .medicineName}
                            {" · "}
                            {stockItem
                              ?.strength ??
                              line.strength}
                          </div>
                        </td>

                        <td className="px-3 py-3">
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

                        <td className="px-3 py-3 text-right font-bold">
                          {
                            line
                              .dispensedQuantity
                          }
                        </td>

                        <td className="px-3 py-3 text-right">
                          {formatCurrency(
                            stockItem
                              ?.unitPrice ??
                              0,
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-bold">
                          {formatCurrency(
                            amount,
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-slate-800">
                <td
                  className="px-3 py-4 text-right text-sm font-black"
                  colSpan={4}
                >
                  Total
                </td>

                <td className="px-3 py-4 text-right text-sm font-black">
                  {formatCurrency(
                    total,
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {dispensingCase
          .dispensingNotes !==
        "" ? (
          <section className="mt-6 rounded-xl border border-slate-200 p-4">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Pharmacy Notes
            </div>

            <p className="mt-2 text-sm leading-6">
              {
                dispensingCase
                  .dispensingNotes
              }
            </p>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-slate-300 pt-5 text-center text-[10px] leading-5 text-slate-500">
          Demonstration pharmacy receipt only. Medicines must be checked and supplied by authorized pharmacy personnel.
        </footer>
      </article>
    </div>
  );
}

function ReceiptField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value || "Not recorded"}
      </div>
    </div>
  );
}

interface PrintablePharmacyReceiptProps {
  caseId: string;
}

export function PrintablePharmacyReceipt({
  caseId,
}: PrintablePharmacyReceiptProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        `pharmacy-receipt:${caseId}`,

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
      emptyTitle="Pharmacy receipt unavailable"
      loadingDescription="WonFlow is preparing the pharmacy-dispensing receipt."
      loadingTitle="Preparing pharmacy receipt"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <PrintablePharmacyReceiptContent
          branches={
            directory.branches
          }
          caseId={caseId}
          practitioners={
            directory.practitioners
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}
