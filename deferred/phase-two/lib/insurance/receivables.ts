import {
  readDemoInsuranceClaims,
  readDemoInsurancePolicies,
  saveDemoInsuranceClaim,
  writeDemoInsuranceClaims,
  writeDemoInsurancePolicies,
} from "./claims";

import type {
  DemoInsuranceClaim,
  DemoInsurancePolicy,
} from "./claims";

export type DemoInsuranceAgingBucket =
  | "0-30"
  | "31-60"
  | "61-90"
  | "90-plus";

export type DemoInsuranceAppealStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "denied"
  | "resubmitted"
  | "closed";

export type DemoInsuranceRemittanceStatus =
  | "draft"
  | "posted"
  | "cancelled";

export interface DemoInsuranceReceivable {
  claimId: string;
  claimNumber: string;

  patientId: string;
  insurerId: string;
  policyId: string;

  branchId: string;
  encounterId: string;

  invoiceNumber: string;

  approvedAmount: number;
  paidAmount: number;
  outstandingAmount: number;

  ageStartDate: string;
  dueDate: string;

  daysOutstanding: number;
  overdueDays: number;

  agingBucket:
    DemoInsuranceAgingBucket;

  isOverdue: boolean;

  claimStatus:
    DemoInsuranceClaim["status"];
}

export interface DemoInsuranceAgingBucketSummary {
  bucket:
    DemoInsuranceAgingBucket;

  claimCount: number;
  outstandingAmount: number;
}

export interface DemoInsuranceAgingSummary {
  totalOpenClaims: number;
  totalOutstanding: number;

  overdueClaimCount: number;
  overdueAmount: number;

  oldestOutstandingDays: number;

  buckets:
    DemoInsuranceAgingBucketSummary[];
}

export interface DemoInsuranceAppeal {
  id: string;

  appealNumber: string;

  claimId: string;
  claimNumber: string;

  patientId: string;
  insurerId: string;

  status:
    DemoInsuranceAppealStatus;

  currentApprovedAmount: number;
  requestedAmount: number;

  appealReason: string;
  supportingSummary: string;

  submittedBy: string;

  insurerReviewer: string;
  insurerResponseNote: string;

  externalAppealReference: string;

  createdAt: string;
  updatedAt: string;

  submittedAt: string;
  decidedAt: string;
  resubmittedAt: string;
  closedAt: string;
}

export interface DemoInsuranceRemittanceLine {
  id: string;

  claimId: string;
  claimNumber: string;

  patientId: string;
  invoiceNumber: string;

  expectedOutstandingAmount:
    number;

  allocatedAmount: number;

  varianceAmount: number;
  varianceReason: string;
}

export interface DemoInsuranceRemittanceBatch {
  id: string;

  remittanceNumber: string;
  remittanceReference: string;

  insurerId: string;

  bankAmount: number;

  allocatedAmount: number;
  unallocatedAmount: number;

  receivedDate: string;

  reconciledBy: string;
  reconciliationNote: string;

  status:
    DemoInsuranceRemittanceStatus;

  lines:
    DemoInsuranceRemittanceLine[];

  createdAt: string;
  updatedAt: string;

  postedAt: string;
  cancelledAt: string;
}

const INSURANCE_APPEAL_STORAGE_KEY =
  "wonflow-demo-insurance-appeals";

const INSURANCE_REMITTANCE_STORAGE_KEY =
  "wonflow-demo-insurance-remittances";

const INSURANCE_PAYMENT_DUE_DAYS = 30;

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

function generateAppealNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `APL-${createDateCode()}-${randomPart}`;
}

function generateRemittanceNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `REM-${createDateCode()}-${randomPart}`;
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

function normalizeValue(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase();
}

function parseDate(
  value: string,
): Date {
  if (
    value.trim() !== ""
  ) {
    const parsedDate =
      new Date(value);

    if (
      !Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      return parsedDate;
    }
  }

  return new Date();
}

function addDays(
  value: Date,
  days: number,
): Date {
  const result =
    new Date(value);

  result.setDate(
    result.getDate() + days,
  );

  return result;
}

