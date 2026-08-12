import type {
  IsoDateTime,
  WonFlowId,
} from "../organization/hierarchy";
import type {
  DoctorBookingChannel,
  DoctorConsultationMode,
} from "../scheduling/doctor-availability";

/**
 * Date-only value using YYYY-MM-DD.
 */
export type AppointmentDate = string;

export type AppointmentType =
  | "new-consultation"
  | "follow-up"
  | "diagnostic"
  | "procedure"
  | "therapy"
  | "vaccination"
  | "telemedicine"
  | "home-care"
  | "admission-assessment"
  | "other";

export type AppointmentBookingMethod =
  | "time-slot"
  | "arrival-window"
  | "queue-position"
  | "resource-booking";

export type AppointmentStatus =
  | "draft"
  | "slot-reserved"
  | "awaiting-patient"
  | "awaiting-approval"
  | "awaiting-payment"
  | "confirmed"
  | "reminder-sent"
  | "patient-arrived"
  | "checked-in"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show"
  | "expired"
  | "entered-in-error";

export type AppointmentPriority =
  | "routine"
  | "priority"
  | "urgent"
  | "emergency";

export type AppointmentBookingRequestStatus =
  | "draft"
  | "searching"
  | "slot-selected"
  | "reservation-created"
  | "awaiting-patient-confirmation"
  | "awaiting-payment"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "expired";

export type AppointmentReservationStatus =
  | "reserved"
  | "confirmed"
  | "released"
  | "expired"
  | "cancelled";

export type AppointmentCancellationReasonCode =
  | "patient-request"
  | "doctor-unavailable"
  | "doctor-leave"
  | "hospital-closure"
  | "service-unavailable"
  | "payment-not-completed"
  | "insurance-not-approved"
  | "duplicate-booking"
  | "booking-error"
  | "emergency-interruption"
  | "rescheduled"
  | "other";

export type AppointmentCancellationInitiator =
  | "patient"
  | "guardian"
  | "reception"
  | "doctor"
  | "department"
  | "organization"
  | "system";

export type AppointmentRescheduleStatus =
  | "requested"
  | "awaiting-slot"
  | "slot-reserved"
  | "awaiting-patient-confirmation"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "expired";

export type AppointmentWaitlistStatus =
  | "waiting"
  | "matched"
  | "offer-sent"
  | "offer-accepted"
  | "offer-declined"
  | "booked"
  | "expired"
  | "cancelled";

export type AppointmentWaitlistFlexibility =
  | "exact-doctor"
  | "same-department"
  | "same-service"
  | "same-branch"
  | "any-branch";

export type AppointmentSeriesFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "custom";

export type AppointmentSeriesStatus =
  | "draft"
  | "active"
  | "completed"
  | "cancelled";

export type AppointmentStatusTrigger =
  | "patient-action"
  | "guardian-action"
  | "staff-action"
  | "doctor-action"
  | "schedule-event"
  | "payment-event"
  | "insurance-event"
  | "check-in-event"
  | "encounter-event"
  | "timer"
  | "system";

export type AppointmentPaymentRequirement =
  | "not-required"
  | "optional"
  | "deposit-required"
  | "full-payment-required"
  | "insurance-authorization-required";

export type AppointmentConfirmationMethod =
  | "staff-confirmed"
  | "patient-confirmed"
  | "payment-confirmed"
  | "insurance-confirmed"
  | "auto-confirmed";

export interface AppointmentBookingRequest {
  id: WonFlowId;

  organizationId: WonFlowId;

  /**
   * A booking may begin before full patient registration.
   */
  patientId?: WonFlowId;
  provisionalPatientId?: WonFlowId;

  requestedByUserId?: WonFlowId;
  requestedByPatientAccessAccountId?: WonFlowId;

  bookingChannel: DoctorBookingChannel;
  appointmentType: AppointmentType;
  bookingMethod: AppointmentBookingMethod;

  branchId: WonFlowId;
  branchDepartmentId: WonFlowId;

  practitionerId?: WonFlowId;
  serviceCode: string;

  consultationMode: DoctorConsultationMode;

