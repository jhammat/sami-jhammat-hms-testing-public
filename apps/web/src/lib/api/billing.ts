import { apiGet, apiPatch, apiPost } from "./client";
import { resourceTags } from "./cache";
import { useApiMutation } from "./use-api-mutation";
import { useApiResource } from "./use-api-resource";
import type { UseApiResourceResult } from "./use-api-resource";
import type { UseApiMutationResult } from "./use-api-mutation";

/**
 * Billing data-access layer: invoices, payments, refunds, the per-patient
 * ledger and cash reconciliation. Invoice numbers, payment collectors and
 * refund approvers are always server-assigned from the session — nothing
 * here can request a different actor. See @/server/finance/billing-service.
 */

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID" | "CANCELLED";
export type RefundStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";

export const BILLING_PAYMENT_METHODS = [
  "cash", "credit-card", "debit-card", "bank-transfer", "mobile-wallet", "online-payment",
  "cheque", "insurance", "corporate-credit", "government-program", "patient-deposit",
  "internal-transfer", "other",
] as const;
export type BillingPaymentMethod = (typeof BILLING_PAYMENT_METHODS)[number];

export interface InvoiceLineRecord {
  id: string;
  invoiceId: string;
  serviceId: string | null;
  description: string;
  quantity: string;
  unitPriceMinor: number;
  totalMinor: number;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  receivedByMembershipId: string;
  status: string;
  method: string;
  amountMinor: number;
  currencyCode: string;
  reference: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  invoiceId: string;
  paymentId: string;
  status: RefundStatus;
  amountMinor: number;
  currencyCode: string;
  reason: string;
  requestedByMembershipId: string;
  approvedByMembershipId: string | null;
  requestedAt: string;
  approvedAt: string | null;
  completedAt?: string | null;
}

export interface InvoiceRecord {
  id: string;
  patientId: string;
  branchId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currencyCode: string;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  paidMinor: number;
  issuedAt: string | null;
  dueAt: string | null;
  version: number;
  createdAt: string;
  lines: InvoiceLineRecord[];
  payments?: PaymentRecord[];
  refunds?: RefundRecord[];
}

export interface PatientLedger {
  patientId: string;
  invoices: (InvoiceRecord & { payments: PaymentRecord[]; refunds: RefundRecord[] })[];
  summary: { totalBilledMinor: number; totalPaidMinor: number; totalRefundedMinor: number; outstandingMinor: number };
}

const INVOICES_TAG = "billing-invoices";
const PAYMENTS_TAG = "billing-payments";
const REFUNDS_TAG = "billing-refunds";
const LEDGER_TAG = "billing-ledger";

const invoiceTag = (invoiceId: string) => resourceTags(INVOICES_TAG, invoiceId)[1];
const ledgerTag = (patientId: string) => resourceTags(LEDGER_TAG, patientId)[1];

export interface InvoiceLineInput {
  serviceId?: string;
  description?: string;
  quantity: number;
  unitPriceMinor?: number;
  discountMinor?: number;
}

export interface CreateInvoiceInput {
  patientId: string;
  dueAt?: string;
  discountMinor?: number;
  reason?: string;
  lines: InvoiceLineInput[];
}

export function listInvoices(query: { patientId?: string; status?: string } = {}, signal?: AbortSignal): Promise<{ invoices: InvoiceRecord[] }> {
  const params = new URLSearchParams();
  if (query.patientId) params.set("patientId", query.patientId);
  if (query.status) params.set("status", query.status);
  const qs = params.size ? `?${params}` : "";
  return apiGet<{ invoices: InvoiceRecord[] }>(`/api/v1/billing/invoices${qs}`, { signal });
}

export function useInvoices(query: { patientId?: string; status?: string } = {}): UseApiResourceResult<{ invoices: InvoiceRecord[] }> {
  return useApiResource<{ invoices: InvoiceRecord[] }>({
    key: `invoices:${query.patientId ?? ""}:${query.status ?? ""}`,
    tags: [INVOICES_TAG],
    fetcher: (signal) => listInvoices(query, signal),
    isEmpty: (data) => data.invoices.length === 0,
  });
}

export function getInvoice(invoiceId: string, signal?: AbortSignal): Promise<{ invoice: InvoiceRecord }> {
  return apiGet<{ invoice: InvoiceRecord }>(`/api/v1/billing/invoices/${invoiceId}`, { signal });
}

