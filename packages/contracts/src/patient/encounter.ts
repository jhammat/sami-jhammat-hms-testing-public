import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

/**
 * The clinical and operational category of an encounter.
 */
export type EncounterClass =
  | "outpatient"
  | "emergency"
  | "inpatient"
  | "day-care"
  | "virtual"
  | "home-care"
  | "diagnostic"
  | "pharmacy"
  | "procedure";

/**
 * How the patient and care team interact.
 */
export type EncounterMode =
  | "in-person"
  | "video"
  | "phone"
  | "home-visit"
  | "system-only";

/**
 * How the encounter was initiated.
 */
export type EncounterSource =
  | "appointment"
  | "online-booking"
  | "walk-in"
  | "emergency"
  | "internal-referral"
  | "cross-branch-referral"
  | "external-referral"
  | "follow-up"
  | "transfer"
  | "system-generated";

/**
 * The complete encounter lifecycle.
 */
export type EncounterStatus =
  | "planned"
  | "arrived"
  | "checked-in"
  | "waiting"
  | "in-progress"
  | "on-hold"
  | "transferred"
  | "completed"
  | "discharged"
  | "cancelled"
  | "no-show"
  | "entered-in-error";

/**
 * Operational and clinical urgency.
 */
export type EncounterPriority =
  | "routine"
  | "urgent"
  | "emergency"
  | "critical";

/**
 * Determines when an encounter-number sequence restarts.
 */
export type EncounterNumberResetPeriod =
  | "never"
  | "yearly"
  | "monthly";

/**
 * Status of a reserved sequence number.
 */
export type EncounterNumberReservationStatus =
  | "reserved"
  | "committed"
  | "released"
  | "expired";

/**
 * A patient's movement or operational phase inside an encounter.
 */
export type EncounterSegmentType =
  | "registration"
  | "check-in"
  | "waiting"
  | "triage"
  | "consultation"
  | "laboratory"
  | "radiology"
  | "pharmacy"
  | "billing"
  | "procedure"
  | "admission"
  | "ward"
  | "discharge"
  | "virtual-waiting-room"
  | "video-consultation"
  | "other";

export type EncounterSegmentStatus =
  | "planned"
  | "waiting"
  | "active"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "skipped";

/**
 * Configures how one branch generates encounter numbers.
 *
 * Example result:
 * MAIN-2026-000123
 */
export interface EncounterNumberPolicy {
  id: WonFlowId;
  organizationId: WonFlowId;
  branchId: WonFlowId;

  name: string;

  prefix?: string;
  suffix?: string;
  separator: string;

  includeBranchCode: boolean;
  includeYear: boolean;
  includeMonth: boolean;

  sequencePadding: number;
  resetPeriod: EncounterNumberResetPeriod;

  status: RecordStatus;

  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Represents an atomic reservation of an encounter sequence number.
 *
 * It prevents two concurrent users from receiving the same encounter number.
 */
export interface EncounterNumberReservation {
  id: WonFlowId;
  organizationId: WonFlowId;
  branchId: WonFlowId;
  policyId: WonFlowId;

  sequenceNumber: number;
  reservedEncounterNumber: string;

  status: EncounterNumberReservationStatus;

  /**
   * Protects retrying requests from creating multiple numbers.
   */
  idempotencyKey: string;

  encounterId?: WonFlowId;

  reservedAt: IsoDateTime;
  expiresAt?: IsoDateTime;
  committedAt?: IsoDateTime;
  releasedAt?: IsoDateTime;
}

/**
 * Canonical patient encounter.
 *
 * In the user interface, this may be described as a visit.
 */
export interface Encounter {
  /**
   * Immutable technical identifier.
   */
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  /**
   * Every encounter belongs to exactly one branch.
   *
   * A cross-branch transfer creates a linked encounter at the receiving
   * branch rather than changing this value.
   */
  branchId: WonFlowId;

  /**
   * Human-readable branch encounter number.
   *
   * Example:
   * MAIN-2026-000123
   */
  encounterNumber: string;

  encounterClass: EncounterClass;
  mode: EncounterMode;
  source: EncounterSource;
  status: EncounterStatus;
  priority: EncounterPriority;

  /**
   * Appointment and encounter identities remain separate.
   */
  appointmentId?: WonFlowId;

  /**
   * Groups related encounters over a longer treatment journey.
   */
  careEpisodeId?: WonFlowId;

  /**
   * Used when one encounter is created from or related to another.
   */
  parentEncounterId?: WonFlowId;
  referringEncounterId?: WonFlowId;

  primaryBranchDepartmentId?: WonFlowId;
  primaryOperationalUnitId?: WonFlowId;

  initialServicePointId?: WonFlowId;
  currentServicePointId?: WonFlowId;

  attendingPractitionerId?: WonFlowId;
  responsibleUserId?: WonFlowId;

  reasonForVisit?: string;
  administrativeNotes?: string;

  scheduledStartAt?: IsoDateTime;
  scheduledEndAt?: IsoDateTime;

  arrivedAt?: IsoDateTime;
  checkedInAt?: IsoDateTime;
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  dischargedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;

  cancellationReason?: string;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Stores an external, previous or imported encounter identifier.
 */
export interface EncounterExternalIdentifier {
  id: WonFlowId;
  organizationId: WonFlowId;
  encounterId: WonFlowId;

  systemName: string;
  identifierType:
    | "external-encounter-number"
    | "legacy-visit-number"
    | "referral-number"
    | "insurance-authorization-number"
    | "other";

  value: string;
  isActive: boolean;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Represents one operational stage or physical movement during an encounter.
 *
 * Example:
 * Reception → Cardiology Waiting Area → Consultation Room → Laboratory
 */
export interface EncounterSegment {
  id: WonFlowId;
  organizationId: WonFlowId;
  encounterId: WonFlowId;

  sequenceNumber: number;
  type: EncounterSegmentType;
  status: EncounterSegmentStatus;

  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;

  servicePointId?: WonFlowId;
  roomId?: WonFlowId;
  counterId?: WonFlowId;
  waitingAreaId?: WonFlowId;

  assignedUserId?: WonFlowId;
  assignedPractitionerId?: WonFlowId;

  queueEntryId?: WonFlowId;
  serviceOrderId?: WonFlowId;

  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Immutable history of encounter status changes.
 */
export interface EncounterStatusEvent {
  id: WonFlowId;
  organizationId: WonFlowId;
  encounterId: WonFlowId;

  previousStatus?: EncounterStatus;
  newStatus: EncounterStatus;

  reason?: string;

  changedByUserId?: WonFlowId;
  changedBySystem: boolean;

  occurredAt: IsoDateTime;
}

/**
 * Read model used by screens that need the complete encounter context.
 */
export interface EncounterAggregate {
  encounter: Encounter;
  externalIdentifiers: EncounterExternalIdentifier[];
  segments: EncounterSegment[];
  statusHistory: EncounterStatusEvent[];
}