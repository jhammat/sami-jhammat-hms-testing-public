/**
 * Runtime validation for practice locations, clinic sessions and
 * date-specific schedule overrides.
 */

import * as z from "zod";

import type {
  PracticeClinicSession,
  PracticeLocation,
  PracticeLocationAddress,
  PracticeLocationAggregate,
  PracticeScheduleOverride,
} from "@wonflow/contracts";

import {
  emailAddressSchema,
  phoneNumberSchema,
} from "../contact";

import {
  codeSchema,
  isoDateSchema,
  isoDateTimeSchema,
  longTextSchema,
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
  reasonSchema,
  shortTextSchema,
  wonFlowIdSchema,
} from "../primitives";

import {
  doctorConsultationModeSchema,
  isValidIsoDateRange,
  isValidLocalTimeRange,
  localTimeSchema,
  recordStatusSchema,
  safeUrlSchema,
  timezoneSchema,
  weekdaySchema,
} from "./shared";

export const practiceLocationTypeSchema = z.enum([
  "owned-clinic",
  "external-hospital",
  "external-clinic",
  "diagnostic-center",
  "virtual",
  "home-visit-base",
  "other",
]);

export const practiceScheduleOverrideTypeSchema = z.enum([
  "closure",
  "leave",
  "theatre-day",
  "holiday",
  "extra-session",
  "temporary-time-change",
  "temporary-location-change",
  "capacity-change",
  "other",
]);

export const practiceScheduleOverrideStatusSchema = z.enum([
  "draft",
  "active",
  "cancelled",
  "archived",
]);

export const practiceLocationAddressSchema = z
  .object({
    addressLine1: shortTextSchema,
    addressLine2: shortTextSchema.optional(),
    city: shortTextSchema,
    district: shortTextSchema.optional(),
    stateOrProvince: shortTextSchema.optional(),
    postalCode: z
      .string()
      .trim()
      .max(20, "The postal code is too long.")
      .optional(),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z]{2}$/,
        "Use a two-letter country code.",
      ),
  })
  .strict() satisfies z.ZodType<PracticeLocationAddress>;

export const practiceLocationSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    name: shortTextSchema,
    code: codeSchema,
    type: practiceLocationTypeSchema,
    linkedBranchId: wonFlowIdSchema.optional(),
    externalOrganizationName:
      shortTextSchema.optional(),
    address: practiceLocationAddressSchema.optional(),
    phone: phoneNumberSchema.optional(),
    email: emailAddressSchema.optional(),
    timezone: timezoneSchema,
    supportedConsultationModes: z.array(
      doctorConsultationModeSchema,
    ),
    defaultCurrencyCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z]{3}$/,
        "Use a three-letter ISO currency code.",
      ),
    defaultSlotDurationMinutes:
      positiveIntegerSchema,
    minimumBookingNoticeMinutes:
      nonNegativeIntegerSchema,
    bookingHorizonDays:
      positiveIntegerSchema,
    publicBookingEnabled:
      z.boolean(),
    onlinePaymentEnabled:
      z.boolean(),
    mapUrl: safeUrlSchema.optional(),
    patientDirections: longTextSchema.optional(),
    clinicInstructions: longTextSchema.optional(),
    publicVisible: z.boolean(),
    status: recordStatusSchema,
    archivedAt:
      isoDateTimeSchema.optional(),
    archivedByUserId:
      wonFlowIdSchema.optional(),
    archiveReason:
      reasonSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(
        value.supportedConsultationModes,
      ).size !==
      value.supportedConsultationModes.length
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supportedConsultationModes",
        ],
        message:
          "Consultation modes must be unique.",
      });
    }

    if (
      value.publicBookingEnabled &&
      !value.publicVisible
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "publicBookingEnabled",
        ],
        message:
          "Public booking requires the location to be publicly visible.",
      });
    }

    if (
      value.publicBookingEnabled &&
      value.supportedConsultationModes
        .length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supportedConsultationModes",
        ],
        message:
          "A publicly bookable location requires at least one consultation mode.",
      });
    }

    if (
      value.onlinePaymentEnabled &&
      !value.publicBookingEnabled
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "onlinePaymentEnabled",
        ],
        message:
          "Online payment requires patient booking to be enabled.",
      });
    }

    const hasCompleteArchiveMetadata =
      value.archivedAt !== undefined &&
      value.archivedByUserId !==
        undefined &&
      value.archiveReason !==
        undefined;

    if (
      value.status === "archived" &&
      !hasCompleteArchiveMetadata
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "An archived location requires an archive time, actor and reason.",
      });
    }

    if (
      value.status !== "archived" &&
      (
        value.archivedAt !==
          undefined ||
        value.archivedByUserId !==
          undefined ||
        value.archiveReason !==
          undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Archive metadata is only valid for an archived location.",
      });
    }
  }) satisfies z.ZodType<PracticeLocation>;

