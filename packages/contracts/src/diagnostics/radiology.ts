import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

export type RadiologyOrderType =
  | "routine"
  | "urgent"
  | "stat"
  | "emergency"
  | "screening"
  | "follow-up"
  | "pre-operative"
  | "image-guided-procedure"
  | "external-referral"
  | "mobile-imaging";

export type RadiologyOrderSource =
  | "consultation"
  | "emergency"
  | "inpatient"
  | "procedure"
  | "day-care"
  | "external-referral"
  | "direct-booking"
  | "screening-program"
  | "system";

export type RadiologyOrderStatus =
  | "draft"
  | "awaiting-signature"
  | "ordered"
  | "awaiting-clinical-review"
  | "awaiting-authorization"
  | "awaiting-payment"
  | "ready-for-scheduling"
  | "scheduled"
  | "patient-arrived"
  | "checked-in"
  | "in-progress"
  | "partially-completed"
  | "completed"
  | "reported"
  | "verified"
  | "released"
  | "cancelled"
  | "rejected"
  | "not-performed"
  | "entered-in-error";

export type RadiologyOrderItemStatus =
  | "ordered"
  | "awaiting-review"
  | "ready-for-scheduling"
  | "scheduled"
  | "patient-arrived"
  | "in-progress"
  | "completed"
  | "reported"
  | "verified"
  | "released"
  | "cancelled"
  | "rejected"
  | "not-performed"
  | "entered-in-error";

export type RadiologyPriority =
  | "routine"
  | "priority"
  | "urgent"
  | "stat"
  | "critical";

export type RadiologyModality =
  | "x-ray"
  | "ultrasound"
  | "ct"
  | "mri"
  | "mammography"
  | "fluoroscopy"
  | "angiography"
  | "nuclear-medicine"
  | "pet"
  | "dexa"
  | "mobile-x-ray"
  | "interventional-radiology"
  | "other";

export type RadiologyLaterality =
  | "left"
  | "right"
  | "bilateral"
  | "midline"
  | "not-applicable";

export type RadiologyAppointmentStatus =
  | "draft"
  | "reserved"
  | "awaiting-patient-confirmation"
  | "awaiting-preparation"
  | "confirmed"
  | "patient-arrived"
  | "checked-in"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show"
  | "expired";

export type RadiologyPreparationStatus =
  | "not-required"
  | "pending"
  | "instructions-sent"
  | "confirmed"
  | "incomplete"
  | "waived"
  | "failed";

export type RadiologySafetyScreeningStatus =
  | "not-required"
  | "pending"
  | "in-progress"
  | "cleared"
  | "conditionally-cleared"
  | "not-cleared"
  | "cancelled";

export type RadiologySafetyRiskType =
  | "pregnancy"
  | "contrast-allergy"
  | "renal-function"
  | "implant"
  | "pacemaker"
  | "metallic-foreign-body"
  | "claustrophobia"
  | "infection-control"
  | "sedation-risk"
  | "radiation-exposure"
  | "mobility"
  | "fall-risk"
  | "other";

export type RadiologySafetyRiskSeverity =
  | "information"
  | "warning"
  | "high"
  | "critical";

export type ContrastType =
  | "iodinated"
  | "gadolinium"
  | "oral"
  | "rectal"
  | "intravenous"
  | "intra-articular"
  | "other";

export type ContrastAdministrationStatus =
  | "planned"
  | "approved"
  | "administered"
  | "partially-administered"
  | "withheld"
  | "cancelled"
  | "adverse-reaction";

export type SedationRequirement =
  | "not-required"
  | "possible"
  | "required"
  | "anaesthesia-required";

export type RadiologyStudyStatus =
  | "planned"
  | "scheduled"
  | "patient-arrived"
  | "ready"
  | "acquisition-in-progress"
  | "acquisition-completed"
  | "quality-review"
  | "additional-images-required"
  | "completed"
  | "cancelled"
  | "not-performed"
  | "entered-in-error";

export type RadiologyStudyQualityStatus =
  | "not-reviewed"
  | "acceptable"
  | "limited"
  | "repeat-required"
  | "rejected";

export type RadiologyReportStatus =
  | "draft"
  | "preliminary"
  | "awaiting-verification"
  | "verified"
  | "released"
  | "corrected"
  | "amended"
  | "cancelled"
  | "entered-in-error";

