import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

/**
 * ISO 4217 currency code.
 *
 * Examples:
 * USD
 * PKR
 * TRY
 */
export type CurrencyCode = string;

/**
 * Financial values are stored in integer minor units.
 *
 * Example:
 * $125.50 is stored as 12550 minor units.
 *
 * Never store financial values using floating-point decimal calculations.
 */
export interface MoneyAmount {
  currencyCode: CurrencyCode;
  minorUnits: number;
}

export type BillingAccountType =
  | "patient"
  | "guardian"
  | "insurance"
  | "corporate"
  | "government"
  | "charity"
  | "employee"
  | "hospital-internal"
  | "other";

export type BillingAccountStatus =
  | "active"
  | "on-hold"
  | "closed"
  | "suspended"
  | "entered-in-error";

export type BillingPayerType =
  | "patient"
  | "guardian"
  | "insurance"
  | "corporate"
  | "government"
  | "charity"
  | "hospital"
  | "other";

export type ChargeSource =
  | "appointment"
  | "consultation"
  | "laboratory"
  | "radiology"
  | "pharmacy"
  | "procedure"
  | "operation-theatre"
  | "emergency"
  | "admission"
  | "bed"
  | "nursing"
  | "therapy"
  | "home-care"
  | "package"
  | "manual"
  | "system";

export type ChargeType =
  | "service"
  | "consultation"
  | "medicine"
  | "diagnostic"
  | "procedure"
  | "bed"
  | "room"
  | "equipment"
  | "professional-fee"
  | "facility-fee"
  | "consumable"
  | "tax"
  | "service-charge"
  | "delivery"
  | "administrative"
  | "other";

export type ChargeStatus =
  | "draft"
  | "pending-approval"
  | "billable"
  | "invoiced"
  | "partially-reversed"
  | "reversed"
  | "cancelled"
  | "rejected"
  | "entered-in-error";

export type InvoiceType =
  | "standard"
  | "interim"
  | "final"
  | "deposit"
  | "pro-forma"
  | "pharmacy"
  | "diagnostic"
  | "inpatient"
  | "consolidated"
  | "other";

export type InvoiceStatus =
  | "draft"
  | "pending-approval"
  | "issued"
  | "partially-paid"
  | "paid"
  | "overdue"
  | "disputed"
  | "partially-refunded"
  | "refunded"
  | "voided"
  | "written-off"
  | "entered-in-error";

export type InvoiceLineStatus =
  | "draft"
  | "active"
  | "partially-credited"
  | "credited"
  | "voided"
  | "entered-in-error";

export type BillingAdjustmentType =
  | "discount"
  | "surcharge"
  | "tax"
  | "service-charge"
  | "rounding"
  | "contract-adjustment"
  | "package-adjustment"
  | "insurance-adjustment"
  | "manual-adjustment"
  | "other";

export type BillingAdjustmentStatus =
  | "draft"
  | "pending-approval"
  | "approved"
  | "applied"
  | "rejected"
  | "cancelled"
  | "reversed"
  | "entered-in-error";

export type DiscountType =
  | "fixed-amount"
  | "percentage"
  | "package"
  | "contract"
  | "insurance"
  | "employee"
  | "charity"
  | "promotional"
  | "management-approved"
  | "other";

export type DiscountReasonCode =
  | "contracted-rate"
  | "insurance-agreement"
  | "package-inclusion"
  | "employee-benefit"
  | "financial-assistance"
  | "service-recovery"
  | "promotional-offer"
  | "management-decision"
  | "billing-correction"
  | "other";

export type DiscountAuthorizationStatus =
  | "draft"
  | "requested"
  | "approved"
  | "partially-approved"
  | "rejected"
  | "applied"
  | "cancelled"
  | "expired";

export type BillingPaymentMethod =
  | "cash"
  | "credit-card"
  | "debit-card"
  | "bank-transfer"
  | "mobile-wallet"
  | "online-payment"
  | "cheque"
  | "insurance"
  | "corporate-credit"
  | "government-program"
  | "patient-deposit"
  | "internal-transfer"
  | "other";

