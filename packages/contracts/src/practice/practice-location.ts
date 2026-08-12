/**
 * Independent-practice locations and recurring clinic availability.
 *
 * These contracts model locations where an independent practitioner
 * provides services. A location may be operated by the practitioner,
 * hosted by an external hospital or delivered virtually.
 */

import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

import type {
  CalendarDate,
  DoctorConsultationMode,
  LocalTime,
  Weekday,
} from "../scheduling/doctor-availability";

export type PracticeLocationType =
  | "owned-clinic"
  | "external-hospital"
  | "external-clinic"
  | "diagnostic-center"
  | "virtual"
  | "home-visit-base"
  | "other";

export type PracticeScheduleOverrideType =
  | "closure"
  | "leave"
  | "theatre-day"
  | "holiday"
  | "extra-session"
  | "temporary-time-change"
  | "temporary-location-change"
  | "capacity-change"
  | "other";

export type PracticeScheduleOverrideStatus =
  | "draft"
  | "active"
  | "cancelled"
  | "archived";

export interface PracticeLocationAddress {
  addressLine1: string;

  addressLine2?: string;

  city: string;

  district?: string;

  stateOrProvince?: string;

  postalCode?: string;

  countryCode: string;
}

/**
 * A place where an organization provides independent-practice care.
 */
export interface PracticeLocation {
  id: WonFlowId;

  /**
   * Tenant organization that owns this practice-location record.
   */
  organizationId: WonFlowId;

  name: string;

  code: string;

  type: PracticeLocationType;

  /**
   * WonFlow branch representing this location when the facility also
   * operates inside the same WonFlow tenant.
   *
   * External hospitals do not require a linked branch.
   */
  linkedBranchId?: WonFlowId;

  /**
   * Legal or public name of an external host organization.
   */
  externalOrganizationName?: string;

  address?: PracticeLocationAddress;

  phone?: string;

  email?: string;

  timezone: string;

  /**
   * Consultation modes this location can support.
   *
   * A service must still explicitly enable its own consultation modes.
   * This field defines the location-level capability only.
   */
  supportedConsultationModes:
    DoctorConsultationMode[];

  /**
   * Default ISO 4217 currency used when configuring offerings at this
   * location.
   *
   * Individual offerings still store their own immutable currency.
   */
  defaultCurrencyCode: string;

  /**
   * Default slot length proposed when a recurring session is created.
   *
   * Each clinic session may supply a different duration.
   */
  defaultSlotDurationMinutes: number;

  /**
   * Location-level minimum notice for appointment discovery.
   *
   * A more specific booking policy may impose a stricter requirement.
   */
  minimumBookingNoticeMinutes: number;

  /**
   * Maximum number of days into the future exposed for booking at this
   * location.
   */
  bookingHorizonDays: number;

  /**
   * Whether patients may initiate bookings at this location.
   *
   * This is separate from publicVisible: a location may be publicly shown
   * while online booking remains disabled.
   */
  publicBookingEnabled: boolean;

  /**
   * Whether online payment may be offered at this location.
   *
   * Actual methods still come from tenant-owned PaymentProviderConfig
   * records scoped to this location.
   */
  onlinePaymentEnabled: boolean;

  mapUrl?: string;

  patientDirections?: string;

  clinicInstructions?: string;

  publicVisible: boolean;

  status: RecordStatus;

  /**
   * Archive metadata is recorded rather than deleting the location.
   */
  archivedAt?: IsoDateTime;

  archivedByUserId?: WonFlowId;

  archiveReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Repeating weekly clinic availability at a practice location.
 *
 * A clinic session describes normal availability. Concrete appointment
 * slots are generated later from these sessions and schedule overrides.
 */
export interface PracticeClinicSession {
  id: WonFlowId;

  /**
   * Tenant organization that owns this clinic-session record.
   */
  organizationId: WonFlowId;

