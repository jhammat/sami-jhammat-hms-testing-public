import * as z from "zod";

const WONFLOW_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const WONFLOW_CODE_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$/;

const IDEMPOTENCY_KEY_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$/;

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

function isRealIsoDate(value: string): boolean {
  const [yearText, monthText, dayText] =
    value.split("-");

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const wonFlowIdSchema = z
  .string()
  .trim()
  .min(1, "An identifier is required.")
  .max(128, "The identifier is too long.")
  .regex(
    WONFLOW_ID_PATTERN,
    "The identifier contains unsupported characters.",
  );

export const optionalWonFlowIdSchema =
  wonFlowIdSchema.optional();

export const codeSchema = z
  .string()
  .trim()
  .min(1, "A code is required.")
  .max(64, "The code is too long.")
  .regex(
    WONFLOW_CODE_PATTERN,
    "The code contains unsupported characters.",
  );

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, "The idempotency key is too short.")
  .max(200, "The idempotency key is too long.")
  .regex(
    IDEMPOTENCY_KEY_PATTERN,
    "The idempotency key contains unsupported characters.",
  );

export const isoDateSchema = z
  .string()
  .trim()
  .regex(
    ISO_DATE_PATTERN,
    "Use the YYYY-MM-DD date format.",
  )
  .refine(
    isRealIsoDate,
    "The supplied calendar date is invalid.",
  );

export const isoDateTimeSchema = z
  .string()
  .datetime({
    offset: true,
    message:
      "Use a valid ISO 8601 date-time with a timezone offset.",
  });

export const shortTextSchema = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .max(255, "This value is too long.");

export const optionalShortTextSchema =
  shortTextSchema.optional();

export const longTextSchema = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .max(10_000, "This value is too long.");

export const optionalLongTextSchema =
  longTextSchema.optional();

export const reasonSchema = z
  .string()
  .trim()
  .min(
    3,
    "Provide a clear reason containing at least three characters.",
  )
  .max(2_000, "The reason is too long.");

export const searchTextSchema = z
  .string()
  .trim()
  .max(200, "The search text is too long.");

export const languageCodeSchema = z.enum([
  "en",
  "ur",
]);

export const sortDirectionSchema = z.enum([
  "asc",
  "desc",
]);

export const safeIntegerSchema = z
  .number()
  .int("The value must be a whole number.")
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);

export const nonNegativeIntegerSchema =
  safeIntegerSchema.min(
    0,
    "The value cannot be negative.",
  );

export const positiveIntegerSchema =
  safeIntegerSchema.min(
    1,
    "The value must be at least one.",
  );

export const nonNegativeNumberSchema = z
  .number()
  .finite("The value must be finite.")
  .min(0, "The value cannot be negative.");

export const percentageSchema = z
  .number()
  .finite("The percentage must be finite.")
  .min(0, "The percentage cannot be below zero.")
  .max(100, "The percentage cannot exceed 100.");

export const recordVersionSchema =
  positiveIntegerSchema;

export type ValidatedWonFlowId =
  z.infer<typeof wonFlowIdSchema>;

export type ValidatedIsoDate =
  z.infer<typeof isoDateSchema>;

export type ValidatedIsoDateTime =
  z.infer<typeof isoDateTimeSchema>;

export type WonFlowLanguageCode =
  z.infer<typeof languageCodeSchema>;