export function useInvoice(invoiceId: string): UseApiResourceResult<{ invoice: InvoiceRecord }> {
  return useApiResource<{ invoice: InvoiceRecord }>({
    key: `invoice:${invoiceId}`,
    tags: [INVOICES_TAG, invoiceTag(invoiceId)],
    enabled: invoiceId.length > 0,
    fetcher: (signal) => getInvoice(invoiceId, signal),
    isEmpty: () => false,
  });
}

export function createInvoice(input: CreateInvoiceInput): Promise<{ invoice: InvoiceRecord }> {
  return apiPost<{ invoice: InvoiceRecord }, CreateInvoiceInput>("/api/v1/billing/invoices", input);
}

export function useCreateInvoice(): UseApiMutationResult<{ invoice: InvoiceRecord }, CreateInvoiceInput> {
  return useApiMutation((input: CreateInvoiceInput) => createInvoice(input), { invalidates: [INVOICES_TAG] });
}

export interface UpdateInvoiceInput {
  status?: InvoiceStatus;
  dueAt?: string | null;
  reason?: string;
}

export function updateInvoice(invoiceId: string, input: UpdateInvoiceInput): Promise<{ invoice: InvoiceRecord }> {
  return apiPatch<{ invoice: InvoiceRecord }, UpdateInvoiceInput>(`/api/v1/billing/invoices/${invoiceId}`, input);
}

export function useUpdateInvoice(invoiceId: string): UseApiMutationResult<{ invoice: InvoiceRecord }, UpdateInvoiceInput> {
  return useApiMutation((input: UpdateInvoiceInput) => updateInvoice(invoiceId, input), {
    invalidates: [INVOICES_TAG, invoiceTag(invoiceId)],
  });
}

export function addInvoiceLine(invoiceId: string, input: InvoiceLineInput & { reason?: string }): Promise<{ line: InvoiceLineRecord }> {
  return apiPost<{ line: InvoiceLineRecord }, InvoiceLineInput & { reason?: string }>(`/api/v1/billing/invoices/${invoiceId}/lines`, input);
}

export function useAddInvoiceLine(invoiceId: string): UseApiMutationResult<{ line: InvoiceLineRecord }, InvoiceLineInput & { reason?: string }> {
  return useApiMutation((input) => addInvoiceLine(invoiceId, input), { invalidates: [INVOICES_TAG, invoiceTag(invoiceId)] });
}

export function listPayments(query: { invoiceId?: string } = {}, signal?: AbortSignal): Promise<{ payments: PaymentRecord[] }> {
  const params = new URLSearchParams();
  if (query.invoiceId) params.set("invoiceId", query.invoiceId);
  const qs = params.size ? `?${params}` : "";
  return apiGet<{ payments: PaymentRecord[] }>(`/api/v1/billing/payments${qs}`, { signal });
}

export function usePayments(query: { invoiceId?: string } = {}): UseApiResourceResult<{ payments: PaymentRecord[] }> {
  return useApiResource<{ payments: PaymentRecord[] }>({
    key: `payments:${query.invoiceId ?? ""}`,
    tags: [PAYMENTS_TAG],
    fetcher: (signal) => listPayments(query, signal),
    isEmpty: (data) => data.payments.length === 0,
  });
}

/**
 * Records who collected a payment purely for display purposes — the server
 * ignores any actor field and always attributes the payment to the caller's
 * own session (receivedByMembershipId), so there is nothing here for the
 * client to spoof.
 */
export interface RecordPaymentInput {
  invoiceId: string;
  method: BillingPaymentMethod;
  amountMinor: number;
  reference?: string;
  reason?: string;
}

export function recordPayment(input: RecordPaymentInput): Promise<{ payment: PaymentRecord }> {
  return apiPost<{ payment: PaymentRecord }, RecordPaymentInput>("/api/v1/billing/payments", input);
}

export function useRecordPayment(): UseApiMutationResult<{ payment: PaymentRecord }, RecordPaymentInput> {
  return useApiMutation((input: RecordPaymentInput) => recordPayment(input), {
    invalidates: (vars) => [PAYMENTS_TAG, INVOICES_TAG, invoiceTag(vars.invoiceId)],
  });
}

export function listRefunds(query: { invoiceId?: string; status?: string } = {}, signal?: AbortSignal): Promise<{ refunds: RefundRecord[] }> {
  const params = new URLSearchParams();
  if (query.invoiceId) params.set("invoiceId", query.invoiceId);
  if (query.status) params.set("status", query.status);
  const qs = params.size ? `?${params}` : "";
  return apiGet<{ refunds: RefundRecord[] }>(`/api/v1/billing/refunds${qs}`, { signal });
}