  /**
   * Specific clinician this session concerns, when the session is not
   * shared across the practice team.
   *
   * This is not an ownership field.
   */
  practitionerId?: WonFlowId;

  practiceLocationId: WonFlowId;

  weekday: Weekday;

  localStartTime: LocalTime;

  localEndTime: LocalTime;

  timezone: string;

  effectiveFrom: CalendarDate;

  effectiveTo?: CalendarDate;

  defaultAppointmentDurationMinutes: number;

  /**
   * Maximum number of appointments normally accepted in this session.
   */
  capacity: number;

  allowOnlineBooking: boolean;

  allowStaffBooking: boolean;

  allowWalkIns: boolean;

  notes?: string;

  status: RecordStatus;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * A date-specific change to normal recurring clinic availability.
 */
export interface PracticeScheduleOverride {
  id: WonFlowId;

  /**
   * Tenant organization that owns this schedule-override record.
   */
  organizationId: WonFlowId;

  /**
   * Specific clinician affected by this override.
   *
   * Leave or a temporary clinician schedule change should set this
   * field. Organization-wide closures may leave it undefined.
   */
  practitionerId?: WonFlowId;

  practiceLocationId: WonFlowId;

  clinicSessionId?: WonFlowId;

  type: PracticeScheduleOverrideType;

  date: CalendarDate;

  /**
   * When true, the override creates availability instead of blocking it.
   */
  createsAvailability: boolean;

  localStartTime?: LocalTime;

  localEndTime?: LocalTime;

  capacityOverride?: number;

  appointmentDurationMinutesOverride?: number;

  reason: string;

  notes?: string;

  status: PracticeScheduleOverrideStatus;

  createdByUserId: WonFlowId;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

export interface PracticeLocationAggregate {
  location: PracticeLocation;

  clinicSessions: PracticeClinicSession[];

  scheduleOverrides: PracticeScheduleOverride[];
}

/**
 * Returns locations owned by a tenant organization.
 */
export function getPracticeLocationsForOrganization(
  locations: readonly PracticeLocation[],
  organizationId: WonFlowId,
): PracticeLocation[] {
  return locations.filter(
    (location) =>
      location.organizationId ===
      organizationId,
  );
}

/**
 * Returns clinic sessions owned by a tenant organization.
 */
export function getPracticeClinicSessionsForOrganization(
  sessions: readonly PracticeClinicSession[],
  organizationId: WonFlowId,
): PracticeClinicSession[] {
  return sessions.filter(
    (session) =>
      session.organizationId ===
      organizationId,
  );
}

/**
 * Returns schedule overrides owned by a tenant organization.
 */
export function getPracticeScheduleOverridesForOrganization(
  overrides: readonly PracticeScheduleOverride[],
  organizationId: WonFlowId,
): PracticeScheduleOverride[] {
  return overrides.filter(
    (override) =>
      override.organizationId ===
      organizationId,
  );
}

/**
 * Determines whether a recurring session is effective on a date.
 *
 * CalendarDate values use YYYY-MM-DD, so lexical comparison preserves
 * chronological order.
 */
export function isPracticeClinicSessionEffectiveOn(
  session: PracticeClinicSession,
  date: CalendarDate,
): boolean {
  if (date < session.effectiveFrom) {
    return false;
  }

  if (
    session.effectiveTo !== undefined &&
    date > session.effectiveTo
  ) {
    return false;
  }

  return session.status === "active";
}

/**
 * Sorts recurring sessions by weekday and then local starting time.
 */
export function comparePracticeClinicSessions(
  left: PracticeClinicSession,
  right: PracticeClinicSession,
): number {
  const weekdayOrder: Record<
    Weekday,
    number
  > = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  };

  const weekdayDifference =
    weekdayOrder[left.weekday] -
    weekdayOrder[right.weekday];

  if (weekdayDifference !== 0) {
    return weekdayDifference;
  }

  return left.localStartTime.localeCompare(
    right.localStartTime,
  );
}
