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
  WonFlowErrorState,
} from "@/components/feedback";

import {
  WonFlowActionButton,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  readDemoBloodComponents,
  readDemoBloodCrossmatches,
  readDemoBloodDonations,
  readDemoBloodDonors,
  readDemoBloodTransfusions,
} from "@/lib/blood-bank";

import type {
  DemoBloodComponent,
  DemoBloodCrossmatch,
  DemoBloodDonation,
  DemoBloodDonor,
  DemoBloodTransfusion,
} from "@/lib/blood-bank";

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
  transfusionId: string;

  branches:
    readonly MockBranch[];
}

function TraceabilityContent({
  transfusionId,
  branches,
}: TraceabilityContentProps) {
  const [
    transfusion,
    setTransfusion,
  ] = useState<
    DemoBloodTransfusion |
    undefined
  >();

  const [
    crossmatch,
    setCrossmatch,
  ] = useState<
    DemoBloodCrossmatch |
    undefined
  >();

  const [
    component,
    setComponent,
  ] = useState<
    DemoBloodComponent |
    undefined
  >();

  const [
    donation,
    setDonation,
  ] = useState<
    DemoBloodDonation |
    undefined
  >();

  const [
    donor,
    setDonor,
  ] = useState<
    DemoBloodDonor |
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
      const loadedTransfusion =
        readDemoBloodTransfusions()
          .find(
            (record) =>
              record.id ===
              transfusionId,
          );

      setTransfusion(
        loadedTransfusion,
      );

      if (
        loadedTransfusion ===
        undefined
      ) {
        setCrossmatch(undefined);
        setComponent(undefined);
        setDonation(undefined);
        setDonor(undefined);
        setPatient(undefined);

        return;
      }

      const loadedCrossmatch =
        readDemoBloodCrossmatches()
          .find(
            (record) =>
              record.id ===
              loadedTransfusion.crossmatchId,
          );

      const loadedComponent =
        readDemoBloodComponents()
          .find(
            (record) =>
              record.id ===
              loadedTransfusion.componentId,
          );

      setCrossmatch(
        loadedCrossmatch,
      );

      setComponent(
        loadedComponent,
      );

      setPatient(
        readDemoPatientRegistrations()
          .find(
            (record) =>
              record.id ===
              loadedTransfusion.patientId,
          ),
      );

      if (
        loadedComponent ===
        undefined
      ) {
        setDonation(undefined);
        setDonor(undefined);

        return;
      }

      const loadedDonation =
        readDemoBloodDonations()
          .find(
            (record) =>
              record.id ===
              loadedComponent.donationId,
          );

      setDonation(
        loadedDonation,
      );

      setDonor(
        readDemoBloodDonors()
          .find(
            (record) =>
              record.id ===
              loadedComponent.donorId,
          ),
      );
    }, [transfusionId]);

  useEffect(() => {
    queueMicrotask(
      loadReport,
    );
  }, [loadReport]);

  const branchesById =
    useMemo(
      () =>
        new Map<
          string,
          MockBranch
        >(
          branches.map(
            (branch) => [
              branch.id,
              branch,
            ] as const,
          ),
        ),
      [branches],
    );

  if (
    transfusion === undefined ||
    crossmatch === undefined ||
    component === undefined ||
    donation === undefined ||
    donor === undefined ||
    patient === undefined
  ) {
    return (
      <WonFlowErrorState
        description="The transfusion, patient, blood unit or donation record could not be loaded."
        title="Transfusion report unavailable"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href="/operations/blood-bank"
        >
          Return to Blood Bank
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
                Blood Component and Transfusion Traceability Report
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Transfusion Number
            </div>

            <div className="mt-1 font-mono text-sm font-bold">
              {
                transfusion.transfusionNumber
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
            label="Hospital Branch"
            value={
              branchesById.get(
                transfusion.branchId,
              )?.name ??
              "Unknown branch"
            }
          />

          <ReportField
            label="Admission"
            value={
              transfusion.admissionId ||
              "Outpatient / unlinked"
            }
          />

          <ReportField
            label="Crossmatch"
            value={
              crossmatch.crossmatchNumber
            }
          />

          <ReportField
            label="Clinical Indication"
            value={
              crossmatch.clinicalIndication
            }
          />

          <ReportField
            label="Requested By"
            value={
              crossmatch.requestedBy
            }
          />

          <ReportField
            label="Tested By"
            value={
              crossmatch.testedBy
            }
          />
        </section>

        <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">
            Blood Component
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ReportField
              label="Unit Number"
              value={
                component.unitNumber
              }
            />

            <ReportField
              label="Component"
              value={humanizeValue(
                component.componentType,
              )}
            />

            <ReportField
              label="Blood Group"
              value={
                component.bloodGroup
              }
            />

            <ReportField
              label="Volume"
              value={`${component.volumeMillilitres} mL`}
            />

            <ReportField
              label="Expiry Date"
              value={
                component.expiryDate
              }
            />

            <ReportField
              label="Storage Location"
              value={
                component.storageLocation
              }
            />

            <ReportField
              label="Prepared By"
              value={
                component.preparedBy
              }
            />

            <ReportField
              label="Issued By"
              value={
                crossmatch.issuedBy
              }
            />
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Donation Traceability
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ReportField
              label="Donation Number"
              value={
                donation.donationNumber
              }
            />

            <ReportField
              label="Blood Bag"
              value={
                donation.bloodBagNumber
              }
            />

            <ReportField
              label="Donor Number"
              value={
                donor.donorNumber
              }
            />

            <ReportField
              label="Donor Blood Group"
              value={
                donor.bloodGroup
              }
            />

            <ReportField
              label="Screened By"
              value={
                donation.screenedBy
              }
            />

            <ReportField
              label="Collected By"
              value={
                donation.collectedBy
              }
            />

            <ReportField
              label="Collected At"
              value={formatWonFlowDashboardDateTime(
                donation.collectedAt,
              )}
            />

            <ReportField
              label="Collection Volume"
              value={`${donation.volumeMillilitres} mL`}
            />
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
            Transfusion Record
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ReportField
              label="Status"
              value={humanizeValue(
                transfusion.status,
              )}
            />

            <ReportField
              label="Started By"
              value={
                transfusion.startedBy
              }
            />

            <ReportField
              label="Started At"
              value={formatWonFlowDashboardDateTime(
                transfusion.startedAt,
              )}
            />

            <ReportField
              label="Ended By"
              value={
                transfusion.endedBy
              }
            />

            <ReportField
              label="Ended At"
              value={formatWonFlowDashboardDateTime(
                transfusion.endedAt,
              )}
            />

            <ReportField
              label="Identity Verified"
              value={
                transfusion.patientIdentityVerified
                  ? "Yes"
                  : "No"
              }
            />

            <ReportField
              label="Unit Verified"
              value={
                transfusion.bloodUnitVerified
                  ? "Yes"
                  : "No"
              }
            />

            <ReportField
              label="Consent Confirmed"
              value={
                transfusion.consentConfirmed
                  ? "Yes"
                  : "No"
              }
            />
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <ClinicalSection
            label="Baseline Observations"
            value={
              transfusion.baselineVitals
            }
          />

          <ClinicalSection
            label="Final Observations"
            value={
              transfusion.observationNote
            }
          />

          <ClinicalSection
            label="Reaction Severity"
            value={humanizeValue(
              transfusion.reactionSeverity,
            )}
          />

          <ClinicalSection
            label="Reaction Description"
            value={
              transfusion.reactionDescription ||
              "No transfusion reaction recorded"
            }
          />

          <ClinicalSection
            label="Clinical Action"
            value={
              transfusion.reactionAction ||
              "No reaction treatment required"
            }
          />

          <ClinicalSection
            label="Compatibility Note"
            value={
              crossmatch.compatibilityNote
            }
          />
        </section>

        <footer className="mt-12 grid grid-cols-3 gap-10 border-t border-slate-300 pt-8 text-xs">
          <SignatureLine label="Blood Bank Officer" />

          <SignatureLine label="Transfusion Nurse" />

          <SignatureLine label="Responsible Doctor" />
        </footer>

        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">
          Demonstration traceability report only. Production blood-bank operation requires approved clinical protocols, authenticated staff, laboratory integration and immutable audit history.
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

interface PrintableTransfusionTraceabilityReportProps {
  transfusionId: string;
}

export function PrintableTransfusionTraceabilityReport({
  transfusionId,
}: PrintableTransfusionTraceabilityReportProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directory =
    useWonFlowAsyncData({
      key:
        `blood-transfusion-report:${transfusionId}`,

      loader:
        async (
          signal,
        ) => {
          const branches =
            await hospitalService
              .listBranches(
                signal,
              );

          return {
            branches,
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
      emptyTitle="Transfusion report unavailable"
      loadingDescription="WonFlow is preparing the blood-component and transfusion traceability report."
      loadingTitle="Preparing transfusion report"
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
          transfusionId={
            transfusionId
          }
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}