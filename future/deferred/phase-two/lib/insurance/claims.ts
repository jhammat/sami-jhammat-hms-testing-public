import {
  readDemoBillingInvoiceReferences,
} from "../billing";

import type {
  DemoBillingInvoiceReference,
} from "../billing";

export type DemoInsurerStatus =
  | "active"
  | "inactive";

export type DemoInsurerType =
  | "private"
  | "government"
  | "corporate";

export type DemoInsurancePolicyStatus =
  | "active"
  | "suspended"
  | "expired";

export type DemoInsuranceAuthorizationStatus =
  | "not-required"
  | "not-requested"
  | "pending"
  | "approved"
  | "denied";

export type DemoInsuranceClaimStatus =
  | "draft"
  | "authorization-pending"
  | "authorized"
  | "authorization-denied"
  | "submitted"
  | "under-review"
  | "approved"
  | "partially-approved"
  | "rejected"
  | "paid";

export interface DemoInsurer {
  id: string;

  insurerCode: string;
  insurerName: string;

  insurerType:
    DemoInsurerType;

  phoneNumber: string;
  emailAddress: string;

  status:
    DemoInsurerStatus;
}

export interface DemoInsurancePolicy {
  id: string;

  patientId: string;
  insurerId: string;

  memberNumber: string;
  policyNumber: string;
  planName: string;

  coveragePercent: number;
  coPayPercent: number;

  annualLimit: number;
  usedAmount: number;

  effectiveFrom: string;
  effectiveTo: string;

  status:
    DemoInsurancePolicyStatus;

  createdAt: string;
  updatedAt: string;
}

export interface DemoInsuranceClaimFinancials {
  invoiceAmount: number;

  coPayAmount: number;

  expectedInsurerAmount:
    number;

  patientResponsibility:
    number;

  remainingPolicyLimit:
    number;
}

export interface DemoInsuranceClaim {
  id: string;

  claimNumber: string;
  externalClaimReference: string;

  invoiceId: string;
  invoiceNumber: string;

  patientId: string;
  branchId: string;
  encounterId: string;

  insurerId: string;
  policyId: string;

  invoiceAmount: number;

  coveragePercent: number;
  coPayPercent: number;

  expectedInsurerAmount:
    number;

  patientResponsibility:
    number;

  authorizationRequired:
    boolean;

  authorizationStatus:
    DemoInsuranceAuthorizationStatus;

  authorizationNumber: string;
  authorizationRequestedBy:
    string;

  authorizationNote: string;

  status:
    DemoInsuranceClaimStatus;

  submittedBy: string;
  insurerReviewer: string;

  approvedAmount: number;
  rejectedAmount: number;

  insurerResponseNote: string;

  paidAmount: number;
  paymentReference: string;
  paymentRecordedBy: string;

  createdAt: string;
  updatedAt: string;

  authorizationRequestedAt:
    string;

  authorizationDecidedAt:
    string;

  submittedAt: string;
  reviewStartedAt: string;
  responseReceivedAt: string;
  paidAt: string;
}

const INSURER_STORAGE_KEY =
  "wonflow-demo-insurers";

const POLICY_STORAGE_KEY =
  "wonflow-demo-insurance-policies";

const CLAIM_STORAGE_KEY =
  "wonflow-demo-insurance-claims";

const DEFAULT_INSURERS:
  readonly DemoInsurer[] = [
    {
      id: "insurer-state-life",

      insurerCode: "INS-001",

      insurerName:
        "State Life Insurance",

      insurerType:
        "government",

      phoneNumber:
        "+92 51 111 111 111",

      emailAddress:
        "claims@statelife.demo",

      status: "active",
    },
    {
      id: "insurer-jubilee",

      insurerCode: "INS-002",

      insurerName:
        "Jubilee Health Insurance",

      insurerType:
        "private",

      phoneNumber:
        "+92 21 111 654 111",

      emailAddress:
        "healthclaims@jubilee.demo",

      status: "active",
    },
    {
      id: "insurer-efu",

      insurerCode: "INS-003",

      insurerName:
        "EFU Health Insurance",

      insurerType:
        "private",

      phoneNumber:
        "+92 21 111 338 111",

      emailAddress:
        "medicalclaims@efu.demo",

      status: "active",
    },
    {
      id: "insurer-corporate-plan",

      insurerCode: "INS-004",

      insurerName:
        "WonFlow Corporate Health Plan",

      insurerType:
        "corporate",

      phoneNumber:
        "+92 51 000 000 000",

      emailAddress:
        "corporate@wonflow.demo",

      status: "active",
    },
  ];

