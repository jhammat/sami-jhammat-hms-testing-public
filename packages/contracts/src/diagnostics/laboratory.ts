import type {
  IsoDateTime,
  WonFlowId,
} from "../organization/hierarchy";

export type LaboratoryOrderType =
  | "routine"
  | "urgent"
  | "stat"
  | "emergency"
  | "pre-operative"
  | "screening"
  | "monitoring"
  | "standing-order"
  | "external-referral"
  | "point-of-care";

export type LaboratoryOrderSource =
  | "consultation"
  | "emergency"
  | "inpatient"
  | "procedure"
  | "day-care"
  | "home-care"
  | "external-referral"
  | "direct-booking"
  | "system";

export type LaboratoryOrderStatus =
  | "draft"
  | "awaiting-signature"
  | "ordered"
  | "awaiting-payment"
  | "awaiting-authorization"
  | "ready-for-collection"
  | "partially-collected"
  | "collected"
  | "received"
  | "in-progress"
  | "partially-resulted"
  | "resulted"
  | "verified"
  | "released"
  | "completed"
  | "cancelled"
  | "rejected"
  | "entered-in-error";

export type LaboratoryOrderItemStatus =
  | "ordered"
  | "awaiting-collection"
  | "collected"
  | "received"
  | "in-progress"
  | "resulted"
  | "verified"
  | "released"
  | "cancelled"
  | "rejected"
  | "not-performed"
  | "entered-in-error";

export type LaboratoryPriority =
  | "routine"
  | "priority"
  | "urgent"
  | "stat"
  | "critical";

export type LaboratoryTestType =
  | "individual-test"
  | "panel"
  | "profile"
  | "culture"
  | "microscopy"
  | "histopathology"
  | "cytology"
  | "molecular"
  | "blood-bank"
  | "point-of-care"
  | "other";

export type SpecimenType =
  | "whole-blood"
  | "serum"
  | "plasma"
  | "urine"
  | "stool"
  | "sputum"
  | "saliva"
  | "swab"
  | "tissue"
  | "biopsy"
  | "bone-marrow"
  | "cerebrospinal-fluid"
  | "pleural-fluid"
  | "ascitic-fluid"
  | "synovial-fluid"
  | "semen"
  | "other-body-fluid"
  | "other";

export type SpecimenCollectionMethod =
  | "venipuncture"
  | "finger-prick"
  | "arterial-puncture"
  | "midstream-urine"
  | "catheter-collection"
  | "swab"
  | "aspiration"
  | "biopsy"
  | "surgical-collection"
  | "self-collection"
  | "other";

export type SpecimenStatus =
  | "planned"
  | "label-generated"
  | "collection-in-progress"
  | "collected"
  | "in-transit"
  | "received"
  | "accepted"
  | "processing"
  | "stored"
  | "consumed"
  | "disposed"
  | "rejected"
  | "lost"
  | "entered-in-error";

export type SpecimenRejectionReason =
  | "unlabelled"
  | "mislabelled"
  | "patient-mismatch"
  | "wrong-container"
  | "insufficient-volume"
  | "clotted"
  | "haemolysed"
  | "leaking"
  | "contaminated"
  | "improper-temperature"
  | "transport-delay"
  | "expired"
  | "duplicate-specimen"
  | "damaged"
  | "collection-error"
  | "other";

export type LaboratoryAccessionStatus =
  | "created"
  | "received"
  | "accepted"
  | "partially-accepted"
  | "rejected"
  | "in-progress"
  | "completed"
  | "cancelled";

export type LaboratoryResultValueType =
  | "number"
  | "text"
  | "coded-value"
  | "boolean"
  | "date-time"
  | "ratio"
  | "range"
  | "attachment"
  | "narrative";

export type LaboratoryResultStatus =
  | "pending"
  | "preliminary"
  | "final"
  | "verified"
  | "corrected"
  | "amended"
  | "cancelled"
  | "entered-in-error";

export type LaboratoryResultFlag =
  | "normal"
  | "low"
  | "high"
  | "abnormal"
  | "critical-low"
  | "critical-high"
  | "positive"
  | "negative"
  | "indeterminate"
  | "resistant"
  | "sensitive"
  | "intermediate"
  | "not-applicable";

