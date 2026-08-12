import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import { assertWithinEffectiveWindow, resolveEffectiveAvailability } from "@/server/scheduling/effective-availability";

async function resolvePatient(requestContext: WonFlowRequestContext) {
  const context = requireTenantContext(requestContext);
  const access = await database.patientAccess.findFirst({ where: { identityId: context.identityId, isActive: true, patient: { tenantId: context.tenantId, status: "ACTIVE" } }, include: { patient: { include: { identifiers: true } } }, orderBy: { isPrimary: "desc" } });
  if (!access) throw new WonFlowApiError(403, "patient-access-required", "This account is not linked to an active patient record.");
  return { context, patient: access.patient };
}

const normalize = (value?: string | null) => value?.trim().toLowerCase() || null;

export async function updateMyPatientProfile(requestContext: WonFlowRequestContext, input: { givenName: string; middleName?: string; familyName: string; dateOfBirth?: string; sex?: string; phone?: string; email?: string; address?: object; guardianData?: object; consentData?: object }) {
  const { context, patient } = await resolvePatient(requestContext);
  if (!input.givenName?.trim() || !input.familyName?.trim()) throw new WonFlowApiError(400, "patient-name-required", "First and last name are required.");
  const dateOfBirth = input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null;
  if (dateOfBirth && (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date())) throw new WonFlowApiError(400, "invalid-date-of-birth", "Enter a valid date of birth.");
  return database.$transaction(async (transaction) => {
    const updated = await transaction.patient.update({ where: { id: patient.id }, data: { givenName: input.givenName.trim(), middleName: input.middleName?.trim() || null, familyName: input.familyName.trim(), dateOfBirth, sex: input.sex?.trim() || null, phone: input.phone?.trim() || null, normalizedPhone: normalize(input.phone), email: input.email?.trim() || null, normalizedEmail: normalize(input.email), address: input.address, guardianData: input.guardianData, consentData: input.consentData } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: context.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "patient.profile.updated", entityType: "patient", entityId: patient.id, severity: "INFORMATION", sourceApplication: context.sourceApplication } });
    return updated;
  });
}