function createIdentifier(
  prefix: string,
): string {
  if (
    typeof globalThis.crypto
      ?.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return [
    prefix,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function padNumber(
  value: number,
): string {
  return String(value)
    .padStart(2, "0");
}

function createDateCode(): string {
  const date =
    new Date();

  return [
    date.getFullYear(),

    padNumber(
      date.getMonth() + 1,
    ),

    padNumber(
      date.getDate(),
    ),
  ].join("");
}

function generateClaimNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `CLM-${createDateCode()}-${randomPart}`;
}

function roundMoney(
  value: number,
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return (
    Math.round(
      value * 100,
    ) / 100
  );
}

function clampPercent(
  value: number,
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, value),
  );
}

function normalizeValue(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase();
}

function isDateWithinPolicy(
  policy:
    DemoInsurancePolicy,
): boolean {
  const today =
    new Date();

  const startDate =
    policy.effectiveFrom === ""
      ? undefined
      : new Date(
          `${policy.effectiveFrom}T00:00:00`,
        );

  const endDate =
    policy.effectiveTo === ""
      ? undefined
      : new Date(
          `${policy.effectiveTo}T23:59:59`,
        );

  if (
    startDate !== undefined &&
    !Number.isNaN(
      startDate.getTime(),
    ) &&
    today < startDate
  ) {
    return false;
  }

  if (
    endDate !== undefined &&
    !Number.isNaN(
      endDate.getTime(),
    ) &&
    today > endDate
  ) {
    return false;
  }

  return true;
}

