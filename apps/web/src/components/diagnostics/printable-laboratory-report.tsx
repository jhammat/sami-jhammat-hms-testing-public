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
  getLaboratoryResultSeverity,
  readDemoStructuredLaboratoryResults,
} from "@/lib/diagnostics";

import type {
  DemoStructuredLaboratoryResult,
} from "@/lib/diagnostics";

import {
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import {
  formatWonFlowDashboardDateTime,
} from "@/lib/dashboard";

interface PrintableLaboratoryReportContentProps {
  orderId: string;

  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function PrintableLaboratoryReportContent({
  orderId,
  branches,
  practitioners,
}: PrintableLaboratoryReportContentProps) {
  const [
    result,
    setResult,
  ] = useState<
    DemoStructuredLaboratoryResult |
    undefined
  >();

  const [
    patient,
    setPatient,
  ] = useState<
    DemoPatientRegistrationResult |
    undefined
  >();

  const loadReport =
    useCallback(() => {
      const currentResult =
        readDemoStructuredLaboratoryResults()
          .find(
            (record) =>
              record.diagnosticOrderId ===
              orderId,
          );

      setResult(
        currentResult,
      );

      setPatient(
        currentResult ===
        undefined
          ? undefined
          : readDemoPatientRegistrations()
              .find(
                (record) =>
                  record.id ===
                  currentResult
                    .patientId,
              ),
      );
    }, [orderId]);

  useEffect(() => {
    queueMicrotask(
      loadReport,
    );
  }, [loadReport]);

  if (
    result === undefined ||
    patient === undefined
  ) {
    return (
      <WonFlowErrorState
        description="The finalized laboratory report could not be loaded."
        title="Laboratory report unavailable"
      />
    );
  }

  const practitioner =
    practitioners.find(
      (record) =>
        record.id ===
        result.practitionerId,
    );

  const branch =
    branches.find(
      (record) =>
        record.id ===
        result.branchId,
    );

  const severity =
    getLaboratoryResultSeverity(
      result,
    );

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href={`/operations/laboratory/results/${encodeURIComponent(
            orderId,
          )}`}
        >
          Return to Result
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
          Print Laboratory Report
        </WonFlowActionButton>
      </div>

      <article className="wf-print-report mx-auto max-w-[1000px] bg-white p-8 text-slate-950 shadow-sm print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-blue-700 pb-5">
          <div className="flex items-center gap-4">
            <WonFlowBrandMark
              size={54}
            />

            <div>
              <h1 className="text-2xl font-black tracking-[-0.04em]">
                WonFlow Central Demo Hospital
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Demonstration Laboratory Information System
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">
              Laboratory Report
            </div>

            <div className="mt-1 font-mono text-sm font-bold">
              {result.orderNumber}
            </div>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 rounded-xl border border-slate-200 p-5 text-sm lg:grid-cols-4">
          <ReportField
            label="Patient"
            value={
              patient.displayName
            }
          />

          <ReportField
            label="MR Number"
            value={patient.mrNumber}
          />

          <ReportField
            label="CNIC / B-Form"
            value={
              patient.draft
                .cnicNumber
            }
          />

          <ReportField
            label="Gender"
            value={
              patient.draft.gender
            }
          />

          <ReportField
            label="Panel"
            value={result.panelName}
          />

          <ReportField
            label="Specimen"
            value={
              result.specimenType
            }
          />

          <ReportField
            label="Ordering Doctor"
            value={
              practitioner
                ?.displayName ??
              "Unknown doctor"
            }
          />

          <ReportField
            label="Branch"
            value={
              branch?.name ??
              "Unknown branch"
            }
          />

          <ReportField
            label="Finalized"
            value={formatWonFlowDashboardDateTime(
              result.finalizedAt ||
                result.updatedAt,
            )}
          />

          <ReportField
            label="Overall Classification"
            value={severity}
          />
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">
            Laboratory Results
          </h2>

          <table className="mt-3 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100">
                <th className="px-3 py-3">
                  Test
                </th>

                <th className="px-3 py-3">
                  Result
                </th>

                <th className="px-3 py-3">
                  Unit
                </th>

                <th className="px-3 py-3">
                  Reference Range
                </th>

                <th className="px-3 py-3">
                  Flag
                </th>
              </tr>
            </thead>

            <tbody>
              {result.analytes.map(
                (analyte) => (
                  <tr
                    className="border-b border-slate-200"
                    key={analyte.id}
                  >
                    <td className="px-3 py-3">
                      <div className="font-bold">
                        {analyte.name}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        {analyte.code}
                      </div>
                    </td>

                    <td className="px-3 py-3 font-bold">
                      {analyte
                        .reportingStatus ===
                      "not-performed"
                        ? "Not performed"
                        : analyte.value ||
                          "Pending"}
                    </td>

                    <td className="px-3 py-3">
                      {analyte.unit ||
                        "—"}
                    </td>

                    <td className="px-3 py-3">
                      {analyte
                        .referenceText ||
                        [
                          analyte
                            .referenceLow,
                          analyte
                            .referenceHigh,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(" – ") ||
                        "Not configured"}
                    </td>

                    <td className="px-3 py-3 font-bold">
                      {analyte
                        .calculatedFlag}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </section>

        {result.interpretation !==
        "" ? (
          <section className="mt-6 rounded-xl border border-slate-200 p-4">
            <h2 className="text-xs font-black uppercase tracking-wide text-slate-600">
              Interpretation
            </h2>

            <p className="mt-2 text-sm leading-6">
              {result.interpretation}
            </p>
          </section>
        ) : null}

        {result.technicalNotes !==
        "" ? (
          <section className="mt-4 rounded-xl border border-slate-200 p-4">
            <h2 className="text-xs font-black uppercase tracking-wide text-slate-600">
              Technical Notes
            </h2>

            <p className="mt-2 text-sm leading-6">
              {result.technicalNotes}
            </p>
          </section>
        ) : null}

        <footer className="mt-10 grid grid-cols-2 gap-12 border-t border-slate-300 pt-8 text-xs">
          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Laboratory Verification
            </div>
          </div>

          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Authorized Signature
            </div>
          </div>
        </footer>

        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">
          Demonstration report only. Reference ranges and results must be validated by an authorized hospital laboratory before clinical use.
        </p>
      </article>
    </div>
  );
}

function ReportField({
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

      <div className="mt-1 font-bold capitalize">
        {value || "Not recorded"}
      </div>
    </div>
  );
}

interface PrintableLaboratoryReportProps {
  orderId: string;
}

export function PrintableLaboratoryReport({
  orderId,
}: PrintableLaboratoryReportProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        `laboratory-report:${orderId}`,

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
      emptyTitle="Report unavailable"
      loadingDescription="WonFlow is preparing the printable laboratory report."
      loadingTitle="Preparing report"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <PrintableLaboratoryReportContent
          branches={
            directory.branches
          }
          orderId={orderId}
          practitioners={
            directory.practitioners
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}