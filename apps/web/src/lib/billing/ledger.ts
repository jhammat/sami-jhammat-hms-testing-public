import {
  readDemoBillingInvoiceReferences,
  readDemoBillingRefundRequests,
} from "./refunds";

import type {
  DemoBillingInvoiceReference,
} from "./refunds";

export type DemoBillingLedgerEntryType =
  | "invoice"
  | "invoice-payment"
  | "account-payment"
  | "credit-note";

export type DemoBillingPaymentMethod =
  | "cash"
  | "card"
  | "bank-transfer"
  | "mobile-wallet"
  | "insurance"
  | "corporate"
  | "other";

export interface DemoBillingAccountPayment {
  id: string;

  paymentNumber: string;

  patientId: string;
  branchId: string;
  encounterId: string;

  amount: number;
  currencyCode: "PKR";

  paymentMethod:
    DemoBillingPaymentMethod;

  receivedBy: string;
  transactionReference: string;
  paymentNote: string;

  createdAt: string;
}

export interface DemoBillingLedgerEntry {
  id: string;

  patientId: string;
  branchId: string;
  encounterId: string;

  entryType:
    DemoBillingLedgerEntryType;

  referenceNumber: string;
  description: string;

  debitAmount: number;
  creditAmount: number;

  runningBalance: number;

  currencyCode: "PKR";

  occurredAt: string;

  sourceId: string;
}

export interface DemoPatientBillingAccountSummary {
  patientId: string;

  totalBilled: number;
  totalInvoicePayments: number;
  totalAccountPayments: number;
  totalCreditNotes: number;

  totalCredits: number;

  outstandingBalance: number;
  accountCredit: number;

  invoiceCount: number;
  paymentCount: number;
  creditNoteCount: number;

  entries:
    DemoBillingLedgerEntry[];
}

const BILLING_ACCOUNT_PAYMENT_STORAGE_KEY =
  "wonflow-demo-billing-account-payments";

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

function generatePaymentNumber():
  string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `PAY-${createDateCode()}-${randomPart}`;
}

function normalizeAmount(
  value: number,
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      value * 100,
    ) / 100,
  );
}

function normalizeTimestamp(
  value: string,
): string {
  if (
    value.trim() === ""
  ) {
    return "1970-01-01T00:00:00.000Z";
  }

  const parsedDate =
    new Date(value);

  return Number.isNaN(
    parsedDate.getTime(),
  )
    ? "1970-01-01T00:00:00.000Z"
    : parsedDate.toISOString();
}