export function readDemoInsurers():
  DemoInsurer[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      INSURER_STORAGE_KEY,
    );

  if (
    storedValue === null
  ) {
    return [];
  }

  try {
    const parsedValue:
      unknown =
      JSON.parse(storedValue);

    return Array.isArray(
      parsedValue,
    )
      ? parsedValue as
          DemoInsurer[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoInsurers(
  insurers:
    readonly DemoInsurer[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    INSURER_STORAGE_KEY,

    JSON.stringify(
      insurers.slice(0, 500),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-insurers-changed",
    ),
  );
}

export function initializeDemoInsurers():
  DemoInsurer[] {
  const insurers =
    readDemoInsurers();

  if (
    typeof window !==
      "undefined" &&
    window.localStorage.getItem(
      INSURER_STORAGE_KEY,
    ) === null
  ) {
    writeDemoInsurers(
      insurers,
    );
  }

  return insurers;
}

export function readDemoInsurancePolicies():
  DemoInsurancePolicy[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      POLICY_STORAGE_KEY,
    );

  if (
    storedValue === null
  ) {
    return [];
  }

  try {
    const parsedValue:
      unknown =
      JSON.parse(storedValue);

    return Array.isArray(
      parsedValue,
    )
      ? parsedValue as
          DemoInsurancePolicy[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoInsurancePolicies(
  policies:
    readonly DemoInsurancePolicy[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    POLICY_STORAGE_KEY,

    JSON.stringify(
      policies.slice(0, 2000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-insurance-policies-changed",
    ),
  );
}

export function validateDemoInsurancePolicy(
  input: {
    patientId: string;
    insurerId: string;

    memberNumber: string;
    policyNumber: string;
    planName: string;

    coveragePercent: number;
    coPayPercent: number;

    annualLimit: number;

    effectiveFrom: string;
    effectiveTo: string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    input.patientId.trim() ===
    ""
  ) {
    errors.push(
      "Select the insured patient.",
    );
  }

  const insurer =
    readDemoInsurers()
      .find(
        (record) =>
          record.id ===
          input.insurerId,
      );

  if (
    insurer === undefined
  ) {
    errors.push(
      "Select the insurance company.",
    );
  } else if (
    insurer.status !==
    "active"
  ) {
    errors.push(
      "The selected insurance company is inactive.",
    );
  }

  if (
    input.memberNumber
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the member number.",
    );
  }

  if (
    input.policyNumber
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the policy number.",
    );
  }

  if (
    input.planName
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the insurance plan name.",
    );
  }

  if (
    input.coveragePercent <
      0 ||
    input.coveragePercent >
      100
  ) {
    errors.push(
      "Coverage percentage must be between 0 and 100.",
    );
  }

  if (
    input.coPayPercent < 0 ||
    input.coPayPercent > 100
  ) {
    errors.push(
      "Co-pay percentage must be between 0 and 100.",
    );
  }

  if (
    !Number.isFinite(
      input.annualLimit,
    ) ||
    input.annualLimit < 0
  ) {
    errors.push(
      "Annual limit must be zero or greater.",
    );
  }

  if (
    input.effectiveFrom !==
      "" &&
    input.effectiveTo !==
      "" &&
    input.effectiveTo <
      input.effectiveFrom
  ) {
    errors.push(
      "Policy end date cannot be before the start date.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function createDemoInsurancePolicy(
  input: {
    patientId: string;
    insurerId: string;

    memberNumber: string;
    policyNumber: string;
    planName: string;

    coveragePercent: number;
    coPayPercent: number;

    annualLimit: number;

    effectiveFrom: string;
    effectiveTo: string;
  },
): DemoInsurancePolicy |
  undefined {
  const errors =
    validateDemoInsurancePolicy(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const policies =
    readDemoInsurancePolicies();

  const duplicatePolicy =
    policies.some(
      (policy) =>
        policy.patientId ===
          input.patientId &&
        (
          normalizeValue(
            policy.policyNumber,
          ) ===
            normalizeValue(
              input.policyNumber,
            ) ||
          normalizeValue(
            policy.memberNumber,
          ) ===
            normalizeValue(
              input.memberNumber,
            )
        ),
    );

  if (
    duplicatePolicy
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const policy:
    DemoInsurancePolicy = {
    id:
      createIdentifier(
        "insurance-policy",
      ),

    patientId:
      input.patientId,

    insurerId:
      input.insurerId,

    memberNumber:
      input.memberNumber
        .trim(),

    policyNumber:
      input.policyNumber
        .trim(),

    planName:
      input.planName.trim(),

    coveragePercent:
      clampPercent(
        input.coveragePercent,
      ),

    coPayPercent:
      clampPercent(
        input.coPayPercent,
      ),

    annualLimit:
      roundMoney(
        input.annualLimit,
      ),

    usedAmount: 0,

    effectiveFrom:
      input.effectiveFrom,

    effectiveTo:
      input.effectiveTo,

    status: "active",

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoInsurancePolicies([
    policy,
    ...policies,
  ]);

  return policy;
}

export function toggleDemoInsurancePolicyStatus(
  policyId: string,
): DemoInsurancePolicy |
  undefined {
  const policies =
    readDemoInsurancePolicies();

  const policy =
    policies.find(
      (record) =>
        record.id ===
        policyId,
    );

  if (
    policy === undefined
  ) {
    return undefined;
  }

  const updatedPolicy:
    DemoInsurancePolicy = {
    ...policy,

    status:
      policy.status ===
      "active"
        ? "suspended"
        : "active",

    updatedAt:
      new Date().toISOString(),
  };

  writeDemoInsurancePolicies(
    policies.map(
      (record) =>
        record.id ===
        policyId
          ? updatedPolicy
          : record,
    ),
  );

  return updatedPolicy;
}

export function getActiveDemoInsurancePolicyForPatient(
  patientId: string,
): DemoInsurancePolicy |
  undefined {
  return readDemoInsurancePolicies()
    .filter(
      (policy) =>
        policy.patientId ===
          patientId &&
        policy.status ===
          "active" &&
        isDateWithinPolicy(
          policy,
        ),
    )
    .sort(
      (
        left,
        right,
      ) =>
        new Date(
          right.updatedAt,
        ).getTime() -
        new Date(
          left.updatedAt,
        ).getTime(),
    )[0];
}

export function calculateDemoInsuranceClaimFinancials(
  invoiceAmount: number,

  policy:
    DemoInsurancePolicy,
): DemoInsuranceClaimFinancials {
  const normalizedInvoiceAmount =
    roundMoney(
      Math.max(
        0,
        invoiceAmount,
      ),
    );

  const coPayAmount =
    roundMoney(
      normalizedInvoiceAmount *
        (
          clampPercent(
            policy.coPayPercent,
          ) / 100
        ),
    );

  const amountAfterCoPay =
    Math.max(
      0,
      normalizedInvoiceAmount -
        coPayAmount,
    );

  const calculatedInsuranceAmount =
    roundMoney(
      amountAfterCoPay *
        (
          clampPercent(
            policy.coveragePercent,
          ) / 100
        ),
    );

  const remainingPolicyLimit =
    policy.annualLimit <= 0
      ? Number.POSITIVE_INFINITY
      : Math.max(
          0,
          policy.annualLimit -
            policy.usedAmount,
        );

  const expectedInsurerAmount =
    roundMoney(
      Math.min(
        calculatedInsuranceAmount,
        remainingPolicyLimit,
      ),
    );

  return {
    invoiceAmount:
      normalizedInvoiceAmount,

    coPayAmount,

    expectedInsurerAmount,

    patientResponsibility:
      roundMoney(
        normalizedInvoiceAmount -
          expectedInsurerAmount,
      ),

    remainingPolicyLimit:
      Number.isFinite(
        remainingPolicyLimit,
      )
        ? roundMoney(
            remainingPolicyLimit,
          )
        : 0,
  };
}

export function readDemoInsuranceClaims():
  DemoInsuranceClaim[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      CLAIM_STORAGE_KEY,
    );

  if (
    storedValue === null
  ) {
    return [];
  }

  try {
    const parsedValue:
      unknown =
      JSON.parse(storedValue);

    return Array.isArray(
      parsedValue,
    )
      ? parsedValue as
          DemoInsuranceClaim[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoInsuranceClaims(
  claims:
    readonly DemoInsuranceClaim[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    CLAIM_STORAGE_KEY,

    JSON.stringify(
      claims.slice(0, 5000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-insurance-claims-changed",
    ),
  );
}

export function saveDemoInsuranceClaim(
  claim:
    DemoInsuranceClaim,
): DemoInsuranceClaim {
  const claims =
    readDemoInsuranceClaims();

  const normalizedClaim:
    DemoInsuranceClaim = {
    ...claim,

    externalClaimReference:
      claim
        .externalClaimReference
        .trim(),

    authorizationNumber:
      claim.authorizationNumber
        .trim(),

    authorizationRequestedBy:
      claim
        .authorizationRequestedBy
        .trim(),

    authorizationNote:
      claim.authorizationNote
        .trim(),

    submittedBy:
      claim.submittedBy
        .trim(),

    insurerReviewer:
      claim.insurerReviewer
        .trim(),

    insurerResponseNote:
      claim
        .insurerResponseNote
        .trim(),

    paymentReference:
      claim.paymentReference
        .trim(),

    paymentRecordedBy:
      claim
        .paymentRecordedBy
        .trim(),

    updatedAt:
      new Date().toISOString(),
  };

  const exists =
    claims.some(
      (record) =>
        record.id ===
        normalizedClaim.id,
    );

  writeDemoInsuranceClaims(
    exists
      ? claims.map(
          (record) =>
            record.id ===
            normalizedClaim.id
              ? normalizedClaim
              : record,
        )
      : [
          normalizedClaim,
          ...claims,
        ],
  );

  return normalizedClaim;
}

export function createDemoInsuranceClaimFromInvoice(
  invoice:
    DemoBillingInvoiceReference,
): DemoInsuranceClaim |
  undefined {
  if (
    invoice.patientId ===
      "" ||
    invoice.totalAmount <= 0
  ) {
    return undefined;
  }

  const policy =
    getActiveDemoInsurancePolicyForPatient(
      invoice.patientId,
    );

  if (
    policy === undefined
  ) {
    return undefined;
  }

  const existingClaims =
    readDemoInsuranceClaims();

  const duplicateClaim =
    existingClaims.find(
      (claim) =>
        claim.invoiceId ===
          invoice.id ||
        (
          claim.invoiceNumber ===
            invoice.invoiceNumber &&
          claim.patientId ===
            invoice.patientId
        ),
    );

  if (
    duplicateClaim !==
    undefined
  ) {
    return duplicateClaim;
  }

  const financials =
    calculateDemoInsuranceClaimFinancials(
      invoice.totalAmount,
      policy,
    );

  const authorizationRequired =
    invoice.totalAmount >=
    25_000;

  const timestamp =
    new Date().toISOString();

  const claim:
    DemoInsuranceClaim = {
    id:
      createIdentifier(
        "insurance-claim",
      ),

    claimNumber:
      generateClaimNumber(),

    externalClaimReference:
      "",

    invoiceId:
      invoice.id,

    invoiceNumber:
      invoice.invoiceNumber,

    patientId:
      invoice.patientId,

    branchId:
      invoice.branchId,

    encounterId:
      invoice.encounterId,

    insurerId:
      policy.insurerId,

    policyId:
      policy.id,

    invoiceAmount:
      financials.invoiceAmount,

    coveragePercent:
      policy.coveragePercent,

    coPayPercent:
      policy.coPayPercent,

    expectedInsurerAmount:
      financials.expectedInsurerAmount,

    patientResponsibility:
      financials.patientResponsibility,

    authorizationRequired,

    authorizationStatus:
      authorizationRequired
        ? "not-requested"
        : "not-required",

    authorizationNumber:
      "",

    authorizationRequestedBy:
      "",

    authorizationNote:
      "",

    status: "draft",

    submittedBy: "",
    insurerReviewer: "",

    approvedAmount: 0,

    rejectedAmount:
      financials.invoiceAmount,

    insurerResponseNote: "",

    paidAmount: 0,

    paymentReference: "",

    paymentRecordedBy:
      "",

    createdAt: timestamp,
    updatedAt: timestamp,

    authorizationRequestedAt:
      "",

    authorizationDecidedAt:
      "",

    submittedAt: "",
    reviewStartedAt: "",
    responseReceivedAt: "",
    paidAt: "",
  };

  writeDemoInsuranceClaims([
    claim,
    ...existingClaims,
  ]);

  return claim;
}

export function synchronizeDemoInsuranceClaimsFromInvoices():
  DemoInsuranceClaim[] {
  const createdClaims:
    DemoInsuranceClaim[] =
    [];

  const existingClaims =
    readDemoInsuranceClaims();

  const claimedInvoiceIds =
    new Set(
      existingClaims.map(
        (claim) =>
          claim.invoiceId,
      ),
    );

  readDemoBillingInvoiceReferences()
    .filter(
      (invoice) =>
        invoice.patientId !==
          "" &&
        invoice.totalAmount >
          0 &&
        !claimedInvoiceIds.has(
          invoice.id,
        ),
    )
    .forEach(
      (invoice) => {
        const claim =
          createDemoInsuranceClaimFromInvoice(
            invoice,
          );

        if (
          claim !==
          undefined &&
          !existingClaims.some(
            (existingClaim) =>
              existingClaim.id ===
              claim.id,
          )
        ) {
          createdClaims.push(
            claim,
          );

          claimedInvoiceIds.add(
            invoice.id,
          );
        }
      },
    );

  return createdClaims;
}

export function updateDemoInsuranceClaimAuthorizationRequirement(
  claimId: string,

  authorizationRequired:
    boolean,
): DemoInsuranceClaim |
  undefined {
  const claim =
    readDemoInsuranceClaims()
      .find(
        (record) =>
          record.id ===
          claimId,
      );

  if (
    claim === undefined ||
    claim.status !== "draft"
  ) {
    return undefined;
  }

  return saveDemoInsuranceClaim({
    ...claim,

    authorizationRequired,

    authorizationStatus:
      authorizationRequired
        ? "not-requested"
        : "not-required",

    authorizationNumber: "",
    authorizationNote: "",

    authorizationRequestedAt:
      "",

    authorizationDecidedAt:
      "",
  });
}

export function requestDemoInsuranceAuthorization(
  claimId: string,

  requestedBy: string,

  authorizationNote: string,
): DemoInsuranceClaim |
  undefined {
  const requester =
    requestedBy.trim();

  const claim =
    readDemoInsuranceClaims()
      .find(
        (record) =>
          record.id ===
          claimId,
      );

  if (
    claim === undefined ||
    claim.status !== "draft" ||
    !claim.authorizationRequired ||
    requester.length < 2
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoInsuranceClaim({
    ...claim,

    status:
      "authorization-pending",

    authorizationStatus:
      "pending",

    authorizationRequestedBy:
      requester,

    authorizationNote:
      authorizationNote.trim(),

    authorizationRequestedAt:
      timestamp,
  });
}

export function decideDemoInsuranceAuthorization(
  input: {
    claimId: string;

    approved: boolean;

    authorizationNumber:
      string;

    insurerReviewer: string;

    decisionNote: string;
  },
): DemoInsuranceClaim |
  undefined {
  const claim =
    readDemoInsuranceClaims()
      .find(
        (record) =>
          record.id ===
          input.claimId,
      );

  const reviewer =
    input.insurerReviewer
      .trim();

  if (
    claim === undefined ||
    claim.status !==
      "authorization-pending" ||
    reviewer.length < 2
  ) {
    return undefined;
  }

  if (
    input.approved &&
    input.authorizationNumber
      .trim()
      .length < 2
  ) {
    return undefined;
  }

  if (
    !input.approved &&
    input.decisionNote
      .trim()
      .length < 3
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoInsuranceClaim({
    ...claim,

    status:
      input.approved
        ? "authorized"
        : "authorization-denied",

    authorizationStatus:
      input.approved
        ? "approved"
        : "denied",

    authorizationNumber:
      input.approved
        ? input.authorizationNumber
            .trim()
        : "",

    insurerReviewer:
      reviewer,

    authorizationNote:
      input.decisionNote
        .trim(),

    authorizationDecidedAt:
      timestamp,
  });
}

export function submitDemoInsuranceClaim(
  claimId: string,

  submittedBy: string,
): DemoInsuranceClaim |
  undefined {
  const submitter =
    submittedBy.trim();

  const claim =
    readDemoInsuranceClaims()
      .find(
        (record) =>
          record.id ===
          claimId,
      );

  if (
    claim === undefined ||
    submitter.length < 2
  ) {
    return undefined;
  }

  const authorizationReady =
    !claim.authorizationRequired ||
    claim.authorizationStatus ===
      "approved";

  if (
    !authorizationReady ||
    (
      claim.status !==
        "draft" &&
      claim.status !==
        "authorized"
    )
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoInsuranceClaim({
    ...claim,

    status: "submitted",

    submittedBy:
      submitter,

    externalClaimReference:
      claim.externalClaimReference ||
      `EXT-${claim.claimNumber}`,

    submittedAt: timestamp,
  });
}

export function startDemoInsuranceClaimReview(
  claimId: string,

  insurerReviewer: string,
): DemoInsuranceClaim |
  undefined {
  const reviewer =
    insurerReviewer.trim();

  const claim =
    readDemoInsuranceClaims()
      .find(
        (record) =>
          record.id ===
          claimId,
      );

  if (
    claim === undefined ||
    claim.status !==
      "submitted" ||
    reviewer.length < 2
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoInsuranceClaim({
    ...claim,

    status: "under-review",

    insurerReviewer:
      reviewer,

    reviewStartedAt:
      timestamp,
  });
}

export function recordDemoInsuranceClaimResponse(
  input: {
    claimId: string;

    approvedAmount: number;

    insurerReviewer: string;

    responseNote: string;
  },
): DemoInsuranceClaim |
  undefined {
  const claim =
    readDemoInsuranceClaims()
      .find(
        (record) =>
          record.id ===
          input.claimId,
      );

  const reviewer =
    input.insurerReviewer
      .trim();

  const approvedAmount =
    roundMoney(
      input.approvedAmount,
    );

  if (
    claim === undefined ||
    claim.status !==
      "under-review" ||
    reviewer.length < 2 ||
    approvedAmount < 0 ||
    approvedAmount >
      claim.invoiceAmount
  ) {
    return undefined;
  }

  if (
    approvedAmount === 0 &&
    input.responseNote
      .trim()
      .length < 3
  ) {
    return undefined;
  }

  const expectedAmount =
    claim.expectedInsurerAmount;

  const status:
    DemoInsuranceClaimStatus =
    approvedAmount === 0
      ? "rejected"
      : approvedAmount <
          expectedAmount
        ? "partially-approved"
        : "approved";

  const timestamp =
    new Date().toISOString();

  return saveDemoInsuranceClaim({
    ...claim,

    status,

    insurerReviewer:
      reviewer,

    approvedAmount,

    rejectedAmount:
      roundMoney(
        claim.invoiceAmount -
          approvedAmount,
      ),

    patientResponsibility:
      roundMoney(
        claim.invoiceAmount -
          approvedAmount,
      ),

    insurerResponseNote:
      input.responseNote
        .trim(),

    responseReceivedAt:
      timestamp,
  });
}

export function recordDemoInsuranceClaimPayment(
  input: {
    claimId: string;

    paymentAmount: number;

    paymentReference: string;

    recordedBy: string;
  },
): DemoInsuranceClaim |
  undefined {
  const claim =
    readDemoInsuranceClaims()
      .find(
        (record) =>
          record.id ===
          input.claimId,
      );

  const paymentAmount =
    roundMoney(
      input.paymentAmount,
    );

  const recordedBy =
    input.recordedBy.trim();

  const paymentReference =
    input.paymentReference
      .trim();

  if (
    claim === undefined ||
    (
      claim.status !==
        "approved" &&
      claim.status !==
        "partially-approved"
    ) ||
    paymentAmount <= 0 ||
    recordedBy.length < 2 ||
    paymentReference.length <
      2
  ) {
    return undefined;
  }

  const remainingPayment =
    roundMoney(
      claim.approvedAmount -
        claim.paidAmount,
    );

  if (
    paymentAmount >
    remainingPayment
  ) {
    return undefined;
  }

  const claims =
    readDemoInsuranceClaims();

  const duplicateReference =
    claims.some(
      (record) =>
        record.id !==
          claim.id &&
        normalizeValue(
          record.paymentReference,
        ) ===
          normalizeValue(
            paymentReference,
          ) &&
        paymentReference !==
          "",
    );

  if (
    duplicateReference
  ) {
    return undefined;
  }

  const updatedPaidAmount =
    roundMoney(
      claim.paidAmount +
        paymentAmount,
    );

  const fullyPaid =
    updatedPaidAmount >=
    claim.approvedAmount;

  const timestamp =
    new Date().toISOString();

  const updatedClaim =
    saveDemoInsuranceClaim({
      ...claim,

      status:
        fullyPaid
          ? "paid"
          : claim.status,

      paidAmount:
        updatedPaidAmount,

      paymentReference,

      paymentRecordedBy:
        recordedBy,

      paidAt:
        fullyPaid
          ? timestamp
          : claim.paidAt,
    });

  const policies =
    readDemoInsurancePolicies();

  const policy =
    policies.find(
      (record) =>
        record.id ===
        claim.policyId,
    );

  if (
    policy !== undefined
  ) {
    writeDemoInsurancePolicies(
      policies.map(
        (record) =>
          record.id ===
          policy.id
            ? {
                ...record,

                usedAmount:
                  roundMoney(
                    record.usedAmount +
                      paymentAmount,
                  ),

                updatedAt:
                  timestamp,
              }
            : record,
      ),
    );
  }

  return updatedClaim;
}
