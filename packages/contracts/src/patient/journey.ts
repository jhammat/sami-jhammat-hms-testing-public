import type {
  IsoDateTime,
  WonFlowId,
} from "../organization/hierarchy";
import type {
  EncounterClass,
  EncounterMode,
  EncounterPriority,
} from "./encounter";

export type PatientJourneyType =
  | "scheduled-opd"
  | "walk-in-opd"
  | "emergency"
  | "diagnostic-only"
  | "pharmacy-only"
  | "day-care"
  | "planned-admission"
  | "opd-to-admission"
  | "inpatient"
  | "procedure"
  | "telemedicine"
  | "follow-up"
  | "cross-branch-referral"
  | "home-care";

export type PatientJourneyStatus =
  | "draft"
  | "planned"
  | "awaiting-approval"
  | "awaiting-payment"
  | "confirmed"
  | "arrived"
  | "active"
  | "on-hold"
  | "transferred"
  | "completed"
  | "discharged"
  | "cancelled"
  | "rejected"
  | "no-show"
  | "expired"
  | "entered-in-error";

export type PatientJourneySource =
  | "patient-access"
  | "reception"
  | "call-centre"
  | "walk-in"
  | "doctor"
  | "department"
  | "emergency-desk"
  | "internal-referral"
  | "cross-branch-referral"
  | "external-referral"
  | "system"
  | "transfer";

export type PatientJourneyOutcome =
  | "outpatient-care-completed"
  | "admitted"
  | "discharged-home"
  | "transferred"
  | "referred"
  | "follow-up-required"
  | "left-against-medical-advice"
  | "death"
  | "cancelled"
  | "rejected"
  | "no-show"
  | "entered-in-error";

export type PatientJourneyStageCode =
  | "patient-identification"
  | "registration"
  | "identity-verification"
  | "doctor-selection"
  | "appointment-booking"
  | "slot-reservation"
  | "pre-authorization"
  | "payment-clearance"
  | "arrival"
  | "check-in"
  | "triage"
  | "waiting"
  | "consultation"
  | "emergency-care"
  | "service-ordering"
  | "diagnostics"
  | "sample-collection"
  | "imaging"
  | "result-processing"
  | "result-verification"
  | "prescription-review"
  | "stock-check"
  | "dispensing"
  | "counselling"
  | "admission-request"
  | "admission-approval"
  | "bed-allocation"
  | "admission"
  | "transfer"
  | "initial-assessment"
  | "nursing-care"
  | "doctor-rounds"
  | "inpatient-care"
  | "procedure-booking"
  | "pre-procedure"
  | "procedure"
  | "operation-theatre"
  | "recovery"
  | "virtual-waiting-room"
  | "teleconsultation"
  | "home-visit"
  | "billing"
  | "final-billing"
  | "discharge-planning"
  | "discharge-clearance"
  | "discharge"
  | "follow-up-planning"
  | "referral-created"
  | "referral-acceptance"
  | "result-return"
  | "completion";

export type PatientJourneyStageStatus =
  | "pending"
  | "ready"
  | "active"
  | "on-hold"
  | "blocked"
  | "completed"
  | "skipped"
  | "cancelled"
  | "failed";

export type PatientJourneyTransitionTrigger =
  | "patient-action"
  | "staff-action"
  | "doctor-action"
  | "nurse-action"
  | "system-event"
  | "payment-event"
  | "insurance-event"
  | "clinical-decision"
  | "diagnostic-result"
  | "bed-availability"
  | "queue-event"
  | "timer"
  | "emergency-override"
  | "transfer-event"
  | "discharge-approval";

export type PatientJourneyDecisionType =
  | "continue-outpatient-care"
  | "order-diagnostics"
  | "send-to-pharmacy"
  | "request-admission"
  | "approve-admission"
  | "reject-admission"
  | "transfer-branch"
  | "schedule-procedure"
  | "discharge-patient"
  | "request-follow-up"
  | "cancel-journey";

export type PatientJourneyBlockReason =
  | "missing-patient-information"
  | "identity-not-verified"
  | "doctor-unavailable"
  | "slot-unavailable"
  | "payment-required"
  | "insurance-authorization-required"
  | "clinical-approval-required"
  | "consent-required"
  | "bed-unavailable"
  | "room-unavailable"
  | "equipment-unavailable"
  | "staff-unavailable"
  | "result-pending"
  | "module-disabled"
  | "permission-required"
  | "other";

