import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

/**
 * Date-only value in YYYY-MM-DD format.
 */
export type CalendarDate = string;

/**
 * Local clock time in HH:mm or HH:mm:ss format.
 */
export type LocalTime = string;

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type DoctorConsultationMode =
  | "in-person"
  | "video"
  | "phone"
  | "home-visit";

export type DoctorAvailabilityRuleStatus =
  | "draft"
  | "active"
  | "inactive"
  | "archived";

export type DoctorScheduleSessionStatus =
  | "planned"
  | "open"
  | "closed"
  | "in-progress"
  | "completed"
  | "cancelled";

export type DoctorScheduleSource =
  | "recurring-rule"
  | "manual"
  | "extra-session"
  | "coverage-assignment"
  | "on-call-assignment"
  | "imported";

export type DoctorScheduleExceptionType =
  | "leave"
  | "holiday"
  | "training"
  | "meeting"
  | "emergency-duty"
  | "manual-block"
  | "extra-session"
  | "temporary-location-change"
  | "temporary-time-change"
  | "other";

export type DoctorOperationalStatus =
  | "off-duty"
  | "scheduled"
  | "checking-in"
  | "available"
  | "delayed"
  | "in-consultation"
  | "in-procedure"
  | "on-rounds"
  | "on-break"
  | "temporarily-unavailable"
  | "on-call"
  | "remote"
  | "leave"
  | "finished";

export type DoctorStatusSource =
  | "schedule-engine"
  | "appointment-engine"
  | "queue-engine"
  | "encounter-engine"
  | "leave-management"
  | "manual"
  | "system";

export type PatientFacingDoctorStatus =
  | "available"
  | "limited-availability"
  | "busy"
  | "delayed"
  | "unavailable"
  | "not-published";

export type DoctorAppointmentSlotStatus =
  | "available"
  | "reserved"
  | "booked"
  | "blocked"
  | "cancelled"
  | "expired"
  | "completed"
  | "no-show";

export type DoctorBookingChannel =
  | "reception"
  | "call-centre"
  | "patient-access"
  | "doctor-referral"
  | "internal-referral"
  | "external-referral"
  | "walk-in"
  | "emergency";

export type DoctorCapacityStrategy =
  | "single-booking"
  | "parallel-booking"
  | "queue-capacity";

export type DoctorScheduleConflictType =
  | "overlapping-session"
  | "overlapping-appointment"
  | "approved-leave"
  | "branch-travel-conflict"
  | "room-conflict"
  | "service-point-conflict"
  | "procedure-conflict"
  | "on-call-conflict"
  | "coverage-conflict"
  | "outside-credential-scope"
  | "module-disabled"
  | "other";

export type DoctorLeaveStatus =
  | "draft"
  | "requested"
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed";

export type DoctorCoverageStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "active"
  | "completed"
  | "cancelled";

export interface DoctorAvailabilityProfile {
  id: WonFlowId;

  organizationId: WonFlowId;
  practitionerId: WonFlowId;

  timezone: string;

  /**
   * Minimum time required before an appointment may begin.
   */
  minimumBookingNoticeMinutes: number;

  /**
   * Maximum future period in which appointments may be booked.
   */
  bookingHorizonDays: number;

  allowStaffBooking: boolean;
  allowPatientOnlineBooking: boolean;
  allowWalkIns: boolean;
  allowSameDayBooking: boolean;

  /**
   * Allows controlled bookings beyond normal capacity.
   */
  allowOverbooking: boolean;
  maximumOverbookingsPerSession: number;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Repeating weekly availability.
 *
 * Example:
 * Every Monday, 09:00–13:00 at Main Hospital Cardiology.
 */
export interface DoctorRecurringAvailabilityRule {
  id: WonFlowId;

  organizationId: WonFlowId;
  practitionerId: WonFlowId;

  branchId: WonFlowId;
  branchDepartmentId: WonFlowId;

  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  roomId?: WonFlowId;

  weekday: Weekday;

  localStartTime: LocalTime;
  localEndTime: LocalTime;
  timezone: string;

  effectiveFrom: CalendarDate;
  effectiveTo?: CalendarDate;

  consultationModes: DoctorConsultationMode[];
  serviceCodes: string[];

  slotDurationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;

  capacityStrategy: DoctorCapacityStrategy;
  capacityPerSlot: number;

  allowWalkIns: boolean;
  walkInCapacity?: number;

  allowOnlineBooking: boolean;
  allowOverbooking: boolean;
  maximumOverbookings?: number;

  status: DoctorAvailabilityRuleStatus;

  createdByUserId: WonFlowId;
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * A concrete working session generated from a recurring rule or created
 * manually.
 */
export interface DoctorScheduleSession {
  id: WonFlowId;