export type BillingPaymentPurpose =
  | "appointment-deposit"
  | "invoice-payment"
  | "advance-payment"
  | "inpatient-deposit"
  | "pharmacy-payment"
  | "diagnostic-payment"
  | "procedure-payment"
  | "other";

export type BillingPaymentStatus =
  | "initiated"
  | "pending"
  | "authorized"
  | "captured"
  | "partially-allocated"
  | "allocated"
  | "failed"
  | "cancelled"
  | "reversed"
  | "partially-refunded"
  | "refunded";

export type PaymentAllocationStatus =
  | "planned"
  | "allocated"
  | "partially-reversed"
  | "reversed"
  | "cancelled"
  | "entered-in-error";

export type PaymentReceiptStatus =
  | "draft"
  | "issued"
  | "reissued"
  | "voided"
  | "entered-in-error";

export type RefundStatus =
  | "requested"
  | "under-review"
  | "approved"
  | "rejected"
  | "processing"
  | "partially-completed"
  | "completed"
  | "failed"
  | "cancelled";

export type RefundReasonCode =
  | "service-cancelled"
  | "service-not-provided"
  | "duplicate-payment"
  | "overpayment"
  | "billing-error"
  | "medicine-return"
  | "insurance-adjustment"
  | "patient-request"
  | "management-approved"
  | "other";

export type CreditNoteStatus =
  | "draft"
  | "pending-approval"
  | "issued"
  | "partially-applied"
  | "applied"
  | "voided"
  | "entered-in-error";

export type WriteOffStatus =
  | "requested"
  | "under-review"
  | "approved"
  | "rejected"
  | "applied"
  | "reversed"
  | "cancelled";

export type AdvancePaymentTransactionType =
  | "deposit"
  | "allocation"
  | "release"
  | "refund"
  | "adjustment"
  | "reversal";

export type CashierSessionStatus =
  | "scheduled"
  | "open"
  | "closing"
  | "awaiting-review"
  | "balanced"
  | "variance-detected"
  | "approved"
  | "closed"
  | "cancelled";

export type CashMovementType =
  | "opening-float"
  | "cash-payment"
  | "cash-refund"
  | "cash-withdrawal"
  | "cash-deposit"
  | "cash-adjustment"
  | "closing-balance";

export type BillingEventType =
  | "account-created"
  | "charge-created"
  | "charge-approved"
  | "charge-invoiced"
  | "charge-reversed"
  | "invoice-created"
  | "invoice-issued"
  | "invoice-voided"
  | "invoice-disputed"
  | "discount-requested"
  | "discount-approved"
  | "discount-rejected"
  | "adjustment-applied"
  | "payment-initiated"
  | "payment-captured"
  | "payment-failed"
  | "payment-allocated"
  | "payment-reversed"
  | "receipt-issued"
  | "refund-requested"
  | "refund-approved"
  | "refund-completed"
  | "credit-note-issued"
  | "credit-note-applied"
  | "write-off-applied"
  | "deposit-received"
  | "deposit-allocated"
  | "cashier-session-opened"
  | "cashier-session-closed"
  | "entered-in-error";

export interface BillingAccount {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientId?: WonFlowId;
  guardianId?: WonFlowId;
  payerOrganizationId?: WonFlowId;

  type: BillingAccountType;
  status: BillingAccountStatus;

  accountNumber: string;
  displayName: string;

  defaultCurrencyCode: CurrencyCode;

  creditAllowed: boolean;
  creditLimit?: MoneyAmount;

  outstandingBalance: MoneyAmount;
  availableAdvanceBalance: MoneyAmount;

  paymentTermsDays?: number;

  holdReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ChargeItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  billingAccountId: WonFlowId;

  branchId: WonFlowId;
  branchDepartmentId?: WonFlowId;
  servicePointId?: WonFlowId;

  encounterId?: WonFlowId;
  appointmentId?: WonFlowId;
  patientJourneyId?: WonFlowId;
  admissionId?: WonFlowId;

