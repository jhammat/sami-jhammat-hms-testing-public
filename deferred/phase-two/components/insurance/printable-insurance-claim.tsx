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
  readDemoInsuranceClaims,
  readDemoInsurancePolicies,
  readDemoInsurers,
} from "@/lib/insurance";

import type {
  DemoInsuranceClaim,
  DemoInsurancePolicy,
  DemoInsurer,
} from "@/lib/insurance";

import {
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import {
  formatWonFlowDashboardDateTime,
} from "@/lib/dashboard";

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    },
  ).format(value);
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

interface PrintableInsuranceClaimContentProps {
  claimId: string;

  branches:
    readonly MockBranch[];
}

function PrintableInsuranceClaimContent({
  claimId,
  branches,
}: PrintableInsuranceClaimContentProps) {
  const [
    claim,
    setClaim,
  ] = useState<
    DemoInsuranceClaim |
    undefined
  >();

  const [
    policy,
    setPolicy,
  ] = useState<
    DemoInsurancePolicy |
    undefined
  >();

  const [
    insurer,
    setInsurer,
  ] = useState<
    DemoInsurer |
    undefined
  >();

  const [
    patient,
    setPatient,
  ] = useState<
    DemoPatientRegistrationResult |
    undefined
  >();

  const loadClaim =
    useCallback(() => {
      const loadedClaim =
        readDemoInsuranceClaims()
          .find(
            (record) =>
              record.id ===
              claimId,
          );

      setClaim(
        loadedClaim,
      );

      if (
        loadedClaim ===
        undefined
      ) {
        setPolicy(undefined);
        setInsurer(undefined);
        setPatient(undefined);

        return;
      }

      setPolicy(
        readDemoInsurancePolicies()
          .find(
            (record) =>
              record.id ===
              loadedClaim.policyId,
          ),
      );

      setInsurer(
        readDemoInsurers()
          .find(
            (record) =>
              record.id ===
              loadedClaim.insurerId,
          ),
      );

      setPatient(
        readDemoPatientRegistrations()
          .find(
            (record) =>
              record.id ===
              loadedClaim.patientId,
          ),
      );
    }, [claimId]);

  useEffect(() => {
    queueMicrotask(
      loadClaim,
    );
  }, [loadClaim]);

  if (
    claim === undefined ||
    policy === undefined ||
    insurer === undefined ||
    patient === undefined
  ) {
    return (
      <WonFlowErrorState
        description="The requested insurance claim could not be loaded."
        title="Insurance claim unavailable"
      />
    );
  }

  const branch =
    branches.find(
      (record) =>
        record.id ===
        claim.branchId,
    );

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href="/operations/insurance"
        >
          Return to Insurance Claims
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
          Print Claim Summary
        </WonFlowActionButton>
      </div>

      <article className="wf-print-report mx-auto max-w-[950px] bg-white p-8 text-slate-950 shadow-sm print:shadow-none">
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
                Insurance Claim Summary
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Claim Number
            </div>

            <div className="mt-1 font-mono text-sm font-bold">
              {claim.claimNumber}
            </div>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 rounded-xl border border-slate-200 p-5 text-sm lg:grid-cols-4">
          <ClaimField
            label="Patient"
            value={
              patient.displayName
            }
          />

          <ClaimField
            label="MR Number"
            value={
              patient.mrNumber
            }
          />

          <ClaimField
            label="CNIC / B-Form"
            value={
              patient.draft
                .cnicNumber
            }
          />

          <ClaimField
            label="Hospital Branch"
            value={
              branch?.name ??
              "Unknown branch"
            }
          />

          <ClaimField
            label="Insurance Company"
            value={
              insurer.insurerName
            }
          />

          <ClaimField
            label="Policy Number"
            value={
              policy.policyNumber
            }
          />

          <ClaimField
            label="Member Number"
            value={
              policy.memberNumber
            }
          />

          <ClaimField
            label="Plan"
            value={
              policy.planName
            }
          />

          <ClaimField
            label="Invoice"
            value={
              claim.invoiceNumber
            }
          />

          <ClaimField
            label="Encounter"
            value={
              claim.encounterId ||
              "Not linked"
            }
          />

          <ClaimField
            label="Claim Status"
            value={humanizeValue(
              claim.status,
            )}
          />

          <ClaimField
            label="Submitted"
            value={
              claim.submittedAt
                ? formatWonFlowDashboardDateTime(
                    claim.submittedAt,
                  )
                : "Not submitted"
            }
          />
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AmountCard
            label="Invoice Amount"
            value={
              claim.invoiceAmount
            }
          />

          <AmountCard
            label="Expected Insurer"
            value={
              claim.expectedInsurerAmount
            }
          />

          <AmountCard
            label="Approved Amount"
            value={
              claim.approvedAmount
            }
          />

          <AmountCard
            label="Patient Responsibility"
            value={
              claim.patientResponsibility
            }
          />
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Authorization
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-5 lg:grid-cols-4">
            <ClaimField
              label="Required"
              value={
                claim.authorizationRequired
                  ? "Yes"
                  : "No"
              }
            />

            <ClaimField
              label="Status"
              value={humanizeValue(
                claim.authorizationStatus,
              )}
            />

            <ClaimField
              label="Authorization Number"
              value={
                claim.authorizationNumber ||
                "Not issued"
              }
            />

            <ClaimField
              label="Decision Date"
              value={
                claim.authorizationDecidedAt
                  ? formatWonFlowDashboardDateTime(
                      claim.authorizationDecidedAt,
                    )
                  : "Not decided"
              }
            />
          </div>

          {claim.authorizationNote ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {
                claim.authorizationNote
              }
            </p>
          ) : null}
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Insurer Response
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-5 lg:grid-cols-4">
            <ClaimField
              label="Reviewer"
              value={
                claim.insurerReviewer ||
                "Not assigned"
              }
            />

            <ClaimField
              label="Approved Amount"
              value={formatCurrency(
                claim.approvedAmount,
              )}
            />

            <ClaimField
              label="Rejected Amount"
              value={formatCurrency(
                claim.rejectedAmount,
              )}
            />

            <ClaimField
              label="Payment Received"
              value={formatCurrency(
                claim.paidAmount,
              )}
            />
          </div>

          {claim.insurerResponseNote ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {
                claim.insurerResponseNote
              }
            </p>
          ) : null}
        </section>

        {claim.paymentReference ? (
          <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Insurance Payment Reference
            </div>

            <div className="mt-2 font-mono text-sm font-bold text-emerald-950">
              {
                claim.paymentReference
              }
            </div>

            <div className="mt-2 text-xs text-emerald-700">
              Recorded by:
              {" "}
              {
                claim.paymentRecordedBy
              }
            </div>
          </section>
        ) : null}

        <footer className="mt-12 grid grid-cols-3 gap-10 border-t border-slate-300 pt-8 text-xs">
          <SignatureField label="Hospital Claims Officer" />
          <SignatureField label="Insurance Representative" />
          <SignatureField label="Patient / Representative" />
        </footer>

        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">
          Demonstration insurance claim only. Production claims require authenticated staff, verified policy eligibility, insurer integration and complete financial auditing.
        </p>
      </article>
    </div>
  );
}

function ClaimField({
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

function AmountCard({
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

      <div className="mt-2 text-lg font-black text-blue-950">
        {formatCurrency(value)}
      </div>
    </div>
  );
}

function SignatureField({
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

interface PrintableInsuranceClaimProps {
  claimId: string;
}

export function PrintableInsuranceClaim({
  claimId,
}: PrintableInsuranceClaimProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const branches =
    useWonFlowAsyncData({
      key:
        `insurance-claim-print:${claimId}`,

      loader:
        (
          signal,
        ) =>
          hospitalService.listBranches(
            signal,
          ),

      isEmpty:
        (records) =>
          records.length === 0,
    });

  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital branch information is unavailable."
      emptyTitle="Insurance claim unavailable"
      loadingDescription="WonFlow is preparing the printable insurance claim."
      loadingTitle="Preparing insurance claim"
      onRetry={
        branches.reload
      }
      state={branches}
    >
      {(records) => (
        <PrintableInsuranceClaimContent
          branches={records}
          claimId={claimId}
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}