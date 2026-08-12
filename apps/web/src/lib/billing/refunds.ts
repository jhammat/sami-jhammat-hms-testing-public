import {
  completeDemoPharmacyRefundCoordination,
  readDemoPharmacyReturnCases,
  rejectDemoPharmacyRefundCoordination,
} from "../pharmacy";

import type {
  DemoPharmacyReturnCase,
} from "../pharmacy";

export type DemoBillingRefundStatus =
  | "requested"
  | "under-review"
  | "approved"
  | "rejected"
  | "processed";

export type DemoBillingRefundMethod =
  | "cash"
  | "card-reversal"
  | "bank-transfer"
  | "account-credit";

export interface DemoBillingInvoiceReference {
  id: string;
  invoiceNumber: string;

  patientId: string;
  branchId: string;
  encounterId: string;

  status: string;

  totalAmount: number;
  paidAmount: number;

  currencyCode: "PKR";

  createdAt: string;
}

export interface DemoBillingRefundRequest {
  id: string;

  refundNumber: string;
  creditNoteNumber: string;

  sourceReturnCaseId: string;
  sourceReturnNumber: string;

  patientId: string;
  branchId: string;
  encounterId: string;

  sourceInvoiceId: string;
  sourceInvoiceNumber: string;

  amount: number;
  currencyCode: "PKR";

  reason: string;
  requestedBy: string;

  status:
    DemoBillingRefundStatus;

  reviewedBy: string;
  reviewNote: string;

  refundMethod:
    DemoBillingRefundMethod;

  processedBy: string;
  transactionReference: string;
  processingNote: string;

  createdAt: string;
  updatedAt: string;

  reviewStartedAt: string;
  approvedAt: string;
  rejectedAt: string;
  processedAt: string;
}

const BILLING_REFUND_STORAGE_KEY =
  "wonflow-demo-billing-refund-requests";

const BILLING_INVOICE_STORAGE_KEY =
  "wonflow-demo-billing-invoices";

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
  const currentDate =
    new Date();

  return [
    currentDate.getFullYear(),

    padNumber(
      currentDate.getMonth() + 1,
    ),

    padNumber(
      currentDate.getDate(),
    ),
  ].join("");
}

function generateRefundNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `RFD-${createDateCode()}-${randomPart}`;
}

function generateCreditNoteNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `CN-${createDateCode()}-${randomPart}`;
}

function isRecord(
  value: unknown,
): value is
  Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !== null
  );
}

function readString(
  record:
    Record<string, unknown>,

  keys:
    readonly string[],
): string {
  for (
    const key of keys
  ) {
    const value =
      record[key];

    if (
      typeof value ===
        "string"
    ) {
      return value;
    }
  }

  return "";
}

function readNumber(
  record:
    Record<string, unknown>,

  keys:
    readonly string[],
): number {
  for (
    const key of keys
  ) {
    const value =
      record[key];

    if (
      typeof value ===
        "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value ===
        "string" &&
      value.trim() !== ""
    ) {
      const parsedValue =
        Number(value);

      if (
        Number.isFinite(
          parsedValue,
        )
      ) {
        return parsedValue;
      }
    }
  }

  return 0;
}

export function readDemoBillingInvoiceReferences():
  DemoBillingInvoiceReference[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      BILLING_INVOICE_STORAGE_KEY,
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

    if (
      !Array.isArray(
        parsedValue,
      )
    ) {
      return [];
    }

    return parsedValue
      .map(
        (
          value,
        ) => {
          if (!isRecord(value)) {
            return undefined;
          }

          const id =
            readString(
              value,
              [
                "id",
                "invoiceId",
              ],
            );

          const invoiceNumber =
            readString(
              value,
              [
                "invoiceNumber",
                "number",
              ],
            );

          if (
            id === "" &&
            invoiceNumber === ""
          ) {
            return undefined;
          }

          return {
            id:
              id ||
              invoiceNumber,

            invoiceNumber:
              invoiceNumber ||
              id,

            patientId:
              readString(
                value,
                ["patientId"],
              ),

            branchId:
              readString(
                value,
                ["branchId"],
              ),

            encounterId:
              readString(
                value,
                ["encounterId"],
              ),

            status:
              readString(
                value,
                ["status"],
              ),

            totalAmount:
              readNumber(
                value,
                [
                  "grandTotal",
                  "netTotal",
                  "totalAmount",
                  "total",
                ],
              ),

            paidAmount:
              readNumber(
                value,
                [
                  "paidAmount",
                  "amountPaid",
                  "receivedAmount",
                ],
              ),

            currencyCode:
              "PKR" as const,

            createdAt:
              readString(
                value,
                [
                  "createdAt",
                  "issuedAt",
                  "updatedAt",
                ],
              ),
          };
        },
      )
      .filter(
        (
          invoice,
        ): invoice is
          DemoBillingInvoiceReference =>
          invoice !==
          undefined,
      );
  } catch {
    return [];
  }
}