  preferredDate?: AppointmentDate;
  preferredStartAt?: IsoDateTime;
  preferredEndAt?: IsoDateTime;

  preferredPractitionerIds: WonFlowId[];
  acceptableBranchIds: WonFlowId[];

  reasonForAppointment?: string;
  patientNotes?: string;
  staffNotes?: string;

  priority: AppointmentPriority;
  paymentRequirement: AppointmentPaymentRequirement;

  status: AppointmentBookingRequestStatus;

  idempotencyKey: string;

  expiresAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Temporarily holds a doctor slot while booking is being completed.
 *
 * This prevents two users from booking the same final capacity.
 */
export interface AppointmentSlotReservation {
  id: WonFlowId;

  organizationId: WonFlowId;

  bookingRequestId: WonFlowId;
  appointmentSlotId: WonFlowId;

  patientId?: WonFlowId;
  provisionalPatientId?: WonFlowId;

  practitionerId: WonFlowId;
  branchId: WonFlowId;
  branchDepartmentId: WonFlowId;

  startsAt: IsoDateTime;
  endsAt: IsoDateTime;

  capacityUnits: number;

  status: AppointmentReservationStatus;

  idempotencyKey: string;

  reservedByUserId?: WonFlowId;
  reservedByPatientAccessAccountId?: WonFlowId;

  reservedAt: IsoDateTime;
  expiresAt: IsoDateTime;

  confirmedAt?: IsoDateTime;
  releasedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;

  appointmentId?: WonFlowId;
}

export interface Appointment {
  /**
   * Immutable technical identifier.
   */
  id: WonFlowId;

  organizationId: WonFlowId;

  /**
   * Human-readable appointment reference.
   *
   * Example:
   * APT-2026-000481
   */
  appointmentNumber: string;

  patientId: WonFlowId;

  /**
   * Present when the appointment was created before the patient master
   * record was finalized.
   */
  provisionalPatientId?: WonFlowId;

  /**
   * WonFlow hospital branch linkage, when the appointment occurs at a
   * facility represented inside the hospital domain.
   *
   * Independent-practice appointments at external locations may omit
   * these fields and use PracticeAppointment.practiceLocationId instead.
   */
  branchId?: WonFlowId;

  branchDepartmentId?: WonFlowId;

  operationalUnitId?: WonFlowId;
  servicePointId?: WonFlowId;
  roomId?: WonFlowId;

  practitionerId?: WonFlowId;
  serviceCode: string;

  appointmentType: AppointmentType;
  bookingMethod: AppointmentBookingMethod;
  consultationMode: DoctorConsultationMode;
  bookingChannel: DoctorBookingChannel;

  priority: AppointmentPriority;
  status: AppointmentStatus;

  scheduleSessionId?: WonFlowId;
  appointmentSlotId?: WonFlowId;
  slotReservationId?: WonFlowId;

  /**
   * Set when this appointment belongs to a repeated treatment series.
   */
  appointmentSeriesId?: WonFlowId;

  /**
   * Filled after patient arrival when an encounter is created.
   */
  encounterId?: WonFlowId;

  referralId?: WonFlowId;
  careEpisodeId?: WonFlowId;

  reasonForAppointment?: string;
  patientNotes?: string;
  internalNotes?: string;

  scheduledStartAt: IsoDateTime;
  scheduledEndAt: IsoDateTime;

  arrivalWindowStartsAt?: IsoDateTime;
  arrivalWindowEndsAt?: IsoDateTime;

  paymentRequirement: AppointmentPaymentRequirement;
  invoiceId?: WonFlowId;
  paymentId?: WonFlowId;
  insuranceAuthorizationId?: WonFlowId;

  confirmationMethod?: AppointmentConfirmationMethod;

  confirmedAt?: IsoDateTime;
  reminderSentAt?: IsoDateTime;
  patientArrivedAt?: IsoDateTime;
  checkedInAt?: IsoDateTime;
  startedAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;
  noShowRecordedAt?: IsoDateTime;

  createdByUserId?: WonFlowId;
  createdByPatientAccessAccountId?: WonFlowId;

