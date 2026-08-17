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
  getActiveDemoInpatientDoctorDischargeOrder,
  readDemoInpatientAdmissions,
  readDemoInpatientBeds,
  readDemoInpatientDoctorRounds,
  readDemoInpatientWards,
  readDemoNursingVitalObservations,
} from "@/lib/inpatient";

import type {
  DemoInpatientAdmission,
  DemoInpatientBed,
  DemoInpatientDoctorDischargeOrder,
  DemoInpatientDoctorRound,
  DemoInpatientWard,
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

interface PrintableProgressNoteContentProps {
  admissionId: string;

  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function PrintableProgressNoteContent({
  admissionId,
  branches,
  practitioners,
}: PrintableProgressNoteContentProps) {
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
    progressNote,
    setProgressNote,
  ] = useState<
    DemoInpatientDoctorRound |
    undefined
  >();

  const [
    dischargeOrder,
    setDischargeOrder,
  ] = useState<
    DemoInpatientDoctorDischargeOrder |
    undefined
  >();

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
        setProgressNote(undefined);
        setDischargeOrder(undefined);

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

      setProgressNote(
        readDemoInpatientDoctorRounds()
          .filter(
            (round) =>
              round.admissionId ===
                loadedAdmission.id &&
              round.status ===
                "finalized",
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.finalizedAt,
              ).getTime() -
              new Date(
                left.finalizedAt,
              ).getTime(),
          )[0],
      );

      setDischargeOrder(
        getActiveDemoInpatientDoctorDischargeOrder(
          loadedAdmission.id,
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
    progressNote === undefined
  ) {
    return (
      <WonFlowErrorState
        description="The admission or finalized inpatient progress note could not be loaded."
        title="Progress note unavailable"
      />
    );
  }

  const latestVital =
    readDemoNursingVitalObservations()
      .filter(
        (observation) =>
          observation.admissionId ===
          admission.id,
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
      )[0];

  const fluidSummary =
    buildDemoNursingFluidSummary(
      admission.id,
    );

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href="/doctor/inpatients"
        >
          Return to Inpatient Rounds
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
          Print Progress Note
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
                Inpatient Doctor Progress Note
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Round Number
            </div>

            <div className="mt-1 font-mono text-sm font-bold">
              {
                progressNote.roundNumber
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
            label="Doctor"
            value={
              practitionersById.get(
                progressNote.practitionerId,
              )?.displayName ??
              "Unknown doctor"
            }
          />

          <ReportField
            label="Round Type"
            value={humanizeValue(
              progressNote.roundType,
            )}
          />

          <ReportField
            label="Round Date"
            value={
              progressNote.roundDate
            }
          />

          <ReportField
            label="Escalation"
            value={humanizeValue(
              progressNote.escalationLevel,
            )}
          />

          <ReportField
            label="Finalized"
            value={formatWonFlowDashboardDateTime(
              progressNote.finalizedAt,
            )}
          />

          <ReportField
            label="Next Review"
            value={
              progressNote.nextReviewAt
                ? formatWonFlowDashboardDateTime(
                    progressNote.nextReviewAt,
                  )
                : "As clinically required"
            }
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <ClinicalSection
            label="Subjective"
            value={
              progressNote.subjective
            }
          />

          <ClinicalSection
            label="Objective"
            value={
              progressNote.objective
            }
          />

          <ClinicalSection
            label="Assessment"
            value={
              progressNote.assessment
            }
          />

          <ClinicalSection
            label="Plan"
            value={
              progressNote.plan
            }
          />

          <ClinicalSection
            label="Examination Summary"
            value={
              progressNote.examinationSummary
            }
          />

          <ClinicalSection
            label="Treatment Plan"
            value={
              progressNote.treatmentPlan
            }
          />
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Diagnoses
          </h2>

          <table className="mt-3 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100">
                <th className="px-3 py-3">
                  Diagnosis
                </th>

                <th className="px-3 py-3">
                  Code
                </th>

                <th className="px-3 py-3">
                  Category
                </th>

                <th className="px-3 py-3">
                  Status
                </th>

                <th className="px-3 py-3">
                  Primary
                </th>
              </tr>
            </thead>

            <tbody>
              {progressNote.diagnoses.map(
                (diagnosis) => (
                  <tr
                    className="border-b border-slate-200"
                    key={
                      diagnosis.id
                    }
                  >
                    <td className="px-3 py-3 font-bold">
                      {
                        diagnosis.diagnosis
                      }
                    </td>

                    <td className="px-3 py-3 font-mono">
                      {diagnosis.diagnosisCode ||
                        "—"}
                    </td>

                    <td className="px-3 py-3">
                      {humanizeValue(
                        diagnosis.category,
                      )}
                    </td>

                    <td className="px-3 py-3">
                      {humanizeValue(
                        diagnosis.status,
                      )}
                    </td>

                    <td className="px-3 py-3">
                      {diagnosis.isPrimary
                        ? "Yes"
                        : "No"}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Treatment Orders
          </h2>

          {progressNote
            .treatmentOrders
            .length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No treatment order was recorded in this progress note.
            </p>
          ) : (
            <table className="mt-3 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100">
                  <th className="px-3 py-3">
                    Type
                  </th>

                  <th className="px-3 py-3">
                    Order
                  </th>

                  <th className="px-3 py-3">
                    Instructions
                  </th>

                  <th className="px-3 py-3">
                    Priority
                  </th>

                  <th className="px-3 py-3">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {progressNote
                  .treatmentOrders
                  .map(
                    (order) => (
                      <tr
                        className="border-b border-slate-200"
                        key={order.id}
                      >
                        <td className="px-3 py-3">
                          {humanizeValue(
                            order.orderType,
                          )}
                        </td>

                        <td className="px-3 py-3 font-bold">
                          {
                            order.orderName
                          }
                        </td>

                        <td className="px-3 py-3">
                          {
                            order.instructions
                          }
                        </td>

                        <td className="px-3 py-3">
                          {humanizeValue(
                            order.priority,
                          )}
                        </td>

                        <td className="px-3 py-3">
                          {humanizeValue(
                            order.status,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Latest Nursing Summary
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ReportField
              label="Vital Alert"
              value={
                latestVital ===
                undefined
                  ? "No observation"
                  : humanizeValue(
                      latestVital.alertLevel,
                    )
              }
            />

            <ReportField
              label="Blood Pressure"
              value={
                latestVital ===
                undefined
                  ? "Not recorded"
                  : `${latestVital.systolicBloodPressure}/${latestVital.diastolicBloodPressure}`
              }
            />

            <ReportField
              label="SpO₂"
              value={
                latestVital ===
                undefined
                  ? "Not recorded"
                  : `${latestVital.oxygenSaturationPercent}%`
              }
            />

            <ReportField
              label="24h Fluid Balance"
              value={`${fluidSummary.netBalanceMillilitres} mL`}
            />
          </div>
        </section>

        {dischargeOrder !==
        undefined ? (
          <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
              Doctor Discharge Order
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <ReportField
                label="Order Number"
                value={
                  dischargeOrder.orderNumber
                }
              />

              <ReportField
                label="Planned Date"
                value={
                  dischargeOrder.plannedDischargeDate
                }
              />

              <ReportField
                label="Final Diagnosis"
                value={
                  dischargeOrder.finalDiagnosis
                }
              />

              <ReportField
                label="Condition"
                value={
                  dischargeOrder.conditionAtDischarge
                }
              />
            </div>
          </section>
        ) : null}

        <footer className="mt-12 grid grid-cols-2 gap-12 border-t border-slate-300 pt-8 text-xs">
          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Responsible Doctor
            </div>
          </div>

          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Nursing Acknowledgement
            </div>
          </div>
        </footer>

        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">
          Demonstration inpatient progress note only. Production clinical notes require authenticated doctors, electronic signatures and immutable audit history.
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

interface PrintableInpatientProgressNoteProps {
  admissionId: string;
}

export function PrintableInpatientProgressNote({
  admissionId,
}: PrintableInpatientProgressNoteProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        `printable-inpatient-progress-note:${admissionId}`,

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
      emptyTitle="Progress note unavailable"
      loadingDescription="WonFlow is preparing the printable inpatient progress note."
      loadingTitle="Preparing progress note"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <PrintableProgressNoteContent
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