import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

export type AdmissionType =
  | "planned"
  | "emergency"
  | "direct"
  | "opd-conversion"
  | "day-care-conversion"
  | "observation"
  | "inter-branch-transfer"
  | "external-transfer"
  | "newborn"
  | "other";

export type AdmissionSource =
  | "opd"
  | "emergency"
  | "procedure"
  | "operation-theatre"
  | "day-care"
  | "external-hospital"
  | "another-branch"
  | "direct-admission"
  | "home-care"
  | "system"
  | "other";

export type AdmissionPriority =
  | "routine"
  | "priority"
  | "urgent"
  | "emergency"
  | "critical";

export type AdmissionRequestStatus =
  | "draft"
  | "pending-clinical-review"
  | "pending-financial-clearance"
  | "pending-insurance-authorization"
  | "approved"
  | "partially-approved"
  | "waitlisted"
  | "rejected"
  | "cancelled"
  | "expired"
  | "converted-to-admission"
  | "entered-in-error";

export type AdmissionDecision =
  | "approved"
  | "partially-approved"
  | "waitlisted"
  | "rejected"
  | "additional-information-required";

export type InpatientAdmissionStatus =
  | "planned"
  | "awaiting-arrival"
  | "arrived"
  | "awaiting-bed"
  | "bed-assigned"
  | "admitted"
  | "temporarily-absent"
  | "transfer-pending"
  | "discharge-planning"
  | "discharge-ready"
  | "discharged"
  | "cancelled"
  | "deceased"
  | "left-against-medical-advice"
  | "absconded"
  | "entered-in-error";

export type InpatientCareLevel =
  | "general-ward"
  | "high-dependency"
  | "intensive-care"
  | "coronary-care"
  | "neonatal-intensive-care"
  | "paediatric-intensive-care"
  | "isolation"
  | "psychiatric-secure-care"
  | "maternity"
  | "observation"
  | "rehabilitation"
  | "palliative-care"
  | "other";

export type WardType =
  | "general"
  | "medical"
  | "surgical"
  | "paediatric"
  | "maternity"
  | "intensive-care"
  | "high-dependency"
  | "coronary-care"
  | "neonatal"
  | "isolation"
  | "psychiatric"
  | "rehabilitation"
  | "private"
  | "observation"
  | "other";

export type InpatientRoomType =
  | "shared"
  | "semi-private"
  | "private"
  | "isolation"
  | "intensive-care"
  | "high-dependency"
  | "observation"
  | "maternity"
  | "nursery"
  | "other";

export type BedClass =
  | "general"
  | "semi-private"
  | "private"
  | "vip"
  | "isolation"
  | "icu"
  | "hdu"
  | "ccu"
  | "nicu"
  | "picu"
  | "maternity"
  | "observation"
  | "other";

export type BedOperationalStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "cleaning"
  | "maintenance"
  | "blocked"
  | "isolation-restricted"
  | "out-of-service";

export type BedReservationStatus =
  | "requested"
  | "reserved"
  | "confirmed"
  | "committed"
  | "released"
  | "expired"
  | "cancelled"
  | "rejected";

export type BedAssignmentStatus =
  | "planned"
  | "active"
  | "temporarily-held"
  | "transferred"
  | "completed"
  | "cancelled"
  | "entered-in-error";

export type BedCompatibilityIssueType =
  | "wrong-care-level"
  | "wrong-patient-category"
  | "wrong-administrative-sex-policy"
  | "infection-control"
  | "isolation-required"
  | "equipment-required"
  | "oxygen-required"
  | "mobility-support-required"
  | "fall-risk"
  | "paediatric-restriction"
  | "maternity-restriction"
  | "staffing-insufficient"
  | "bed-unavailable"
  | "bed-out-of-service"
  | "financial-class-mismatch"
  | "other";

export type BedCompatibilitySeverity =
  | "information"
  | "warning"
  | "blocking";

export type InpatientTransferType =
  | "bed-to-bed"
  | "room-to-room"
  | "ward-to-ward"
  | "unit-to-unit"
  | "branch-to-branch"
  | "temporary-procedure-transfer"
  | "diagnostic-transfer"
  | "critical-care-escalation"
  | "critical-care-step-down"
  | "infection-control-transfer"
  | "administrative-transfer"
  | "other";

