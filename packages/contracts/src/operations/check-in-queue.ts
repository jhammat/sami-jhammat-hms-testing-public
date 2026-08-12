import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

export type PatientArrivalSource =
  | "appointment"
  | "walk-in"
  | "emergency"
  | "referral"
  | "transfer"
  | "diagnostic-order"
  | "pharmacy-order"
  | "admission"
  | "patient-access"
  | "other";

export type PatientArrivalMethod =
  | "reception"
  | "self-service-kiosk"
  | "qr-code"
  | "patient-access"
  | "department-desk"
  | "emergency-desk"
  | "automatic"
  | "other";

export type PatientArrivalStatus =
  | "recorded"
  | "identity-pending"
  | "identity-confirmed"
  | "cancelled"
  | "entered-in-error";

export type PatientCheckInStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "blocked"
  | "cancelled"
  | "entered-in-error";

export type PatientCheckInBlockReason =
  | "identity-not-confirmed"
  | "appointment-not-found"
  | "appointment-cancelled"
  | "payment-required"
  | "insurance-authorization-required"
  | "referral-required"
  | "consent-required"
  | "doctor-unavailable"
  | "service-unavailable"
  | "wrong-branch"
  | "duplicate-check-in"
  | "clinical-review-required"
  | "other";

export type QueueType =
  | "registration"
  | "appointment"
  | "triage"
  | "opd"
  | "consultation"
  | "laboratory"
  | "sample-collection"
  | "radiology"
  | "pharmacy"
  | "billing"
  | "insurance"
  | "admission"
  | "procedure"
  | "ward"
  | "discharge"
  | "virtual"
  | "other";

export type QueueStatus =
  | "draft"
  | "open"
  | "paused"
  | "closed"
  | "archived";

export type QueueEntryStatus =
  | "waiting"
  | "called"
  | "recalled"
  | "acknowledged"
  | "moving-to-service-point"
  | "in-service"
  | "on-hold"
  | "transferred"
  | "completed"
  | "cancelled"
  | "skipped"
  | "no-show"
  | "left-before-service"
  | "entered-in-error";

export type QueuePriority =
  | "routine"
  | "priority"
  | "urgent"
  | "emergency"
  | "critical";

export type QueueEntrySource =
  | "scheduled-appointment"
  | "walk-in"
  | "emergency"
  | "internal-referral"
  | "cross-branch-referral"
  | "diagnostic-order"
  | "pharmacy-order"
  | "admission-request"
  | "transfer"
  | "system";

export type QueueCallMethod =
  | "display-board"
  | "audio-announcement"
  | "staff-call"
  | "sms"
  | "push-notification"
  | "patient-access"
  | "combined";

export type QueueTokenResetPeriod =
  | "never"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export type QueueTokenReservationStatus =
  | "reserved"
  | "committed"
  | "released"
  | "expired";

export type QueueTransferStatus =
  | "requested"
  | "accepted"
  | "completed"
  | "rejected"
  | "cancelled";

export type QueueEventType =
  | "entry-created"
  | "priority-changed"
  | "position-changed"
  | "called"
  | "recalled"
  | "acknowledged"
  | "service-started"
  | "service-completed"
  | "put-on-hold"
  | "resumed"
  | "skipped"
  | "no-show"
  | "transferred"
  | "cancelled"
  | "left-before-service"
  | "entered-in-error";

export type PublicQueueDisplayMode =
  | "token-only"
  | "token-and-initials"
  | "masked-name"
  | "custom-safe-label";

export interface PatientArrival {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;
  branchId: WonFlowId;

  appointmentId?: WonFlowId;
  encounterId?: WonFlowId;
  patientJourneyId?: WonFlowId;
  referralId?: WonFlowId;
  admissionId?: WonFlowId;

  source: PatientArrivalSource;
  method: PatientArrivalMethod;
  status: PatientArrivalStatus;

  arrivedAt: IsoDateTime;

  recordedByUserId?: WonFlowId;
  recordedByPatientAccessAccountId?: WonFlowId;
  recordedBySystem: boolean;