function differenceInCalendarDays(
  laterDate: Date,
  earlierDate: Date,
): number {
  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  const normalizedLater =
    Date.UTC(
      laterDate.getFullYear(),
      laterDate.getMonth(),
      laterDate.getDate(),
    );

  const normalizedEarlier =
    Date.UTC(
      earlierDate.getFullYear(),
      earlierDate.getMonth(),
      earlierDate.getDate(),
    );

  return Math.max(
    0,

    Math.floor(
      (
        normalizedLater -
        normalizedEarlier
      ) /
        millisecondsPerDay,
    ),
  );
}

function getClaimAgeStartDate(
  claim:
    DemoInsuranceClaim,
): string {
  return (
    claim.responseReceivedAt ||
    claim.reviewStartedAt ||
    claim.submittedAt ||
    claim.createdAt
  );
}

export function getDemoInsuranceAgingBucket(
  daysOutstanding: number,
): DemoInsuranceAgingBucket {
  if (
    daysOutstanding <= 30
  ) {
    return "0-30";
  }

  if (
    daysOutstanding <= 60
  ) {
    return "31-60";
  }

  if (
    daysOutstanding <= 90
  ) {
    return "61-90";
  }

  return "90-plus";
}

export function getDemoInsuranceClaimOutstandingAmount(
  claim:
    DemoInsuranceClaim,
): number {
  return roundMoney(
    Math.max(
      0,

      claim.approvedAmount -
        claim.paidAmount,
    ),
  );
}

export function buildDemoInsuranceReceivables(
  referenceDate =
    new Date(),
): DemoInsuranceReceivable[] {
  return readDemoInsuranceClaims()
    .filter(
      (claim) =>
        (
          claim.status ===
            "approved" ||
          claim.status ===
            "partially-approved"
        ) &&
        getDemoInsuranceClaimOutstandingAmount(
          claim,
        ) > 0,
    )
    .map(
      (
        claim,
      ): DemoInsuranceReceivable => {
        const ageStartDate =
          getClaimAgeStartDate(
            claim,
          );

        const parsedAgeStartDate =
          parseDate(
            ageStartDate,
          );

        const dueDate =
          addDays(
            parsedAgeStartDate,

            INSURANCE_PAYMENT_DUE_DAYS,
          );

        const daysOutstanding =
          differenceInCalendarDays(
            referenceDate,
            parsedAgeStartDate,
          );

        return {
          claimId:
            claim.id,

          claimNumber:
            claim.claimNumber,

          patientId:
            claim.patientId,

          insurerId:
            claim.insurerId,

          policyId:
            claim.policyId,

          branchId:
            claim.branchId,

          encounterId:
            claim.encounterId,

          invoiceNumber:
            claim.invoiceNumber,

          approvedAmount:
            claim.approvedAmount,

          paidAmount:
            claim.paidAmount,

          outstandingAmount:
            getDemoInsuranceClaimOutstandingAmount(
              claim,
            ),

          ageStartDate:
            parsedAgeStartDate
              .toISOString(),

          dueDate:
            dueDate.toISOString(),

          daysOutstanding,

          overdueDays:
            Math.max(
              0,

              daysOutstanding -
                INSURANCE_PAYMENT_DUE_DAYS,
            ),

          agingBucket:
            getDemoInsuranceAgingBucket(
              daysOutstanding,
            ),

          isOverdue:
            daysOutstanding >
            INSURANCE_PAYMENT_DUE_DAYS,

          claimStatus:
            claim.status,
        };
      },
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.daysOutstanding -
        left.daysOutstanding,
    );
}

