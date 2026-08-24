import type {
  IsoDateTime,
  WonFlowId,
} from "../organization/hierarchy";

export type MedicationRequestType =
  | "outpatient-prescription"
  | "inpatient-medication-order"
  | "emergency-medication"
  | "discharge-medication"
  | "clinic-administration"
  | "home-care-medication"
  | "refill-request"
  | "other";

export type MedicationRequestStatus =
  | "draft"
  | "awaiting-safety-review"
  | "awaiting-signature"
  | "active"
  | "on-hold"
  | "completed"
  | "stopped"
  | "cancelled"
  | "expired"
  | "entered-in-error";

export type MedicationOrderItemStatus =
  | "draft"
  | "active"
  | "on-hold"
  | "completed"
  | "stopped"
  | "cancelled"
  | "expired"
  | "entered-in-error";

export type MedicationPriority =
  | "routine"
  | "priority"
  | "urgent"
  | "stat";

export type MedicationRoute =
  | "oral"
  | "sublingual"
  | "buccal"
  | "topical"
  | "transdermal"
  | "inhalation"
  | "nasal"
  | "ophthalmic"
  | "otic"
  | "rectal"
  | "vaginal"
  | "subcutaneous"
  | "intramuscular"
  | "intravenous"
  | "intradermal"
  | "enteral-tube"
  | "other";

export type MedicationDoseForm =
  | "tablet"
  | "capsule"
  | "syrup"
  | "suspension"
  | "solution"
  | "drops"
  | "cream"
  | "ointment"
  | "gel"
  | "patch"
  | "inhaler"
  | "nebulizer-solution"
  | "injection"
  | "infusion"
  | "suppository"
  | "powder"
  | "spray"
  | "other";

export type MedicationFrequencyCode =
  | "once"
  | "daily"
  | "twice-daily"
  | "three-times-daily"
  | "four-times-daily"
  | "every-4-hours"
  | "every-6-hours"
  | "every-8-hours"
  | "every-12-hours"
  | "weekly"
  | "monthly"
  | "custom";

export type MedicationDurationUnit =
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "until-completed"
  | "ongoing";

export type MedicationMealRelation =
  | "before-food"
  | "with-food"
  | "after-food"
  | "empty-stomach"
  | "not-applicable";

export type MedicationSubstitutionPolicy =
  | "not-allowed"
  | "generic-only"
  | "formulary-equivalent"
  | "pharmacist-discretion"
  | "prescriber-approval-required";

export type MedicationSafetyCheckStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type MedicationSafetyIssueType =
  | "allergy"
  | "drug-interaction"
  | "duplicate-therapy"
  | "contraindication"
  | "dose-range"
  | "frequency"
  | "duration"
  | "route"
  | "age-related"
  | "pregnancy-related"
  | "renal-function"
  | "hepatic-function"
  | "controlled-medication"
  | "formulary-restriction"
  | "stock-unavailable"
  | "other";

export type MedicationSafetySeverity =
  | "information"
  | "warning"
  | "high"
  | "critical";

export type MedicationSafetyIssueStatus =
  | "unresolved"
  | "acknowledged"
  | "overridden"
  | "resolved"
  | "not-applicable";

export type MedicationDispenseRequestStatus =
  | "draft"
  | "queued"
  | "under-review"
  | "clarification-required"
  | "approved"
  | "partially-approved"
  | "rejected"
  | "ready-for-dispensing"
  | "partially-dispensed"
  | "dispensed"
  | "cancelled"
  | "expired";

export type MedicationDispenseItemStatus =
  | "pending"
  | "under-review"
  | "approved"
  | "substitution-proposed"
  | "clarification-required"
  | "unavailable"
  | "partially-dispensed"
  | "dispensed"
  | "rejected"
  | "cancelled";

export type MedicationStockAvailability =
  | "unknown"
  | "available"
  | "partially-available"
  | "unavailable"
  | "alternative-available";

export type MedicationRefillStatus =
  | "not-allowed"
  | "available"
  | "requested"
  | "approved"
  | "rejected"
  | "expired"
  | "completed";

