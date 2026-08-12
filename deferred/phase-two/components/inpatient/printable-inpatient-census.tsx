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
} from "@/components/feedback";

import {
  WonFlowActionButton,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  buildDemoInpatientCensusSummary,
  initializeDemoInpatientDirectory,
  readDemoInpatientAdmissions,
  readDemoInpatientBeds,
  readDemoInpatientWards,
} from "@/lib/inpatient";

import type {
  DemoInpatientAdmission,
  DemoInpatientBed,
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

interface PrintableCensusContentProps {
  branches:
    readonly MockBranch[];

  practitioners:
    readonly MockPractitioner[];
}

function PrintableCensusContent({
  branches,
  practitioners,
}: PrintableCensusContentProps) {
  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    wards,
    setWards,
  ] = useState<
    DemoInpatientWard[]
  >([]);

  const [
    beds,
    setBeds,
  ] = useState<
    DemoInpatientBed[]
  >([]);

  const [
    admissions,
    setAdmissions,
  ] = useState<
    DemoInpatientAdmission[]
  >([]);

  const loadCensus =
    useCallback(() => {
      initializeDemoInpatientDirectory(
        branches.map(
          (branch) => ({
            id: branch.id,
            name: branch.name,
          }),
        ),
      );

      setPatients(
        readDemoPatientRegistrations(),
      );

      setWards(
        readDemoInpatientWards(),
      );

      setBeds(
        readDemoInpatientBeds(),
      );

      setAdmissions(
        readDemoInpatientAdmissions(),
      );
    }, [branches]);

  useEffect(() => {
    queueMicrotask(
      loadCensus,
    );
  }, [loadCensus]);

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

  const wardsById =
    useMemo(
      () =>
        new Map(
          wards.map(
            (ward) => [
              ward.id,
              ward,
            ],
          ),
        ),
      [wards],
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

  const activeAdmissions =
    admissions
      .filter(
        (admission) =>
          admission.status ===
            "admitted" ||
          admission.status ===
            "discharge-ready",
      )
      .sort(
        (
          left,
          right,
        ) =>
          new Date(
            left.admittedAt,
          ).getTime() -
          new Date(
            right.admittedAt,
          ).getTime(),
      );

  const summary =
    buildDemoInpatientCensusSummary();

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href="/operations/inpatient/wards"
        >
          Return to Ward Management
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
          Print Inpatient Census
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
                Inpatient Ward Census
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Census Generated
            </div>

            <div className="mt-1 text-xs font-bold">
              {formatWonFlowDashboardDateTime(
                new Date().toISOString(),
              )}
            </div>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <CensusValue
            label="Total Beds"
            value={
              summary.totalBeds
            }
          />

          <CensusValue
            label="Occupied Beds"
            value={
              summary.occupiedBeds
            }
          />

          <CensusValue
            label="Available Beds"
            value={
              summary.availableBeds
            }
          />

          <CensusValue
            label="Occupancy Rate"
            suffix="%"
            value={
              summary.occupancyRate
            }
          />

          <CensusValue
            label="Cleaning Beds"
            value={
              summary.cleaningBeds
            }
          />

          <CensusValue
            label="Maintenance Beds"
            value={
              summary.maintenanceBeds
            }
          />

          <CensusValue
            label="Active Inpatients"
            value={
              summary.admittedPatients
            }
          />

          <CensusValue
            label="Discharge Ready"
            value={
              summary.dischargeReadyPatients
            }
          />
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Current Inpatients
          </h2>

          {activeAdmissions.length ===
          0 ? (
            <div className="mt-3 rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
              No active inpatient admission is currently recorded.
            </div>
          ) : (
            <table className="mt-3 w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100">
                  <th className="px-2 py-3">
                    Patient
                  </th>

                  <th className="px-2 py-3">
                    MR Number
                  </th>

                  <th className="px-2 py-3">
                    Admission
                  </th>

                  <th className="px-2 py-3">
                    Branch
                  </th>

                  <th className="px-2 py-3">
                    Ward
                  </th>

                  <th className="px-2 py-3">
                    Bed
                  </th>

                  <th className="px-2 py-3">
                    Doctor
                  </th>

                  <th className="px-2 py-3">
                    Diagnosis
                  </th>

                  <th className="px-2 py-3">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {activeAdmissions.map(
                  (admission) => {
                    const patient =
                      patientsById.get(
                        admission.patientId,
                      );

                    const bed =
                      beds.find(
                        (record) =>
                          record.id ===
                          admission.currentBedId,
                      );

                    const ward =
                      bed === undefined
                        ? undefined
                        : wardsById.get(
                            bed.wardId,
                          );

                    return (
                      <tr
                        className="border-b border-slate-200"
                        key={admission.id}
                      >
                        <td className="px-2 py-3 font-bold">
                          {patient?.displayName ??
                            "Unknown patient"}
                        </td>

                        <td className="px-2 py-3">
                          {patient?.mrNumber ??
                            "No MR"}
                        </td>

                        <td className="px-2 py-3">
                          <div className="font-mono font-bold">
                            {
                              admission.admissionNumber
                            }
                          </div>

                          <div className="mt-1 text-[9px] text-slate-500">
                            {formatWonFlowDashboardDateTime(
                              admission.admittedAt,
                            )}
                          </div>
                        </td>

                        <td className="px-2 py-3">
                          {branchesById.get(
                            admission.branchId,
                          )?.name ??
                            "Unknown branch"}
                        </td>

                        <td className="px-2 py-3">
                          {ward?.wardName ??
                            "Unknown ward"}
                        </td>

                        <td className="px-2 py-3 font-bold">
                          {bed?.bedLabel ??
                            "Unknown bed"}
                        </td>

                        <td className="px-2 py-3">
                          {practitionersById.get(
                            admission.practitionerId,
                          )?.displayName ??
                            "Unknown doctor"}
                        </td>

                        <td className="px-2 py-3">
                          {
                            admission.provisionalDiagnosis
                          }
                        </td>

                        <td className="px-2 py-3">
                          {humanizeValue(
                            admission.status,
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          )}
        </section>

        <footer className="mt-12 grid grid-cols-2 gap-12 border-t border-slate-300 pt-8 text-xs">
          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Nursing Supervisor
            </div>
          </div>

          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Hospital Operations Manager
            </div>
          </div>
        </footer>

        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">
          Demonstration inpatient census only. Production census information requires authenticated staff, real-time bed locking and complete clinical auditing.
        </p>
      </article>
    </div>
  );
}

function CensusValue({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
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
        {suffix}
      </div>
    </div>
  );
}

export function PrintableInpatientCensus() {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "printable-inpatient-census",

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
      emptyTitle="Inpatient census unavailable"
      loadingDescription="WonFlow is preparing the printable inpatient census."
      loadingTitle="Preparing inpatient census"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(directory) => (
        <PrintableCensusContent
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