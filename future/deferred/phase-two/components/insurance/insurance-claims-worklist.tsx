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
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Search,
  ShieldCheck,
} from "lucide-react";

import type {
  MockBranch,
} from "@wonflow/mock-data";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";

import {
  WonFlowAsyncDataBoundary,
  WonFlowEmptyState,
} from "@/components/feedback";

import {
  WonFlowActionButton,
  WonFlowKpiCard,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  wonFlowInputClassName,
  wonFlowTextareaClassName,
} from "@/components/workflow";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  createDemoInsurancePolicy,
  decideDemoInsuranceAuthorization,
  initializeDemoInsurers,
  readDemoInsuranceClaims,
  readDemoInsurancePolicies,
  readDemoInsurers,
  recordDemoInsuranceClaimPayment,
  recordDemoInsuranceClaimResponse,
  requestDemoInsuranceAuthorization,
  startDemoInsuranceClaimReview,
  submitDemoInsuranceClaim,
  synchronizeDemoInsuranceClaimsFromInvoices,
  toggleDemoInsurancePolicyStatus,
  updateDemoInsuranceClaimAuthorizationRequirement,
  validateDemoInsurancePolicy,
} from "@/lib/insurance";

import type {
  DemoInsuranceClaim,
  DemoInsuranceClaimStatus,
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

type ClaimStatusFilter =
  | "all"
  | DemoInsuranceClaimStatus;

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

function getClaimStatusClassName(
  status:
    DemoInsuranceClaimStatus,
): string {
  switch (status) {
    case "draft":
      return "border-slate-200 bg-slate-100 text-slate-600";

    case "authorization-pending":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "authorized":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "authorization-denied":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "submitted":
    case "under-review":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "partially-approved":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "paid":
      return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }
}

interface InsuranceClaimsContentProps {
  branches:
    readonly MockBranch[];
}

function InsuranceClaimsContent({
  branches,
}: InsuranceClaimsContentProps) {
  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    insurers,
    setInsurers,
  ] = useState<
    DemoInsurer[]
  >([]);

  const [
    policies,
    setPolicies,
  ] = useState<
    DemoInsurancePolicy[]
  >([]);

  const [
    claims,
    setClaims,
  ] = useState<
    DemoInsuranceClaim[]
  >([]);

  const [
    policyPatientId,
    setPolicyPatientId,
  ] = useState("");

  const [
    policyInsurerId,
    setPolicyInsurerId,
  ] = useState("");

  const [
    memberNumber,
    setMemberNumber,
  ] = useState("");

  const [
    policyNumber,
    setPolicyNumber,
  ] = useState("");

  const [
    planName,
    setPlanName,
  ] = useState("");

  const [
    coveragePercent,
    setCoveragePercent,
  ] = useState(80);

  const [
    coPayPercent,
    setCoPayPercent,
  ] = useState(20);

  const [
    annualLimit,
    setAnnualLimit,
  ] = useState(500_000);

  const [
    effectiveFrom,
    setEffectiveFrom,
  ] = useState("");

  const [
    effectiveTo,
    setEffectiveTo,
  ] = useState("");

  const [
    policyErrors,
    setPolicyErrors,
  ] = useState<string[]>([]);

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    ClaimStatusFilter
  >("all");

  const [
    selectedClaimId,
    setSelectedClaimId,
  ] = useState("");

  const [
    staffName,
    setStaffName,
  ] = useState("");

  const [
    actionNote,
    setActionNote,
  ] = useState("");

  const [
    authorizationNumber,
    setAuthorizationNumber,
  ] = useState("");

  const [
    approvedAmount,
    setApprovedAmount,
  ] = useState("");

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState("");

  const [
    paymentReference,
    setPaymentReference,
  ] = useState("");

  const [
    actionMessage,
    setActionMessage,
  ] = useState<
    string |
    undefined
  >();

  const reloadLocalData =
    useCallback(() => {
      initializeDemoInsurers();

      setPatients(
        readDemoPatientRegistrations(),
      );

      setInsurers(
        readDemoInsurers(),
      );

      setPolicies(
        readDemoInsurancePolicies(),
      );

      setClaims(
        readDemoInsuranceClaims(),
      );
    }, []);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    const events = [
      "wonflow:demo-patients-changed",
      "wonflow:demo-insurers-changed",
      "wonflow:demo-insurance-policies-changed",
      "wonflow:demo-insurance-claims-changed",
      "wonflow:demo-billing-invoices-changed",
      "storage",
    ];

    events.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          reloadLocalData,
        );
      },
    );

    return () => {
      events.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            reloadLocalData,
          );
        },
      );
    };
  }, [reloadLocalData]);

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

  const insurersById =
    useMemo(
      () =>
        new Map(
          insurers.map(
            (insurer) => [
              insurer.id,
              insurer,
            ],
          ),
        ),
      [insurers],
    );

  const policiesById =
    useMemo(
      () =>
        new Map(
          policies.map(
            (policy) => [
              policy.id,
              policy,
            ],
          ),
        ),
      [policies],
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

  const normalizedQuery =
    query
      .trim()
      .toLocaleLowerCase();

  const visibleClaims =
    useMemo(
      () =>
        claims
          .filter(
            (claim) => {
              if (
                statusFilter !==
                  "all" &&
                claim.status !==
                  statusFilter
              ) {
                return false;
              }

              if (
                normalizedQuery ===
                ""
              ) {
                return true;
              }

              const patient =
                patientsById.get(
                  claim.patientId,
                );

              const insurer =
                insurersById.get(
                  claim.insurerId,
                );

              return [
                claim.claimNumber,
                claim.invoiceNumber,
                claim.externalClaimReference,
                claim.authorizationNumber,
                patient?.displayName ?? "",
                patient?.mrNumber ?? "",
                patient?.draft
                  .cnicNumber ?? "",
                insurer?.insurerName ?? "",
                claim.status,
              ]
                .join(" ")
                .toLocaleLowerCase()
                .includes(
                  normalizedQuery,
                );
            },
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.createdAt,
              ).getTime() -
              new Date(
                left.createdAt,
              ).getTime(),
          ),
      [
        claims,
        insurersById,
        normalizedQuery,
        patientsById,
        statusFilter,
      ],
    );

  const selectedClaim =
    claims.find(
      (claim) =>
        claim.id ===
        selectedClaimId,
    ) ??
    visibleClaims[0];

  const selectedPatient =
    selectedClaim ===
    undefined
      ? undefined
      : patientsById.get(
          selectedClaim.patientId,
        );

  const selectedInsurer =
    selectedClaim ===
    undefined
      ? undefined
      : insurersById.get(
          selectedClaim.insurerId,
        );

  const selectedPolicy =
    selectedClaim ===
    undefined
      ? undefined
      : policiesById.get(
          selectedClaim.policyId,
        );

  const selectedBranch =
    selectedClaim ===
    undefined
      ? undefined
      : branchesById.get(
          selectedClaim.branchId,
        );

  const statistics =
    useMemo(
      () => ({
        activePolicies:
          policies.filter(
            (policy) =>
              policy.status ===
              "active",
          ).length,

        authorizationPending:
          claims.filter(
            (claim) =>
              claim.status ===
              "authorization-pending",
          ).length,

        submitted:
          claims.filter(
            (claim) =>
              claim.status ===
                "submitted" ||
              claim.status ===
                "under-review",
          ).length,

        approved:
          claims.filter(
            (claim) =>
              claim.status ===
                "approved" ||
              claim.status ===
                "partially-approved" ||
              claim.status ===
                "paid",
          ).length,
      }),
      [
        claims,
        policies,
      ],
    );

  function resetActionFields() {
    setStaffName("");
    setActionNote("");
    setAuthorizationNumber("");
    setApprovedAmount("");
    setPaymentAmount("");
    setPaymentReference("");
  }

  function selectClaim(
    claimId: string,
  ) {
    const claim =
      claims.find(
        (record) =>
          record.id ===
          claimId,
      );

    setSelectedClaimId(
      claimId,
    );

    setStaffName(
      claim?.insurerReviewer ||
      claim?.submittedBy ||
      "",
    );

    setActionNote(
      claim?.insurerResponseNote ||
      claim?.authorizationNote ||
      "",
    );

    setAuthorizationNumber(
      claim?.authorizationNumber ??
        "",
    );

    setApprovedAmount(
      claim === undefined ||
      claim.approvedAmount ===
        0
        ? ""
        : String(
            claim.approvedAmount,
          ),
    );

    setPaymentAmount(
      claim === undefined
        ? ""
        : String(
            Math.max(
              0,

              claim.approvedAmount -
                claim.paidAmount,
            ),
          ),
    );

    setPaymentReference(
      claim?.paymentReference ??
        "",
    );

    setActionMessage(
      undefined,
    );
  }

  function savePolicy() {
    const input = {
      patientId:
        policyPatientId,

      insurerId:
        policyInsurerId,

      memberNumber,
      policyNumber,
      planName,

      coveragePercent,
      coPayPercent,
      annualLimit,

      effectiveFrom,
      effectiveTo,
    };

    const errors =
      validateDemoInsurancePolicy(
        input,
      );

    setPolicyErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required insurance-policy details.",
      );

      return;
    }

    const policy =
      createDemoInsurancePolicy(
        input,
      );

    if (
      policy === undefined
    ) {
      setActionMessage(
        "The policy could not be created. Check for a duplicate member or policy number.",
      );

      return;
    }

    setPolicyPatientId("");
    setPolicyInsurerId("");
    setMemberNumber("");
    setPolicyNumber("");
    setPlanName("");
    setCoveragePercent(80);
    setCoPayPercent(20);
    setAnnualLimit(500_000);
    setEffectiveFrom("");
    setEffectiveTo("");
    setPolicyErrors([]);

    reloadLocalData();

    setActionMessage(
      `${policy.policyNumber} saved successfully.`,
    );
  }

  function synchronizeClaims() {
    const createdClaims =
      synchronizeDemoInsuranceClaimsFromInvoices();

    reloadLocalData();

    setActionMessage(
      createdClaims.length === 0
        ? "No new insured invoices were waiting for claim creation."
        : `${createdClaims.length} insurance claim${createdClaims.length === 1 ? "" : "s"} created.`,
    );
  }

  function changeAuthorizationRequirement(
    required: boolean,
  ) {
    if (
      selectedClaim ===
      undefined
    ) {
      return;
    }

    const updatedClaim =
      updateDemoInsuranceClaimAuthorizationRequirement(
        selectedClaim.id,
        required,
      );

    if (
      updatedClaim ===
      undefined
    ) {
      setActionMessage(
        "Authorization requirements can only be changed while the claim is a draft.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      required
        ? "Pre-authorization marked as required."
        : "Pre-authorization marked as not required.",
    );
  }

  function requestAuthorization() {
    if (
      selectedClaim ===
      undefined
    ) {
      return;
    }

    const updatedClaim =
      requestDemoInsuranceAuthorization(
        selectedClaim.id,
        staffName,
        actionNote,
      );

    if (
      updatedClaim ===
      undefined
    ) {
      setActionMessage(
        "Enter the staff member requesting authorization.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      "Pre-authorization request submitted.",
    );
  }

  function decideAuthorization(
    approved: boolean,
  ) {
    if (
      selectedClaim ===
      undefined
    ) {
      return;
    }

    const updatedClaim =
      decideDemoInsuranceAuthorization({
        claimId:
          selectedClaim.id,

        approved,

        authorizationNumber,

        insurerReviewer:
          staffName,

        decisionNote:
          actionNote,
      });

    if (
      updatedClaim ===
      undefined
    ) {
      setActionMessage(
        approved
          ? "Enter the insurer reviewer and authorization number."
          : "Enter the insurer reviewer and denial reason.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      approved
        ? "Insurance authorization approved."
        : "Insurance authorization denied.",
    );
  }

  function submitClaim() {
    if (
      selectedClaim ===
      undefined
    ) {
      return;
    }

    const updatedClaim =
      submitDemoInsuranceClaim(
        selectedClaim.id,
        staffName,
      );

    if (
      updatedClaim ===
      undefined
    ) {
      setActionMessage(
        "The claim is not ready for submission or the submitting staff member is missing.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      "Insurance claim submitted successfully.",
    );
  }

  function startClaimReview() {
    if (
      selectedClaim ===
      undefined
    ) {
      return;
    }

    const updatedClaim =
      startDemoInsuranceClaimReview(
        selectedClaim.id,
        staffName,
      );

    if (
      updatedClaim ===
      undefined
    ) {
      setActionMessage(
        "Enter the insurer reviewer before starting review.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      "Insurer review started.",
    );
  }

  function recordClaimResponse() {
    if (
      selectedClaim ===
      undefined
    ) {
      return;
    }

    const numericApprovedAmount =
      Number(
        approvedAmount,
      );

    const updatedClaim =
      recordDemoInsuranceClaimResponse({
        claimId:
          selectedClaim.id,

        approvedAmount:
          numericApprovedAmount,

        insurerReviewer:
          staffName,

        responseNote:
          actionNote,
      });

    if (
      updatedClaim ===
      undefined
    ) {
      setActionMessage(
        "Enter a valid approved amount, insurer reviewer and response note where required.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      updatedClaim.status ===
      "rejected"
        ? "Insurance claim rejected."
        : updatedClaim.status ===
            "partially-approved"
          ? "Insurance claim partially approved."
          : "Insurance claim approved.",
    );
  }

  function recordPayment() {
    if (
      selectedClaim ===
      undefined
    ) {
      return;
    }

    const updatedClaim =
      recordDemoInsuranceClaimPayment({
        claimId:
          selectedClaim.id,

        paymentAmount:
          Number(
            paymentAmount,
          ),

        paymentReference,

        recordedBy:
          staffName,
      });

    if (
      updatedClaim ===
      undefined
    ) {
      setActionMessage(
        "Enter a valid payment amount, responsible staff member and unique payment reference.",
      );

      return;
    }

    reloadLocalData();

    setActionMessage(
      updatedClaim.status ===
      "paid"
        ? "Insurance claim payment completed."
        : "Partial insurance payment recorded.",
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href="/operations/billing/new"
            >
              Billing Counter
            </Link>

            <Link
              className="wf-button-secondary"
              href="/operations/patients"
            >
              Patient Directory
            </Link>

            <Link
              className="wf-button-secondary"
              href="/operations/insurance/receivables"
            >
              Receivables and Appeals
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
              "Insurance Claims",
          },
        ]}
        description="Manage patient policies, authorizations, claim submissions, insurer responses and payments."
        eyebrow="Insurance and Claims"
        leading={
          <ShieldCheck
            size={20}
          />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              Fictional insurer data
            </span>

            <span>
              Browser-local claims
            </span>
          </>
        }
        title="Insurance Authorization and Claims"
      />

      {actionMessage !==
      undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          {actionMessage}
        </div>
      ) : null}

      {policyErrors.length >
      0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-rose-800">
            <AlertTriangle
              size={18}
            />

            Complete the insurance policy
          </div>

          <ul className="mt-3 space-y-1 text-xs leading-5 text-rose-700">
            {policyErrors.map(
              (error) => (
                <li key={error}>
                  • {error}
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WonFlowKpiCard
          helperText="Currently active patient policies"
          icon={
            <ShieldCheck
              size={18}
            />
          }
          label="Active Policies"
          tone="blue"
          value={
            statistics.activePolicies
          }
        />

        <WonFlowKpiCard
          helperText="Waiting for insurer authorization"
          icon={
            <Clock3 size={18} />
          }
          label="Authorization Pending"
          tone="violet"
          value={
            statistics.authorizationPending
          }
        />

        <WonFlowKpiCard
          helperText="Claims submitted or under review"
          icon={
            <FileCheck2
              size={18}
            />
          }
          label="Open Claims"
          tone="amber"
          value={
            statistics.submitted
          }
        />

        <WonFlowKpiCard
          helperText="Approved, partially approved or paid"
          icon={
            <CheckCircle2
              size={18}
            />
          }
          label="Approved Claims"
          tone="emerald"
          value={
            statistics.approved
          }
        />
      </div>

      <WonFlowOperationalPanel
        description="Register a patient insurance policy before creating claims from hospital invoices."
        icon={
          <Building2
            size={18}
          />
        }
        title="Patient Insurance Policy"
        tone="blue"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="text-xs font-bold text-slate-600">
              Patient
            </span>

            <select
              className={[
                wonFlowInputClassName,
                "mt-1.5",
              ].join(" ")}
              onChange={(
                event,
              ) => {
                setPolicyPatientId(
                  event.target.value,
                );
              }}
              value={
                policyPatientId
              }
            >
              <option value="">
                Select patient
              </option>

              {patients.map(
                (patient) => (
                  <option
                    key={patient.id}
                    value={patient.id}
                  >
                    {patient.displayName}
                    {" — "}
                    {patient.mrNumber}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span className="text-xs font-bold text-slate-600">
              Insurance Company
            </span>

            <select
              className={[
                wonFlowInputClassName,
                "mt-1.5",
              ].join(" ")}
              onChange={(
                event,
              ) => {
                setPolicyInsurerId(
                  event.target.value,
                );
              }}
              value={
                policyInsurerId
              }
            >
              <option value="">
                Select insurer
              </option>

              {insurers
                .filter(
                  (insurer) =>
                    insurer.status ===
                    "active",
                )
                .map(
                  (insurer) => (
                    <option
                      key={insurer.id}
                      value={insurer.id}
                    >
                      {
                        insurer.insurerName
                      }
                    </option>
                  ),
                )}
            </select>
          </label>

          <PolicyTextField
            label="Member Number"
            onChange={
              setMemberNumber
            }
            value={memberNumber}
          />

          <PolicyTextField
            label="Policy Number"
            onChange={
              setPolicyNumber
            }
            value={policyNumber}
          />

          <PolicyTextField
            label="Plan Name"
            onChange={setPlanName}
            value={planName}
          />

          <PolicyNumberField
            label="Coverage Percentage"
            maximum={100}
            minimum={0}
            onChange={
              setCoveragePercent
            }
            value={
              coveragePercent
            }
          />

          <PolicyNumberField
            label="Co-pay Percentage"
            maximum={100}
            minimum={0}
            onChange={
              setCoPayPercent
            }
            value={coPayPercent}
          />

          <PolicyNumberField
            label="Annual Limit (PKR)"
            minimum={0}
            onChange={setAnnualLimit}
            value={annualLimit}
          />

          <label>
            <span className="text-xs font-bold text-slate-600">
              Effective From
            </span>

            <input
              className={[
                wonFlowInputClassName,
                "mt-1.5",
              ].join(" ")}
              onChange={(
                event,
              ) => {
                setEffectiveFrom(
                  event.target.value,
                );
              }}
              type="date"
              value={effectiveFrom}
            />
          </label>

          <label>
            <span className="text-xs font-bold text-slate-600">
              Effective To
            </span>

            <input
              className={[
                wonFlowInputClassName,
                "mt-1.5",
              ].join(" ")}
              onChange={(
                event,
              ) => {
                setEffectiveTo(
                  event.target.value,
                );
              }}
              type="date"
              value={effectiveTo}
            />
          </label>
        </div>

        <WonFlowActionButton
          className="mt-4"
          onClick={savePolicy}
          variant="primary"
        >
          Save Insurance Policy
        </WonFlowActionButton>

        {policies.length > 0 ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {policies
              .slice(0, 6)
              .map(
                (policy) => {
                  const patient =
                    patientsById.get(
                      policy.patientId,
                    );

                  const insurer =
                    insurersById.get(
                      policy.insurerId,
                    );

                  return (
                    <article
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      key={policy.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-950">
                            {patient?.displayName ??
                              "Unknown patient"}
                          </div>

                          <div className="mt-1 text-xs font-bold text-blue-700">
                            {insurer?.insurerName ??
                              "Unknown insurer"}
                          </div>
                        </div>

                        <span className="wf-status wf-status-neutral">
                          {humanizeValue(
                            policy.status,
                          )}
                        </span>
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        {policy.policyNumber}
                        {" · "}
                        {policy.coveragePercent}
                        {"% coverage · "}
                        {policy.coPayPercent}
                        {"% co-pay"}
                      </div>

                      <WonFlowActionButton
                        className="mt-3"
                        onClick={() => {
                          toggleDemoInsurancePolicyStatus(
                            policy.id,
                          );

                          reloadLocalData();
                        }}
                        variant="secondary"
                      >
                        {policy.status ===
                        "active"
                          ? "Suspend Policy"
                          : "Activate Policy"}
                      </WonFlowActionButton>
                    </article>
                  );
                },
              )}
          </div>
        ) : null}
      </WonFlowOperationalPanel>

      <section className="rounded-[18px] border border-slate-200 bg-white p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_230px_auto]">
          <label className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />

            <input
              className={[
                wonFlowInputClassName,
                "pl-10",
              ].join(" ")}
              onChange={(
                event,
              ) => {
                setQuery(
                  event.target.value,
                );
              }}
              placeholder="Search patient, MR, CNIC, insurer, claim, invoice or authorization"
              type="search"
              value={query}
            />
          </label>

          <select
            className={
              wonFlowInputClassName
            }
            onChange={(
              event,
            ) => {
              setStatusFilter(
                event.target
                  .value as
                  ClaimStatusFilter,
              );
            }}
            value={statusFilter}
          >
            <option value="all">
              All Claim Statuses
            </option>

            <option value="draft">
              Draft
            </option>

            <option value="authorization-pending">
              Authorization Pending
            </option>

            <option value="authorized">
              Authorized
            </option>

            <option value="authorization-denied">
              Authorization Denied
            </option>

            <option value="submitted">
              Submitted
            </option>

            <option value="under-review">
              Under Review
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="partially-approved">
              Partially Approved
            </option>

            <option value="rejected">
              Rejected
            </option>

            <option value="paid">
              Paid
            </option>
          </select>

          <WonFlowActionButton
            onClick={
              synchronizeClaims
            }
            variant="primary"
          >
            Sync Insured Invoices
          </WonFlowActionButton>
        </div>
      </section>

      <div className="wf-workspace-rail">
        <div className="wf-workspace-rail-side">
          <WonFlowOperationalPanel
            description="Insurance claims ordered by creation date."
            status={
              <span className="wf-status wf-status-blue">
                {
                  visibleClaims.length
                }
                {" claims"}
              </span>
            }
            title="Insurance Claim Queue"
            tone="blue"
          >
            {visibleClaims.length ===
            0 ? (
              <WonFlowEmptyState
                description="Create a patient policy and hospital invoice, then synchronize insured invoices."
                title="No insurance claims"
              />
            ) : (
              <div className="space-y-3">
                {visibleClaims.map(
                  (claim) => {
                    const patient =
                      patientsById.get(
                        claim.patientId,
                      );

                    const insurer =
                      insurersById.get(
                        claim.insurerId,
                      );

                    const selected =
                      selectedClaim?.id ===
                      claim.id;

                    return (
                      <button
                        className={[
                          "w-full rounded-2xl border p-4 text-left transition",
                          selected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                        ].join(" ")}
                        key={claim.id}
                        onClick={() => {
                          selectClaim(
                            claim.id,
                          );
                        }}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-950">
                              {patient?.displayName ??
                                "Unknown patient"}
                            </div>

                            <div className="mt-1 text-xs font-bold text-blue-700">
                              {
                                claim.claimNumber
                              }
                            </div>
                          </div>

                          <span
                            className={[
                              "rounded-full border px-2.5 py-1 text-[10px] font-black",
                              getClaimStatusClassName(
                                claim.status,
                              ),
                            ].join(" ")}
                          >
                            {humanizeValue(
                              claim.status,
                            )}
                          </span>
                        </div>

                        <div className="mt-3 text-xs font-bold text-slate-700">
                          {insurer?.insurerName ??
                            "Unknown insurer"}
                        </div>

                        <div className="mt-2 text-lg font-black text-slate-950">
                          {formatCurrency(
                            claim.expectedInsurerAmount,
                          )}
                        </div>

                        <div className="mt-2 text-[11px] text-slate-500">
                          {claim.invoiceNumber}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>

        <div className="wf-workspace-rail-main">
          {selectedClaim ===
            undefined ||
          selectedPatient ===
            undefined ||
          selectedInsurer ===
            undefined ||
          selectedPolicy ===
            undefined ? (
            <WonFlowOperationalPanel
              description="Select an insurance claim from the queue."
              title="Claim Workspace"
              tone="blue"
            >
              <WonFlowEmptyState
                description="No insurance claim is currently selected."
                title="Select a claim"
              />
            </WonFlowOperationalPanel>
          ) : (
            <div className="space-y-6">
              <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white">
                <div className="bg-blue-700 p-5 text-white">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">
                    Insurance Claim
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    {
                      selectedPatient.displayName
                    }
                  </h2>

                  <div className="mt-1 text-xs text-blue-100">
                    {
                      selectedPatient.mrNumber
                    }
                    {" · "}
                    {
                      selectedClaim.claimNumber
                    }
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryItem
                    label="Insurance Company"
                    value={
                      selectedInsurer.insurerName
                    }
                  />

                  <SummaryItem
                    label="Policy Number"
                    value={
                      selectedPolicy.policyNumber
                    }
                  />

                  <SummaryItem
                    label="Member Number"
                    value={
                      selectedPolicy.memberNumber
                    }
                  />

                  <SummaryItem
                    label="Invoice Number"
                    value={
                      selectedClaim.invoiceNumber
                    }
                  />

                  <SummaryItem
                    label="Hospital Branch"
                    value={
                      selectedBranch?.name ??
                      "Unknown branch"
                    }
                  />

                  <SummaryItem
                    label="Encounter"
                    value={
                      selectedClaim.encounterId ||
                      "Not linked"
                    }
                  />

                  <SummaryItem
                    label="Authorization"
                    value={humanizeValue(
                      selectedClaim.authorizationStatus,
                    )}
                  />

                  <SummaryItem
                    label="Claim Status"
                    value={humanizeValue(
                      selectedClaim.status,
                    )}
                  />
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <WonFlowKpiCard
                  helperText="Original hospital invoice"
                  label="Invoice Amount"
                  tone="blue"
                  value={formatCurrency(
                    selectedClaim.invoiceAmount,
                  )}
                />

                <WonFlowKpiCard
                  helperText={`${selectedClaim.coveragePercent}% policy coverage`}
                  label="Expected Insurer"
                  tone="violet"
                  value={formatCurrency(
                    selectedClaim.expectedInsurerAmount,
                  )}
                />

                <WonFlowKpiCard
                  helperText={`${selectedClaim.coPayPercent}% policy co-pay`}
                  label="Patient Responsibility"
                  tone="amber"
                  value={formatCurrency(
                    selectedClaim.patientResponsibility,
                  )}
                />

                <WonFlowKpiCard
                  helperText={`${formatCurrency(
                    selectedClaim.paidAmount,
                  )} received`}
                  label="Approved Amount"
                  tone="emerald"
                  value={formatCurrency(
                    selectedClaim.approvedAmount,
                  )}
                />
              </div>

              {selectedClaim.status ===
              "draft" ? (
                <WonFlowOperationalPanel
                  description="Confirm whether insurer pre-authorization is required before claim submission."
                  title="Pre-Authorization Requirement"
                  tone="violet"
                >
                  <label className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                    <input
                      checked={
                        selectedClaim.authorizationRequired
                      }
                      className="mt-1 h-4 w-4"
                      onChange={(
                        event,
                      ) => {
                        changeAuthorizationRequirement(
                          event.target.checked,
                        );
                      }}
                      type="checkbox"
                    />

                    <span>
                      <span className="block text-sm font-black text-violet-950">
                        Insurance pre-authorization required
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-violet-700">
                        High-cost admissions, procedures and selected services may require approval before claim submission.
                      </span>
                    </span>
                  </label>

                  {selectedClaim.authorizationRequired ? (
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <input
                        className={
                          wonFlowInputClassName
                        }
                        onChange={(
                          event,
                        ) => {
                          setStaffName(
                            event.target.value,
                          );
                        }}
                        placeholder="Staff requesting authorization"
                        value={staffName}
                      />

                      <textarea
                        className={
                          wonFlowTextareaClassName
                        }
                        onChange={(
                          event,
                        ) => {
                          setActionNote(
                            event.target.value,
                          );
                        }}
                        placeholder="Clinical or administrative authorization note"
                        value={actionNote}
                      />

                      <WonFlowActionButton
                        onClick={
                          requestAuthorization
                        }
                        variant="primary"
                      >
                        Request Authorization
                      </WonFlowActionButton>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <input
                        className={
                          wonFlowInputClassName
                        }
                        onChange={(
                          event,
                        ) => {
                          setStaffName(
                            event.target.value,
                          );
                        }}
                        placeholder="Staff submitting claim"
                        value={staffName}
                      />

                      <WonFlowActionButton
                        className="mt-3"
                        onClick={
                          submitClaim
                        }
                        variant="primary"
                      >
                        Submit Insurance Claim
                      </WonFlowActionButton>
                    </div>
                  )}
                </WonFlowOperationalPanel>
              ) : null}

              {selectedClaim.status ===
              "authorization-pending" ? (
                <WonFlowOperationalPanel
                  description="Record the insurer’s pre-authorization decision."
                  title="Authorization Decision"
                  tone="amber"
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setStaffName(
                          event.target.value,
                        );
                      }}
                      placeholder="Insurer reviewer"
                      value={staffName}
                    />

                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setAuthorizationNumber(
                          event.target.value,
                        );
                      }}
                      placeholder="Authorization number for approval"
                      value={
                        authorizationNumber
                      }
                    />

                    <textarea
                      className={[
                        wonFlowTextareaClassName,
                        "lg:col-span-2",
                      ].join(" ")}
                      onChange={(
                        event,
                      ) => {
                        setActionNote(
                          event.target.value,
                        );
                      }}
                      placeholder="Decision note or denial reason"
                      value={actionNote}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <WonFlowActionButton
                      onClick={() => {
                        decideAuthorization(
                          false,
                        );
                      }}
                      variant="danger"
                    >
                      Deny Authorization
                    </WonFlowActionButton>

                    <WonFlowActionButton
                      onClick={() => {
                        decideAuthorization(
                          true,
                        );
                      }}
                      variant="primary"
                    >
                      Approve Authorization
                    </WonFlowActionButton>
                  </div>
                </WonFlowOperationalPanel>
              ) : null}

              {selectedClaim.status ===
              "authorized" ? (
                <WonFlowOperationalPanel
                  description="Authorization has been approved. Submit the financial claim to the insurer."
                  title="Submit Authorized Claim"
                  tone="emerald"
                >
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
                      Authorization Number
                    </div>

                    <div className="mt-2 text-lg font-black text-emerald-950">
                      {
                        selectedClaim.authorizationNumber
                      }
                    </div>
                  </div>

                  <input
                    className={[
                      wonFlowInputClassName,
                      "mt-4",
                    ].join(" ")}
                    onChange={(
                      event,
                    ) => {
                      setStaffName(
                        event.target.value,
                      );
                    }}
                    placeholder="Staff submitting the claim"
                    value={staffName}
                  />

                  <WonFlowActionButton
                    className="mt-3"
                    onClick={submitClaim}
                    variant="primary"
                  >
                    Submit Insurance Claim
                  </WonFlowActionButton>
                </WonFlowOperationalPanel>
              ) : null}

              {selectedClaim.status ===
              "submitted" ? (
                <WonFlowOperationalPanel
                  description="Assign the submitted claim to an insurer reviewer."
                  title="Start Insurer Review"
                  tone="blue"
                >
                  <input
                    className={
                      wonFlowInputClassName
                    }
                    onChange={(
                      event,
                    ) => {
                      setStaffName(
                        event.target.value,
                      );
                    }}
                    placeholder="Insurer reviewer"
                    value={staffName}
                  />

                  <WonFlowActionButton
                    className="mt-3"
                    onClick={
                      startClaimReview
                    }
                    variant="primary"
                  >
                    Start Claim Review
                  </WonFlowActionButton>
                </WonFlowOperationalPanel>
              ) : null}

              {selectedClaim.status ===
              "under-review" ? (
                <WonFlowOperationalPanel
                  description="Record the insurer’s approved amount and response."
                  title="Insurer Claim Response"
                  tone="amber"
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setStaffName(
                          event.target.value,
                        );
                      }}
                      placeholder="Insurer reviewer"
                      value={staffName}
                    />

                    <input
                      className={
                        wonFlowInputClassName
                      }
                      max={
                        selectedClaim.invoiceAmount
                      }
                      min={0}
                      onChange={(
                        event,
                      ) => {
                        setApprovedAmount(
                          event.target.value,
                        );
                      }}
                      placeholder="Approved amount"
                      type="number"
                      value={approvedAmount}
                    />

                    <textarea
                      className={[
                        wonFlowTextareaClassName,
                        "lg:col-span-2",
                      ].join(" ")}
                      onChange={(
                        event,
                      ) => {
                        setActionNote(
                          event.target.value,
                        );
                      }}
                      placeholder="Approval, partial approval or rejection explanation"
                      value={actionNote}
                    />
                  </div>

                  <WonFlowActionButton
                    className="mt-4"
                    onClick={
                      recordClaimResponse
                    }
                    variant="primary"
                  >
                    Record Insurer Response
                  </WonFlowActionButton>
                </WonFlowOperationalPanel>
              ) : null}

              {selectedClaim.status ===
                "approved" ||
              selectedClaim.status ===
                "partially-approved" ? (
                <WonFlowOperationalPanel
                  description="Record the payment received from the insurance company."
                  icon={
                    <BadgeDollarSign
                      size={18}
                    />
                  }
                  title="Insurance Payment"
                  tone="emerald"
                >
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
                      Remaining Insurance Receivable
                    </div>

                    <div className="mt-2 text-2xl font-black text-emerald-950">
                      {formatCurrency(
                        Math.max(
                          0,

                          selectedClaim.approvedAmount -
                            selectedClaim.paidAmount,
                        ),
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <input
                      className={
                        wonFlowInputClassName
                      }
                      min={0}
                      onChange={(
                        event,
                      ) => {
                        setPaymentAmount(
                          event.target.value,
                        );
                      }}
                      placeholder="Payment amount"
                      type="number"
                      value={paymentAmount}
                    />

                    <input
                      className={
                        wonFlowInputClassName
                      }
                      onChange={(
                        event,
                      ) => {
                        setStaffName(
                          event.target.value,
                        );
                      }}
                      placeholder="Staff recording payment"
                      value={staffName}
                    />

                    <input
                      className={[
                        wonFlowInputClassName,
                        "lg:col-span-2",
                      ].join(" ")}
                      onChange={(
                        event,
                      ) => {
                        setPaymentReference(
                          event.target.value,
                        );
                      }}
                      placeholder="Bank, cheque or insurer payment reference"
                      value={
                        paymentReference
                      }
                    />
                  </div>

                  <WonFlowActionButton
                    className="mt-4"
                    onClick={recordPayment}
                    variant="primary"
                  >
                    Record Insurance Payment
                  </WonFlowActionButton>
                </WonFlowOperationalPanel>
              ) : null}

              {selectedClaim.status ===
              "authorization-denied" ? (
                <section className="rounded-[22px] border border-rose-200 bg-rose-50 p-6">
                  <h2 className="text-xl font-black text-rose-950">
                    Authorization denied
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-rose-700">
                    {selectedClaim.authorizationNote ||
                      "No authorization-denial reason was recorded."}
                  </p>
                </section>
              ) : null}

              {selectedClaim.status ===
              "rejected" ? (
                <section className="rounded-[22px] border border-rose-200 bg-rose-50 p-6">
                  <h2 className="text-xl font-black text-rose-950">
                    Insurance claim rejected
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-rose-700">
                    {selectedClaim.insurerResponseNote ||
                      "No insurer rejection reason was recorded."}
                  </p>
                </section>
              ) : null}

              {selectedClaim.status ===
              "paid" ? (
                <section className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle2
                      className="text-emerald-700"
                      size={26}
                    />

                    <div>
                      <h2 className="text-xl font-black text-emerald-950">
                        Insurance claim paid
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-emerald-700">
                        {formatCurrency(
                          selectedClaim.paidAmount,
                        )}
                        {" "}
                        has been recorded against
                        {" "}
                        <strong>
                          {
                            selectedClaim.claimNumber
                          }
                        </strong>
                        .
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Link
                  className="wf-button-secondary"
                  href={`/operations/insurance/claims/${encodeURIComponent(
                    selectedClaim.id,
                  )}/print`}
                >
                  Print Claim Summary
                </Link>

                <Link
                  className="wf-button-secondary"
                  href={`/operations/patients/${encodeURIComponent(
                    selectedPatient.id,
                  )}/billing`}
                >
                  Patient Billing Ledger
                </Link>

                <button
                  className="wf-button-secondary"
                  onClick={
                    resetActionFields
                  }
                  type="button"
                >
                  Clear Action Fields
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 text-sm font-bold text-slate-800">
        {value || "Not recorded"}
      </dd>
    </div>
  );
}

function PolicyTextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;

  onChange:
    (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-600">
        {label}
      </span>

      <input
        className={[
          wonFlowInputClassName,
          "mt-1.5",
        ].join(" ")}
        onChange={(
          event,
        ) => {
          onChange(
            event.target.value,
          );
        }}
        value={value}
      />
    </label>
  );
}

function PolicyNumberField({
  label,
  value,
  minimum,
  maximum,
  onChange,
}: {
  label: string;
  value: number;
  minimum: number;
  maximum?: number;

  onChange:
    (value: number) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-600">
        {label}
      </span>

      <input
        className={[
          wonFlowInputClassName,
          "mt-1.5",
        ].join(" ")}
        max={maximum}
        min={minimum}
        onChange={(
          event,
        ) => {
          const parsedValue =
            Number(
              event.target.value,
            );

          if (
            !Number.isFinite(
              parsedValue,
            )
          ) {
            onChange(minimum);

            return;
          }

          onChange(
            maximum ===
            undefined
              ? Math.max(
                  minimum,
                  parsedValue,
                )
              : Math.min(
                  maximum,

                  Math.max(
                    minimum,
                    parsedValue,
                  ),
                ),
          );
        }}
        type="number"
        value={value}
      />
    </label>
  );
}

export function InsuranceClaimsWorklist() {
  const hospitalService =
    useWonFlowHospitalService();

  const branches =
    useWonFlowAsyncData({
      key:
        "insurance-claims:branches",

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
      emptyTitle="Insurance claims unavailable"
      loadingDescription="WonFlow is preparing patient policies, invoices and insurance claims."
      loadingTitle="Preparing insurance claims"
      onRetry={
        branches.reload
      }
      state={branches}
    >
      {(records) => (
        <InsuranceClaimsContent
          branches={records}
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}
