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
  readDemoBillingRefundRequests,
} from "@/lib/billing";

import type {
  DemoBillingRefundRequest,
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

interface PrintableRefundContentProps {
  refundId: string;

  branches:
    readonly MockBranch[];
}

function PrintableRefundContent({
  refundId,
  branches,
}: PrintableRefundContentProps) {
  const [
    refund,
    setRefund,
  ] = useState<
    DemoBillingRefundRequest |
    undefined
  >();

  const [
    returnCase,
    setReturnCase,
  ] = useState<
    DemoPharmacyReturnCase |
    undefined
  >();

  const [
    patient,
    setPatient,
  ] = useState<
    DemoPatientRegistrationResult |
    undefined
  >();

  const loadReceipt =
    useCallback(() => {
      const currentRefund =
        readDemoBillingRefundRequests()
          .find(
            (record) =>
              record.id ===
              refundId,
          );

      setRefund(
        currentRefund,
      );

      if (
        currentRefund ===
        undefined
      ) {
        setReturnCase(undefined);
        setPatient(undefined);

        return;
      }

      setReturnCase(
        readDemoPharmacyReturnCases()
          .find(
            (record) =>
              record.id ===
              currentRefund
                .sourceReturnCaseId,
          ),
      );

      setPatient(
        readDemoPatientRegistrations()
          .find(
            (record) =>
              record.id ===
              currentRefund.patientId,
          ),
      );
    }, [refundId]);

  useEffect(() => {
    queueMicrotask(
      loadReceipt,
    );
  }, [loadReceipt]);

  if (
    refund === undefined ||
    returnCase ===
      undefined ||
    patient === undefined ||
    refund.status !==
      "processed"
  ) {
    return (
      <WonFlowErrorState
        description="The completed refund receipt could not be loaded."
        title="Refund receipt unavailable"
      />
    );
  }

  const branch =
    branches.find(
      (record) =>
        record.id ===
        refund.branchId,
    );

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href="/operations/billing/refunds"
        >
          Return to Billing Refunds
        </Link>

        <WonFlowActionButton
          icon={
            <Printer size={17} />
          }
          onClick={() => {
            window.print();
          }}
          variant="primary"
        >
          Print Refund Receipt
        </WonFlowActionButton>
      </div>

      <article className="wf-print-report mx-auto max-w-[900px] bg-white p-8 text-slate-950 shadow-sm print:shadow-none">
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
                Billing Refund and Credit Note
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Credit Note
            </div>

            <div className="mt-1 font-mono text-sm font-bold">
              {
                refund.creditNoteNumber
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
            label="Refund Number"
            value={
              refund.refundNumber
            }
          />

          <ReceiptField
            label="Original Invoice"
            value={
              refund.sourceInvoiceNumber ||
              "Not matched"
            }
          />

          <ReceiptField
            label="Pharmacy Return"
            value={
              refund.sourceReturnNumber
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
            label="Processed"
            value={formatWonFlowDashboardDateTime(
              refund.processedAt,
            )}
          />

          <ReceiptField
            label="Refund Method"
            value={humanizeValue(
              refund.refundMethod,
            )}
          />

          <ReceiptField
            label="Processed By"
            value={
              refund.processedBy
            }
          />

          <ReceiptField
            label="Transaction Reference"
            value={
              refund.transactionReference
            }
          />

          <ReceiptField
            label="Refund Amount"
            value={formatCurrency(
              refund.amount,
            )}
          />
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Returned Medicines
          </h2>

          <table className="mt-3 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100">
                <th className="px-3 py-3">
                  Medicine
                </th>

                <th className="px-3 py-3">
                  Condition
                </th>

                <th className="px-3 py-3 text-right">
                  Quantity
                </th>

                <th className="px-3 py-3 text-right">
                  Unit Value
                </th>

                <th className="px-3 py-3 text-right">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {returnCase.lines
                .filter(
                  (line) =>
                    line.returnQuantity >
                    0,
                )
                .map(
                  (line) => (
                    <tr
                      className="border-b border-slate-200"
                      key={line.id}
                    >
                      <td className="px-3 py-3">
                        <div className="font-bold">
                          {
                            line.stockDisplayName
                          }
                        </div>

                        <div className="mt-1 text-[10px] text-slate-500">
                          {
                            line.strength
                          }
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {humanizeValue(
                          line.packageCondition,
                        )}
                      </td>

                      <td className="px-3 py-3 text-right font-bold">
                        {
                          line.returnQuantity
                        }
                      </td>

                      <td className="px-3 py-3 text-right">
                        {formatCurrency(
                          line.unitPrice,
                        )}
                      </td>

                      <td className="px-3 py-3 text-right font-bold">
                        {formatCurrency(
                          line.returnQuantity *
                            line.unitPrice,
                        )}
                      </td>
                    </tr>
                  ),
                )}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-slate-800">
                <td
                  className="px-3 py-4 text-right text-sm font-black"
                  colSpan={4}
                >
                  Total Refund
                </td>

                <td className="px-3 py-4 text-right text-sm font-black">
                  {formatCurrency(
                    refund.amount,
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {refund.processingNote !==
        "" ? (
          <section className="mt-6 rounded-xl border border-slate-200 p-4">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Processing Note
            </div>

            <p className="mt-2 text-sm leading-6">
              {
                refund.processingNote
              }
            </p>
          </section>
        ) : null}

        <footer className="mt-10 grid grid-cols-2 gap-12 border-t border-slate-300 pt-8 text-xs">
          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Cashier / Billing Staff
            </div>
          </div>

          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Patient / Representative
            </div>
          </div>
        </footer>

        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">
          Demonstration credit note only. Production refunds require authenticated billing staff, approved payment reversal and accounting integration.
        </p>
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

interface PrintableBillingRefundReceiptProps {
  refundId: string;
}

export function PrintableBillingRefundReceipt({
  refundId,
}: PrintableBillingRefundReceiptProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const branches =
    useWonFlowAsyncData({
      key:
        `billing-refund-receipt:${refundId}`,

      loader:
        (
          signal,
        ) =>
          hospitalService.listBranches(
            signal,
          ),

      isEmpty:
        (records) =>
          records.length === 0,
    });

  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital branch information is unavailable."
      emptyTitle="Refund receipt unavailable"
      loadingDescription="WonFlow is preparing the refund receipt and credit note."
      loadingTitle="Preparing refund receipt"
      onRetry={
        branches.reload
      }
      state={branches}
    >
      {(records) => (
        <PrintableRefundContent
          branches={records}
          refundId={refundId}
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}