export type LaboratoryVerificationLevel =
  | "technical"
  | "clinical"
  | "pathologist"
  | "supervisor";

export type LaboratoryReportStatus =
  | "draft"
  | "preliminary"
  | "awaiting-verification"
  | "verified"
  | "released"
  | "corrected"
  | "amended"
  | "cancelled"
  | "entered-in-error";

export type CriticalResultAlertStatus =
  | "created"
  | "notification-in-progress"
  | "communicated"
  | "acknowledged"
  | "escalated"
  | "closed"
  | "cancelled"
  | "entered-in-error";

export type CriticalResultCommunicationMethod =
  | "secure-message"
  | "phone"
  | "hospital-extension"
  | "in-person"
  | "sms"
  | "push-notification"
  | "system-alert"
  | "other";

export type LaboratoryEventType =
  | "order-created"
  | "order-signed"
  | "order-cancelled"
  | "collection-started"
  | "label-generated"
  | "specimen-collected"
  | "specimen-dispatched"
  | "specimen-received"
  | "specimen-accepted"
  | "specimen-rejected"
  | "accession-created"
  | "testing-started"
  | "result-entered"
  | "result-verified"
  | "report-created"
  | "report-verified"
  | "report-released"
  | "critical-alert-created"
  | "critical-alert-communicated"
  | "critical-alert-acknowledged"
  | "result-corrected"
  | "report-amended"
  | "entered-in-error";

export interface LaboratoryOrder {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  orderingBranchId: WonFlowId;
  performingBranchId: WonFlowId;

  orderingDepartmentId: WonFlowId;
  performingLaboratoryDepartmentId?: WonFlowId;

  encounterId: WonFlowId;
  consultationId?: WonFlowId;
  patientJourneyId?: WonFlowId;
  careEpisodeId?: WonFlowId;
  treatmentPlanId?: WonFlowId;

  /**
   * Human-readable laboratory order number.
   *
   * Example:
   * LAB-ORD-2026-000481
   */
  orderNumber: string;

  type: LaboratoryOrderType;
  source: LaboratoryOrderSource;
  priority: LaboratoryPriority;
  status: LaboratoryOrderStatus;

  orderingPractitionerId: WonFlowId;
  orderingUserId: WonFlowId;

  clinicalIndication?: string;
  provisionalDiagnosis?: string;
  relevantClinicalInformation?: string;
  specialInstructions?: string;

  fastingRequired: boolean;
  fastingDurationHours?: number;

  specimenCollectionRequired: boolean;
  homeCollectionRequested: boolean;

  requestedCollectionAt?: IsoDateTime;
  requestedCompletionAt?: IsoDateTime;

  paymentRequired: boolean;
  paymentCleared: boolean;

  insuranceAuthorizationRequired: boolean;
  insuranceAuthorizationId?: WonFlowId;

  signedByPractitionerId?: WonFlowId;
  signedAt?: IsoDateTime;

  cancelledByUserId?: WonFlowId;
  cancelledAt?: IsoDateTime;
  cancellationReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface LaboratoryOrderItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;
  laboratoryOrderId: WonFlowId;

  sequenceNumber: number;

  testCode: string;
  testDisplayName: string;
  testType: LaboratoryTestType;

  status: LaboratoryOrderItemStatus;
  priority: LaboratoryPriority;

  specimenRequirementId?: WonFlowId;
  specimenId?: WonFlowId;
  accessionId?: WonFlowId;

  serviceCode?: string;

  orderedQuantity: number;

  clinicalQuestion?: string;
  testInstructions?: string;

  performedByExternalLaboratory: boolean;
  externalLaboratoryId?: WonFlowId;

  scheduledAt?: IsoDateTime;
  startedAt?: IsoDateTime;
  resultedAt?: IsoDateTime;
  verifiedAt?: IsoDateTime;
  releasedAt?: IsoDateTime;

