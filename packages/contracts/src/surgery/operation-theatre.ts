import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

export type SurgicalCaseType =
  | "elective"
  | "emergency"
  | "urgent"
  | "day-surgery"
  | "inpatient"
  | "outpatient"
  | "diagnostic-procedure"
  | "therapeutic-procedure"
  | "interventional"
  | "minor-procedure"
  | "other";

export type SurgicalCaseSource =
  | "opd"
  | "emergency"
  | "inpatient"
  | "day-care"
  | "external-referral"
  | "another-branch"
  | "direct-booking"
  | "system"
  | "other";

export type SurgicalPriority =
  | "routine"
  | "priority"
  | "urgent"
  | "emergency"
  | "immediate";

export type SurgicalCaseStatus =
  | "draft"
  | "pending-clinical-review"
  | "pending-authorization"
  | "pending-financial-clearance"
  | "pending-preoperative-clearance"
  | "ready-for-scheduling"
  | "scheduled"
  | "patient-arrived"
  | "preoperative"
  | "ready-for-theatre"
  | "in-theatre"
  | "procedure-in-progress"
  | "procedure-completed"
  | "recovery"
  | "completed"
  | "postponed"
  | "cancelled"
  | "not-performed"
  | "entered-in-error";

export type SurgicalProcedureStatus =
  | "planned"
  | "confirmed"
  | "started"
  | "in-progress"
  | "completed"
  | "partially-completed"
  | "abandoned"
  | "cancelled"
  | "not-performed"
  | "entered-in-error";

export type SurgicalLaterality =
  | "left"
  | "right"
  | "bilateral"
  | "midline"
  | "not-applicable";

export type OperatingTheatreSuiteType =
  | "general"
  | "orthopaedic"
  | "cardiac"
  | "neurosurgical"
  | "obstetric"
  | "paediatric"
  | "ophthalmic"
  | "ent"
  | "urology"
  | "dental"
  | "endoscopy"
  | "interventional"
  | "minor-procedure"
  | "hybrid"
  | "other";

export type OperatingTheatreOperationalStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "cleaning"
  | "decontamination"
  | "maintenance"
  | "blocked"
  | "out-of-service";

export type OperatingTheatreResourceType =
  | "theatre-room"
  | "anaesthesia-machine"
  | "ventilator"
  | "operating-table"
  | "surgical-light"
  | "imaging-equipment"
  | "endoscopy-system"
  | "microscope"
  | "robotic-system"
  | "electrosurgical-unit"
  | "patient-monitor"
  | "infusion-pump"
  | "blood-warmer"
  | "recovery-bed"
  | "instrument-set"
  | "staff-member"
  | "other";

export type OperatingTheatreReservationStatus =
  | "requested"
  | "held"
  | "confirmed"
  | "committed"
  | "released"
  | "expired"
  | "cancelled"
  | "rejected";

export type OperatingTheatreResourceReservationStatus =
  | "planned"
  | "reserved"
  | "confirmed"
  | "in-use"
  | "completed"
  | "released"
  | "cancelled"
  | "unavailable";

export type SurgicalTeamRole =
  | "primary-surgeon"
  | "assistant-surgeon"
  | "consulting-surgeon"
  | "anaesthesiologist"
  | "anaesthesia-assistant"
  | "scrub-nurse"
  | "circulating-nurse"
  | "theatre-technician"
  | "radiographer"
  | "perfusionist"
  | "paediatrician"
  | "neonatologist"
  | "pathologist"
  | "observer"
  | "other";

export type SurgicalTeamAssignmentStatus =
  | "proposed"
  | "invited"
  | "confirmed"
  | "checked-in"
  | "active"
  | "completed"
  | "declined"
  | "replaced"
  | "cancelled";

export type PreoperativeAssessmentStatus =
  | "not-started"
  | "draft"
  | "in-progress"
  | "additional-information-required"
  | "cleared"
  | "conditionally-cleared"
  | "not-cleared"
  | "cancelled"
  | "entered-in-error";

export type PreoperativeRiskLevel =
  | "low"
  | "moderate"
  | "high"
  | "very-high"
  | "critical"
  | "unknown";

export type SurgicalConsentStatus =
  | "required"
  | "pending"
  | "provided"
  | "declined"
  | "withdrawn"
  | "expired"
  | "waived-emergency"
  | "not-required"
  | "entered-in-error";

export type SurgicalSiteVerificationStatus =
  | "pending"
  | "verified"
  | "marked"
  | "not-required"
  | "conflict-detected"
  | "resolved"
  | "cancelled";

export type SurgicalChecklistPhase =
  | "sign-in"
  | "time-out"
  | "sign-out";

export type SurgicalChecklistStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "completed-with-exception"
  | "blocked"
  | "cancelled";

export type SurgicalChecklistItemStatus =
  | "pending"
  | "confirmed"
  | "failed"
  | "not-applicable"
  | "overridden"
  | "cancelled";

