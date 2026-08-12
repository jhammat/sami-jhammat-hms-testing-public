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
  readDemoCssdSterilizationCycles,
  readDemoOperationTheatres,
  readDemoSurgicalCases,
  readDemoTheatreCaseIssues,
} from "@/lib/inpatient";

import type {
  DemoCssdSterilizationCycle,
  DemoOperationTheatre,
  DemoSurgicalCase,
  DemoTheatreCaseIssue,
} from "@/lib/inpatient";

import {
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import {
  formatWonFlowDashboardDateTime,
} from "@/lib/dashboard";

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

interface TraceabilityContentProps {
  issueId: string;

  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function TraceabilityContent({
  issueId,
  branches,
  practitioners,
}: TraceabilityContentProps) {
  const [
    issue,
    setIssue,
  ] = useState<
    DemoTheatreCaseIssue |
    undefined
  >();

  const [
    surgicalCase,
    setSurgicalCase,
  ] = useState<
    DemoSurgicalCase |
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
    theatre,
    setTheatre,
  ] = useState<
    DemoOperationTheatre |
    undefined
  >();

  const [
    cycles,
    setCycles,
  ] = useState<
    DemoCssdSterilizationCycle[]
  >([]);

  const loadReport =
    useCallback(() => {
      const loadedIssue =
        readDemoTheatreCaseIssues()
          .find(
            (record) =>
              record.id ===
              issueId,
          );

      setIssue(
        loadedIssue,
      );

      if (
        loadedIssue ===
        undefined
      ) {
        setSurgicalCase(undefined);
        setPatient(undefined);
        setTheatre(undefined);
        setCycles([]);

        return;
      }

      const loadedCase =
        readDemoSurgicalCases()
          .find(
            (record) =>
              record.id ===
              loadedIssue.caseId,
          );

      setSurgicalCase(
        loadedCase,
      );

      setPatient(
        readDemoPatientRegistrations()
          .find(
            (record) =>
              record.id ===
              loadedIssue.patientId,
          ),
      );

      setTheatre(
        loadedCase === undefined
          ? undefined
          : readDemoOperationTheatres()
              .find(
                (record) =>
                  record.id ===
                  loadedCase.theatreId,
              ),
      );

      setCycles(
        readDemoCssdSterilizationCycles(),
      );
    }, [issueId]);

  useEffect(() => {
    queueMicrotask(
      loadReport,
    );
  }, [loadReport]);

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

  if (
    issue === undefined ||
    surgicalCase === undefined ||
    patient === undefined
  ) {
    return (
      <WonFlowErrorState
        description="The theatre issue, surgical case or patient could not be loaded."
        title="Traceability report unavailable"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href="/operations/surgery/cssd"
        >
          Return to CSSD
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
          Print Traceability Report
        </WonFlowActionButton>
      </div>

      <article className="wf-print-report mx-auto max-w-[1050px] bg-white p-8 text-slate-950 shadow-sm print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-blue-700 pb-5">
          <div className="flex items-center gap-4">
            <WonFlowBrandMark />

            <div>
              <h1 className="text-xl font-black tracking-[-0.04em]">
                WonFlow Central Demo Hospital
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                CSSD, Implant and Surgical Supply Traceability
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Issue Number
            </div>

            <div className="mt-1 font-mono text-sm font-bold">
              {
                issue.issueNumber
              }
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
            value={
              patient.mrNumber
            }
          />

          <ReportField
            label="Surgical Case"
            value={
              surgicalCase.caseNumber
            }
          />

          <ReportField
            label="Hospital Branch"
            value={
              branchesById.get(
                issue.branchId,
              )?.name ??
              "Unknown branch"
            }
          />

          <ReportField
            label="Procedure"
            value={
              surgicalCase.procedureName
            }
          />

          <ReportField
            label="Operation Theatre"
            value={
              theatre?.theatreName ??
              "Unknown theatre"
            }
          />

          <ReportField
            label="Primary Surgeon"
            value={
              practitionersById.get(
                surgicalCase.team
                  .primarySurgeonId,
              )?.displayName ??
              "Unknown surgeon"
            }
          />

          <ReportField
            label="Anesthetist"
            value={
              practitionersById.get(
                surgicalCase.team
                  .anesthetistId,
              )?.displayName ??
              "Not recorded"
            }
          />

          <ReportField
            label="Issue Status"
            value={humanizeValue(
              issue.status,
            )}
          />

          <ReportField
            label="Issued By"
            value={
              issue.issuedBy
            }
          />

          <ReportField
            label="Issued At"
            value={formatWonFlowDashboardDateTime(
              issue.issuedAt,
            )}
          />

          <ReportField
            label="Finalized By"
            value={
              issue.finalizedBy ||
              "Not finalized"
            }
          />
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Instrument Tray Sterilization Traceability
          </h2>

          {issue.trays.length ===
          0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No surgical instrument tray was issued.
            </p>
          ) : (
            <table className="mt-3 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100">
                  <th className="px-3 py-3">
                    Tray
                  </th>

                  <th className="px-3 py-3">
                    Sterilization Cycle
                  </th>

                  <th className="px-3 py-3">
                    Method
                  </th>

                  <th className="px-3 py-3">
                    Sterilized
                  </th>

                  <th className="px-3 py-3">
                    Sterility Expiry
                  </th>

                  <th className="px-3 py-3">
                    Indicators
                  </th>

                  <th className="px-3 py-3">
                    Released By
                  </th>
                </tr>
              </thead>

              <tbody>
                {issue.trays.map(
                  (tray) => {
                    const cycle =
                      cycles.find(
                        (record) =>
                          record.id ===
                          tray.cycleId,
                      );

                    return (
                      <tr
                        className="border-b border-slate-200"
                        key={
                          tray.trayId
                        }
                      >
                        <td className="px-3 py-3">
                          <div className="font-bold">
                            {
                              tray.trayName
                            }
                          </div>

                          <div className="mt-1 font-mono text-[10px] text-slate-500">
                            {
                              tray.trayCode
                            }
                          </div>
                        </td>

                        <td className="px-3 py-3 font-mono">
                          {
                            tray.cycleNumber
                          }
                        </td>

                        <td className="px-3 py-3">
                          {cycle ===
                          undefined
                            ? "Legacy record"
                            : humanizeValue(
                                cycle.method,
                              )}
                        </td>

                        <td className="px-3 py-3">
                          {tray.sterilizedAt
                            ? formatWonFlowDashboardDateTime(
                                tray.sterilizedAt,
                              )
                            : "Not recorded"}
                        </td>

                        <td className="px-3 py-3">
                          {tray.sterilityExpiryAt
                            ? formatWonFlowDashboardDateTime(
                                tray.sterilityExpiryAt,
                              )
                            : "Not recorded"}
                        </td>

                        <td className="px-3 py-3">
                          {cycle ===
                          undefined
                            ? "Not recorded"
                            : `Chemical: ${humanizeValue(
                                cycle.chemicalIndicator,
                              )}; Biological: ${humanizeValue(
                                cycle.biologicalIndicator,
                              )}`}
                        </td>

                        <td className="px-3 py-3">
                          {cycle?.releasedBy ??
                            "Not recorded"}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Consumable and Implant Traceability
          </h2>

          {issue.lines.length ===
          0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No consumable or implant was issued.
            </p>
          ) : (
            <table className="mt-3 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100">
                  <th className="px-3 py-3">
                    Item
                  </th>

                  <th className="px-3 py-3">
                    Type
                  </th>

                  <th className="px-3 py-3">
                    Manufacturer
                  </th>

                  <th className="px-3 py-3">
                    Lot
                  </th>

                  <th className="px-3 py-3">
                    Serial
                  </th>

                  <th className="px-3 py-3">
                    Expiry
                  </th>

                  <th className="px-3 py-3 text-right">
                    Issued
                  </th>

                  <th className="px-3 py-3 text-right">
                    Used
                  </th>

                  <th className="px-3 py-3 text-right">
                    Returned
                  </th>
                </tr>
              </thead>

              <tbody>
                {issue.lines.map(
                  (line) => (
                    <tr
                      className="border-b border-slate-200"
                      key={line.id}
                    >
                      <td className="px-3 py-3">
                        <div className="font-bold">
                          {
                            line.itemName
                          }
                        </div>

                        <div className="mt-1 font-mono text-[10px] text-slate-500">
                          {
                            line.itemCode
                          }
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {humanizeValue(
                          line.itemType,
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {
                          line.manufacturer
                        }
                      </td>

                      <td className="px-3 py-3 font-mono">
                        {
                          line.lotNumber
                        }
                      </td>

                      <td className="px-3 py-3 font-mono">
                        {line.serialNumber ||
                          "—"}
                      </td>

                      <td className="px-3 py-3">
                        {
                          line.expiryDate
                        }
                      </td>

                      <td className="px-3 py-3 text-right font-bold">
                        {
                          line.quantityIssued
                        }
                      </td>

                      <td className="px-3 py-3 text-right font-bold">
                        {
                          line.quantityUsed
                        }
                      </td>

                      <td className="px-3 py-3 text-right font-bold">
                        {
                          line.quantityReturned
                        }
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          )}
        </section>

        {issue.note ? (
          <section className="mt-6 rounded-xl border border-slate-200 p-5">
            <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
              Issue Note
            </h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {issue.note}
            </p>
          </section>
        ) : null}

        <footer className="mt-12 grid grid-cols-3 gap-10 border-t border-slate-300 pt-8 text-xs">
          <SignatureLine label="CSSD Officer" />

          <SignatureLine label="Theatre Nurse" />

          <SignatureLine label="Primary Surgeon" />
        </footer>

        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">
          Demonstration surgical traceability report only. Production traceability requires authenticated staff, approved sterilization records, barcode scanning and immutable audit history.
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

      <div className="mt-1 font-bold">
        {value || "Not recorded"}
      </div>
    </div>
  );
}

function SignatureLine({
  label,
}: {
  label: string;
}) {
  return (
    <div>
      <div className="h-px bg-slate-400" />

      <div className="mt-2 font-bold">
        {label}
      </div>
    </div>
  );
}

interface PrintableCssdCaseTraceabilityReportProps {
  issueId: string;
}

export function PrintableCssdCaseTraceabilityReport({
  issueId,
}: PrintableCssdCaseTraceabilityReportProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directory =
    useWonFlowAsyncData({
      key:
        `cssd-traceability:${issueId}`,

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
                  limit: 200,
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
        (value) =>
          value.branches.length ===
          0,
    });

  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital branch information is unavailable."
      emptyTitle="Traceability report unavailable"
      loadingDescription="WonFlow is preparing instrument, implant and sterilization traceability."
      loadingTitle="Preparing traceability report"
      onRetry={
        directory.reload
      }
      state={directory}
    >
      {(value) => (
        <TraceabilityContent
          branches={
            value.branches
          }
          issueId={issueId}
          practitioners={
            value.practitioners
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}