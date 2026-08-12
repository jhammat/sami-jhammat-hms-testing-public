import * as z from "zod";

import {
  isoDateSchema,
  isoDateTimeSchema,
} from "./primitives";

export const isoDateRangeSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.endDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message:
          "The end date cannot be earlier than the start date.",
      });
    }
  });

export const optionalEndDateRangeSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.endDate !== undefined &&
      value.endDate < value.startDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message:
          "The end date cannot be earlier than the start date.",
      });
    }
  });

export const isoDateTimeRangeSchema = z
  .object({
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const startTime = Date.parse(value.startsAt);
    const endTime = Date.parse(value.endsAt);

    if (endTime <= startTime) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message:
          "The ending time must be later than the starting time.",
      });
    }
  });

export const optionalEndDateTimeRangeSchema = z
  .object({
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.endsAt === undefined) {
      return;
    }

    const startTime = Date.parse(value.startsAt);
    const endTime = Date.parse(value.endsAt);

    if (endTime <= startTime) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message:
          "The ending time must be later than the starting time.",
      });
    }
  });

export type IsoDateRange =
  z.output<typeof isoDateRangeSchema>;

export type IsoDateTimeRange =
  z.output<typeof isoDateTimeRangeSchema>;