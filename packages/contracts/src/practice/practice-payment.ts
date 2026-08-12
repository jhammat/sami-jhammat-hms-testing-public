/**
 * Tenant-configurable practice payment providers, payment intents,
 * settlement records, transfer proofs, refunds and receipt templates.
 *
 * Payment methods are configuration data. This contract deliberately
 * contains no country-specific provider names or closed payment-method
 * enum.
 *
 * Gateway calls, secrets, settlement processing, receipt rendering and
 * persistence belong to later implementation layers.
 */

import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

import type {
  PracticeMoney,
} from "./service-catalogue";

/**
 * Operational collection mode used by WonFlow.
 *
 * This describes how the platform handles a configured provider. It is
 * not the provider's tenant-facing name or market-specific method.
 */
export type PaymentProviderCollectionMode =
  | "online"
  | "offline"
  | "external-facility"
  | "waiver";

/**
 * Lifecycle of a temporary payment intent.
 */
export type PracticePaymentIntentStatus =
  | "draft"
  | "pending"
  | "requires-action"
  | "processing"
  | "succeeded"
  | "failed"
  | "expired"
  | "cancelled"
  | "waived";

/**
 * Reconciliation state of a recorded settlement.
 */
export type PracticePaymentReconciliationState =
  | "not-required"
  | "pending"
  | "reconciled"
  | "exception"
  | "not-applicable";

/**
 * Verification state of uploaded payment evidence.
 */
export type PracticeTransferProofVerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs-clarification";

/**
 * Lifecycle of a refund request.
 */
export type PracticeRefundStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Tenant-owned payment provider configuration.
 *
 * Examples could include an online gateway, cash collection, a bank
 * transfer workflow or an external facility counter. Those examples
 * are data created by the tenant and must never become enum values.
 */
export interface PaymentProviderConfig {
  id: WonFlowId;

  organizationId: WonFlowId;

  /**
   * Tenant-controlled stable code.
   *
   * Examples are supplied through configuration rather than source
   * code.
   */
  code: string;

  displayName: string;

  description?: string;

  collectionMode:
    PaymentProviderCollectionMode;

  /**
   * Opaque platform integration identifier for an online provider.
   *
   * It identifies an implementation adapter, not credentials or secret
   * configuration.
   */
  integrationKey?: string;

  /**
   * ISO 4217 currency codes accepted by this provider configuration.
   */
  supportedCurrencyCodes: string[];

  /**
   * When true, this provider is enabled for every active practice
   * location.
   */
  allPracticeLocations: boolean;

  /**
   * Explicit location scope when allPracticeLocations is false.
   */
  practiceLocationIds: WonFlowId[];

  /**
   * When true, this provider is enabled for every service offering.
   */
  allServiceOfferings: boolean;

  /**
   * Explicit offering scope when allServiceOfferings is false.
   */
  practiceServiceOfferingIds: WonFlowId[];

  /**
   * Whether a patient or staff member must attach evidence before an
   * offline settlement may be approved.
   */
  requiresTransferProof: boolean;

  supportsRefunds: boolean;

  patientFacing: boolean;

  status: RecordStatus;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Temporary request to collect payment for one appointment.
 *
 * The selected method is represented by a tenant-owned provider record.
 * methodCode is copied from that configuration so the intent remains
 * understandable if the provider is later renamed or archived.
 */
export interface PracticePaymentIntent {
  id: WonFlowId;

  organizationId: WonFlowId;

  appointmentId: WonFlowId;

  paymentProviderConfigId: WonFlowId;

  methodCode: string;

  amount: PracticeMoney;

  status: PracticePaymentIntentStatus;

  /**
   * Reference assigned by the configured online provider.
   */
  gatewayReference?: string;

  /**
   * Opaque checkout or provider-session reference.
   *
   * This is not a secret or payment credential.
   */
  gatewaySessionReference?: string;

  expiresAt?: IsoDateTime;

  failureReason?: string;

  cancelledAt?: IsoDateTime;

  cancellationReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Shared fields recorded for every completed settlement or waiver.
 */
export interface PracticePaymentRecordBase {
  id: WonFlowId;

  organizationId: WonFlowId;

  appointmentId: WonFlowId;

  paymentIntentId?: WonFlowId;

  paymentProviderConfigId: WonFlowId;

  /**
   * Snapshot of the provider code used for this settlement.
   */
  methodCode: string;

  collectionMode:
    PaymentProviderCollectionMode;

  amount: PracticeMoney;

  receiptNumber: string;

  reconciliationState:
    PracticePaymentReconciliationState;

