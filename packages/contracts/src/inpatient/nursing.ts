import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";
import type {
  MedicationRoute,
} from "../clinical/medication";

export type NursingAssessmentType =
  | "admission"
  | "initial"
  | "shift"
  | "focused"
  | "post-operative"
  | "post-procedure"
  | "deterioration"
  | "transfer"
  | "discharge"
  | "critical-care"
  | "maternity"
  | "paediatric"
  | "mental-health"
  | "other";

export type NursingAssessmentStatus =
  | "draft"
  | "in-progress"
  | "completed"
  | "reviewed"
  | "amended"
  | "cancelled"
  | "entered-in-error";

export type NursingAssessmentDomain =
  | "general-condition"
  | "airway"
  | "breathing"
  | "circulation"
  | "neurological"
  | "pain"
  | "mobility"
  | "fall-risk"
  | "skin-integrity"
  | "nutrition"
  | "hydration"
  | "elimination"
  | "sleep"
  | "communication"
  | "cognition"
  | "mental-health"
  | "infection-risk"
  | "pressure-injury-risk"
  | "venous-thromboembolism-risk"
  | "medication-safety"
  | "self-care"
  | "social-support"
  | "spiritual-care"
  | "other";

export type NursingFindingSeverity =
  | "normal"
  | "mild"
  | "moderate"
  | "severe"
  | "critical"
  | "not-assessed";

export type NursingObservationCategory =
  | "vital-sign"
  | "neurological"
  | "pain"
  | "fluid-balance"
  | "blood-glucose"
  | "respiratory"
  | "wound"
  | "drain"
  | "urinary"
  | "bowel"
  | "nutrition"
  | "mobility"
  | "skin"
  | "mental-status"
  | "device"
  | "early-warning-score"
  | "other";

export type NursingObservationValueType =
  | "number"
  | "text"
  | "boolean"
  | "coded-value"
  | "date-time"
  | "ratio"
  | "range";

export type NursingObservationStatus =
  | "preliminary"
  | "final"
  | "corrected"
  | "cancelled"
  | "entered-in-error";

export type NursingObservationFlag =
  | "normal"
  | "low"
  | "high"
  | "abnormal"
  | "critical-low"
  | "critical-high"
  | "positive"
  | "negative"
  | "not-applicable";

export type NursingRiskType =
  | "fall"
  | "pressure-injury"
  | "malnutrition"
  | "aspiration"
  | "self-harm"
  | "violence"
  | "infection"
  | "venous-thromboembolism"
  | "deterioration"
  | "medication-error"
  | "wandering"
  | "seizure"
  | "bleeding"
  | "other";

export type NursingRiskLevel =
  | "none"
  | "low"
  | "moderate"
  | "high"
  | "critical";

export type NursingCarePlanStatus =
  | "draft"
  | "active"
  | "under-review"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "superseded"
  | "entered-in-error";

export type NursingCareGoalStatus =
  | "planned"
  | "in-progress"
  | "achieved"
  | "partially-achieved"
  | "not-achieved"
  | "no-longer-applicable"
  | "cancelled";

export type NursingInterventionStatus =
  | "planned"
  | "scheduled"
  | "in-progress"
  | "completed"
  | "partially-completed"
  | "not-performed"
  | "declined"
  | "cancelled"
  | "entered-in-error";

export type NursingInterventionType =
  | "monitoring"
  | "assessment"
  | "positioning"
  | "mobility-assistance"
  | "fall-prevention"
  | "pressure-care"
  | "wound-care"
  | "infection-control"
  | "nutrition-support"
  | "hydration-support"
  | "elimination-care"
  | "oxygen-support"
  | "airway-care"
  | "patient-education"
  | "emotional-support"
  | "medication-support"
  | "device-care"
  | "safety-observation"
  | "other";

export type NursingTaskStatus =
  | "open"
  | "assigned"
  | "in-progress"
  | "completed"
  | "partially-completed"
  | "overdue"
  | "not-performed"
  | "declined"
  | "cancelled"
  | "entered-in-error";

