"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
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
} from "@/components/feedback";

import {
  WonFlowActionButton,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  buildDemoInsuranceAgingSummary,
  buildDemoInsuranceReceivables,
  readDemoInsurers,
} from "@/lib/insurance";

import type {
  DemoInsuranceAgingSummary,
  DemoInsuranceReceivable,
  DemoInsurer,
} from "@/lib/insurance";

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

interface PrintableAgingContentProps {
  branches:
    readonly MockBranch[];
}

function PrintableAgingContent({
  branches,
}: PrintableAgingContentProps) {
  const [
    receivables,
    setReceivables,
  ] = useState<
    DemoInsuranceReceivable[]
  >([]);

  const [
    summary,
    setSummary,
  ] = useState<
    DemoInsuranceAgingSummary
  >(
    () =>
      buildDemoInsuranceAgingSummary(),
  );

  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    insurers,
    setInsurers,
  ] = useState<
    DemoInsurer[]
  >([]);

  const loadReport =
    useCallback(() => {
      setReceivables(
        buildDemoInsuranceReceivables(),
      );

      setSummary(
        buildDemoInsuranceAgingSummary(),
      );

      setPatients(
        readDemoPatientRegistrations(),
      );

      setInsurers(
        readDemoInsurers(),
      );
    }, []);

  useEffect(() => {
    queueMicrotask(
      loadReport,
    );
  }, [loadReport]);

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

  const insurersById =
    useMemo(
      () =>
        new Map(
          insurers.map(
            (insurer) => [
              insurer.id,
              insurer,
            ],
          ),
        ),
      [insurers],
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

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href="/operations/insurance/receivables"
        >
          Return to Insurance Receivables
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
          Print Aging Report
        </WonFlowActionButton>
      </div>

      <article className="wf-print-report mx-auto max-w-[1100px] bg-white p-8 text-slate-950 shadow-sm print:shadow-none">
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
                Insurance Receivable Aging Report
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Report Date
            </div>

            <div className="mt-1 text-xs font-bold">
              {formatWonFlowDashboardDateTime(
                new Date().toISOString(),
              )}
            </div>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ReportAmount
            label="Total Outstanding"
            value={
              summary.totalOutstanding
            }
          />

          <ReportAmount
            label="Overdue Amount"
            value={
              summary.overdueAmount
            }
          />

          <ReportAmount
            label="Open Claims"
            value={
              summary.totalOpenClaims
            }
            money={false}
          />

          <ReportAmount
            label="Oldest Days"
            value={
              summary.oldestOutstandingDays
            }
            money={false}
          />
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summary.buckets.map(
            (bucket) => (
              <div
                className="rounded-xl border border-slate-200 p-4"
                key={bucket.bucket}
              >
                <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                  {bucket.bucket ===
                  "90-plus"
                    ? "90+ Days"
                    : `${bucket.bucket} Days`}
                </div>

                <div className="mt-2 text-lg font-black">
                  {formatCurrency(
                    bucket.outstandingAmount,
                  )}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {bucket.claimCount}
                  {" claim(s)"}
                </div>
              </div>
            ),
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Outstanding Insurance Claims
          </h2>

          {receivables.length ===
          0 ? (
            <div className="mt-3 rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
              No outstanding insurance receivables were recorded.
            </div>
          ) : (
            <table className="mt-3 w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100">
                  <th className="px-2 py-3">
                    Patient
                  </th>

                  <th className="px-2 py-3">
                    Insurer
                  </th>

                  <th className="px-2 py-3">
                    Claim
                  </th>

                  <th className="px-2 py-3">
                    Invoice
                  </th>

                  <th className="px-2 py-3">
                    Branch
                  </th>

                  <th className="px-2 py-3 text-right">
                    Approved
                  </th>

                  <th className="px-2 py-3 text-right">
                    Paid
                  </th>

                  <th className="px-2 py-3 text-right">
                    Outstanding
                  </th>

                  <th className="px-2 py-3 text-right">
                    Days
                  </th>

                  <th className="px-2 py-3">
                    Aging
                  </th>
                </tr>
              </thead>

              <tbody>
                {receivables.map(
                  (receivable) => {
                    const patient =
                      patientsById.get(
                        receivable.patientId,
                      );

                    return (
                      <tr
                        className="border-b border-slate-200"
                        key={
                          receivable.claimId
                        }
                      >
                        <td className="px-2 py-3">
                          <div className="font-bold">
                            {patient?.displayName ??
                              "Unknown patient"}
                          </div>

                          <div className="mt-1 text-[9px] text-slate-500">
                            {patient?.mrNumber ??
                              "No MR"}
                          </div>
                        </td>

                        <td className="px-2 py-3">
                          {insurersById.get(
                            receivable.insurerId,
                          )?.insurerName ??
                            "Unknown insurer"}
                        </td>

                        <td className="px-2 py-3 font-mono">
                          {
                            receivable.claimNumber
                          }
                        </td>

                        <td className="px-2 py-3 font-mono">
                          {
                            receivable.invoiceNumber
                          }
                        </td>

                        <td className="px-2 py-3">
                          {branchesById.get(
                            receivable.branchId,
                          )?.name ??
                            "Unknown branch"}
                        </td>

                        <td className="px-2 py-3 text-right">
                          {formatCurrency(
                            receivable.approvedAmount,
                          )}
                        </td>

                        <td className="px-2 py-3 text-right">
                          {formatCurrency(
                            receivable.paidAmount,
                          )}
                        </td>

                        <td className="px-2 py-3 text-right font-bold">
                          {formatCurrency(
                            receivable.outstandingAmount,
                          )}
                        </td>

                        <td className="px-2 py-3 text-right font-bold">
                          {
                            receivable.daysOutstanding
                          }
                        </td>

                        <td className="px-2 py-3">
                          {receivable.agingBucket ===
                          "90-plus"
                            ? "90+"
                            : receivable.agingBucket}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-slate-800">
                  <td
                    className="px-2 py-4 text-right font-black"
                    colSpan={7}
                  >
                    Total Outstanding
                  </td>

                  <td className="px-2 py-4 text-right text-xs font-black">
                    {formatCurrency(
                      summary.totalOutstanding,
                    )}
                  </td>

                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        <footer className="mt-12 grid grid-cols-2 gap-12 border-t border-slate-300 pt-8 text-xs">
          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Insurance Receivables Officer
            </div>
          </div>

          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Finance Manager
            </div>
          </div>
        </footer>

        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">
          Demonstration aging report only. Production receivables require insurer reconciliation, accounting controls and authenticated financial records.
        </p>
      </article>
    </div>
  );
}

function ReportAmount({
  label,
  value,
  money = true,
}: {
  label: string;
  value: number;
  money?: boolean;
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="text-[10px] font-black uppercase tracking-wide text-blue-600">
        {label}
      </div>

      <div className="mt-2 text-xl font-black text-blue-950">
        {money
          ? formatCurrency(value)
          : value.toLocaleString(
              "en-US",
            )}
      </div>
    </div>
  );
}

export function PrintableInsuranceAgingReport() {
  const hospitalService =
    useWonFlowHospitalService();

  const branches =
    useWonFlowAsyncData({
      key:
        "insurance-aging-report:branches",

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
      emptyTitle="Aging report unavailable"
      loadingDescription="WonFlow is preparing the insurance aging report."
      loadingTitle="Preparing aging report"
      onRetry={
        branches.reload
      }
      state={branches}
    >
      {(records) => (
        <PrintableAgingContent
          branches={records}
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}