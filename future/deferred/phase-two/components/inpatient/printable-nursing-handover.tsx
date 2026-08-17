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
  buildDemoNursingFluidSummary,
  readDemoInpatientAdmissions,
  readDemoInpatientBeds,
  readDemoInpatientWards,
  readDemoNursingHandovers,
  readDemoNursingMedicationAdministrations,
  readDemoNursingVitalObservations,
} from "@/lib/inpatient";

import type {
  DemoInpatientAdmission,
  DemoInpatientBed,
  DemoInpatientWard,
  DemoNursingHandover,
  DemoNursingMedicationAdministration,
  DemoNursingVitalObservation,
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

interface PrintableHandoverContentProps {
  admissionId: string;

  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function PrintableHandoverContent({
  admissionId,
  branches,
  practitioners,
}: PrintableHandoverContentProps) {
  const [
    admission,
    setAdmission,
  ] = useState<
    DemoInpatientAdmission |
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
    bed,
    setBed,
  ] = useState<
    DemoInpatientBed |
    undefined
  >();

  const [
    ward,
    setWard,
  ] = useState<
    DemoInpatientWard |
    undefined
  >();

  const [
    handover,
    setHandover,
  ] = useState<
    DemoNursingHandover |
    undefined
  >();

  const [
    latestVital,
    setLatestVital,
  ] = useState<
    DemoNursingVitalObservation |
    undefined
  >();

  const [
    medications,
    setMedications,
  ] = useState<
    DemoNursingMedicationAdministration[]
  >([]);

  const loadReport =
    useCallback(() => {
      const loadedAdmission =
        readDemoInpatientAdmissions()
          .find(
            (record) =>
              record.id ===
              admissionId,
          );

      setAdmission(
        loadedAdmission,
      );

      if (
        loadedAdmission ===
        undefined
      ) {
        setPatient(undefined);
        setBed(undefined);
        setWard(undefined);
        setHandover(undefined);
        setLatestVital(undefined);
        setMedications([]);

        return;
      }

      const loadedBed =
        readDemoInpatientBeds()
          .find(
            (record) =>
              record.id ===
              loadedAdmission.currentBedId,
          );

      setPatient(
        readDemoPatientRegistrations()
          .find(
            (record) =>
              record.id ===
              loadedAdmission.patientId,
          ),
      );

      setBed(loadedBed);

      setWard(
        loadedBed === undefined
          ? undefined
          : readDemoInpatientWards()
              .find(
                (record) =>
                  record.id ===
                  loadedBed.wardId,
              ),
      );

      setHandover(
        readDemoNursingHandovers()
          .filter(
            (record) =>
              record.admissionId ===
              loadedAdmission.id,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.completedAt ||
                  right.updatedAt,
              ).getTime() -
              new Date(
                left.completedAt ||
                  left.updatedAt,
              ).getTime(),
          )[0],
      );

      setLatestVital(
        readDemoNursingVitalObservations()
          .filter(
            (record) =>
              record.admissionId ===
              loadedAdmission.id,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.observedAt,
              ).getTime() -
              new Date(
                left.observedAt,
              ).getTime(),
          )[0],
      );

      setMedications(
        readDemoNursingMedicationAdministrations()
          .filter(
            (record) =>
              record.admissionId ===
              loadedAdmission.id,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                left.scheduledAt,
              ).getTime() -
              new Date(
                right.scheduledAt,
              ).getTime(),
          ),
      );
    }, [admissionId]);

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
    admission === undefined ||
    patient === undefined ||
    handover === undefined
  ) {
    return (
      <WonFlowErrorState
        description="The inpatient admission or nursing handover could not be loaded."
        title="Nursing handover unavailable"
      />
    );
  }

  const fluidSummary =
    buildDemoNursingFluidSummary(
      admission.id,
    );

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href="/operations/inpatient/nursing"
        >
          Return to Nursing Station
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
          Print Nursing Handover
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
                Inpatient Nursing Handover
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Handover Number
            </div>

            <div className="mt-1 font-mono text-sm font-bold">
              {
                handover.handoverNumber
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
            label="Admission"
            value={
              admission.admissionNumber
            }
          />

          <ReportField
            label="Branch"
            value={
              branchesById.get(
                admission.branchId,
              )?.name ??
              "Unknown branch"
            }
          />

          <ReportField
            label="Ward"
            value={
              ward?.wardName ??
              "Unknown ward"
            }
          />

          <ReportField
            label="Bed"
            value={
              bed?.bedLabel ??
              "Unknown bed"
            }
          />

          <ReportField
            label="Admitting Doctor"
            value={
              practitionersById.get(
                admission.practitionerId,
              )?.displayName ??
              "Unknown doctor"
            }
          />

          <ReportField
            label="Shift"
            value={humanizeValue(
              handover.shift,
            )}
          />

          <ReportField
            label="Outgoing Nurse"
            value={
              handover.fromNurse
            }
          />

          <ReportField
            label="Incoming Nurse"
            value={
              handover.toNurse
            }
          />

          <ReportField
            label="Handover Status"
            value={humanizeValue(
              handover.status,
            )}
          />

          <ReportField
            label="Completed"
            value={
              handover.completedAt
                ? formatWonFlowDashboardDateTime(
                    handover.completedAt,
                  )
                : "Draft"
            }
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <HandoverSection
            label="Situation"
            value={
              handover.situation
            }
          />

          <HandoverSection
            label="Background"
            value={
              handover.background
            }
          />

          <HandoverSection
            label="Assessment"
            value={
              handover.assessment
            }
          />

          <HandoverSection
            label="Recommendation"
            value={
              handover.recommendation
            }
          />

          <HandoverSection
            label="Safety Risks"
            value={
              handover.safetyRisks
            }
          />

          <HandoverSection
            label="Pending Tasks"
            value={
              handover.pendingTasks
            }
          />
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Latest Vital Signs
          </h2>

          {latestVital ===
          undefined ? (
            <p className="mt-3 text-sm text-slate-500">
              No vital-sign observation was recorded.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <ReportField
                label="Temperature"
                value={`${latestVital.temperatureCelsius}°C`}
              />

              <ReportField
                label="Pulse"
                value={`${latestVital.pulsePerMinute}/min`}
              />

              <ReportField
                label="Respiratory Rate"
                value={`${latestVital.respiratoryRatePerMinute}/min`}
              />

              <ReportField
                label="Blood Pressure"
                value={`${latestVital.systolicBloodPressure}/${latestVital.diastolicBloodPressure}`}
              />

              <ReportField
                label="SpO₂"
                value={`${latestVital.oxygenSaturationPercent}%`}
              />

              <ReportField
                label="Pain Score"
                value={`${latestVital.painScore}/10`}
              />

              <ReportField
                label="Clinical Alert"
                value={humanizeValue(
                  latestVital.alertLevel,
                )}
              />

              <ReportField
                label="Recorded By"
                value={
                  latestVital.recordedBy
                }
              />
            </div>
          )}
        </section>

        <section className="mt-6 grid grid-cols-3 gap-4">
          <ReportAmount
            label="24h Intake"
            value={
              fluidSummary.intakeMillilitres
            }
          />

          <ReportAmount
            label="24h Output"
            value={
              fluidSummary.outputMillilitres
            }
          />

          <ReportAmount
            label="Net Balance"
            value={
              fluidSummary.netBalanceMillilitres
            }
          />
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Medication Administration
          </h2>

          {medications.length ===
          0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No medication-administration record was found.
            </p>
          ) : (
            <table className="mt-3 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100">
                  <th className="px-3 py-3">
                    Medicine
                  </th>

                  <th className="px-3 py-3">
                    Dose
                  </th>

                  <th className="px-3 py-3">
                    Route
                  </th>

                  <th className="px-3 py-3">
                    Scheduled
                  </th>

                  <th className="px-3 py-3">
                    Status
                  </th>

                  <th className="px-3 py-3">
                    Nurse
                  </th>
                </tr>
              </thead>

              <tbody>
                {medications.map(
                  (medication) => (
                    <tr
                      className="border-b border-slate-200"
                      key={
                        medication.id
                      }
                    >
                      <td className="px-3 py-3 font-bold">
                        {
                          medication.medicineName
                        }
                      </td>

                      <td className="px-3 py-3">
                        {
                          medication.dose
                        }
                      </td>

                      <td className="px-3 py-3">
                        {humanizeValue(
                          medication.route,
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {formatWonFlowDashboardDateTime(
                          medication.scheduledAt,
                        )}
                      </td>

                      <td className="px-3 py-3 font-bold">
                        {humanizeValue(
                          medication.status,
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {medication.actionedBy ||
                          "Pending"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          )}
        </section>

        <footer className="mt-12 grid grid-cols-2 gap-12 border-t border-slate-300 pt-8 text-xs">
          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Outgoing Nurse
            </div>
          </div>

          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Incoming Nurse
            </div>
          </div>
        </footer>

        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">
          Demonstration nursing handover only. Production nursing documentation requires authenticated staff, approved clinical scoring and immutable audit records.
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

function HandoverSection({
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

function ReportAmount({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="text-[10px] font-black uppercase tracking-wide text-blue-600">
        {label}
      </div>

      <div className="mt-2 text-xl font-black text-blue-950">
        {value.toLocaleString(
          "en-US",
        )}
        {" mL"}
      </div>
    </div>
  );
}

interface PrintableNursingHandoverProps {
  admissionId: string;
}

export function PrintableNursingHandover({
  admissionId,
}: PrintableNursingHandoverProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        `printable-nursing-handover:${admissionId}`,

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
                  limit: 150,
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
      emptyTitle="Nursing handover unavailable"
      loadingDescription="WonFlow is preparing the printable nursing handover."
      loadingTitle="Preparing nursing handover"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <PrintableHandoverContent
          admissionId={
            admissionId
          }
          branches={
            directory.branches
          }
          practitioners={
            directory.practitioners
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}