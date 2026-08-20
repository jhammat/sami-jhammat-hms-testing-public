import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import { WonFlowApiError } from "@/server/http/route-handler";

/**
 * The single place that answers "why can this not start?" for every action
 * that has real prerequisites. Every screen that gates a button on server
 * state calls one of these instead of inventing its own ad-hoc check — the
 * sitting and consultation controls previously failed silently because
 * nothing checked prerequisites before the action was attempted, and the
 * check that existed lived scattered across service methods as generic
 * thrown errors instead of a named, actionable blocker list.
 */

export type ReadinessAction =
  | "start-sitting"
  | "start-consultation"
  | "book-appointment"
  | "confirm-online-payment";

export interface ReadinessBlocker {
  /** Stable, machine-matchable — one code per distinct real-world cause. */
  code: string;
  /** What is wrong, in plain English, naming the exact fix — never "X is required" alone. */
  reason: string;
  /** Who can act on this: the signed-in user themselves, or a role that must act. */
  resolverRole: "self" | "administrator" | "reception" | "billing" | "doctor";
  /** The screen that fixes it, when navigation to another page is required. */
  resolutionHref?: string;
}

export interface ReadinessResult {
  ready: boolean;
  blockers: ReadinessBlocker[];
}

function ready(): ReadinessResult {
  return { ready: true, blockers: [] };
}

function blocked(blockers: ReadinessBlocker[]): ReadinessResult {
  if (blockers.length === 0) throw new Error("blocked() called with no blockers — use ready() instead.");
  return { ready: false, blockers };
}

// ---------------------------------------------------------------------------
// start-sitting
// ---------------------------------------------------------------------------

export interface StartSittingInput {
  branchId: string;
  businessDate: string;
  roomLabel?: string;
}

export async function checkStartSittingReadiness(
  requestContext: WonFlowRequestContext,
  input: StartSittingInput,
): Promise<ReadinessResult> {
  const context = requireTenantContext(requestContext);
  const blockers: ReadinessBlocker[] = [];

  if (!context.membershipId) {
    return blocked([{
      code: "membership-required",
      reason: "You are not signed in as a hospital staff member, so there is no staff profile to start a sitting under.",
      resolverRole: "administrator",
      resolutionHref: "/admin/team",
    }]);
  }

  const staffProfile = await database.staffProfile.findUnique({
    where: { membershipId: context.membershipId },
    include: { doctor: true },
  });

  if (!staffProfile) {
    return blocked([{
      code: "staff-profile-required",
      reason: "Your account has no staff profile in this hospital. An administrator can create one in Admin → Team → Staff.",
      resolverRole: "administrator",
      resolutionHref: "/admin/team",
    }]);
  }

  if (staffProfile.status !== "ACTIVE") {
    blockers.push({
      code: "staff-profile-inactive",
      reason: `Your staff profile is ${staffProfile.status.toLowerCase()}, not active. An administrator must reactivate it in Admin → Team → Staff before you can start a sitting.`,
      resolverRole: "administrator",
      resolutionHref: "/admin/team",
    });
  }

  if (!staffProfile.doctor) {
    return blocked([
      ...blockers,
      {
        code: "doctor-profile-required",
        reason: "Your staff profile is not linked to a doctor profile, so you cannot record a sitting. An administrator can link it in Admin → Team → Staff.",
        resolverRole: "administrator",
        resolutionHref: "/admin/team",
      },
    ]);
  }

  const doctor = staffProfile.doctor;

  if (!staffProfile.branchId) {
    blockers.push({
      code: "doctor-branch-required",
      reason: "You are not assigned to a hospital branch, so there is nowhere to record your sitting against. An administrator can assign your branch in Admin → Team → Staff.",
      resolverRole: "administrator",
      resolutionHref: "/admin/team",
    });
  }

  const branch = await database.branch.findFirst({
    where: { id: input.branchId, tenantId: context.tenantId, organizationId: context.organizationId },
  });

  if (!branch) {
    blockers.push({
      code: "branch-not-found",
      reason: "No hospital branch is selected. Choose a branch from the 'Hospital branch' dropdown below before starting your sitting.",
      resolverRole: "self",
    });
  } else {
    if (branch.archivedAt) {
      blockers.push({
        code: "branch-archived",
        reason: `${branch.name} has been archived and can no longer accept sittings. An administrator can restore it in Admin → Locations, or choose a different branch.`,
        resolverRole: "administrator",
        resolutionHref: "/admin/locations",
      });
    } else if (branch.status !== "ACTIVE") {
      blockers.push({
        code: "branch-inactive",
        reason: `${branch.name} is marked ${branch.status.toLowerCase()}, not active. An administrator can reactivate it in Admin → Locations.`,
        resolverRole: "administrator",
        resolutionHref: "/admin/locations",
      });
    }
  }

  const businessDate = new Date(`${input.businessDate}T00:00:00.000Z`);
  if (Number.isNaN(businessDate.getTime())) {
    blockers.push({
      code: "invalid-business-date",
      reason: "The selected sitting date is invalid. Please pick today's date from the sitting panel.",
      resolverRole: "self",
    });
  } else {
    // A doctor cannot be actively sitting in two branches on the same date —
    // check every OTHER branch's sitting row for this doctor and date, since
    // the [doctorId, branchId, businessDate] unique constraint already
    // prevents two rows for the SAME branch (that is an update, not a conflict).
    const otherActiveSitting = await database.doctorSitting.findFirst({
      where: {
        tenantId: context.tenantId,
        doctorId: doctor.id,
        businessDate,
        branchId: { not: input.branchId },
        status: { in: ["AVAILABLE", "ON_BREAK"] },
      },
      include: { branch: { select: { name: true } } },
    });

    if (otherActiveSitting) {
      blockers.push({
        code: "sitting-already-active-elsewhere",
        reason: `You already have an active sitting today at ${otherActiveSitting.branch.name}. End that sitting before starting one at this branch.`,
        resolverRole: "self",
      });
    }

    if (branch && input.roomLabel?.trim()) {
      const roomTaken = await database.doctorSitting.findFirst({
        where: {
          tenantId: context.tenantId,
          branchId: input.branchId,
          businessDate,
          doctorId: { not: doctor.id },
          roomLabel: input.roomLabel.trim(),
          status: { in: ["AVAILABLE", "ON_BREAK"] },
        },
        include: { doctor: { include: { staffProfile: { include: { membership: true } } } } },
      });

      if (roomTaken) {
        blockers.push({
          code: "room-occupied",
          reason: `${input.roomLabel.trim()} is already in use today by ${roomTaken.doctor.staffProfile.membership.displayName}. Please choose a different room from the 'Consultation room' dropdown below.`,
          resolverRole: "self",
        });
      }
    } else if (!input.roomLabel?.trim()) {
      blockers.push({
        code: "room-required",
        reason: "No consultation room is selected. Please choose a room from the 'Consultation room' dropdown below (or click '+ Add' to create one) to start your sitting.",
        resolverRole: "self",
      });
    }
  }

  return blockers.length > 0 ? blocked(blockers) : ready();
}

