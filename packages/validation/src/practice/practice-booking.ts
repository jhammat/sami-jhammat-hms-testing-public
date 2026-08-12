/**
 * Runtime validation for practice appointments, generated slots,
 * booking policies and patient booking input.
 */

import * as z from "zod";

import type {
  PracticeAppointment,
  PracticeBookingAggregate,
  PracticeBookingPolicy,
  PracticeSlot,
} from "@wonflow/contracts";

import {
  isoDateTimeSchema,
  longTextSchema,
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
  shortTextSchema,
  wonFlowIdSchema,
} from "../primitives";

import {
  appointmentStatusSchema,
  doctorAppointmentSlotStatusSchema,
  doctorConsultationModeSchema,
  isValidIsoDateTimeRange,
  recordStatusSchema,
} from "./shared";

import {
  practiceMoneySchema,
} from "./service-catalogue";

export const practiceBookingChannelSchema = z.enum([
  "public-page",
  "patient-portal",
  "mobile-app",
  "staff",
  "phone",
  "walk-in",
]);

const appointmentPrioritySchema = z.enum([
  "routine",
  "priority",
  "urgent",
  "emergency",
]);

export const patientPracticeBookingChannelSchema = z.enum([
  "public-page",
  "patient-portal",
  "mobile-app",
]);

export const practiceAppointmentPaymentStateSchema = z.enum([
  "not-required",
  "unpaid",
  "pending",
  "paid",
  "waived",
  "refunded",
]);

export const practiceBookingOutcomeSchema = z.enum([
  "attended",
  "no-show",
  "cancelled-by-patient",
  "cancelled-by-practice",
  "rescheduled",
]);

export const practiceNoShowHandlingSchema = z.enum([
  "record-only",
  "require-staff-review",
  "restrict-future-online-booking",
]);

export const practiceAppointmentSchema = z
  .object({
    appointmentId: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    idempotencyKey: shortTextSchema,
    practiceBookingPolicyId: wonFlowIdSchema,
    practiceLocationId: wonFlowIdSchema,
    practiceServiceId: wonFlowIdSchema,
    practiceServiceOfferingId: wonFlowIdSchema,
    practiceSlotId: wonFlowIdSchema.optional(),
    assignedTeamMemberId: wonFlowIdSchema.optional(),
    consultationMode: doctorConsultationModeSchema,
    quotedFee: practiceMoneySchema,
    paymentState:
      practiceAppointmentPaymentStateSchema,
    bookingChannel: practiceBookingChannelSchema,
    attachedDocumentIds: z.array(wonFlowIdSchema),
    rescheduleCount: nonNegativeIntegerSchema,
    outcome: practiceBookingOutcomeSchema.optional(),
    scheduledStartAt: isoDateTimeSchema,
    scheduledEndAt: isoDateTimeSchema,
    status: appointmentStatusSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !isValidIsoDateTimeRange(
        value.scheduledStartAt,
        value.scheduledEndAt,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["scheduledEndAt"],
        message:
          "The appointment must end after it starts.",
      });
    }
  }) satisfies z.ZodType<PracticeAppointment>;

export const practiceSlotSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    practiceLocationId: wonFlowIdSchema,
    practiceServiceId: wonFlowIdSchema,
    practiceServiceOfferingId: wonFlowIdSchema,
    practiceClinicSessionId: wonFlowIdSchema,
    practiceScheduleOverrideId:
      wonFlowIdSchema.optional(),
    practitionerId: wonFlowIdSchema.optional(),
    assignedTeamMemberId: wonFlowIdSchema.optional(),
    consultationMode: doctorConsultationModeSchema,
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema,
    capacity: positiveIntegerSchema,
    reservedCount: nonNegativeIntegerSchema,
    bookedCount: nonNegativeIntegerSchema,
    remainingCount: nonNegativeIntegerSchema,
    status: doctorAppointmentSlotStatusSchema,
    generatedAt: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !isValidIsoDateTimeRange(
        value.startsAt,
        value.endsAt,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message:
          "The slot must end after it starts.",
      });
    }

    if (
      value.reservedCount +
        value.bookedCount +
        value.remainingCount !==
      value.capacity
    ) {
      context.addIssue({
        code: "custom",
        path: ["remainingCount"],
        message:
          "Reserved, booked and remaining capacity must equal total capacity.",
      });
    }
  }) satisfies z.ZodType<PracticeSlot>;

export const practiceBookingPolicySchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    practiceLocationId: wonFlowIdSchema.optional(),
    practiceServiceId: wonFlowIdSchema.optional(),
    practiceServiceOfferingId:
      wonFlowIdSchema.optional(),
    minimumBookingNoticeMinutes:
      nonNegativeIntegerSchema,
    cancellationWindowMinutes:
      nonNegativeIntegerSchema,
    maximumReschedules: nonNegativeIntegerSchema,
    noShowHandling: practiceNoShowHandlingSchema,
    enforcePrepayment: z.boolean(),
    status: recordStatusSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<PracticeBookingPolicy>;

export const practiceBookingAggregateSchema = z
  .object({
    practiceAppointment: practiceAppointmentSchema,
    slot: practiceSlotSchema.optional(),
    policy: practiceBookingPolicySchema,
  })
  .strict() satisfies z.ZodType<PracticeBookingAggregate>;

/**
 * Patient-facing booking form. requestedAt is supplied by the server or
 * trusted demo clock so the minimum-notice refinement is deterministic.
 */
