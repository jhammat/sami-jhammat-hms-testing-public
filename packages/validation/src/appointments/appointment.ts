import * as z from "zod";

import type {
  AppointmentCancellation,
  AppointmentRescheduleEvent,
  AppointmentRescheduleRequest,
  AppointmentStatusEvent,
} from "@wonflow/contracts";

import {
  isoDateTimeSchema,
  longTextSchema,
  shortTextSchema,
  wonFlowIdSchema,
} from "../primitives";
import {
  appointmentStatusSchema,
  isValidIsoDateTimeRange,
} from "../practice/shared";

const appointmentCancellationReasonCodeSchema = z.enum([
  "patient-request",
  "doctor-unavailable",
  "doctor-leave",
  "hospital-closure",
  "service-unavailable",
  "payment-not-completed",
  "insurance-not-approved",
  "duplicate-booking",
  "booking-error",
  "emergency-interruption",
  "rescheduled",
  "other",
]);

export const appointmentStatusEventSchema = z.object({
  id: wonFlowIdSchema,
  organizationId: wonFlowIdSchema,
  appointmentId: wonFlowIdSchema,
  previousStatus: appointmentStatusSchema.optional(),
  newStatus: appointmentStatusSchema,
  trigger: z.enum([
    "patient-action", "guardian-action", "staff-action", "doctor-action",
    "schedule-event", "payment-event", "insurance-event", "check-in-event",
    "encounter-event", "timer", "system",
  ]),
  reason: longTextSchema.optional(),
  changedByUserId: wonFlowIdSchema.optional(),
  changedByPatientAccessAccountId: wonFlowIdSchema.optional(),
  changedBySystem: z.boolean(),
  occurredAt: isoDateTimeSchema,
}).strict() satisfies z.ZodType<AppointmentStatusEvent>;

export const appointmentCancellationSchema = z.object({
  id: wonFlowIdSchema,
  organizationId: wonFlowIdSchema,
  appointmentId: wonFlowIdSchema,
  initiator: z.enum(["patient", "guardian", "reception", "doctor", "department", "organization", "system"]),
  reasonCode: appointmentCancellationReasonCodeSchema,
  reason: longTextSchema.optional(),
  notes: longTextSchema.optional(),
  cancelledByUserId: wonFlowIdSchema.optional(),
  cancelledByPatientAccessAccountId: wonFlowIdSchema.optional(),
  withinFreeCancellationWindow: z.boolean(),
  consequenceContentBlockId: wonFlowIdSchema.optional(),
  consequenceContentVersion: shortTextSchema.optional(),
  consequenceTextSnapshot: longTextSchema.optional(),
  financialReviewRequired: z.boolean(),
  cancellationFeeApplied: z.boolean(),
  cancellationFeeAmount: z.number().nonnegative().optional(),
  currencyCode: shortTextSchema.optional(),
  refundRequired: z.boolean(),
  refundId: wonFlowIdSchema.optional(),
  patientNotificationRequired: z.boolean(),
  patientNotifiedAt: isoDateTimeSchema.optional(),
  cancelledAt: isoDateTimeSchema,
}).strict().superRefine((value, context) => {
  if (!value.withinFreeCancellationWindow) {
    for (const field of ["consequenceContentBlockId", "consequenceContentVersion", "consequenceTextSnapshot"] as const) {
      if (value[field] === undefined) {
        context.addIssue({ code: "custom", path: [field], message: "Outside-window cancellation requires the acknowledged policy snapshot." });
      }
    }
  }
  if (!value.cancellationFeeApplied && (value.cancellationFeeAmount !== undefined || value.currencyCode !== undefined)) {
    context.addIssue({ code: "custom", path: ["cancellationFeeApplied"], message: "Cancellation fee details must be absent when no fee was applied." });
  }
}) satisfies z.ZodType<AppointmentCancellation>;

