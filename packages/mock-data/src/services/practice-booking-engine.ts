import {
  canPracticeTeamMemberWorkAtLocation,
  isPracticeClinicSessionEffectiveOn,
  resolvePracticeOfferingDurationMinutes,
} from "@wonflow/contracts";
import type {
  Appointment,
  CalendarDate,
  DoctorConsultationMode,
  IsoDateTime,
  PracticeBookingChannel,
  PracticeBookingPolicy,
  PracticeClinicSession,
  PracticeLocation,
  PracticeScheduleOverride,
  PracticeService,
  PracticeServiceOffering,
  PracticeSlot,
  PracticeTeamMember,
  WonFlowId,
} from "@wonflow/contracts";
import {
  addPracticeCalendarDays,
  getPracticeCalendarWeekday,
  getPracticeLocalDate,
  practiceLocalDateTimeToDate,
} from "./practice-booking-time";

export interface GeneratePracticeBookingSlotsInput {
  organizationId: WonFlowId;
  location: PracticeLocation;
  service: PracticeService;
  offering: PracticeServiceOffering;
  policy: PracticeBookingPolicy;
  sessions: readonly PracticeClinicSession[];
  overrides: readonly PracticeScheduleOverride[];
  appointments: readonly Appointment[];
  consultationMode: DoctorConsultationMode;
  bookingChannel: Exclude<PracticeBookingChannel, "public-page">;
  teamMember?: PracticeTeamMember;
  dateFrom: CalendarDate;
  dateTo: CalendarDate;
  now: IsoDateTime;
}

function configurationError(message: string): Error {
  return new Error(`Practice booking configuration error: ${message}`);
}

export function resolvePracticeBookingPolicy(
  policies: readonly PracticeBookingPolicy[],
  defaultBookingPolicyId: WonFlowId | undefined,
  practiceLocationId: WonFlowId,
  practiceServiceId: WonFlowId,
  practiceServiceOfferingId: WonFlowId,
): PracticeBookingPolicy {
  const matches = policies
    .filter((policy) => policy.status === "active")
    .map((policy) => {
      const exactOffering = policy.practiceServiceOfferingId === practiceServiceOfferingId;
      const exactService = policy.practiceServiceId === practiceServiceId;
      const exactLocation = policy.practiceLocationId === practiceLocationId;
      let specificity = -1;
      if (exactOffering && exactService && exactLocation) specificity = 5;
      else if (policy.practiceServiceOfferingId === undefined && exactService && exactLocation) specificity = 4;
      else if (policy.practiceServiceOfferingId === undefined && exactService && policy.practiceLocationId === undefined) specificity = 3;
      else if (policy.practiceServiceOfferingId === undefined && policy.practiceServiceId === undefined && exactLocation) specificity = 2;
      else if (policy.practiceServiceOfferingId === undefined && policy.practiceServiceId === undefined && policy.practiceLocationId === undefined) specificity = 1;
      return { policy, specificity };
    })
    .filter((candidate) => candidate.specificity >= 0);
  const highest = Math.max(...matches.map((candidate) => candidate.specificity));
  const compatible = matches.filter((candidate) => candidate.specificity === highest).map((candidate) => candidate.policy);
  if (compatible.length === 0) throw configurationError("no active policy matches this offering");
  if (compatible.length === 1) return compatible[0]!;
  const selected = compatible.find((policy) => policy.id === defaultBookingPolicyId);
  if (selected === undefined) throw configurationError("multiple equally specific policies match this offering");
  return selected;
}

export function resolvePracticeBookingClinicians(
  members: readonly PracticeTeamMember[],
  service: PracticeService,
  practiceLocationId: WonFlowId,
  _at: IsoDateTime,
): PracticeTeamMember[] {
  if (service.deliveryScope === "unassigned") return [];
  return members.filter((member) => {
    if (
      member.status !== "active" ||
      member.practitionerId === undefined ||
      !member.independentlyBookable ||
      !canPracticeTeamMemberWorkAtLocation(member, practiceLocationId)
    ) return false;
    if (service.practitionerId !== undefined && member.practitionerId !== service.practitionerId) return false;
    return service.deliveryScope !== "selected-clinicians" || service.eligiblePractitionerIds.includes(member.practitionerId);
  });
}

function isSessionAllowed(session: PracticeClinicSession, channel: GeneratePracticeBookingSlotsInput["bookingChannel"]): boolean {
  if (channel === "patient-portal" || channel === "mobile-app") return session.allowOnlineBooking;
  if (channel === "walk-in") return session.allowWalkIns;
  return session.allowStaffBooking;
}