  settledAt: IsoDateTime;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Settlement confirmed by an online provider.
 *
 * Client-reported success is insufficient. The future backend may
 * create this record only after server-side provider confirmation.
 */
export interface PracticeOnlinePaymentRecord
  extends PracticePaymentRecordBase {
  collectionMode: "online";

  gatewayTransactionId: string;

  gatewayReference?: string;

  collectedByTeamMemberId?: never;

  transferProofId?: never;

  externalCollectionReference?: never;

  externalCollectorName?: never;

  waivedByTeamMemberId?: never;

  waiverReason?: never;
}

/**
 * Settlement explicitly collected or verified by the practice.
 *
 * Offline records always identify the responsible team member.
 * Whether transfer proof is mandatory is determined by the referenced
 * PaymentProviderConfig.
 */
export interface PracticeOfflinePaymentRecord
  extends PracticePaymentRecordBase {
  collectionMode: "offline";

  collectedByTeamMemberId: WonFlowId;

  transferProofId?: WonFlowId;

  gatewayTransactionId?: never;

  gatewayReference?: never;

  externalCollectionReference?: never;

  externalCollectorName?: never;

  waivedByTeamMemberId?: never;

  waiverReason?: never;
}

/**
 * Payment collected by a facility outside the tenant's own practice
 * cash workflow.
 *
 * This covers an external hospital or clinic counter without assuming
 * that every practice location is a hospital.
 */
export interface PracticeExternalCollectedPaymentRecord
  extends PracticePaymentRecordBase {
  collectionMode:
    "external-facility";

  reconciliationState:
    "not-applicable";

  externalCollectionReference: string;

  externalCollectorName: string;

  collectedByTeamMemberId?: never;

  transferProofId?: never;

  gatewayTransactionId?: never;

  gatewayReference?: never;

  waivedByTeamMemberId?: never;

  waiverReason?: never;
}

/**
 * Explicit fee waiver approved by a practice team member.
 *
 * The runtime validation layer requires the amount to be zero.
 */
export interface PracticeWaivedPaymentRecord
  extends PracticePaymentRecordBase {
  collectionMode: "waiver";

  reconciliationState:
    "not-required";

  waivedByTeamMemberId: WonFlowId;

  waiverReason: string;

  collectedByTeamMemberId?: never;

  transferProofId?: never;

  gatewayTransactionId?: never;

  gatewayReference?: never;

  externalCollectionReference?: never;

  externalCollectorName?: never;
}

/**
 * Completed payment, external collection or waiver.
 */
export type PracticePaymentRecord =
  | PracticeOnlinePaymentRecord
  | PracticeOfflinePaymentRecord
  | PracticeExternalCollectedPaymentRecord
  | PracticeWaivedPaymentRecord;

/**
 * Evidence submitted for a configured offline payment provider.
 *
 * The referenced PracticeDocument contains the uploaded file. No binary
 * data, storage key or public file URL belongs in this contract.
 */
export interface PracticeTransferProof {
  id: WonFlowId;

  organizationId: WonFlowId;

  appointmentId: WonFlowId;

  paymentIntentId?: WonFlowId;

  paymentProviderConfigId: WonFlowId;

  practiceDocumentId: WonFlowId;

  submittedAmount: PracticeMoney;

  verificationStatus:
    PracticeTransferProofVerificationStatus;

  submittedByPatientAccountId?: WonFlowId;

  submittedByUserId?: WonFlowId;

  submittedAt: IsoDateTime;

  verifiedByTeamMemberId?: WonFlowId;

  verifiedAt?: IsoDateTime;

  verificationNote?: string;

  rejectedAt?: IsoDateTime;

  rejectionReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Return of money from a completed payment.
 *
 * methodCode remains open and tenant-configurable. A refund may use the
 * original provider or another provider chosen by the tenant.
 */
export interface PracticeRefund {
  id: WonFlowId;

  organizationId: WonFlowId;

  appointmentId: WonFlowId;

  paymentRecordId: WonFlowId;

  paymentProviderConfigId?: WonFlowId;

  methodCode: string;

  amount: PracticeMoney;

  reason: string;

  status: PracticeRefundStatus;

  requestedByUserId: WonFlowId;

  requestedAt: IsoDateTime;

  approvedByTeamMemberId?: WonFlowId;

  approvedAt?: IsoDateTime;

  rejectedByTeamMemberId?: WonFlowId;

  rejectedAt?: IsoDateTime;

  rejectionReason?: string;

  /**
   * Refund reference returned by an online provider.
   */
  gatewayRefundReference?: string;

  processedByTeamMemberId?: WonFlowId;

  completedAt?: IsoDateTime;

  failedAt?: IsoDateTime;

  failureReason?: string;

  cancelledAt?: IsoDateTime;

  cancellationReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * One tenant-configurable field in a printable receipt.
 *
 * Keys are intentionally open. A tenant may choose the fields and
 * labels required in its own market without a code deployment.
 */
export interface PracticeReceiptTemplateField {
  key: string;

  label: string;

  visible: boolean;

  sortOrder: number;
}

/**
 * Versioned tenant-owned receipt configuration.
 *
 * The rendering layer reads this record. No receipt header, footer,
 * field list, tax wording or visual layout may be hardcoded in source.
 */
export interface PracticeReceiptTemplate {
  id: WonFlowId;

  organizationId: WonFlowId;

  name: string;

  version: string;

  headerText?: string;

  footerText?: string;

  taxNote?: string;

  fields:
    PracticeReceiptTemplateField[];

  effectiveFrom: IsoDateTime;

  effectiveTo?: IsoDateTime;

  status: RecordStatus;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Rendered value captured for one receipt field.
 */
export interface PracticeReceiptFieldValue {
  key: string;

  label: string;

  value: string;

  sortOrder: number;
}

/**
 * Immutable printable receipt snapshot.
 *
 * Template text and resolved field values are copied at issue time so
 * later template edits cannot alter an historical receipt.
 */
export interface PracticeReceipt {
  id: WonFlowId;

  organizationId: WonFlowId;

  paymentRecordId: WonFlowId;

  appointmentId: WonFlowId;

  receiptTemplateId: WonFlowId;

  receiptTemplateVersion: string;

  receiptNumber: string;

  total: PracticeMoney;

  headerText?: string;

  footerText?: string;

  taxNote?: string;

  fieldValues:
    PracticeReceiptFieldValue[];

  issuedAt: IsoDateTime;

  issuedByTeamMemberId?: WonFlowId;

  createdAt: IsoDateTime;
}

/**
 * Complete payment view for one tenant scope.
 */
export interface PracticePaymentAggregate {
  providerConfigs:
    PaymentProviderConfig[];

  intents: PracticePaymentIntent[];

  records: PracticePaymentRecord[];

  transferProofs:
    PracticeTransferProof[];

  refunds: PracticeRefund[];

  receiptTemplates:
    PracticeReceiptTemplate[];

  receipts: PracticeReceipt[];
}