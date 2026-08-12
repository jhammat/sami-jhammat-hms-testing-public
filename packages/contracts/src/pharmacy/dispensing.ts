import type {
  IsoDateTime,
  WonFlowId,
} from "../organization/hierarchy";
import type {
  MedicationPriority,
  MedicationStockAvailability,
  MedicationSubstitutionPolicy,
} from "../clinical/medication";

export type PharmacyDispensingStatus =
  | "received"
  | "queued"
  | "under-review"
  | "clarification-required"
  | "approved"
  | "stock-allocation-pending"
  | "stock-allocated"
  | "preparation-in-progress"
  | "ready-for-collection"
  | "partially-dispensed"
  | "dispensed"
  | "rejected"
  | "cancelled"
  | "expired"
  | "entered-in-error";

export type PharmacyDispensingItemStatus =
  | "pending"
  | "under-review"
  | "approved"
  | "clarification-required"
  | "allocation-pending"
  | "allocated"
  | "preparing"
  | "ready"
  | "partially-dispensed"
  | "dispensed"
  | "substitution-proposed"
  | "unavailable"
  | "rejected"
  | "cancelled"
  | "entered-in-error";

export type PharmacistReviewStatus =
  | "pending"
  | "in-progress"
  | "clarification-required"
  | "approved"
  | "approved-with-conditions"
  | "rejected"
  | "cancelled";

export type PharmacistReviewIssueType =
  | "unclear-dose"
  | "unclear-frequency"
  | "unclear-duration"
  | "quantity-mismatch"
  | "allergy-concern"
  | "interaction-concern"
  | "duplicate-therapy"
  | "contraindication"
  | "dose-concern"
  | "age-related-concern"
  | "renal-function-concern"
  | "hepatic-function-concern"
  | "pregnancy-related-concern"
  | "controlled-medication-requirement"
  | "prescriber-authorization"
  | "stock-unavailable"
  | "formulary-restriction"
  | "substitution-approval-required"
  | "expired-prescription"
  | "refill-not-authorized"
  | "other";

export type PharmacistReviewIssueSeverity =
  | "information"
  | "warning"
  | "high"
  | "critical";

export type PharmacistReviewIssueStatus =
  | "open"
  | "clarification-requested"
  | "acknowledged"
  | "resolved"
  | "accepted-risk"
  | "rejected"
  | "not-applicable";

export type PharmacyClarificationStatus =
  | "requested"
  | "sent"
  | "responded"
  | "resolved"
  | "closed"
  | "cancelled"
  | "expired";

export type PharmacyClarificationTarget =
  | "prescriber"
  | "ordering-department"
  | "patient"
  | "guardian"
  | "insurance"
  | "inventory-team"
  | "other";

export type PharmacyStockReservationStatus =
  | "reserved"
  | "partially-reserved"
  | "committed"
  | "released"
  | "expired"
  | "cancelled";

export type PharmacyBatchAllocationStatus =
  | "planned"
  | "reserved"
  | "picked"
  | "verified"
  | "dispensed"
  | "released"
  | "cancelled"
  | "entered-in-error";

export type PharmacyBatchSelectionStrategy =
  | "fefo"
  | "fifo"
  | "manual-authorized"
  | "specific-batch"
  | "cold-chain-priority";

export type PharmacyPreparationStatus =
  | "pending"
  | "in-progress"
  | "awaiting-check"
  | "checked"
  | "ready"
  | "cancelled"
  | "failed";

export type PharmacyDispenseMethod =
  | "patient-collection"
  | "guardian-collection"
  | "ward-supply"
  | "clinic-administration"
  | "home-delivery"
  | "branch-transfer"
  | "other";

export type PharmacyCollectionStatus =
  | "awaiting-collection"
  | "patient-notified"
  | "identity-verification-pending"
  | "ready"
  | "collected"
  | "collection-failed"
  | "expired"
  | "cancelled";

export type PharmacyDeliveryStatus =
  | "not-required"
  | "requested"
  | "awaiting-address-confirmation"
  | "scheduled"
  | "dispatched"
  | "in-transit"
  | "delivered"
  | "delivery-failed"
  | "returned"
  | "cancelled";

export type PharmacySubstitutionStatus =
  | "proposed"
  | "awaiting-prescriber-approval"
  | "awaiting-patient-approval"
  | "approved"
  | "rejected"
  | "dispensed"
  | "cancelled"
  | "expired";