  updatedByUserId?: WonFlowId;
  updatedByPatientAccessAccountId?: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AppointmentStatusEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  appointmentId: WonFlowId;

  previousStatus?: AppointmentStatus;
  newStatus: AppointmentStatus;

  trigger: AppointmentStatusTrigger;
  reason?: string;

  changedByUserId?: WonFlowId;
  changedByPatientAccessAccountId?: WonFlowId;
  changedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface AppointmentCancellation {
  id: WonFlowId;

  organizationId: WonFlowId;
  appointmentId: WonFlowId;

  initiator: AppointmentCancellationInitiator;
  reasonCode: AppointmentCancellationReasonCode;

  reason?: string;
  notes?: string;

  cancelledByUserId?: WonFlowId;
  cancelledByPatientAccessAccountId?: WonFlowId;

  /**
   * Whether the cancellation occurred before the configured free
   * cancellation deadline.
   */
  withinFreeCancellationWindow: boolean;

  /**
   * Exact tenant content shown and acknowledged when cancellation occurs
   * outside the free window.
   */
  consequenceContentBlockId?: WonFlowId;
  consequenceContentVersion?: string;
  consequenceTextSnapshot?: string;

  /**
   * Signals that staff must decide any fee, refund or reconciliation
   * outcome. It does not imply a fee or refund amount.
   */
  financialReviewRequired: boolean;

  cancellationFeeApplied: boolean;
  cancellationFeeAmount?: number;
  currencyCode?: string;

  refundRequired: boolean;
  refundId?: WonFlowId;

  patientNotificationRequired: boolean;
  patientNotifiedAt?: IsoDateTime;

  cancelledAt: IsoDateTime;
}

export interface AppointmentRescheduleRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  appointmentId: WonFlowId;

  status: AppointmentRescheduleStatus;

  requestedBy:
    | "patient"
    | "guardian"
    | "staff"
    | "doctor"
    | "department"
    | "system";

  requestedByUserId?: WonFlowId;
  requestedByPatientAccessAccountId?: WonFlowId;

  reason?: string;

  /**
   * Hospital branch linkage when the original appointment has one.
   *
   * Independent-practice appointments at an external location may omit
   * this and retain their location through PracticeAppointment.
   */
  fromBranchId?: WonFlowId;
  fromPractitionerId?: WonFlowId;
  fromAppointmentSlotId?: WonFlowId;
  fromScheduledStartAt: IsoDateTime;
  fromScheduledEndAt: IsoDateTime;

  preferredBranchIds: WonFlowId[];
  preferredPractitionerIds: WonFlowId[];

  preferredStartAt?: IsoDateTime;
  preferredEndAt?: IsoDateTime;

  selectedBranchId?: WonFlowId;
  selectedPractitionerId?: WonFlowId;
  selectedAppointmentSlotId?: WonFlowId;
  selectedStartAt?: IsoDateTime;
  selectedEndAt?: IsoDateTime;

  newSlotReservationId?: WonFlowId;

  patientConfirmationRequired: boolean;
  patientConfirmedAt?: IsoDateTime;

  requestedAt: IsoDateTime;
  expiresAt?: IsoDateTime;

  confirmedAt?: IsoDateTime;
  rejectedAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;
}

export interface AppointmentRescheduleEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  appointmentId: WonFlowId;
  rescheduleRequestId: WonFlowId;

  fromBranchId?: WonFlowId;
  toBranchId?: WonFlowId;

  fromPractitionerId?: WonFlowId;
  toPractitionerId?: WonFlowId;

  fromAppointmentSlotId?: WonFlowId;
  toAppointmentSlotId?: WonFlowId;

  fromScheduledStartAt: IsoDateTime;
  fromScheduledEndAt: IsoDateTime;

  toScheduledStartAt: IsoDateTime;
  toScheduledEndAt: IsoDateTime;

  reason?: string;

  performedByUserId?: WonFlowId;
  performedByPatientAccessAccountId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

/**
 * Waitlist entry used when no acceptable slot is currently available.
 */
export interface AppointmentWaitlistEntry {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  branchId?: WonFlowId;
  branchDepartmentId: WonFlowId;