export type AnaesthesiaType =
  | "general"
  | "regional"
  | "spinal"
  | "epidural"
  | "local"
  | "sedation"
  | "monitored-anaesthesia-care"
  | "combined"
  | "none"
  | "other";

export type AnaesthesiaPlanStatus =
  | "draft"
  | "in-review"
  | "approved"
  | "modified"
  | "cancelled"
  | "entered-in-error";

export type AnaesthesiaCaseStatus =
  | "planned"
  | "ready"
  | "induction"
  | "maintenance"
  | "emergence"
  | "transferred-to-recovery"
  | "completed"
  | "cancelled"
  | "adverse-event"
  | "entered-in-error";

export type AnaesthesiaAirwayMethod =
  | "natural-airway"
  | "face-mask"
  | "supraglottic-airway"
  | "endotracheal-tube"
  | "tracheostomy"
  | "nasal-airway"
  | "oral-airway"
  | "other";

export type AnaesthesiaMedicationRoute =
  | "intravenous"
  | "intramuscular"
  | "inhalation"
  | "epidural"
  | "intrathecal"
  | "regional-block"
  | "local-infiltration"
  | "oral"
  | "other";

export type IntraoperativeEventType =
  | "patient-entered-theatre"
  | "patient-positioned"
  | "anaesthesia-started"
  | "induction-completed"
  | "airway-secured"
  | "surgical-preparation-started"
  | "incision"
  | "procedure-stage"
  | "implant-inserted"
  | "specimen-collected"
  | "blood-product-administered"
  | "equipment-change"
  | "unexpected-finding"
  | "complication"
  | "conversion-of-procedure"
  | "procedure-completed"
  | "anaesthesia-ended"
  | "patient-left-theatre"
  | "other";

export type SurgicalSpecimenStatus =
  | "planned"
  | "collected"
  | "labelled"
  | "verified"
  | "dispatched"
  | "received"
  | "rejected"
  | "lost"
  | "cancelled"
  | "entered-in-error";

export type SurgicalImplantUsageStatus =
  | "planned"
  | "opened"
  | "implanted"
  | "removed"
  | "wasted"
  | "returned"
  | "cancelled"
  | "entered-in-error";

export type SurgicalProcedureNoteStatus =
  | "draft"
  | "in-progress"
  | "awaiting-signature"
  | "signed"
  | "amended"
  | "corrected"
  | "entered-in-error";

export type RecoveryStatus =
  | "planned"
  | "admitted"
  | "monitoring"
  | "discharge-ready"
  | "transferred"
  | "discharged"
  | "escalated"
  | "cancelled"
  | "entered-in-error";

export type RecoveryDisposition =
  | "ward"
  | "high-dependency-unit"
  | "intensive-care-unit"
  | "day-care"
  | "home"
  | "another-branch"
  | "external-hospital"
  | "mortuary"
  | "other";

export type RecoveryAssessmentType =
  | "admission"
  | "routine"
  | "pain"
  | "airway"
  | "neurological"
  | "nausea-vomiting"
  | "bleeding"
  | "discharge-readiness"
  | "deterioration"
  | "other";

export type SurgicalComplicationSeverity =
  | "minor"
  | "moderate"
  | "major"
  | "life-threatening"
  | "fatal";

export type SurgicalCaseEventType =
  | "case-requested"
  | "case-approved"
  | "case-rejected"
  | "case-scheduled"
  | "case-postponed"
  | "case-cancelled"
  | "patient-arrived"
  | "preoperative-clearance-completed"
  | "consent-completed"
  | "site-verified"
  | "theatre-reserved"
  | "team-confirmed"
  | "sign-in-completed"
  | "time-out-completed"
  | "anaesthesia-started"
  | "procedure-started"
  | "procedure-completed"
  | "sign-out-completed"
  | "patient-transferred-to-recovery"
  | "recovery-started"
  | "recovery-completed"
  | "patient-transferred"
  | "complication-recorded"
  | "procedure-note-signed"
  | "entered-in-error";

export interface OperatingTheatreSuite {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  branchDepartmentId: WonFlowId;
  operationalUnitId?: WonFlowId;

  code: string;
  name: string;
  type: OperatingTheatreSuiteType;

  supportsEmergencyCases: boolean;
  supportsIsolationCases: boolean;
  supportsPaediatricCases: boolean;
  supportsHighRiskAnaesthesia: boolean;