// ---------------------------------------------------------------------------
// start-consultation
// ---------------------------------------------------------------------------

export interface StartConsultationInput {
  appointmentId: string;
}

export async function checkStartConsultationReadiness(
  requestContext: WonFlowRequestContext,
  input: StartConsultationInput,
): Promise<ReadinessResult> {
  const context = requireTenantContext(requestContext);
  const blockers: ReadinessBlocker[] = [];

  if (!context.membershipId) {
    return blocked([{
      code: "membership-required",
      reason: "You are not signed in as a hospital staff member.",
      resolverRole: "administrator",
      resolutionHref: "/admin/team",
    }]);
  }

  const staffProfile = await database.staffProfile.findUnique({
    where: { membershipId: context.membershipId },
    include: { doctor: true },
  });

  if (!staffProfile?.doctor) {
    return blocked([{
      code: "doctor-profile-required",
      reason: "Your account is not linked to a doctor profile. An administrator can link it in Admin → Team → Staff.",
      resolverRole: "administrator",
      resolutionHref: "/admin/team",
    }]);
  }

  const doctor = staffProfile.doctor;

  const appointment = await database.appointment.findFirst({
    where: { id: input.appointmentId, tenantId: context.tenantId },
    include: { service: true, patient: { select: { givenName: true, familyName: true } } },
  });

  if (!appointment) {
    return blocked([{
      code: "appointment-not-found",
      reason: "This appointment no longer exists. Refresh the queue and select the patient again.",
      resolverRole: "self",
      resolutionHref: "/doctor/appointments",
    }]);
  }

  if (appointment.doctorId !== doctor.id) {
    return blocked([{
      code: "appointment-belongs-to-another-doctor",
      reason: "This appointment is booked with a different doctor and cannot be started from your account.",
      resolverRole: "reception",
      resolutionHref: "/operations/appointments",
    }]);
  }

  const businessDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" });
  const appointmentDate = businessDateFormatter.format(appointment.startsAt);
  const activeSitting = await database.doctorSitting.findFirst({
    where: {
      tenantId: context.tenantId,
      doctorId: doctor.id,
      businessDate: new Date(`${appointmentDate}T00:00:00.000Z`),
      status: "AVAILABLE",
    },
  });

  if (!activeSitting) {
    blockers.push({
      code: "no-active-sitting",
      reason: `You have no active sitting recorded for ${appointmentDate}.`,
      resolverRole: "self",
      resolutionHref: "/doctor/schedule",
    });
  }

  if (!appointment.checkedInAt) {
    const patientName = appointment.patient
      ? `${appointment.patient.givenName} ${appointment.patient.familyName}`.trim()
      : "The patient";
    blockers.push({
      code: "patient-not-checked-in",
      reason: `${patientName} has not checked in at reception yet.`,
      resolverRole: "reception",
      resolutionHref: "/operations/queue",
    });
  }

  if (appointment.service?.requiresPrepayment && appointment.paymentStatus !== "PAYMENT_CONFIRMED") {
    blockers.push({
      code: "payment-not-confirmed",
      reason: `${appointment.service.name} requires payment before the consultation. ${appointment.paymentStatus === "AWAITING_PAYMENT" ? "Confirm the uploaded payment proof" : "Ask the patient to complete payment"} on the payment confirmation screen.`,
      resolverRole: "billing",
      resolutionHref: `/operations/billing/confirm-payment?appointmentId=${appointment.id}`,
    });
  }

  const openEncounter = await database.encounter.findFirst({
    where: { tenantId: context.tenantId, doctorId: doctor.id, status: "IN_PROGRESS" },
    include: { patient: { select: { givenName: true, familyName: true } } },
  });

  if (openEncounter && openEncounter.appointmentId !== appointment.id) {
    blockers.push({
      code: "another-encounter-open",
      reason: `You already have a consultation in progress with ${openEncounter.patient.givenName} ${openEncounter.patient.familyName}. Complete or pause it before starting another.`,
      resolverRole: "self",
      resolutionHref: "/doctor/consultations",
    });
  }

  return blockers.length > 0 ? blocked(blockers) : ready();
}