export const practiceClinicSessionSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    practitionerId: wonFlowIdSchema.optional(),
    practiceLocationId: wonFlowIdSchema,
    weekday: weekdaySchema,
    localStartTime: localTimeSchema,
    localEndTime: localTimeSchema,
    timezone: timezoneSchema,
    effectiveFrom: isoDateSchema,
    effectiveTo: isoDateSchema.optional(),
    defaultAppointmentDurationMinutes:
      positiveIntegerSchema,
    capacity: positiveIntegerSchema,
    allowOnlineBooking: z.boolean(),
    allowStaffBooking: z.boolean(),
    allowWalkIns: z.boolean(),
    notes: longTextSchema.optional(),
    status: recordStatusSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !isValidLocalTimeRange(
        value.localStartTime,
        value.localEndTime,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["localEndTime"],
        message:
          "The clinic end time must be after its start time.",
      });
    }

    if (
      value.effectiveTo !== undefined &&
      !isValidIsoDateRange(
        value.effectiveFrom,
        value.effectiveTo,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message:
          "The effective end date cannot be before the start date.",
      });
    }
  }) satisfies z.ZodType<PracticeClinicSession>;

/**
 * Returns true when two effective date ranges intersect.
 *
 * An undefined effectiveTo represents an open-ended session.
 */
function doPracticeSessionDateRangesOverlap(
  left: PracticeClinicSession,
  right: PracticeClinicSession,
): boolean {
  const leftEndsAfterRightStarts =
    left.effectiveTo ===
      undefined ||
    right.effectiveFrom <=
      left.effectiveTo;

  const rightEndsAfterLeftStarts =
    right.effectiveTo ===
      undefined ||
    left.effectiveFrom <=
      right.effectiveTo;

  return (
    leftEndsAfterRightStarts &&
    rightEndsAfterLeftStarts
  );
}

/**
 * Returns true when two local half-open time ranges intersect.
 *
 * A session ending exactly when another begins is not an overlap.
 */
function doPracticeSessionTimeRangesOverlap(
  left: PracticeClinicSession,
  right: PracticeClinicSession,
): boolean {
  return (
    left.localStartTime <
      right.localEndTime &&
    right.localStartTime <
      left.localEndTime
  );
}

/**
 * Collection validator for active recurring clinic sessions.
 *
 * Draft, inactive and archived sessions may overlap while the owner is
 * editing future configuration. Two active sessions for the same
 * organization, location and weekday may not overlap while their
 * effective date ranges intersect.
 */
export const practiceClinicSessionCollectionSchema = z
  .array(
    practiceClinicSessionSchema,
  )
  .superRefine((sessions, context) => {
    for (
      let leftIndex = 0;
      leftIndex <
      sessions.length;
      leftIndex += 1
    ) {
      const left =
        sessions[leftIndex];

      if (
        left === undefined ||
        left.status !== "active"
      ) {
        continue;
      }

      for (
        let rightIndex =
          leftIndex + 1;
        rightIndex <
        sessions.length;
        rightIndex += 1
      ) {
        const right =
          sessions[rightIndex];

        if (
          right === undefined ||
          right.status !== "active"
        ) {
          continue;
        }

        const sameSchedulingSubject =
          left.practitionerId ===
          right.practitionerId;

        const sameScope =
          left.organizationId ===
            right.organizationId &&
          left.practiceLocationId ===
            right.practiceLocationId &&
          left.weekday ===
            right.weekday &&
          sameSchedulingSubject;

        if (!sameScope) {
          continue;
        }

        if (
          !doPracticeSessionDateRangesOverlap(
            left,
            right,
          )
        ) {
          continue;
        }

        if (
          !doPracticeSessionTimeRangesOverlap(
            left,
            right,
          )
        ) {
          continue;
        }

        context.addIssue({
          code: "custom",
          path: [
            rightIndex,
            "localStartTime",
          ],
          message:
            "Active clinic sessions at the same location cannot overlap on the same weekday.",
        });
      }
    }
  });