  organizationId: WonFlowId;
  practitionerId: WonFlowId;

  branchId: WonFlowId;
  branchDepartmentId: WonFlowId;

  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  roomId?: WonFlowId;

  recurringRuleId?: WonFlowId;

  source: DoctorScheduleSource;
  status: DoctorScheduleSessionStatus;

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  consultationModes: DoctorConsultationMode[];
  serviceCodes: string[];

  slotDurationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;

  plannedCapacity: number;
  bookedCount: number;
  reservedCount: number;
  walkInCount: number;
  completedCount: number;
  noShowCount: number;

  allowWalkIns: boolean;
  walkInCapacity?: number;

  allowOnlineBooking: boolean;
  allowOverbooking: boolean;
  maximumOverbookings: number;

  notes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Overrides normal recurring availability for a defined period.
 */
export interface DoctorScheduleException {
  id: WonFlowId;

  organizationId: WonFlowId;
  practitionerId: WonFlowId;

  type: DoctorScheduleExceptionType;

  branchId?: WonFlowId;
  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  roomId?: WonFlowId;

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  /**
   * When true, this exception creates availability instead of blocking it.
   */
  createsAvailability: boolean;

  reason: string;
  notes?: string;

  approvedByUserId?: WonFlowId;

  createdByUserId: WonFlowId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DoctorLeaveRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  practitionerId: WonFlowId;

  leaveType:
    | "annual"
    | "sick"
    | "emergency"
    | "study"
    | "official-duty"
    | "unpaid"
    | "other";

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  status: DoctorLeaveStatus;

  reason?: string;
  attachmentDocumentId?: WonFlowId;

  requestedAt: IsoDateTime;
  approvedByUserId?: WonFlowId;
  approvedAt?: IsoDateTime;

  rejectedByUserId?: WonFlowId;
  rejectedAt?: IsoDateTime;
  rejectionReason?: string;

  cancelledAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DoctorOnCallAssignment {
  id: WonFlowId;

  organizationId: WonFlowId;
  practitionerId: WonFlowId;

  branchId: WonFlowId;
  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  contactMethod:
    | "hospital-extension"
    | "mobile"
    | "secure-message"
    | "pager"
    | "other";

  responseTimeTargetMinutes?: number;

  status:
    | "scheduled"
    | "active"
    | "completed"
    | "cancelled";

  notes?: string;

  assignedByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Allows one doctor to cover another doctor's schedule or patients.
 */
export interface DoctorCoverageAssignment {
  id: WonFlowId;

  organizationId: WonFlowId;

  unavailablePractitionerId: WonFlowId;
  coveringPractitionerId: WonFlowId;

  branchId: WonFlowId;
  branchDepartmentId?: WonFlowId;

  scheduleSessionId?: WonFlowId;

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  status: DoctorCoverageStatus;

  reason: string;
  notes?: string;

  requestedByUserId: WonFlowId;
  acceptedAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Current operational state of a doctor.
 *
 * This is not GPS tracking. It represents the doctor's workflow location
 * and current work activity.
 */
export interface DoctorCurrentStatus {
  id: WonFlowId;

  organizationId: WonFlowId;
  practitionerId: WonFlowId;

  status: DoctorOperationalStatus;
  source: DoctorStatusSource;

  branchId?: WonFlowId;
  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  roomId?: WonFlowId;

  scheduleSessionId?: WonFlowId;
  appointmentId?: WonFlowId;
  encounterId?: WonFlowId;
  queueEntryId?: WonFlowId;

  patientFacingStatus: PatientFacingDoctorStatus;
  patientFacingMessage?: string;

  /**
   * Estimated time when the doctor may become available.
   */
  expectedAvailableAt?: IsoDateTime;

  /**
   * Used to communicate delays to operations and patients.
   */
  estimatedDelayMinutes?: number;

  internalReason?: string;

  manuallySetByUserId?: WonFlowId;
  manuallySetAt?: IsoDateTime;
  manualStatusExpiresAt?: IsoDateTime;

  effectiveFrom: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Immutable history of doctor-status changes.
 */
export interface DoctorStatusEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  practitionerId: WonFlowId;

  previousStatus?: DoctorOperationalStatus;
  newStatus: DoctorOperationalStatus;

  source: DoctorStatusSource;
  reason?: string;

  branchId?: WonFlowId;
  branchDepartmentId?: WonFlowId;
  roomId?: WonFlowId;

  appointmentId?: WonFlowId;
  encounterId?: WonFlowId;

  changedByUserId?: WonFlowId;
  changedBySystem: boolean;

  occurredAt: IsoDateTime;
}

/**
 * Defines how appointment slots are generated from schedule sessions.
 */
export interface DoctorSlotGenerationPolicy {
  id: WonFlowId;

  organizationId: WonFlowId;
  practitionerId?: WonFlowId;

  branchId?: WonFlowId;
  branchDepartmentId?: WonFlowId;

  defaultSlotDurationMinutes: number;
  defaultBufferBeforeMinutes: number;
  defaultBufferAfterMinutes: number;

  bookingHorizonDays: number;
  minimumBookingNoticeMinutes: number;

  temporaryReservationMinutes: number;

  allowSameDayBooking: boolean;
  allowWalkIns: boolean;
  allowOverbooking: boolean;

  maximumParallelBookings: number;
  maximumOverbookingsPerSession: number;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DoctorAppointmentSlot {
  id: WonFlowId;

  organizationId: WonFlowId;
  practitionerId: WonFlowId;

  scheduleSessionId: WonFlowId;

  branchId: WonFlowId;
  branchDepartmentId: WonFlowId;

  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  roomId?: WonFlowId;

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  consultationMode: DoctorConsultationMode;

  serviceCodes: string[];

  capacity: number;
  bookedCount: number;
  reservedCount: number;

  status: DoctorAppointmentSlotStatus;

  allowedBookingChannels: DoctorBookingChannel[];

  reservedByUserId?: WonFlowId;
  reservationId?: WonFlowId;
  reservationExpiresAt?: IsoDateTime;

  appointmentIds: WonFlowId[];

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DoctorScheduleConflict {
  id: WonFlowId;

  organizationId: WonFlowId;
  practitionerId: WonFlowId;

  type: DoctorScheduleConflictType;

  scheduleSessionId?: WonFlowId;
  conflictingScheduleSessionId?: WonFlowId;

  appointmentId?: WonFlowId;
  leaveRequestId?: WonFlowId;
  roomId?: WonFlowId;

  severity:
    | "warning"
    | "blocking";

  message: string;

  resolved: boolean;
  resolutionNotes?: string;

  resolvedByUserId?: WonFlowId;
  resolvedAt?: IsoDateTime;

  detectedAt: IsoDateTime;
}

export interface DoctorAvailabilityAggregate {
  profile: DoctorAvailabilityProfile;

  recurringRules: DoctorRecurringAvailabilityRule[];
  scheduleSessions: DoctorScheduleSession[];
  exceptions: DoctorScheduleException[];
  leaveRequests: DoctorLeaveRequest[];
  onCallAssignments: DoctorOnCallAssignment[];
  coverageAssignments: DoctorCoverageAssignment[];

  currentStatus?: DoctorCurrentStatus;
  statusHistory: DoctorStatusEvent[];

  slotPolicies: DoctorSlotGenerationPolicy[];
  appointmentSlots: DoctorAppointmentSlot[];
  conflicts: DoctorScheduleConflict[];
}

export const WONFLOW_DOCTOR_STATUS_TRANSITIONS: Record<
  DoctorOperationalStatus,
  readonly DoctorOperationalStatus[]
> = {
  "off-duty": [
    "scheduled",
    "checking-in",
    "on-call",
    "remote",
    "leave",
  ],

  scheduled: [
    "checking-in",
    "available",
    "delayed",
    "temporarily-unavailable",
    "on-call",
    "off-duty",
  ],

  "checking-in": [
    "available",
    "delayed",
    "temporarily-unavailable",
    "off-duty",
  ],

  available: [
    "in-consultation",
    "in-procedure",
    "on-rounds",
    "on-break",
    "delayed",
    "temporarily-unavailable",
    "finished",
  ],

  delayed: [
    "available",
    "in-consultation",
    "temporarily-unavailable",
    "finished",
  ],

  "in-consultation": [
    "available",
    "in-procedure",
    "on-rounds",
    "on-break",
    "temporarily-unavailable",
    "finished",
  ],

  "in-procedure": [
    "available",
    "on-break",
    "temporarily-unavailable",
    "finished",
  ],

  "on-rounds": [
    "available",
    "in-consultation",
    "on-break",
    "temporarily-unavailable",
    "finished",
  ],

  "on-break": [
    "available",
    "delayed",
    "temporarily-unavailable",
    "finished",
  ],

  "temporarily-unavailable": [
    "available",
    "delayed",
    "on-call",
    "finished",
    "off-duty",
  ],

  "on-call": [
    "available",
    "in-consultation",
    "in-procedure",
    "temporarily-unavailable",
    "off-duty",
  ],

  remote: [
    "available",
    "in-consultation",
    "on-break",
    "temporarily-unavailable",
    "finished",
    "off-duty",
  ],

  leave: [
    "scheduled",
    "off-duty",
  ],

  finished: [
    "off-duty",
    "scheduled",
    "on-call",
    "remote",
  ],
};