export interface PatientJourneyLocation {
  organizationId: WonFlowId;
  branchId: WonFlowId;

  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  roomId?: WonFlowId;
  counterId?: WonFlowId;
  waitingAreaId?: WonFlowId;
  bedId?: WonFlowId;
}

export interface PatientJourney {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  type: PatientJourneyType;
  source: PatientJourneySource;
  status: PatientJourneyStatus;

  priority: EncounterPriority;
  encounterClass: EncounterClass;
  encounterMode: EncounterMode;

  /**
   * A journey may begin from an appointment, but an appointment
   * and a patient journey remain separate records.
   */
  appointmentId?: WonFlowId;

  /**
   * One journey may contain or link several branch encounters.
   */
  primaryEncounterId?: WonFlowId;
  encounterIds: WonFlowId[];

  careEpisodeId?: WonFlowId;
  admissionId?: WonFlowId;
  referralId?: WonFlowId;

  originBranchId: WonFlowId;
  currentBranchId: WonFlowId;

  currentStageId?: WonFlowId;
  currentStageCode?: PatientJourneyStageCode;
  currentLocation?: PatientJourneyLocation;

  outcome?: PatientJourneyOutcome;

  plannedStartAt?: IsoDateTime;
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  dischargedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientJourneyStage {
  id: WonFlowId;

  organizationId: WonFlowId;
  journeyId: WonFlowId;

  sequenceNumber: number;

  code: PatientJourneyStageCode;
  name: string;
  status: PatientJourneyStageStatus;

  required: boolean;
  mayBeSkipped: boolean;

  location?: PatientJourneyLocation;

  assignedUserId?: WonFlowId;
  assignedPractitionerId?: WonFlowId;

  appointmentId?: WonFlowId;
  encounterId?: WonFlowId;
  queueEntryId?: WonFlowId;
  serviceOrderId?: WonFlowId;
  prescriptionId?: WonFlowId;
  admissionId?: WonFlowId;
  invoiceId?: WonFlowId;
  paymentId?: WonFlowId;
  documentId?: WonFlowId;

  blockedReasons: PatientJourneyBlockReason[];
  notes?: string;

  readyAt?: IsoDateTime;
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  skippedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientJourneyTransition {
  id: WonFlowId;

  organizationId: WonFlowId;
  journeyId: WonFlowId;

  previousStatus?: PatientJourneyStatus;
  newStatus: PatientJourneyStatus;

  previousStageId?: WonFlowId;
  newStageId?: WonFlowId;

  previousStageCode?: PatientJourneyStageCode;
  newStageCode?: PatientJourneyStageCode;

  trigger: PatientJourneyTransitionTrigger;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface PatientJourneyDecision {
  id: WonFlowId;

  organizationId: WonFlowId;
  journeyId: WonFlowId;

  type: PatientJourneyDecisionType;

  decidedByUserId?: WonFlowId;
  decidedByPractitionerId?: WonFlowId;

  reason?: string;
  notes?: string;

  relatedEncounterId?: WonFlowId;
  relatedServiceOrderId?: WonFlowId;
  relatedAdmissionId?: WonFlowId;
  relatedReferralId?: WonFlowId;

  decidedAt: IsoDateTime;
}

export interface PatientJourneyTransfer {
  id: WonFlowId;

  organizationId: WonFlowId;
  journeyId: WonFlowId;
  patientId: WonFlowId;

  fromBranchId: WonFlowId;
  toBranchId: WonFlowId;

  fromEncounterId: WonFlowId;
  toEncounterId?: WonFlowId;

  reason: string;

  status:
    | "requested"
    | "accepted"
    | "in-transit"
    | "received"
    | "completed"
    | "cancelled"
    | "rejected";

  requestedByUserId: WonFlowId;
  acceptedByUserId?: WonFlowId;
  receivedByUserId?: WonFlowId;

  requestedAt: IsoDateTime;
  acceptedAt?: IsoDateTime;
  receivedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
}

export interface PatientJourneyBlueprint {
  type: PatientJourneyType;
  name: string;
  description: string;

  initialStatus: PatientJourneyStatus;

  stages: readonly PatientJourneyStageCode[];

  allowedNextJourneyTypes: readonly PatientJourneyType[];
}

export interface PatientJourneyAggregate {
  journey: PatientJourney;
  stages: PatientJourneyStage[];
  transitions: PatientJourneyTransition[];
  decisions: PatientJourneyDecision[];
  transfers: PatientJourneyTransfer[];
}

export const WONFLOW_JOURNEY_STATUS_TRANSITIONS: Record<
  PatientJourneyStatus,
  readonly PatientJourneyStatus[]
> = {
  draft: [
    "planned",
    "awaiting-approval",
    "cancelled",
    "entered-in-error",
  ],
  planned: [
    "awaiting-approval",
    "awaiting-payment",
    "confirmed",
    "cancelled",
    "expired",
  ],
  "awaiting-approval": [
    "awaiting-payment",
    "confirmed",
    "rejected",
    "cancelled",
  ],
  "awaiting-payment": [
    "confirmed",
    "cancelled",
    "expired",
  ],
  confirmed: [
    "arrived",
    "active",
    "cancelled",
    "no-show",
  ],
  arrived: [
    "active",
    "on-hold",
    "cancelled",
  ],
  active: [
    "on-hold",
    "transferred",
    "completed",
    "discharged",
    "cancelled",
    "entered-in-error",
  ],
  "on-hold": [
    "active",
    "transferred",
    "cancelled",
    "expired",
  ],
  transferred: [
    "active",
    "completed",
    "discharged",
    "cancelled",
  ],
  completed: [],
  discharged: [],
  cancelled: [],
  rejected: [],
  "no-show": [],
  expired: [],
  "entered-in-error": [],
};

export const WONFLOW_PATIENT_JOURNEY_BLUEPRINTS = [
  {
    type: "scheduled-opd",
    name: "Scheduled OPD Patient",
    description:
      "A patient books a doctor or service before arriving at the hospital.",
    initialStatus: "planned",
    stages: [
      "patient-identification",
      "doctor-selection",
      "appointment-booking",
      "slot-reservation",
      "pre-authorization",
      "payment-clearance",
      "arrival",
      "check-in",
      "waiting",
      "consultation",
      "service-ordering",
      "dispensing",
      "billing",
      "follow-up-planning",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "diagnostic-only",
      "opd-to-admission",
      "procedure",
      "follow-up",
      "cross-branch-referral",
    ],
  },
  {
    type: "walk-in-opd",
    name: "Direct Walk-In OPD Patient",
    description:
      "A patient arrives without an appointment and joins an available doctor or service queue.",
    initialStatus: "draft",
    stages: [
      "patient-identification",
      "registration",
      "doctor-selection",
      "check-in",
      "waiting",
      "consultation",
      "service-ordering",
      "dispensing",
      "billing",
      "follow-up-planning",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "diagnostic-only",
      "opd-to-admission",
      "procedure",
      "follow-up",
      "cross-branch-referral",
    ],
  },
  {
    type: "emergency",
    name: "Emergency Patient",
    description:
      "A patient receives immediate triage and treatment with non-essential administration deferred.",
    initialStatus: "active",
    stages: [
      "patient-identification",
      "registration",
      "triage",
      "emergency-care",
      "diagnostics",
      "service-ordering",
      "admission-request",
      "transfer",
      "billing",
      "discharge",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "inpatient",
      "procedure",
      "cross-branch-referral",
      "follow-up",
    ],
  },
  {
    type: "diagnostic-only",
    name: "Diagnostic-Only Patient",
    description:
      "A patient visits for laboratory testing, imaging or another diagnostic service.",
    initialStatus: "planned",
    stages: [
      "patient-identification",
      "registration",
      "arrival",
      "check-in",
      "waiting",
      "sample-collection",
      "imaging",
      "result-processing",
      "result-verification",
      "billing",
      "result-return",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "follow-up",
      "cross-branch-referral",
    ],
  },
  {
    type: "pharmacy-only",
    name: "Pharmacy-Only Patient",
    description:
      "A patient visits only to validate and collect a prescription.",
    initialStatus: "active",
    stages: [
      "patient-identification",
      "prescription-review",
      "stock-check",
      "dispensing",
      "billing",
      "counselling",
      "completion",
    ],
    allowedNextJourneyTypes: ["follow-up"],
  },
  {
    type: "day-care",
    name: "Day-Care Patient",
    description:
      "A patient receives treatment or observation without an overnight hospital stay.",
    initialStatus: "planned",
    stages: [
      "patient-identification",
      "pre-authorization",
      "arrival",
      "check-in",
      "pre-procedure",
      "procedure",
      "recovery",
      "billing",
      "discharge-clearance",
      "discharge",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "inpatient",
      "follow-up",
    ],
  },
  {
    type: "planned-admission",
    name: "Planned Inpatient Admission",
    description:
      "A patient arrives for a previously arranged hospital admission.",
    initialStatus: "planned",
    stages: [
      "patient-identification",
      "pre-authorization",
      "payment-clearance",
      "arrival",
      "check-in",
      "bed-allocation",
      "admission",
      "initial-assessment",
      "nursing-care",
      "doctor-rounds",
      "inpatient-care",
      "discharge-planning",
      "final-billing",
      "discharge-clearance",
      "discharge",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "procedure",
      "follow-up",
      "cross-branch-referral",
    ],
  },
  {
    type: "opd-to-admission",
    name: "OPD Patient Admitted to Hospital",
    description:
      "A doctor converts an outpatient visit into an inpatient admission.",
    initialStatus: "active",
    stages: [
      "consultation",
      "admission-request",
      "admission-approval",
      "pre-authorization",
      "bed-allocation",
      "transfer",
      "admission",
      "initial-assessment",
      "nursing-care",
      "doctor-rounds",
      "inpatient-care",
      "discharge-planning",
      "final-billing",
      "discharge",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "procedure",
      "follow-up",
      "cross-branch-referral",
    ],
  },
  {
    type: "inpatient",
    name: "Inpatient Hospital Stay",
    description:
      "A patient remains admitted under ward and clinical care.",
    initialStatus: "active",
    stages: [
      "admission",
      "bed-allocation",
      "initial-assessment",
      "nursing-care",
      "doctor-rounds",
      "inpatient-care",
      "diagnostics",
      "procedure",
      "discharge-planning",
      "final-billing",
      "discharge-clearance",
      "discharge",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "procedure",
      "follow-up",
      "cross-branch-referral",
    ],
  },
  {
    type: "procedure",
    name: "Procedure or Surgery Patient",
    description:
      "A patient receives a planned procedure, operation or intervention.",
    initialStatus: "planned",
    stages: [
      "procedure-booking",
      "pre-authorization",
      "payment-clearance",
      "arrival",
      "check-in",
      "pre-procedure",
      "operation-theatre",
      "procedure",
      "recovery",
      "billing",
      "discharge-clearance",
      "discharge",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "inpatient",
      "follow-up",
    ],
  },
  {
    type: "telemedicine",
    name: "Telemedicine Patient",
    description:
      "A patient attends a video or phone consultation remotely.",
    initialStatus: "planned",
    stages: [
      "patient-identification",
      "appointment-booking",
      "slot-reservation",
      "payment-clearance",
      "virtual-waiting-room",
      "teleconsultation",
      "service-ordering",
      "billing",
      "follow-up-planning",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "scheduled-opd",
      "diagnostic-only",
      "follow-up",
      "cross-branch-referral",
    ],
  },
  {
    type: "follow-up",
    name: "Follow-Up Patient",
    description:
      "A patient returns for review after a previous consultation, procedure, admission or result.",
    initialStatus: "planned",
    stages: [
      "patient-identification",
      "appointment-booking",
      "arrival",
      "check-in",
      "waiting",
      "consultation",
      "result-return",
      "follow-up-planning",
      "billing",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "diagnostic-only",
      "scheduled-opd",
      "opd-to-admission",
      "procedure",
    ],
  },
  {
    type: "cross-branch-referral",
    name: "Cross-Branch Referral",
    description:
      "A patient is referred from one WonFlow branch to another while retaining one patient identity.",
    initialStatus: "awaiting-approval",
    stages: [
      "referral-created",
      "referral-acceptance",
      "appointment-booking",
      "arrival",
      "check-in",
      "transfer",
      "consultation",
      "service-ordering",
      "result-return",
      "billing",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "scheduled-opd",
      "diagnostic-only",
      "inpatient",
      "procedure",
      "follow-up",
    ],
  },
  {
    type: "home-care",
    name: "Home-Care Patient",
    description:
      "A patient receives an authorized clinical or nursing service at home.",
    initialStatus: "planned",
    stages: [
      "patient-identification",
      "appointment-booking",
      "pre-authorization",
      "home-visit",
      "initial-assessment",
      "nursing-care",
      "service-ordering",
      "billing",
      "follow-up-planning",
      "completion",
    ],
    allowedNextJourneyTypes: [
      "scheduled-opd",
      "emergency",
      "inpatient",
      "follow-up",
    ],
  },
] as const satisfies readonly PatientJourneyBlueprint[];