export type NursingTaskPriority =
  | "routine"
  | "priority"
  | "urgent"
  | "critical";

export type NursingShiftType =
  | "morning"
  | "evening"
  | "night"
  | "extended"
  | "on-call"
  | "custom";

export type NursingShiftAssignmentStatus =
  | "scheduled"
  | "checked-in"
  | "active"
  | "on-break"
  | "handover-in-progress"
  | "completed"
  | "absent"
  | "cancelled";

export type NursingHandoverStatus =
  | "draft"
  | "in-progress"
  | "ready"
  | "handed-over"
  | "acknowledged"
  | "completed"
  | "cancelled"
  | "entered-in-error";

export type MedicationAdministrationScheduleStatus =
  | "planned"
  | "scheduled"
  | "due"
  | "overdue"
  | "in-progress"
  | "administered"
  | "partially-administered"
  | "held"
  | "omitted"
  | "refused"
  | "cancelled"
  | "not-required"
  | "entered-in-error";

export type MedicationAdministrationStatus =
  | "preparation"
  | "safety-check"
  | "ready"
  | "in-progress"
  | "administered"
  | "partially-administered"
  | "held"
  | "omitted"
  | "refused"
  | "cancelled"
  | "entered-in-error";

export type MedicationAdministrationReasonCode =
  | "administered-as-ordered"
  | "patient-refused"
  | "patient-unavailable"
  | "patient-nil-by-mouth"
  | "clinical-parameter-not-met"
  | "doctor-instruction"
  | "allergy-concern"
  | "interaction-concern"
  | "medicine-unavailable"
  | "dose-unavailable"
  | "route-unavailable"
  | "patient-vomiting"
  | "procedure-related-hold"
  | "test-related-hold"
  | "blood-pressure-low"
  | "heart-rate-low"
  | "blood-glucose-low"
  | "duplicate-dose-risk"
  | "administration-error"
  | "other";

export type MedicationAdministrationSafetyCheckType =
  | "right-patient"
  | "right-medicine"
  | "right-dose"
  | "right-route"
  | "right-time"
  | "right-indication"
  | "right-documentation"
  | "right-response"
  | "allergy-check"
  | "interaction-check"
  | "expiry-check"
  | "batch-check"
  | "clinical-parameter-check"
  | "independent-double-check"
  | "patient-education"
  | "other";

export type MedicationAdministrationSafetyCheckStatus =
  | "pending"
  | "passed"
  | "failed"
  | "overridden"
  | "not-applicable";

export type MedicationAdministrationSource =
  | "inpatient-order"
  | "emergency-order"
  | "clinic-order"
  | "patient-own-medicine"
  | "verbal-emergency-order"
  | "protocol"
  | "standing-order"
  | "other";

export type MedicationAdministrationMethod =
  | "scheduled"
  | "as-needed"
  | "once-only"
  | "stat"
  | "continuous-infusion"
  | "intermittent-infusion"
  | "patient-controlled"
  | "self-administered"
  | "other";

export type MedicationWitnessType =
  | "controlled-medication"
  | "high-alert-medication"
  | "paediatric-dose"
  | "insulin"
  | "anticoagulant"
  | "chemotherapy"
  | "medication-wastage"
  | "organization-policy"
  | "other";

export type MedicationInfusionStatus =
  | "planned"
  | "prepared"
  | "started"
  | "running"
  | "paused"
  | "rate-changed"
  | "completed"
  | "stopped"
  | "cancelled"
  | "adverse-event";

export type NursingEventType =
  | "assessment-created"
  | "assessment-completed"
  | "assessment-amended"
  | "observation-recorded"
  | "observation-corrected"
  | "risk-identified"
  | "risk-updated"
  | "care-plan-created"
  | "care-plan-activated"
  | "goal-updated"
  | "intervention-completed"
  | "task-assigned"
  | "task-completed"
  | "shift-started"
  | "handover-created"
  | "handover-acknowledged"
  | "medication-scheduled"
  | "medication-safety-check-completed"
  | "medication-administered"
  | "medication-partially-administered"
  | "medication-held"
  | "medication-omitted"
  | "medication-refused"
  | "infusion-started"
  | "infusion-rate-changed"
  | "infusion-completed"
  | "medication-wastage-recorded"
  | "entered-in-error";