export type RadiologyFindingSignificance =
  | "normal"
  | "minor"
  | "significant"
  | "urgent"
  | "critical";

export type CriticalRadiologyAlertStatus =
  | "created"
  | "notification-in-progress"
  | "communicated"
  | "acknowledged"
  | "escalated"
  | "closed"
  | "cancelled"
  | "entered-in-error";

export type RadiologyCommunicationMethod =
  | "secure-message"
  | "phone"
  | "hospital-extension"
  | "in-person"
  | "sms"
  | "push-notification"
  | "system-alert"
  | "other";

export type RadiologyWorkflowEventType =
  | "order-created"
  | "order-signed"
  | "order-reviewed"
  | "order-rejected"
  | "appointment-created"
  | "appointment-confirmed"
  | "patient-arrived"
  | "patient-checked-in"
  | "safety-screening-started"
  | "safety-screening-cleared"
  | "safety-screening-failed"
  | "contrast-approved"
  | "contrast-administered"
  | "study-started"
  | "study-completed"
  | "quality-review-completed"
  | "additional-images-requested"
  | "report-created"
  | "report-verified"
  | "report-released"
  | "critical-alert-created"
  | "critical-alert-communicated"
  | "critical-alert-acknowledged"
  | "report-corrected"
  | "report-amended"
  | "order-cancelled"
  | "entered-in-error";

export interface RadiologyOrder {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  orderingBranchId: WonFlowId;
  performingBranchId: WonFlowId;

  orderingDepartmentId: WonFlowId;
  performingRadiologyDepartmentId?: WonFlowId;

  encounterId: WonFlowId;
  consultationId?: WonFlowId;
  patientJourneyId?: WonFlowId;
  careEpisodeId?: WonFlowId;
  treatmentPlanId?: WonFlowId;
  admissionId?: WonFlowId;

  /**
   * Example:
   * RAD-ORD-2026-000481
   */
  orderNumber: string;

  type: RadiologyOrderType;
  source: RadiologyOrderSource;
  priority: RadiologyPriority;
  status: RadiologyOrderStatus;

  orderingPractitionerId: WonFlowId;
  orderingUserId: WonFlowId;

  clinicalIndication: string;
  provisionalDiagnosis?: string;
  relevantClinicalHistory?: string;
  clinicalQuestion?: string;

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

  rejectedByUserId?: WonFlowId;
  rejectedAt?: IsoDateTime;
  rejectionReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologyOrderItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;
  radiologyOrderId: WonFlowId;

  sequenceNumber: number;

  procedureCode: string;
  procedureDisplayName: string;

  modality: RadiologyModality;
  bodySiteCode?: string;
  bodySiteDisplayName: string;
  laterality: RadiologyLaterality;

  status: RadiologyOrderItemStatus;
  priority: RadiologyPriority;

  serviceCode?: string;

  contrastRequested: boolean;
  sedationRequirement: SedationRequirement;

  specialInstructions?: string;
  preparationInstructions?: string;

  requestedAt?: IsoDateTime;
  scheduledAt?: IsoDateTime;
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  reportedAt?: IsoDateTime;
  verifiedAt?: IsoDateTime;
  releasedAt?: IsoDateTime;

  appointmentId?: WonFlowId;
  studyId?: WonFlowId;
  reportId?: WonFlowId;

  performedByExternalProvider: boolean;
  externalProviderId?: WonFlowId;