  cancellationReason?: string;
  rejectionReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface LaboratorySpecimenRequirement {
  id: WonFlowId;

  organizationId: WonFlowId;

  testCode: string;

  specimenType: SpecimenType;
  collectionMethod?: SpecimenCollectionMethod;

  containerCode?: string;
  containerDisplayName?: string;
  additiveCode?: string;

  minimumVolume?: number;
  preferredVolume?: number;
  volumeUnit?: string;

  fastingRequired: boolean;
  fastingDurationHours?: number;

  specialPreparationInstructions?: string;

  transportTemperature?:
    | "ambient"
    | "refrigerated"
    | "frozen"
    | "controlled";

  maximumTransportMinutes?: number;

  lightProtectionRequired: boolean;
  immediateProcessingRequired: boolean;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface LaboratorySpecimen {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  laboratoryOrderId: WonFlowId;
  accessionId?: WonFlowId;

  collectionBranchId: WonFlowId;
  receivingBranchId: WonFlowId;

  collectionDepartmentId?: WonFlowId;
  collectionServicePointId?: WonFlowId;
  collectionRoomId?: WonFlowId;

  /**
   * Human-readable specimen identifier.
   *
   * Example:
   * SPC-2026-001928
   */
  specimenNumber: string;

  barcodeValue?: string;

  specimenType: SpecimenType;
  collectionMethod?: SpecimenCollectionMethod;

  status: SpecimenStatus;

  containerCode?: string;
  containerDisplayName?: string;

  collectedVolume?: number;
  volumeUnit?: string;

  bodySite?: string;
  laterality?:
    | "left"
    | "right"
    | "bilateral"
    | "midline"
    | "not-applicable";

  collectedByUserId?: WonFlowId;
  collectedByPractitionerId?: WonFlowId;
  collectedAt?: IsoDateTime;

  collectionVerifiedByUserId?: WonFlowId;
  collectionVerifiedAt?: IsoDateTime;

  dispatchedByUserId?: WonFlowId;
  dispatchedAt?: IsoDateTime;

  receivedByUserId?: WonFlowId;
  receivedAt?: IsoDateTime;

  acceptedByUserId?: WonFlowId;
  acceptedAt?: IsoDateTime;

  rejectionReason?: SpecimenRejectionReason;
  rejectionNotes?: string;
  rejectedByUserId?: WonFlowId;
  rejectedAt?: IsoDateTime;

  storageLocationId?: WonFlowId;
  storageTemperature?: string;

  disposedByUserId?: WonFlowId;
  disposedAt?: IsoDateTime;
  disposalReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface LaboratorySpecimenLabel {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;
  specimenId: WonFlowId;

  labelNumber: string;
  barcodeValue: string;

  patientSafeDisplayName: string;
  patientMrnDisplay: string;

  specimenTypeDisplay: string;
  containerDisplay?: string;

  collectionInstructions?: string;

  generatedByUserId?: WonFlowId;
  generatedBySystem: boolean;
  generatedAt: IsoDateTime;

  printedAt?: IsoDateTime;
  printedByUserId?: WonFlowId;

  voidedAt?: IsoDateTime;
  voidedByUserId?: WonFlowId;
  voidReason?: string;
}

export interface LaboratorySpecimenTransport {
  id: WonFlowId;

  organizationId: WonFlowId;
  specimenId: WonFlowId;

  fromBranchId: WonFlowId;
  toBranchId: WonFlowId;

  courierUserId?: WonFlowId;
  transportProvider?: string;

  dispatchedAt: IsoDateTime;
  expectedArrivalAt?: IsoDateTime;
  receivedAt?: IsoDateTime;

  requiredTemperature?: string;
  minimumRecordedTemperature?: number;
  maximumRecordedTemperature?: number;
  temperatureUnit?: string;

  packagingConfirmed: boolean;
  chainOfCustodyConfirmed: boolean;

  transportCondition:
    | "acceptable"
    | "delayed"
    | "temperature-excursion"
    | "damaged"
    | "lost"
    | "other";

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface LaboratoryAccession {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  laboratoryOrderId: WonFlowId;

  performingBranchId: WonFlowId;
  laboratoryDepartmentId: WonFlowId;
  laboratoryServicePointId?: WonFlowId;

  /**
   * Laboratory tracking number for accepted work.
   *
   * Example:
   * ACC-2026-000924
   */
  accessionNumber: string;

  status: LaboratoryAccessionStatus;
  priority: LaboratoryPriority;

  specimenIds: WonFlowId[];
  orderItemIds: WonFlowId[];

  receivedByUserId: WonFlowId;
  receivedAt: IsoDateTime;

  acceptedByUserId?: WonFlowId;
  acceptedAt?: IsoDateTime;

  assignedTechnicianUserId?: WonFlowId;
  assignedPathologistId?: WonFlowId;

  expectedCompletionAt?: IsoDateTime;
  completedAt?: IsoDateTime;

  rejectionReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface LaboratoryResult {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  laboratoryOrderId: WonFlowId;
  laboratoryOrderItemId: WonFlowId;
  accessionId: WonFlowId;
  specimenId?: WonFlowId;

  testCode: string;
  testDisplayName: string;

  analyteCode?: string;
  analyteDisplayName?: string;

  valueType: LaboratoryResultValueType;

  numericValue?: number;
  textValue?: string;
  codedValue?: string;
  booleanValue?: boolean;
  dateTimeValue?: IsoDateTime;

  numeratorValue?: number;
  denominatorValue?: number;

  rangeLowValue?: number;
  rangeHighValue?: number;

  attachmentDocumentId?: WonFlowId;

  unitCode?: string;
  unitDisplay?: string;

  referenceRangeText?: string;
  referenceLow?: number;
  referenceHigh?: number;

  flag: LaboratoryResultFlag;
  status: LaboratoryResultStatus;

  methodCode?: string;
  methodDisplay?: string;
  instrumentId?: WonFlowId;

  comments?: string;

  enteredByUserId?: WonFlowId;
  enteredBySystem: boolean;
  enteredAt: IsoDateTime;

  verifiedAt?: IsoDateTime;
  releasedAt?: IsoDateTime;

  correctedFromResultId?: WonFlowId;
  correctionReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface LaboratoryResultVerification {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  laboratoryOrderId: WonFlowId;
  accessionId: WonFlowId;

  laboratoryResultIds: WonFlowId[];

  level: LaboratoryVerificationLevel;

  verifiedByUserId: WonFlowId;
  verifiedByPractitionerId?: WonFlowId;

  verificationDecision:
    | "approved"
    | "returned-for-correction"
    | "rejected";

  comments?: string;

  verifiedAt: IsoDateTime;
}

export interface LaboratoryReport {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  laboratoryOrderId: WonFlowId;
  accessionId: WonFlowId;

  encounterId?: WonFlowId;

  /**
   * Human-readable report number.
   *
   * Example:
   * LAB-RPT-2026-000736
   */
  reportNumber: string;

  status: LaboratoryReportStatus;

  title: string;
  summary?: string;
  interpretation?: string;
  recommendation?: string;

  resultIds: WonFlowId[];

  preliminary: boolean;
  containsCriticalResults: boolean;
  containsAbnormalResults: boolean;

  createdByUserId: WonFlowId;
  createdAt: IsoDateTime;

  verifiedByUserId?: WonFlowId;
  verifiedByPractitionerId?: WonFlowId;
  verifiedAt?: IsoDateTime;

  releasedByUserId?: WonFlowId;
  releasedAt?: IsoDateTime;

  releasedToOrderingPractitioner: boolean;
  releasedToPatientAccess: boolean;

  patientAccessReleasedAt?: IsoDateTime;

  supersededByReportId?: WonFlowId;

  updatedAt: IsoDateTime;
}

export interface CriticalLaboratoryResultAlert {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  laboratoryOrderId: WonFlowId;
  laboratoryOrderItemId: WonFlowId;
  laboratoryResultId: WonFlowId;
  laboratoryReportId?: WonFlowId;

  encounterId?: WonFlowId;

  status: CriticalResultAlertStatus;

  resultSummary: string;
  criticalReason: string;

  detectedAt: IsoDateTime;
  detectedByUserId?: WonFlowId;
  detectedBySystem: boolean;

  targetPractitionerId?: WonFlowId;
  targetDepartmentId?: WonFlowId;

  communicationDeadlineAt: IsoDateTime;
  acknowledgementDeadlineAt?: IsoDateTime;

  communicatedAt?: IsoDateTime;
  acknowledgedAt?: IsoDateTime;
  closedAt?: IsoDateTime;

  escalationRequired: boolean;
  escalatedAt?: IsoDateTime;
  escalationReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CriticalLaboratoryResultCommunication {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  criticalAlertId: WonFlowId;

  attemptNumber: number;
  method: CriticalResultCommunicationMethod;

  contactedUserId?: WonFlowId;
  contactedPractitionerId?: WonFlowId;
  contactedDepartmentId?: WonFlowId;

  contactDestination?: string;

  outcome:
    | "reached"
    | "not-reached"
    | "message-left"
    | "failed"
    | "escalated";

  messageSummary?: string;

  communicatedByUserId?: WonFlowId;
  communicatedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface CriticalLaboratoryResultAcknowledgement {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  criticalAlertId: WonFlowId;

  acknowledgedByUserId: WonFlowId;
  acknowledgedByPractitionerId?: WonFlowId;

  acknowledgementStatement: string;
  plannedClinicalAction?: string;

  acknowledgedAt: IsoDateTime;
}

export interface LaboratoryReportAmendment {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  laboratoryReportId: WonFlowId;

  type:
    | "correction"
    | "addendum"
    | "interpretation-update"
    | "patient-identification-correction"
    | "other";

  reason: string;
  amendmentText: string;

  amendedByUserId: WonFlowId;
  amendedByPractitionerId?: WonFlowId;

  verifiedByUserId?: WonFlowId;
  verifiedAt?: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface LaboratoryWorkflowEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  laboratoryOrderId: WonFlowId;

  laboratoryOrderItemId?: WonFlowId;
  specimenId?: WonFlowId;
  accessionId?: WonFlowId;
  laboratoryResultId?: WonFlowId;
  laboratoryReportId?: WonFlowId;
  criticalAlertId?: WonFlowId;

  type: LaboratoryEventType;

  previousStatus?: string;
  newStatus?: string;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface LaboratoryOrderAggregate {
  order: LaboratoryOrder;
  orderItems: LaboratoryOrderItem[];

  specimenRequirements: LaboratorySpecimenRequirement[];
  specimens: LaboratorySpecimen[];
  specimenLabels: LaboratorySpecimenLabel[];
  specimenTransports: LaboratorySpecimenTransport[];

  accessions: LaboratoryAccession[];

  results: LaboratoryResult[];
  resultVerifications: LaboratoryResultVerification[];
  reports: LaboratoryReport[];
  reportAmendments: LaboratoryReportAmendment[];

  criticalAlerts: CriticalLaboratoryResultAlert[];
  criticalCommunications: CriticalLaboratoryResultCommunication[];
  criticalAcknowledgements: CriticalLaboratoryResultAcknowledgement[];

  events: LaboratoryWorkflowEvent[];
}

export const WONFLOW_LABORATORY_ORDER_STATUS_TRANSITIONS: Record<
  LaboratoryOrderStatus,
  readonly LaboratoryOrderStatus[]
> = {
  draft: [
    "awaiting-signature",
    "ordered",
    "cancelled",
    "entered-in-error",
  ],

  "awaiting-signature": [
    "draft",
    "ordered",
    "cancelled",
    "entered-in-error",
  ],

  ordered: [
    "awaiting-payment",
    "awaiting-authorization",
    "ready-for-collection",
    "cancelled",
    "rejected",
  ],

  "awaiting-payment": [
    "ready-for-collection",
    "cancelled",
    "rejected",
  ],

  "awaiting-authorization": [
    "ready-for-collection",
    "cancelled",
    "rejected",
  ],

  "ready-for-collection": [
    "partially-collected",
    "collected",
    "cancelled",
    "rejected",
  ],

  "partially-collected": [
    "collected",
    "received",
    "cancelled",
    "rejected",
  ],

  collected: [
    "received",
    "cancelled",
    "rejected",
  ],

  received: [
    "in-progress",
    "rejected",
  ],

  "in-progress": [
    "partially-resulted",
    "resulted",
    "cancelled",
    "rejected",
  ],

  "partially-resulted": [
    "resulted",
    "verified",
    "cancelled",
  ],

  resulted: [
    "verified",
    "cancelled",
  ],

  verified: [
    "released",
    "completed",
  ],

  released: [
    "completed",
  ],

  completed: [],
  cancelled: [],
  rejected: [],
  "entered-in-error": [],
};

export const WONFLOW_SPECIMEN_STATUS_TRANSITIONS: Record<
  SpecimenStatus,
  readonly SpecimenStatus[]
> = {
  planned: [
    "label-generated",
    "collection-in-progress",
    "rejected",
    "entered-in-error",
  ],

  "label-generated": [
    "collection-in-progress",
    "collected",
    "rejected",
    "entered-in-error",
  ],

  "collection-in-progress": [
    "collected",
    "rejected",
    "entered-in-error",
  ],

  collected: [
    "in-transit",
    "received",
    "rejected",
    "lost",
  ],

  "in-transit": [
    "received",
    "rejected",
    "lost",
  ],

  received: [
    "accepted",
    "rejected",
  ],

  accepted: [
    "processing",
    "stored",
    "rejected",
  ],

  processing: [
    "stored",
    "consumed",
    "rejected",
  ],

  stored: [
    "processing",
    "consumed",
    "disposed",
  ],

  consumed: [
    "disposed",
  ],

  disposed: [],
  rejected: [],
  lost: [],
  "entered-in-error": [],
};

export const WONFLOW_CRITICAL_RESULT_ALERT_TRANSITIONS: Record<
  CriticalResultAlertStatus,
  readonly CriticalResultAlertStatus[]
> = {
  created: [
    "notification-in-progress",
    "communicated",
    "escalated",
    "cancelled",
    "entered-in-error",
  ],

  "notification-in-progress": [
    "communicated",
    "escalated",
    "cancelled",
  ],

  communicated: [
    "acknowledged",
    "escalated",
  ],

  acknowledged: [
    "closed",
    "escalated",
  ],

  escalated: [
    "communicated",
    "acknowledged",
    "closed",
  ],

  closed: [],
  cancelled: [],
  "entered-in-error": [],
};

export interface StructuredLabTestDefinition {
  code: string;
  name: string;
  category: "Liver Function" | "Inflammatory Markers" | "Pancreatic & Enzymes" | "Renal Function" | "Complete Blood Count" | "Electrolytes";
  unit: string;
  defaultRefLow: number;
  defaultRefHigh: number;
  criticalLow?: number;
  criticalHigh?: number;
  decimals?: number;
}

export const STANDARD_LAB_TESTS: Record<string, StructuredLabTestDefinition> = {
  BILIRUBIN_TOTAL: {
    code: "BILIRUBIN_TOTAL",
    name: "Total Bilirubin",
    category: "Liver Function",
    unit: "mg/dL",
    defaultRefLow: 0.2,
    defaultRefHigh: 1.2,
    criticalHigh: 15.0,
    decimals: 2,
  },
  BILIRUBIN_DIRECT: {
    code: "BILIRUBIN_DIRECT",
    name: "Direct (Conjugated) Bilirubin",
    category: "Liver Function",
    unit: "mg/dL",
    defaultRefLow: 0.0,
    defaultRefHigh: 0.3,
    criticalHigh: 5.0,
    decimals: 2,
  },
  ALT: {
    code: "ALT",
    name: "Alanine Aminotransferase (ALT / SGPT)",
    category: "Liver Function",
    unit: "U/L",
    defaultRefLow: 7,
    defaultRefHigh: 56,
    criticalHigh: 500,
    decimals: 0,
  },
  AST: {
    code: "AST",
    name: "Aspartate Aminotransferase (AST / SGOT)",
    category: "Liver Function",
    unit: "U/L",
    defaultRefLow: 10,
    defaultRefHigh: 40,
    criticalHigh: 500,
    decimals: 0,
  },
  ALP: {
    code: "ALP",
    name: "Alkaline Phosphatase (ALP)",
    category: "Liver Function",
    unit: "U/L",
    defaultRefLow: 44,
    defaultRefHigh: 147,
    criticalHigh: 600,
    decimals: 0,
  },
  CRP: {
    code: "CRP",
    name: "C-Reactive Protein (CRP)",
    category: "Inflammatory Markers",
    unit: "mg/L",
    defaultRefLow: 0.0,
    defaultRefHigh: 5.0,
    criticalHigh: 100.0,
    decimals: 1,
  },
  WBC: {
    code: "WBC",
    name: "White Blood Cell Count (WBC)",
    category: "Inflammatory Markers",
    unit: "x10^9/L",
    defaultRefLow: 4.0,
    defaultRefHigh: 11.0,
    criticalLow: 2.0,
    criticalHigh: 25.0,
    decimals: 1,
  },
  AMYLASE_DRAIN: {
    code: "AMYLASE_DRAIN",
    name: "Drain Fluid Amylase",
    category: "Pancreatic & Enzymes",
    unit: "U/L",
    defaultRefLow: 0,
    defaultRefHigh: 100,
    criticalHigh: 300,
    decimals: 0,
  },
  CREATININE: {
    code: "CREATININE",
    name: "Serum Creatinine",
    category: "Renal Function",
    unit: "mg/dL",
    defaultRefLow: 0.6,
    defaultRefHigh: 1.2,
    criticalHigh: 4.0,
    decimals: 2,
  },
  HEMOGLOBIN: {
    code: "HEMOGLOBIN",
    name: "Hemoglobin (Hb)",
    category: "Complete Blood Count",
    unit: "g/dL",
    defaultRefLow: 12.0,
    defaultRefHigh: 16.5,
    criticalLow: 7.0,
    decimals: 1,
  },
  ALBUMIN: {
    code: "ALBUMIN",
    name: "Serum Albumin",
    category: "Liver Function",
    unit: "g/dL",
    defaultRefLow: 3.5,
    defaultRefHigh: 5.0,
    criticalLow: 2.0,
    decimals: 1,
  },
};

export type LabResultEntryRoute = "STAFF_ENTERED" | "PATIENT_REPORTED" | "DOCUMENT_ATTACHED";
export type LabAbnormalFlag = "NORMAL" | "HIGH" | "LOW" | "CRITICAL_HIGH" | "CRITICAL_LOW";

export interface StructuredLabResultItem {
  id: string;
  orderId?: string | null;
  patientId: string;
  code: string;
  displayName: string;
  category: string;
  value: number;
  unit: string;
  referenceLow: number;
  referenceHigh: number;
  abnormalFlag: LabAbnormalFlag;
  collectedAt: string;
  sourceFacility?: string | null;
  entryRoute: LabResultEntryRoute;
  isConfirmedByClinician: boolean;
  confirmedByMembershipId?: string | null;
  confirmedAt?: string | null;
  documentId?: string | null;
  documentUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface RecordLabResultInput {
  patientId: string;
  code: string;
  displayName?: string;
  category?: string;
  value: number;
  unit?: string;
  referenceLow?: number;
  referenceHigh?: number;
  collectedAt?: string;
  sourceFacility?: string;
  entryRoute?: LabResultEntryRoute;
  documentId?: string;
  notes?: string;
}

export interface LabTrendPoint {
  date: string;
  value: number;
  referenceLow: number;
  referenceHigh: number;
  abnormalFlag: LabAbnormalFlag;
  isConfirmed: boolean;
  sourceFacility?: string | null;
}

export interface LabTrendSeries {
  code: string;
  displayName: string;
  unit: string;
  category: string;
  referenceLow: number;
  referenceHigh: number;
  points: LabTrendPoint[];
}

export interface MultiLabTrendGroup {
  groupName: "Liver Function" | "Inflammatory Markers" | "Pancreatic & Drain Amylase" | "Complete Blood Count" | "Renal Function";
  series: LabTrendSeries[];
}