export type MedicationRequestEventType =
  | "created"
  | "updated"
  | "safety-check-started"
  | "safety-check-completed"
  | "warning-acknowledged"
  | "warning-overridden"
  | "submitted"
  | "signed"
  | "activated"
  | "held"
  | "resumed"
  | "stopped"
  | "cancelled"
  | "completed"
  | "entered-in-error"
  | "dispense-request-created";

export interface MedicationRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  branchId: WonFlowId;
  branchDepartmentId: WonFlowId;

  encounterId: WonFlowId;
  consultationId?: WonFlowId;
  careEpisodeId?: WonFlowId;
  treatmentPlanId?: WonFlowId;
  clinicalNoteId?: WonFlowId;

  /**
   * Human-readable prescription reference.
   *
   * Example:
   * RX-2026-000481
   */
  prescriptionNumber: string;

  type: MedicationRequestType;
  status: MedicationRequestStatus;
  priority: MedicationPriority;

  prescribingPractitionerId: WonFlowId;
  prescribingUserId: WonFlowId;

  indication?: string;
  clinicalNotes?: string;

  safetyCheckRequired: boolean;
  latestSafetyCheckRunId?: WonFlowId;

  signatureRequired: boolean;
  signedByPractitionerId?: WonFlowId;
  signedAt?: IsoDateTime;

  effectiveFrom?: IsoDateTime;
  effectiveTo?: IsoDateTime;

  stoppedAt?: IsoDateTime;
  stoppedByUserId?: WonFlowId;
  stopReason?: string;

  cancelledAt?: IsoDateTime;
  cancelledByUserId?: WonFlowId;
  cancellationReason?: string;

  enteredInErrorAt?: IsoDateTime;
  enteredInErrorByUserId?: WonFlowId;
  enteredInErrorReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationOrderItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;
  medicationRequestId: WonFlowId;

  sequenceNumber: number;
  status: MedicationOrderItemStatus;
  priority: MedicationPriority;

  /**
   * Medication catalogue or terminology identifier.
   */
  medicationCode: string;
  medicationDisplay: string;

  genericName?: string;
  brandName?: string;

  doseForm: MedicationDoseForm;

  strengthValue?: number;
  strengthUnit?: string;
  strengthText?: string;

  route: MedicationRoute;

  indication?: string;

  substitutionPolicy: MedicationSubstitutionPolicy;

  controlledMedication: boolean;

  startAt?: IsoDateTime;
  endAt?: IsoDateTime;

  quantityRequested?: number;
  quantityUnit?: string;

  numberOfRefills: number;

  patientInstructions?: string;
  pharmacistNotes?: string;
  internalClinicalNotes?: string;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationDosageInstruction {
  id: WonFlowId;

  organizationId: WonFlowId;
  medicationOrderItemId: WonFlowId;

  sequenceNumber: number;

  doseValue?: number;
  doseUnit?: string;

  doseRangeLow?: number;
  doseRangeHigh?: number;

  route: MedicationRoute;
  frequencyCode: MedicationFrequencyCode;
  frequencyText?: string;

  /**
   * Used for custom frequencies.
   *
   * Example:
   * Every 10 hours.
   */
  intervalHours?: number;

  timesPerDay?: number;
  preferredAdministrationTimes: string[];

  asNeeded: boolean;
  asNeededReason?: string;
  maximumDailyDose?: number;
  maximumDailyDoseUnit?: string;

  durationValue?: number;
  durationUnit: MedicationDurationUnit;

  mealRelation?: MedicationMealRelation;

  taperingInstruction?: string;
  administrationInstruction?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationSafetyCheckRun {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;
  medicationRequestId: WonFlowId;

  status: MedicationSafetyCheckStatus;

  /**
   * Version of the medication request checked.
   */
  requestVersion: number;

  checkedMedicationItemIds: WonFlowId[];

  patientAllergyDataAvailable: boolean;
  currentMedicationDataAvailable: boolean;
  renalDataAvailable: boolean;
  hepaticDataAvailable: boolean;
  pregnancyDataAvailable: boolean;

  startedAt: IsoDateTime;
  completedAt?: IsoDateTime;

  initiatedByUserId?: WonFlowId;
  initiatedBySystem: boolean;

  failureReason?: string;

  createdAt: IsoDateTime;
}

export interface MedicationSafetyIssue {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  safetyCheckRunId: WonFlowId;
  medicationRequestId: WonFlowId;
  medicationOrderItemId?: WonFlowId;

  type: MedicationSafetyIssueType;
  severity: MedicationSafetySeverity;
  status: MedicationSafetyIssueStatus;

  title: string;
  description: string;

  evidenceSummary?: string;

  /**
   * Optional references to the related patient record or medication.
   */
  relatedAllergyId?: WonFlowId;
  relatedMedicationOrderItemId?: WonFlowId;
  relatedObservationId?: WonFlowId;
  relatedDiagnosisId?: WonFlowId;

  recommendedAction?: string;

  acknowledgedByUserId?: WonFlowId;
  acknowledgedAt?: IsoDateTime;

  resolvedByUserId?: WonFlowId;
  resolvedAt?: IsoDateTime;
  resolutionNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationSafetyOverride {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  medicationRequestId: WonFlowId;
  safetyIssueId: WonFlowId;

  reasonCode:
    | "clinical-benefit-outweighs-risk"
    | "patient-previously-tolerated"
    | "specialist-decision"
    | "monitoring-arranged"
    | "alert-not-clinically-relevant"
    | "emergency-treatment"
    | "other";

  justification: string;

  overriddenByUserId: WonFlowId;
  overriddenByPractitionerId?: WonFlowId;

  reauthenticationCompleted: boolean;
  supervisorApprovalRequired: boolean;
  approvedByPractitionerId?: WonFlowId;
  approvedAt?: IsoDateTime;

  occurredAt: IsoDateTime;
}

export interface MedicationRefillAuthorization {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  medicationRequestId: WonFlowId;
  medicationOrderItemId: WonFlowId;

  status: MedicationRefillStatus;

  totalAuthorizedRefills: number;
  remainingRefills: number;

  minimumDaysBetweenRefills?: number;

  validFrom: IsoDateTime;
  validUntil?: IsoDateTime;

  authorizedByPractitionerId: WonFlowId;
  authorizedAt: IsoDateTime;

  lastRefillAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationDispenseRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  medicationRequestId: WonFlowId;

  sourceBranchId: WonFlowId;
  requestedPharmacyBranchId: WonFlowId;

  pharmacyDepartmentId?: WonFlowId;
  pharmacyServicePointId?: WonFlowId;

  status: MedicationDispenseRequestStatus;
  priority: MedicationPriority;

  requestedByUserId: WonFlowId;
  requestedAt: IsoDateTime;

  assignedPharmacistUserId?: WonFlowId;

  reviewedAt?: IsoDateTime;
  approvedAt?: IsoDateTime;
  readyAt?: IsoDateTime;
  dispensedAt?: IsoDateTime;

  clarificationRequired: boolean;
  clarificationMessage?: string;

  patientCollectionRequired: boolean;
  deliveryRequested: boolean;
  deliveryAddressId?: WonFlowId;

  invoiceId?: WonFlowId;
  paymentRequired: boolean;
  paymentCleared: boolean;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationDispenseRequestItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  dispenseRequestId: WonFlowId;
  medicationOrderItemId: WonFlowId;

  status: MedicationDispenseItemStatus;
  stockAvailability: MedicationStockAvailability;

  medicationCode: string;
  medicationDisplay: string;

  prescribedQuantity?: number;
  prescribedQuantityUnit?: string;

  approvedQuantity?: number;
  approvedQuantityUnit?: string;

  dispensedQuantity?: number;
  dispensedQuantityUnit?: string;

  proposedSubstituteMedicationCode?: string;
  proposedSubstituteMedicationDisplay?: string;

  substitutionReason?: string;
  substitutionApprovedByPrescriber: boolean;
  substitutionApprovedAt?: IsoDateTime;

  batchSelectionRequired: boolean;

  pharmacistNotes?: string;
  rejectionReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationRequestEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  medicationRequestId: WonFlowId;
  medicationOrderItemId?: WonFlowId;

  type: MedicationRequestEventType;

  previousStatus?: string;
  newStatus?: string;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface MedicationRequestAggregate {
  medicationRequest: MedicationRequest;

  items: MedicationOrderItem[];
  dosageInstructions: MedicationDosageInstruction[];

  safetyCheckRuns: MedicationSafetyCheckRun[];
  safetyIssues: MedicationSafetyIssue[];
  safetyOverrides: MedicationSafetyOverride[];

  refillAuthorizations: MedicationRefillAuthorization[];

  dispenseRequests: MedicationDispenseRequest[];
  dispenseRequestItems: MedicationDispenseRequestItem[];

  events: MedicationRequestEvent[];
}

export const WONFLOW_MEDICATION_REQUEST_STATUS_TRANSITIONS: Record<
  MedicationRequestStatus,
  readonly MedicationRequestStatus[]
> = {
  draft: [
    "awaiting-safety-review",
    "awaiting-signature",
    "cancelled",
    "entered-in-error",
  ],

  "awaiting-safety-review": [
    "draft",
    "awaiting-signature",
    "cancelled",
    "entered-in-error",
  ],

  "awaiting-signature": [
    "draft",
    "active",
    "cancelled",
    "entered-in-error",
  ],

  active: [
    "on-hold",
    "completed",
    "stopped",
    "cancelled",
    "expired",
    "entered-in-error",
  ],

  "on-hold": [
    "active",
    "stopped",
    "cancelled",
    "expired",
  ],

  completed: [],
  stopped: [],
  cancelled: [],
  expired: [],
  "entered-in-error": [],
};

export const WONFLOW_DISPENSE_REQUEST_STATUS_TRANSITIONS: Record<
  MedicationDispenseRequestStatus,
  readonly MedicationDispenseRequestStatus[]
> = {
  draft: [
    "queued",
    "cancelled",
    "expired",
  ],

  queued: [
    "under-review",
    "cancelled",
    "expired",
  ],

  "under-review": [
    "clarification-required",
    "approved",
    "partially-approved",
    "rejected",
    "cancelled",
  ],

  "clarification-required": [
    "under-review",
    "approved",
    "partially-approved",
    "rejected",
    "cancelled",
  ],

  approved: [
    "ready-for-dispensing",
    "partially-dispensed",
    "dispensed",
    "cancelled",
  ],

  "partially-approved": [
    "clarification-required",
    "ready-for-dispensing",
    "partially-dispensed",
    "rejected",
    "cancelled",
  ],

  "ready-for-dispensing": [
    "partially-dispensed",
    "dispensed",
    "cancelled",
  ],

  "partially-dispensed": [
    "ready-for-dispensing",
    "dispensed",
    "cancelled",
  ],

  dispensed: [],
  rejected: [],
  cancelled: [],
  expired: [],
};

export interface MedicationDoseItem {
  id: string;
  medicationName: string;
  dose: string;
  frequency: string;
  route?: string;
  scheduledFor: string;
  dueBy?: string | null;
  status: "PENDING" | "COMPLETED" | "SKIPPED" | "MISSED";
  completedAt?: string | null;
  skipReason?: string | null;
  instructions?: string | null;
  isWithMeals?: boolean;
}

export interface MedicationScheduleSummary {
  patientId: string;
  date: string;
  todayDoses: MedicationDoseItem[];
  takenCount: number;
  pendingCount: number;
  skippedCount: number;
  missedCount: number;
  adherencePercentage: number;
}

export interface MedicationAdherenceSummary {
  medicationId?: string;
  medicationName: string;
  dose: string;
  frequency: string;
  totalPrescribedDoses: number;
  takenDoses: number;
  skippedDoses: number;
  missedDoses: number;
  adherenceRate: number;
  recentDoses: {
    id: string;
    scheduledFor: string;
    status: "PENDING" | "COMPLETED" | "SKIPPED" | "MISSED";
    completedAt?: string | null;
    skipReason?: string | null;
  }[];
}

export interface GenerateMedicationRemindersInput {
  prescriptionId: string;
  carePlanId?: string;
  durationDays?: number;
}