  practitionerId?: WonFlowId;
  serviceCode: string;

  appointmentType: AppointmentType;
  consultationMode: DoctorConsultationMode;

  flexibility: AppointmentWaitlistFlexibility;

  preferredStartAt?: IsoDateTime;
  preferredEndAt?: IsoDateTime;

  acceptableBranchIds: WonFlowId[];
  acceptablePractitionerIds: WonFlowId[];

  priority: AppointmentPriority;
  status: AppointmentWaitlistStatus;

  offerAppointmentSlotId?: WonFlowId;
  offerSentAt?: IsoDateTime;
  offerExpiresAt?: IsoDateTime;
  offerRespondedAt?: IsoDateTime;

  appointmentId?: WonFlowId;

  createdByUserId?: WonFlowId;
  createdByPatientAccessAccountId?: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Represents repeated appointments such as physiotherapy,
 * dialysis or recurring follow-up sessions.
 */
export interface AppointmentSeries {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  branchId: WonFlowId;
  branchDepartmentId: WonFlowId;

  practitionerId?: WonFlowId;
  serviceCode: string;

  appointmentType: AppointmentType;
  consultationMode: DoctorConsultationMode;

  frequency: AppointmentSeriesFrequency;
  interval: number;

  startsOn: AppointmentDate;
  endsOn?: AppointmentDate;
  maximumOccurrences?: number;

  preferredLocalStartTime?: string;
  timezone: string;

  status: AppointmentSeriesStatus;

  appointmentIds: WonFlowId[];

  createdByUserId: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AppointmentConflict {
  id: WonFlowId;

  organizationId: WonFlowId;
  appointmentId?: WonFlowId;
  bookingRequestId?: WonFlowId;

  type:
    | "patient-overlap"
    | "doctor-overlap"
    | "slot-capacity-exceeded"
    | "doctor-unavailable"
    | "doctor-leave"
    | "room-unavailable"
    | "service-point-unavailable"
    | "module-disabled"
    | "payment-required"
    | "insurance-authorization-required"
    | "duplicate-booking"
    | "other";

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

export interface AppointmentAggregate {
  appointment: Appointment;

  bookingRequest?: AppointmentBookingRequest;
  reservation?: AppointmentSlotReservation;

  statusHistory: AppointmentStatusEvent[];
  cancellations: AppointmentCancellation[];
  rescheduleRequests: AppointmentRescheduleRequest[];
  rescheduleHistory: AppointmentRescheduleEvent[];
  conflicts: AppointmentConflict[];
}

export const WONFLOW_APPOINTMENT_STATUS_TRANSITIONS: Record<
  AppointmentStatus,
  readonly AppointmentStatus[]
> = {
  draft: [
    "slot-reserved",
    "awaiting-patient",
    "awaiting-approval",
    "awaiting-payment",
    "confirmed",
    "cancelled",
    "expired",
    "entered-in-error",
  ],

  "slot-reserved": [
    "awaiting-patient",
    "awaiting-approval",
    "awaiting-payment",
    "confirmed",
    "cancelled",
    "expired",
  ],

  "awaiting-patient": [
    "awaiting-approval",
    "awaiting-payment",
    "confirmed",
    "cancelled",
    "expired",
  ],

  "awaiting-approval": [
    "awaiting-payment",
    "confirmed",
    "cancelled",
    "expired",
  ],

  "awaiting-payment": [
    "confirmed",
    "cancelled",
    "expired",
  ],

  confirmed: [
    "reminder-sent",
    "patient-arrived",
    "checked-in",
    "cancelled",
    "no-show",
  ],

  "reminder-sent": [
    "patient-arrived",
    "checked-in",
    "cancelled",
    "no-show",
  ],

  "patient-arrived": [
    "checked-in",
    "in-progress",
    "cancelled",
  ],

  "checked-in": [
    "in-progress",
    "cancelled",
  ],

  "in-progress": [
    "completed",
    "cancelled",
    "entered-in-error",
  ],

  completed: [],
  cancelled: [],
  "no-show": [],
  expired: [],
  "entered-in-error": [],
};
