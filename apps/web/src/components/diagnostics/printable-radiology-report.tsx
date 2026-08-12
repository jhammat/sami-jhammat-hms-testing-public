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
  readDemoStructuredRadiologyResults,
} from "@/lib/diagnostics";

import type {
  DemoStructuredRadiologyResult,
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

      <div className="mt-1 font-bold">
        {value || "Not recorded"}
      </div>
    </div>
  );
}

function ReportSection({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <section className="mt-6">
      <h2 className="border-b border-slate-300 pb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700">
        {title}
      </h2>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-900">
        {value || "Not recorded"}
      </p>
    </section>
  );
}

interface PrintableRadiologyContentProps {
  orderId: string;

  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function PrintableRadiologyContent({
  orderId,
  branches,
  practitioners,
}: PrintableRadiologyContentProps) {
  const [
    result,
    setResult,
  ] = useState<
    DemoStructuredRadiologyResult |
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
        readDemoStructuredRadiologyResults()
          .find(
            (record) =>
              record.diagnosticOrderId ===
              orderId,
          );

      setResult(currentResult);

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
        description="The structured radiology report could not be loaded."
        title="Radiology report unavailable"
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

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href={`/operations/radiology/results/${encodeURIComponent(
            orderId,
          )}`}
        >
          Return to Report
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
          Print Radiology Report
        </WonFlowActionButton>
      </div>

      <article className="wf-print-report mx-auto max-w-[1000px] bg-white p-8 text-slate-950 shadow-sm print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-violet-700 pb-5">
          <div className="flex items-center gap-4">
            <WonFlowBrandMark
              size={54}
            />

            <div>
              <h1 className="text-2xl font-black tracking-[-0.04em]">
                WonFlow Central Demo Hospital
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Demonstration Radiology Information System
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-700">
              Radiology Report
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
            value={patient.draft.gender}
          />

          <ReportField
            label="Study"
            value={result.studyName}
          />

          <ReportField
            label="Modality"
            value={
              result.modality
            }
          />

          <ReportField
            label="Body Region"
            value={result.bodyPart}
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
        </section>

        <ReportSection
          title="Clinical Indication"
          value={
            result.clinicalIndication
          }
        />

        <ReportSection
          title="Technique"
          value={result.technique}
        />

        <ReportSection
          title="Comparison"
          value={
            result.comparison ||
            "No comparison study recorded."
          }
        />

        <ReportSection
          title="Findings"
          value={result.findings}
        />

        <ReportSection
          title="Impression"
          value={result.impression}
        />

        <ReportSection
          title="Recommendations"
          value={
            result.recommendations ||
            "No additional recommendation recorded."
          }
        />

        {result.criticalFinding ? (
          <section className="mt-6 rounded-xl border-2 border-rose-400 bg-rose-50 p-4">
            <h2 className="text-xs font-black uppercase tracking-wide text-rose-700">
              Critical Finding
            </h2>

            <p className="mt-2 text-sm font-bold leading-6 text-rose-950">
              {
                result
                  .criticalFindingDetails
              }
            </p>

            <p className="mt-3 text-xs text-rose-700">
              Communicated to:
              {" "}
              {
                result
                  .criticalNotificationRecipient ||
                "Not recorded"
              }
            </p>
          </section>
        ) : null}

        <footer className="mt-12 grid grid-cols-2 gap-12 border-t border-slate-300 pt-8 text-xs">
          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Reporting Radiologist
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
          Demonstration report only. This document is not valid for clinical use without review and authorization by a qualified radiologist.
        </p>
      </article>
    </div>
  );
}

interface PrintableRadiologyReportProps {
  orderId: string;
}

export function PrintableRadiologyReport({
  orderId,
}: PrintableRadiologyReportProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        `radiology-print-report:${orderId}`,

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
      emptyTitle="Radiology report unavailable"
      loadingDescription="WonFlow is preparing the printable radiology report."
      loadingTitle="Preparing radiology report"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <PrintableRadiologyContent
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