export type InpatientTransferStatus =
  | "draft"
  | "requested"
  | "pending-clinical-approval"
  | "pending-bed"
  | "approved"
  | "destination-ready"
  | "in-progress"
  | "received"
  | "completed"
  | "rejected"
  | "cancelled"
  | "entered-in-error";

export type PatientMovementType =
  | "admission"
  | "bed-assignment"
  | "bed-release"
  | "ward-transfer"
  | "room-transfer"
  | "bed-transfer"
  | "temporary-departure"
  | "temporary-return"
  | "procedure-departure"
  | "procedure-return"
  | "diagnostic-departure"
  | "diagnostic-return"
  | "branch-transfer"
  | "discharge"
  | "other";

export type TemporaryAbsenceStatus =
  | "requested"
  | "approved"
  | "departed"
  | "returned"
  | "overdue"
  | "cancelled"
  | "rejected";

export type DischargeProcessStatus =
  | "not-started"
  | "planning"
  | "pending-clinical-clearance"
  | "pending-medication"
  | "pending-investigations"
  | "pending-financial-clearance"
  | "pending-insurance-clearance"
  | "pending-transport"
  | "pending-patient-education"
  | "ready"
  | "ordered"
  | "completed"
  | "cancelled"
  | "entered-in-error";

export type DischargeDisposition =
  | "home"
  | "home-with-home-care"
  | "another-hospital"
  | "another-branch"
  | "rehabilitation-facility"
  | "nursing-facility"
  | "hospice"
  | "left-against-medical-advice"
  | "absconded"
  | "deceased"
  | "other";

export type DischargeClearanceType =
  | "primary-clinician"
  | "nursing"
  | "pharmacy"
  | "laboratory"
  | "radiology"
  | "procedure"
  | "physiotherapy"
  | "dietitian"
  | "social-work"
  | "medical-records"
  | "billing"
  | "insurance"
  | "equipment-return"
  | "transport"
  | "patient-education"
  | "other";

export type DischargeClearanceStatus =
  | "not-required"
  | "pending"
  | "in-progress"
  | "cleared"
  | "conditionally-cleared"
  | "blocked"
  | "waived"
  | "cancelled";

export type DischargeSummaryStatus =
  | "draft"
  | "in-progress"
  | "awaiting-signature"
  | "signed"
  | "released"
  | "amended"
  | "corrected"
  | "entered-in-error";

export type InpatientEventType =
  | "admission-request-created"
  | "admission-request-approved"
  | "admission-request-rejected"
  | "admission-created"
  | "patient-arrived"
  | "bed-requested"
  | "bed-reserved"
  | "bed-assigned"
  | "patient-admitted"
  | "bed-released"
  | "transfer-requested"
  | "transfer-approved"
  | "transfer-started"
  | "transfer-received"
  | "transfer-completed"
  | "temporary-absence-started"
  | "temporary-absence-ended"
  | "discharge-planning-started"
  | "discharge-clearance-updated"
  | "discharge-ordered"
  | "discharge-summary-signed"
  | "patient-discharged"
  | "left-against-medical-advice"
  | "patient-absconded"
  | "patient-deceased"
  | "entered-in-error";

export interface InpatientWard {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  branchDepartmentId: WonFlowId;
  operationalUnitId?: WonFlowId;

  code: string;
  name: string;
  type: WardType;

  careLevels: InpatientCareLevel[];

  maximumCapacity: number;

  supportsIsolation: boolean;
  supportsPaediatricPatients: boolean;
  supportsMaternityPatients: boolean;
  supportsCriticalCare: boolean;

  genderPolicy:
    | "mixed"
    | "separate-rooms"
    | "male-only"
    | "female-only"
    | "paediatric"
    | "not-applicable";

