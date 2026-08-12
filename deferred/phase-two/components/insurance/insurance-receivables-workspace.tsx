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
  Banknote,
  CalendarClock,
  CheckCircle2,
  FileWarning,
  Landmark,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
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
  buildDemoInsuranceAgingSummary,
  buildDemoInsuranceReceivables,
  calculateDemoInsuranceRemittanceAllocatedAmount,
  createEmptyDemoInsuranceRemittanceLine,
  createInitialDemoInsuranceRemittance,
  createOrGetDemoInsuranceAppeal,
  decideDemoInsuranceAppeal,
  getDemoInsuranceClaimsEligibleForAppeal,
  getDemoInsuranceClaimOutstandingAmount,
  postDemoInsuranceRemittance,
  readDemoInsuranceAppeals,
  readDemoInsuranceClaims,
  readDemoInsurancePolicies,
  readDemoInsuranceRemittances,
  readDemoInsurers,
  resubmitDemoInsuranceAppeal,
  saveDemoInsuranceAppeal,
  saveDemoInsuranceRemittance,
  submitDemoInsuranceAppeal,
  validateDemoInsuranceAppeal,
  validateDemoInsuranceRemittance,
} from "@/lib/insurance";

import type {
  DemoInsuranceAgingBucket,
  DemoInsuranceAppeal,
  DemoInsuranceAppealStatus,
  DemoInsuranceClaim,
  DemoInsurancePolicy,
  DemoInsuranceReceivable,
  DemoInsuranceRemittanceBatch,
  DemoInsuranceRemittanceLine,
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

type ReceivablesView =
  | "aging"
  | "appeals"
  | "remittances";

type AgingFilter =
  | "all"
  | DemoInsuranceAgingBucket
  | "overdue";

type AppealStatusFilter =
  | "all"
  | DemoInsuranceAppealStatus;

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

function cloneAppeal(
  appeal:
    DemoInsuranceAppeal,
): DemoInsuranceAppeal {
  return {
    ...appeal,
  };
}

function cloneRemittance(
  remittance:
    DemoInsuranceRemittanceBatch,
): DemoInsuranceRemittanceBatch {
  return {
    ...remittance,

    lines:
      remittance.lines.map(
        (line) => ({
          ...line,
        }),
      ),
  };
}

function getAgingClassName(
  bucket:
    DemoInsuranceAgingBucket,
): string {
  switch (bucket) {
    case "0-30":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "31-60":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "61-90":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "90-plus":
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function getAppealClassName(
  status:
    DemoInsuranceAppealStatus,
): string {
  switch (status) {
    case "draft":
      return "border-slate-200 bg-slate-100 text-slate-600";

    case "submitted":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "accepted":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "denied":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "resubmitted":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "closed":
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

interface InsuranceReceivablesContentProps {
  branches:
    readonly MockBranch[];
}

function InsuranceReceivablesContent({
  branches,
}: InsuranceReceivablesContentProps) {
  const [
    view,
    setView,
  ] = useState<ReceivablesView>(
    "aging",
  );

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
    receivables,
    setReceivables,
  ] = useState<
    DemoInsuranceReceivable[]
  >([]);

  const [
    appeals,
    setAppeals,
  ] = useState<
    DemoInsuranceAppeal[]
  >([]);

  const [
    remittances,
    setRemittances,
  ] = useState<
    DemoInsuranceRemittanceBatch[]
  >([]);

  const [
    agingSearch,
    setAgingSearch,
  ] = useState("");

  const [
    agingFilter,
    setAgingFilter,
  ] = useState<AgingFilter>(
    "all",
  );

  const [
    appealClaimId,
    setAppealClaimId,
  ] = useState("");

  const [
    selectedAppealId,
    setSelectedAppealId,
  ] = useState("");

  const [
    draftAppeal,
    setDraftAppeal,
  ] = useState<
    DemoInsuranceAppeal |
    undefined
  >();

  const [
    appealStatusFilter,
    setAppealStatusFilter,
  ] = useState<
    AppealStatusFilter
  >("all");

  const [
    remittanceDraft,
    setRemittanceDraft,
  ] = useState<
    DemoInsuranceRemittanceBatch
  >(
    createInitialDemoInsuranceRemittance,
  );

  const [
    validationErrors,
    setValidationErrors,
  ] = useState<string[]>([]);

  const [
    actionMessage,
    setActionMessage,
  ] = useState<
    string |
    undefined
  >();

  const reloadLocalData =
    useCallback(() => {
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

      setReceivables(
        buildDemoInsuranceReceivables(),
      );

      setAppeals(
        readDemoInsuranceAppeals(),
      );

      setRemittances(
        readDemoInsuranceRemittances(),
      );
    }, []);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    const eventNames = [
      "wonflow:demo-patients-changed",
      "wonflow:demo-insurance-claims-changed",
      "wonflow:demo-insurance-policies-changed",
      "wonflow:demo-insurance-appeals-changed",
      "wonflow:demo-insurance-remittances-changed",
      "storage",
    ];

    eventNames.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          reloadLocalData,
        );
      },
    );

    return () => {
      eventNames.forEach(
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

  const claimsById =
    useMemo(
      () =>
        new Map(
          claims.map(
            (claim) => [
              claim.id,
              claim,
            ],
          ),
        ),
      [claims],
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

  const agingSummary =
    useMemo(
      () =>
        buildDemoInsuranceAgingSummary(),
      [claims],
    );

  const normalizedAgingSearch =
    agingSearch
      .trim()
      .toLocaleLowerCase();

  const visibleReceivables =
    useMemo(
      () =>
        receivables.filter(
          (receivable) => {
            if (
              agingFilter ===
                "overdue" &&
              !receivable.isOverdue
            ) {
              return false;
            }

            if (
              agingFilter !==
                "all" &&
              agingFilter !==
                "overdue" &&
              receivable.agingBucket !==
                agingFilter
            ) {
              return false;
            }

            if (
              normalizedAgingSearch ===
              ""
            ) {
              return true;
            }

            const patient =
              patientsById.get(
                receivable.patientId,
              );

            const insurer =
              insurersById.get(
                receivable.insurerId,
              );

            return [
              receivable.claimNumber,
              receivable.invoiceNumber,
              patient?.displayName ?? "",
              patient?.mrNumber ?? "",
              patient?.draft
                .cnicNumber ?? "",
              insurer?.insurerName ?? "",
              receivable.agingBucket,
            ]
              .join(" ")
              .toLocaleLowerCase()
              .includes(
                normalizedAgingSearch,
              );
          },
        ),
      [
        agingFilter,
        insurersById,
        normalizedAgingSearch,
        patientsById,
        receivables,
      ],
    );

  const eligibleAppealClaims =
    useMemo(
      () =>
        getDemoInsuranceClaimsEligibleForAppeal(),
      [claims],
    );

  const visibleAppeals =
    useMemo(
      () =>
        appeals.filter(
          (appeal) =>
            appealStatusFilter ===
              "all" ||
            appeal.status ===
              appealStatusFilter,
        ),
      [
        appealStatusFilter,
        appeals,
      ],
    );

  const selectedAppeal =
    appeals.find(
      (appeal) =>
        appeal.id ===
        selectedAppealId,
    ) ??
    visibleAppeals[0];

  const activeAppeal =
    draftAppeal?.id ===
    selectedAppeal?.id
      ? draftAppeal
      : selectedAppeal;

  const remittanceEligibleClaims =
    useMemo(
      () =>
        claims.filter(
          (claim) =>
            (
              claim.status ===
                "approved" ||
              claim.status ===
                "partially-approved"
            ) &&
            getDemoInsuranceClaimOutstandingAmount(
              claim,
            ) > 0 &&
            (
              remittanceDraft
                .insurerId ===
                "" ||
              claim.insurerId ===
                remittanceDraft
                  .insurerId
            ),
        ),
      [
        claims,
        remittanceDraft.insurerId,
      ],
    );

  const statistics =
    useMemo(
      () => ({
        openReceivables:
          agingSummary
            .totalOpenClaims,

        outstanding:
          agingSummary
            .totalOutstanding,

        overdue:
          agingSummary
            .overdueAmount,

        openAppeals:
          appeals.filter(
            (appeal) =>
              appeal.status ===
                "draft" ||
              appeal.status ===
                "submitted" ||
              appeal.status ===
                "accepted",
          ).length,
      }),
      [
        agingSummary,
        appeals,
      ],
    );

  function selectAppeal(
    appealId: string,
  ) {
    const appeal =
      appeals.find(
        (record) =>
          record.id ===
          appealId,
      );

    setSelectedAppealId(
      appealId,
    );

    setDraftAppeal(
      appeal === undefined
        ? undefined
        : cloneAppeal(
            appeal,
          ),
    );

    setValidationErrors([]);

    setActionMessage(
      undefined,
    );
  }

  function openAppeal() {
    if (
      appealClaimId === ""
    ) {
      setActionMessage(
        "Select an eligible insurance claim.",
      );

      return;
    }

    const appeal =
      createOrGetDemoInsuranceAppeal(
        appealClaimId,
      );

    if (
      appeal === undefined
    ) {
      setActionMessage(
        "This claim is not currently eligible for an appeal.",
      );

      return;
    }

    reloadLocalData();

    setSelectedAppealId(
      appeal.id,
    );

    setDraftAppeal(
      cloneAppeal(
        appeal,
      ),
    );

    setActionMessage(
      `${appeal.appealNumber} opened successfully.`,
    );
  }

  function updateAppeal(
    changes:
      Partial<
        DemoInsuranceAppeal
      >,
  ) {
    setDraftAppeal(
      (currentAppeal) => {
        const baseAppeal =
          currentAppeal ??
          selectedAppeal;

        if (
          baseAppeal ===
          undefined
        ) {
          return currentAppeal;
        }

        return {
          ...baseAppeal,
          ...changes,
        };
      },
    );

    setValidationErrors([]);
  }

  function saveAppealDraft() {
    if (
      activeAppeal ===
        undefined ||
      activeAppeal.status !==
        "draft"
    ) {
      return;
    }

    const savedAppeal =
      saveDemoInsuranceAppeal(
        activeAppeal,
      );

    setDraftAppeal(
      cloneAppeal(
        savedAppeal,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Insurance appeal draft saved.",
    );
  }

  function submitAppeal() {
    if (
      activeAppeal ===
      undefined
    ) {
      return;
    }

    const errors =
      validateDemoInsuranceAppeal(
        activeAppeal,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required appeal information.",
      );

      return;
    }

    const submittedAppeal =
      submitDemoInsuranceAppeal(
        activeAppeal,
      );

    if (
      submittedAppeal ===
      undefined
    ) {
      setActionMessage(
        "The appeal could not be submitted.",
      );

      return;
    }

    setDraftAppeal(
      cloneAppeal(
        submittedAppeal,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Insurance appeal submitted.",
    );
  }

  function decideAppeal(
    accepted: boolean,
  ) {
    if (
      activeAppeal ===
      undefined
    ) {
      return;
    }

    const updatedAppeal =
      decideDemoInsuranceAppeal({
        appealId:
          activeAppeal.id,

        accepted,

        insurerReviewer:
          activeAppeal
            .insurerReviewer,

        insurerResponseNote:
          activeAppeal
            .insurerResponseNote,

        externalAppealReference:
          activeAppeal
            .externalAppealReference,
      });

    if (
      updatedAppeal ===
      undefined
    ) {
      setActionMessage(
        accepted
          ? "Enter the insurer reviewer, response and external appeal reference."
          : "Enter the insurer reviewer and denial reason.",
      );

      return;
    }

    setDraftAppeal(
      cloneAppeal(
        updatedAppeal,
      ),
    );

    reloadLocalData();

    setActionMessage(
      accepted
        ? "Insurance appeal accepted."
        : "Insurance appeal denied.",
    );
  }

  function resubmitAppeal() {
    if (
      activeAppeal ===
      undefined
    ) {
      return;
    }

    const result =
      resubmitDemoInsuranceAppeal(
        activeAppeal.id,
      );

    if (
      result === undefined
    ) {
      setActionMessage(
        "Only an accepted appeal may be resubmitted.",
      );

      return;
    }

    setDraftAppeal(
      cloneAppeal(
        result.appeal,
      ),
    );

    reloadLocalData();

    setActionMessage(
      `${result.claim.claimNumber} resubmitted to the insurer.`,
    );
  }

  function updateRemittanceDraft(
    changes:
      Partial<
        DemoInsuranceRemittanceBatch
      >,
  ) {
    setRemittanceDraft(
      (currentDraft) => ({
        ...currentDraft,
        ...changes,
      }),
    );

    setValidationErrors([]);
  }

  function updateRemittanceLine(
    lineId: string,

    changes:
      Partial<
        DemoInsuranceRemittanceLine
      >,
  ) {
    setRemittanceDraft(
      (currentDraft) => ({
        ...currentDraft,

        lines:
          currentDraft.lines.map(
            (line) =>
              line.id === lineId
                ? {
                    ...line,
                    ...changes,
                  }
                : line,
          ),
      }),
    );

    setValidationErrors([]);
  }

  function populateRemittanceLineFromClaim(
    lineId: string,
    claimId: string,
  ) {
    const claim =
      claimsById.get(
        claimId,
      );

    if (
      claim === undefined
    ) {
      updateRemittanceLine(
        lineId,
        {
          claimId: "",
          claimNumber: "",
          patientId: "",
          invoiceNumber: "",

          expectedOutstandingAmount:
            0,

          allocatedAmount: 0,
          varianceAmount: 0,
          varianceReason: "",
        },
      );

      return;
    }

    const outstandingAmount =
      getDemoInsuranceClaimOutstandingAmount(
        claim,
      );

    updateRemittanceLine(
      lineId,
      {
        claimId:
          claim.id,

        claimNumber:
          claim.claimNumber,

        patientId:
          claim.patientId,

        invoiceNumber:
          claim.invoiceNumber,

        expectedOutstandingAmount:
          outstandingAmount,

        allocatedAmount:
          outstandingAmount,

        varianceAmount: 0,

        varianceReason: "",
      },
    );
  }

  function saveRemittanceDraft() {
    const savedRemittance =
      saveDemoInsuranceRemittance(
        remittanceDraft,
      );

    setRemittanceDraft(
      cloneRemittance(
        savedRemittance,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Insurance remittance draft saved.",
    );
  }

  function postRemittance() {
    const errors =
      validateDemoInsuranceRemittance(
        remittanceDraft,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required remittance reconciliation details.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const confirmed =
      window.confirm(
        `Post ${formatCurrency(
          remittanceDraft.bankAmount,
        )} received from the insurer?`,
      );

    if (!confirmed) {
      return;
    }

    const result =
      postDemoInsuranceRemittance(
        remittanceDraft,
      );

    if (
      result === undefined
    ) {
      setActionMessage(
        "The insurance remittance could not be posted.",
      );

      return;
    }

    setRemittanceDraft(
      createInitialDemoInsuranceRemittance(),
    );

    setValidationErrors([]);

    reloadLocalData();

    setActionMessage(
      `${result.remittance.remittanceNumber} posted successfully.`,
    );

    setView("aging");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const selectedAppealClaim =
    activeAppeal ===
    undefined
      ? undefined
      : claimsById.get(
          activeAppeal.claimId,
        );

  const selectedAppealPatient =
    activeAppeal ===
    undefined
      ? undefined
      : patientsById.get(
          activeAppeal.patientId,
        );

  const remittanceAllocatedAmount =
    calculateDemoInsuranceRemittanceAllocatedAmount(
      remittanceDraft,
    );

  const remittanceUnallocatedAmount =
    Math.max(
      0,

      remittanceDraft.bankAmount -
        remittanceAllocatedAmount,
    );

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href="/operations/insurance"
            >
              Insurance Claims
            </Link>

            <Link
              className="wf-button-secondary"
              href="/operations/insurance/receivables/aging/print"
            >
              Print Aging Report
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
            href:
              "/operations/insurance",
          },
          {
            label:
              "Insurance Receivables",
          },
        ]}
        description="Monitor insurance balances, overdue claims, appeals, resubmissions and insurer remittances."
        eyebrow="Insurance Finance"
        leading={
          <Landmark size={20} />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              Fictional receivables
            </span>

            <span>
              Browser-local reconciliation
            </span>
          </>
        }
        title="Insurance Receivables and Reconciliation"
      />

      {actionMessage !==
      undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          {actionMessage}
        </div>
      ) : null}

      {validationErrors.length >
      0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-rose-800">
            <AlertTriangle
              size={18}
            />

            Complete the required information
          </div>

          <ul className="mt-3 space-y-1 text-xs leading-5 text-rose-700">
            {validationErrors.map(
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
          helperText={`${statistics.openReceivables} open insurance claim(s)`}
          icon={
            <Banknote size={18} />
          }
          label="Outstanding Receivables"
          tone="blue"
          value={formatCurrency(
            statistics.outstanding,
          )}
        />

        <WonFlowKpiCard
          helperText={`${agingSummary.overdueClaimCount} overdue claim(s)`}
          icon={
            <CalendarClock
              size={18}
            />
          }
          label="Overdue Amount"
          tone="amber"
          value={formatCurrency(
            statistics.overdue,
          )}
        />

        <WonFlowKpiCard
          helperText={`${agingSummary.oldestOutstandingDays} oldest outstanding days`}
          icon={
            <ShieldAlert
              size={18}
            />
          }
          label="90+ Days"
          tone="rose"
          value={formatCurrency(
            agingSummary.buckets.find(
              (bucket) =>
                bucket.bucket ===
                "90-plus",
            )?.outstandingAmount ??
              0,
          )}
        />

        <WonFlowKpiCard
          helperText="Draft, submitted and accepted appeals"
          icon={
            <RotateCcw
              size={18}
            />
          }
          label="Open Appeals"
          tone="violet"
          value={
            statistics.openAppeals
          }
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-[18px] border border-slate-200 bg-white p-3">
        <WonFlowActionButton
          onClick={() => {
            setView("aging");
          }}
          variant={
            view === "aging"
              ? "primary"
              : "secondary"
          }
        >
          Aging and Receivables
        </WonFlowActionButton>

        <WonFlowActionButton
          onClick={() => {
            setView("appeals");
          }}
          variant={
            view === "appeals"
              ? "primary"
              : "secondary"
          }
        >
          Appeals and Resubmissions
        </WonFlowActionButton>

        <WonFlowActionButton
          onClick={() => {
            setView("remittances");
          }}
          variant={
            view === "remittances"
              ? "primary"
              : "secondary"
          }
        >
          Remittance Reconciliation
        </WonFlowActionButton>
      </div>

      {view === "aging" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {agingSummary.buckets.map(
              (bucket) => (
                <button
                  className="rounded-[18px] border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                  key={bucket.bucket}
                  onClick={() => {
                    setAgingFilter(
                      bucket.bucket,
                    );
                  }}
                  type="button"
                >
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                    {bucket.bucket ===
                    "90-plus"
                      ? "90+ Days"
                      : `${bucket.bucket} Days`}
                  </div>

                  <div className="mt-2 text-xl font-black text-slate-950">
                    {formatCurrency(
                      bucket.outstandingAmount,
                    )}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {bucket.claimCount}
                    {" claim(s)"}
                  </div>
                </button>
              ),
            )}
          </div>

          <section className="rounded-[18px] border border-slate-200 bg-white p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_230px]">
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
                    setAgingSearch(
                      event.target.value,
                    );
                  }}
                  placeholder="Search patient, claim, invoice or insurer"
                  type="search"
                  value={agingSearch}
                />
              </label>

              <select
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setAgingFilter(
                    event.target
                      .value as
                      AgingFilter,
                  );
                }}
                value={agingFilter}
              >
                <option value="all">
                  All Aging Buckets
                </option>

                <option value="overdue">
                  All Overdue
                </option>

                <option value="0-30">
                  0–30 Days
                </option>

                <option value="31-60">
                  31–60 Days
                </option>

                <option value="61-90">
                  61–90 Days
                </option>

                <option value="90-plus">
                  90+ Days
                </option>
              </select>
            </div>
          </section>

          <WonFlowOperationalPanel
            description="Approved insurance amounts that have not yet been completely received."
            status={
              <span className="wf-status wf-status-blue">
                {
                  visibleReceivables.length
                }
                {" receivables"}
              </span>
            }
            title="Insurance Receivable Aging"
            tone="blue"
          >
            {visibleReceivables.length ===
            0 ? (
              <WonFlowEmptyState
                description="No insurance receivable matches the selected filters."
                title="No receivables found"
              />
            ) : (
              <div className="wf-content-scroll">
                <table className="w-full min-w-[1200px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">
                        Patient
                      </th>

                      <th className="px-3 py-3">
                        Insurer
                      </th>

                      <th className="px-3 py-3">
                        Claim
                      </th>

                      <th className="px-3 py-3">
                        Invoice
                      </th>

                      <th className="px-3 py-3 text-right">
                        Approved
                      </th>

                      <th className="px-3 py-3 text-right">
                        Paid
                      </th>

                      <th className="px-3 py-3 text-right">
                        Outstanding
                      </th>

                      <th className="px-3 py-3 text-right">
                        Days
                      </th>

                      <th className="px-3 py-3">
                        Aging
                      </th>

                      <th className="px-3 py-3">
                        Due Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleReceivables.map(
                      (receivable) => {
                        const patient =
                          patientsById.get(
                            receivable.patientId,
                          );

                        const insurer =
                          insurersById.get(
                            receivable.insurerId,
                          );

                        return (
                          <tr
                            className="border-b border-slate-100 last:border-0"
                            key={
                              receivable.claimId
                            }
                          >
                            <td className="px-3 py-3">
                              <div className="font-black text-slate-950">
                                {patient?.displayName ??
                                  "Unknown patient"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {patient?.mrNumber ??
                                  "No MR number"}
                              </div>
                            </td>

                            <td className="px-3 py-3 text-xs font-bold">
                              {insurer?.insurerName ??
                                "Unknown insurer"}
                            </td>

                            <td className="px-3 py-3 font-mono text-xs font-bold">
                              {
                                receivable.claimNumber
                              }
                            </td>

                            <td className="px-3 py-3 font-mono text-xs">
                              {
                                receivable.invoiceNumber
                              }
                            </td>

                            <td className="px-3 py-3 text-right font-bold">
                              {formatCurrency(
                                receivable.approvedAmount,
                              )}
                            </td>

                            <td className="px-3 py-3 text-right font-bold text-emerald-700">
                              {formatCurrency(
                                receivable.paidAmount,
                              )}
                            </td>

                            <td className="px-3 py-3 text-right font-black text-blue-800">
                              {formatCurrency(
                                receivable.outstandingAmount,
                              )}
                            </td>

                            <td className="px-3 py-3 text-right font-black">
                              {
                                receivable.daysOutstanding
                              }
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={[
                                  "rounded-full border px-2.5 py-1 text-[10px] font-black",
                                  getAgingClassName(
                                    receivable.agingBucket,
                                  ),
                                ].join(" ")}
                              >
                                {receivable.agingBucket ===
                                "90-plus"
                                  ? "90+ Days"
                                  : `${receivable.agingBucket} Days`}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-xs">
                              {formatWonFlowDashboardDateTime(
                                receivable.dueDate,
                              )}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>
      ) : null}

      {view === "appeals" ? (
        <div className="space-y-6">
          <WonFlowOperationalPanel
            description="Start an appeal for a rejected, partially approved or authorization-denied claim."
            icon={
              <FileWarning
                size={18}
              />
            }
            title="Open Insurance Appeal"
            tone="violet"
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <select
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setAppealClaimId(
                    event.target.value,
                  );
                }}
                value={appealClaimId}
              >
                <option value="">
                  Select eligible insurance claim
                </option>

                {eligibleAppealClaims.map(
                  (claim) => {
                    const patient =
                      patientsById.get(
                        claim.patientId,
                      );

                    return (
                      <option
                        key={claim.id}
                        value={claim.id}
                      >
                        {patient?.displayName ??
                          "Unknown patient"}
                        {" — "}
                        {claim.claimNumber}
                        {" — "}
                        {humanizeValue(
                          claim.status,
                        )}
                      </option>
                    );
                  },
                )}
              </select>

              <WonFlowActionButton
                onClick={openAppeal}
                variant="primary"
              >
                Open Appeal
              </WonFlowActionButton>
            </div>
          </WonFlowOperationalPanel>

          <section className="rounded-[18px] border border-slate-200 bg-white p-4">
            <select
              className={
                wonFlowInputClassName
              }
              onChange={(
                event,
              ) => {
                setAppealStatusFilter(
                  event.target
                    .value as
                    AppealStatusFilter,
                );
              }}
              value={
                appealStatusFilter
              }
            >
              <option value="all">
                All Appeal Statuses
              </option>

              <option value="draft">
                Draft
              </option>

              <option value="submitted">
                Submitted
              </option>

              <option value="accepted">
                Accepted
              </option>

              <option value="denied">
                Denied
              </option>

              <option value="resubmitted">
                Resubmitted
              </option>

              <option value="closed">
                Closed
              </option>
            </select>
          </section>

          <div className="wf-workspace-rail">
            <div className="wf-workspace-rail-side">
              <WonFlowOperationalPanel
                description="Insurance appeals ordered by creation date."
                title="Appeal Queue"
                tone="violet"
              >
                {visibleAppeals.length ===
                0 ? (
                  <WonFlowEmptyState
                    description="No insurance appeal matches the selected filter."
                    title="No appeals found"
                  />
                ) : (
                  <div className="space-y-3">
                    {visibleAppeals.map(
                      (appeal) => {
                        const patient =
                          patientsById.get(
                            appeal.patientId,
                          );

                        const selected =
                          activeAppeal?.id ===
                          appeal.id;

                        return (
                          <button
                            className={[
                              "w-full rounded-2xl border p-4 text-left transition",
                              selected
                                ? "border-violet-300 bg-violet-50"
                                : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50",
                            ].join(" ")}
                            key={appeal.id}
                            onClick={() => {
                              selectAppeal(
                                appeal.id,
                              );
                            }}
                            type="button"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-black text-slate-950">
                                  {patient?.displayName ??
                                    "Unknown patient"}
                                </div>

                                <div className="mt-1 text-xs font-bold text-violet-700">
                                  {
                                    appeal.appealNumber
                                  }
                                </div>
                              </div>

                              <span
                                className={[
                                  "rounded-full border px-2.5 py-1 text-[10px] font-black",
                                  getAppealClassName(
                                    appeal.status,
                                  ),
                                ].join(" ")}
                              >
                                {humanizeValue(
                                  appeal.status,
                                )}
                              </span>
                            </div>

                            <div className="mt-3 text-xs text-slate-500">
                              {
                                appeal.claimNumber
                              }
                            </div>

                            <div className="mt-2 text-sm font-black text-slate-900">
                              {formatCurrency(
                                appeal.requestedAmount,
                              )}
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
              {activeAppeal ===
                undefined ||
              selectedAppealClaim ===
                undefined ||
              selectedAppealPatient ===
                undefined ? (
                <WonFlowOperationalPanel
                  description="Select or create an insurance appeal."
                  title="Appeal Workspace"
                  tone="violet"
                >
                  <WonFlowEmptyState
                    description="No insurance appeal is currently selected."
                    title="Select an appeal"
                  />
                </WonFlowOperationalPanel>
              ) : (
                <div className="space-y-6">
                  <section className="overflow-hidden rounded-[22px] border border-violet-100 bg-white">
                    <div className="bg-violet-700 p-5 text-white">
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-100">
                        Insurance Appeal
                      </div>

                      <h2 className="mt-2 text-2xl font-black">
                        {
                          selectedAppealPatient.displayName
                        }
                      </h2>

                      <div className="mt-1 text-xs text-violet-100">
                        {
                          selectedAppealPatient.mrNumber
                        }
                        {" · "}
                        {
                          activeAppeal.appealNumber
                        }
                      </div>
                    </div>

                    <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                      <SummaryItem
                        label="Claim Number"
                        value={
                          selectedAppealClaim.claimNumber
                        }
                      />

                      <SummaryItem
                        label="Claim Status"
                        value={humanizeValue(
                          selectedAppealClaim.status,
                        )}
                      />

                      <SummaryItem
                        label="Current Approved"
                        value={formatCurrency(
                          activeAppeal.currentApprovedAmount,
                        )}
                      />

                      <SummaryItem
                        label="Requested Amount"
                        value={formatCurrency(
                          activeAppeal.requestedAmount,
                        )}
                      />
                    </div>
                  </section>

                  <fieldset
                    disabled={
                      activeAppeal.status !==
                      "draft"
                    }
                  >
                    <WonFlowOperationalPanel
                      description="Explain why the insurer should reconsider the original decision."
                      title="Appeal Submission"
                      tone="violet"
                    >
                      <div className="grid gap-4 lg:grid-cols-2">
                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Requested Amount
                          </span>

                          <input
                            className={[
                              wonFlowInputClassName,
                              "mt-1.5",
                            ].join(" ")}
                            max={
                              selectedAppealClaim.invoiceAmount
                            }
                            min={
                              selectedAppealClaim.approvedAmount
                            }
                            onChange={(
                              event,
                            ) => {
                              updateAppeal({
                                requestedAmount:
                                  Number(
                                    event.target.value,
                                  ),
                              });
                            }}
                            type="number"
                            value={
                              activeAppeal.requestedAmount
                            }
                          />
                        </label>

                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Submitted By
                          </span>

                          <input
                            className={[
                              wonFlowInputClassName,
                              "mt-1.5",
                            ].join(" ")}
                            onChange={(
                              event,
                            ) => {
                              updateAppeal({
                                submittedBy:
                                  event.target.value,
                              });
                            }}
                            placeholder="Hospital claims officer"
                            value={
                              activeAppeal.submittedBy
                            }
                          />
                        </label>

                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Appeal Reason
                          </span>

                          <textarea
                            className={[
                              wonFlowTextareaClassName,
                              "mt-1.5 min-h-28",
                            ].join(" ")}
                            onChange={(
                              event,
                            ) => {
                              updateAppeal({
                                appealReason:
                                  event.target.value,
                              });
                            }}
                            placeholder="Why the insurer decision should be reconsidered"
                            value={
                              activeAppeal.appealReason
                            }
                          />
                        </label>

                        <label>
                          <span className="text-xs font-bold text-slate-600">
                            Supporting Summary
                          </span>

                          <textarea
                            className={[
                              wonFlowTextareaClassName,
                              "mt-1.5 min-h-28",
                            ].join(" ")}
                            onChange={(
                              event,
                            ) => {
                              updateAppeal({
                                supportingSummary:
                                  event.target.value,
                              });
                            }}
                            placeholder="Clinical, billing or policy evidence supporting the appeal"
                            value={
                              activeAppeal.supportingSummary
                            }
                          />
                        </label>
                      </div>
                    </WonFlowOperationalPanel>
                  </fieldset>

                  {activeAppeal.status ===
                  "submitted" ? (
                    <WonFlowOperationalPanel
                      description="Record the insurer’s response to the submitted appeal."
                      title="Appeal Decision"
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
                            updateAppeal({
                              insurerReviewer:
                                event.target.value,
                            });
                          }}
                          placeholder="Insurer appeal reviewer"
                          value={
                            activeAppeal.insurerReviewer
                          }
                        />

                        <input
                          className={
                            wonFlowInputClassName
                          }
                          onChange={(
                            event,
                          ) => {
                            updateAppeal({
                              externalAppealReference:
                                event.target.value,
                            });
                          }}
                          placeholder="External appeal reference for acceptance"
                          value={
                            activeAppeal.externalAppealReference
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
                            updateAppeal({
                              insurerResponseNote:
                                event.target.value,
                            });
                          }}
                          placeholder="Appeal acceptance or denial explanation"
                          value={
                            activeAppeal.insurerResponseNote
                          }
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <WonFlowActionButton
                          onClick={() => {
                            decideAppeal(
                              false,
                            );
                          }}
                          variant="danger"
                        >
                          Deny Appeal
                        </WonFlowActionButton>

                        <WonFlowActionButton
                          onClick={() => {
                            decideAppeal(
                              true,
                            );
                          }}
                          variant="primary"
                        >
                          Accept Appeal
                        </WonFlowActionButton>
                      </div>
                    </WonFlowOperationalPanel>
                  ) : null}

                  {activeAppeal.status ===
                  "accepted" ? (
                    <section className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-6">
                      <div className="flex items-start gap-4">
                        <CheckCircle2
                          className="text-emerald-700"
                          size={24}
                        />

                        <div>
                          <h2 className="text-xl font-black text-emerald-950">
                            Appeal accepted
                          </h2>

                          <p className="mt-2 text-sm leading-6 text-emerald-700">
                            The claim may now be resubmitted using reference
                            {" "}
                            <strong>
                              {
                                activeAppeal.externalAppealReference
                              }
                            </strong>
                            .
                          </p>

                          <WonFlowActionButton
                            className="mt-4"
                            onClick={
                              resubmitAppeal
                            }
                            variant="primary"
                          >
                            Resubmit Insurance Claim
                          </WonFlowActionButton>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {activeAppeal.status ===
                  "denied" ? (
                    <section className="rounded-[22px] border border-rose-200 bg-rose-50 p-6">
                      <h2 className="text-xl font-black text-rose-950">
                        Appeal denied
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-rose-700">
                        {
                          activeAppeal.insurerResponseNote
                        }
                      </p>
                    </section>
                  ) : null}

                  {activeAppeal.status ===
                  "resubmitted" ? (
                    <section className="rounded-[22px] border border-violet-200 bg-violet-50 p-6">
                      <h2 className="text-xl font-black text-violet-950">
                        Claim resubmitted
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-violet-700">
                        The insurance claim has returned to the insurer-review workflow.
                      </p>

                      <Link
                        className="wf-button-primary mt-4"
                        href="/operations/insurance"
                      >
                        Open Insurance Claims
                      </Link>
                    </section>
                  ) : null}

                  {activeAppeal.status ===
                  "draft" ? (
                    <div className="wf-sticky-actions flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">
                          Insurance appeal draft
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Verify the amount, reason and supporting information before submission.
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <WonFlowActionButton
                          onClick={
                            saveAppealDraft
                          }
                          variant="secondary"
                        >
                          Save Draft
                        </WonFlowActionButton>

                        <WonFlowActionButton
                          onClick={
                            submitAppeal
                          }
                          variant="primary"
                        >
                          Submit Appeal
                        </WonFlowActionButton>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {view === "remittances" ? (
        <div className="space-y-6">
          <WonFlowOperationalPanel
            description="Reconcile one bank or insurer remittance against one or more approved claims."
            icon={
              <Landmark size={18} />
            }
            title="Insurance Remittance Batch"
            tone="emerald"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label>
                <span className="text-xs font-bold text-slate-600">
                  Remittance Number
                </span>

                <input
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  disabled
                  value={
                    remittanceDraft.remittanceNumber
                  }
                />
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
                    updateRemittanceDraft({
                      insurerId:
                        event.target.value,

                      lines: [
                        createEmptyDemoInsuranceRemittanceLine(),
                      ],
                    });
                  }}
                  value={
                    remittanceDraft.insurerId
                  }
                >
                  <option value="">
                    Select insurer
                  </option>

                  {insurers.map(
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

              <label>
                <span className="text-xs font-bold text-slate-600">
                  Remittance Reference
                </span>

                <input
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    updateRemittanceDraft({
                      remittanceReference:
                        event.target.value,
                    });
                  }}
                  placeholder="Bank, cheque or insurer reference"
                  value={
                    remittanceDraft.remittanceReference
                  }
                />
              </label>

              <label>
                <span className="text-xs font-bold text-slate-600">
                  Date Received
                </span>

                <input
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    updateRemittanceDraft({
                      receivedDate:
                        event.target.value,
                    });
                  }}
                  type="date"
                  value={
                    remittanceDraft.receivedDate
                  }
                />
              </label>

              <label>
                <span className="text-xs font-bold text-slate-600">
                  Amount Received
                </span>

                <input
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  min={0}
                  onChange={(
                    event,
                  ) => {
                    updateRemittanceDraft({
                      bankAmount:
                        Number(
                          event.target.value,
                        ),
                    });
                  }}
                  type="number"
                  value={
                    remittanceDraft.bankAmount
                  }
                />
              </label>

              <label>
                <span className="text-xs font-bold text-slate-600">
                  Reconciled By
                </span>

                <input
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    updateRemittanceDraft({
                      reconciledBy:
                        event.target.value,
                    });
                  }}
                  placeholder="Insurance or finance staff"
                  value={
                    remittanceDraft.reconciledBy
                  }
                />
              </label>

              <label className="md:col-span-2">
                <span className="text-xs font-bold text-slate-600">
                  Reconciliation Note
                </span>

                <textarea
                  className={[
                    wonFlowTextareaClassName,
                    "mt-1.5 min-h-24",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    updateRemittanceDraft({
                      reconciliationNote:
                        event.target.value,
                    });
                  }}
                  placeholder="Unallocated amount, deductions, withholding or insurer adjustment details"
                  value={
                    remittanceDraft.reconciliationNote
                  }
                />
              </label>
            </div>
          </WonFlowOperationalPanel>

          <WonFlowOperationalPanel
            description="Allocate the received amount to approved insurance claims."
            title="Claim Payment Allocation"
            tone="blue"
          >
            <div className="space-y-4">
              {remittanceDraft.lines.map(
                (
                  line,
                  index,
                ) => (
                  <article
                    className="rounded-[18px] border border-slate-200 bg-slate-50/60 p-4"
                    key={line.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-slate-900">
                        Allocation Line
                        {" "}
                        {index + 1}
                      </h3>

                      <button
                        aria-label="Remove remittance line"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                        disabled={
                          remittanceDraft.lines.length ===
                          1
                        }
                        onClick={() => {
                          updateRemittanceDraft({
                            lines:
                              remittanceDraft.lines.filter(
                                (record) =>
                                  record.id !==
                                  line.id,
                              ),
                          });
                        }}
                        type="button"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="md:col-span-2">
                        <span className="text-xs font-bold text-slate-600">
                          Insurance Claim
                        </span>

                        <select
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            populateRemittanceLineFromClaim(
                              line.id,
                              event.target.value,
                            );
                          }}
                          value={
                            line.claimId
                          }
                        >
                          <option value="">
                            Select approved claim
                          </option>

                          {remittanceEligibleClaims.map(
                            (claim) => {
                              const patient =
                                patientsById.get(
                                  claim.patientId,
                                );

                              return (
                                <option
                                  key={claim.id}
                                  value={claim.id}
                                >
                                  {patient?.displayName ??
                                    "Unknown patient"}
                                  {" — "}
                                  {claim.claimNumber}
                                  {" — Outstanding "}
                                  {formatCurrency(
                                    getDemoInsuranceClaimOutstandingAmount(
                                      claim,
                                    ),
                                  )}
                                </option>
                              );
                            },
                          )}
                        </select>
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Expected Outstanding
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          disabled
                          value={formatCurrency(
                            line.expectedOutstandingAmount,
                          )}
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Allocated Amount
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          max={
                            line.expectedOutstandingAmount
                          }
                          min={0}
                          onChange={(
                            event,
                          ) => {
                            const allocatedAmount =
                              Number(
                                event.target.value,
                              );

                            updateRemittanceLine(
                              line.id,
                              {
                                allocatedAmount,

                                varianceAmount:
                                  line.expectedOutstandingAmount -
                                  allocatedAmount,
                              },
                            );
                          }}
                          type="number"
                          value={
                            line.allocatedAmount
                          }
                        />
                      </label>

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Variance
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          disabled
                          value={formatCurrency(
                            Math.max(
                              0,

                              line.expectedOutstandingAmount -
                                line.allocatedAmount,
                            ),
                          )}
                        />
                      </label>

                      <label className="md:col-span-2 xl:col-span-3">
                        <span className="text-xs font-bold text-slate-600">
                          Variance Reason
                        </span>

                        <textarea
                          className={[
                            wonFlowTextareaClassName,
                            "mt-1.5 min-h-20",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            updateRemittanceLine(
                              line.id,
                              {
                                varianceReason:
                                  event.target.value,
                              },
                            );
                          }}
                          placeholder="Withholding, deduction, adjustment or short-payment explanation"
                          value={
                            line.varianceReason
                          }
                        />
                      </label>
                    </div>
                  </article>
                ),
              )}
            </div>

            <button
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700"
              onClick={() => {
                updateRemittanceDraft({
                  lines: [
                    ...remittanceDraft.lines,

                    createEmptyDemoInsuranceRemittanceLine(),
                  ],
                });
              }}
              type="button"
            >
              <Plus size={16} />
              Add Allocation Line
            </button>

            <div className="mt-5 grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-3">
              <RemittanceTotal
                label="Amount Received"
                value={
                  remittanceDraft.bankAmount
                }
              />

              <RemittanceTotal
                label="Allocated"
                value={
                  remittanceAllocatedAmount
                }
              />

              <RemittanceTotal
                label="Unallocated"
                value={
                  remittanceUnallocatedAmount
                }
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <WonFlowActionButton
                onClick={
                  saveRemittanceDraft
                }
                variant="secondary"
              >
                Save Draft
              </WonFlowActionButton>

              <WonFlowActionButton
                onClick={postRemittance}
                variant="primary"
              >
                Post Remittance
              </WonFlowActionButton>
            </div>
          </WonFlowOperationalPanel>

          <WonFlowOperationalPanel
            description="Previously saved and posted insurer remittance batches."
            title="Remittance History"
            tone="violet"
          >
            {remittances.length ===
            0 ? (
              <WonFlowEmptyState
                description="Insurance remittance batches will appear here."
                title="No remittances"
              />
            ) : (
              <div className="wf-content-scroll">
                <table className="w-full min-w-[950px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">
                        Remittance
                      </th>

                      <th className="px-3 py-3">
                        Insurer
                      </th>

                      <th className="px-3 py-3">
                        Reference
                      </th>

                      <th className="px-3 py-3 text-right">
                        Received
                      </th>

                      <th className="px-3 py-3 text-right">
                        Allocated
                      </th>

                      <th className="px-3 py-3 text-right">
                        Unallocated
                      </th>

                      <th className="px-3 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {remittances.map(
                      (remittance) => (
                        <tr
                          className="border-b border-slate-100 last:border-0"
                          key={remittance.id}
                        >
                          <td className="px-3 py-3">
                            <div className="font-black text-slate-950">
                              {
                                remittance.remittanceNumber
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {formatWonFlowDashboardDateTime(
                                remittance.postedAt ||
                                  remittance.createdAt,
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3 text-xs font-bold">
                            {insurersById.get(
                              remittance.insurerId,
                            )?.insurerName ??
                              "Unknown insurer"}
                          </td>

                          <td className="px-3 py-3 font-mono text-xs">
                            {
                              remittance.remittanceReference
                            }
                          </td>

                          <td className="px-3 py-3 text-right font-bold">
                            {formatCurrency(
                              remittance.bankAmount,
                            )}
                          </td>

                          <td className="px-3 py-3 text-right font-bold text-emerald-700">
                            {formatCurrency(
                              remittance.allocatedAmount,
                            )}
                          </td>

                          <td className="px-3 py-3 text-right font-bold text-amber-700">
                            {formatCurrency(
                              remittance.unallocatedAmount,
                            )}
                          </td>

                          <td className="px-3 py-3">
                            <span className="wf-status wf-status-neutral">
                              {humanizeValue(
                                remittance.status,
                              )}
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>
      ) : null}
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

function RemittanceTotal({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
        {label}
      </div>

      <div className="mt-2 text-xl font-black text-emerald-950">
        {formatCurrency(value)}
      </div>
    </div>
  );
}

export function InsuranceReceivablesWorkspace() {
  const hospitalService =
    useWonFlowHospitalService();

  const branches =
    useWonFlowAsyncData({
      key:
        "insurance-receivables:branches",

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
      emptyTitle="Insurance receivables unavailable"
      loadingDescription="WonFlow is preparing receivables, appeals and remittance data."
      loadingTitle="Preparing insurance receivables"
      onRetry={
        branches.reload
      }
      state={branches}
    >
      {(records) => (
        <InsuranceReceivablesContent
          branches={records}
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}