  recoveryAreaId?: WonFlowId;
  sterileStorageLocationId?: WonFlowId;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface OperatingTheatreRoom {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;
  theatreSuiteId: WonFlowId;

  code: string;
  name: string;

  supportedProcedureCategories: string[];
  supportedAnaesthesiaTypes: AnaesthesiaType[];

  operationalStatus: OperatingTheatreOperationalStatus;

  positivePressureAvailable: boolean;
  negativePressureAvailable: boolean;
  laminarFlowAvailable: boolean;
  medicalGasAvailable: boolean;
  imagingCompatible: boolean;
  roboticSurgeryCompatible: boolean;

  maximumPatientWeightKg?: number;

  currentSurgicalCaseId?: WonFlowId;
  currentReservationId?: WonFlowId;

  blockedReason?: string;
  outOfServiceReason?: string;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface OperatingTheatreResource {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  theatreSuiteId?: WonFlowId;
  theatreRoomId?: WonFlowId;

  type: OperatingTheatreResourceType;

  code: string;
  name: string;

  manufacturer?: string;
  model?: string;
  serialNumber?: string;

  supportedProcedureCodes: string[];

  requiresSterilization: boolean;
  requiresCalibration: boolean;

  lastSterilizedAt?: IsoDateTime;
  lastCalibratedAt?: IsoDateTime;
  nextMaintenanceAt?: IsoDateTime;

  operationalStatus:
    | "available"
    | "reserved"
    | "in-use"
    | "cleaning"
    | "sterilization"
    | "maintenance"
    | "quarantined"
    | "out-of-service";

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SurgicalCaseRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  requestingBranchId: WonFlowId;
  requestedPerformingBranchId: WonFlowId;
  requestingDepartmentId: WonFlowId;

  encounterId: WonFlowId;
  consultationId?: WonFlowId;
  admissionId?: WonFlowId;
  patientJourneyId?: WonFlowId;
  referralId?: WonFlowId;

  /**
   * Example:
   * SUR-REQ-2026-000481
   */
  requestNumber: string;

  type: SurgicalCaseType;
  source: SurgicalCaseSource;
  priority: SurgicalPriority;

  requestedProcedureCodes: string[];
  requestedProcedureNames: string[];

  clinicalIndication: string;
  provisionalDiagnosis?: string;
  diagnosisCodes: string[];

  requestingPractitionerId: WonFlowId;
  requestedByUserId: WonFlowId;

  preferredSurgeonPractitionerId?: WonFlowId;

  preferredStartAt?: IsoDateTime;
  latestAcceptableStartAt?: IsoDateTime;

  estimatedProcedureMinutes?: number;
  estimatedRecoveryMinutes?: number;

  requestedAnaesthesiaType?: AnaesthesiaType;

  bloodProductsMayBeRequired: boolean;
  implantMayBeRequired: boolean;
  specimenCollectionExpected: boolean;

  isolationRequired: boolean;
  specialEquipmentRequired: string[];

  financialClearanceRequired: boolean;
  insuranceAuthorizationRequired: boolean;
  insuranceAuthorizationId?: WonFlowId;

  supportingDocumentIds: WonFlowId[];

  status:
    | "draft"
    | "pending-review"
    | "approved"
    | "partially-approved"
    | "waitlisted"
    | "rejected"
    | "cancelled"
    | "converted-to-case"
    | "entered-in-error";

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SurgicalCase {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  branchId: WonFlowId;
  theatreSuiteId?: WonFlowId;
  theatreRoomId?: WonFlowId;

  surgicalCaseRequestId?: WonFlowId;

  encounterId: WonFlowId;
  admissionId?: WonFlowId;
  patientJourneyId?: WonFlowId;
  careEpisodeId?: WonFlowId;

  /**
   * Example:
   * SUR-2026-000481
   */
  surgicalCaseNumber: string;

  type: SurgicalCaseType;
  source: SurgicalCaseSource;
  priority: SurgicalPriority;
  status: SurgicalCaseStatus;

  primarySurgeonPractitionerId: WonFlowId;
  anaesthesiologistPractitionerId?: WonFlowId;

  principalProcedureCode: string;
  principalProcedureName: string;

  clinicalIndication: string;
  diagnosisCodes: string[];

  plannedAnaesthesiaType?: AnaesthesiaType;

  plannedStartAt?: IsoDateTime;
  plannedEndAt?: IsoDateTime;

  patientArrivedAt?: IsoDateTime;
  enteredTheatreAt?: IsoDateTime;
  procedureStartedAt?: IsoDateTime;
  procedureCompletedAt?: IsoDateTime;
  leftTheatreAt?: IsoDateTime;
  completedAt?: IsoDateTime;

  cancellationReason?: string;
  postponementReason?: string;
  notPerformedReason?: string;

  operatingTheatreReservationId?: WonFlowId;
  anaesthesiaCaseId?: WonFlowId;
  recoveryStayId?: WonFlowId;
  procedureNoteId?: WonFlowId;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SurgicalProcedure {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;

  sequenceNumber: number;

  procedureCode: string;
  procedureName: string;

  bodySiteCode?: string;
  bodySiteName?: string;
  laterality: SurgicalLaterality;

  status: SurgicalProcedureStatus;

  primary: boolean;
  planned: boolean;

  plannedDurationMinutes?: number;
  actualDurationMinutes?: number;

  primarySurgeonPractitionerId: WonFlowId;
  assistantSurgeonPractitionerIds: WonFlowId[];

  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;

  operativeApproach?: string;
  techniqueSummary?: string;

  convertedFromProcedureId?: WonFlowId;
  convertedToProcedureId?: WonFlowId;
  conversionReason?: string;

  outcomeSummary?: string;
  notPerformedReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface OperatingTheatreScheduleBlock {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  theatreSuiteId: WonFlowId;
  theatreRoomId: WonFlowId;

  name: string;

  blockType:
    | "elective-list"
    | "emergency"
    | "specialty"
    | "surgeon"
    | "maintenance"
    | "cleaning"
    | "reserved-capacity"
    | "other";

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  specialtyCode?: string;
  practitionerId?: WonFlowId;

  maximumCases?: number;

  status:
    | "draft"
    | "published"
    | "active"
    | "completed"
    | "cancelled";

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface OperatingTheatreReservation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;

  branchId: WonFlowId;
  theatreSuiteId: WonFlowId;
  theatreRoomId: WonFlowId;

  scheduleBlockId?: WonFlowId;

  status: OperatingTheatreReservationStatus;
  priority: SurgicalPriority;

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  setupStartsAt?: IsoDateTime;
  cleaningEndsAt?: IsoDateTime;

  idempotencyKey: string;

  reservedByUserId?: WonFlowId;
  reservedBySystem: boolean;

  reservedAt: IsoDateTime;
  expiresAt?: IsoDateTime;

  confirmedAt?: IsoDateTime;
  committedAt?: IsoDateTime;

  releasedAt?: IsoDateTime;
  releaseReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface OperatingTheatreResourceReservation {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  surgicalCaseId: WonFlowId;
  operatingTheatreReservationId: WonFlowId;

  resourceType: OperatingTheatreResourceType;
  resourceId: WonFlowId;

  status: OperatingTheatreResourceReservationStatus;

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  quantity?: number;

  confirmedByUserId?: WonFlowId;
  confirmedAt?: IsoDateTime;

  releasedAt?: IsoDateTime;
  releaseReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SurgicalTeamAssignment {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  surgicalCaseId: WonFlowId;

  role: SurgicalTeamRole;
  status: SurgicalTeamAssignmentStatus;

  userId?: WonFlowId;
  practitionerId?: WonFlowId;

  externalTeamMemberName?: string;
  externalTeamMemberCredential?: string;

  required: boolean;
  leadRole: boolean;

  assignedAt: IsoDateTime;

  confirmedAt?: IsoDateTime;
  checkedInAt?: IsoDateTime;
  completedAt?: IsoDateTime;

  replacedByAssignmentId?: WonFlowId;
  replacementReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PreoperativeAssessment {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;

  status: PreoperativeAssessmentStatus;
  overallRiskLevel: PreoperativeRiskLevel;

  assessedByUserId: WonFlowId;
  assessedByPractitionerId?: WonFlowId;

  medicalHistoryReviewed: boolean;
  surgicalHistoryReviewed: boolean;
  medicationHistoryReviewed: boolean;
  allergyHistoryReviewed: boolean;

  fastingConfirmed: boolean;
  fastingHours?: number;

  laboratoryResultsReviewed: boolean;
  radiologyResultsReviewed: boolean;

  anticoagulationReviewed: boolean;
  infectionRiskReviewed: boolean;
  venousThromboembolismRiskReviewed: boolean;
  fallRiskReviewed: boolean;

  pregnancyScreeningRequired: boolean;
  pregnancyStatus?:
    | "not-applicable"
    | "not-pregnant"
    | "possibly-pregnant"
    | "pregnant"
    | "unknown"
    | "patient-declined";

  bloodProductsRequired: boolean;
  bloodProductReservationId?: WonFlowId;

  specialPreparationRequired: boolean;
  specialPreparationInstructions?: string;

  clearanceConditions?: string;
  notClearedReason?: string;

  startedAt: IsoDateTime;
  completedAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SurgicalConsent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;
  surgicalProcedureId?: WonFlowId;

  type:
    | "procedure"
    | "anaesthesia"
    | "blood-products"
    | "implant"
    | "photography"
    | "research"
    | "other";

  status: SurgicalConsentStatus;

  consentDocumentId?: WonFlowId;

  languageCode: string;
  translatorRequired: boolean;
  translatorUserId?: WonFlowId;

  patientCapacityConfirmed: boolean;

  consentedBy:
    | "patient"
    | "guardian"
    | "legal-representative"
    | "emergency-authority";

  consentingPersonId?: WonFlowId;
  consentingPersonName?: string;
  relationshipToPatient?: string;

  risksExplained: boolean;
  benefitsExplained: boolean;
  alternativesExplained: boolean;
  questionsAnswered: boolean;

  obtainedByUserId?: WonFlowId;
  obtainedByPractitionerId?: WonFlowId;
  obtainedAt?: IsoDateTime;

  witnessRequired: boolean;
  witnessedByUserId?: WonFlowId;
  witnessedAt?: IsoDateTime;

  withdrawnAt?: IsoDateTime;
  withdrawalReason?: string;

  expiresAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SurgicalSiteVerification {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;
  surgicalProcedureId: WonFlowId;

  status: SurgicalSiteVerificationStatus;

  plannedBodySite: string;
  plannedLaterality: SurgicalLaterality;

  patientConfirmed: boolean;
  consentConfirmed: boolean;
  scheduleConfirmed: boolean;
  imagingConfirmed: boolean;

  siteMarkingRequired: boolean;
  siteMarked: boolean;

  markedByPractitionerId?: WonFlowId;
  markedAt?: IsoDateTime;

  verifiedByUserId: WonFlowId;
  verifiedByPractitionerId?: WonFlowId;
  verifiedAt: IsoDateTime;

  conflictDescription?: string;
  resolutionNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SurgicalSafetyChecklist {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;

  phase: SurgicalChecklistPhase;
  status: SurgicalChecklistStatus;

  completedByUserId?: WonFlowId;
  completedByPractitionerId?: WonFlowId;
  completedAt?: IsoDateTime;

  exceptionSummary?: string;
  blockingReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SurgicalSafetyChecklistItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  checklistId: WonFlowId;

  sequenceNumber: number;

  code: string;
  title: string;
  description?: string;

  required: boolean;
  status: SurgicalChecklistItemStatus;

  expectedValue?: string;
  confirmedValue?: string;

  confirmedByUserId?: WonFlowId;
  confirmedByPractitionerId?: WonFlowId;
  confirmedAt?: IsoDateTime;

  failureReason?: string;

  overriddenByUserId?: WonFlowId;
  overriddenAt?: IsoDateTime;
  overrideReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AnaesthesiaPreoperativeAssessment {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;

  status: PreoperativeAssessmentStatus;

  assessedByPractitionerId: WonFlowId;
  assessedByUserId: WonFlowId;

  anaesthesiaRiskClass?: string;
  airwayAssessment?: string;

  previousAnaesthesiaProblems: boolean;
  previousAnaesthesiaProblemDetails?: string;

  difficultAirwayRisk: boolean;
  aspirationRisk: boolean;
  postoperativeNauseaRisk: boolean;

  medicationReviewed: boolean;
  allergyReviewed: boolean;
  fastingReviewed: boolean;
  renalFunctionReviewed: boolean;
  cardiacRiskReviewed: boolean;
  respiratoryRiskReviewed: boolean;

  plannedPostoperativeCare:
    | "standard-recovery"
    | "extended-recovery"
    | "ward"
    | "high-dependency"
    | "intensive-care"
    | "other";

  clearanceConditions?: string;
  notClearedReason?: string;

  completedAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AnaesthesiaPlan {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;
  anaesthesiaPreoperativeAssessmentId?: WonFlowId;

  status: AnaesthesiaPlanStatus;
  type: AnaesthesiaType;

  anaesthesiologistPractitionerId: WonFlowId;

  plannedAirwayMethod?: AnaesthesiaAirwayMethod;

  inductionPlan?: string;
  maintenancePlan?: string;
  emergencePlan?: string;

  analgesiaPlan?: string;
  antiemeticPlan?: string;
  fluidPlan?: string;
  bloodProductPlan?: string;

  regionalBlockPlanned: boolean;
  regionalBlockSite?: string;

  invasiveMonitoringPlanned: boolean;
  invasiveMonitoringDetails?: string;

  postoperativeDestination: RecoveryDisposition;

  approvedAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AnaesthesiaCase {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;
  anaesthesiaPlanId: WonFlowId;

  /**
   * Example:
   * ANE-2026-000481
   */
  anaesthesiaCaseNumber: string;

  type: AnaesthesiaType;
  status: AnaesthesiaCaseStatus;

  anaesthesiologistPractitionerId: WonFlowId;
  anaesthesiaAssistantUserId?: WonFlowId;

  airwayMethod?: AnaesthesiaAirwayMethod;
  airwayDeviceDetails?: string;

  anaesthesiaStartedAt?: IsoDateTime;
  inductionCompletedAt?: IsoDateTime;
  maintenanceStartedAt?: IsoDateTime;
  emergenceStartedAt?: IsoDateTime;
  anaesthesiaEndedAt?: IsoDateTime;

  transferredToRecoveryAt?: IsoDateTime;

  difficultAirwayEncountered: boolean;
  adverseEventOccurred: boolean;
  adverseEventSummary?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AnaesthesiaObservation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  anaesthesiaCaseId: WonFlowId;

  code: string;
  displayName: string;

  valueType:
    | "number"
    | "text"
    | "boolean"
    | "coded-value"
    | "ratio";

  numericValue?: number;
  textValue?: string;
  booleanValue?: boolean;
  codedValue?: string;

  numeratorValue?: number;
  denominatorValue?: number;

  unitCode?: string;
  unitDisplay?: string;

  abnormal: boolean;
  critical: boolean;

  observedByUserId?: WonFlowId;
  observedBySystem: boolean;
  observedAt: IsoDateTime;

  deviceId?: WonFlowId;

  createdAt: IsoDateTime;
}

export interface AnaesthesiaMedicationAdministration {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  anaesthesiaCaseId: WonFlowId;

  medicationCode: string;
  medicationDisplayName: string;

  doseValue?: number;
  doseUnit?: string;

  route: AnaesthesiaMedicationRoute;

  infusionRate?: number;
  infusionRateUnit?: string;

  administeredByUserId: WonFlowId;
  administeredByPractitionerId?: WonFlowId;

  administeredAt: IsoDateTime;

  inventoryBatchId?: WonFlowId;
  batchNumber?: string;

  indication?: string;
  response?: string;

  createdAt: IsoDateTime;
}

export interface IntraoperativeEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;
  surgicalProcedureId?: WonFlowId;
  anaesthesiaCaseId?: WonFlowId;

  type: IntraoperativeEventType;

  title: string;
  description?: string;

  clinicallySignificant: boolean;
  escalationRequired: boolean;

  performedByUserId?: WonFlowId;
  performedByPractitionerId?: WonFlowId;
  recordedBySystem: boolean;

  occurredAt: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface SurgicalImplantUsage {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;
  surgicalProcedureId: WonFlowId;

  status: SurgicalImplantUsageStatus;

  implantCode: string;
  implantDisplayName: string;

  manufacturer?: string;
  model?: string;
  size?: string;

  serialNumber?: string;
  lotNumber?: string;
  uniqueDeviceIdentifier?: string;

  inventoryItemId?: WonFlowId;
  inventoryBatchId?: WonFlowId;

  expiryDate?: string;

  bodySite?: string;
  laterality?: SurgicalLaterality;

  openedByUserId?: WonFlowId;
  openedAt?: IsoDateTime;

  implantedByPractitionerId?: WonFlowId;
  implantedAt?: IsoDateTime;

  removedAt?: IsoDateTime;
  removalReason?: string;

  wastageReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SurgicalConsumableUsage {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;
  surgicalProcedureId?: WonFlowId;

  itemCode: string;
  itemDisplayName: string;

  inventoryItemId?: WonFlowId;
  inventoryBatchId?: WonFlowId;

  batchNumber?: string;
  expiryDate?: string;

  quantityUsed: number;
  quantityUnit: string;

  billable: boolean;
  chargeItemId?: WonFlowId;

  recordedByUserId: WonFlowId;
  recordedAt: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface SurgicalSpecimen {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;
  surgicalProcedureId: WonFlowId;

  /**
   * Example:
   * SUR-SPC-2026-000481
   */
  specimenNumber: string;

  status: SurgicalSpecimenStatus;

  specimenType: string;
  bodySite: string;
  laterality: SurgicalLaterality;

  description?: string;

  containerCode?: string;
  preservativeCode?: string;

  labelValue?: string;
  barcodeValue?: string;

  collectedByUserId?: WonFlowId;
  collectedByPractitionerId?: WonFlowId;
  collectedAt?: IsoDateTime;

  verifiedByUserId?: WonFlowId;
  verifiedAt?: IsoDateTime;

  destinationDepartmentId?: WonFlowId;
  laboratoryOrderId?: WonFlowId;

  dispatchedByUserId?: WonFlowId;
  dispatchedAt?: IsoDateTime;

  receivedAt?: IsoDateTime;

  rejectionReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SurgicalProcedureNote {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;
  encounterId: WonFlowId;

  /**
   * Example:
   * SUR-NOTE-2026-000481
   */
  noteNumber: string;

  status: SurgicalProcedureNoteStatus;

  preoperativeDiagnosis: string;
  postoperativeDiagnosis: string;

  proceduresPerformed: string[];

  primarySurgeonPractitionerId: WonFlowId;
  assistantSurgeonPractitionerIds: WonFlowId[];

  anaesthesiaType: AnaesthesiaType;
  anaesthesiologistPractitionerId?: WonFlowId;

  findings: string;
  technique: string;

  estimatedBloodLoss?: number;
  bloodLossUnit?: string;

  fluidsAdministered?: string;
  bloodProductsAdministered?: string;

  implantUsageIds: WonFlowId[];
  specimenIds: WonFlowId[];

  drainsPlaced?: string;
  closureMethod?: string;
  countsConfirmed: boolean;

  complications?: string;
  patientConditionAtTransfer: string;

  postoperativeInstructions?: string;

  authorUserId: WonFlowId;
  authorPractitionerId: WonFlowId;

  signedByPractitionerId?: WonFlowId;
  signedAt?: IsoDateTime;

  enteredInErrorAt?: IsoDateTime;
  enteredInErrorReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PostAnaesthesiaCareUnitStay {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;
  anaesthesiaCaseId?: WonFlowId;

  branchId: WonFlowId;
  recoveryAreaId: WonFlowId;
  recoveryBedId?: WonFlowId;

  /**
   * Example:
   * PACU-2026-000481
   */
  recoveryNumber: string;

  status: RecoveryStatus;

  admittedByUserId?: WonFlowId;
  admittedAt?: IsoDateTime;

  responsibleNurseUserId?: WonFlowId;
  responsiblePractitionerId?: WonFlowId;

  oxygenRequired: boolean;
  airwaySupportRequired: boolean;
  painManagementRequired: boolean;
  nauseaManagementRequired: boolean;

  bleedingConcern: boolean;
  deteriorationConcern: boolean;

  plannedDisposition: RecoveryDisposition;
  actualDisposition?: RecoveryDisposition;

  dischargeReadyAt?: IsoDateTime;
  transferredAt?: IsoDateTime;
  dischargedAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RecoveryAssessment {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  recoveryStayId: WonFlowId;

  type: RecoveryAssessmentType;

  consciousnessLevel?: string;
  airwayStatus?: string;
  breathingStatus?: string;
  circulationStatus?: string;

  painScore?: number;
  nauseaScore?: number;
  sedationScore?: number;

  surgicalSiteStatus?: string;
  bleedingStatus?: string;

  oxygenSaturation?: number;
  oxygenSupport?: string;

  temperatureValue?: number;
  temperatureUnit?: string;

  recoveryScoreSystem?: string;
  recoveryScore?: number;

  abnormal: boolean;
  critical: boolean;

  actionRequired: boolean;
  actionSummary?: string;

  assessedByUserId: WonFlowId;
  assessedAt: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface RecoveryDischargeDecision {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  recoveryStayId: WonFlowId;

  disposition: RecoveryDisposition;

  dischargeCriteriaMet: boolean;

  airwayStable: boolean;
  breathingStable: boolean;
  circulationStable: boolean;
  consciousnessAcceptable: boolean;
  painControlled: boolean;
  nauseaControlled: boolean;
  bleedingControlled: boolean;

  mobilityAssessed: boolean;
  oralIntakeAssessed: boolean;
  responsibleEscortConfirmed: boolean;

  transferRequired: boolean;
  destinationWardId?: WonFlowId;
  destinationBedId?: WonFlowId;

  conditions?: string;
  notReadyReason?: string;

  decidedByUserId: WonFlowId;
  decidedByPractitionerId?: WonFlowId;
  decidedAt: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface SurgicalComplication {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseId: WonFlowId;
  surgicalProcedureId?: WonFlowId;
  anaesthesiaCaseId?: WonFlowId;
  recoveryStayId?: WonFlowId;

  code?: string;
  title: string;
  description: string;

  severity: SurgicalComplicationSeverity;

  occurredDuring:
    | "preoperative"
    | "anaesthesia"
    | "intraoperative"
    | "recovery"
    | "postoperative";

  immediateAction: string;
  outcome?: string;

  incidentReportRequired: boolean;
  incidentReportId?: WonFlowId;

  disclosureRequired: boolean;
  disclosureCompletedAt?: IsoDateTime;

  recordedByUserId: WonFlowId;
  recordedByPractitionerId?: WonFlowId;
  occurredAt: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SurgicalCaseEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  surgicalCaseRequestId?: WonFlowId;
  surgicalCaseId?: WonFlowId;
  surgicalProcedureId?: WonFlowId;
  theatreReservationId?: WonFlowId;
  anaesthesiaCaseId?: WonFlowId;
  recoveryStayId?: WonFlowId;

  type: SurgicalCaseEventType;

  previousStatus?: string;
  newStatus?: string;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedByPractitionerId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface SurgicalCaseAggregate {
  request?: SurgicalCaseRequest;
  surgicalCase: SurgicalCase;

  procedures: SurgicalProcedure[];

  scheduleBlocks: OperatingTheatreScheduleBlock[];
  theatreReservations: OperatingTheatreReservation[];
  resourceReservations: OperatingTheatreResourceReservation[];

  teamAssignments: SurgicalTeamAssignment[];

  preoperativeAssessments: PreoperativeAssessment[];
  consents: SurgicalConsent[];
  siteVerifications: SurgicalSiteVerification[];

  safetyChecklists: SurgicalSafetyChecklist[];
  safetyChecklistItems: SurgicalSafetyChecklistItem[];

  anaesthesiaPreoperativeAssessments: AnaesthesiaPreoperativeAssessment[];
  anaesthesiaPlans: AnaesthesiaPlan[];
  anaesthesiaCases: AnaesthesiaCase[];
  anaesthesiaObservations: AnaesthesiaObservation[];
  anaesthesiaMedicationAdministrations: AnaesthesiaMedicationAdministration[];

  intraoperativeEvents: IntraoperativeEvent[];

  implantUsage: SurgicalImplantUsage[];
  consumableUsage: SurgicalConsumableUsage[];
  specimens: SurgicalSpecimen[];

  procedureNotes: SurgicalProcedureNote[];

  recoveryStays: PostAnaesthesiaCareUnitStay[];
  recoveryAssessments: RecoveryAssessment[];
  recoveryDischargeDecisions: RecoveryDischargeDecision[];

  complications: SurgicalComplication[];

  events: SurgicalCaseEvent[];
}

export const WONFLOW_SURGICAL_CASE_STATUS_TRANSITIONS: Record<
  SurgicalCaseStatus,
  readonly SurgicalCaseStatus[]
> = {
  draft: [
    "pending-clinical-review",
    "pending-authorization",
    "pending-financial-clearance",
    "pending-preoperative-clearance",
    "ready-for-scheduling",
    "cancelled",
    "entered-in-error",
  ],

  "pending-clinical-review": [
    "pending-authorization",
    "pending-financial-clearance",
    "pending-preoperative-clearance",
    "ready-for-scheduling",
    "postponed",
    "cancelled",
  ],

  "pending-authorization": [
    "pending-financial-clearance",
    "pending-preoperative-clearance",
    "ready-for-scheduling",
    "postponed",
    "cancelled",
  ],

  "pending-financial-clearance": [
    "pending-preoperative-clearance",
    "ready-for-scheduling",
    "postponed",
    "cancelled",
  ],

  "pending-preoperative-clearance": [
    "ready-for-scheduling",
    "postponed",
    "cancelled",
  ],

  "ready-for-scheduling": [
    "scheduled",
    "postponed",
    "cancelled",
  ],

  scheduled: [
    "patient-arrived",
    "preoperative",
    "postponed",
    "cancelled",
    "not-performed",
  ],

  "patient-arrived": [
    "preoperative",
    "ready-for-theatre",
    "postponed",
    "cancelled",
    "not-performed",
  ],

  preoperative: [
    "ready-for-theatre",
    "postponed",
    "cancelled",
    "not-performed",
  ],

  "ready-for-theatre": [
    "in-theatre",
    "postponed",
    "cancelled",
    "not-performed",
  ],

  "in-theatre": [
    "procedure-in-progress",
    "procedure-completed",
    "cancelled",
    "not-performed",
  ],

  "procedure-in-progress": [
    "procedure-completed",
    "recovery",
    "cancelled",
    "not-performed",
  ],

  "procedure-completed": [
    "recovery",
    "completed",
  ],

  recovery: [
    "completed",
  ],

  completed: [],
  postponed: [
    "pending-preoperative-clearance",
    "ready-for-scheduling",
    "scheduled",
    "cancelled",
  ],
  cancelled: [],
  "not-performed": [],
  "entered-in-error": [],
};

export const WONFLOW_THEATRE_RESERVATION_STATUS_TRANSITIONS: Record<
  OperatingTheatreReservationStatus,
  readonly OperatingTheatreReservationStatus[]
> = {
  requested: [
    "held",
    "confirmed",
    "rejected",
    "cancelled",
    "expired",
  ],

  held: [
    "confirmed",
    "committed",
    "released",
    "expired",
    "cancelled",
  ],

  confirmed: [
    "committed",
    "released",
    "expired",
    "cancelled",
  ],

  committed: [
    "released",
  ],

  released: [],
  expired: [],
  cancelled: [],
  rejected: [],
};

export const WONFLOW_ANAESTHESIA_CASE_STATUS_TRANSITIONS: Record<
  AnaesthesiaCaseStatus,
  readonly AnaesthesiaCaseStatus[]
> = {
  planned: [
    "ready",
    "induction",
    "cancelled",
    "entered-in-error",
  ],

  ready: [
    "induction",
    "cancelled",
  ],

  induction: [
    "maintenance",
    "emergence",
    "cancelled",
    "adverse-event",
  ],

  maintenance: [
    "emergence",
    "cancelled",
    "adverse-event",
  ],

  emergence: [
    "transferred-to-recovery",
    "completed",
    "adverse-event",
  ],

  "transferred-to-recovery": [
    "completed",
  ],

  completed: [],
  cancelled: [],
  "adverse-event": [
    "maintenance",
    "emergence",
    "transferred-to-recovery",
    "completed",
  ],
  "entered-in-error": [],
};

export const WONFLOW_RECOVERY_STATUS_TRANSITIONS: Record<
  RecoveryStatus,
  readonly RecoveryStatus[]
> = {
  planned: [
    "admitted",
    "cancelled",
    "entered-in-error",
  ],

  admitted: [
    "monitoring",
    "discharge-ready",
    "escalated",
    "cancelled",
  ],

  monitoring: [
    "discharge-ready",
    "transferred",
    "discharged",
    "escalated",
  ],

  "discharge-ready": [
    "monitoring",
    "transferred",
    "discharged",
    "escalated",
  ],

  transferred: [],
  discharged: [],
  escalated: [
    "monitoring",
    "transferred",
  ],
  cancelled: [],
  "entered-in-error": [],
};