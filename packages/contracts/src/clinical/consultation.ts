import type {
  IsoDateTime,
  WonFlowId,
} from "../organization/hierarchy";
import type {
  DoctorConsultationMode,
} from "../scheduling/doctor-availability";

/**
 * A clinical consultation is the actual interaction between a clinician
 * and a patient during an encounter.
 */
export type ConsultationType =
  | "initial"
  | "follow-up"
  | "emergency"
  | "specialist-review"
  | "second-opinion"
  | "inpatient-round"
  | "post-procedure-review"
  | "telemedicine"
  | "home-care"
  | "multidisciplinary"
  | "other";

export type ConsultationStatus =
  | "planned"
  | "ready"
  | "in-progress"
  | "on-hold"
  | "awaiting-documentation"
  | "awaiting-signature"
  | "completed"
  | "cancelled"
  | "entered-in-error";

export type ConsultationParticipantRole =
  | "primary-clinician"
  | "consulting-clinician"
  | "resident"
  | "intern"
  | "nurse"
  | "translator"
  | "chaperone"
  | "care-coordinator"
  | "patient"
  | "guardian"
  | "caregiver"
  | "observer"
  | "other";

export type ClinicalNoteType =
  | "consultation-note"
  | "follow-up-note"
  | "progress-note"
  | "emergency-note"
  | "telemedicine-note"
  | "inpatient-round-note"
  | "procedure-note"
  | "care-coordination-note"
  | "second-opinion-note"
  | "other";

export type ClinicalNoteStatus =
  | "draft"
  | "in-progress"
  | "awaiting-signature"
  | "awaiting-cosignature"
  | "signed"
  | "amended"
  | "corrected"
  | "entered-in-error";

export type ClinicalNoteVisibility =
  | "standard"
  | "restricted"
  | "highly-restricted";

export type ClinicalNoteSectionCode =
  | "chief-complaint"
  | "history-of-present-illness"
  | "past-medical-history"
  | "past-surgical-history"
  | "medication-history"
  | "allergy-history"
  | "family-history"
  | "social-history"
  | "review-of-systems"
  | "vital-signs"
  | "physical-examination"
  | "mental-status-examination"
  | "investigation-review"
  | "clinical-assessment"
  | "differential-diagnosis"
  | "treatment-plan"
  | "patient-instructions"
  | "follow-up-plan"
  | "referral-plan"
  | "admission-plan"
  | "safety-netting"
  | "other";

export type ClinicalObservationCategory =
  | "vital-sign"
  | "measurement"
  | "symptom-score"
  | "clinical-scale"
  | "physical-finding"
  | "mental-status"
  | "point-of-care-result"
  | "other";

export type ClinicalObservationValueType =
  | "number"
  | "text"
  | "boolean"
  | "coded-value"
  | "date-time"
  | "range"
  | "ratio";

export type ClinicalObservationStatus =
  | "preliminary"
  | "final"
  | "corrected"
  | "cancelled"
  | "entered-in-error";

export type ObservationSource = "STAFF" | "PATIENT" | "CAREGIVER" | "DEVICE";


export type ClinicalAssessmentItemType =
  | "symptom"
  | "clinical-finding"
  | "problem"
  | "working-diagnosis"
  | "differential-diagnosis"
  | "confirmed-diagnosis"
  | "risk"
  | "other";

export type ClinicalAssessmentItemStatus =
  | "suspected"
  | "provisional"
  | "confirmed"
  | "ruled-out"
  | "resolved"
  | "inactive"
  | "entered-in-error";

export type ClinicalSeverity =
  | "mild"
  | "moderate"
  | "severe"
  | "critical"
  | "unspecified";

export type TreatmentPlanStatus =
  | "draft"
  | "active"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "superseded"
  | "entered-in-error";

export type TreatmentPlanItemType =
  | "medication"
  | "laboratory-order"
  | "radiology-order"
  | "procedure"
  | "referral"
  | "admission"
  | "observation"
  | "monitoring"
  | "therapy"
  | "diet"
  | "lifestyle"
  | "patient-education"
  | "follow-up"
  | "work-restriction"
  | "certificate"
  | "other";

export type TreatmentPlanItemStatus =
  | "planned"
  | "ordered"
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "declined"
  | "not-performed"
  | "entered-in-error";