function stableSlotId(parts: readonly string[]): WonFlowId {
  let hash = 2166136261;
  for (const character of parts.join("\u001f")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `practice-slot:${(hash >>> 0).toString(36)}:${parts.at(-1)}` as WonFlowId;
}

function isActiveAppointment(appointment: Appointment): boolean {
  return !["cancelled", "expired", "entered-in-error"].includes(appointment.status);
}

function addSlotSeries(
  result: PracticeSlot[],
  input: GeneratePracticeBookingSlotsInput,
  session: PracticeClinicSession,
  override: PracticeScheduleOverride | undefined,
  date: CalendarDate,
  localStartTime: string,
  localEndTime: string,
  capacity: number,
  durationMinutes: number,
): void {
  const start = practiceLocalDateTimeToDate(date, localStartTime, session.timezone);
  const end = practiceLocalDateTimeToDate(date, localEndTime, session.timezone);
  const notice = Math.max(input.location.minimumBookingNoticeMinutes, input.policy.minimumBookingNoticeMinutes);
  const noticeBoundary = Date.parse(input.now) + notice * 60_000;
  const clinician = input.teamMember;
  for (let index = 0, cursor = start.getTime(); index < capacity; index += 1, cursor += durationMinutes * 60_000) {
    const slotEnd = cursor + durationMinutes * 60_000;
    if (!Number.isFinite(cursor) || slotEnd > end.getTime() || cursor < noticeBoundary) continue;
    const startsAt = new Date(cursor).toISOString();
    const endsAt = new Date(slotEnd).toISOString();
    const bookedCount = input.appointments.filter((appointment) =>
      isActiveAppointment(appointment) &&
      appointment.scheduledStartAt === startsAt &&
      appointment.scheduledEndAt === endsAt &&
      (clinician?.practitionerId === undefined || appointment.practitionerId === clinician.practitionerId),
    ).length;
    if (bookedCount >= 1) continue;
    const tuple = [input.organizationId, input.location.id, input.service.id, input.offering.id, session.id, override?.id ?? "", input.consultationMode, clinician?.id ?? "", startsAt];
    result.push({
      id: stableSlotId(tuple),
      organizationId: input.organizationId,
      practiceLocationId: input.location.id,
      practiceServiceId: input.service.id,
      practiceServiceOfferingId: input.offering.id,
      practiceClinicSessionId: session.id,
      ...(override === undefined ? {} : { practiceScheduleOverrideId: override.id }),
      ...(clinician?.practitionerId === undefined ? {} : { practitionerId: clinician.practitionerId }),
      ...(clinician === undefined ? {} : { assignedTeamMemberId: clinician.id }),
      consultationMode: input.consultationMode,
      startsAt,
      endsAt,
      capacity: 1,
      reservedCount: 0,
      bookedCount,
      remainingCount: 1 - bookedCount,
      status: bookedCount === 0 ? "available" : "booked",
      generatedAt: input.now,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }
}

export function generatePracticeBookingSlots(input: GeneratePracticeBookingSlotsInput): PracticeSlot[] {
  if (!input.location.supportedConsultationModes.includes(input.consultationMode) || !input.service.consultationModes.includes(input.consultationMode)) return [];
  const firstAllowedDate = getPracticeLocalDate(new Date(input.now), input.location.timezone);
  const lastAllowedDate = addPracticeCalendarDays(firstAllowedDate, input.location.bookingHorizonDays);
  const from = input.dateFrom < firstAllowedDate ? firstAllowedDate : input.dateFrom;
  const to = input.dateTo > lastAllowedDate ? lastAllowedDate : input.dateTo;
  if (from > to) return [];
  const result: PracticeSlot[] = [];
  for (let date = from; date <= to; date = addPracticeCalendarDays(date, 1)) {
    for (const session of input.sessions) {
      if (
        session.weekday !== getPracticeCalendarWeekday(date) ||
        !isPracticeClinicSessionEffectiveOn(session, date) ||
        !isSessionAllowed(session, input.bookingChannel) ||
        (session.practitionerId !== undefined && session.practitionerId !== input.teamMember?.practitionerId)
      ) continue;
      const activeDateOverrides = input.overrides.filter((override) =>
        override.status === "active" && override.date === date,
      );
      const locationMove = activeDateOverrides.find((override) =>
        override.clinicSessionId === session.id && override.type === "temporary-location-change",
      );
      const effectiveLocationId = locationMove?.practiceLocationId ?? session.practiceLocationId;
      if (effectiveLocationId !== input.location.id) continue;
      const relevant = activeDateOverrides.filter((override) =>
        (override.clinicSessionId === session.id || (override.clinicSessionId === undefined && override.practiceLocationId === effectiveLocationId)) &&
        (override.practitionerId === undefined || override.practitionerId === input.teamMember?.practitionerId),
      );
      const creatingOverride = relevant.find((override) => override.createsAvailability && override.localStartTime !== undefined && override.localEndTime !== undefined);
      const blocked = relevant.some((override) => !override.createsAvailability && override.type !== "capacity-change") || relevant.some((override) => override.capacityOverride === 0);
      if (blocked && creatingOverride === undefined) continue;
      const applied = creatingOverride ?? relevant.find((override) => override.capacityOverride !== undefined || override.appointmentDurationMinutesOverride !== undefined);
      const capacity = applied?.capacityOverride ?? session.capacity;
      if (capacity <= 0) continue;
      const duration = applied?.appointmentDurationMinutesOverride ?? resolvePracticeOfferingDurationMinutes(input.service, input.offering) ?? session.defaultAppointmentDurationMinutes;
      addSlotSeries(result, input, session, applied, date, applied?.localStartTime ?? session.localStartTime, applied?.localEndTime ?? session.localEndTime, capacity, duration);
    }
  }
  return result.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}
