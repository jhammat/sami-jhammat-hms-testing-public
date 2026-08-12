/**
 * Independent-practice appointment booking, generated slots and
 * booking policies.
 *
 * These contracts extend the shared Appointment domain rather than
 * replacing it. The core Appointment remains the source of truth for
 * appointment timing, lifecycle and encounter linkage.
 */

import type {
  Appointment,
} from "../appointments/appointment";

import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

import type {
  DoctorAppointmentSlotStatus,
  DoctorConsultationMode,
} from "../scheduling/doctor-availability";

import type {
  PracticeMoney,
} from "./service-catalogue";

/**
 * Channel through which a practice appointment was created.
 *
 * The channel records the booking entry point. It does not determine
 * authorization, payment requirements or appointment policy.
 */
export type PracticeBookingChannel =
  | "public-page"
  | "patient-portal"
  | "mobile-app"
  | "staff"
  | "phone"
  | "walk-in";

/**
 * Payment state displayed during the practice booking lifecycle.
 *
 * Detailed payment intents, settlements, refunds and reconciliation
 * are introduced by the practice-payment contracts in P1-07.
 */
export type PracticeAppointmentPaymentState =
  | "not-required"
  | "unpaid"
  | "pending"
  | "paid"
  | "waived"
  | "refunded";

/**
 * Final or significant outcome of a practice booking.
 */
export type PracticeBookingOutcome =
  | "attended"
  | "no-show"
  | "cancelled-by-patient"
  | "cancelled-by-practice"
  | "rescheduled";

/**
 * Configured response when a patient does not attend.
 *
 * This contract records policy configuration only. Payment collection
 * and account restrictions are implemented by later services.
 */
export type PracticeNoShowHandling =
  | "record-only"
  | "require-staff-review"
  | "restrict-future-online-booking";

/**
 * Practice-facing status for a generated appointment slot.
 *
 * Reuse the existing doctor-slot lifecycle rather than creating a
 * competing slot status vocabulary.
 */
export type PracticeSlotStatus =
  DoctorAppointmentSlotStatus;

/**
 * Practice-specific details attached to an existing Appointment.
 *
 * The shared Appointment remains the authoritative appointment record.
 * This contract links that record to the practice location, catalogue,
 * offering, team member, quoted price and booking policy context.
 */