export function readDemoBillingAccountPayments():
  DemoBillingAccountPayment[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      BILLING_ACCOUNT_PAYMENT_STORAGE_KEY,
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
          DemoBillingAccountPayment[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoBillingAccountPayments(
  payments:
    readonly DemoBillingAccountPayment[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    BILLING_ACCOUNT_PAYMENT_STORAGE_KEY,

    JSON.stringify(
      payments.slice(0, 5000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-billing-account-payments-changed",
    ),
  );
}

function createInvoiceLedgerEntries(
  invoice:
    DemoBillingInvoiceReference,
): DemoBillingLedgerEntry[] {
  const entries:
    DemoBillingLedgerEntry[] = [];

  const totalAmount =
    normalizeAmount(
      invoice.totalAmount,
    );

  const paidAmount =
    normalizeAmount(
      invoice.paidAmount,
    );

  const invoiceDate =
    normalizeTimestamp(
      invoice.createdAt,
    );

  if (
    totalAmount > 0
  ) {
    entries.push({
      id:
        `invoice-charge:${invoice.id}`,

      patientId:
        invoice.patientId,

      branchId:
        invoice.branchId,

      encounterId:
        invoice.encounterId,

      entryType: "invoice",

      referenceNumber:
        invoice.invoiceNumber,

      description:
        `Hospital invoice ${invoice.invoiceNumber}`,

      debitAmount:
        totalAmount,

      creditAmount: 0,

      runningBalance: 0,

      currencyCode: "PKR",

      occurredAt:
        invoiceDate,

      sourceId:
        invoice.id,
    });
  }

  if (
    paidAmount > 0
  ) {
    entries.push({
      id:
        `invoice-payment:${invoice.id}`,

      patientId:
        invoice.patientId,

      branchId:
        invoice.branchId,

      encounterId:
        invoice.encounterId,

      entryType:
        "invoice-payment",

      referenceNumber:
        invoice.invoiceNumber,

      description:
        `Payment recorded against ${invoice.invoiceNumber}`,

      debitAmount: 0,

      creditAmount:
        paidAmount,

      runningBalance: 0,

      currencyCode: "PKR",

      occurredAt:
        invoiceDate,

      sourceId:
        invoice.id,
    });
  }

  return entries;
}

export function buildDemoPatientBillingAccount(
  patientId: string,
): DemoPatientBillingAccountSummary {
  const invoices =
    readDemoBillingInvoiceReferences()
      .filter(
        (invoice) =>
          invoice.patientId ===
          patientId,
      );

  const accountPayments =
    readDemoBillingAccountPayments()
      .filter(
        (payment) =>
          payment.patientId ===
          patientId,
      );

  const processedRefunds =
    readDemoBillingRefundRequests()
      .filter(
        (refund) =>
          refund.patientId ===
            patientId &&
          refund.status ===
            "processed",
      );

  const entries:
    DemoBillingLedgerEntry[] = [
    ...invoices.flatMap(
      createInvoiceLedgerEntries,
    ),

    ...accountPayments.map(
      (
        payment,
      ): DemoBillingLedgerEntry => ({
        id:
          `account-payment:${payment.id}`,

        patientId:
          payment.patientId,

        branchId:
          payment.branchId,

        encounterId:
          payment.encounterId,

        entryType:
          "account-payment",

        referenceNumber:
          payment.paymentNumber,

        description:
          `${humanizePaymentMethod(
            payment.paymentMethod,
          )} payment received`,

        debitAmount: 0,

        creditAmount:
          normalizeAmount(
            payment.amount,
          ),

        runningBalance: 0,

        currencyCode: "PKR",

        occurredAt:
          normalizeTimestamp(
            payment.createdAt,
          ),

        sourceId:
          payment.id,
      }),
    ),

    ...processedRefunds.map(
      (
        refund,
      ): DemoBillingLedgerEntry => ({
        id:
          `credit-note:${refund.id}`,

        patientId:
          refund.patientId,

        branchId:
          refund.branchId,

        encounterId:
          refund.encounterId,

        entryType:
          "credit-note",

        referenceNumber:
          refund.creditNoteNumber ||
          refund.refundNumber,

        description:
          `Credit note for ${refund.sourceReturnNumber}`,

        debitAmount: 0,

        creditAmount:
          normalizeAmount(
            refund.amount,
          ),

        runningBalance: 0,

        currencyCode: "PKR",

        occurredAt:
          normalizeTimestamp(
            refund.processedAt,
          ),

        sourceId:
          refund.id,
      }),
    ),
  ]
    .sort(
      (
        left,
        right,
      ) => {
        const dateDifference =
          new Date(
            left.occurredAt,
          ).getTime() -
          new Date(
            right.occurredAt,
          ).getTime();

        if (
          dateDifference !== 0
        ) {
          return dateDifference;
        }

        return left.id.localeCompare(
          right.id,
        );
      },
    );

  let runningBalance = 0;

  const entriesWithBalance =
    entries.map(
      (entry) => {
        runningBalance =
          runningBalance +
          entry.debitAmount -
          entry.creditAmount;

        return {
          ...entry,

          runningBalance:
            Math.round(
              runningBalance * 100,
            ) / 100,
        };
      },
    );

  const totalBilled =
    invoices.reduce(
      (
        total,
        invoice,
      ) =>
        total +
        normalizeAmount(
          invoice.totalAmount,
        ),

      0,
    );

  const totalInvoicePayments =
    invoices.reduce(
      (
        total,
        invoice,
      ) =>
        total +
        normalizeAmount(
          invoice.paidAmount,
        ),

      0,
    );

  const totalAccountPayments =
    accountPayments.reduce(
      (
        total,
        payment,
      ) =>
        total +
        normalizeAmount(
          payment.amount,
        ),

      0,
    );

  const totalCreditNotes =
    processedRefunds.reduce(
      (
        total,
        refund,
      ) =>
        total +
        normalizeAmount(
          refund.amount,
        ),

      0,
    );

  const totalCredits =
    totalInvoicePayments +
    totalAccountPayments +
    totalCreditNotes;

  const rawBalance =
    totalBilled -
    totalCredits;

  return {
    patientId,

    totalBilled,

    totalInvoicePayments,

    totalAccountPayments,

    totalCreditNotes,

    totalCredits,

    outstandingBalance:
      Math.max(
        0,
        rawBalance,
      ),

    accountCredit:
      Math.max(
        0,
        -rawBalance,
      ),

    invoiceCount:
      invoices.length,

    paymentCount:
      accountPayments.length +
      invoices.filter(
        (invoice) =>
          invoice.paidAmount > 0,
      ).length,

    creditNoteCount:
      processedRefunds.length,

    entries:
      entriesWithBalance,
  };
}

export function validateDemoBillingAccountPayment(
  input: {
    patientId: string;
    branchId: string;

    amount: number;

    paymentMethod:
      DemoBillingPaymentMethod;

    receivedBy: string;

    transactionReference:
      string;

    paymentNote: string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    input.patientId.trim() ===
    ""
  ) {
    errors.push(
      "Select a patient account.",
    );
  }

  if (
    input.branchId.trim() ===
    ""
  ) {
    errors.push(
      "Select the receiving hospital branch.",
    );
  }

  if (
    !Number.isFinite(
      input.amount,
    ) ||
    input.amount <= 0
  ) {
    errors.push(
      "Payment amount must be greater than zero.",
    );
  }

  const account =
    buildDemoPatientBillingAccount(
      input.patientId,
    );

  if (
    input.amount >
    account.outstandingBalance
  ) {
    errors.push(
      `Payment cannot exceed the outstanding balance of PKR ${account.outstandingBalance.toLocaleString("en-US")}.`,
    );
  }

  if (
    input.receivedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the cashier or billing staff member receiving payment.",
    );
  }

  if (
    input.paymentMethod !==
      "cash" &&
    input.transactionReference
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the transaction reference for non-cash payment.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function createDemoBillingAccountPayment(
  input: {
    patientId: string;
    branchId: string;
    encounterId: string;

    amount: number;

    paymentMethod:
      DemoBillingPaymentMethod;

    receivedBy: string;

    transactionReference:
      string;

    paymentNote: string;
  },
): DemoBillingAccountPayment |
  undefined {
  const errors =
    validateDemoBillingAccountPayment(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const existingPayments =
    readDemoBillingAccountPayments();

  const normalizedReference =
    input.transactionReference
      .trim()
      .toLocaleLowerCase();

  if (
    normalizedReference !== ""
  ) {
    const duplicateReference =
      existingPayments.some(
        (payment) =>
          payment
            .transactionReference
            .trim()
            .toLocaleLowerCase() ===
          normalizedReference,
      );

    if (
      duplicateReference
    ) {
      return undefined;
    }
  }

  const payment:
    DemoBillingAccountPayment = {
    id:
      createIdentifier(
        "billing-payment",
      ),

    paymentNumber:
      generatePaymentNumber(),

    patientId:
      input.patientId,

    branchId:
      input.branchId,

    encounterId:
      input.encounterId.trim(),

    amount:
      normalizeAmount(
        input.amount,
      ),

    currencyCode: "PKR",

    paymentMethod:
      input.paymentMethod,

    receivedBy:
      input.receivedBy.trim(),

    transactionReference:
      input
        .transactionReference
        .trim(),

    paymentNote:
      input.paymentNote.trim(),

    createdAt:
      new Date().toISOString(),
  };

  writeDemoBillingAccountPayments([
    payment,
    ...existingPayments,
  ]);

  return payment;
}

export function humanizePaymentMethod(
  method:
    DemoBillingPaymentMethod,
): string {
  return method
    .replaceAll("-", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}