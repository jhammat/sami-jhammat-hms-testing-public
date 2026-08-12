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
  ScanLine,
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
  getRadiologyResultSeverity,
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

interface PatientRadiologyTimelineProps {
  patientId: string;
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

export function PatientRadiologyTimeline({
  patientId,
}: PatientRadiologyTimelineProps) {
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
    DemoStructuredRadiologyResult[]
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
        readDemoStructuredRadiologyResults()
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
      "wonflow:demo-structured-radiology-results-changed",
      loadTimeline,
    );

    window.addEventListener(
      "storage",
      loadTimeline,
    );

    return () => {
      window.removeEventListener(
        "wonflow:demo-structured-radiology-results-changed",
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
              getRadiologyResultSeverity(
                result,
              ) === "abnormal",
          ).length,

        critical:
          results.filter(
            (result) =>
              getRadiologyResultSeverity(
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
              "Imaging Timeline",
          },
        ]}
        description="Review the patient’s imaging reports, impressions and recommendations over time."
        eyebrow="Patient Medical Record"
        leading={
          <ScanLine size={20} />
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
        title={`${patient.displayName} — Imaging Timeline`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WonFlowKpiCard
          helperText="Available imaging reports"
          label="Total Reports"
          tone="violet"
          value={statistics.total}
        />

        <WonFlowKpiCard
          helperText="Reports requiring clinical attention"
          label="Abnormal"
          tone="amber"
          value={
            statistics.abnormal
          }
        />

        <WonFlowKpiCard
          helperText="Reports containing critical findings"
          label="Critical"
          tone="rose"
          value={
            statistics.critical
          }
        />

        <WonFlowKpiCard
          helperText="Reports finalized by radiology"
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
          description="No result-ready or finalized radiology report exists for this patient."
          title="Patient Imaging Timeline"
          tone="slate"
        >
          <WonFlowEmptyState
            description="Radiology reports will appear here after imaging and reporting."
            title="No imaging history"
          />
        </WonFlowOperationalPanel>
      ) : (
        <div className="wf-workspace-rail">
          <div className="wf-workspace-rail-side">
            <WonFlowOperationalPanel
              description="Newest imaging reports appear first."
              title="Imaging Timeline"
              tone="violet"
            >
              <div className="space-y-3">
                {results.map(
                  (result) => {
                    const severity =
                      getRadiologyResultSeverity(
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
                            ? "border-violet-300 bg-violet-50"
                            : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50",
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
                            result.studyName
                          }
                        </div>

                        <div className="mt-1 text-xs font-bold text-violet-700">
                          {humanizeValue(
                            result.modality,
                          )}
                          {" · "}
                          {result.bodyPart ||
                            "Region not recorded"}
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
                            {humanizeValue(
                              severity,
                            )}
                          </span>

                          <span className="wf-status wf-status-neutral">
                            {humanizeValue(
                              result.status,
                            )}
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
              <div className="space-y-6">
                <WonFlowOperationalPanel
                  description={`${humanizeValue(
                    selectedResult.modality,
                  )} · ${selectedResult.bodyPart || "Body region not recorded"}`}
                  status={
                    <Link
                      className="wf-button-secondary"
                      href={`/operations/radiology/results/${encodeURIComponent(
                        selectedResult
                          .diagnosticOrderId,
                      )}/report`}
                    >
                      Print Report
                    </Link>
                  }
                  title={
                    selectedResult
                      .studyName
                  }
                  tone="violet"
                >
                  <div className="space-y-5">
                    <TimelineSection
                      title="Clinical Indication"
                      value={
                        selectedResult
                          .clinicalIndication
                      }
                    />

                    <TimelineSection
                      title="Findings"
                      value={
                        selectedResult
                          .findings
                      }
                    />

                    <TimelineSection
                      emphasized
                      title="Impression"
                      value={
                        selectedResult
                          .impression
                      }
                    />

                    {selectedResult
                      .recommendations !==
                    "" ? (
                      <TimelineSection
                        title="Recommendations"
                        value={
                          selectedResult
                            .recommendations
                        }
                      />
                    ) : null}

                    {selectedResult
                      .criticalFinding ? (
                      <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-black text-rose-900">
                          <AlertTriangle
                            size={18}
                          />

                          Critical Imaging Finding
                        </div>

                        <p className="mt-2 text-sm leading-6 text-rose-800">
                          {
                            selectedResult
                              .criticalFindingDetails
                          }
                        </p>
                      </div>
                    ) : null}
                  </div>
                </WonFlowOperationalPanel>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineSection({
  title,
  value,
  emphasized = false,
}: {
  title: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <section
      className={
        emphasized
          ? "rounded-2xl border border-violet-200 bg-violet-50 p-4"
          : ""
      }
    >
      <h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {title}
      </h3>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-800">
        {value || "Not recorded"}
      </p>
    </section>
  );
}