export async function listMyAppointments(requestContext: WonFlowRequestContext) {
  const { context, patient } = await resolvePatient(requestContext);
  return database.appointment.findMany({ where: { tenantId: context.tenantId, patientId: patient.id }, include: { service: true, branch: true, doctor: { include: { staffProfile: { include: { membership: true } } } } }, orderBy: { startsAt: "desc" }, take: 100 });
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

export async function getPatientBookingCatalog(requestContext: WonFlowRequestContext, date: string) {
  const { context } = await resolvePatient(requestContext);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new WonFlowApiError(400, "booking-date-required", "Select a booking date.");
  const selectedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(selectedDate.getTime())) throw new WonFlowApiError(400, "invalid-booking-date", "Select a valid booking date.");
  const weekday = selectedDate.getUTCDay();
  const branches = await database.branch.findMany({ where: { tenantId: context.tenantId, organizationId: context.organizationId, status: "ACTIVE", archivedAt: null }, select: { id: true, name: true, timezone: true } });
  const rules = await database.availabilityRule.findMany({ where: { tenantId: context.tenantId, isActive: true, weekday, validFrom: { lte: selectedDate }, OR: [{ validUntil: null }, { validUntil: { gte: selectedDate } }], branch: { organizationId: context.organizationId, status: "ACTIVE", archivedAt: null }, doctor: { publiclyBookable: true }, service: { isActive: true, publiclyBookable: true } }, include: { branch: true, service: true, doctor: { include: { staffProfile: { include: { membership: true } } } } } });
  const dayStart = new Date(`${date}T00:00:00.000Z`), dayEnd = new Date(`${date}T23:59:59.999Z`);
  const appointments = await database.appointment.findMany({ where: { tenantId: context.tenantId, startsAt: { lte: dayEnd }, endsAt: { gte: dayStart }, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"] } }, select: { doctorId: true, startsAt: true, endsAt: true } });
  // The roster is only the expected arrival window. Where the doctor has
  // recorded a sitting for this date, that sitting replaces it.
  const windows = await resolveEffectiveAvailability({ tenantId: context.tenantId, date, rules });
  const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
  const slots = windows.flatMap((window) => { const rule = ruleById.get(window.ruleId!); if (!rule) return []; const duration = window.slotMinutes ?? rule.service?.durationMinutes ?? rule.doctor.durationMinutes; const output: Array<{ id: string; ruleId: string; branchId: string; doctorId: string; serviceId: string; startsAt: string; endsAt: string; timezone: string; source: string }> = []; if (!rule.serviceId || duration < 1) return output; for (let minute = window.startsMinute; minute + duration <= window.endsMinute; minute += duration) { const startsAt = localMinuteToUtc(date, minute, rule.branch.timezone), endsAt = localMinuteToUtc(date, minute + duration, rule.branch.timezone); if (startsAt <= new Date()) continue; const reserved = appointments.filter((appointment) => appointment.doctorId === rule.doctorId && appointment.startsAt < endsAt && appointment.endsAt > startsAt).length; if (reserved < window.capacity) output.push({ id: `${rule.id}:${startsAt.toISOString()}`, ruleId: rule.id, branchId: rule.branchId, doctorId: rule.doctorId, serviceId: rule.serviceId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), timezone: rule.branch.timezone, source: window.source }); } return output; });
  const windowByRuleId = new Map(windows.map((window) => [window.ruleId, window]));
  return { date, branches, options: rules.flatMap((rule) => { const window = windowByRuleId.get(rule.id); if (!window) return []; return [{ ruleId: rule.id, branchId: rule.branchId, branchName: rule.branch.name, doctorId: rule.doctorId, doctorName: rule.doctor.staffProfile.membership.displayName, specialty: rule.doctor.specialty, serviceId: rule.serviceId!, serviceName: rule.service!.name, consultationMode: rule.service!.consultationMode, durationMinutes: window.slotMinutes ?? rule.service!.durationMinutes, priceMinorUnits: rule.service!.priceMinorUnits, currencyCode: rule.service!.currencyCode, availabilitySource: window.source, roomLabel: window.roomLabel }]; }), slots };
}

export async function bookMyAppointment(requestContext: WonFlowRequestContext, input: { slotId: string; reason?: string; idempotencyKey: string }) {
  const { context, patient } = await resolvePatient(requestContext);
  const separator = input.slotId.indexOf(":"); if (separator < 1) throw new WonFlowApiError(400, "invalid-booking-slot", "Select a valid appointment time.");
  const ruleId = input.slotId.slice(0, separator), startsAt = new Date(input.slotId.slice(separator + 1));
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) throw new WonFlowApiError(400, "invalid-booking-slot", "Select a future appointment time.");
  return database.$transaction(async (transaction) => {
    const existing = await transaction.idempotencyRecord.findUnique({ where: { tenantId_key_operation: { tenantId: context.tenantId, key: input.idempotencyKey, operation: "patient.appointment.book" } } });
    if (existing?.responsePayload && typeof existing.responsePayload === "object" && "appointmentId" in existing.responsePayload) return transaction.appointment.findUnique({ where: { id: String(existing.responsePayload.appointmentId) } });
    const rule = await transaction.availabilityRule.findFirst({ where: { id: ruleId, tenantId: context.tenantId, isActive: true, doctor: { publiclyBookable: true }, service: { isActive: true, publiclyBookable: true } }, include: { branch: true, service: true } });
    if (!rule?.serviceId || !rule.service) throw new WonFlowApiError(409, "booking-slot-unavailable", "This appointment option is no longer available.");
    const endsAt = new Date(startsAt.getTime() + rule.service.durationMinutes * 60_000);
    // The doctor's sitting overrides the roster, and may have been shortened or
    // ended after this slot was rendered.
    const withinWindow = await assertWithinEffectiveWindow(transaction, { tenantId: context.tenantId, doctorId: rule.doctorId, branchId: rule.branchId, startsAt, endsAt, timezone: rule.branch.timezone, rosterStartsMinute: rule.startsMinute, rosterEndsMinute: rule.endsMinute });
    if (!withinWindow.ok) throw new WonFlowApiError(409, "booking-slot-unavailable", withinWindow.reason);
    const reserved = await transaction.appointment.count({ where: { tenantId: context.tenantId, branchId: rule.branchId, doctorId: rule.doctorId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
    if (reserved >= rule.capacity) throw new WonFlowApiError(409, "booking-slot-taken", "That appointment time was just taken. Choose another time.");
    const appointment = await transaction.appointment.create({ data: { tenantId: context.tenantId, patientId: patient.id, doctorId: rule.doctorId, branchId: rule.branchId, serviceId: rule.serviceId, consultationMode: rule.service.consultationMode, status: "CONFIRMED", source: "PATIENT_PORTAL", reason: input.reason?.trim() || null, startsAt, endsAt, idempotencyKey: input.idempotencyKey } });
    await transaction.idempotencyRecord.create({ data: { tenantId: context.tenantId, key: input.idempotencyKey, operation: "patient.appointment.book", responsePayload: { appointmentId: appointment.id }, expiresAt: new Date(Date.now() + 86_400_000) } });
    await transaction.notification.create({ data: { tenantId: context.tenantId, identityId: context.identityId, patientId: patient.id, channel: "IN_APP", status: "PENDING", templateCode: "appointment-confirmed", payload: { appointmentId: appointment.id, startsAt: appointment.startsAt.toISOString(), branchId: appointment.branchId } } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: rule.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "patient.appointment.booked", entityType: "appointment", entityId: appointment.id, severity: "INFORMATION", sourceApplication: context.sourceApplication } });
    return appointment;
  }, { isolationLevel: "Serializable" });
}