export const practiceScheduleOverrideSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    practitionerId: wonFlowIdSchema.optional(),
    practiceLocationId: wonFlowIdSchema,
    clinicSessionId: wonFlowIdSchema.optional(),
    type: practiceScheduleOverrideTypeSchema,
    date: isoDateSchema,
    createsAvailability: z.boolean(),
    localStartTime: localTimeSchema.optional(),
    localEndTime: localTimeSchema.optional(),
    capacityOverride:
      nonNegativeIntegerSchema.optional(),
    appointmentDurationMinutesOverride:
      positiveIntegerSchema.optional(),
    reason: reasonSchema,
    notes: longTextSchema.optional(),
    status: practiceScheduleOverrideStatusSchema,
    createdByUserId: wonFlowIdSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const hasStart =
      value.localStartTime !== undefined;
    const hasEnd =
      value.localEndTime !== undefined;

    if (hasStart !== hasEnd) {
      context.addIssue({
        code: "custom",
        path: [
          hasStart
            ? "localEndTime"
            : "localStartTime",
        ],
        message:
          "Provide both override start and end times.",
      });
    }

    if (
      hasStart &&
      hasEnd &&
      !isValidLocalTimeRange(
        value.localStartTime as string,
        value.localEndTime as string,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["localEndTime"],
        message:
          "The override end time must be after its start time.",
      });
    }
  }) satisfies z.ZodType<PracticeScheduleOverride>;

/**
 * Owner-facing date-specific schedule override.
 *
 * Organization ownership, identifiers, audit timestamps and actor
 * attribution are supplied by the service caller.
 */
export const practiceScheduleOverrideFormSchema = z
  .object({
    practitionerId:
      wonFlowIdSchema.optional(),

    practiceLocationId:
      wonFlowIdSchema,

    clinicSessionId:
      wonFlowIdSchema.optional(),

    type:
      practiceScheduleOverrideTypeSchema,

    date:
      isoDateSchema,

    createsAvailability:
      z.boolean(),

    localStartTime:
      localTimeSchema.optional(),

    localEndTime:
      localTimeSchema.optional(),

    capacityOverride:
      nonNegativeIntegerSchema.optional(),

    appointmentDurationMinutesOverride:
      positiveIntegerSchema.optional(),

    reason:
      reasonSchema,

    notes:
      longTextSchema.optional(),

    status:
      practiceScheduleOverrideStatusSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const hasStart =
      value.localStartTime !==
      undefined;

    const hasEnd =
      value.localEndTime !==
      undefined;

    if (hasStart !== hasEnd) {
      context.addIssue({
        code: "custom",

        path: [
          hasStart
            ? "localEndTime"
            : "localStartTime",
        ],

        message:
          "Provide both override start and end times.",
      });
    }

    if (
      hasStart &&
      hasEnd &&
      !isValidLocalTimeRange(
        value.localStartTime as string,
        value.localEndTime as string,
      )
    ) {
      context.addIssue({
        code: "custom",

        path: [
          "localEndTime",
        ],

        message:
          "The override end time must be after its start time.",
      });
    }

    if (
      value.type ===
        "extra-session" &&
      !value.createsAvailability
    ) {
      context.addIssue({
        code: "custom",

        path: [
          "createsAvailability",
        ],

        message:
          "An extra session must create availability.",
      });
    }

    if (
      (
        value.type ===
          "closure" ||
        value.type ===
          "leave" ||
        value.type ===
          "theatre-day" ||
        value.type ===
          "holiday"
      ) &&
      value.createsAvailability
    ) {
      context.addIssue({
        code: "custom",

        path: [
          "createsAvailability",
        ],

        message:
          "A closure, leave, theatre day or holiday cannot create availability.",
      });
    }

    if (
      (
        value.type ===
          "extra-session" ||
        value.type ===
          "temporary-time-change"
      ) &&
      (
        !hasStart ||
        !hasEnd
      )
    ) {
      context.addIssue({
        code: "custom",

        path: [
          "localStartTime",
        ],

        message:
          "This override type requires start and end times.",
      });
    }

    if (
      value.type ===
        "capacity-change" &&
      value.capacityOverride ===
        undefined
    ) {
      context.addIssue({
        code: "custom",

        path: [
          "capacityOverride",
        ],

        message:
          "A capacity change requires the new capacity.",
      });
    }

    if (
      value.status ===
        "archived"
    ) {
      context.addIssue({
        code: "custom",

        path: ["status"],

        message:
          "Archive historical overrides through a dedicated lifecycle operation.",
      });
    }
  });

export type PracticeScheduleOverrideFormInput =
  z.input<
    typeof practiceScheduleOverrideFormSchema
  >;