// ---------------------------------------------------------------------------
// book-appointment
// ---------------------------------------------------------------------------

export interface BookAppointmentReadinessInput {
  patientId: string;
  doctorId: string;
  branchId: string;
  serviceId?: string;
  startsAt: string;
  endsAt: string;
}

export async function checkBookAppointmentReadiness(
  requestContext: WonFlowRequestContext,
  input: BookAppointmentReadinessInput,
): Promise<ReadinessResult> {
  const context = requireTenantContext(requestContext);
  const blockers: ReadinessBlocker[] = [];

  const patient = await database.patient.findFirst({
    where: { id: input.patientId, tenantId: context.tenantId, status: { not: "ARCHIVED" } },
  });
  if (!patient) {
    blockers.push({
      code: "patient-not-found",
      reason: "This patient record does not exist or has been archived. Register the patient before booking.",
      resolverRole: "reception",
      resolutionHref: "/operations/reception",
    });
  }

  const doctor = await database.doctorProfile.findFirst({
    where: { id: input.doctorId, tenantId: context.tenantId },
    include: { staffProfile: { include: { membership: true } } },
  });
  if (!doctor) {
    blockers.push({
      code: "doctor-not-found",
      reason: "This doctor does not exist in this hospital.",
      resolverRole: "reception",
      resolutionHref: "/operations/reception",
    });
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  const validRange = !Number.isNaN(startsAt.getTime()) && !Number.isNaN(endsAt.getTime()) && endsAt > startsAt;
  if (!validRange) {
    blockers.push({
      code: "invalid-time-range",
      reason: "The selected appointment time is invalid. Choose a time from the available slots list.",
      resolverRole: "self",
      resolutionHref: "/operations/reception",
    });
  }

  if (doctor && validRange) {
    const weekday = startsAt.getUTCDay();
    const availability = await database.availabilityRule.findFirst({
      where: {
        tenantId: context.tenantId,
        doctorId: doctor.id,
        branchId: input.branchId,
        weekday,
        isActive: true,
        validFrom: { lte: startsAt },
        OR: [{ validUntil: null }, { validUntil: { gte: startsAt } }],
      },
    });

    const businessDate = new Date(startsAt.toISOString().slice(0, 10) + "T00:00:00.000Z");
    const sitting = await database.doctorSitting.findFirst({
      where: {
        tenantId: context.tenantId,
        doctorId: doctor.id,
        branchId: input.branchId,
        businessDate,
      },
    });

    const hasAvailability = sitting ? (sitting.status !== "FINISHED") : !!availability;

    if (!hasAvailability) {
      blockers.push({
        code: "no-published-availability",
        reason: `${doctor.staffProfile.membership.displayName} has no published availability for this day at this branch. Ask the doctor to publish their schedule, or an administrator to set rostered hours in Admin → Schedules.`,
        resolverRole: "administrator",
        resolutionHref: "/admin/schedules",
      });
    }

    const conflict = await database.appointment.findFirst({
      where: {
        tenantId: context.tenantId,
        doctorId: doctor.id,
        branchId: input.branchId,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (conflict) {
      blockers.push({
        code: "slot-taken",
        reason: "This time was just booked by someone else. Choose a different available time.",
        resolverRole: "self",
        resolutionHref: "/operations/reception",
      });
    }
  }

  if (input.serviceId) {
    const service = await database.serviceDefinition.findFirst({
      where: {
        id: input.serviceId,
        tenantId: context.tenantId,
        isActive: true,
        OR: [{ branchId: null }, { branchId: input.branchId }],
      },
    });
    if (!service) {
      blockers.push({
        code: "service-not-offered-at-location",
        reason: "The selected consultation service is not offered at this branch. Choose a different service or branch.",
        resolverRole: "administrator",
        resolutionHref: "/admin/services",
      });
    }
  }

  return blockers.length > 0 ? blocked(blockers) : ready();
}

// ---------------------------------------------------------------------------
// confirm-online-payment
// ---------------------------------------------------------------------------

export interface ConfirmOnlinePaymentInput {
  appointmentId: string;
}

export async function checkConfirmOnlinePaymentReadiness(
  requestContext: WonFlowRequestContext,
  input: ConfirmOnlinePaymentInput,
): Promise<ReadinessResult> {
  const context = requireTenantContext(requestContext);
  const blockers: ReadinessBlocker[] = [];

  if (!context.permissionCodes.includes("billing.payments.manage")) {
    blockers.push({
      code: "billing-permission-required",
      reason: "Your account does not have billing permission, so you cannot confirm a payment. An administrator can grant billing access in Admin → Team → Staff.",
      resolverRole: "administrator",
      resolutionHref: "/admin/team",
    });
  }

  const appointment = await database.appointment.findFirst({
    where: { id: input.appointmentId, tenantId: context.tenantId },
    include: { patient: { select: { givenName: true, familyName: true } } },
  });

  if (!appointment) {
    return blocked([
      ...blockers,
      {
        code: "appointment-not-found",
        reason: "This appointment does not exist.",
        resolverRole: "self",
        resolutionHref: "/operations/billing",
      },
    ]);
  }

  if (appointment.paymentStatus !== "AWAITING_PAYMENT") {
    blockers.push({
      code: "not-awaiting-payment",
      reason: appointment.paymentStatus === "PAYMENT_CONFIRMED"
        ? `Payment for ${appointment.patient.givenName} ${appointment.patient.familyName}'s appointment has already been confirmed.`
        : "This appointment does not require prepayment, so there is nothing to confirm.",
      resolverRole: "self",
      resolutionHref: "/operations/billing",
    });
  }

  if (!appointment.paymentProofDocumentId) {
    blockers.push({
      code: "payment-proof-missing",
      reason: `No payment proof has been uploaded for ${appointment.patient.givenName} ${appointment.patient.familyName}'s appointment yet. Ask the patient to upload proof of payment from their portal before it can be confirmed.`,
      resolverRole: "self",
      resolutionHref: `/patient/appointments/${appointment.id}/payment`,
    });
  }

  return blockers.length > 0 ? blocked(blockers) : ready();
}

export async function checkReadiness(
  action: ReadinessAction,
  requestContext: WonFlowRequestContext,
  params: Record<string, string>,
): Promise<ReadinessResult> {
  switch (action) {
    case "start-sitting": {
      if (!params.branchId || !params.businessDate) {
        throw new WonFlowApiError(400, "missing-parameters", "branchId and businessDate are required.");
      }
      return checkStartSittingReadiness(requestContext, {
        branchId: params.branchId,
        businessDate: params.businessDate,
        roomLabel: params.roomLabel,
      });
    }
    case "start-consultation": {
      if (!params.appointmentId) {
        throw new WonFlowApiError(400, "missing-parameters", "appointmentId is required.");
      }
      return checkStartConsultationReadiness(requestContext, { appointmentId: params.appointmentId });
    }
    case "book-appointment": {
      if (!params.patientId || !params.doctorId || !params.branchId || !params.startsAt || !params.endsAt) {
        throw new WonFlowApiError(400, "missing-parameters", "patientId, doctorId, branchId, startsAt and endsAt are required.");
      }
      return checkBookAppointmentReadiness(requestContext, {
        patientId: params.patientId,
        doctorId: params.doctorId,
        branchId: params.branchId,
        serviceId: params.serviceId,
        startsAt: params.startsAt,
        endsAt: params.endsAt,
      });
    }
    case "confirm-online-payment": {
      if (!params.appointmentId) {
        throw new WonFlowApiError(400, "missing-parameters", "appointmentId is required.");
      }
      return checkConfirmOnlinePaymentReadiness(requestContext, { appointmentId: params.appointmentId });
    }
    default: {
      const exhaustiveCheck: never = action;
      throw new WonFlowApiError(400, "unknown-action", `Unknown readiness action: ${String(exhaustiveCheck)}`);
    }
  }
}