export type PharmacyCounsellingStatus =
  | "not-required"
  | "pending"
  | "in-progress"
  | "completed"
  | "patient-declined"
  | "not-possible"
  | "cancelled";

export type PharmacyCounsellingTopic =
  | "dose"
  | "frequency"
  | "duration"
  | "administration-technique"
  | "meal-relationship"
  | "storage"
  | "missed-dose"
  | "side-effects"
  | "warning-signs"
  | "drug-interactions"
  | "adherence"
  | "controlled-medication"
  | "device-demonstration"
  | "follow-up"
  | "other";

export type ControlledMedicationVerificationStatus =
  | "not-required"
  | "pending"
  | "verified"
  | "rejected"
  | "expired"
  | "cancelled";

export type PharmacyDispensingEventType =
  | "request-received"
  | "added-to-queue"
  | "review-started"
  | "issue-created"
  | "clarification-requested"
  | "clarification-resolved"
  | "review-approved"
  | "review-rejected"
  | "stock-reserved"
  | "stock-partially-reserved"
  | "batch-allocated"
  | "batch-picked"
  | "preparation-started"
  | "preparation-checked"
  | "ready-for-collection"
  | "patient-notified"
  | "identity-verified"
  | "partially-dispensed"
  | "dispensed"
  | "counselling-completed"
  | "substitution-proposed"
  | "substitution-approved"
  | "substitution-rejected"
  | "cancelled"
  | "entered-in-error";

export interface PharmacyDispensingCase {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  medicationRequestId: WonFlowId;
  medicationDispenseRequestId: WonFlowId;

  sourceBranchId: WonFlowId;
  pharmacyBranchId: WonFlowId;

  pharmacyDepartmentId: WonFlowId;
  pharmacyServicePointId?: WonFlowId;

  encounterId?: WonFlowId;
  consultationId?: WonFlowId;
  prescriptionNumber: string;

  /**
   * Human-readable pharmacy dispensing number.
   *
   * Example:
   * DSP-2026-000481
   */
  dispensingNumber: string;

  status: PharmacyDispensingStatus;
  priority: MedicationPriority;

  assignedPharmacistUserId?: WonFlowId;
  assignedTechnicianUserId?: WonFlowId;

  paymentRequired: boolean;
  paymentCleared: boolean;

  insuranceAuthorizationRequired: boolean;
  insuranceAuthorizationId?: WonFlowId;

  patientCollectionRequired: boolean;
  deliveryRequired: boolean;

  receivedAt: IsoDateTime;
  reviewStartedAt?: IsoDateTime;
  approvedAt?: IsoDateTime;
  readyAt?: IsoDateTime;
  dispensedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;

  cancellationReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacyDispensingItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  medicationOrderItemId: WonFlowId;

  sequenceNumber: number;

  medicationCode: string;
  medicationDisplayName: string;

  genericName?: string;
  brandName?: string;

  prescribedQuantity: number;
  prescribedQuantityUnit: string;

  approvedQuantity?: number;
  approvedQuantityUnit?: string;

  dispensedQuantity: number;
  dispensedQuantityUnit: string;

  remainingQuantity: number;
  remainingQuantityUnit: string;

  status: PharmacyDispensingItemStatus;
  stockAvailability: MedicationStockAvailability;

  substitutionPolicy: MedicationSubstitutionPolicy;

  controlledMedication: boolean;
  controlledMedicationVerificationId?: WonFlowId;

  stockReservationId?: WonFlowId;

