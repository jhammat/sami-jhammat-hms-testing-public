import { randomBytes } from "node:crypto";
import { database } from "@wonflow/database";

import { WonFlowApiError } from "@/server/http/route-handler";
import { assertWithinEffectiveWindow, resolveEffectiveAvailability } from "@/server/scheduling/effective-availability";

/**
 * Unauthenticated intake for a hospital's own public-facing site: a doctor
 * embeds `/book/:tenantSlug` (or `/book/:tenantSlug?doctor=<id>`) on their own
 * website, a stranger with no WonFlow account fills it in, and the result is
 * a real patient and a real appointment — tagged `referralSource: "website"`
 * so the doctor immediately sees where the patient came from, same as the
 * "reception" and "doctor" tags reception/doctor registration already use.
 *
 * Deliberately never matches an existing patient by phone or email: an
 * anonymous visitor typing someone else's phone number must not be able to
 * attach a booking to that person's real record. Every public submission
 * creates its own patient; reception/the doctor reconcile duplicates later
 * with the same duplicate-check tooling already used everywhere else.
 */

const patientNumber = () => `P-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
const normalizeOptional = (value?: string) => value?.trim().toLowerCase() || null;

async function resolveTenantBySlug(tenantSlug: string) {
  const tenant = await database.tenant.findFirst({
    where: { slug: tenantSlug.trim().toLowerCase(), status: "ACTIVE", archivedAt: null },
  });
  if (!tenant) throw new WonFlowApiError(404, "booking-page-not-found", "This booking page is not available.");
  const organization = await database.organization.findFirst({
    where: { tenantId: tenant.id, status: "ACTIVE", archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!organization) throw new WonFlowApiError(404, "booking-page-not-found", "This booking page is not available.");
  return { tenant, organization };
}

function timezoneOffsetMilliseconds(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second)) - date.getTime();
}

function localMinuteToUtc(date: string, minute: number, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const initial = new Date(Date.UTC(year!, month! - 1, day!, Math.floor(minute / 60), minute % 60));
  let value = new Date(initial.getTime() - timezoneOffsetMilliseconds(initial, timezone));
  value = new Date(initial.getTime() - timezoneOffsetMilliseconds(value, timezone));
  return value;
}

export async function getPublicBookingInfo(tenantSlug: string) {
  const { organization } = await resolveTenantBySlug(tenantSlug);
  const doctors = await database.doctorProfile.findMany({
    where: {
      publiclyBookable: true,
      staffProfile: { status: "ACTIVE", membership: { organizationId: organization.id, archivedAt: null } },
    },
    include: { staffProfile: { include: { membership: true } } },
    orderBy: { staffProfile: { membership: { displayName: "asc" } } },
  });
  if (doctors.length === 0) throw new WonFlowApiError(404, "booking-page-not-found", "This booking page is not available.");
  return {
    organizationName: organization.displayName,
    doctors: doctors.map((doctor) => ({ id: doctor.id, displayName: doctor.staffProfile.membership.displayName, specialty: doctor.specialty })),
  };
}

export async function getPublicBookingCatalog(tenantSlug: string, date: string, doctorId?: string) {
  const { tenant, organization } = await resolveTenantBySlug(tenantSlug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new WonFlowApiError(400, "booking-date-required", "Select a booking date.");
  const selectedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(selectedDate.getTime())) throw new WonFlowApiError(400, "invalid-booking-date", "Select a valid booking date.");
  const weekday = selectedDate.getUTCDay();

  const rules = await database.availabilityRule.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      weekday,
      validFrom: { lte: selectedDate },
      OR: [{ validUntil: null }, { validUntil: { gte: selectedDate } }],
      branch: { organizationId: organization.id, status: "ACTIVE", archivedAt: null },
      doctor: { publiclyBookable: true, ...(doctorId ? { id: doctorId } : {}) },
      service: { isActive: true, publiclyBookable: true },
    },
    include: { branch: true, service: true, doctor: { include: { staffProfile: { include: { membership: true } } } } },
  });

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);
  const appointments = await database.appointment.findMany({
    where: { tenantId: tenant.id, startsAt: { lte: dayEnd }, endsAt: { gte: dayStart }, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"] } },
    select: { doctorId: true, startsAt: true, endsAt: true },
  });

  const windows = await resolveEffectiveAvailability({ tenantId: tenant.id, date, rules });
  const ruleById = new Map(rules.map((rule) => [rule.id, rule]));

  const slots = windows.flatMap((window) => {
    const rule = ruleById.get(window.ruleId!);
    if (!rule) return [];
    const duration = window.slotMinutes ?? rule.service?.durationMinutes ?? rule.doctor.durationMinutes;
    const output: Array<{ id: string; ruleId: string; branchId: string; branchName: string; doctorId: string; doctorName: string; serviceId: string; serviceName: string; startsAt: string; endsAt: string }> = [];
    if (!rule.serviceId || duration < 1) return output;
    for (let minute = window.startsMinute; minute + duration <= window.endsMinute; minute += duration) {
      const startsAt = localMinuteToUtc(date, minute, rule.branch.timezone);
      const endsAt = localMinuteToUtc(date, minute + duration, rule.branch.timezone);
      if (startsAt <= new Date()) continue;
      const reserved = appointments.filter((appointment) => appointment.doctorId === rule.doctorId && appointment.startsAt < endsAt && appointment.endsAt > startsAt).length;
      if (reserved < window.capacity) {
        output.push({
          id: `${rule.id}:${startsAt.toISOString()}`,
          ruleId: rule.id,
          branchId: rule.branchId,
          branchName: rule.branch.name,
          doctorId: rule.doctorId,
          doctorName: rule.doctor.staffProfile.membership.displayName,
          serviceId: rule.serviceId,
          serviceName: rule.service!.name,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        });
      }
    }
    return output;
  });

  return { date, organizationName: organization.displayName, slots };
}

export interface PublicBookingInput {
  slotId: string;
  givenName: string;
  familyName: string;
  phone: string;
  email?: string;
  reason?: string;
  idempotencyKey: string;
}

export async function submitPublicBooking(tenantSlug: string, input: PublicBookingInput) {
  const { tenant } = await resolveTenantBySlug(tenantSlug);

  const givenName = input.givenName.trim();
  const familyName = input.familyName.trim();
  const phone = input.phone.trim();
  if (givenName.length < 2 || familyName.length < 2) throw new WonFlowApiError(400, "patient-name-required", "Enter the patient's full name.");
  if (phone.length < 7) throw new WonFlowApiError(400, "patient-phone-required", "Enter a valid mobile number.");

  const separator = input.slotId.indexOf(":");
  if (separator < 1) throw new WonFlowApiError(400, "invalid-booking-slot", "Select a valid appointment time.");
  const ruleId = input.slotId.slice(0, separator);
  const startsAt = new Date(input.slotId.slice(separator + 1));
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) throw new WonFlowApiError(400, "invalid-booking-slot", "Select a future appointment time.");

  return database.$transaction(async (transaction) => {
    const existing = await transaction.idempotencyRecord.findUnique({ where: { tenantId_key_operation: { tenantId: tenant.id, key: input.idempotencyKey, operation: "public.appointment.book" } } });
    if (existing?.responsePayload && typeof existing.responsePayload === "object" && "appointmentId" in existing.responsePayload) {
      const appointment = await transaction.appointment.findUnique({ where: { id: String(existing.responsePayload.appointmentId) }, include: { patient: true } });
      if (appointment) return appointment;
    }

    const rule = await transaction.availabilityRule.findFirst({
      where: { id: ruleId, tenantId: tenant.id, isActive: true, doctor: { publiclyBookable: true }, service: { isActive: true, publiclyBookable: true } },
      include: { branch: true, service: true },
    });
    if (!rule?.serviceId || !rule.service) throw new WonFlowApiError(409, "booking-slot-unavailable", "This appointment option is no longer available.");
    const endsAt = new Date(startsAt.getTime() + rule.service.durationMinutes * 60_000);
    const withinWindow = await assertWithinEffectiveWindow(transaction, { tenantId: tenant.id, doctorId: rule.doctorId, branchId: rule.branchId, startsAt, endsAt, timezone: rule.branch.timezone, rosterStartsMinute: rule.startsMinute, rosterEndsMinute: rule.endsMinute });
    if (!withinWindow.ok) throw new WonFlowApiError(409, "booking-slot-unavailable", withinWindow.reason);
    const reserved = await transaction.appointment.count({ where: { tenantId: tenant.id, branchId: rule.branchId, doctorId: rule.doctorId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
    if (reserved >= rule.capacity) throw new WonFlowApiError(409, "booking-slot-taken", "That appointment time was just taken. Choose another time.");

    const patient = await transaction.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: patientNumber(),
        givenName,
        familyName,
        phone,
        normalizedPhone: normalizeOptional(phone),
        email: input.email?.trim() || null,
        normalizedEmail: normalizeOptional(input.email),
        // "online-booking" matches the same referralSource vocabulary reception's
        // own registration form already uses (see patient-registration-workflow.tsx),
        // so the doctor sees one consistent set of source labels everywhere,
        // not a second parallel vocabulary invented for this one channel.
        consentData: { consentToContact: true, referralSource: "online-booking" },
      },
    });

    const appointment = await transaction.appointment.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        doctorId: rule.doctorId,
        branchId: rule.branchId,
        serviceId: rule.serviceId,
        consultationMode: rule.service.consultationMode,
        status: "PENDING",
        source: "public-website",
        reason: input.reason?.trim() || null,
        startsAt,
        endsAt,
        idempotencyKey: input.idempotencyKey,
      },
      include: { patient: true, branch: true, doctor: { include: { staffProfile: { include: { membership: true } } } } },
    });

    await transaction.idempotencyRecord.create({ data: { tenantId: tenant.id, key: input.idempotencyKey, operation: "public.appointment.book", responsePayload: { appointmentId: appointment.id }, expiresAt: new Date(Date.now() + 86_400_000) } });
    await transaction.auditEvent.create({ data: { tenantId: tenant.id, branchId: rule.branchId, requestId: input.idempotencyKey, action: "public.appointment.booked", entityType: "appointment", entityId: appointment.id, severity: "INFORMATION", sourceApplication: "public-booking-page" } });

    return appointment;
  }, { isolationLevel: "Serializable" });
}