export type ClinicalTaskType =
  | "review-result"
  | "contact-patient"
  | "repeat-observation"
  | "complete-documentation"
  | "obtain-consent"
  | "arrange-referral"
  | "arrange-admission"
  | "schedule-follow-up"
  | "medication-review"
  | "clinical-review"
  | "other";

export type ClinicalTaskStatus =
  | "open"
  | "assigned"
  | "in-progress"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "overdue"
  | "entered-in-error";

export type ClinicalTaskPriority =
  | "routine"
  | "priority"
  | "urgent"
  | "critical";

export type ClinicalSignatureType =
  | "author-signature"
  | "cosignature"
  | "supervisor-signature"
  | "witness-signature";

export type ClinicalAmendmentType =
  | "addendum"
  | "correction"
  | "clarification"
  | "late-entry";

export type ClinicalDocumentationEventType =
  | "consultation-created"
  | "consultation-started"
  | "consultation-held"
  | "consultation-resumed"
  | "note-created"
  | "note-autosaved"
  | "note-submitted"
  | "note-signed"
  | "note-cosigned"
  | "note-amended"
  | "note-corrected"
  | "note-entered-in-error"
  | "treatment-plan-created"
  | "treatment-plan-updated"
  | "consultation-completed"
  | "consultation-cancelled";