export function buildDemoInsuranceAgingSummary(
  referenceDate =
    new Date(),
): DemoInsuranceAgingSummary {
  const receivables =
    buildDemoInsuranceReceivables(
      referenceDate,
    );

  const bucketOrder:
    DemoInsuranceAgingBucket[] =
    [
      "0-30",
      "31-60",
      "61-90",
      "90-plus",
    ];

  return {
    totalOpenClaims:
      receivables.length,

    totalOutstanding:
      roundMoney(
        receivables.reduce(
          (
            total,
            receivable,
          ) =>
            total +
            receivable
              .outstandingAmount,

          0,
        ),
      ),

    overdueClaimCount:
      receivables.filter(
        (receivable) =>
          receivable.isOverdue,
      ).length,

    overdueAmount:
      roundMoney(
        receivables
          .filter(
            (receivable) =>
              receivable.isOverdue,
          )
          .reduce(
            (
              total,
              receivable,
            ) =>
              total +
              receivable
                .outstandingAmount,

            0,
          ),
      ),

    oldestOutstandingDays:
      receivables.reduce(
        (
          oldest,
          receivable,
        ) =>
          Math.max(
            oldest,
            receivable
              .daysOutstanding,
          ),

        0,
      ),

    buckets:
      bucketOrder.map(
        (bucket) => {
          const bucketReceivables =
            receivables.filter(
              (receivable) =>
                receivable
                  .agingBucket ===
                bucket,
            );

          return {
            bucket,

            claimCount:
              bucketReceivables.length,

            outstandingAmount:
              roundMoney(
                bucketReceivables.reduce(
                  (
                    total,
                    receivable,
                  ) =>
                    total +
                    receivable
                      .outstandingAmount,

                  0,
                ),
              ),
          };
        },
      ),
  };
}