export interface PracticeAppointment
  extends Pick<
    Appointment,
    | "scheduledStartAt"
    | "scheduledEndAt"
    | "status"
  > {
  /**
   * Existing shared Appointment record being extended.
   */
  appointmentId: Appointment["id"];

  organizationId: WonFlowId;

  /**
   * Client-generated retry key used to make confirmation idempotent
   * within one organization.
   */
  idempotencyKey: string;

  /**
   * Booking policy resolved when the appointment was created.
   */
  practiceBookingPolicyId: WonFlowId;

  practiceLocationId: WonFlowId;

  practiceServiceId: WonFlowId;

  practiceServiceOfferingId: WonFlowId;

  /**
   * Generated practice slot used by this booking, when applicable.
   *
   * Walk-ins and manually arranged appointments may not use a slot.
   */
  practiceSlotId?: WonFlowId;

  /**
   * Team member assigned to deliver or coordinate this service.
   *
   * This may remain undefined until the practice assigns a clinician.
   */
  assignedTeamMemberId?: WonFlowId;

  consultationMode: DoctorConsultationMode;

  /**
   * Immutable fee quoted when the booking was confirmed.
   *
   * Later catalogue fee changes must not alter this snapshot.
   */
  quotedFee: PracticeMoney;

  paymentState:
    PracticeAppointmentPaymentState;

  bookingChannel: PracticeBookingChannel;

  /**
   * Documents supplied to satisfy the service's booking requirement.
   *
   * These are references to tenant-owned PracticeDocument records.
   */
  attachedDocumentIds: WonFlowId[];

  /**
   * Number of completed reschedules applied to this appointment.
   *
   * This is compared with PracticeBookingPolicy.maximumReschedules.
   */
  rescheduleCount: number;

  outcome?: PracticeBookingOutcome;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Concrete availability generated from a recurring clinic session and,
 * when applicable, a date-specific schedule override.
 */
export interface PracticeSlot {
  id: WonFlowId;

  organizationId: WonFlowId;

  practiceLocationId: WonFlowId;

  practiceServiceId: WonFlowId;

  practiceServiceOfferingId: WonFlowId;

  /**
   * Recurring clinic session from which this slot was generated.
   */
  practiceClinicSessionId: WonFlowId;

  /**
   * Date-specific override that changed or created this slot.
   */
  practiceScheduleOverrideId?: WonFlowId;

  /**
   * Specific practitioner represented by the slot, when applicable.
   */
  practitionerId?: WonFlowId;

  /**
   * Team member directly bookable for this slot, when applicable.
   */
  assignedTeamMemberId?: WonFlowId;

  consultationMode: DoctorConsultationMode;

  startsAt: IsoDateTime;

  endsAt: IsoDateTime;

  /**
   * Maximum number of bookings accepted by this generated slot.
   */
  capacity: number;

  /**
   * Capacity temporarily held while bookings are being completed.
   */
  reservedCount: number;

  /**
   * Confirmed appointments currently consuming capacity.
   */
  bookedCount: number;

  /**
   * Remaining capacity available for a new reservation or booking.
   *
   * This value is stored on the generated slot so list screens do not
   * need to recalculate it repeatedly.
   */
  remainingCount: number;

  status: PracticeSlotStatus;

  generatedAt: IsoDateTime;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Booking rules applied by an organization.
 *
 * A policy may be organization-wide or narrowed to a location, service
 * or location-specific service offering.
 */
export interface PracticeBookingPolicy {
  id: WonFlowId;

  organizationId: WonFlowId;

  practiceLocationId?: WonFlowId;

  practiceServiceId?: WonFlowId;

  practiceServiceOfferingId?: WonFlowId;

  /**
   * Minimum time required between booking and appointment start.
   */
  minimumBookingNoticeMinutes: number;

  /**
   * Time before appointment start during which cancellation is no
   * longer free of charge.
   */
  cancellationWindowMinutes: number;

  /**
   * Maximum number of successful reschedules allowed for one booking.
   */
  maximumReschedules: number;

  noShowHandling: PracticeNoShowHandling;

  /**
   * When true, the booking may not be fully confirmed until the
   * configured prepayment requirement is satisfied.
   */
  enforcePrepayment: boolean;

  status: RecordStatus;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Complete practice-specific booking view.
 */
export interface PracticeBookingAggregate {
  practiceAppointment: PracticeAppointment;

  slot?: PracticeSlot;

  policy: PracticeBookingPolicy;
}

/**
 * Determines whether a generated practice slot may accept a new booking.
 *
 * This helper validates lifecycle state, capacity, time range and the
 * configured minimum booking notice.
 */
export function isPracticeSlotBookable(
  slot: PracticeSlot,
  policy: PracticeBookingPolicy,
  now: IsoDateTime,
): boolean {
  if (slot.status !== "available") {
    return false;
  }

  if (
    slot.capacity <= 0 ||
    slot.remainingCount <= 0 ||
    slot.remainingCount > slot.capacity
  ) {
    return false;
  }

  if (
    policy.minimumBookingNoticeMinutes < 0
  ) {
    return false;
  }

  const currentTime =
    Date.parse(now);

  const slotStartTime =
    Date.parse(slot.startsAt);

  const slotEndTime =
    Date.parse(slot.endsAt);

  if (
    Number.isNaN(currentTime) ||
    Number.isNaN(slotStartTime) ||
    Number.isNaN(slotEndTime)
  ) {
    return false;
  }

  if (
    slotStartTime >= slotEndTime ||
    slotStartTime <= currentTime
  ) {
    return false;
  }

  const minimumNoticeMilliseconds =
    policy.minimumBookingNoticeMinutes *
    60 *
    1000;

  return (
    slotStartTime - currentTime >=
    minimumNoticeMilliseconds
  );
}

/**
 * Determines whether an appointment remains inside the free
 * cancellation window.
 *
 * Appointments that have already arrived, checked in, started or reached
 * a terminal lifecycle state cannot be cancelled without charge.
 */
export function canCancelWithoutCharge(
  appointment: PracticeAppointment,
  policy: PracticeBookingPolicy,
  now: IsoDateTime,
): boolean {
  const nonCancellableStatuses:
    readonly Appointment["status"][] = [
    "patient-arrived",
    "checked-in",
    "in-progress",
    "completed",
    "cancelled",
    "no-show",
    "expired",
    "entered-in-error",
  ];

  if (
    nonCancellableStatuses.includes(
      appointment.status,
    )
  ) {
    return false;
  }

  if (
    policy.cancellationWindowMinutes < 0
  ) {
    return false;
  }

  const currentTime =
    Date.parse(now);

  const appointmentStartTime =
    Date.parse(
      appointment.scheduledStartAt,
    );

  if (
    Number.isNaN(currentTime) ||
    Number.isNaN(
      appointmentStartTime,
    )
  ) {
    return false;
  }

  const cancellationWindowMilliseconds =
    policy.cancellationWindowMinutes *
    60 *
    1000;

  const freeCancellationDeadline =
    appointmentStartTime -
    cancellationWindowMilliseconds;

  return (
    currentTime <=
    freeCancellationDeadline
  );
}