function findBestMatchingInvoice(
  returnCase:
    DemoPharmacyReturnCase,
): DemoBillingInvoiceReference |
  undefined {
  return readDemoBillingInvoiceReferences()
    .filter(
      (invoice) =>
        invoice.patientId ===
        returnCase.patientId,
    )
    .sort(
      (
        left,
        right,
      ) => {
        function score(
          invoice:
            DemoBillingInvoiceReference,
        ): number {
          let value = 0;

          if (
            invoice.encounterId !==
              "" &&
            invoice.encounterId ===
              returnCase.encounterId
          ) {
            value += 50;
          }

          if (
            invoice.branchId !==
              "" &&
            invoice.branchId ===
              returnCase.branchId
          ) {
            value += 20;
          }

          if (
            invoice.paidAmount >
            0
          ) {
            value += 10;
          }

          return value;
        }

        const scoreDifference =
          score(right) -
          score(left);

        if (
          scoreDifference !==
          0
        ) {
          return scoreDifference;
        }

        return (
          new Date(
            right.createdAt ||
              0,
          ).getTime() -
          new Date(
            left.createdAt ||
              0,
          ).getTime()
        );
      },
    )[0];
}

export function readDemoBillingRefundRequests():
  DemoBillingRefundRequest[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      BILLING_REFUND_STORAGE_KEY,
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
          DemoBillingRefundRequest[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoBillingRefundRequests(
  requests:
    readonly DemoBillingRefundRequest[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    BILLING_REFUND_STORAGE_KEY,

    JSON.stringify(
      requests.slice(0, 2000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-billing-refunds-changed",
    ),
  );
}

export function saveDemoBillingRefundRequest(
  request:
    DemoBillingRefundRequest,
): DemoBillingRefundRequest {
  const requests =
    readDemoBillingRefundRequests();

  const normalizedRequest:
    DemoBillingRefundRequest =
    {
      ...request,

      reason:
        request.reason.trim(),

      requestedBy:
        request.requestedBy
          .trim(),

      reviewedBy:
        request.reviewedBy
          .trim(),

      reviewNote:
        request.reviewNote
          .trim(),

      processedBy:
        request.processedBy
          .trim(),

      transactionReference:
        request
          .transactionReference
          .trim(),

      processingNote:
        request.processingNote
          .trim(),

      updatedAt:
        new Date().toISOString(),
    };

  const exists =
    requests.some(
      (record) =>
        record.id ===
        normalizedRequest.id,
    );

  writeDemoBillingRefundRequests(
    exists
      ? requests.map(
          (record) =>
            record.id ===
            normalizedRequest.id
              ? normalizedRequest
              : record,
        )
      : [
          normalizedRequest,
          ...requests,
        ],
  );

  return normalizedRequest;
}

export function createOrGetDemoBillingRefundRequest(
  returnCase:
    DemoPharmacyReturnCase,
): DemoBillingRefundRequest |
  undefined {
  if (
    returnCase.status !==
      "completed" ||
    returnCase.refundStatus !==
      "pending-cashier" ||
    returnCase.refundAmount <=
      0
  ) {
    return undefined;
  }

  const requests =
    readDemoBillingRefundRequests();

  const existingRequest =
    requests.find(
      (request) =>
        request
          .sourceReturnCaseId ===
        returnCase.id,
    );

  if (
    existingRequest !==
    undefined
  ) {
    return existingRequest;
  }

  const invoice =
    findBestMatchingInvoice(
      returnCase,
    );

  const timestamp =
    new Date().toISOString();

  const request:
    DemoBillingRefundRequest = {
    id:
      createIdentifier(
        "billing-refund",
      ),

    refundNumber:
      generateRefundNumber(),

    creditNoteNumber: "",

    sourceReturnCaseId:
      returnCase.id,

    sourceReturnNumber:
      returnCase.returnNumber,

    patientId:
      returnCase.patientId,

    branchId:
      returnCase.branchId,

    encounterId:
      returnCase.encounterId,

    sourceInvoiceId:
      invoice?.id ?? "",

    sourceInvoiceNumber:
      invoice?.invoiceNumber ??
      "",

    amount:
      returnCase.refundAmount,

    currencyCode: "PKR",

    reason:
      returnCase.returnNote ||
      `Medicine return ${returnCase.returnNumber}`,

    requestedBy:
      returnCase.receivedBy,

    status: "requested",

    reviewedBy: "",
    reviewNote: "",

    refundMethod: "cash",

    processedBy: "",
    transactionReference:
      "",

    processingNote: "",

    createdAt: timestamp,
    updatedAt: timestamp,

    reviewStartedAt: "",
    approvedAt: "",
    rejectedAt: "",
    processedAt: "",
  };

  writeDemoBillingRefundRequests([
    request,
    ...requests,
  ]);

  return request;
}

export function synchronizePendingPharmacyRefundRequests():
  DemoBillingRefundRequest[] {
  const createdRequests:
    DemoBillingRefundRequest[] =
    [];

  readDemoPharmacyReturnCases()
    .filter(
      (returnCase) =>
        returnCase.status ===
          "completed" &&
        returnCase.refundStatus ===
          "pending-cashier",
    )
    .forEach(
      (returnCase) => {
        const requestExists =
          readDemoBillingRefundRequests()
            .some(
              (request) =>
                request
                  .sourceReturnCaseId ===
                returnCase.id,
            );

        if (requestExists) {
          return;
        }

        const createdRequest =
          createOrGetDemoBillingRefundRequest(
            returnCase,
          );

        if (
          createdRequest !==
          undefined
        ) {
          createdRequests.push(
            createdRequest,
          );
        }
      },
    );

  return createdRequests;
}

export function startDemoBillingRefundReview(
  requestId: string,

  reviewedBy: string,
): DemoBillingRefundRequest |
  undefined {
  const reviewer =
    reviewedBy.trim();

  if (
    reviewer.length < 2
  ) {
    return undefined;
  }

  const request =
    readDemoBillingRefundRequests()
      .find(
        (record) =>
          record.id ===
          requestId,
      );

  if (
    request === undefined ||
    request.status !==
      "requested"
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoBillingRefundRequest({
    ...request,

    status:
      "under-review",

    reviewedBy:
      reviewer,

    reviewStartedAt:
      timestamp,

    updatedAt: timestamp,
  });
}

export function approveDemoBillingRefundRequest(
  requestId: string,

  reviewedBy: string,

  reviewNote: string,
): DemoBillingRefundRequest |
  undefined {
  const reviewer =
    reviewedBy.trim();

  if (
    reviewer.length < 2
  ) {
    return undefined;
  }

  const request =
    readDemoBillingRefundRequests()
      .find(
        (record) =>
          record.id ===
          requestId,
      );

  if (
    request === undefined ||
    request.status !==
      "under-review"
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoBillingRefundRequest({
    ...request,

    status: "approved",

    reviewedBy:
      reviewer,

    reviewNote:
      reviewNote.trim(),

    approvedAt: timestamp,
    updatedAt: timestamp,
  });
}

export function rejectDemoBillingRefundRequest(
  requestId: string,

  reviewedBy: string,

  rejectionReason: string,
): DemoBillingRefundRequest |
  undefined {
  const reviewer =
    reviewedBy.trim();

  const reason =
    rejectionReason.trim();

  if (
    reviewer.length < 2 ||
    reason.length < 3
  ) {
    return undefined;
  }

  const request =
    readDemoBillingRefundRequests()
      .find(
        (record) =>
          record.id ===
          requestId,
      );

  if (
    request === undefined ||
    (
      request.status !==
        "requested" &&
      request.status !==
        "under-review"
    )
  ) {
    return undefined;
  }

  const rejectedReturn =
    rejectDemoPharmacyRefundCoordination(
      request.sourceReturnCaseId,
      reviewer,
      reason,
    );

  if (
    rejectedReturn ===
    undefined
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoBillingRefundRequest({
    ...request,

    status: "rejected",

    reviewedBy:
      reviewer,

    reviewNote:
      reason,

    rejectedAt: timestamp,
    updatedAt: timestamp,
  });
}

export function processDemoBillingRefundRequest(
  input: {
    requestId: string;

    refundMethod:
      DemoBillingRefundMethod;

    processedBy: string;

    transactionReference:
      string;

    processingNote: string;
  },
): DemoBillingRefundRequest |
  undefined {
  const processedBy =
    input.processedBy.trim();

  const transactionReference =
    input.transactionReference
      .trim();

  if (
    processedBy.length < 2 ||
    transactionReference.length <
      2
  ) {
    return undefined;
  }

  const request =
    readDemoBillingRefundRequests()
      .find(
        (record) =>
          record.id ===
          input.requestId,
      );

  if (
    request === undefined ||
    request.status !==
      "approved" ||
    request.processedAt !==
      ""
  ) {
    return undefined;
  }

  const completedReturn =
    completeDemoPharmacyRefundCoordination(
      request.sourceReturnCaseId,

      processedBy,

      transactionReference,

      input.processingNote,
    );

  if (
    completedReturn ===
    undefined
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  return saveDemoBillingRefundRequest({
    ...request,

    status: "processed",

    creditNoteNumber:
      request.creditNoteNumber ||
      generateCreditNoteNumber(),

    refundMethod:
      input.refundMethod,

    processedBy,

    transactionReference,

    processingNote:
      input.processingNote
        .trim(),

    processedAt: timestamp,
    updatedAt: timestamp,
  });
}