export interface Consultation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  branchId: WonFlowId;
  branchDepartmentId: WonFlowId;

  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  roomId?: WonFlowId;

  encounterId: WonFlowId;
  appointmentId?: WonFlowId;
  patientJourneyId?: WonFlowId;
  queueEntryId?: WonFlowId;
  careEpisodeId?: WonFlowId;

  consultationNumber?: string;

  type: ConsultationType;
  mode: DoctorConsultationMode;
  status: ConsultationStatus;

  primaryPractitionerId: WonFlowId;

  reasonForConsultation?: string;
  presentingComplaint?: string;

  /**
   * The patient may decline or be unable to provide information.
   */
  informationSource:
    | "patient"
    | "guardian"
    | "caregiver"
    | "medical-record"
    | "referring-clinician"
    | "emergency-team"
    | "mixed"
    | "unknown";

  informationReliability?:
    | "reliable"
    | "partially-reliable"
    | "unreliable"
    | "unknown";

  languageCode?: string;
  translatorRequired: boolean;
  chaperoneRequired: boolean;

  scheduledStartAt?: IsoDateTime;
  startedAt?: IsoDateTime;
  heldAt?: IsoDateTime;
  resumedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;

  cancellationReason?: string;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ConsultationParticipant {
  id: WonFlowId;

  organizationId: WonFlowId;
  consultationId: WonFlowId;

  role: ConsultationParticipantRole;

  userId?: WonFlowId;
  practitionerId?: WonFlowId;
  patientId?: WonFlowId;

  externalPersonName?: string;
  externalPersonRelationship?: string;

  joinedAt?: IsoDateTime;
  leftAt?: IsoDateTime;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Clinical note metadata.
 *
 * Actual note content is stored in structured note sections so templates,
 * autosave and partial updates remain manageable.
 */
export interface ClinicalNote {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  encounterId: WonFlowId;
  consultationId?: WonFlowId;
  careEpisodeId?: WonFlowId;

  type: ClinicalNoteType;
  status: ClinicalNoteStatus;
  visibility: ClinicalNoteVisibility;

  title: string;

  authorUserId: WonFlowId;
  authorPractitionerId?: WonFlowId;

  /**
   * Used when trainee documentation requires senior review.
   */
  cosignatureRequired: boolean;
  requiredCosignerPractitionerId?: WonFlowId;

  templateId?: WonFlowId;
  templateVersion?: number;

  autosaveVersion: number;
  lastAutosavedAt?: IsoDateTime;

  submittedAt?: IsoDateTime;
  signedAt?: IsoDateTime;
  cosignedAt?: IsoDateTime;

  enteredInErrorAt?: IsoDateTime;
  enteredInErrorByUserId?: WonFlowId;
  enteredInErrorReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ClinicalNoteSection {
  id: WonFlowId;

  organizationId: WonFlowId;
  clinicalNoteId: WonFlowId;

  code: ClinicalNoteSectionCode;

  title: string;
  sequenceNumber: number;

  /**
   * A section may contain narrative text, structured data or both.
   */
  narrativeText?: string;
  structuredData?: Record<string, unknown>;

  required: boolean;
  completed: boolean;

  visibility?: ClinicalNoteVisibility;

  authoredByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ClinicalObservation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  encounterId?: WonFlowId;
  consultationId?: WonFlowId;
  clinicalNoteId?: WonFlowId;
  carePlanTaskId?: WonFlowId;

  source?: ObservationSource;

  category: ClinicalObservationCategory;

  /**
   * Examples:
   * - heart-rate
   * - systolic-blood-pressure
   * - oxygen-saturation
   * - pain-score
   * - body-temperature
   */
  code: string;
  displayName: string;

  valueType: ClinicalObservationValueType;

  numericValue?: number;
  textValue?: string;
  booleanValue?: boolean;
  codedValue?: string;

  numeratorValue?: number;
  denominatorValue?: number;

  referenceLow?: number;
  referenceHigh?: number;

  unitCode?: string;
  unitDisplay?: string;

  status: ClinicalObservationStatus;

  abnormal: boolean;
  critical: boolean;

  method?: string;
  bodySite?: string;

  observedAt: IsoDateTime;
  deviceRecordedAt?: IsoDateTime;

  observedByUserId?: WonFlowId;
  observedByPractitionerId?: WonFlowId;
  recordedByMembershipId?: WonFlowId;
  recordedByIdentityId?: WonFlowId;

  correctedFromObservationId?: WonFlowId;
  correctionReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ClinicalAssessmentItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  encounterId: WonFlowId;
  consultationId?: WonFlowId;
  clinicalNoteId?: WonFlowId;

  type: ClinicalAssessmentItemType;
  status: ClinicalAssessmentItemStatus;
  severity: ClinicalSeverity;

  /**
   * Clinical terminology code where available.
   */
  terminologySystem?: string;
  terminologyCode?: string;
  terminologyDisplay?: string;

  description: string;

  onsetAt?: IsoDateTime;
  resolvedAt?: IsoDateTime;

  primary: boolean;

  clinicalEvidence?: string;
  clinicianNotes?: string;

  recordedByUserId: WonFlowId;
  recordedByPractitionerId?: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface TreatmentPlan {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  encounterId: WonFlowId;
  consultationId?: WonFlowId;
  careEpisodeId?: WonFlowId;
  clinicalNoteId?: WonFlowId;

  title: string;
  status: TreatmentPlanStatus;

  summary?: string;
  clinicalGoals?: string;

  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;

  createdByUserId: WonFlowId;
  createdByPractitionerId?: WonFlowId;

  approvedByPractitionerId?: WonFlowId;
  approvedAt?: IsoDateTime;

  completedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;
  cancellationReason?: string;

  supersededByTreatmentPlanId?: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface TreatmentPlanItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;
  treatmentPlanId: WonFlowId;

  type: TreatmentPlanItemType;
  status: TreatmentPlanItemStatus;

  title: string;
  description?: string;

  priority:
    | "routine"
    | "priority"
    | "urgent"
    | "critical";

  sequenceNumber: number;

  assignedBranchId?: WonFlowId;
  assignedBranchDepartmentId?: WonFlowId;
  assignedOperationalUnitId?: WonFlowId;

  assignedUserId?: WonFlowId;
  assignedPractitionerId?: WonFlowId;

  medicationRequestId?: WonFlowId;
  laboratoryOrderId?: WonFlowId;
  radiologyOrderId?: WonFlowId;
  serviceOrderId?: WonFlowId;
  referralId?: WonFlowId;
  admissionRequestId?: WonFlowId;
  appointmentId?: WonFlowId;
  clinicalTaskId?: WonFlowId;

  scheduledStartAt?: IsoDateTime;
  dueAt?: IsoDateTime;
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;

  cancellationReason?: string;
  outcomeNotes?: string;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientClinicalInstruction {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  encounterId: WonFlowId;
  consultationId?: WonFlowId;
  treatmentPlanId?: WonFlowId;

  languageCode: string;

  title: string;
  instructionText: string;

  instructionType:
    | "medication"
    | "diet"
    | "activity"
    | "wound-care"
    | "warning-signs"
    | "follow-up"
    | "test-preparation"
    | "discharge"
    | "general"
    | "other";

  acknowledgedByPatient: boolean;
  acknowledgedAt?: IsoDateTime;

  providedVerbally: boolean;
  printed: boolean;
  releasedToPatientAccess: boolean;

  providedByUserId: WonFlowId;
  providedAt: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ClinicalTask {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  encounterId?: WonFlowId;
  consultationId?: WonFlowId;
  treatmentPlanId?: WonFlowId;

  type: ClinicalTaskType;
  status: ClinicalTaskStatus;
  priority: ClinicalTaskPriority;

  title: string;
  description?: string;

  assignedUserId?: WonFlowId;
  assignedPractitionerId?: WonFlowId;
  assignedBranchDepartmentId?: WonFlowId;

  createdByUserId: WonFlowId;

  dueAt?: IsoDateTime;
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;

  completionNotes?: string;
  cancellationReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ClinicalDocumentSignature {
  id: WonFlowId;

  organizationId: WonFlowId;
  clinicalNoteId: WonFlowId;

  type: ClinicalSignatureType;

  signedByUserId: WonFlowId;
  signedByPractitionerId?: WonFlowId;

  signerDisplayName: string;
  signerProfessionalTitle?: string;
  signerRegistrationNumber?: string;

  /**
   * Integrity reference calculated by the backend at signing time.
   */
  documentVersion: number;
  documentHash?: string;

  signedAt: IsoDateTime;
}

export interface ClinicalNoteAmendment {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;
  clinicalNoteId: WonFlowId;

  type: ClinicalAmendmentType;

  reason: string;
  amendmentText: string;

  amendedByUserId: WonFlowId;
  amendedByPractitionerId?: WonFlowId;

  signed: boolean;
  signedAt?: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface ClinicalDocumentationEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  encounterId: WonFlowId;
  consultationId?: WonFlowId;
  clinicalNoteId?: WonFlowId;
  treatmentPlanId?: WonFlowId;

  type: ClinicalDocumentationEventType;

  previousStatus?: string;
  newStatus?: string;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface ConsultationAggregate {
  consultation: Consultation;

  participants: ConsultationParticipant[];

  notes: ClinicalNote[];
  noteSections: ClinicalNoteSection[];

  observations: ClinicalObservation[];
  assessments: ClinicalAssessmentItem[];

  treatmentPlans: TreatmentPlan[];
  treatmentPlanItems: TreatmentPlanItem[];

  patientInstructions: PatientClinicalInstruction[];
  clinicalTasks: ClinicalTask[];

  signatures: ClinicalDocumentSignature[];
  amendments: ClinicalNoteAmendment[];

  documentationEvents: ClinicalDocumentationEvent[];
}

export const WONFLOW_CONSULTATION_STATUS_TRANSITIONS: Record<
  ConsultationStatus,
  readonly ConsultationStatus[]
> = {
  planned: [
    "ready",
    "in-progress",
    "cancelled",
    "entered-in-error",
  ],

  ready: [
    "in-progress",
    "on-hold",
    "cancelled",
  ],

  "in-progress": [
    "on-hold",
    "awaiting-documentation",
    "awaiting-signature",
    "completed",
    "cancelled",
    "entered-in-error",
  ],

  "on-hold": [
    "ready",
    "in-progress",
    "awaiting-documentation",
    "cancelled",
  ],

  "awaiting-documentation": [
    "in-progress",
    "awaiting-signature",
    "completed",
  ],

  "awaiting-signature": [
    "in-progress",
    "completed",
  ],

  completed: [],
  cancelled: [],
  "entered-in-error": [],
};

export const WONFLOW_CLINICAL_NOTE_STATUS_TRANSITIONS: Record<
  ClinicalNoteStatus,
  readonly ClinicalNoteStatus[]
> = {
  draft: [
    "in-progress",
    "awaiting-signature",
    "entered-in-error",
  ],

  "in-progress": [
    "awaiting-signature",
    "awaiting-cosignature",
    "signed",
    "entered-in-error",
  ],

  "awaiting-signature": [
    "in-progress",
    "awaiting-cosignature",
    "signed",
    "entered-in-error",
  ],

  "awaiting-cosignature": [
    "in-progress",
    "signed",
    "entered-in-error",
  ],

  signed: [
    "amended",
    "corrected",
    "entered-in-error",
  ],

  amended: [
    "amended",
    "corrected",
    "entered-in-error",
  ],

  corrected: [
    "amended",
    "corrected",
    "entered-in-error",
  ],

  "entered-in-error": [],
};