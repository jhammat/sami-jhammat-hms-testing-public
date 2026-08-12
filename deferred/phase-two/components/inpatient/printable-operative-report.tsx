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
  readDemoOperationTheatres,
  readDemoSurgicalCases,
} from "@/lib/inpatient";

import type {
  DemoOperationTheatre,
  DemoSurgicalCase,
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

interface PrintableOperativeReportContentProps {
  caseId: string;

  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function PrintableOperativeReportContent({
  caseId,
  branches,
  practitioners,
}: PrintableOperativeReportContentProps) {
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

  const loadReport =
    useCallback(() => {
      const loadedCase =
        readDemoSurgicalCases()
          .find(
            (record) =>
              record.id ===
              caseId,
          );

      setSurgicalCase(
        loadedCase,
      );

      if (
        loadedCase ===
        undefined
      ) {
        setPatient(undefined);
        setTheatre(undefined);

        return;
      }

      setPatient(
        readDemoPatientRegistrations()
          .find(
            (record) =>
              record.id ===
              loadedCase.patientId,
          ),
      );

      setTheatre(
        readDemoOperationTheatres()
          .find(
            (record) =>
              record.id ===
              loadedCase.theatreId,
          ),
      );
    }, [caseId]);

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
    surgicalCase === undefined ||
    patient === undefined
  ) {
    return (
      <WonFlowErrorState
        description="The surgical case or patient could not be loaded."
        title="Operative report unavailable"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href="/operations/surgery/operation-theatre"
        >
          Return to Operation Theatre
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
          Print Operative Report
        </WonFlowActionButton>
      </div>

      <article className="wf-print-report mx-auto max-w-[1000px] bg-white p-8 text-slate-950 shadow-sm print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-blue-700 pb-5">
          <div className="flex items-center gap-4">
            <WonFlowBrandMark />

            <div>
              <h1 className="text-xl font-black tracking-[-0.04em]">
                WonFlow Central Demo Hospital
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Surgical Operative Report
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Surgical Case
            </div>

            <div className="mt-1 font-mono text-sm font-bold">
              {
                surgicalCase.caseNumber
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
            label="Branch"
            value={
              branchesById.get(
                surgicalCase.branchId,
              )?.name ??
              "Unknown branch"
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
            label="Procedure"
            value={
              surgicalCase.procedureName
            }
          />

          <ReportField
            label="Urgency"
            value={humanizeValue(
              surgicalCase.urgency,
            )}
          />

          <ReportField
            label="Anesthesia"
            value={humanizeValue(
              surgicalCase.anesthesiaType,
            )}
          />

          <ReportField
            label="Status"
            value={humanizeValue(
              surgicalCase.status,
            )}
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
            label="Assistant Surgeon"
            value={
              practitionersById.get(
                surgicalCase.team
                  .assistantSurgeonId,
              )?.displayName ??
              "Not recorded"
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
            label="Scheduled"
            value={formatWonFlowDashboardDateTime(
              surgicalCase.scheduledStartAt,
            )}
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <ClinicalSection
            label="Preoperative Diagnosis"
            value={
              surgicalCase.preoperativeDiagnosis
            }
          />

          <ClinicalSection
            label="Procedure Performed"
            value={
              surgicalCase
                .intraoperativeRecord
                .procedurePerformed
            }
          />

          <ClinicalSection
            label="Operative Findings"
            value={
              surgicalCase
                .intraoperativeRecord
                .operativeFindings
            }
          />

          <ClinicalSection
            label="Surgeon Notes"
            value={
              surgicalCase
                .intraoperativeRecord
                .surgeonNotes
            }
          />

          <ClinicalSection
            label="Anesthesia Notes"
            value={
              surgicalCase
                .intraoperativeRecord
                .anesthesiaNotes
            }
          />

          <ClinicalSection
            label="Complications"
            value={
              surgicalCase
                .intraoperativeRecord
                .complications ||
              "None recorded"
            }
          />

          <ClinicalSection
            label="Specimens"
            value={
              surgicalCase
                .intraoperativeRecord
                .specimens ||
              "None recorded"
            }
          />

          <ClinicalSection
            label="Implants"
            value={
              surgicalCase
                .intraoperativeRecord
                .implants ||
              "None recorded"
            }
          />
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ReportValue
            label="Theatre Start"
            value={
              surgicalCase
                .intraoperativeRecord
                .actualStartAt
                ? formatWonFlowDashboardDateTime(
                    surgicalCase
                      .intraoperativeRecord
                      .actualStartAt,
                  )
                : "Not recorded"
            }
          />

          <ReportValue
            label="Incision"
            value={
              surgicalCase
                .intraoperativeRecord
                .incisionAt
                ? formatWonFlowDashboardDateTime(
                    surgicalCase
                      .intraoperativeRecord
                      .incisionAt,
                  )
                : "Not recorded"
            }
          />

          <ReportValue
            label="Procedure End"
            value={
              surgicalCase
                .intraoperativeRecord
                .actualEndAt
                ? formatWonFlowDashboardDateTime(
                    surgicalCase
                      .intraoperativeRecord
                      .actualEndAt,
                  )
                : "Not recorded"
            }
          />

          <ReportValue
            label="Estimated Blood Loss"
            value={`${surgicalCase.intraoperativeRecord.estimatedBloodLossMillilitres} mL`}
          />
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Surgical Count Confirmation
          </h2>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <CountResult
              label="Instruments"
              value={
                surgicalCase
                  .intraoperativeRecord
                  .instrumentCountCorrect
              }
            />

            <CountResult
              label="Swabs"
              value={
                surgicalCase
                  .intraoperativeRecord
                  .swabCountCorrect
              }
            />

            <CountResult
              label="Needles"
              value={
                surgicalCase
                  .intraoperativeRecord
                  .needleCountCorrect
              }
            />
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
            Recovery Assessment
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ReportField
              label="Consciousness"
              value={humanizeValue(
                surgicalCase
                  .recoveryRecord
                  .consciousness,
              )}
            />

            <ReportField
              label="Pain Score"
              value={`${surgicalCase.recoveryRecord.painScore}/10`}
            />

            <ReportField
              label="SpO₂"
              value={`${surgicalCase.recoveryRecord.oxygenSaturationPercent}%`}
            />

            <ReportField
              label="Handed Over To"
              value={
                surgicalCase
                  .recoveryRecord
                  .handedOverTo
              }
            />

            <ReportField
              label="Airway Stable"
              value={
                surgicalCase
                  .recoveryRecord
                  .airwayStable
                  ? "Yes"
                  : "No"
              }
            />

            <ReportField
              label="Circulation Stable"
              value={
                surgicalCase
                  .recoveryRecord
                  .circulationStable
                  ? "Yes"
                  : "No"
              }
            />

            <ReportField
              label="Bleeding Controlled"
              value={
                surgicalCase
                  .recoveryRecord
                  .bleedingControlled
                  ? "Yes"
                  : "No"
              }
            />

            <ReportField
              label="Completed By"
              value={
                surgicalCase
                  .recoveryRecord
                  .completedBy
              }
            />
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-emerald-800">
            {surgicalCase
              .recoveryRecord
              .recoveryNote ||
              "No recovery note recorded."}
          </p>
        </section>

        <footer className="mt-12 grid grid-cols-3 gap-10 border-t border-slate-300 pt-8 text-xs">
          <SignatureLine label="Primary Surgeon" />

          <SignatureLine label="Anesthetist" />

          <SignatureLine label="Theatre Nurse" />
        </footer>

        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">
          Demonstration operative report only. Production surgical documentation requires authenticated clinicians, electronic signatures, legal retention and immutable audit history.
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

function ClinicalSection({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-[10px] font-black uppercase tracking-wide text-blue-700">
        {label}
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {value || "Not recorded"}
      </p>
    </div>
  );
}

function ReportValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="text-[10px] font-black uppercase tracking-wide text-blue-600">
        {label}
      </div>

      <div className="mt-2 text-sm font-black text-blue-950">
        {value}
      </div>
    </div>
  );
}

function CountResult({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 text-center">
      <div className="text-xs font-bold text-slate-600">
        {label}
      </div>

      <div className={[
        "mt-2 text-sm font-black",
        value
          ? "text-emerald-700"
          : "text-rose-700",
      ].join(" ")}>
        {value
          ? "Correct"
          : "Not confirmed"}
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

interface PrintableOperativeReportProps {
  caseId: string;
}

export function PrintableOperativeReport({
  caseId,
}: PrintableOperativeReportProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        `printable-operative-report:${caseId}`,

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
        (directory) =>
          directory
            .branches
            .length === 0,
    });

  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital branch information is unavailable."
      emptyTitle="Operative report unavailable"
      loadingDescription="WonFlow is preparing the surgical operative report."
      loadingTitle="Preparing operative report"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <PrintableOperativeReportContent
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