  cancellationReason?: string;
  rejectionReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologyProtocol {
  id: WonFlowId;

  organizationId: WonFlowId;

  code: string;
  name: string;
  description?: string;

  modality: RadiologyModality;
  procedureCode: string;

  bodySiteCode?: string;
  bodySiteDisplayName?: string;

  contrastRequired: boolean;
  allowedContrastTypes: ContrastType[];

  sedationRequirement: SedationRequirement;

  estimatedDurationMinutes: number;
  preparationDurationMinutes: number;
  recoveryDurationMinutes: number;

  fastingRequired: boolean;
  fastingDurationHours?: number;

  renalFunctionRequired: boolean;
  pregnancyScreeningRequired: boolean;
  implantScreeningRequired: boolean;
  consentRequired: boolean;

  preparationInstructions?: string;
  acquisitionInstructions?: string;
  postProcedureInstructions?: string;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologyAppointment {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  radiologyOrderId: WonFlowId;
  radiologyOrderItemId: WonFlowId;

  branchId: WonFlowId;
  radiologyDepartmentId: WonFlowId;

  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  roomId: WonFlowId;
  equipmentId: WonFlowId;

  protocolId?: WonFlowId;

  /**
   * Example:
   * RAD-APT-2026-000294
   */
  appointmentNumber: string;

  status: RadiologyAppointmentStatus;

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  arrivalWindowStartsAt?: IsoDateTime;
  arrivalWindowEndsAt?: IsoDateTime;

  preparationStatus: RadiologyPreparationStatus;
  safetyScreeningStatus: RadiologySafetyScreeningStatus;

  patientConfirmationRequired: boolean;
  patientConfirmedAt?: IsoDateTime;

  appointmentInstructions?: string;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologyResourceReservation {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  radiologyAppointmentId: WonFlowId;

  resourceType:
    | "equipment"
    | "room"
    | "radiographer"
    | "radiologist"
    | "nurse"
    | "anaesthetist"
    | "recovery-bed"
    | "other";

  resourceId: WonFlowId;

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  status:
    | "reserved"
    | "confirmed"
    | "released"
    | "cancelled"
    | "expired";

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologyPatientPreparation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  radiologyOrderId: WonFlowId;
  radiologyOrderItemId: WonFlowId;
  appointmentId?: WonFlowId;

  status: RadiologyPreparationStatus;

  fastingRequired: boolean;
  fastingDurationHours?: number;

  hydrationRequired: boolean;
  medicationAdjustmentRequired: boolean;
  medicationAdjustmentInstructions?: string;

  clothingOrJewelleryInstructions?: string;
  arrivalInstructions?: string;
  postProcedureTransportRequired: boolean;

  instructionsSentAt?: IsoDateTime;
  confirmedByPatientAt?: IsoDateTime;
  confirmedByUserId?: WonFlowId;

  waiverReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologySafetyScreening {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  radiologyOrderId: WonFlowId;
  radiologyOrderItemId: WonFlowId;
  appointmentId?: WonFlowId;

  status: RadiologySafetyScreeningStatus;

  pregnancyStatus:
    | "not-applicable"
    | "not-pregnant"
    | "possibly-pregnant"
    | "pregnant"
    | "unknown"
    | "patient-declined";

  lastMenstrualPeriodDate?: string;

  contrastAllergyKnown: boolean;
  contrastAllergyDetails?: string;

  renalFunctionReviewed: boolean;
  latestRenalResultId?: WonFlowId;

  implantsPresent: boolean;
  implantDetails?: string;

  pacemakerPresent: boolean;
  metallicForeignBodyRisk: boolean;
  claustrophobiaPresent: boolean;

  infectionControlRequired: boolean;
  infectionControlDetails?: string;

  mobilitySupportRequired: boolean;
  sedationRequired: boolean;

  screenedByUserId?: WonFlowId;
  screenedByPractitionerId?: WonFlowId;

  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;

  clearanceNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologySafetyRisk {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  safetyScreeningId: WonFlowId;

  type: RadiologySafetyRiskType;
  severity: RadiologySafetyRiskSeverity;

  title: string;
  description: string;

  recommendedAction?: string;

  status:
    | "unresolved"
    | "acknowledged"
    | "resolved"
    | "accepted-risk"
    | "not-applicable";

  acknowledgedByUserId?: WonFlowId;
  acknowledgedAt?: IsoDateTime;

  resolvedByUserId?: WonFlowId;
  resolvedAt?: IsoDateTime;
  resolutionNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologyContrastAdministration {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  radiologyOrderId: WonFlowId;
  radiologyOrderItemId: WonFlowId;
  studyId?: WonFlowId;

  contrastType: ContrastType;
  contrastProductCode?: string;
  contrastProductDisplayName?: string;

  status: ContrastAdministrationStatus;

  route:
    | "oral"
    | "intravenous"
    | "rectal"
    | "intra-articular"
    | "other";

  plannedVolume?: number;
  administeredVolume?: number;
  volumeUnit?: string;

  batchNumber?: string;
  expiryDate?: string;

  approvedByPractitionerId?: WonFlowId;
  approvedAt?: IsoDateTime;

  administeredByUserId?: WonFlowId;
  administeredAt?: IsoDateTime;

  adverseReactionOccurred: boolean;
  adverseReactionDescription?: string;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologyStudy {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  radiologyOrderId: WonFlowId;
  radiologyOrderItemId: WonFlowId;
  appointmentId?: WonFlowId;

  branchId: WonFlowId;
  radiologyDepartmentId: WonFlowId;

  servicePointId?: WonFlowId;
  roomId: WonFlowId;
  equipmentId: WonFlowId;

  encounterId?: WonFlowId;

  /**
   * Example:
   * RAD-STU-2026-000817
   */
  studyNumber: string;

  /**
   * External imaging-system identifier.
   */
  studyInstanceUid?: string;
  accessionNumber?: string;

  modality: RadiologyModality;

  procedureCode: string;
  procedureDisplayName: string;

  bodySiteCode?: string;
  bodySiteDisplayName: string;
  laterality: RadiologyLaterality;

  status: RadiologyStudyStatus;
  qualityStatus: RadiologyStudyQualityStatus;

  protocolId?: WonFlowId;

  performingRadiographerUserId?: WonFlowId;
  supervisingPractitionerId?: WonFlowId;

  startedAt?: IsoDateTime;
  acquisitionCompletedAt?: IsoDateTime;
  qualityReviewedAt?: IsoDateTime;
  completedAt?: IsoDateTime;

  patientPosition?: string;
  techniqueSummary?: string;

  radiationDoseValue?: number;
  radiationDoseUnit?: string;

  repeatReason?: string;
  cancellationReason?: string;
  notPerformedReason?: string;

  externalPacsStudyReference?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologyImageSeries {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;
  studyId: WonFlowId;

  seriesInstanceUid?: string;
  seriesNumber?: number;

  modality: RadiologyModality;

  description?: string;
  bodySite?: string;

  imageCount?: number;

  acquisitionStartedAt?: IsoDateTime;
  acquisitionCompletedAt?: IsoDateTime;

  qualityStatus: RadiologyStudyQualityStatus;

  externalPacsSeriesReference?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologyImageReference {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  studyId: WonFlowId;
  seriesId: WonFlowId;

  sopInstanceUid?: string;
  instanceNumber?: number;

  mediaType?: string;

  /**
   * Secure external or internal imaging-system reference.
   *
   * The browser should not receive unrestricted storage paths.
   */
  secureImageReference: string;

  keyImage: boolean;
  keyImageReason?: string;

  createdAt: IsoDateTime;
}

export interface RadiologyWorklistItem {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  branchId: WonFlowId;
  radiologyDepartmentId: WonFlowId;

  radiologyOrderId: WonFlowId;
  radiologyOrderItemId: WonFlowId;
  appointmentId?: WonFlowId;
  studyId?: WonFlowId;

  modality: RadiologyModality;
  priority: RadiologyPriority;

  status:
    | "waiting"
    | "patient-arrived"
    | "ready"
    | "in-progress"
    | "awaiting-quality-review"
    | "awaiting-report"
    | "awaiting-verification"
    | "completed"
    | "cancelled";

  assignedRadiographerUserId?: WonFlowId;
  assignedRadiologistPractitionerId?: WonFlowId;

  scheduledAt?: IsoDateTime;
  startedAt?: IsoDateTime;
  dueAt?: IsoDateTime;
  completedAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologyFinding {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  studyId: WonFlowId;
  reportId?: WonFlowId;

  sequenceNumber: number;

  title: string;
  description: string;

  bodySite?: string;
  laterality?: RadiologyLaterality;

  terminologySystem?: string;
  terminologyCode?: string;
  terminologyDisplay?: string;

  significance: RadiologyFindingSignificance;

  comparisonStudyId?: WonFlowId;
  comparisonStatement?: string;

  recommendation?: string;
  followUpRequired: boolean;
  suggestedFollowUpInterval?: string;

  createdByPractitionerId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RadiologyReport {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  radiologyOrderId: WonFlowId;
  radiologyOrderItemId: WonFlowId;
  studyId: WonFlowId;
  encounterId?: WonFlowId;

  /**
   * Example:
   * RAD-RPT-2026-000736
   */
  reportNumber: string;

  status: RadiologyReportStatus;

  title: string;

  clinicalHistory?: string;
  technique?: string;
  comparison?: string;
  findingsText: string;
  impressionText: string;
  recommendationText?: string;

  findingIds: WonFlowId[];

  preliminary: boolean;
  containsUrgentFindings: boolean;
  containsCriticalFindings: boolean;

  authorPractitionerId: WonFlowId;
  authorUserId: WonFlowId;

  createdAt: IsoDateTime;

  verifiedByPractitionerId?: WonFlowId;
  verifiedByUserId?: WonFlowId;
  verifiedAt?: IsoDateTime;

  releasedByUserId?: WonFlowId;
  releasedAt?: IsoDateTime;

  releasedToOrderingPractitioner: boolean;
  releasedToPatientAccess: boolean;
  patientAccessReleasedAt?: IsoDateTime;

  supersededByReportId?: WonFlowId;

  updatedAt: IsoDateTime;
}

export interface CriticalRadiologyFindingAlert {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  radiologyOrderId: WonFlowId;
  radiologyOrderItemId: WonFlowId;
  studyId: WonFlowId;
  reportId?: WonFlowId;
  findingId: WonFlowId;

  encounterId?: WonFlowId;

  status: CriticalRadiologyAlertStatus;

  findingSummary: string;
  criticalReason: string;

  detectedByPractitionerId?: WonFlowId;
  detectedByUserId?: WonFlowId;
  detectedBySystem: boolean;
  detectedAt: IsoDateTime;

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

export interface CriticalRadiologyFindingCommunication {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  criticalAlertId: WonFlowId;

  attemptNumber: number;
  method: RadiologyCommunicationMethod;

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
  communicatedByPractitionerId?: WonFlowId;
  communicatedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface CriticalRadiologyFindingAcknowledgement {
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

export interface RadiologyReportAmendment {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  reportId: WonFlowId;

  type:
    | "correction"
    | "addendum"
    | "clarification"
    | "comparison-update"
    | "patient-identification-correction"
    | "other";

  reason: string;
  amendmentText: string;

  amendedByUserId: WonFlowId;
  amendedByPractitionerId?: WonFlowId;

  verifiedByUserId?: WonFlowId;
  verifiedByPractitionerId?: WonFlowId;
  verifiedAt?: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface ExternalRadiologyStudy {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  externalProviderName: string;
  externalStudyReference?: string;

  modality: RadiologyModality;
  procedureDisplayName: string;

  performedAt?: IsoDateTime;

  reportDocumentId?: WonFlowId;
  imageArchiveReference?: string;

  importedByUserId: WonFlowId;
  importedAt: IsoDateTime;

  verifiedPatientMatch: boolean;
  verifiedByUserId?: WonFlowId;
  verifiedAt?: IsoDateTime;
}

export interface RadiologyWorkflowEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  radiologyOrderId: WonFlowId;

  radiologyOrderItemId?: WonFlowId;
  appointmentId?: WonFlowId;
  studyId?: WonFlowId;
  reportId?: WonFlowId;
  criticalAlertId?: WonFlowId;

  type: RadiologyWorkflowEventType;

  previousStatus?: string;
  newStatus?: string;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedByPractitionerId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface RadiologyOrderAggregate {
  order: RadiologyOrder;
  orderItems: RadiologyOrderItem[];

  protocols: RadiologyProtocol[];

  appointments: RadiologyAppointment[];
  resourceReservations: RadiologyResourceReservation[];
  preparations: RadiologyPatientPreparation[];

  safetyScreenings: RadiologySafetyScreening[];
  safetyRisks: RadiologySafetyRisk[];
  contrastAdministrations: RadiologyContrastAdministration[];

  studies: RadiologyStudy[];
  series: RadiologyImageSeries[];
  imageReferences: RadiologyImageReference[];

  worklistItems: RadiologyWorklistItem[];

  findings: RadiologyFinding[];
  reports: RadiologyReport[];
  reportAmendments: RadiologyReportAmendment[];

  criticalAlerts: CriticalRadiologyFindingAlert[];
  criticalCommunications: CriticalRadiologyFindingCommunication[];
  criticalAcknowledgements: CriticalRadiologyFindingAcknowledgement[];

  externalStudies: ExternalRadiologyStudy[];

  events: RadiologyWorkflowEvent[];
}

export const WONFLOW_RADIOLOGY_ORDER_STATUS_TRANSITIONS: Record<
  RadiologyOrderStatus,
  readonly RadiologyOrderStatus[]
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
    "awaiting-clinical-review",
    "awaiting-authorization",
    "awaiting-payment",
    "ready-for-scheduling",
    "cancelled",
    "rejected",
  ],

  "awaiting-clinical-review": [
    "ready-for-scheduling",
    "cancelled",
    "rejected",
  ],

  "awaiting-authorization": [
    "ready-for-scheduling",
    "cancelled",
    "rejected",
  ],

  "awaiting-payment": [
    "ready-for-scheduling",
    "cancelled",
    "rejected",
  ],

  "ready-for-scheduling": [
    "scheduled",
    "cancelled",
    "rejected",
  ],

  scheduled: [
    "patient-arrived",
    "checked-in",
    "in-progress",
    "cancelled",
    "not-performed",
  ],

  "patient-arrived": [
    "checked-in",
    "in-progress",
    "cancelled",
    "not-performed",
  ],

  "checked-in": [
    "in-progress",
    "cancelled",
    "not-performed",
  ],

  "in-progress": [
    "partially-completed",
    "completed",
    "cancelled",
    "not-performed",
  ],

  "partially-completed": [
    "in-progress",
    "completed",
    "cancelled",
    "not-performed",
  ],

  completed: [
    "reported",
    "verified",
  ],

  reported: [
    "verified",
    "released",
  ],

  verified: [
    "released",
  ],

  released: [],
  cancelled: [],
  rejected: [],
  "not-performed": [],
  "entered-in-error": [],
};

export const WONFLOW_RADIOLOGY_STUDY_STATUS_TRANSITIONS: Record<
  RadiologyStudyStatus,
  readonly RadiologyStudyStatus[]
> = {
  planned: [
    "scheduled",
    "patient-arrived",
    "cancelled",
    "not-performed",
    "entered-in-error",
  ],

  scheduled: [
    "patient-arrived",
    "ready",
    "cancelled",
    "not-performed",
  ],

  "patient-arrived": [
    "ready",
    "acquisition-in-progress",
    "cancelled",
    "not-performed",
  ],

  ready: [
    "acquisition-in-progress",
    "cancelled",
    "not-performed",
  ],

  "acquisition-in-progress": [
    "acquisition-completed",
    "cancelled",
    "not-performed",
  ],

  "acquisition-completed": [
    "quality-review",
    "completed",
  ],

  "quality-review": [
    "additional-images-required",
    "completed",
  ],

  "additional-images-required": [
    "acquisition-in-progress",
    "acquisition-completed",
    "cancelled",
  ],

  completed: [],
  cancelled: [],
  "not-performed": [],
  "entered-in-error": [],
};

export const WONFLOW_RADIOLOGY_REPORT_STATUS_TRANSITIONS: Record<
  RadiologyReportStatus,
  readonly RadiologyReportStatus[]
> = {
  draft: [
    "preliminary",
    "awaiting-verification",
    "verified",
    "cancelled",
    "entered-in-error",
  ],

  preliminary: [
    "draft",
    "awaiting-verification",
    "verified",
    "cancelled",
  ],

  "awaiting-verification": [
    "draft",
    "verified",
    "cancelled",
    "entered-in-error",
  ],

  verified: [
    "released",
    "corrected",
    "amended",
    "entered-in-error",
  ],

  released: [
    "corrected",
    "amended",
    "entered-in-error",
  ],

  corrected: [
    "released",
    "amended",
    "entered-in-error",
  ],

  amended: [
    "released",
    "corrected",
    "amended",
    "entered-in-error",
  ],

  cancelled: [],
  "entered-in-error": [],
};

export const WONFLOW_CRITICAL_RADIOLOGY_ALERT_TRANSITIONS: Record<
  CriticalRadiologyAlertStatus,
  readonly CriticalRadiologyAlertStatus[]
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