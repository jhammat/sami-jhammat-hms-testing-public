import * as z from "zod";

import {
  languageCodeSchema,
  shortTextSchema,
} from "./primitives";

const PHONE_NUMBER_PATTERN =
  /^\+?[0-9()\-\s.]{7,25}$/;

const COUNTRY_CODE_PATTERN =
  /^[A-Z]{2}$/;

const PERSON_NAME_PATTERN =
  /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u;

export const personDisplayNameSchema = z
  .string()
  .trim()
  .min(1, "A name is required.")
  .max(200, "The name is too long.")
  .regex(
    PERSON_NAME_PATTERN,
    "The name contains unsupported characters.",
  );

export const emailAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(320, "The email address is too long.");

export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(
    PHONE_NUMBER_PATTERN,
    "Enter a valid phone number.",
  );

export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    COUNTRY_CODE_PATTERN,
    "Use a two-letter country code.",
  );

export const postalAddressSchema = z
  .object({
    line1: shortTextSchema,
    line2: shortTextSchema.optional(),

    city: shortTextSchema,
    district: shortTextSchema.optional(),
    provinceOrState: shortTextSchema.optional(),

    postalCode: z
      .string()
      .trim()
      .max(20)
      .optional(),

    countryCode: countryCodeSchema,
  })
  .strict();

export const contactDetailsSchema = z
  .object({
    primaryPhone: phoneNumberSchema.optional(),
    secondaryPhone: phoneNumberSchema.optional(),

    email: emailAddressSchema.optional(),

    preferredLanguage: languageCodeSchema.optional(),

    address: postalAddressSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const hasContactMethod =
      value.primaryPhone !== undefined ||
      value.secondaryPhone !== undefined ||
      value.email !== undefined;

    if (!hasContactMethod) {
      context.addIssue({
        code: "custom",
        path: ["primaryPhone"],
        message:
          "Provide at least one phone number or email address.",
      });
    }
  });

export type ValidatedPostalAddress =
  z.output<typeof postalAddressSchema>;

export type ValidatedContactDetails =
  z.output<typeof contactDetailsSchema>;