export interface NursingAssessmentTemplate {
  id: WonFlowId;

  organizationId: WonFlowId;

  code: string;
  name: string;

  assessmentType: NursingAssessmentType;

  applicableWardTypes: string[];
  applicableCareLevels: string[];

  requiredDomains: NursingAssessmentDomain[];
  optionalDomains: NursingAssessmentDomain[];

  versionNumber: number;

  status: RecordStatus;

  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NursingAssessment {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  branchId: WonFlowId;
  wardId: WonFlowId;
  roomId?: WonFlowId;
  bedId?: WonFlowId;

  admissionId: WonFlowId;
  inpatientEncounterId: WonFlowId;
  bedAssignmentId?: WonFlowId;

  /**
   * Example:
   * NUR-ASM-2026-000481
   */
  assessmentNumber: string;

  type: NursingAssessmentType;
  status: NursingAssessmentStatus;

  templateId?: WonFlowId;
  templateVersion?: number;

  reasonForAssessment?: string;

  assessedByUserId: WonFlowId;
  reviewedByUserId?: WonFlowId;

  startedAt: IsoDateTime;
  completedAt?: IsoDateTime;
  reviewedAt?: IsoDateTime;

  summary?: string;
  immediateActionsRequired: boolean;
  immediateActionSummary?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NursingAssessmentFinding {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  nursingAssessmentId: WonFlowId;

  domain: NursingAssessmentDomain;
  sequenceNumber: number;

  title: string;
  description?: string;

  severity: NursingFindingSeverity;

  normal: boolean;
  abnormal: boolean;
  critical: boolean;

  structuredData?: Record<string, unknown>;

  actionRequired: boolean;
  actionSummary?: string;

  relatedNursingRiskId?: WonFlowId;
  relatedCarePlanId?: WonFlowId;
  relatedNursingTaskId?: WonFlowId;

  recordedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NursingObservation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  inpatientEncounterId: WonFlowId;

  wardId: WonFlowId;
  roomId?: WonFlowId;
  bedId?: WonFlowId;

  nursingAssessmentId?: WonFlowId;

  category: NursingObservationCategory;

  /**
   * Examples:
   * heart-rate
   * systolic-blood-pressure
   * oxygen-saturation
   * respiratory-rate
   * pain-score
   * urine-output
   */
  code: string;
  displayName: string;

  valueType: NursingObservationValueType;

  numericValue?: number;
  textValue?: string;
  booleanValue?: boolean;
  codedValue?: string;
  dateTimeValue?: IsoDateTime;

  numeratorValue?: number;
  denominatorValue?: number;

  rangeLow?: number;
  rangeHigh?: number;

  unitCode?: string;
  unitDisplay?: string;

  referenceLow?: number;
  referenceHigh?: number;
  referenceRangeText?: string;

  status: NursingObservationStatus;
  flag: NursingObservationFlag;

  abnormal: boolean;
  critical: boolean;

  method?: string;
  bodySite?: string;
  position?: string;

  observedByUserId: WonFlowId;
  observedAt: IsoDateTime;

  correctedFromObservationId?: WonFlowId;
  correctionReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NursingEarlyWarningScore {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  inpatientEncounterId: WonFlowId;

  scoreSystemCode: string;
  scoreSystemName: string;
  scoreSystemVersion?: string;

  observationIds: WonFlowId[];

  totalScore: number;

  riskLevel:
    | "low"
    | "low-medium"
    | "medium"
    | "high"
    | "critical";

  recommendedAction: string;

  escalationRequired: boolean;
  escalationTaskId?: WonFlowId;

  calculatedByUserId?: WonFlowId;
  calculatedBySystem: boolean;

  calculatedAt: IsoDateTime;

  acknowledgedByUserId?: WonFlowId;
  acknowledgedAt?: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface NursingRiskAssessment {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  inpatientEncounterId: WonFlowId;

  nursingAssessmentId?: WonFlowId;

  type: NursingRiskType;
  level: NursingRiskLevel;

  scoringToolCode?: string;
  scoringToolName?: string;
  score?: number;

  riskFactors: string[];
  protectiveFactors: string[];

  preventionRequired: boolean;
  preventionSummary?: string;

  carePlanId?: WonFlowId;

  assessedByUserId: WonFlowId;
  assessedAt: IsoDateTime;

  nextReviewAt?: IsoDateTime;

  resolved: boolean;
  resolvedAt?: IsoDateTime;
  resolutionNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NursingCarePlan {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  inpatientEncounterId: WonFlowId;

  wardId: WonFlowId;

  /**
   * Example:
   * NUR-PLAN-2026-000481
   */
  carePlanNumber: string;

  title: string;
  status: NursingCarePlanStatus;

  problemSummary: string;
  overallGoal?: string;

  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;

  nextReviewAt?: IsoDateTime;

  createdByUserId: WonFlowId;
  reviewedByUserId?: WonFlowId;

  activatedAt?: IsoDateTime;
  completedAt?: IsoDateTime;

  supersededByCarePlanId?: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NursingCareGoal {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  carePlanId: WonFlowId;

  sequenceNumber: number;

  title: string;
  description?: string;

  status: NursingCareGoalStatus;

  targetOutcome: string;
  targetValue?: number;
  targetUnit?: string;

  targetDate?: IsoDateTime;

  progressNotes?: string;

  evaluatedByUserId?: WonFlowId;
  evaluatedAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NursingCareIntervention {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  carePlanId: WonFlowId;
  careGoalId?: WonFlowId;

  sequenceNumber: number;

  type: NursingInterventionType;
  status: NursingInterventionStatus;

  title: string;
  description?: string;

  frequencyText?: string;
  intervalMinutes?: number;

  startsAt?: IsoDateTime;
  endsAt?: IsoDateTime;

  assignedWardId?: WonFlowId;
  assignedUserId?: WonFlowId;

  latestCompletionAt?: IsoDateTime;
  nextDueAt?: IsoDateTime;

  relatedNursingTaskIds: WonFlowId[];

  createdByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NursingCareTask {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  inpatientEncounterId: WonFlowId;

  wardId: WonFlowId;
  roomId?: WonFlowId;
  bedId?: WonFlowId;

  carePlanId?: WonFlowId;
  careGoalId?: WonFlowId;
  careInterventionId?: WonFlowId;

  type:
    | "observation"
    | "assessment"
    | "repositioning"
    | "hygiene"
    | "mobility"
    | "feeding"
    | "fluid-balance"
    | "wound-care"
    | "device-care"
    | "specimen-collection"
    | "patient-education"
    | "safety-check"
    | "medication-support"
    | "clinical-escalation"
    | "other";

  status: NursingTaskStatus;
  priority: NursingTaskPriority;

  title: string;
  description?: string;

  assignedUserId?: WonFlowId;
  assignedRoleCode?: string;

  scheduledAt?: IsoDateTime;
  dueAt?: IsoDateTime;

  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;

  completedByUserId?: WonFlowId;

  completionNotes?: string;
  notPerformedReason?: string;
  declineReason?: string;
  cancellationReason?: string;

  escalationRequired: boolean;
  escalatedAt?: IsoDateTime;
  escalationReason?: string;

  createdByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NursingShiftAssignment {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  wardId: WonFlowId;

  userId: WonFlowId;

  shiftType: NursingShiftType;
  status: NursingShiftAssignmentStatus;

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  assignedRoomIds: WonFlowId[];
  assignedBedIds: WonFlowId[];
  assignedPatientIds: WonFlowId[];

  teamLeadUserId?: WonFlowId;

  checkedInAt?: IsoDateTime;
  checkedOutAt?: IsoDateTime;

  handoverId?: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NursingShiftHandover {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  wardId: WonFlowId;

  status: NursingHandoverStatus;

  outgoingShiftAssignmentId: WonFlowId;
  incomingShiftAssignmentId?: WonFlowId;

  patientIds: WonFlowId[];

  wardSituationSummary: string;
  staffingSummary?: string;
  bedStatusSummary?: string;

  criticalPatientIds: WonFlowId[];
  deterioratingPatientIds: WonFlowId[];
  isolationPatientIds: WonFlowId[];

  overdueTaskIds: WonFlowId[];
  pendingMedicationScheduleIds: WonFlowId[];
  pendingObservationTaskIds: WonFlowId[];

  equipmentIssues: string[];
  safetyConcerns: string[];

  handedOverByUserId: WonFlowId;
  handedOverAt?: IsoDateTime;

  acknowledgedByUserId?: WonFlowId;
  acknowledgedAt?: IsoDateTime;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NursingPatientHandoverItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  shiftHandoverId: WonFlowId;
  admissionId: WonFlowId;

  wardId: WonFlowId;
  roomId?: WonFlowId;
  bedId?: WonFlowId;

  situation: string;
  background?: string;
  currentAssessment: string;
  recommendations: string;

  activeRisks: string[];
  activeCarePlanIds: WonFlowId[];

  pendingNursingTaskIds: WonFlowId[];
  pendingMedicationScheduleIds: WonFlowId[];
  pendingLaboratoryOrderIds: WonFlowId[];
  pendingRadiologyOrderIds: WonFlowId[];

  escalationRequired: boolean;
  escalationSummary?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationAdministrationSchedule {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  inpatientEncounterId: WonFlowId;

  wardId: WonFlowId;
  roomId?: WonFlowId;
  bedId?: WonFlowId;

  medicationRequestId: WonFlowId;
  medicationOrderItemId: WonFlowId;
  dosageInstructionId?: WonFlowId;

  source: MedicationAdministrationSource;
  method: MedicationAdministrationMethod;

  status: MedicationAdministrationScheduleStatus;

  medicationCode: string;
  medicationDisplayName: string;

  plannedDoseValue?: number;
  plannedDoseUnit?: string;

  route: MedicationRoute;

  scheduledAt: IsoDateTime;

  allowedEarlyMinutes: number;
  allowedLateMinutes: number;

  dueAt: IsoDateTime;
  overdueAt?: IsoDateTime;

  asNeeded: boolean;
  asNeededReason?: string;

  clinicalHoldParameters?: string;

  independentCheckRequired: boolean;
  witnessType?: MedicationWitnessType;

  medicationAdministrationRecordId?: WonFlowId;

  generatedByUserId?: WonFlowId;
  generatedBySystem: boolean;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationAdministrationSafetyCheck {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  medicationScheduleId: WonFlowId;
  medicationAdministrationRecordId?: WonFlowId;

  type: MedicationAdministrationSafetyCheckType;
  status: MedicationAdministrationSafetyCheckStatus;

  title: string;

  expectedValue?: string;
  observedValue?: string;

  failureReason?: string;
  overrideReason?: string;

  checkedByUserId?: WonFlowId;
  checkedBySystem: boolean;
  checkedAt: IsoDateTime;

  overriddenByUserId?: WonFlowId;
  overriddenAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationAdministrationRecord {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  inpatientEncounterId: WonFlowId;

  wardId: WonFlowId;
  roomId?: WonFlowId;
  bedId?: WonFlowId;

  medicationScheduleId: WonFlowId;

  medicationRequestId: WonFlowId;
  medicationOrderItemId: WonFlowId;

  /**
   * Example:
   * MAR-2026-000481
   */
  administrationNumber: string;

  status: MedicationAdministrationStatus;
  reasonCode: MedicationAdministrationReasonCode;

  medicationCode: string;
  medicationDisplayName: string;

  orderedDoseValue?: number;
  orderedDoseUnit?: string;

  preparedDoseValue?: number;
  preparedDoseUnit?: string;

  administeredDoseValue?: number;
  administeredDoseUnit?: string;

  route: MedicationRoute;

  administrationSite?: string;

  scheduledAt: IsoDateTime;

  preparationStartedAt?: IsoDateTime;
  administrationStartedAt?: IsoDateTime;
  administeredAt?: IsoDateTime;

  preparedByUserId?: WonFlowId;
  administeredByUserId?: WonFlowId;

  witnessRequired: boolean;
  witnessRecordId?: WonFlowId;

  patientIdentityConfirmed: boolean;
  allergyStatusReviewed: boolean;
  medicationOrderReviewed: boolean;
  expiryChecked: boolean;

  batchNumber?: string;
  inventoryBatchId?: WonFlowId;

  patientEducationProvided: boolean;

  patientResponse?: string;
  monitoringRequired: boolean;
  monitoringInstructions?: string;

  partiallyAdministeredReason?: string;
  holdReason?: string;
  omissionReason?: string;
  refusalReason?: string;

  relatedInfusionId?: WonFlowId;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationAdministrationWitness {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  medicationAdministrationRecordId: WonFlowId;

  type: MedicationWitnessType;

  witnessedByUserId: WonFlowId;

  patientConfirmed: boolean;
  medicineConfirmed: boolean;
  doseConfirmed: boolean;
  routeConfirmed: boolean;
  batchConfirmed: boolean;
  expiryConfirmed: boolean;

  statement: string;

  witnessedAt: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface MedicationAdministrationException {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  medicationScheduleId: WonFlowId;
  medicationAdministrationRecordId?: WonFlowId;

  exceptionType:
    | "late"
    | "early"
    | "held"
    | "omitted"
    | "refused"
    | "partially-administered"
    | "medicine-unavailable"
    | "patient-unavailable"
    | "administration-error"
    | "other";

  reasonCode: MedicationAdministrationReasonCode;
  description: string;

  clinicalReviewRequired: boolean;
  prescriberNotificationRequired: boolean;

  prescriberNotifiedAt?: IsoDateTime;
  notifiedPractitionerId?: WonFlowId;

  correctiveAction?: string;

  recordedByUserId: WonFlowId;
  recordedAt: IsoDateTime;

  resolved: boolean;
  resolvedByUserId?: WonFlowId;
  resolvedAt?: IsoDateTime;
  resolutionNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationInfusion {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  inpatientEncounterId: WonFlowId;

  medicationScheduleId: WonFlowId;
  medicationAdministrationRecordId: WonFlowId;

  status: MedicationInfusionStatus;

  medicationCode: string;
  medicationDisplayName: string;

  diluentCode?: string;
  diluentDisplayName?: string;

  totalVolume?: number;
  volumeUnit?: string;

  concentrationValue?: number;
  concentrationUnit?: string;

  plannedRate?: number;
  currentRate?: number;
  rateUnit?: string;

  plannedDurationMinutes?: number;

  vascularAccessDeviceId?: WonFlowId;
  administrationSite?: string;

  startedByUserId?: WonFlowId;
  startedAt?: IsoDateTime;

  pausedByUserId?: WonFlowId;
  pausedAt?: IsoDateTime;
  pauseReason?: string;

  resumedByUserId?: WonFlowId;
  resumedAt?: IsoDateTime;

  completedByUserId?: WonFlowId;
  completedAt?: IsoDateTime;

  stoppedByUserId?: WonFlowId;
  stoppedAt?: IsoDateTime;
  stopReason?: string;

  adverseEventOccurred: boolean;
  adverseEventDescription?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MedicationInfusionRateChange {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  infusionId: WonFlowId;

  previousRate?: number;
  newRate: number;
  rateUnit: string;

  reason: string;

  changedByUserId: WonFlowId;
  authorizedByPractitionerId?: WonFlowId;

  changedAt: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface MedicationWastageRecord {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  medicationAdministrationRecordId: WonFlowId;

  medicationCode: string;
  medicationDisplayName: string;

  preparedQuantity: number;
  administeredQuantity: number;
  wastedQuantity: number;
  quantityUnit: string;

  reason:
    | "partial-dose"
    | "patient-refused-after-preparation"
    | "dose-changed"
    | "contamination"
    | "damage"
    | "expired-after-opening"
    | "administration-cancelled"
    | "other";

  controlledMedication: boolean;
  witnessRequired: boolean;

  recordedByUserId: WonFlowId;
  recordedAt: IsoDateTime;

  witnessedByUserId?: WonFlowId;
  witnessedAt?: IsoDateTime;

  disposalMethod?: string;
  notes?: string;

  createdAt: IsoDateTime;
}

export interface MedicationAdministrationResponseObservation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  medicationAdministrationRecordId: WonFlowId;

  observationId?: WonFlowId;

  responseType:
    | "therapeutic-response"
    | "pain-reassessment"
    | "blood-pressure"
    | "heart-rate"
    | "blood-glucose"
    | "sedation-score"
    | "adverse-reaction"
    | "other";

  responseSummary: string;

  effective:
    | "effective"
    | "partially-effective"
    | "not-effective"
    | "unable-to-assess";

  adverseReactionObserved: boolean;
  adverseReactionDescription?: string;

  escalationRequired: boolean;
  escalationTaskId?: WonFlowId;

  observedByUserId: WonFlowId;
  observedAt: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface NursingEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  inpatientEncounterId: WonFlowId;

  nursingAssessmentId?: WonFlowId;
  nursingObservationId?: WonFlowId;
  nursingRiskAssessmentId?: WonFlowId;
  carePlanId?: WonFlowId;
  nursingTaskId?: WonFlowId;
  shiftHandoverId?: WonFlowId;
  medicationScheduleId?: WonFlowId;
  medicationAdministrationRecordId?: WonFlowId;
  infusionId?: WonFlowId;

  type: NursingEventType;

  previousStatus?: string;
  newStatus?: string;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface InpatientNursingAggregate {
  assessmentTemplates: NursingAssessmentTemplate[];

  assessments: NursingAssessment[];
  assessmentFindings: NursingAssessmentFinding[];

  observations: NursingObservation[];
  earlyWarningScores: NursingEarlyWarningScore[];
  riskAssessments: NursingRiskAssessment[];

  carePlans: NursingCarePlan[];
  careGoals: NursingCareGoal[];
  careInterventions: NursingCareIntervention[];
  careTasks: NursingCareTask[];

  shiftAssignments: NursingShiftAssignment[];
  shiftHandovers: NursingShiftHandover[];
  patientHandoverItems: NursingPatientHandoverItem[];

  medicationSchedules: MedicationAdministrationSchedule[];
  medicationSafetyChecks: MedicationAdministrationSafetyCheck[];
  medicationAdministrationRecords: MedicationAdministrationRecord[];
  medicationWitnesses: MedicationAdministrationWitness[];
  medicationExceptions: MedicationAdministrationException[];

  infusions: MedicationInfusion[];
  infusionRateChanges: MedicationInfusionRateChange[];

  medicationWastageRecords: MedicationWastageRecord[];
  medicationResponseObservations: MedicationAdministrationResponseObservation[];

  events: NursingEvent[];
}

export const WONFLOW_NURSING_ASSESSMENT_STATUS_TRANSITIONS: Record<
  NursingAssessmentStatus,
  readonly NursingAssessmentStatus[]
> = {
  draft: [
    "in-progress",
    "completed",
    "cancelled",
    "entered-in-error",
  ],

  "in-progress": [
    "completed",
    "cancelled",
    "entered-in-error",
  ],

  completed: [
    "reviewed",
    "amended",
    "entered-in-error",
  ],

  reviewed: [
    "amended",
    "entered-in-error",
  ],

  amended: [
    "amended",
    "reviewed",
    "entered-in-error",
  ],

  cancelled: [],
  "entered-in-error": [],
};

export const WONFLOW_NURSING_CARE_PLAN_STATUS_TRANSITIONS: Record<
  NursingCarePlanStatus,
  readonly NursingCarePlanStatus[]
> = {
  draft: [
    "active",
    "cancelled",
    "entered-in-error",
  ],

  active: [
    "under-review",
    "on-hold",
    "completed",
    "cancelled",
    "superseded",
    "entered-in-error",
  ],

  "under-review": [
    "active",
    "on-hold",
    "completed",
    "cancelled",
    "superseded",
  ],

  "on-hold": [
    "active",
    "under-review",
    "completed",
    "cancelled",
    "superseded",
  ],

  completed: [],
  cancelled: [],
  superseded: [],
  "entered-in-error": [],
};

export const WONFLOW_NURSING_TASK_STATUS_TRANSITIONS: Record<
  NursingTaskStatus,
  readonly NursingTaskStatus[]
> = {
  open: [
    "assigned",
    "in-progress",
    "completed",
    "cancelled",
    "entered-in-error",
  ],

  assigned: [
    "in-progress",
    "completed",
    "overdue",
    "not-performed",
    "declined",
    "cancelled",
  ],

  "in-progress": [
    "completed",
    "partially-completed",
    "overdue",
    "not-performed",
    "declined",
    "cancelled",
  ],

  completed: [],

  "partially-completed": [
    "in-progress",
    "completed",
    "not-performed",
    "cancelled",
  ],

  overdue: [
    "in-progress",
    "completed",
    "not-performed",
    "cancelled",
  ],

  "not-performed": [],
  declined: [],
  cancelled: [],
  "entered-in-error": [],
};

export const WONFLOW_MEDICATION_SCHEDULE_STATUS_TRANSITIONS: Record<
  MedicationAdministrationScheduleStatus,
  readonly MedicationAdministrationScheduleStatus[]
> = {
  planned: [
    "scheduled",
    "cancelled",
    "not-required",
    "entered-in-error",
  ],

  scheduled: [
    "due",
    "in-progress",
    "administered",
    "held",
    "omitted",
    "refused",
    "cancelled",
  ],

  due: [
    "overdue",
    "in-progress",
    "administered",
    "partially-administered",
    "held",
    "omitted",
    "refused",
    "cancelled",
  ],

  overdue: [
    "in-progress",
    "administered",
    "partially-administered",
    "held",
    "omitted",
    "refused",
    "cancelled",
  ],

  "in-progress": [
    "administered",
    "partially-administered",
    "held",
    "omitted",
    "refused",
    "cancelled",
  ],

  administered: [],
  "partially-administered": [],
  held: [],
  omitted: [],
  refused: [],
  cancelled: [],
  "not-required": [],
  "entered-in-error": [],
};

export const WONFLOW_MEDICATION_ADMINISTRATION_STATUS_TRANSITIONS: Record<
  MedicationAdministrationStatus,
  readonly MedicationAdministrationStatus[]
> = {
  preparation: [
    "safety-check",
    "ready",
    "held",
    "omitted",
    "refused",
    "cancelled",
    "entered-in-error",
  ],

  "safety-check": [
    "ready",
    "held",
    "omitted",
    "refused",
    "cancelled",
    "entered-in-error",
  ],

  ready: [
    "in-progress",
    "administered",
    "held",
    "omitted",
    "refused",
    "cancelled",
  ],

  "in-progress": [
    "administered",
    "partially-administered",
    "held",
    "cancelled",
    "entered-in-error",
  ],

  administered: [],
  "partially-administered": [],
  held: [],
  omitted: [],
  refused: [],
  cancelled: [],
  "entered-in-error": [],
};

export const WONFLOW_MEDICATION_INFUSION_STATUS_TRANSITIONS: Record<
  MedicationInfusionStatus,
  readonly MedicationInfusionStatus[]
> = {
  planned: [
    "prepared",
    "started",
    "cancelled",
  ],

  prepared: [
    "started",
    "cancelled",
  ],

  started: [
    "running",
    "paused",
    "completed",
    "stopped",
    "adverse-event",
  ],

  running: [
    "paused",
    "rate-changed",
    "completed",
    "stopped",
    "adverse-event",
  ],

  paused: [
    "running",
    "rate-changed",
    "completed",
    "stopped",
    "adverse-event",
  ],

  "rate-changed": [
    "running",
    "paused",
    "completed",
    "stopped",
    "adverse-event",
  ],

  completed: [],
  stopped: [],
  cancelled: [],
  "adverse-event": [
    "paused",
    "stopped",
  ],
};