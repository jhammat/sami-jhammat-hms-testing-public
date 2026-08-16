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