export const patientPracticeBookingFormSchema = z
  .object({
    patientId: wonFlowIdSchema,
    practiceLocationId: wonFlowIdSchema,
    practiceServiceId: wonFlowIdSchema,
    practiceServiceOfferingId: wonFlowIdSchema,
    practiceSlotId: wonFlowIdSchema,
    assignedTeamMemberId: wonFlowIdSchema.optional(),
    consultationMode: doctorConsultationModeSchema,
    bookingChannel: patientPracticeBookingChannelSchema,
    quotedFee: practiceMoneySchema,
    requestedAt: isoDateTimeSchema,
    slotStartsAt: isoDateTimeSchema,
    minimumBookingNoticeMinutes:
      nonNegativeIntegerSchema,
    requiresDocumentUpload: z.boolean(),
    attachedDocumentIds: z.array(wonFlowIdSchema),
  })
  .strict()
  .superRefine((value, context) => {
    const requestedTime = Date.parse(value.requestedAt);
    const slotStartTime = Date.parse(value.slotStartsAt);

    if (
      Number.isNaN(requestedTime) ||
      Number.isNaN(slotStartTime)
    ) {
      return;
    }

    const minimumNoticeMilliseconds =
      value.minimumBookingNoticeMinutes *
      60 *
      1_000;

    if (
      slotStartTime - requestedTime <
      minimumNoticeMilliseconds
    ) {
      context.addIssue({
        code: "custom",
        path: ["slotStartsAt"],
        message:
          "The appointment cannot be booked inside the minimum notice window.",
      });
    }

    if (
      value.requiresDocumentUpload &&
      value.attachedDocumentIds.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["attachedDocumentIds"],
        message:
          "Attach the required document before confirming the booking.",
      });
    }
  });

export type PatientPracticeBookingFormInput =
  z.input<typeof patientPracticeBookingFormSchema>;

export const confirmPracticeBookingFormSchema = z
  .object({
    idempotencyKey: shortTextSchema,
    patientId: wonFlowIdSchema,
    practiceLocationId: wonFlowIdSchema,
    practiceServiceId: wonFlowIdSchema,
    practiceServiceOfferingId: wonFlowIdSchema,
    practiceSlotId: wonFlowIdSchema,
    assignedTeamMemberId: wonFlowIdSchema.optional(),
    consultationMode: doctorConsultationModeSchema,
    bookingChannel: z.enum([
      "patient-portal",
      "mobile-app",
      "staff",
      "phone",
      "walk-in",
    ]),
    priority: appointmentPrioritySchema,
    reasonForAppointment: longTextSchema.optional(),
    patientNotes: longTextSchema.optional(),
    attachedDocumentIds: z.array(wonFlowIdSchema),
    paymentProviderConfigId: wonFlowIdSchema.optional(),
  })
  .strict();

export type ConfirmPracticeBookingFormInput = z.input<
  typeof confirmPracticeBookingFormSchema
>;

export const cancelPatientPracticeAppointmentFormSchema = z
  .object({
    appointmentId: wonFlowIdSchema,
    reasonCode: z.enum(["patient-request", "other"]),
    reason: longTextSchema.optional(),
    acknowledgeOutsideFreeWindow: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.reasonCode === "other" && value.reason === undefined) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Enter a cancellation reason.",
      });
    }
  });

export const reschedulePatientPracticeAppointmentFormSchema = z
  .object({
    appointmentId: wonFlowIdSchema,
    destinationPracticeSlotId: wonFlowIdSchema,
    reason: longTextSchema.optional(),
  })
  .strict();

export const preparePatientAppointmentPaymentFormSchema = z
  .object({
    appointmentId: wonFlowIdSchema,
    paymentProviderConfigId: wonFlowIdSchema,
  })
  .strict();

export type CancelPatientPracticeAppointmentFormInput = z.input<
  typeof cancelPatientPracticeAppointmentFormSchema
>;

export type ReschedulePatientPracticeAppointmentFormInput = z.input<
  typeof reschedulePatientPracticeAppointmentFormSchema
>;

export type PreparePatientAppointmentPaymentFormInput = z.input<
  typeof preparePatientAppointmentPaymentFormSchema
>;

/**
 * Owner-facing booking-policy configuration.
 *
 * Every threshold is supplied by the tenant. This schema contains no
 * booking, cancellation, rescheduling or prepayment defaults.
 */
export const practiceBookingPolicyFormSchema = z
  .object({
    practiceLocationId:
      wonFlowIdSchema.optional(),

    practiceServiceId:
      wonFlowIdSchema.optional(),

    practiceServiceOfferingId:
      wonFlowIdSchema.optional(),

    minimumBookingNoticeMinutes:
      nonNegativeIntegerSchema,

    cancellationWindowMinutes:
      nonNegativeIntegerSchema,

    maximumReschedules:
      nonNegativeIntegerSchema,

    noShowHandling:
      practiceNoShowHandlingSchema,

    enforcePrepayment:
      z.boolean(),

    status:
      recordStatusSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.practiceServiceOfferingId !==
        undefined &&
      value.practiceServiceId ===
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "practiceServiceId",
        ],
        message:
          "An offering-specific policy must also identify its service.",
      });
    }

    if (
      value.practiceServiceOfferingId !==
        undefined &&
      value.practiceLocationId ===
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "practiceLocationId",
        ],
        message:
          "An offering-specific policy must also identify its location.",
      });
    }
  });

export type PracticeBookingPolicyFormInput =
  z.input<
    typeof practiceBookingPolicyFormSchema
  >;