export function useRefunds(query: { invoiceId?: string; status?: string } = {}): UseApiResourceResult<{ refunds: RefundRecord[] }> {
  return useApiResource<{ refunds: RefundRecord[] }>({
    key: `refunds:${query.invoiceId ?? ""}:${query.status ?? ""}`,
    tags: [REFUNDS_TAG],
    fetcher: (signal) => listRefunds(query, signal),
    isEmpty: (data) => data.refunds.length === 0,
  });
}

export interface RequestRefundInput {
  invoiceId: string;
  paymentId: string;
  amountMinor: number;
  reason: string;
}

export function requestRefund(input: RequestRefundInput): Promise<{ refund: RefundRecord }> {
  return apiPost<{ refund: RefundRecord }, RequestRefundInput>("/api/v1/billing/refunds", input);
}

export function useRequestRefund(): UseApiMutationResult<{ refund: RefundRecord }, RequestRefundInput> {
  return useApiMutation((input: RequestRefundInput) => requestRefund(input), { invalidates: [REFUNDS_TAG] });
}

/** Approval requires its own reason; the approver is always the caller's own session — never a name typed into a form. */
export function approveRefund(refundId: string, reason: string): Promise<{ refund: RefundRecord }> {
  return apiPatch<{ refund: RefundRecord }, { reason: string }>(`/api/v1/billing/refunds/${refundId}/approve`, { reason });
}

export function useApproveRefund(): UseApiMutationResult<{ refund: RefundRecord }, { refundId: string; reason: string }> {
  return useApiMutation(({ refundId, reason }: { refundId: string; reason: string }) => approveRefund(refundId, reason), {
    invalidates: [REFUNDS_TAG, INVOICES_TAG],
  });
}

export function rejectRefund(refundId: string, reason: string): Promise<{ refund: RefundRecord }> {
  return apiPatch<{ refund: RefundRecord }, { reason: string }>(`/api/v1/billing/refunds/${refundId}/reject`, { reason });
}

export function useRejectRefund(): UseApiMutationResult<{ refund: RefundRecord }, { refundId: string; reason: string }> {
  return useApiMutation(({ refundId, reason }: { refundId: string; reason: string }) => rejectRefund(refundId, reason), {
    invalidates: [REFUNDS_TAG, INVOICES_TAG],
  });
}

export function completeRefund(refundId: string, reason?: string): Promise<{ refund: RefundRecord }> {
  return apiPatch<{ refund: RefundRecord }, { reason?: string }>(`/api/v1/billing/refunds/${refundId}/complete`, { reason });
}

export function useCompleteRefund(): UseApiMutationResult<{ refund: RefundRecord }, { refundId: string; reason?: string }> {
  return useApiMutation(({ refundId, reason }: { refundId: string; reason?: string }) => completeRefund(refundId, reason), {
    invalidates: [REFUNDS_TAG, INVOICES_TAG, LEDGER_TAG, PAYMENTS_TAG],
  });
}

export function getPatientLedger(patientId: string, signal?: AbortSignal): Promise<PatientLedger> {
  return apiGet<PatientLedger>(`/api/v1/billing/ledger/${patientId}`, { signal });
}

export function usePatientLedger(patientId: string): UseApiResourceResult<PatientLedger> {
  return useApiResource<PatientLedger>({
    key: `ledger:${patientId}`,
    tags: [LEDGER_TAG, ledgerTag(patientId), INVOICES_TAG, PAYMENTS_TAG, REFUNDS_TAG],
    fetcher: (signal) => getPatientLedger(patientId, signal),
    isEmpty: (data) => data.invoices.length === 0,
  });
}

export interface ReconciliationReport {
  branchId: string;
  from: string;
  to: string;
  totalCollectedMinor: number;
  totalRefundedMinor: number;
  netMinor: number;
  byMethod: { method: string; collectedMinor: number; count: number }[];
  paymentCount: number;
  refundCount: number;
}

export function getReconciliation(query: { from: string; to: string; branchId?: string }, signal?: AbortSignal): Promise<{ reconciliation: ReconciliationReport }> {
  const params = new URLSearchParams({ from: query.from, to: query.to });
  if (query.branchId) params.set("branchId", query.branchId);
  return apiGet<{ reconciliation: ReconciliationReport }>(`/api/v1/billing/reconciliation?${params}`, { signal });
}