  identityConfirmedAt?: IsoDateTime;
  identityConfirmedByUserId?: WonFlowId;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PatientCheckIn {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;
  branchId: WonFlowId;

  arrivalId: WonFlowId;

  appointmentId?: WonFlowId;
  encounterId?: WonFlowId;
  patientJourneyId?: WonFlowId;

  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  counterId?: WonFlowId;

  status: PatientCheckInStatus;

  blockedReasons: PatientCheckInBlockReason[];

  identityConfirmed: boolean;
  appointmentConfirmed: boolean;
  paymentCleared: boolean;
  insuranceCleared: boolean;
  consentConfirmed: boolean;

  checkedInByUserId?: WonFlowId;
  checkedInByPatientAccessAccountId?: WonFlowId;
  checkedInBySystem: boolean;

  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface QueueDefinition {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  waitingAreaId?: WonFlowId;

  name: string;
  code: string;
  type: QueueType;

  status: QueueStatus;

  supportsScheduledAppointments: boolean;
  supportsWalkIns: boolean;
  supportsEmergencyPriority: boolean;
  supportsRemoteTracking: boolean;

  maximumWaitingCapacity?: number;
  estimatedAverageServiceMinutes?: number;

  tokenPolicyId?: WonFlowId;

  publicDisplayMode: PublicQueueDisplayMode;

  statusRecord: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface QueueTokenPolicy {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  queueId?: WonFlowId;

  name: string;

  prefix?: string;
  suffix?: string;
  separator: string;

  includeBranchCode: boolean;
  includeDepartmentCode: boolean;
  includeQueueCode: boolean;

  sequencePadding: number;
  resetPeriod: QueueTokenResetPeriod;

  startSequenceAt: number;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Atomic token reservation prevents duplicate token numbers.
 */
export interface QueueTokenReservation {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;
  queueId: WonFlowId;
  tokenPolicyId: WonFlowId;

  sequenceNumber: number;
  reservedTokenNumber: string;

  status: QueueTokenReservationStatus;

  idempotencyKey: string;

  queueEntryId?: WonFlowId;

  reservedAt: IsoDateTime;
  expiresAt?: IsoDateTime;
  committedAt?: IsoDateTime;
  releasedAt?: IsoDateTime;
}

export interface QueueEntry {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  queueId: WonFlowId;
  patientId: WonFlowId;

  appointmentId?: WonFlowId;
  encounterId?: WonFlowId;
  patientJourneyId?: WonFlowId;
  checkInId?: WonFlowId;

  serviceOrderId?: WonFlowId;
  prescriptionId?: WonFlowId;
  admissionId?: WonFlowId;

  source: QueueEntrySource;
  status: QueueEntryStatus;
  priority: QueuePriority;

  /**
   * Human-readable patient token.
   *
   * Example:
   * CARD-042
   */
  tokenNumber: string;

  /**
   * Safe label for public displays.
   *
   * Example:
   * CARD-042 or A. R.
   */
  publicDisplayLabel: string;

  sequenceNumber: number;
  currentPosition?: number;

  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  waitingAreaId?: WonFlowId;
  roomId?: WonFlowId;
  counterId?: WonFlowId;

  assignedPractitionerId?: WonFlowId;
  assignedUserId?: WonFlowId;

  scheduledStartAt?: IsoDateTime;

  joinedAt: IsoDateTime;
  calledAt?: IsoDateTime;
  acknowledgedAt?: IsoDateTime;
  serviceStartedAt?: IsoDateTime;
  serviceCompletedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;
  noShowRecordedAt?: IsoDateTime;
  leftBeforeServiceAt?: IsoDateTime;

  estimatedWaitMinutes?: number;
  expectedServiceAt?: IsoDateTime;

  callCount: number;
  maximumCallAttempts?: number;

  priorityReason?: string;
  holdReason?: string;
  notes?: string;

  createdByUserId?: WonFlowId;
  createdBySystem: boolean;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface QueueCallEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  queueId: WonFlowId;
  queueEntryId: WonFlowId;

  callNumber: number;
  method: QueueCallMethod;

  destinationServicePointId?: WonFlowId;
  destinationRoomId?: WonFlowId;
  destinationCounterId?: WonFlowId;

  publicMessage?: string;
  internalMessage?: string;

  calledByUserId?: WonFlowId;
  calledBySystem: boolean;

  calledAt: IsoDateTime;
  acknowledgedAt?: IsoDateTime;
  expiredAt?: IsoDateTime;
}

export interface QueueTransfer {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  fromBranchId: WonFlowId;
  toBranchId: WonFlowId;

  fromQueueId: WonFlowId;
  toQueueId: WonFlowId;

  fromQueueEntryId: WonFlowId;
  toQueueEntryId?: WonFlowId;

  status: QueueTransferStatus;

  preservePriority: boolean;
  preserveOriginalWaitTime: boolean;

  reason: string;
  notes?: string;

  requestedByUserId: WonFlowId;
  acceptedByUserId?: WonFlowId;
  completedByUserId?: WonFlowId;

  requestedAt: IsoDateTime;
  acceptedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  rejectedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;
}

export interface QueuePriorityChange {
  id: WonFlowId;

  organizationId: WonFlowId;
  queueEntryId: WonFlowId;

  previousPriority: QueuePriority;
  newPriority: QueuePriority;

  reason: string;

  changedByUserId?: WonFlowId;
  changedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface QueueEntryEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;

  queueId: WonFlowId;
  queueEntryId: WonFlowId;

  type: QueueEventType;

  previousStatus?: QueueEntryStatus;
  newStatus?: QueueEntryStatus;

  previousPosition?: number;
  newPosition?: number;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface QueueWaitTimeSnapshot {
  id: WonFlowId;

  organizationId: WonFlowId;
  branchId: WonFlowId;
  queueId: WonFlowId;

  waitingCount: number;
  activeServiceCount: number;
  pausedCount: number;

  averageWaitMinutes?: number;
  longestWaitMinutes?: number;
  estimatedNextWaitMinutes?: number;

  delayed: boolean;
  delayReason?: string;

  calculatedAt: IsoDateTime;
}

export interface QueueBoardItem {
  queueEntryId: WonFlowId;

  tokenNumber: string;
  publicDisplayLabel: string;

  status:
    | "waiting"
    | "called"
    | "in-service";

  destinationLabel?: string;

  estimatedWaitMinutes?: number;
  calledAt?: IsoDateTime;
}

export interface QueueBoardSnapshot {
  organizationId: WonFlowId;
  branchId: WonFlowId;
  queueId: WonFlowId;

  queueName: string;

  currentServing: QueueBoardItem[];
  waiting: QueueBoardItem[];
  recentlyCompleted: QueueBoardItem[];

  announcementMessage?: string;

  generatedAt: IsoDateTime;
}

export interface QueueAggregate {
  queue: QueueDefinition;

  entries: QueueEntry[];
  calls: QueueCallEvent[];
  transfers: QueueTransfer[];
  priorityChanges: QueuePriorityChange[];
  events: QueueEntryEvent[];

  latestWaitTimeSnapshot?: QueueWaitTimeSnapshot;
  latestBoardSnapshot?: QueueBoardSnapshot;
}

export const WONFLOW_QUEUE_ENTRY_STATUS_TRANSITIONS: Record<
  QueueEntryStatus,
  readonly QueueEntryStatus[]
> = {
  waiting: [
    "called",
    "on-hold",
    "transferred",
    "cancelled",
    "skipped",
    "no-show",
    "left-before-service",
    "entered-in-error",
  ],

  called: [
    "recalled",
    "acknowledged",
    "in-service",
    "on-hold",
    "skipped",
    "no-show",
    "cancelled",
  ],

  recalled: [
    "acknowledged",
    "in-service",
    "on-hold",
    "skipped",
    "no-show",
    "cancelled",
  ],

  acknowledged: [
    "moving-to-service-point",
    "in-service",
    "on-hold",
    "cancelled",
  ],

  "moving-to-service-point": [
    "in-service",
    "on-hold",
    "transferred",
    "cancelled",
  ],

  "in-service": [
    "completed",
    "on-hold",
    "transferred",
    "cancelled",
    "entered-in-error",
  ],

  "on-hold": [
    "waiting",
    "called",
    "in-service",
    "transferred",
    "cancelled",
  ],

  transferred: [],
  completed: [],
  cancelled: [],
  skipped: [
    "waiting",
    "called",
    "cancelled",
    "no-show",
  ],
  "no-show": [],
  "left-before-service": [],
  "entered-in-error": [],
};