export function readDemoInsuranceAppeals():
  DemoInsuranceAppeal[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      INSURANCE_APPEAL_STORAGE_KEY,
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
          DemoInsuranceAppeal[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoInsuranceAppeals(
  appeals:
    readonly DemoInsuranceAppeal[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    INSURANCE_APPEAL_STORAGE_KEY,

    JSON.stringify(
      appeals.slice(0, 3000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-insurance-appeals-changed",
    ),
  );
}

export function saveDemoInsuranceAppeal(
  appeal:
    DemoInsuranceAppeal,
): DemoInsuranceAppeal {
  const appeals =
    readDemoInsuranceAppeals();

  const normalizedAppeal:
    DemoInsuranceAppeal = {
    ...appeal,

    appealReason:
      appeal.appealReason
        .trim(),

    supportingSummary:
      appeal.supportingSummary
        .trim(),

    submittedBy:
      appeal.submittedBy
        .trim(),

    insurerReviewer:
      appeal.insurerReviewer
        .trim(),

    insurerResponseNote:
      appeal
        .insurerResponseNote
        .trim(),

    externalAppealReference:
      appeal
        .externalAppealReference
        .trim(),

    requestedAmount:
      roundMoney(
        appeal.requestedAmount,
      ),

    updatedAt:
      new Date().toISOString(),
  };

  const exists =
    appeals.some(
      (record) =>
        record.id ===
        normalizedAppeal.id,
    );

  writeDemoInsuranceAppeals(
    exists
      ? appeals.map(
          (record) =>
            record.id ===
            normalizedAppeal.id
              ? normalizedAppeal
              : record,
        )
      : [
          normalizedAppeal,
          ...appeals,
        ],
  );

  return normalizedAppeal;
}

export function getDemoInsuranceClaimsEligibleForAppeal():
  DemoInsuranceClaim[] {
  return readDemoInsuranceClaims()
    .filter(
      (claim) =>
        claim.status ===
          "rejected" ||
        claim.status ===
          "partially-approved" ||
        claim.status ===
          "authorization-denied",
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
    );
}

export function createOrGetDemoInsuranceAppeal(
  claimId: string,
): DemoInsuranceAppeal |
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
    (
      claim.status !==
        "rejected" &&
      claim.status !==
        "partially-approved" &&
      claim.status !==
        "authorization-denied"
    )
  ) {
    return undefined;
  }

  const appeals =
    readDemoInsuranceAppeals();

  const existingOpenAppeal =
    appeals.find(
      (appeal) =>
        appeal.claimId ===
          claim.id &&
        (
          appeal.status ===
            "draft" ||
          appeal.status ===
            "submitted" ||
          appeal.status ===
            "accepted"
        ),
    );

  if (
    existingOpenAppeal !==
    undefined
  ) {
    return existingOpenAppeal;
  }

  const timestamp =
    new Date().toISOString();

  const appeal:
    DemoInsuranceAppeal = {
    id:
      createIdentifier(
        "insurance-appeal",
      ),

    appealNumber:
      generateAppealNumber(),

    claimId:
      claim.id,

    claimNumber:
      claim.claimNumber,

    patientId:
      claim.patientId,

    insurerId:
      claim.insurerId,

    status: "draft",

    currentApprovedAmount:
      claim.approvedAmount,

    requestedAmount:
      claim.invoiceAmount,

    appealReason: "",

    supportingSummary: "",

    submittedBy: "",

    insurerReviewer: "",

    insurerResponseNote: "",

    externalAppealReference:
      "",

    createdAt: timestamp,
    updatedAt: timestamp,

    submittedAt: "",
    decidedAt: "",
    resubmittedAt: "",
    closedAt: "",
  };

  writeDemoInsuranceAppeals([
    appeal,
    ...appeals,
  ]);

  return appeal;
}

export function validateDemoInsuranceAppeal(
  appeal:
    DemoInsuranceAppeal,
): string[] {
  const errors:
    string[] = [];

  const claim =
    readDemoInsuranceClaims()
      .find(
        (record) =>
          record.id ===
          appeal.claimId,
      );

  if (
    claim === undefined
  ) {
    errors.push(
      "The original insurance claim could not be found.",
    );

    return errors;
  }

  if (
    appeal.appealReason
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter a clear appeal reason.",
    );
  }

  if (
    appeal.supportingSummary
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter a supporting clinical or administrative summary.",
    );
  }

  if (
    appeal.submittedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the hospital staff member submitting the appeal.",
    );
  }

  if (
    !Number.isFinite(
      appeal.requestedAmount,
    ) ||
    appeal.requestedAmount <=
      claim.approvedAmount
  ) {
    errors.push(
      "The appealed amount must be greater than the currently approved amount.",
    );
  }

  if (
    appeal.requestedAmount >
    claim.invoiceAmount
  ) {
    errors.push(
      "The appealed amount cannot exceed the original invoice amount.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function submitDemoInsuranceAppeal(
  appeal:
    DemoInsuranceAppeal,
): DemoInsuranceAppeal |
  undefined {
  if (
    appeal.status !== "draft"
  ) {
    return undefined;
  }

  const errors =
    validateDemoInsuranceAppeal(
      appeal,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoInsuranceAppeal({
    ...appeal,

    status: "submitted",

    submittedAt:
      timestamp,

    updatedAt:
      timestamp,
  });
}

export function decideDemoInsuranceAppeal(
  input: {
    appealId: string;

    accepted: boolean;

    insurerReviewer: string;

    insurerResponseNote:
      string;

    externalAppealReference:
      string;
  },
): DemoInsuranceAppeal |
  undefined {
  const appeal =
    readDemoInsuranceAppeals()
      .find(
        (record) =>
          record.id ===
          input.appealId,
      );

  const reviewer =
    input.insurerReviewer
      .trim();

  const responseNote =
    input.insurerResponseNote
      .trim();

  const externalReference =
    input.externalAppealReference
      .trim();

  if (
    appeal === undefined ||
    appeal.status !==
      "submitted" ||
    reviewer.length < 2 ||
    responseNote.length < 3
  ) {
    return undefined;
  }

  if (
    input.accepted &&
    externalReference.length <
      2
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoInsuranceAppeal({
    ...appeal,

    status:
      input.accepted
        ? "accepted"
        : "denied",

    insurerReviewer:
      reviewer,

    insurerResponseNote:
      responseNote,

    externalAppealReference:
      input.accepted
        ? externalReference
        : "",

    decidedAt:
      timestamp,

    updatedAt:
      timestamp,
  });
}

export function resubmitDemoInsuranceAppeal(
  appealId: string,
): {
  appeal:
    DemoInsuranceAppeal;

  claim:
    DemoInsuranceClaim;
} | undefined {
  const appeal =
    readDemoInsuranceAppeals()
      .find(
        (record) =>
          record.id ===
          appealId,
      );

  if (
    appeal === undefined ||
    appeal.status !==
      "accepted"
  ) {
    return undefined;
  }

  const claim =
    readDemoInsuranceClaims()
      .find(
        (record) =>
          record.id ===
          appeal.claimId,
      );

  if (
    claim === undefined
  ) {
    return undefined;
  }

  const previousAppealCount =
    readDemoInsuranceAppeals()
      .filter(
        (record) =>
          record.claimId ===
            claim.id &&
          record.status ===
            "resubmitted",
      )
      .length;

  const timestamp =
    new Date().toISOString();

  const authorizationWasDenied =
    claim.status ===
      "authorization-denied";

  const updatedClaim =
    saveDemoInsuranceClaim({
      ...claim,

      status: "submitted",

      authorizationStatus:
        authorizationWasDenied
          ? "approved"
          : claim
              .authorizationStatus,

      authorizationNumber:
        authorizationWasDenied
          ? appeal
              .externalAppealReference
          : claim
              .authorizationNumber,

      externalClaimReference:
        `${
          claim.externalClaimReference ||
          claim.claimNumber
        }-RS${previousAppealCount + 1}`,

      insurerResponseNote: "",

      reviewStartedAt: "",

      responseReceivedAt: "",

      submittedAt:
        timestamp,

      updatedAt:
        timestamp,
    });

  const updatedAppeal =
    saveDemoInsuranceAppeal({
      ...appeal,

      status: "resubmitted",

      resubmittedAt:
        timestamp,

      updatedAt:
        timestamp,
    });

  return {
    appeal:
      updatedAppeal,

    claim:
      updatedClaim,
  };
}

export function readDemoInsuranceRemittances():
  DemoInsuranceRemittanceBatch[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      INSURANCE_REMITTANCE_STORAGE_KEY,
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
          DemoInsuranceRemittanceBatch[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoInsuranceRemittances(
  remittances:
    readonly DemoInsuranceRemittanceBatch[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    INSURANCE_REMITTANCE_STORAGE_KEY,

    JSON.stringify(
      remittances.slice(
        0,
        3000,
      ),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-insurance-remittances-changed",
    ),
  );
}

export function createEmptyDemoInsuranceRemittanceLine():
  DemoInsuranceRemittanceLine {
  return {
    id:
      createIdentifier(
        "remittance-line",
      ),

    claimId: "",
    claimNumber: "",

    patientId: "",
    invoiceNumber: "",

    expectedOutstandingAmount:
      0,

    allocatedAmount: 0,

    varianceAmount: 0,

    varianceReason: "",
  };
}

export function createInitialDemoInsuranceRemittance():
  DemoInsuranceRemittanceBatch {
  const timestamp =
    new Date().toISOString();

  return {
    id:
      createIdentifier(
        "insurance-remittance",
      ),

    remittanceNumber:
      generateRemittanceNumber(),

    remittanceReference:
      "",

    insurerId: "",

    bankAmount: 0,

    allocatedAmount: 0,
    unallocatedAmount: 0,

    receivedDate:
      timestamp.slice(0, 10),

    reconciledBy: "",

    reconciliationNote:
      "",

    status: "draft",

    lines: [
      createEmptyDemoInsuranceRemittanceLine(),
    ],

    createdAt: timestamp,
    updatedAt: timestamp,

    postedAt: "",
    cancelledAt: "",
  };
}

export function calculateDemoInsuranceRemittanceAllocatedAmount(
  remittance:
    DemoInsuranceRemittanceBatch,
): number {
  return roundMoney(
    remittance.lines.reduce(
      (
        total,
        line,
      ) =>
        total +
        Math.max(
          0,
          line.allocatedAmount,
        ),

      0,
    ),
  );
}

export function saveDemoInsuranceRemittance(
  remittance:
    DemoInsuranceRemittanceBatch,
): DemoInsuranceRemittanceBatch {
  const remittances =
    readDemoInsuranceRemittances();

  const allocatedAmount =
    calculateDemoInsuranceRemittanceAllocatedAmount(
      remittance,
    );

  const normalizedRemittance:
    DemoInsuranceRemittanceBatch =
    {
      ...remittance,

      remittanceReference:
        remittance
          .remittanceReference
          .trim(),

      bankAmount:
        roundMoney(
          remittance.bankAmount,
        ),

      allocatedAmount,

      unallocatedAmount:
        roundMoney(
          Math.max(
            0,

            remittance.bankAmount -
              allocatedAmount,
          ),
        ),

      reconciledBy:
        remittance.reconciledBy
          .trim(),

      reconciliationNote:
        remittance
          .reconciliationNote
          .trim(),

      lines:
        remittance.lines.map(
          (line) => ({
            ...line,

            allocatedAmount:
              roundMoney(
                line.allocatedAmount,
              ),

            varianceAmount:
              roundMoney(
                line
                  .expectedOutstandingAmount -
                  line.allocatedAmount,
              ),

            varianceReason:
              line.varianceReason
                .trim(),
          }),
        ),

      updatedAt:
        new Date().toISOString(),
    };

  const exists =
    remittances.some(
      (record) =>
        record.id ===
        normalizedRemittance.id,
    );

  writeDemoInsuranceRemittances(
    exists
      ? remittances.map(
          (record) =>
            record.id ===
            normalizedRemittance.id
              ? normalizedRemittance
              : record,
        )
      : [
          normalizedRemittance,
          ...remittances,
        ],
  );

  return normalizedRemittance;
}

export function validateDemoInsuranceRemittance(
  remittance:
    DemoInsuranceRemittanceBatch,
): string[] {
  const errors:
    string[] = [];

  if (
    remittance.status !==
    "draft"
  ) {
    errors.push(
      "Only a draft remittance may be posted.",
    );

    return errors;
  }

  if (
    remittance.insurerId
      .trim() === ""
  ) {
    errors.push(
      "Select the insurance company.",
    );
  }

  if (
    remittance
      .remittanceReference
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the insurer remittance or bank reference.",
    );
  }

  if (
    !Number.isFinite(
      remittance.bankAmount,
    ) ||
    remittance.bankAmount <=
      0
  ) {
    errors.push(
      "Enter the total amount received from the insurer.",
    );
  }

  if (
    remittance.receivedDate
      .trim() === ""
  ) {
    errors.push(
      "Enter the remittance received date.",
    );
  }

  if (
    remittance.reconciledBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the staff member reconciling the remittance.",
    );
  }

  const existingDuplicate =
    readDemoInsuranceRemittances()
      .some(
        (record) =>
          record.id !==
            remittance.id &&
          record.status ===
            "posted" &&
          normalizeValue(
            record
              .remittanceReference,
          ) ===
            normalizeValue(
              remittance
                .remittanceReference,
            ),
      );

  if (
    existingDuplicate
  ) {
    errors.push(
      "This remittance reference has already been posted.",
    );
  }

  const selectedLines =
    remittance.lines.filter(
      (line) =>
        line.claimId !==
          "" ||
        line.allocatedAmount >
          0,
    );

  if (
    selectedLines.length ===
    0
  ) {
    errors.push(
      "Allocate the remittance to at least one insurance claim.",
    );
  }

  const claimIds =
    new Set<string>();

  const claims =
    readDemoInsuranceClaims();

  selectedLines.forEach(
    (
      line,
      index,
    ) => {
      const lineLabel =
        `Line ${index + 1}`;

      if (
        line.claimId === ""
      ) {
        errors.push(
          `${lineLabel}: select an insurance claim.`,
        );

        return;
      }

      if (
        claimIds.has(
          line.claimId,
        )
      ) {
        errors.push(
          `${lineLabel}: the same claim cannot appear twice in one remittance.`,
        );
      }

      claimIds.add(
        line.claimId,
      );

      const claim =
        claims.find(
          (record) =>
            record.id ===
            line.claimId,
        );

      if (
        claim === undefined
      ) {
        errors.push(
          `${lineLabel}: the selected claim could not be found.`,
        );

        return;
      }

      if (
        claim.insurerId !==
        remittance.insurerId
      ) {
        errors.push(
          `${lineLabel}: the claim belongs to a different insurer.`,
        );
      }

      const outstandingAmount =
        getDemoInsuranceClaimOutstandingAmount(
          claim,
        );

      if (
        outstandingAmount <= 0
      ) {
        errors.push(
          `${lineLabel}: the selected claim has no outstanding insurance balance.`,
        );
      }

      if (
        !Number.isFinite(
          line.allocatedAmount,
        ) ||
        line.allocatedAmount <=
          0
      ) {
        errors.push(
          `${lineLabel}: allocated amount must be greater than zero.`,
        );
      }

      if (
        line.allocatedAmount >
        outstandingAmount
      ) {
        errors.push(
          `${lineLabel}: allocation cannot exceed the outstanding amount of PKR ${outstandingAmount.toLocaleString("en-US")}.`,
        );
      }

      const varianceAmount =
        roundMoney(
          outstandingAmount -
            line.allocatedAmount,
        );

      if (
        varianceAmount > 0 &&
        line.varianceReason
          .trim()
          .length < 3
      ) {
        errors.push(
          `${lineLabel}: enter a reason for the payment variance.`,
        );
      }
    },
  );

  const allocatedAmount =
    calculateDemoInsuranceRemittanceAllocatedAmount(
      remittance,
    );

  if (
    allocatedAmount >
    remittance.bankAmount
  ) {
    errors.push(
      "Allocated claim payments cannot exceed the total remittance amount.",
    );
  }

  const unallocatedAmount =
    roundMoney(
      remittance.bankAmount -
        allocatedAmount,
    );

  if (
    unallocatedAmount > 0 &&
    remittance
      .reconciliationNote
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter a reconciliation note for the unallocated remittance balance.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function postDemoInsuranceRemittance(
  remittance:
    DemoInsuranceRemittanceBatch,
): {
  remittance:
    DemoInsuranceRemittanceBatch;

  claims:
    DemoInsuranceClaim[];
} | undefined {
  const errors =
    validateDemoInsuranceRemittance(
      remittance,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const claims =
    readDemoInsuranceClaims()
      .map(
        (claim) => ({
          ...claim,
        }),
      );

  const policies =
    readDemoInsurancePolicies()
      .map(
        (policy) => ({
          ...policy,
        }),
      );

  for (
    const line of
    remittance.lines
  ) {
    if (
      line.claimId === "" ||
      line.allocatedAmount <=
        0
    ) {
      continue;
    }

    const claim =
      claims.find(
        (record) =>
          record.id ===
          line.claimId,
      );

    if (
      claim === undefined
    ) {
      return undefined;
    }

    const outstandingAmount =
      getDemoInsuranceClaimOutstandingAmount(
        claim,
      );

    if (
      line.allocatedAmount >
      outstandingAmount
    ) {
      return undefined;
    }

    const updatedPaidAmount =
      roundMoney(
        claim.paidAmount +
          line.allocatedAmount,
      );

    const fullyPaid =
      updatedPaidAmount >=
      claim.approvedAmount;

    claim.paidAmount =
      updatedPaidAmount;

    claim.status =
      fullyPaid
        ? "paid"
        : claim.status;

    claim.paymentReference =
      claim.paymentReference
        ? `${claim.paymentReference}, ${remittance.remittanceReference}`
        : remittance
            .remittanceReference;

    claim.paymentRecordedBy =
      remittance.reconciledBy;

    claim.paidAt =
      fullyPaid
        ? timestamp
        : claim.paidAt;

    claim.updatedAt =
      timestamp;

    const policy =
      policies.find(
        (record) =>
          record.id ===
          claim.policyId,
      );

    if (
      policy !== undefined
    ) {
      policy.usedAmount =
        roundMoney(
          policy.usedAmount +
            line.allocatedAmount,
        );

      policy.updatedAt =
        timestamp;
    }
  }

  writeDemoInsuranceClaims(
    claims,
  );

  writeDemoInsurancePolicies(
    policies,
  );

  const allocatedAmount =
    calculateDemoInsuranceRemittanceAllocatedAmount(
      remittance,
    );

  const postedRemittance =
    saveDemoInsuranceRemittance({
      ...remittance,

      status: "posted",

      allocatedAmount,

      unallocatedAmount:
        roundMoney(
          Math.max(
            0,

            remittance.bankAmount -
              allocatedAmount,
          ),
        ),

      postedAt:
        timestamp,

      updatedAt:
        timestamp,
    });

  return {
    remittance:
      postedRemittance,

    claims,
  };
}