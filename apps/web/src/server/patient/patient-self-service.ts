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

async function findMyAppointment(requestContext: WonFlowRequestContext, appointmentId: string) {
  const { context, patient } = await resolvePatient(requestContext);
  const appointment = await database.appointment.findFirst({
    where: { id: appointmentId, tenantId: context.tenantId, patientId: patient.id },
    include: { service: true, doctor: { include: { staffProfile: { include: { membership: true } } } }, paymentProofDocument: true },
  });
  if (!appointment) throw new WonFlowApiError(404, "appointment-not-found", "This appointment could not be found.");
  return { context, patient, appointment };
}

/** What the patient sees on the payment screen: the exact amount, where to send it, and whether proof has already been uploaded. */
export async function getMyAppointmentPayment(requestContext: WonFlowRequestContext, appointmentId: string) {
  const { context, appointment } = await findMyAppointment(requestContext, appointmentId);
  if (appointment.paymentStatus === "NOT_REQUIRED") {
    throw new WonFlowApiError(409, "payment-not-required", "This appointment does not require payment.");
  }
  const accounts = await database.paymentAccount.findMany({
    where: { tenantId: context.tenantId, isEnabled: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });
  return {
    appointmentId: appointment.id,
    serviceName: appointment.service?.name ?? "Consultation",
    priceMinorUnits: appointment.service?.priceMinorUnits ?? null,
    currencyCode: appointment.service?.currencyCode ?? "PKR",
    paymentStatus: appointment.paymentStatus,
    proofUploaded: appointment.paymentProofDocumentId !== null,
    accounts: accounts.map((account) => ({ id: account.id, method: account.method, bankName: account.bankName, accountTitle: account.accountTitle, accountNumber: account.accountNumber, iban: account.iban })),
  };
}

/**
 * Attaches an already-uploaded document (via the same chunked
 * patient-document upload every other document in the portal uses) as this
 * appointment's payment proof. Never confirms payment itself — only a user
 * with billing.payments.manage does that, from the confirmation queue this
 * notifies.
 */
export async function submitMyAppointmentPaymentProof(requestContext: WonFlowRequestContext, appointmentId: string, documentId: string) {
  const { context, patient, appointment } = await findMyAppointment(requestContext, appointmentId);
  if (appointment.paymentStatus !== "AWAITING_PAYMENT") {
    throw new WonFlowApiError(409, "payment-not-awaiting", "This appointment is not awaiting payment.");
  }
  const document = await database.documentRecord.findFirst({ where: { id: documentId, tenantId: context.tenantId, patientId: patient.id } });
  if (!document) throw new WonFlowApiError(404, "document-not-found", "This uploaded proof could not be found.");

  return database.$transaction(async (transaction) => {
    const updated = await transaction.appointment.update({ where: { id: appointment.id }, data: { paymentProofDocumentId: document.id } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: appointment.branchId, requestId: context.requestId, action: "patient.appointment.payment-proof.uploaded", entityType: "appointment", entityId: appointment.id, severity: "INFORMATION", sourceApplication: context.sourceApplication } });
    // Notified to the doctor's own identity — the confirmation queue itself
    // (gated on billing.payments.manage) is what surfaces this to billing
    // staff, the same way every other staff worklist in this app works.
    const doctorIdentityId = appointment.doctor?.staffProfile.membership.identityId;
    if (doctorIdentityId) {
      await transaction.notification.create({
        data: {
          tenantId: context.tenantId, identityId: doctorIdentityId, patientId: patient.id, channel: "IN_APP", status: "PENDING",
          templateCode: "appointment-payment-proof-uploaded",
          payload: { appointmentId: appointment.id, patientName: `${patient.givenName} ${patient.familyName}` },
        },
      });
    }
    return updated;
  });
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
  // Taken slots are returned too, marked unavailable, rather than filtered
  // out — a patient seeing a full afternoon should understand the doctor is
  // busy, not wonder whether the page is broken.
  const slots = windows.flatMap((window) => { const rule = ruleById.get(window.ruleId!); if (!rule) return []; const duration = window.slotMinutes ?? rule.service?.durationMinutes ?? rule.doctor.durationMinutes; const output: Array<{ id: string; ruleId: string; branchId: string; doctorId: string; serviceId: string; startsAt: string; endsAt: string; timezone: string; source: string; available: boolean }> = []; if (!rule.serviceId || duration < 1) return output; for (let minute = window.startsMinute; minute + duration <= window.endsMinute; minute += duration) { const startsAt = localMinuteToUtc(date, minute, rule.branch.timezone), endsAt = localMinuteToUtc(date, minute + duration, rule.branch.timezone); if (startsAt <= new Date()) continue; const reserved = appointments.filter((appointment) => appointment.doctorId === rule.doctorId && appointment.startsAt < endsAt && appointment.endsAt > startsAt).length; output.push({ id: `${rule.id}:${startsAt.toISOString()}`, ruleId: rule.id, branchId: rule.branchId, doctorId: rule.doctorId, serviceId: rule.serviceId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), timezone: rule.branch.timezone, source: window.source, available: reserved < window.capacity }); } return output; });
  const windowByRuleId = new Map(windows.map((window) => [window.ruleId, window]));
  return { date, branches, options: rules.flatMap((rule) => { const window = windowByRuleId.get(rule.id); if (!window) return []; return [{ ruleId: rule.id, branchId: rule.branchId, branchName: rule.branch.name, doctorId: rule.doctorId, doctorName: rule.doctor.staffProfile.membership.displayName, specialty: rule.doctor.specialty, serviceId: rule.serviceId!, serviceName: rule.service!.name, consultationModes: rule.service!.consultationModes, requiresPrepayment: rule.service!.requiresPrepayment, durationMinutes: window.slotMinutes ?? rule.service!.durationMinutes, priceMinorUnits: rule.service!.priceMinorUnits, currencyCode: rule.service!.currencyCode, availabilitySource: window.source, roomLabel: window.roomLabel }]; }), slots };
}