  preparationInstructions?: string;
  patientInstructions?: string;
  pharmacistNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacistClinicalReview {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  medicationRequestId: WonFlowId;

  status: PharmacistReviewStatus;

  pharmacistUserId: WonFlowId;

  patientIdentityConfirmed: boolean;
  prescriptionValidityConfirmed: boolean;
  prescriberAuthorizationConfirmed: boolean;

  allergyReviewCompleted: boolean;
  interactionReviewCompleted: boolean;
  duplicateTherapyReviewCompleted: boolean;
  doseReviewCompleted: boolean;
  durationReviewCompleted: boolean;
  refillAuthorizationConfirmed: boolean;

  controlledMedicationReviewCompleted: boolean;
  paymentReviewCompleted: boolean;

  startedAt: IsoDateTime;
  completedAt?: IsoDateTime;

  reviewSummary?: string;
  conditions?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacistReviewIssue {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  clinicalReviewId: WonFlowId;
  dispensingCaseId: WonFlowId;
  dispensingItemId?: WonFlowId;

  type: PharmacistReviewIssueType;
  severity: PharmacistReviewIssueSeverity;
  status: PharmacistReviewIssueStatus;

  title: string;
  description: string;

  recommendedAction?: string;

  relatedMedicationSafetyIssueId?: WonFlowId;
  relatedAllergyId?: WonFlowId;
  relatedMedicationOrderItemId?: WonFlowId;

  createdByUserId: WonFlowId;

  resolvedByUserId?: WonFlowId;
  resolvedAt?: IsoDateTime;
  resolutionNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacyClarificationRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  dispensingItemId?: WonFlowId;
  clinicalReviewId?: WonFlowId;
  reviewIssueId?: WonFlowId;

  target: PharmacyClarificationTarget;
  targetUserId?: WonFlowId;
  targetPractitionerId?: WonFlowId;
  targetDepartmentId?: WonFlowId;

  status: PharmacyClarificationStatus;

  question: string;
  response?: string;

  requestedByUserId: WonFlowId;
  requestedAt: IsoDateTime;

  respondedByUserId?: WonFlowId;
  respondedByPractitionerId?: WonFlowId;
  respondedAt?: IsoDateTime;

  resolvedByUserId?: WonFlowId;
  resolvedAt?: IsoDateTime;

  expiresAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacyStockReservation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  dispensingItemId: WonFlowId;

  pharmacyBranchId: WonFlowId;
  inventoryLocationId: WonFlowId;

  medicationCode: string;

  requestedQuantity: number;
  reservedQuantity: number;
  quantityUnit: string;

  status: PharmacyStockReservationStatus;

  idempotencyKey: string;

  reservedByUserId?: WonFlowId;
  reservedBySystem: boolean;

  reservedAt: IsoDateTime;
  expiresAt?: IsoDateTime;

  committedAt?: IsoDateTime;
  releasedAt?: IsoDateTime;

  releaseReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacyBatchAllocation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  dispensingItemId: WonFlowId;
  stockReservationId?: WonFlowId;

  inventoryItemId: WonFlowId;
  inventoryBatchId: WonFlowId;
  inventoryLocationId: WonFlowId;

  batchNumber: string;
  serialNumber?: string;

  manufactureDate?: string;
  expiryDate: string;

  selectionStrategy: PharmacyBatchSelectionStrategy;

  allocatedQuantity: number;
  pickedQuantity: number;
  dispensedQuantity: number;
  quantityUnit: string;

  status: PharmacyBatchAllocationStatus;

  coldChainRequired: boolean;
  coldChainVerified: boolean;

  selectedByUserId?: WonFlowId;
  selectedBySystem: boolean;
  selectedAt: IsoDateTime;

  pickedByUserId?: WonFlowId;
  pickedAt?: IsoDateTime;

  verifiedByUserId?: WonFlowId;
  verifiedAt?: IsoDateTime;

  dispensedAt?: IsoDateTime;

  releasedAt?: IsoDateTime;
  releaseReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacyPreparation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  dispensingItemId: WonFlowId;

  status: PharmacyPreparationStatus;

  preparationType:
    | "standard-pack"
    | "repacked"
    | "compounded"
    | "reconstituted"
    | "device-setup"
    | "label-only"
    | "other";

  preparedQuantity: number;
  quantityUnit: string;

  preparationInstructions?: string;

  preparedByUserId?: WonFlowId;
  preparedAt?: IsoDateTime;

  independentCheckRequired: boolean;

  checkedByUserId?: WonFlowId;
  checkedAt?: IsoDateTime;

  checkResult?:
    | "approved"
    | "correction-required"
    | "rejected";

  correctionNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacyDispensingLabel {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  dispensingItemId: WonFlowId;
  preparationId?: WonFlowId;

  labelNumber: string;

  patientDisplayName: string;
  patientMrnDisplay: string;

  medicationDisplayName: string;
  strengthDisplay?: string;
  quantityDisplay: string;

  dosageInstruction: string;
  warningInstructions: string[];

  storageInstructions?: string;
  expiryDisplay?: string;

  generatedByUserId?: WonFlowId;
  generatedBySystem: boolean;
  generatedAt: IsoDateTime;

  printedByUserId?: WonFlowId;
  printedAt?: IsoDateTime;

  voidedByUserId?: WonFlowId;
  voidedAt?: IsoDateTime;
  voidReason?: string;
}

export interface PharmacySubstitutionProposal {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  dispensingItemId: WonFlowId;

  status: PharmacySubstitutionStatus;

  originalMedicationCode: string;
  originalMedicationDisplayName: string;

  proposedMedicationCode: string;
  proposedMedicationDisplayName: string;

  reason:
    | "original-unavailable"
    | "formulary-preference"
    | "generic-substitution"
    | "cost-reduction"
    | "patient-request"
    | "clinical-recommendation"
    | "other";

  clinicalEquivalenceConfirmed: boolean;
  strengthEquivalent: boolean;
  doseAdjustmentRequired: boolean;
  proposedDosageInstruction?: string;

  proposedByPharmacistUserId: WonFlowId;
  proposedAt: IsoDateTime;

  prescriberApprovalRequired: boolean;
  approvedByPractitionerId?: WonFlowId;
  prescriberApprovedAt?: IsoDateTime;

  patientApprovalRequired: boolean;
  patientApprovedAt?: IsoDateTime;

  rejectedByUserId?: WonFlowId;
  rejectedAt?: IsoDateTime;
  rejectionReason?: string;

  expiresAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ControlledMedicationVerification {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  dispensingItemId: WonFlowId;

  status: ControlledMedicationVerificationStatus;

  prescriptionFormatConfirmed: boolean;
  prescriberRegistrationConfirmed: boolean;
  prescriptionValidityConfirmed: boolean;
  quantityLimitConfirmed: boolean;
  refillRestrictionConfirmed: boolean;
  patientIdentityConfirmed: boolean;

  controlledRegisterEntryRequired: boolean;
  controlledRegisterEntryId?: WonFlowId;

  verifiedByUserId?: WonFlowId;
  verifiedAt?: IsoDateTime;

  rejectionReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacyDispenseRecord {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;

  pharmacyBranchId: WonFlowId;
  pharmacyDepartmentId: WonFlowId;
  pharmacyServicePointId?: WonFlowId;

  encounterId?: WonFlowId;
  medicationRequestId: WonFlowId;

  /**
   * Example:
   * DSP-RCT-2026-000817
   */
  dispenseRecordNumber: string;

  method: PharmacyDispenseMethod;

  partiallyDispensed: boolean;

  invoiceId?: WonFlowId;
  paymentId?: WonFlowId;

  paymentRequired: boolean;
  paymentCleared: boolean;

  patientIdentityVerified: boolean;
  collectorIdentityVerified: boolean;

  dispensedByUserId: WonFlowId;
  checkedByUserId?: WonFlowId;

  dispensedAt: IsoDateTime;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacyDispenseRecordItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispenseRecordId: WonFlowId;
  dispensingItemId: WonFlowId;
  medicationOrderItemId: WonFlowId;

  medicationCode: string;
  medicationDisplayName: string;

  quantityDispensed: number;
  quantityUnit: string;

  batchAllocationIds: WonFlowId[];

  substitutionProposalId?: WonFlowId;

  dosageInstruction: string;
  patientInstruction?: string;

  refillSequenceNumber?: number;

  createdAt: IsoDateTime;
}

export interface PharmacyCollection {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  dispenseRecordId?: WonFlowId;

  status: PharmacyCollectionStatus;

  collectorType:
    | "patient"
    | "guardian"
    | "caregiver"
    | "authorized-representative"
    | "hospital-staff";

  collectorName?: string;
  collectorRelationship?: string;
  collectorIdentificationType?: string;
  collectorIdentificationMasked?: string;

  patientIdentityVerified: boolean;
  collectorIdentityVerified: boolean;
  collectionAuthorizationVerified: boolean;

  notifiedAt?: IsoDateTime;
  readyAt?: IsoDateTime;

  verifiedByUserId?: WonFlowId;
  verifiedAt?: IsoDateTime;

  collectedAt?: IsoDateTime;

  failureReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacyDelivery {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  dispenseRecordId?: WonFlowId;

  status: PharmacyDeliveryStatus;

  deliveryAddressId: WonFlowId;
  deliveryProvider?: string;
  trackingReference?: string;

  coldChainRequired: boolean;
  coldChainConfirmed: boolean;

  scheduledAt?: IsoDateTime;
  dispatchedAt?: IsoDateTime;
  deliveredAt?: IsoDateTime;

  receivedByName?: string;
  receivedByRelationship?: string;

  proofOfDeliveryDocumentId?: WonFlowId;

  failureReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacyCounsellingRecord {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  dispenseRecordId?: WonFlowId;

  status: PharmacyCounsellingStatus;

  languageCode: string;

  topics: PharmacyCounsellingTopic[];

  counsellingSummary?: string;

  teachBackUsed: boolean;
  patientUnderstandingConfirmed: boolean;

  demonstrationProvided: boolean;
  demonstrationType?: string;

  writtenInstructionsProvided: boolean;
  patientAccessInstructionsReleased: boolean;

  patientQuestions?: string;
  pharmacistResponse?: string;

  counselledByUserId?: WonFlowId;
  counselledAt?: IsoDateTime;

  patientDeclineReason?: string;
  notPossibleReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PharmacyDispensingEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispensingCaseId: WonFlowId;
  dispensingItemId?: WonFlowId;
  stockReservationId?: WonFlowId;
  batchAllocationId?: WonFlowId;
  dispenseRecordId?: WonFlowId;

  type: PharmacyDispensingEventType;

  previousStatus?: string;
  newStatus?: string;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface PharmacyDispensingAggregate {
  dispensingCase: PharmacyDispensingCase;
  items: PharmacyDispensingItem[];

  clinicalReviews: PharmacistClinicalReview[];
  reviewIssues: PharmacistReviewIssue[];
  clarificationRequests: PharmacyClarificationRequest[];

  stockReservations: PharmacyStockReservation[];
  batchAllocations: PharmacyBatchAllocation[];

  preparations: PharmacyPreparation[];
  labels: PharmacyDispensingLabel[];

  substitutionProposals: PharmacySubstitutionProposal[];
  controlledMedicationVerifications: ControlledMedicationVerification[];

  dispenseRecords: PharmacyDispenseRecord[];
  dispenseRecordItems: PharmacyDispenseRecordItem[];

  collections: PharmacyCollection[];
  deliveries: PharmacyDelivery[];
  counsellingRecords: PharmacyCounsellingRecord[];

  events: PharmacyDispensingEvent[];
}

export const WONFLOW_PHARMACY_DISPENSING_STATUS_TRANSITIONS: Record<
  PharmacyDispensingStatus,
  readonly PharmacyDispensingStatus[]
> = {
  received: [
    "queued",
    "under-review",
    "cancelled",
    "expired",
    "entered-in-error",
  ],

  queued: [
    "under-review",
    "cancelled",
    "expired",
  ],

  "under-review": [
    "clarification-required",
    "approved",
    "rejected",
    "cancelled",
  ],

  "clarification-required": [
    "under-review",
    "approved",
    "rejected",
    "cancelled",
    "expired",
  ],

  approved: [
    "stock-allocation-pending",
    "stock-allocated",
    "preparation-in-progress",
    "cancelled",
  ],

  "stock-allocation-pending": [
    "stock-allocated",
    "clarification-required",
    "rejected",
    "cancelled",
  ],

  "stock-allocated": [
    "preparation-in-progress",
    "ready-for-collection",
    "partially-dispensed",
    "cancelled",
  ],

  "preparation-in-progress": [
    "ready-for-collection",
    "partially-dispensed",
    "cancelled",
  ],

  "ready-for-collection": [
    "partially-dispensed",
    "dispensed",
    "cancelled",
    "expired",
  ],

  "partially-dispensed": [
    "stock-allocation-pending",
    "ready-for-collection",
    "dispensed",
    "cancelled",
  ],

  dispensed: [],
  rejected: [],
  cancelled: [],
  expired: [],
  "entered-in-error": [],
};

export const WONFLOW_BATCH_ALLOCATION_STATUS_TRANSITIONS: Record<
  PharmacyBatchAllocationStatus,
  readonly PharmacyBatchAllocationStatus[]
> = {
  planned: [
    "reserved",
    "cancelled",
    "entered-in-error",
  ],

  reserved: [
    "picked",
    "released",
    "cancelled",
  ],

  picked: [
    "verified",
    "released",
    "cancelled",
  ],

  verified: [
    "dispensed",
    "released",
    "cancelled",
  ],

  dispensed: [],
  released: [],
  cancelled: [],
  "entered-in-error": [],
};