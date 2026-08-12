import * as z from "zod";

import {
  safeIntegerSchema,
} from "./primitives";

export const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{3}$/,
    "Use a valid three-letter currency code.",
  );

export const minorUnitAmountSchema =
  safeIntegerSchema;

export const nonNegativeMinorUnitAmountSchema =
  minorUnitAmountSchema.min(
    0,
    "The amount cannot be negative.",
  );

export const moneyAmountSchema = z
  .object({
    minorUnits: minorUnitAmountSchema,
    currencyCode: currencyCodeSchema,
  })
  .strict();

export const nonNegativeMoneyAmountSchema = z
  .object({
    minorUnits: nonNegativeMinorUnitAmountSchema,
    currencyCode: currencyCodeSchema,
  })
  .strict();

export const percentageBasisPointsSchema = z
  .number()
  .int("Basis points must be a whole number.")
  .min(0, "Basis points cannot be negative.")
  .max(
    10_000,
    "Basis points cannot exceed 10,000.",
  );

export const moneyRangeSchema = z
  .object({
    minimum: moneyAmountSchema,
    maximum: moneyAmountSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.minimum.currencyCode !==
      value.maximum.currencyCode
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximum", "currencyCode"],
        message:
          "The minimum and maximum amounts must use the same currency.",
      });
    }

    if (
      value.maximum.minorUnits <
      value.minimum.minorUnits
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximum", "minorUnits"],
        message:
          "The maximum amount cannot be lower than the minimum amount.",
      });
    }
  });

export type ValidatedMoneyAmount =
  z.output<typeof moneyAmountSchema>;

export type ValidatedMoneyRange =
  z.output<typeof moneyRangeSchema>;