  laboratoryOrderId?: WonFlowId;
  radiologyOrderId?: WonFlowId;
  medicationRequestId?: WonFlowId;
  pharmacyDispensingCaseId?: WonFlowId;
  procedureId?: WonFlowId;

  source: ChargeSource;
  type: ChargeType;
  status: ChargeStatus;

  serviceCode: string;
  serviceDisplayName: string;

  description?: string;

  serviceDate: IsoDateTime;

  quantity: number;

  unitPrice: MoneyAmount;
  grossAmount: MoneyAmount;
  adjustmentAmount: MoneyAmount;
  netAmount: MoneyAmount;

  taxIncluded: boolean;
  taxAmount: MoneyAmount;

  payerType: BillingPayerType;

  invoiceId?: WonFlowId;
  invoiceLineItemId?: WonFlowId;

  authorizationRequired: boolean;
  approvedByUserId?: WonFlowId;
  approvedAt?: IsoDateTime;

  cancellationReason?: string;
  reversalReason?: string;

  createdByUserId?: WonFlowId;
  createdBySystem: boolean;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Invoice {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  billingAccountId: WonFlowId;

  branchId: WonFlowId;

  encounterId?: WonFlowId;
  appointmentId?: WonFlowId;
  admissionId?: WonFlowId;
  patientJourneyId?: WonFlowId;

  /**
   * Example:
   * INV-2026-000481
   */
  invoiceNumber: string;

  type: InvoiceType;
  status: InvoiceStatus;

  currencyCode: CurrencyCode;

  subtotalAmount: MoneyAmount;
  discountAmount: MoneyAmount;
  taxAmount: MoneyAmount;
  serviceChargeAmount: MoneyAmount;
  roundingAmount: MoneyAmount;

  totalAmount: MoneyAmount;
  paidAmount: MoneyAmount;
  refundedAmount: MoneyAmount;
  creditNoteAmount: MoneyAmount;
  writtenOffAmount: MoneyAmount;
  outstandingAmount: MoneyAmount;

  issueDate?: IsoDateTime;
  dueDate?: IsoDateTime;

  issuedByUserId?: WonFlowId;
  issuedAt?: IsoDateTime;

  voidedByUserId?: WonFlowId;
  voidedAt?: IsoDateTime;
  voidReason?: string;

  disputedAt?: IsoDateTime;
  disputeReason?: string;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InvoiceLineItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  invoiceId: WonFlowId;
  chargeItemId?: WonFlowId;

  sequenceNumber: number;

  serviceCode: string;
  serviceDisplayName: string;
  description?: string;

  status: InvoiceLineStatus;

  serviceDate?: IsoDateTime;

  quantity: number;

  unitPrice: MoneyAmount;
  grossAmount: MoneyAmount;
  discountAmount: MoneyAmount;
  taxAmount: MoneyAmount;
  serviceChargeAmount: MoneyAmount;
  netAmount: MoneyAmount;

  payerType: BillingPayerType;

  patientResponsibilityAmount: MoneyAmount;
  insuranceResponsibilityAmount: MoneyAmount;
  corporateResponsibilityAmount: MoneyAmount;
  otherPayerResponsibilityAmount: MoneyAmount;

  creditedAmount: MoneyAmount;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InvoicePayerAllocation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  invoiceId: WonFlowId;
  invoiceLineItemId?: WonFlowId;

  payerType: BillingPayerType;

  patientBillingAccountId?: WonFlowId;
  payerBillingAccountId?: WonFlowId;

  insuranceCoverageId?: WonFlowId;
  corporateAgreementId?: WonFlowId;

  allocatedAmount: MoneyAmount;
  approvedAmount?: MoneyAmount;
  patientResponsibilityAmount?: MoneyAmount;

  authorizationRequired: boolean;
  authorizationReference?: string;

  status:
    | "planned"
    | "awaiting-authorization"
    | "authorized"
    | "partially-authorized"
    | "rejected"
    | "allocated"
    | "cancelled";

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InvoiceAdjustment {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  invoiceId: WonFlowId;
  invoiceLineItemId?: WonFlowId;
  chargeItemId?: WonFlowId;

  type: BillingAdjustmentType;
  status: BillingAdjustmentStatus;

  description: string;
  reason?: string;

  amount: MoneyAmount;

  /**
   * Percentage in basis points.
   *
   * Example:
   * 10% = 1000 basis points.
   */
  percentageBasisPoints?: number;

  requestedByUserId?: WonFlowId;
  requestedAt?: IsoDateTime;

  approvedByUserId?: WonFlowId;
  approvedAt?: IsoDateTime;

  appliedByUserId?: WonFlowId;
  appliedAt?: IsoDateTime;

  reversedByUserId?: WonFlowId;
  reversedAt?: IsoDateTime;
  reversalReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DiscountAuthorization {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  billingAccountId: WonFlowId;

  invoiceId?: WonFlowId;
  invoiceLineItemId?: WonFlowId;
  chargeItemId?: WonFlowId;

  type: DiscountType;
  reasonCode: DiscountReasonCode;
  status: DiscountAuthorizationStatus;

  requestedAmount?: MoneyAmount;
  requestedPercentageBasisPoints?: number;

  approvedAmount?: MoneyAmount;
  approvedPercentageBasisPoints?: number;

  justification: string;

  supportingDocumentIds: WonFlowId[];

  requestedByUserId: WonFlowId;
  requestedAt: IsoDateTime;

  approvalRoleRequired?: string;

  approvedByUserId?: WonFlowId;
  approvedAt?: IsoDateTime;

  rejectedByUserId?: WonFlowId;
  rejectedAt?: IsoDateTime;
  rejectionReason?: string;

  appliedAdjustmentId?: WonFlowId;

  expiresAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BillingPaymentTransaction {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientId?: WonFlowId;
  billingAccountId: WonFlowId;

  branchId: WonFlowId;
  cashierServicePointId?: WonFlowId;
  cashierSessionId?: WonFlowId;

  /**
   * Example:
   * PAY-2026-000481
   */
  paymentNumber: string;

  purpose: BillingPaymentPurpose;
  method: BillingPaymentMethod;
  status: BillingPaymentStatus;

  amount: MoneyAmount;

  payerType: BillingPayerType;
  payerDisplayName?: string;

  externalTransactionReference?: string;
  paymentGatewayReference?: string;
  bankReference?: string;
  chequeNumber?: string;

  idempotencyKey: string;

  initiatedByUserId?: WonFlowId;
  initiatedByPatientAccessAccountId?: WonFlowId;
  initiatedBySystem: boolean;

  initiatedAt: IsoDateTime;
  authorizedAt?: IsoDateTime;
  capturedAt?: IsoDateTime;
  failedAt?: IsoDateTime;
  reversedAt?: IsoDateTime;

  failureReason?: string;
  reversalReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PaymentAllocation {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientId?: WonFlowId;
  billingAccountId: WonFlowId;

  paymentTransactionId: WonFlowId;

  invoiceId?: WonFlowId;
  invoiceLineItemId?: WonFlowId;
  chargeItemId?: WonFlowId;
  advancePaymentAccountId?: WonFlowId;

  status: PaymentAllocationStatus;

  allocatedAmount: MoneyAmount;
  reversedAmount: MoneyAmount;

  allocatedByUserId?: WonFlowId;
  allocatedBySystem: boolean;
  allocatedAt: IsoDateTime;

  reversedByUserId?: WonFlowId;
  reversedAt?: IsoDateTime;
  reversalReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PaymentReceipt {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientId?: WonFlowId;
  billingAccountId: WonFlowId;

  paymentTransactionId: WonFlowId;

  /**
   * Example:
   * RCT-2026-000481
   */
  receiptNumber: string;

  status: PaymentReceiptStatus;

  amountReceived: MoneyAmount;

  paymentMethod: BillingPaymentMethod;
  payerDisplayName?: string;

  invoiceNumbers: string[];

  issuedByUserId?: WonFlowId;
  issuedBySystem: boolean;
  issuedAt: IsoDateTime;

  printedAt?: IsoDateTime;
  emailedAt?: IsoDateTime;
  releasedToPatientAccessAt?: IsoDateTime;

  reissuedFromReceiptId?: WonFlowId;
  reissueReason?: string;

  voidedByUserId?: WonFlowId;
  voidedAt?: IsoDateTime;
  voidReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RefundRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId?: WonFlowId;

  billingAccountId: WonFlowId;

  paymentTransactionId: WonFlowId;
  invoiceId?: WonFlowId;

  status: RefundStatus;
  reasonCode: RefundReasonCode;

  requestedAmount: MoneyAmount;
  approvedAmount?: MoneyAmount;
  completedAmount: MoneyAmount;

  reason: string;

  supportingDocumentIds: WonFlowId[];

  requestedByUserId: WonFlowId;
  requestedAt: IsoDateTime;

  approvalRequired: boolean;
  approvedByUserId?: WonFlowId;
  approvedAt?: IsoDateTime;

  rejectedByUserId?: WonFlowId;
  rejectedAt?: IsoDateTime;
  rejectionReason?: string;

  processedByUserId?: WonFlowId;
  processingStartedAt?: IsoDateTime;

  completedAt?: IsoDateTime;
  failedAt?: IsoDateTime;
  failureReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RefundTransaction {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId?: WonFlowId;

  refundRequestId: WonFlowId;
  originalPaymentTransactionId: WonFlowId;

  /**
   * Example:
   * REF-2026-000481
   */
  refundNumber: string;

  method: BillingPaymentMethod;
  status:
    | "initiated"
    | "pending"
    | "completed"
    | "failed"
    | "cancelled";

  amount: MoneyAmount;

  externalTransactionReference?: string;
  paymentGatewayReference?: string;
  bankReference?: string;

  processedByUserId?: WonFlowId;
  processedBySystem: boolean;

  initiatedAt: IsoDateTime;
  completedAt?: IsoDateTime;
  failedAt?: IsoDateTime;

  failureReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreditNote {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  billingAccountId: WonFlowId;
  invoiceId: WonFlowId;

  /**
   * Example:
   * CRN-2026-000481
   */
  creditNoteNumber: string;

  status: CreditNoteStatus;

  reason:
    | "service-cancelled"
    | "service-not-provided"
    | "billing-correction"
    | "price-correction"
    | "quantity-correction"
    | "insurance-adjustment"
    | "discount-after-invoice"
    | "medicine-return"
    | "other";

  description: string;

  amount: MoneyAmount;
  appliedAmount: MoneyAmount;
  remainingAmount: MoneyAmount;

  requestedByUserId?: WonFlowId;
  approvedByUserId?: WonFlowId;
  issuedByUserId?: WonFlowId;

  issuedAt?: IsoDateTime;

  voidedByUserId?: WonFlowId;
  voidedAt?: IsoDateTime;
  voidReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreditNoteAllocation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  creditNoteId: WonFlowId;

  invoiceId: WonFlowId;
  invoiceLineItemId?: WonFlowId;

  amount: MoneyAmount;

  appliedByUserId: WonFlowId;
  appliedAt: IsoDateTime;

  reversedByUserId?: WonFlowId;
  reversedAt?: IsoDateTime;
  reversalReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BillingWriteOff {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId?: WonFlowId;

  billingAccountId: WonFlowId;
  invoiceId: WonFlowId;

  status: WriteOffStatus;

  amount: MoneyAmount;

  reason:
    | "uncollectible"
    | "charity-approved"
    | "deceased-patient-policy"
    | "small-balance"
    | "management-decision"
    | "insurance-denial"
    | "legal-settlement"
    | "other";

  justification: string;

  requestedByUserId: WonFlowId;
  requestedAt: IsoDateTime;

  approvedByUserId?: WonFlowId;
  approvedAt?: IsoDateTime;

  appliedByUserId?: WonFlowId;
  appliedAt?: IsoDateTime;

  reversedByUserId?: WonFlowId;
  reversedAt?: IsoDateTime;
  reversalReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AdvancePaymentAccount {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  billingAccountId: WonFlowId;

  currencyCode: CurrencyCode;

  totalDeposited: MoneyAmount;
  totalAllocated: MoneyAmount;
  totalRefunded: MoneyAmount;
  availableBalance: MoneyAmount;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AdvancePaymentTransaction {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  advancePaymentAccountId: WonFlowId;

  paymentTransactionId?: WonFlowId;
  paymentAllocationId?: WonFlowId;
  refundTransactionId?: WonFlowId;
  invoiceId?: WonFlowId;

  type: AdvancePaymentTransactionType;

  amount: MoneyAmount;

  balanceBefore: MoneyAmount;
  balanceAfter: MoneyAmount;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface CashierSession {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  cashierServicePointId: WonFlowId;
  cashierUserId: WonFlowId;

  /**
   * Example:
   * CASH-2026-000128
   */
  sessionNumber: string;

  status: CashierSessionStatus;

  currencyCode: CurrencyCode;

  openingFloat: MoneyAmount;

  expectedCashAmount: MoneyAmount;
  countedCashAmount?: MoneyAmount;
  varianceAmount?: MoneyAmount;

  totalCashPayments: MoneyAmount;
  totalCashRefunds: MoneyAmount;

  totalCardPayments: MoneyAmount;
  totalBankTransfers: MoneyAmount;
  totalOnlinePayments: MoneyAmount;
  totalOtherPayments: MoneyAmount;

  openedAt?: IsoDateTime;
  closingStartedAt?: IsoDateTime;
  countedAt?: IsoDateTime;
  reviewedAt?: IsoDateTime;
  approvedAt?: IsoDateTime;
  closedAt?: IsoDateTime;

  reviewedByUserId?: WonFlowId;
  approvedByUserId?: WonFlowId;

  varianceReason?: string;
  closingNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CashMovement {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  cashierSessionId: WonFlowId;

  type: CashMovementType;
  amount: MoneyAmount;

  paymentTransactionId?: WonFlowId;
  refundTransactionId?: WonFlowId;

  reason?: string;

  performedByUserId: WonFlowId;
  occurredAt: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface InvoiceBalanceSnapshot {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  invoiceId: WonFlowId;

  totalAmount: MoneyAmount;
  paidAmount: MoneyAmount;
  refundedAmount: MoneyAmount;
  creditedAmount: MoneyAmount;
  writtenOffAmount: MoneyAmount;
  outstandingAmount: MoneyAmount;

  calculatedAt: IsoDateTime;
}

export interface BillingEvent {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientId?: WonFlowId;
  billingAccountId?: WonFlowId;

  chargeItemId?: WonFlowId;
  invoiceId?: WonFlowId;
  invoiceLineItemId?: WonFlowId;
  paymentTransactionId?: WonFlowId;
  refundRequestId?: WonFlowId;
  creditNoteId?: WonFlowId;
  cashierSessionId?: WonFlowId;

  type: BillingEventType;

  previousStatus?: string;
  newStatus?: string;

  amount?: MoneyAmount;
  reason?: string;

  performedByUserId?: WonFlowId;
  performedByPatientAccessAccountId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface BillingAggregate {
  account: BillingAccount;

  charges: ChargeItem[];

  invoices: Invoice[];
  invoiceLineItems: InvoiceLineItem[];
  payerAllocations: InvoicePayerAllocation[];
  invoiceAdjustments: InvoiceAdjustment[];
  discountAuthorizations: DiscountAuthorization[];

  payments: BillingPaymentTransaction[];
  paymentAllocations: PaymentAllocation[];
  receipts: PaymentReceipt[];

  refundRequests: RefundRequest[];
  refundTransactions: RefundTransaction[];

  creditNotes: CreditNote[];
  creditNoteAllocations: CreditNoteAllocation[];

  writeOffs: BillingWriteOff[];

  advancePaymentAccounts: AdvancePaymentAccount[];
  advancePaymentTransactions: AdvancePaymentTransaction[];

  invoiceBalanceSnapshots: InvoiceBalanceSnapshot[];

  events: BillingEvent[];
}

export const WONFLOW_CHARGE_STATUS_TRANSITIONS: Record<
  ChargeStatus,
  readonly ChargeStatus[]
> = {
  draft: [
    "pending-approval",
    "billable",
    "cancelled",
    "entered-in-error",
  ],

  "pending-approval": [
    "billable",
    "rejected",
    "cancelled",
    "entered-in-error",
  ],

  billable: [
    "invoiced",
    "cancelled",
    "entered-in-error",
  ],

  invoiced: [
    "partially-reversed",
    "reversed",
  ],

  "partially-reversed": [
    "reversed",
  ],

  reversed: [],
  cancelled: [],
  rejected: [],
  "entered-in-error": [],
};

export const WONFLOW_INVOICE_STATUS_TRANSITIONS: Record<
  InvoiceStatus,
  readonly InvoiceStatus[]
> = {
  draft: [
    "pending-approval",
    "issued",
    "voided",
    "entered-in-error",
  ],

  "pending-approval": [
    "draft",
    "issued",
    "voided",
    "entered-in-error",
  ],

  issued: [
    "partially-paid",
    "paid",
    "overdue",
    "disputed",
    "voided",
    "written-off",
  ],

  "partially-paid": [
    "paid",
    "overdue",
    "disputed",
    "partially-refunded",
    "refunded",
    "written-off",
  ],

  paid: [
    "disputed",
    "partially-refunded",
    "refunded",
  ],

  overdue: [
    "partially-paid",
    "paid",
    "disputed",
    "written-off",
  ],

  disputed: [
    "issued",
    "partially-paid",
    "paid",
    "voided",
    "written-off",
  ],

  "partially-refunded": [
    "refunded",
    "partially-paid",
    "paid",
  ],

  refunded: [],
  voided: [],
  "written-off": [],
  "entered-in-error": [],
};

export const WONFLOW_PAYMENT_STATUS_TRANSITIONS: Record<
  BillingPaymentStatus,
  readonly BillingPaymentStatus[]
> = {
  initiated: [
    "pending",
    "authorized",
    "captured",
    "failed",
    "cancelled",
  ],

  pending: [
    "authorized",
    "captured",
    "failed",
    "cancelled",
  ],

  authorized: [
    "captured",
    "failed",
    "cancelled",
  ],

  captured: [
    "partially-allocated",
    "allocated",
    "reversed",
    "partially-refunded",
    "refunded",
  ],

  "partially-allocated": [
    "allocated",
    "reversed",
    "partially-refunded",
    "refunded",
  ],

  allocated: [
    "reversed",
    "partially-refunded",
    "refunded",
  ],

  failed: [],
  cancelled: [],
  reversed: [],
  "partially-refunded": [
    "refunded",
  ],
  refunded: [],
};

export const WONFLOW_REFUND_STATUS_TRANSITIONS: Record<
  RefundStatus,
  readonly RefundStatus[]
> = {
  requested: [
    "under-review",
    "approved",
    "rejected",
    "cancelled",
  ],

  "under-review": [
    "approved",
    "rejected",
    "cancelled",
  ],

  approved: [
    "processing",
    "cancelled",
  ],

  rejected: [],

  processing: [
    "partially-completed",
    "completed",
    "failed",
  ],

  "partially-completed": [
    "processing",
    "completed",
    "failed",
  ],

  completed: [],
  failed: [],
  cancelled: [],
};

export const WONFLOW_CASHIER_SESSION_STATUS_TRANSITIONS: Record<
  CashierSessionStatus,
  readonly CashierSessionStatus[]
> = {
  scheduled: [
    "open",
    "cancelled",
  ],

  open: [
    "closing",
    "cancelled",
  ],

  closing: [
    "awaiting-review",
    "balanced",
    "variance-detected",
  ],

  "awaiting-review": [
    "balanced",
    "variance-detected",
  ],

  balanced: [
    "approved",
    "closed",
  ],

  "variance-detected": [
    "awaiting-review",
    "approved",
  ],

  approved: [
    "closed",
  ],

  closed: [],
  cancelled: [],
};