export const practiceLocationAggregateSchema = z
  .object({
    location: practiceLocationSchema,
    clinicSessions:
      practiceClinicSessionCollectionSchema,
    scheduleOverrides: z.array(
      practiceScheduleOverrideSchema,
    ),
  })
  .strict()
  .superRefine((value, context) => {
    for (const [index, session] of
      value.clinicSessions.entries()) {
      if (
        session.organizationId !==
          value.location.organizationId ||
        session.practiceLocationId !==
          value.location.id
      ) {
        context.addIssue({
          code: "custom",
          path: ["clinicSessions", index],
          message:
            "The clinic session must belong to the same organization and location.",
        });
      }
    }

    for (const [index, override] of
      value.scheduleOverrides.entries()) {
      if (
        override.organizationId !==
          value.location.organizationId ||
        override.practiceLocationId !==
          value.location.id
      ) {
        context.addIssue({
          code: "custom",
          path: ["scheduleOverrides", index],
          message:
            "The override must belong to the same organization and location.",
        });
      }
    }
  }) satisfies z.ZodType<PracticeLocationAggregate>;

/**
 * Staff-facing form for creating or editing a practice location.
 * Server-owned identifiers and audit timestamps are excluded.
 */
export const practiceLocationFormSchema = z
  .object({
    name: shortTextSchema,
    code: codeSchema,
    type: practiceLocationTypeSchema,
    linkedBranchId: wonFlowIdSchema.optional(),
    externalOrganizationName:
      shortTextSchema.optional(),
    address: practiceLocationAddressSchema.optional(),
    phone: phoneNumberSchema.optional(),
    email: emailAddressSchema.optional(),
    timezone: timezoneSchema,
    supportedConsultationModes: z
      .array(
        doctorConsultationModeSchema,
      )
      .min(
        1,
        "Select at least one consultation mode.",
      ),
    defaultCurrencyCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z]{3}$/,
        "Use a three-letter ISO currency code.",
      ),
    defaultSlotDurationMinutes:
      positiveIntegerSchema,
    minimumBookingNoticeMinutes:
      nonNegativeIntegerSchema,
    bookingHorizonDays:
      positiveIntegerSchema,
    publicBookingEnabled:
      z.boolean(),
    onlinePaymentEnabled:
      z.boolean(),
    mapUrl: safeUrlSchema.optional(),
    patientDirections: longTextSchema.optional(),
    clinicInstructions: longTextSchema.optional(),
    publicVisible: z.boolean(),
    status: recordStatusSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.status === "archived"
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Use the archive operation rather than editing a location to archived.",
      });
    }

    if (
      new Set(
        value.supportedConsultationModes,
      ).size !==
      value.supportedConsultationModes.length
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supportedConsultationModes",
        ],
        message:
          "Consultation modes must be unique.",
      });
    }

    if (
      value.publicBookingEnabled &&
      !value.publicVisible
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "publicBookingEnabled",
        ],
        message:
          "Public booking requires public visibility.",
      });
    }

    if (
      value.onlinePaymentEnabled &&
      !value.publicBookingEnabled
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "onlinePaymentEnabled",
        ],
        message:
          "Online payment requires public booking.",
      });
    }
  });

export type PracticeLocationFormInput =
  z.input<typeof practiceLocationFormSchema>;

/**
 * Owner-facing recurring clinic-session input.
 *
 * Organization ownership, identifiers and audit timestamps are supplied
 * by the service layer.
 */
export const practiceClinicSessionFormSchema = z
  .object({
    practitionerId:
      wonFlowIdSchema.optional(),

    practiceLocationId:
      wonFlowIdSchema,

    weekday:
      weekdaySchema,

    localStartTime:
      localTimeSchema,

    localEndTime:
      localTimeSchema,

    timezone:
      timezoneSchema,

    effectiveFrom:
      isoDateSchema,

    effectiveTo:
      isoDateSchema.optional(),

    defaultAppointmentDurationMinutes:
      positiveIntegerSchema,

    capacity:
      positiveIntegerSchema,

    allowOnlineBooking:
      z.boolean(),

    allowStaffBooking:
      z.boolean(),

    allowWalkIns:
      z.boolean(),

    notes:
      longTextSchema.optional(),

    status:
      recordStatusSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !isValidLocalTimeRange(
        value.localStartTime,
        value.localEndTime,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["localEndTime"],
        message:
          "The clinic end time must be after its start time.",
      });
    }

    if (
      value.effectiveTo !== undefined &&
      !isValidIsoDateRange(
        value.effectiveFrom,
        value.effectiveTo,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message:
          "The effective end date cannot be before the start date.",
      });
    }
  });

export type PracticeClinicSessionFormInput =
  z.input<
    typeof practiceClinicSessionFormSchema
  >;
