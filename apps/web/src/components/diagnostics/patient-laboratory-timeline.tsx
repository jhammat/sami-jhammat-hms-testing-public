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
  FlaskConical,
} from "lucide-react";

import {
  WonFlowEmptyState,
  WonFlowErrorState,
} from "@/components/feedback";

import {
  WonFlowKpiCard,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  getLaboratoryResultFlagCounts,
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

interface PatientLaboratoryTimelineProps {
  patientId: string;
}

export function PatientLaboratoryTimeline({
  patientId,
}: PatientLaboratoryTimelineProps) {
  const [
    patient,
    setPatient,
  ] = useState<
    DemoPatientRegistrationResult |
    undefined
  >();

  const [
    results,
    setResults,
  ] = useState<
    DemoStructuredLaboratoryResult[]
  >([]);

  const [
    selectedResultId,
    setSelectedResultId,
  ] = useState("");

  const loadTimeline =
    useCallback(() => {
      setPatient(
        readDemoPatientRegistrations()
          .find(
            (record) =>
              record.id ===
              patientId,
          ),
      );

      setResults(
        readDemoStructuredLaboratoryResults()
          .filter(
            (result) =>
              result.patientId ===
              patientId &&
              (
                result.status ===
                  "result-ready" ||
                result.status ===
                  "finalized"
              ),
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.finalizedAt ||
                  right.resultReadyAt ||
                  right.updatedAt,
              ).getTime() -
              new Date(
                left.finalizedAt ||
                  left.resultReadyAt ||
                  left.updatedAt,
              ).getTime(),
          ),
      );
    }, [patientId]);

  useEffect(() => {
    queueMicrotask(
      loadTimeline,
    );

    window.addEventListener(
      "wonflow:demo-structured-laboratory-results-changed",
      loadTimeline,
    );

    window.addEventListener(
      "storage",
      loadTimeline,
    );

    return () => {
      window.removeEventListener(
        "wonflow:demo-structured-laboratory-results-changed",
        loadTimeline,
      );

      window.removeEventListener(
        "storage",
        loadTimeline,
      );
    };
  }, [loadTimeline]);

  const selectedResult =
    results.find(
      (result) =>
        result.id ===
        selectedResultId,
    ) ??
    results[0];

  const statistics =
    useMemo(
      () => ({
        total:
          results.length,

        abnormal:
          results.filter(
            (result) =>
              getLaboratoryResultSeverity(
                result,
              ) === "abnormal",
          ).length,

        critical:
          results.filter(
            (result) =>
              getLaboratoryResultSeverity(
                result,
              ) === "critical",
          ).length,

        finalized:
          results.filter(
            (result) =>
              result.status ===
              "finalized",
          ).length,
      }),
      [results],
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
          <Link
            className="wf-button-secondary"
            href="/operations/patients"
          >
            Patient Directory
          </Link>
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
              "Laboratory Results",
          },
        ]}
        description="Review the patient’s laboratory-result history and analyte changes over time."
        eyebrow="Patient Medical Record"
        leading={
          <FlaskConical
            size={20}
          />
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
        title={`${patient.displayName} — Laboratory Results`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WonFlowKpiCard
          helperText="Available laboratory reports"
          label="Total Reports"
          tone="blue"
          value={statistics.total}
        />

        <WonFlowKpiCard
          helperText="Reports containing abnormal values"
          label="Abnormal"
          tone="amber"
          value={
            statistics.abnormal
          }
        />

        <WonFlowKpiCard
          helperText="Reports containing critical values"
          label="Critical"
          tone="rose"
          value={
            statistics.critical
          }
        />

        <WonFlowKpiCard
          helperText="Reports finalized by the laboratory"
          label="Finalized"
          tone="emerald"
          value={
            statistics.finalized
          }
        />
      </div>

      {results.length ===
      0 ? (
        <WonFlowOperationalPanel
          description="No result-ready or finalized laboratory report exists for this patient."
          title="Laboratory Result Timeline"
          tone="slate"
        >
          <WonFlowEmptyState
            description="Laboratory reports will appear here after result entry."
            title="No laboratory history"
          />
        </WonFlowOperationalPanel>
      ) : (
        <div className="wf-workspace-rail">
          <div className="wf-workspace-rail-side">
            <WonFlowOperationalPanel
              description="Newest laboratory reports appear first."
              title="Result Timeline"
              tone="blue"
            >
              <div className="space-y-3">
                {results.map(
                  (result) => {
                    const severity =
                      getLaboratoryResultSeverity(
                        result,
                      );

                    const counts =
                      getLaboratoryResultFlagCounts(
                        result,
                      );

                    const selected =
                      selectedResult
                        ?.id ===
                      result.id;

                    return (
                      <button
                        className={[
                          "w-full rounded-2xl border p-4 text-left transition",
                          selected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        ].join(" ")}
                        key={result.id}
                        onClick={() => {
                          setSelectedResultId(
                            result.id,
                          );
                        }}
                        type="button"
                      >
                        <div className="text-sm font-black text-slate-950">
                          {
                            result.panelName
                          }
                        </div>

                        <div className="mt-1 text-xs font-bold text-blue-700">
                          {
                            result.orderNumber
                          }
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={[
                              "rounded-full border px-2.5 py-1 text-[10px] font-black",
                              severity ===
                              "critical"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : severity ===
                                    "abnormal"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
                            ].join(" ")}
                          >
                            {severity}
                          </span>

                          <span className="wf-status wf-status-neutral">
                            {
                              counts.abnormal
                            }
                            {" abnormal"}
                          </span>
                        </div>

                        <div className="mt-3 text-[11px] text-slate-500">
                          {formatWonFlowDashboardDateTime(
                            result.finalizedAt ||
                              result.resultReadyAt ||
                              result.updatedAt,
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
            {selectedResult ===
            undefined ? null : (
              <WonFlowOperationalPanel
                description="Detailed analyte values from the selected laboratory report."
                status={
                  <Link
                    className="wf-button-secondary"
                    href={`/operations/laboratory/results/${encodeURIComponent(
                      selectedResult
                        .diagnosticOrderId,
                    )}/report`}
                  >
                    Print Report
                  </Link>
                }
                title={
                  selectedResult
                    .panelName
                }
                tone="cyan"
              >
                <div className="wf-content-scroll">
                  <table className="w-full min-w-[850px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">
                          Analyte
                        </th>

                        <th className="px-3 py-3">
                          Result
                        </th>

                        <th className="px-3 py-3">
                          Unit
                        </th>

                        <th className="px-3 py-3">
                          Reference
                        </th>

                        <th className="px-3 py-3">
                          Flag
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedResult
                        .analytes
                        .map(
                          (analyte) => (
                            <tr
                              className="border-b border-slate-100 last:border-0"
                              key={
                                analyte.id
                              }
                            >
                              <td className="px-3 py-3 font-black text-slate-900">
                                {
                                  analyte.name
                                }
                              </td>

                              <td className="px-3 py-3 font-black">
                                {
                                  analyte.value ||
                                  humanizeValue(
                                    analyte
                                      .reportingStatus,
                                  )
                                }
                              </td>

                              <td className="px-3 py-3">
                                {
                                  analyte.unit ||
                                  "—"
                                }
                              </td>

                              <td className="px-3 py-3 text-xs">
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
                                    .join(
                                      " – ",
                                    ) ||
                                  "Not configured"}
                              </td>

                              <td className="px-3 py-3">
                                {[
                                  "critical",
                                  "critical-low",
                                  "critical-high",
                                ].includes(
                                  analyte
                                    .calculatedFlag,
                                ) ? (
                                  <AlertTriangle
                                    className="text-rose-600"
                                    size={18}
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-slate-600">
                                    {humanizeValue(
                                      analyte
                                        .calculatedFlag,
                                    )}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                    </tbody>
                  </table>
                </div>

                {selectedResult
                  .interpretation !==
                "" ? (
                  <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-blue-700">
                      Interpretation
                    </div>

                    <p className="mt-2 text-sm leading-6 text-blue-900">
                      {
                        selectedResult
                          .interpretation
                      }
                    </p>
                  </div>
                ) : null}
              </WonFlowOperationalPanel>
            )}
          </div>
        </div>
      )}
    </div>
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