export const appointmentRescheduleRequestSchema = z.object({
  id: wonFlowIdSchema,
  organizationId: wonFlowIdSchema,
  appointmentId: wonFlowIdSchema,
  status: z.enum(["requested", "awaiting-slot", "slot-reserved", "awaiting-patient-confirmation", "confirmed", "rejected", "cancelled", "expired"]),
  requestedBy: z.enum(["patient", "guardian", "staff", "doctor", "department", "system"]),
  requestedByUserId: wonFlowIdSchema.optional(),
  requestedByPatientAccessAccountId: wonFlowIdSchema.optional(),
  reason: longTextSchema.optional(),
  fromBranchId: wonFlowIdSchema.optional(),
  fromPractitionerId: wonFlowIdSchema.optional(),
  fromAppointmentSlotId: wonFlowIdSchema.optional(),
  fromScheduledStartAt: isoDateTimeSchema,
  fromScheduledEndAt: isoDateTimeSchema,
  preferredBranchIds: z.array(wonFlowIdSchema),
  preferredPractitionerIds: z.array(wonFlowIdSchema),
  preferredStartAt: isoDateTimeSchema.optional(),
  preferredEndAt: isoDateTimeSchema.optional(),
  selectedBranchId: wonFlowIdSchema.optional(),
  selectedPractitionerId: wonFlowIdSchema.optional(),
  selectedAppointmentSlotId: wonFlowIdSchema.optional(),
  selectedStartAt: isoDateTimeSchema.optional(),
  selectedEndAt: isoDateTimeSchema.optional(),
  newSlotReservationId: wonFlowIdSchema.optional(),
  patientConfirmationRequired: z.boolean(),
  patientConfirmedAt: isoDateTimeSchema.optional(),
  requestedAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema.optional(),
  confirmedAt: isoDateTimeSchema.optional(),
  rejectedAt: isoDateTimeSchema.optional(),
  cancelledAt: isoDateTimeSchema.optional(),
}).strict().superRefine((value, context) => {
  if (!isValidIsoDateTimeRange(value.fromScheduledStartAt, value.fromScheduledEndAt)) {
    context.addIssue({ code: "custom", path: ["fromScheduledEndAt"], message: "The original appointment must end after it starts." });
  }
}) satisfies z.ZodType<AppointmentRescheduleRequest>;

export const appointmentRescheduleEventSchema = z.object({
  id: wonFlowIdSchema,
  organizationId: wonFlowIdSchema,
  appointmentId: wonFlowIdSchema,
  rescheduleRequestId: wonFlowIdSchema,
  fromBranchId: wonFlowIdSchema.optional(),
  toBranchId: wonFlowIdSchema.optional(),
  fromPractitionerId: wonFlowIdSchema.optional(),
  toPractitionerId: wonFlowIdSchema.optional(),
  fromAppointmentSlotId: wonFlowIdSchema.optional(),
  toAppointmentSlotId: wonFlowIdSchema.optional(),
  fromScheduledStartAt: isoDateTimeSchema,
  fromScheduledEndAt: isoDateTimeSchema,
  toScheduledStartAt: isoDateTimeSchema,
  toScheduledEndAt: isoDateTimeSchema,
  reason: longTextSchema.optional(),
  performedByUserId: wonFlowIdSchema.optional(),
  performedByPatientAccessAccountId: wonFlowIdSchema.optional(),
  performedBySystem: z.boolean(),
  occurredAt: isoDateTimeSchema,
}).strict().superRefine((value, context) => {
  if (!isValidIsoDateTimeRange(value.fromScheduledStartAt, value.fromScheduledEndAt)) {
    context.addIssue({ code: "custom", path: ["fromScheduledEndAt"], message: "The original appointment must end after it starts." });
  }
  if (!isValidIsoDateTimeRange(value.toScheduledStartAt, value.toScheduledEndAt)) {
    context.addIssue({ code: "custom", path: ["toScheduledEndAt"], message: "The rescheduled appointment must end after it starts." });
  }
}) satisfies z.ZodType<AppointmentRescheduleEvent>;
