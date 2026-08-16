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