export async function bookMyAppointment(requestContext: WonFlowRequestContext, input: { slotId: string; mode?: "IN_PERSON" | "ONLINE"; reason?: string; idempotencyKey: string }) {
  const { context, patient } = await resolvePatient(requestContext);
  const separator = input.slotId.indexOf(":"); if (separator < 1) throw new WonFlowApiError(400, "invalid-booking-slot", "Select a valid appointment time.");
  const ruleId = input.slotId.slice(0, separator), startsAt = new Date(input.slotId.slice(separator + 1));
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) throw new WonFlowApiError(400, "invalid-booking-slot", "Select a future appointment time.");
  return database.$transaction(async (transaction) => {
    const existing = await transaction.idempotencyRecord.findUnique({ where: { tenantId_key_operation: { tenantId: context.tenantId, key: input.idempotencyKey, operation: "patient.appointment.book" } } });
    if (existing?.responsePayload && typeof existing.responsePayload === "object" && "appointmentId" in existing.responsePayload) return transaction.appointment.findUnique({ where: { id: String(existing.responsePayload.appointmentId) } });
    const rule = await transaction.availabilityRule.findFirst({ where: { id: ruleId, tenantId: context.tenantId, isActive: true, doctor: { publiclyBookable: true }, service: { isActive: true, publiclyBookable: true } }, include: { branch: true, service: true } });
    if (!rule?.serviceId || !rule.service) throw new WonFlowApiError(409, "booking-slot-unavailable", "This appointment option is no longer available.");
    // Mode must be chosen explicitly whenever the service allows more than
    // one — defaulting silently would hide the online payment requirement
    // from a patient who assumed they were booking in person.
    const availableModes = rule.service.consultationModes;
    const mode = availableModes.length === 1 ? availableModes[0]! : input.mode;
    if (!mode) throw new WonFlowApiError(400, "consultation-mode-required", "Choose whether this is an in-person or online consultation.");
    if (!availableModes.includes(mode)) throw new WonFlowApiError(400, "consultation-mode-unavailable", `This service does not offer ${mode === "ONLINE" ? "online" : "in-person"} consultations.`);
    const endsAt = new Date(startsAt.getTime() + rule.service.durationMinutes * 60_000);
    // The doctor's sitting overrides the roster, and may have been shortened or
    // ended after this slot was rendered.
    const withinWindow = await assertWithinEffectiveWindow(transaction, { tenantId: context.tenantId, doctorId: rule.doctorId, branchId: rule.branchId, startsAt, endsAt, timezone: rule.branch.timezone, rosterStartsMinute: rule.startsMinute, rosterEndsMinute: rule.endsMinute });
    if (!withinWindow.ok) throw new WonFlowApiError(409, "booking-slot-unavailable", withinWindow.reason);
    const reserved = await transaction.appointment.count({ where: { tenantId: context.tenantId, branchId: rule.branchId, doctorId: rule.doctorId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
    if (reserved >= rule.capacity) throw new WonFlowApiError(409, "booking-slot-taken", "That appointment time was just taken. Choose another time.");
    const requiresPrepayment = mode === "ONLINE" && rule.service.requiresPrepayment;
    const appointment = await transaction.appointment.create({ data: { tenantId: context.tenantId, patientId: patient.id, doctorId: rule.doctorId, branchId: rule.branchId, serviceId: rule.serviceId, consultationMode: mode, paymentStatus: requiresPrepayment ? "AWAITING_PAYMENT" : "NOT_REQUIRED", status: "CONFIRMED", source: "PATIENT_PORTAL", reason: input.reason?.trim() || null, startsAt, endsAt, idempotencyKey: input.idempotencyKey } });
    await transaction.idempotencyRecord.create({ data: { tenantId: context.tenantId, key: input.idempotencyKey, operation: "patient.appointment.book", responsePayload: { appointmentId: appointment.id }, expiresAt: new Date(Date.now() + 86_400_000) } });
    await transaction.notification.create({ data: { tenantId: context.tenantId, identityId: context.identityId, patientId: patient.id, channel: "IN_APP", status: "PENDING", templateCode: "appointment-confirmed", payload: { appointmentId: appointment.id, startsAt: appointment.startsAt.toISOString(), branchId: appointment.branchId } } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: rule.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "patient.appointment.booked", entityType: "appointment", entityId: appointment.id, severity: "INFORMATION", sourceApplication: context.sourceApplication } });
    return appointment;
  }, { isolationLevel: "Serializable" });
}
