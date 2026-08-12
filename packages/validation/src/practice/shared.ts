/**
 * Shared runtime validators used by the WonFlow practice schemas.
 *
 * These helpers centralize repeated platform enums and chronology checks
 * so each practice schema file stays aligned without duplicating rules.
 */

import * as z from "zod";

import type {
  AppointmentStatus,
  DoctorAppointmentSlotStatus,
  DoctorConsultationMode,
  ModuleCode,
  PermissionCode,
  RecordStatus,
  Weekday,
} from "@wonflow/contracts";

import {
  isoDateSchema,
  isoDateTimeSchema,
} from "../primitives";

const LOCAL_TIME_PATTERN =
  /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

const PERMISSION_CODE_PATTERN =
  /^[a-z][a-z-]*\.[a-z][a-z-]*$/;

export const recordStatusSchema = z.enum([
  "active",
  "inactive",
  "suspended",
  "archived",
]) satisfies z.ZodType<RecordStatus>;

export const weekdaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]) satisfies z.ZodType<Weekday>;

export const localTimeSchema = z
  .string()
  .trim()
  .regex(
    LOCAL_TIME_PATTERN,
    "Use HH:mm or HH:mm:ss local time.",
  );

export const timezoneSchema = z
  .string()
  .trim()
  .min(1, "A timezone is required.")
  .max(100, "The timezone is too long.");

export const safeUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid URL.")
  .max(2_000, "The URL is too long.");

export const mimeTypeSchema = z
  .string()
  .trim()
  .min(3, "A MIME type is required.")
  .max(255, "The MIME type is too long.")
  .regex(
    /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i,
    "Enter a valid MIME type.",
  );

export const fileNameSchema = z
  .string()
  .trim()
  .min(1, "A file name is required.")
  .max(255, "The file name is too long.");

export const opaqueReferenceSchema = z
  .string()
  .trim()
  .min(1, "A reference is required.")
  .max(1_000, "The reference is too long.");

export const ipAddressSchema = z
  .string()
  .trim()
  .min(3, "An IP address is required.")
  .max(64, "The IP address is too long.");

export const userAgentSchema = z
  .string()
  .trim()
  .min(1, "A user agent is required.")
  .max(2_000, "The user agent is too long.");

export const sha256Schema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-f0-9]{64}$/,
    "Use a valid SHA-256 checksum.",
  );

export const doctorConsultationModeSchema = z.enum([
  "in-person",
  "video",
  "phone",
  "home-visit",
]) satisfies z.ZodType<DoctorConsultationMode>;

export const doctorAppointmentSlotStatusSchema = z.enum([
  "available",
  "reserved",
  "booked",
  "blocked",
  "cancelled",
  "expired",
  "completed",
  "no-show",
]) satisfies z.ZodType<DoctorAppointmentSlotStatus>;

export const appointmentStatusSchema = z.enum([
  "draft",
  "slot-reserved",
  "awaiting-patient",
  "awaiting-approval",
  "awaiting-payment",
  "confirmed",
  "reminder-sent",
  "patient-arrived",
  "checked-in",
  "in-progress",
  "completed",
  "cancelled",
  "no-show",
  "expired",
  "entered-in-error",
]) satisfies z.ZodType<AppointmentStatus>;

export const moduleCodeSchema = z.enum([
  "PLATFORM",
  "ORGANIZATION",
  "ACCESS",
  "MASTER_DATA",
  "DOCUMENTS",
  "NOTIFICATIONS",
  "AUDIT",
  "SERVICES",
  "WORKFORCE",
  "SCHEDULING",
  "PATIENTS",
  "APPOINTMENTS",
  "RECEPTION_DESK",
  "QUEUE",
  "CLINICAL",
  "LABORATORY",
  "BLOOD_BANK",
  "RADIOLOGY",
  "INVENTORY",
  "PHARMACY",
  "BILLING",
  "BILLING_COUNTER",
  "INSURANCE",
  "WARD",
  "OPERATION_THEATRE",
  "CSSD",
  "TELEMEDICINE",
  "MESSAGING",
  "REPORTING",
  "PATIENT_ACCESS",
  "DENTISTRY",
]) satisfies z.ZodType<ModuleCode>;

export const permissionCodeSchema = z.custom<PermissionCode>(
  (value) =>
    typeof value === "string" &&
    PERMISSION_CODE_PATTERN.test(value),
  {
    message:
      "Use a permission code in domain.action format.",
  },
);

export function isValidIsoDateRange(
  startsOn: string,
  endsOn: string,
  allowEqual = true,
): boolean {
  if (
    !isoDateSchema.safeParse(startsOn).success ||
    !isoDateSchema.safeParse(endsOn).success
  ) {
    return false;
  }

  return allowEqual
    ? endsOn >= startsOn
    : endsOn > startsOn;
}

export function isValidIsoDateTimeRange(
  startsAt: string,
  endsAt: string,
  allowEqual = false,
): boolean {
  if (
    !isoDateTimeSchema.safeParse(startsAt).success ||
    !isoDateTimeSchema.safeParse(endsAt).success
  ) {
    return false;
  }

  const startTime = Date.parse(startsAt);
  const endTime = Date.parse(endsAt);

  if (
    Number.isNaN(startTime) ||
    Number.isNaN(endTime)
  ) {
    return false;
  }

  return allowEqual
    ? endTime >= startTime
    : endTime > startTime;
}

export function isValidLocalTimeRange(
  startsAt: string,
  endsAt: string,
): boolean {
  if (
    !localTimeSchema.safeParse(startsAt).success ||
    !localTimeSchema.safeParse(endsAt).success
  ) {
    return false;
  }

  return endsAt > startsAt;
}