  nurseStationServicePointId?: WonFlowId;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InpatientRoom {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;
  wardId: WonFlowId;

  code: string;
  name: string;
  type: InpatientRoomType;

  floorLabel?: string;
  zoneLabel?: string;

  maximumBeds: number;

  isolationCapable: boolean;
  negativePressureAvailable: boolean;
  oxygenAvailable: boolean;
  monitoringAvailable: boolean;

  accessibilityFeatures: string[];

  genderPolicy:
    | "mixed"
    | "male-only"
    | "female-only"
    | "paediatric"
    | "maternity"
    | "not-applicable";

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InpatientBed {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  wardId: WonFlowId;
  roomId: WonFlowId;

  code: string;
  displayName: string;

  bedClass: BedClass;
  careLevels: InpatientCareLevel[];

  operationalStatus: BedOperationalStatus;

  oxygenAvailable: boolean;
  monitoringAvailable: boolean;
  ventilatorCompatible: boolean;
  mobilitySupportAvailable: boolean;
  bariatricCompatible: boolean;

  maximumPatientWeightKg?: number;

  currentBedAssignmentId?: WonFlowId;
  currentPatientId?: WonFlowId;
  currentAdmissionId?: WonFlowId;

  lastCleanedAt?: IsoDateTime;
  nextMaintenanceAt?: IsoDateTime;

  blockedReason?: string;
  outOfServiceReason?: string;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AdmissionRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  requestingBranchId: WonFlowId;
  requestedAdmissionBranchId: WonFlowId;

  requestingDepartmentId: WonFlowId;
  requestedWardId?: WonFlowId;

  encounterId: WonFlowId;
  consultationId?: WonFlowId;
  patientJourneyId?: WonFlowId;
  careEpisodeId?: WonFlowId;

  appointmentId?: WonFlowId;
  procedureId?: WonFlowId;
  emergencyEncounterId?: WonFlowId;
  referralId?: WonFlowId;

  /**
   * Example:
   * ADM-REQ-2026-000481
   */
  admissionRequestNumber: string;

  type: AdmissionType;
  source: AdmissionSource;
  priority: AdmissionPriority;
  status: AdmissionRequestStatus;

  requestingPractitionerId: WonFlowId;
  requestedByUserId: WonFlowId;

  reasonForAdmission: string;
  provisionalDiagnosis?: string;
  diagnosisCodes: string[];

  requestedCareLevel: InpatientCareLevel;
  requestedBedClass?: BedClass;

  isolationRequired: boolean;
  infectionControlNotes?: string;

  oxygenRequired: boolean;
  monitoringRequired: boolean;
  ventilatorRequired: boolean;
  mobilitySupportRequired: boolean;

  plannedAdmissionAt?: IsoDateTime;
  estimatedLengthOfStayDays?: number;

  financialClearanceRequired: boolean;
  financialClearanceId?: WonFlowId;

  insuranceAuthorizationRequired: boolean;
  insuranceAuthorizationId?: WonFlowId;

  consentRequired: boolean;
  consentDocumentId?: WonFlowId;

  supportingDocumentIds: WonFlowId[];

  expiresAt?: IsoDateTime;

  cancelledByUserId?: WonFlowId;
  cancelledAt?: IsoDateTime;
  cancellationReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AdmissionDecisionRecord {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;
  admissionRequestId: WonFlowId;

  decision: AdmissionDecision;

  approvedBranchId?: WonFlowId;
  approvedWardId?: WonFlowId;
  approvedCareLevel?: InpatientCareLevel;
  approvedBedClass?: BedClass;

  approvedLengthOfStayDays?: number;

  conditions?: string;
  rejectionReason?: string;
  additionalInformationRequired?: string;

  decidedByUserId: WonFlowId;
  decidedByPractitionerId?: WonFlowId;

  decidedAt: IsoDateTime;
}

export interface InpatientAdmission {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  branchId: WonFlowId;

  admissionRequestId?: WonFlowId;
  sourceEncounterId: WonFlowId;
  inpatientEncounterId: WonFlowId;

  patientJourneyId?: WonFlowId;
  careEpisodeId?: WonFlowId;
  referralId?: WonFlowId;

  /**
   * Example:
   * ADM-2026-000481
   */
  admissionNumber: string;

  type: AdmissionType;
  source: AdmissionSource;
  priority: AdmissionPriority;
  status: InpatientAdmissionStatus;

  currentCareLevel: InpatientCareLevel;

  attendingPractitionerId: WonFlowId;
  admittingPractitionerId: WonFlowId;

  currentWardId?: WonFlowId;
  currentRoomId?: WonFlowId;
  currentBedId?: WonFlowId;
  currentBedAssignmentId?: WonFlowId;

  admissionDiagnosis?: string;
  diagnosisCodes: string[];

  plannedAdmissionAt?: IsoDateTime;
  arrivedAt?: IsoDateTime;
  admittedAt?: IsoDateTime;

  expectedDischargeAt?: IsoDateTime;
  actualDischargeAt?: IsoDateTime;

  dischargeProcessId?: WonFlowId;

  financialAccountId?: WonFlowId;
  insuranceCoverageId?: WonFlowId;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BedRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  branchId: WonFlowId;

  admissionRequestId?: WonFlowId;
  admissionId?: WonFlowId;
  transferRequestId?: WonFlowId;

  requestedWardId?: WonFlowId;
  requestedRoomId?: WonFlowId;
  requestedBedClass?: BedClass;
  requiredCareLevel: InpatientCareLevel;

  isolationRequired: boolean;
  oxygenRequired: boolean;
  monitoringRequired: boolean;
  ventilatorRequired: boolean;
  bariatricBedRequired: boolean;
  mobilitySupportRequired: boolean;

  administrativeSexPolicyValue?:
    | "male"
    | "female"
    | "unknown"
    | "not-applicable";

  priority: AdmissionPriority;

  status:
    | "requested"
    | "searching"
    | "matched"
    | "no-bed-available"
    | "reserved"
    | "fulfilled"
    | "cancelled";

  requestedByUserId: WonFlowId;
  requestedAt: IsoDateTime;

  matchedBedId?: WonFlowId;
  matchedAt?: IsoDateTime;

  fulfilledAt?: IsoDateTime;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BedCompatibilityIssue {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  bedRequestId: WonFlowId;
  bedId?: WonFlowId;

  type: BedCompatibilityIssueType;
  severity: BedCompatibilitySeverity;

  title: string;
  description: string;

  blocking: boolean;

  acknowledgedByUserId?: WonFlowId;
  acknowledgedAt?: IsoDateTime;

  overriddenByUserId?: WonFlowId;
  overriddenAt?: IsoDateTime;
  overrideReason?: string;

  resolvedAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BedReservation {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  branchId: WonFlowId;
  wardId: WonFlowId;
  roomId: WonFlowId;
  bedId: WonFlowId;

  bedRequestId: WonFlowId;

  admissionRequestId?: WonFlowId;
  admissionId?: WonFlowId;
  transferRequestId?: WonFlowId;

  status: BedReservationStatus;

  priority: AdmissionPriority;

  idempotencyKey: string;

  reservedByUserId?: WonFlowId;
  reservedBySystem: boolean;

  reservedAt: IsoDateTime;
  expiresAt?: IsoDateTime;

  confirmedAt?: IsoDateTime;
  committedAt?: IsoDateTime;

  releasedByUserId?: WonFlowId;
  releasedAt?: IsoDateTime;
  releaseReason?: string;

  cancelledAt?: IsoDateTime;
  cancellationReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BedAssignment {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;

  branchId: WonFlowId;
  wardId: WonFlowId;
  roomId: WonFlowId;
  bedId: WonFlowId;

  bedReservationId?: WonFlowId;

  status: BedAssignmentStatus;

  assignedByUserId: WonFlowId;
  assignedAt: IsoDateTime;

  occupancyStartedAt?: IsoDateTime;

  temporarilyHeldAt?: IsoDateTime;
  temporaryHoldReason?: string;

  releasedByUserId?: WonFlowId;
  releasedAt?: IsoDateTime;
  releaseReason?: string;

  transferredToBedAssignmentId?: WonFlowId;
  transferredFromBedAssignmentId?: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BedStatusEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  bedId: WonFlowId;

  previousStatus?: BedOperationalStatus;
  newStatus: BedOperationalStatus;

  admissionId?: WonFlowId;
  patientId?: WonFlowId;
  bedAssignmentId?: WonFlowId;

  reason?: string;

  changedByUserId?: WonFlowId;
  changedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface InpatientWardTransferRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;

  type: InpatientTransferType;
  status: InpatientTransferStatus;
  priority: AdmissionPriority;

  fromBranchId: WonFlowId;
  fromWardId: WonFlowId;
  fromRoomId?: WonFlowId;
  fromBedId?: WonFlowId;
  fromBedAssignmentId?: WonFlowId;

  requestedToBranchId: WonFlowId;
  requestedToWardId?: WonFlowId;
  requestedToRoomId?: WonFlowId;
  requestedToBedId?: WonFlowId;

  requestedCareLevel: InpatientCareLevel;
  requestedBedClass?: BedClass;

  clinicalReason: string;
  administrativeReason?: string;

  isolationRequired: boolean;
  oxygenRequired: boolean;
  monitoringRequired: boolean;
  ventilatorRequired: boolean;

  requestedByUserId: WonFlowId;
  requestedByPractitionerId?: WonFlowId;
  requestedAt: IsoDateTime;

  approvedByUserId?: WonFlowId;
  approvedByPractitionerId?: WonFlowId;
  approvedAt?: IsoDateTime;

  rejectedByUserId?: WonFlowId;
  rejectedAt?: IsoDateTime;
  rejectionReason?: string;

  destinationBedReservationId?: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InpatientWardTransfer {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  transferRequestId: WonFlowId;

  type: InpatientTransferType;
  status: InpatientTransferStatus;

  fromBranchId: WonFlowId;
  fromWardId: WonFlowId;
  fromRoomId?: WonFlowId;
  fromBedId?: WonFlowId;
  fromBedAssignmentId?: WonFlowId;

  toBranchId: WonFlowId;
  toWardId: WonFlowId;
  toRoomId?: WonFlowId;
  toBedId?: WonFlowId;
  toBedAssignmentId?: WonFlowId;

  clinicalHandoverId?: WonFlowId;

  transferStartedByUserId?: WonFlowId;
  transferStartedAt?: IsoDateTime;

  receivedByUserId?: WonFlowId;
  receivedAt?: IsoDateTime;

  completedByUserId?: WonFlowId;
  completedAt?: IsoDateTime;

  cancelledByUserId?: WonFlowId;
  cancelledAt?: IsoDateTime;
  cancellationReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InpatientClinicalHandover {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  transferRequestId?: WonFlowId;
  transferId?: WonFlowId;

  fromWardId: WonFlowId;
  toWardId: WonFlowId;

  handoverType:
    | "nursing"
    | "medical"
    | "multidisciplinary"
    | "critical-care"
    | "branch-transfer";

  situationSummary: string;
  backgroundSummary?: string;
  currentAssessment: string;
  recommendations: string;

  activeRisks: string[];
  activeMedicationRequestIds: WonFlowId[];
  pendingLaboratoryOrderIds: WonFlowId[];
  pendingRadiologyOrderIds: WonFlowId[];
  pendingClinicalTaskIds: WonFlowId[];

  equipmentTransferred: string[];
  patientBelongingsTransferred: boolean;
  documentsTransferred: boolean;

  handedOverByUserId: WonFlowId;
  handedOverByPractitionerId?: WonFlowId;
  handedOverAt: IsoDateTime;

  receivedByUserId?: WonFlowId;
  receivedByPractitionerId?: WonFlowId;
  receivedAt?: IsoDateTime;

  acknowledgementNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientMovementEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;

  type: PatientMovementType;

  fromBranchId?: WonFlowId;
  fromWardId?: WonFlowId;
  fromRoomId?: WonFlowId;
  fromBedId?: WonFlowId;

  toBranchId?: WonFlowId;
  toWardId?: WonFlowId;
  toRoomId?: WonFlowId;
  toBedId?: WonFlowId;

  transferId?: WonFlowId;
  bedAssignmentId?: WonFlowId;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface InpatientTemporaryAbsence {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  bedAssignmentId?: WonFlowId;

  status: TemporaryAbsenceStatus;

  reason:
    | "diagnostic-service"
    | "procedure"
    | "therapy"
    | "authorized-leave"
    | "external-service"
    | "other";

  destination?: string;

  bedHeld: boolean;
  expectedReturnAt?: IsoDateTime;

  requestedByUserId?: WonFlowId;
  approvedByUserId?: WonFlowId;
  approvedByPractitionerId?: WonFlowId;

  departedAt?: IsoDateTime;
  returnedAt?: IsoDateTime;

  overdueAt?: IsoDateTime;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DischargeProcess {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;

  status: DischargeProcessStatus;

  plannedDisposition: DischargeDisposition;

  expectedDischargeAt?: IsoDateTime;

  initiatedByUserId: WonFlowId;
  initiatedByPractitionerId?: WonFlowId;
  initiatedAt: IsoDateTime;

  dischargeOrderId?: WonFlowId;
  dischargeSummaryId?: WonFlowId;

  finalInvoiceId?: WonFlowId;
  followUpAppointmentId?: WonFlowId;

  transportRequired: boolean;
  homeCareRequired: boolean;
  equipmentRequired: boolean;

  patientEducationCompleted: boolean;
  medicationReconciliationCompleted: boolean;
  pendingResultsReviewed: boolean;

  completedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;
  cancellationReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DischargePlan {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  dischargeProcessId: WonFlowId;

  plannedDisposition: DischargeDisposition;

  estimatedDischargeDate?: string;

  clinicalReadinessSummary?: string;

  homeEnvironmentReviewed: boolean;
  caregiverAvailable: boolean;
  caregiverDetails?: string;

  transportRequired: boolean;
  transportArrangement?: string;

  homeCareRequired: boolean;
  homeCareReferralId?: WonFlowId;

  rehabilitationRequired: boolean;
  rehabilitationReferralId?: WonFlowId;

  equipmentRequired: boolean;
  requiredEquipment: string[];

  medicationReviewRequired: boolean;
  patientEducationRequired: boolean;

  followUpRequired: boolean;
  followUpInstructions?: string;

  socialWorkRequired: boolean;
  socialWorkNotes?: string;

  barriers: string[];
  barrierResolutionPlan?: string;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DischargeClearance {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  dischargeProcessId: WonFlowId;

  type: DischargeClearanceType;
  status: DischargeClearanceStatus;

  required: boolean;

  assignedUserId?: WonFlowId;
  assignedDepartmentId?: WonFlowId;

  blockingReason?: string;
  conditions?: string;
  notes?: string;

  clearedByUserId?: WonFlowId;
  clearedByPractitionerId?: WonFlowId;
  clearedAt?: IsoDateTime;

  waivedByUserId?: WonFlowId;
  waivedAt?: IsoDateTime;
  waiverReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DischargeOrder {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  dischargeProcessId: WonFlowId;

  disposition: DischargeDisposition;

  dischargeReason: string;

  clinicallyReady: boolean;

  pendingResultsExist: boolean;
  pendingResultInstructions?: string;

  medicationReconciliationCompleted: boolean;
  dischargeMedicationRequestIds: WonFlowId[];

  followUpRequired: boolean;
  followUpAppointmentId?: WonFlowId;
  followUpInstructions?: string;

  activityInstructions?: string;
  dietInstructions?: string;
  woundCareInstructions?: string;
  warningSigns?: string;

  orderedByUserId: WonFlowId;
  orderedByPractitionerId: WonFlowId;
  orderedAt: IsoDateTime;

  cancelledByUserId?: WonFlowId;
  cancelledAt?: IsoDateTime;
  cancellationReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DischargeSummary {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  dischargeProcessId: WonFlowId;
  dischargeOrderId: WonFlowId;

  /**
   * Example:
   * DIS-SUM-2026-000481
   */
  summaryNumber: string;

  status: DischargeSummaryStatus;

  admissionReason: string;
  admissionDiagnosis?: string;
  dischargeDiagnosis: string;

  diagnosisCodes: string[];

  clinicalCourseSummary: string;
  significantFindings?: string;
  proceduresPerformed?: string;
  complications?: string;

  conditionAtDischarge: string;

  dischargeMedicationSummary?: string;
  pendingResultSummary?: string;

  followUpPlan?: string;
  patientInstructions?: string;
  warningSigns?: string;

  disposition: DischargeDisposition;

  authorUserId: WonFlowId;
  authorPractitionerId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;

  signedByPractitionerId?: WonFlowId;
  signedAt?: IsoDateTime;

  releasedToPatientAccess: boolean;
  releasedAt?: IsoDateTime;

  supersededBySummaryId?: WonFlowId;

  enteredInErrorAt?: IsoDateTime;
  enteredInErrorByUserId?: WonFlowId;
  enteredInErrorReason?: string;
}

export interface DischargeCompletion {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionId: WonFlowId;
  dischargeProcessId: WonFlowId;
  dischargeOrderId: WonFlowId;
  dischargeSummaryId?: WonFlowId;

  disposition: DischargeDisposition;

  clinicalClearanceCompleted: boolean;
  nursingClearanceCompleted: boolean;
  pharmacyClearanceCompleted: boolean;
  financialClearanceCompleted: boolean;
  insuranceClearanceCompleted: boolean;

  patientInstructionsProvided: boolean;
  patientUnderstandingConfirmed: boolean;

  belongingsReturned: boolean;
  equipmentReturned: boolean;
  documentsProvided: boolean;

  transportConfirmed: boolean;

  patientLeftAt: IsoDateTime;

  completedByUserId: WonFlowId;
  completedAt: IsoDateTime;

  finalBedAssignmentId?: WonFlowId;

  createdAt: IsoDateTime;
}

export interface InpatientEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  admissionRequestId?: WonFlowId;
  admissionId?: WonFlowId;

  bedRequestId?: WonFlowId;
  bedReservationId?: WonFlowId;
  bedAssignmentId?: WonFlowId;

  transferRequestId?: WonFlowId;
  transferId?: WonFlowId;

  dischargeProcessId?: WonFlowId;
  dischargeOrderId?: WonFlowId;
  dischargeSummaryId?: WonFlowId;

  type: InpatientEventType;

  previousStatus?: string;
  newStatus?: string;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedByPractitionerId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface InpatientAdmissionAggregate {
  admissionRequests: AdmissionRequest[];
  admissionDecisions: AdmissionDecisionRecord[];

  admission: InpatientAdmission;

  wards: InpatientWard[];
  rooms: InpatientRoom[];
  beds: InpatientBed[];

  bedRequests: BedRequest[];
  compatibilityIssues: BedCompatibilityIssue[];
  bedReservations: BedReservation[];
  bedAssignments: BedAssignment[];
  bedStatusEvents: BedStatusEvent[];

  transferRequests: InpatientWardTransferRequest[];
  transfers: InpatientWardTransfer[];
  handovers: InpatientClinicalHandover[];

  movementEvents: PatientMovementEvent[];
  temporaryAbsences: InpatientTemporaryAbsence[];

  dischargeProcesses: DischargeProcess[];
  dischargePlans: DischargePlan[];
  dischargeClearances: DischargeClearance[];
  dischargeOrders: DischargeOrder[];
  dischargeSummaries: DischargeSummary[];
  dischargeCompletions: DischargeCompletion[];

  events: InpatientEvent[];
}

export const WONFLOW_ADMISSION_REQUEST_STATUS_TRANSITIONS: Record<
  AdmissionRequestStatus,
  readonly AdmissionRequestStatus[]
> = {
  draft: [
    "pending-clinical-review",
    "pending-financial-clearance",
    "pending-insurance-authorization",
    "approved",
    "cancelled",
    "entered-in-error",
  ],

  "pending-clinical-review": [
    "pending-financial-clearance",
    "pending-insurance-authorization",
    "approved",
    "partially-approved",
    "waitlisted",
    "rejected",
    "cancelled",
  ],

  "pending-financial-clearance": [
    "pending-insurance-authorization",
    "approved",
    "partially-approved",
    "waitlisted",
    "rejected",
    "cancelled",
  ],

  "pending-insurance-authorization": [
    "approved",
    "partially-approved",
    "waitlisted",
    "rejected",
    "cancelled",
  ],

  approved: [
    "converted-to-admission",
    "cancelled",
    "expired",
  ],

  "partially-approved": [
    "approved",
    "converted-to-admission",
    "cancelled",
    "expired",
  ],

  waitlisted: [
    "approved",
    "partially-approved",
    "rejected",
    "cancelled",
    "expired",
  ],

  rejected: [],
  cancelled: [],
  expired: [],
  "converted-to-admission": [],
  "entered-in-error": [],
};

export const WONFLOW_INPATIENT_ADMISSION_STATUS_TRANSITIONS: Record<
  InpatientAdmissionStatus,
  readonly InpatientAdmissionStatus[]
> = {
  planned: [
    "awaiting-arrival",
    "arrived",
    "awaiting-bed",
    "cancelled",
    "entered-in-error",
  ],

  "awaiting-arrival": [
    "arrived",
    "awaiting-bed",
    "cancelled",
  ],

  arrived: [
    "awaiting-bed",
    "bed-assigned",
    "admitted",
    "cancelled",
  ],

  "awaiting-bed": [
    "bed-assigned",
    "admitted",
    "cancelled",
  ],

  "bed-assigned": [
    "admitted",
    "awaiting-bed",
    "cancelled",
  ],

  admitted: [
    "temporarily-absent",
    "transfer-pending",
    "discharge-planning",
    "discharge-ready",
    "discharged",
    "deceased",
    "left-against-medical-advice",
    "absconded",
    "entered-in-error",
  ],

  "temporarily-absent": [
    "admitted",
    "transfer-pending",
    "discharge-planning",
    "absconded",
  ],

  "transfer-pending": [
    "admitted",
    "temporarily-absent",
    "discharge-planning",
  ],

  "discharge-planning": [
    "admitted",
    "transfer-pending",
    "discharge-ready",
    "discharged",
    "deceased",
    "left-against-medical-advice",
    "absconded",
  ],

  "discharge-ready": [
    "admitted",
    "discharged",
    "deceased",
    "left-against-medical-advice",
    "absconded",
  ],

  discharged: [],
  cancelled: [],
  deceased: [],
  "left-against-medical-advice": [],
  absconded: [],
  "entered-in-error": [],
};

export const WONFLOW_BED_RESERVATION_STATUS_TRANSITIONS: Record<
  BedReservationStatus,
  readonly BedReservationStatus[]
> = {
  requested: [
    "reserved",
    "rejected",
    "cancelled",
    "expired",
  ],

  reserved: [
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

  committed: [],
  released: [],
  expired: [],
  cancelled: [],
  rejected: [],
};

export const WONFLOW_INPATIENT_TRANSFER_STATUS_TRANSITIONS: Record<
  InpatientTransferStatus,
  readonly InpatientTransferStatus[]
> = {
  draft: [
    "requested",
    "cancelled",
    "entered-in-error",
  ],

  requested: [
    "pending-clinical-approval",
    "pending-bed",
    "approved",
    "rejected",
    "cancelled",
  ],

  "pending-clinical-approval": [
    "pending-bed",
    "approved",
    "rejected",
    "cancelled",
  ],

  "pending-bed": [
    "approved",
    "destination-ready",
    "rejected",
    "cancelled",
  ],

  approved: [
    "destination-ready",
    "in-progress",
    "cancelled",
  ],

  "destination-ready": [
    "in-progress",
    "cancelled",
  ],

  "in-progress": [
    "received",
    "completed",
    "cancelled",
  ],

  received: [
    "completed",
  ],

  completed: [],
  rejected: [],
  cancelled: [],
  "entered-in-error": [],
};

export const WONFLOW_DISCHARGE_PROCESS_STATUS_TRANSITIONS: Record<
  DischargeProcessStatus,
  readonly DischargeProcessStatus[]
> = {
  "not-started": [
    "planning",
    "cancelled",
  ],

  planning: [
    "pending-clinical-clearance",
    "pending-medication",
    "pending-investigations",
    "pending-financial-clearance",
    "pending-insurance-clearance",
    "pending-transport",
    "pending-patient-education",
    "ready",
    "cancelled",
  ],

  "pending-clinical-clearance": [
    "planning",
    "pending-medication",
    "pending-investigations",
    "pending-financial-clearance",
    "ready",
    "cancelled",
  ],

  "pending-medication": [
    "planning",
    "pending-clinical-clearance",
    "pending-financial-clearance",
    "ready",
    "cancelled",
  ],

  "pending-investigations": [
    "planning",
    "pending-clinical-clearance",
    "pending-financial-clearance",
    "ready",
    "cancelled",
  ],

  "pending-financial-clearance": [
    "planning",
    "pending-insurance-clearance",
    "ready",
    "cancelled",
  ],

  "pending-insurance-clearance": [
    "planning",
    "pending-financial-clearance",
    "ready",
    "cancelled",
  ],

  "pending-transport": [
    "planning",
    "ready",
    "cancelled",
  ],

  "pending-patient-education": [
    "planning",
    "ready",
    "cancelled",
  ],

  ready: [
    "ordered",
    "planning",
    "cancelled",
  ],

  ordered: [
    "completed",
    "planning",
    "cancelled",
  ],

  completed: [],
  cancelled: [],
  "entered-in-error": [],
};
