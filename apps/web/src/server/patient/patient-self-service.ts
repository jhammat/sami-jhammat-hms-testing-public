import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import { assertWithinEffectiveWindow, localMinuteOfDay, resolveEffectiveAvailability } from "@/server/scheduling/effective-availability";

async function resolvePatient(requestContext: WonFlowRequestContext) {
  const context = requireTenantContext(requestContext);
  const now = new Date();
  const access = await database.patientAccess.findFirst({
    where: {
      identityId: context.identityId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      patient: { tenantId: context.tenantId, status: "ACTIVE" },
    },
    include: { patient: { include: { identifiers: true } } },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  if (!access) throw new WonFlowApiError(403, "patient-access-required", "This account is not linked to an active patient record.");
  return { context, patient: access.patient, access };
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

/** The calendar date `instant` falls on in `timezone`, as `YYYY-MM-DD`. */
function businessDateIn(instant: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

/**
 * One consultation is as long as the doctor is actually sitting for, not as
 * long as the service definition says. A sitting that records a 10 minute
 * average overrides a 30 minute service — and the same number has to drive
 * both the slot grid the patient is shown and the appointment that booking
 * writes, or bookings land on boundaries the grid never offered.
 */
function slotDurationMinutes(
  window: { slotMinutes: number | null },
  rule: { service: { durationMinutes: number } | null; doctor: { durationMinutes: number } },
) {
  return window.slotMinutes ?? rule.service?.durationMinutes ?? rule.doctor.durationMinutes;
}

/**
 * Why a patient is being shown nothing. An empty booking screen with no
 * explanation is indistinguishable from a broken one, so every path that ends
 * in "no options" names the missing piece and who can supply it.
 */
export interface PatientBookingBlocker {
  code: string;
  message: string;
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const listNames = (values: readonly string[]) => {
  const unique = [...new Set(values)];
  if (unique.length <= 2) return unique.join(" and ");
  return `${unique.slice(0, -1).join(", ")} and ${unique.at(-1)}`;
};

export async function getPatientBookingCatalog(requestContext: WonFlowRequestContext, date: string) {
  const { context } = await resolvePatient(requestContext);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new WonFlowApiError(400, "booking-date-required", "Select a booking date.");
  const selectedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(selectedDate.getTime())) throw new WonFlowApiError(400, "invalid-booking-date", "Select a valid booking date.");
  const weekday = selectedDate.getUTCDay();
  const weekdayName = WEEKDAY_NAMES[weekday]!;

  const branches = await database.branch.findMany({ where: { tenantId: context.tenantId, status: "ACTIVE", archivedAt: null }, select: { id: true, name: true, timezone: true } });
  if (branches.length === 0) {
    return { date, nextAvailableDate: null, branches, options: [], slots: [], blockers: [{ code: "no-active-branch", message: "This hospital has no active location open for online booking yet. Please call the hospital to arrange your visit." }] };
  }

  // Every rostered window for the date, before the publish flags are applied.
  // The rules that fail those flags are what turns an unexplained empty screen
  // into a specific message.
  const candidateRules = await database.availabilityRule.findMany({
    where: {
      tenantId: context.tenantId,
      isActive: true,
      weekday,
      validFrom: { lte: selectedDate },
      OR: [{ validUntil: null }, { validUntil: { gte: selectedDate } }],
      branch: { status: "ACTIVE", archivedAt: null },
    },
    include: { branch: true, service: true, doctor: { include: { staffProfile: { include: { membership: true } } } } },
  });

  const defaultServices = await database.serviceDefinition.findMany({
    where: { tenantId: context.tenantId, isActive: true, publiclyBookable: true },
    orderBy: [{ doctorId: "desc" }, { createdAt: "asc" }],
  });
  /*
   * A clinic rostered without a service is priced from that doctor's own
   * consultation service — and only ever from theirs.
   *
   * This used to fall back to `defaultServices[0]`, the first publicly
   * bookable service in the whole hospital, whenever the doctor had none of
   * their own. A patient booking Dr A's Tuesday clinic could then be quoted
   * and charged against a service belonging to Dr B, at Dr B's price, with
   * Dr B's duration and consultation modes deciding what the patient was
   * offered. Attaching this doctor's own service is a helpful convenience;
   * attaching somebody else's is a pricing error wearing the same clothes.
   *
   * With no service of their own the rule is dropped below, and
   * `diagnoseEmptyCatalog` explains it as `schedule-has-no-service` rather
   * than leaving the patient with an empty screen.
   */
  for (const candidate of candidateRules) {
    if (!candidate.serviceId || !candidate.service) {
      const matched = defaultServices.find((service) => service.doctorId === candidate.doctorId);
      if (matched) {
        candidate.serviceId = matched.id;
        candidate.service = matched;
      }
    }
  }

  const rules = candidateRules.filter((rule) => rule.doctor.publiclyBookable && rule.serviceId !== null && rule.service?.isActive === true && rule.service.publiclyBookable);

  // Padded a day either side of the UTC date on purpose.
  //
  // The rules behind these slots can belong to branches in different
  // timezones, so there is no single local day to bound this by. A plain
  // UTC day missed appointments sitting in the hospital's own early hours
  // — at UTC+5 anything before 05:00 local — and a missed appointment here
  // shows its slot as free, which is a double booking. The reservation
  // check below compares exact instants, so this only has to be a
  // superset; being wider costs a few rows and cannot select wrongly.
  const dayStart = new Date(new Date(`${date}T00:00:00.000Z`).getTime() - 86_400_000),
    dayEnd = new Date(new Date(`${date}T23:59:59.999Z`).getTime() + 86_400_000);
  const appointments = rules.length === 0
    ? []
    : await database.appointment.findMany({ where: { tenantId: context.tenantId, doctorId: { in: [...new Set(rules.map((rule) => rule.doctorId))] }, startsAt: { lte: dayEnd }, endsAt: { gte: dayStart }, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"] } }, select: { doctorId: true, startsAt: true, endsAt: true } });
  // The roster is only the expected arrival window. Where the doctor has
  // recorded a sitting for this date, that sitting replaces it.
  const windows = await resolveEffectiveAvailability({ tenantId: context.tenantId, date, rules });
  const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
  const now = new Date();
  // Taken slots are returned too, marked unavailable, rather than filtered
  // out — a patient seeing a full afternoon should understand the doctor is
  // busy, not wonder whether the page is broken.
  const slots = windows.flatMap((window) => {
    const rule = ruleById.get(window.ruleId!);
    if (!rule) return [];
    const duration = slotDurationMinutes(window, rule);
    const output: Array<{ id: string; ruleId: string; branchId: string; doctorId: string; serviceId: string; startsAt: string; endsAt: string; timezone: string; source: string; available: boolean }> = [];
    if (!rule.serviceId || duration < 1) return output;
    for (let minute = window.startsMinute; minute + duration <= window.endsMinute; minute += duration) {
      const startsAt = localMinuteToUtc(date, minute, rule.branch.timezone), endsAt = localMinuteToUtc(date, minute + duration, rule.branch.timezone);
      if (startsAt <= now) continue;
      const reserved = appointments.filter((appointment) => appointment.doctorId === rule.doctorId && appointment.startsAt < endsAt && appointment.endsAt > startsAt).length;
      output.push({ id: `${rule.id}:${startsAt.toISOString()}`, ruleId: rule.id, branchId: rule.branchId, doctorId: rule.doctorId, serviceId: rule.serviceId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), timezone: rule.branch.timezone, source: window.source, available: reserved < window.capacity });
    }
    return output;
  });

  const windowByRuleId = new Map(windows.map((window) => [window.ruleId, window]));
  const options = rules.flatMap((rule) => {
    const window = windowByRuleId.get(rule.id);
    if (!window) return [];
    return [{ ruleId: rule.id, branchId: rule.branchId, branchName: rule.branch.name, doctorId: rule.doctorId, doctorName: rule.doctor.staffProfile.membership.displayName, specialty: rule.doctor.specialty, serviceId: rule.serviceId!, serviceName: rule.service!.name, consultationModes: rule.service!.consultationModes, requiresPrepayment: rule.service!.requiresPrepayment, durationMinutes: slotDurationMinutes(window, rule), priceMinorUnits: rule.service!.priceMinorUnits, currencyCode: rule.service!.currencyCode, availabilitySource: window.source, roomLabel: window.roomLabel }];
  });

  let nextAvailableDate: string | null = null;
  if (!slots.some((slot) => slot.available)) {
    const allActiveRules = await database.availabilityRule.findMany({
      where: {
        tenantId: context.tenantId,
        isActive: true,
        branch: { status: "ACTIVE", archivedAt: null },
        doctor: { publiclyBookable: true },
      },
      select: { weekday: true },
    });
    const weekdaysWithClinics = new Set(allActiveRules.map((r) => r.weekday));
    if (weekdaysWithClinics.size > 0) {
      const base = new Date(`${date}T00:00:00.000Z`);
      for (let offset = 1; offset <= 14; offset += 1) {
        const nextCandidate = new Date(base.getTime() + offset * 86_400_000);
        if (weekdaysWithClinics.has(nextCandidate.getUTCDay())) {
          nextAvailableDate = nextCandidate.toISOString().slice(0, 10);
          break;
        }
      }
    }
  }

  const blockers = await diagnoseEmptyCatalog({ tenantId: context.tenantId, organizationId: context.organizationId, date, weekdayName, candidateRules, rules, options, slots });
  return { date, nextAvailableDate, branches, options, slots, blockers };
}

/**
 * Runs only when the patient would otherwise be shown an empty screen. Each
 * branch names the exact configuration step that is missing, so the patient
 * gets something actionable and support can resolve it without opening a
 * database session.
 */
async function diagnoseEmptyCatalog(input: {
  tenantId: string;
  organizationId: string;
  date: string;
  weekdayName: string;
  candidateRules: Array<{ serviceId: string | null; doctor: { publiclyBookable: boolean; staffProfile: { membership: { displayName: string } } }; service: { isActive: boolean; publiclyBookable: boolean; name: string } | null }>;
  rules: Array<{ doctor: { staffProfile: { membership: { displayName: string } } } }>;
  options: Array<{ doctorName: string }>;
  slots: Array<{ available: boolean }>;
}): Promise<PatientBookingBlocker[]> {
  const { candidateRules, rules, options, slots, weekdayName, date } = input;
  if (options.length > 0 && slots.some((slot) => slot.available)) return [];

  if (candidateRules.length === 0) {
    const rosteredAnywhere = await database.availabilityRule.count({ where: { tenantId: input.tenantId, isActive: true, branch: { status: "ACTIVE", archivedAt: null } } });
    return [rosteredAnywhere === 0
      ? { code: "no-schedules-published", message: "This hospital has not published any clinic schedules for online booking yet. Please call the hospital to arrange your visit." }
      : { code: "no-clinic-on-weekday", message: `No clinic is scheduled on ${weekdayName}. Choose another date to see available consultation times.` }];
  }

  if (rules.length === 0) {
    const blockers: PatientBookingBlocker[] = [];
    const unpublishedDoctors = candidateRules.filter((rule) => !rule.doctor.publiclyBookable).map((rule) => rule.doctor.staffProfile.membership.displayName);
    const unlinkedSchedules = candidateRules.filter((rule) => rule.doctor.publiclyBookable && rule.serviceId === null).map((rule) => rule.doctor.staffProfile.membership.displayName);
    const unpublishedServices = candidateRules.filter((rule) => rule.doctor.publiclyBookable && rule.service !== null && (!rule.service.isActive || !rule.service.publiclyBookable)).map((rule) => rule.service!.name);
    if (unpublishedDoctors.length > 0) {
      blockers.push({ code: "doctor-not-publicly-bookable", message: `${listNames(unpublishedDoctors)} ${unpublishedDoctors.length === 1 ? "holds a clinic" : "hold clinics"} on ${weekdayName}, but online patient booking has not been switched on for that clinic yet. Please call the hospital to book this visit.` });
    }
    if (unlinkedSchedules.length > 0) {
      blockers.push({ code: "schedule-has-no-service", message: `The ${weekdayName} clinic for ${listNames(unlinkedSchedules)} has no consultation service attached, so it cannot be priced or booked online. Please call the hospital to book this visit.` });
    }
    if (unpublishedServices.length > 0) {
      blockers.push({ code: "service-not-publicly-bookable", message: `${listNames(unpublishedServices)} ${unpublishedServices.length === 1 ? "is" : "are"} not open to online patient booking. Please call the hospital to book this consultation.` });
    }
    if (blockers.length === 0) {
      blockers.push({ code: "no-bookable-clinic", message: `No clinic is open for online booking on ${weekdayName}. Choose another date, or call the hospital to arrange your visit.` });
    }
    return blockers;
  }

  if (options.length === 0) {
    return [{ code: "doctor-finished-sitting", message: `${listNames(rules.map((rule) => rule.doctor.staffProfile.membership.displayName))} ${rules.length === 1 ? "has" : "have"} closed the clinic for this date. Choose another date to see available consultation times.` }];
  }

  if (slots.length === 0) {
    return [new Date(`${date}T23:59:59.999Z`) <= new Date() || date <= businessDateIn(new Date(), "UTC")
      ? { code: "no-remaining-slots-today", message: "Every consultation time for this date has already passed. Choose a later date." }
      : { code: "no-slots-generated", message: `No consultation times could be generated for ${weekdayName}. Choose another date, or call the hospital to arrange your visit.` }];
  }

  return [{ code: "fully-booked", message: `${listNames(options.map((option) => option.doctorName))} ${options.length === 1 ? "is" : "are"} fully booked on this date. Choose another date to see available consultation times.` }];
}

export async function bookMyAppointment(requestContext: WonFlowRequestContext, input: { slotId: string; mode?: "IN_PERSON" | "ONLINE"; reason?: string; idempotencyKey: string }) {
  const { context, patient } = await resolvePatient(requestContext);
  if (typeof input?.idempotencyKey !== "string" || input.idempotencyKey.trim().length < 8 || input.idempotencyKey.length > 200) throw new WonFlowApiError(400, "idempotency-key-required", "This booking request is malformed. Reload the page and try again.");
  if (typeof input.slotId !== "string") throw new WonFlowApiError(400, "invalid-booking-slot", "Select a valid appointment time.");
  const separator = input.slotId.indexOf(":"); if (separator < 1) throw new WonFlowApiError(400, "invalid-booking-slot", "Select a valid appointment time.");
  const ruleId = input.slotId.slice(0, separator), startsAt = new Date(input.slotId.slice(separator + 1));
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) throw new WonFlowApiError(400, "invalid-booking-slot", "Select a future appointment time.");
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 500) : "";
  return database.$transaction(async (transaction) => {
    const existing = await transaction.idempotencyRecord.findUnique({ where: { tenantId_key_operation: { tenantId: context.tenantId, key: input.idempotencyKey, operation: "patient.appointment.book" } } });
    if (existing?.responsePayload && typeof existing.responsePayload === "object" && "appointmentId" in existing.responsePayload) return transaction.appointment.findUnique({ where: { id: String(existing.responsePayload.appointmentId) } });
    // Scoped to the tenant active branches
    const rule = await transaction.availabilityRule.findFirst({
      where: {
        id: ruleId,
        tenantId: context.tenantId,
        isActive: true,
        branch: { status: "ACTIVE", archivedAt: null },
        doctor: { publiclyBookable: true },
      },
      include: { branch: true, service: true, doctor: true },
    });
    let service = rule?.service;
    if (rule && (!service || !service.isActive || !service.publiclyBookable)) {
      service = await transaction.serviceDefinition.findFirst({
        where: { tenantId: context.tenantId, isActive: true, publiclyBookable: true, OR: [{ doctorId: rule.doctorId }, { doctorId: null }] },
        orderBy: [{ doctorId: "desc" }, { createdAt: "asc" }],
      });
    }
    if (!rule || !service) throw new WonFlowApiError(409, "booking-slot-unavailable", "This appointment option is no longer available.");
    // A slot id carries only a rule and an instant, so the instant is re-checked
    // against the rule it claims to come from. The roster covers one weekday
    // inside a validity range, and the minute-of-day check below would happily
    // place a Monday clinic on a Thursday without this.
    const businessDate = businessDateIn(startsAt, rule.branch.timezone);
    const businessDateUtc = new Date(`${businessDate}T00:00:00.000Z`);
    if (businessDateUtc.getUTCDay() !== rule.weekday) throw new WonFlowApiError(409, "booking-slot-unavailable", "That clinic does not run on the selected day. Choose another time.");
    if (rule.validFrom > businessDateUtc || (rule.validUntil !== null && rule.validUntil < businessDateUtc)) throw new WonFlowApiError(409, "booking-slot-unavailable", "That clinic is not running on the selected date. Choose another time.");
    // Mode must be chosen explicitly whenever the service allows more than
    // one — defaulting silently would hide the online payment requirement
    // from a patient who assumed they were booking in person.
    const availableModes = service.consultationModes;
    const mode = availableModes.length === 1 ? availableModes[0]! : input.mode;
    if (!mode) throw new WonFlowApiError(400, "consultation-mode-required", "Choose whether this is an in-person or online consultation.");
    if (!availableModes.includes(mode)) throw new WonFlowApiError(400, "consultation-mode-unavailable", `This service does not offer ${mode === "ONLINE" ? "online" : "in-person"} consultations.`);
    // The sitting overrides the roster and may have been shortened or ended
    // after this slot was rendered. It also sets the consultation length, so it
    // has to be resolved before endsAt is computed.
    const sitting = await transaction.doctorSitting.findFirst({ where: { tenantId: context.tenantId, doctorId: rule.doctorId, branchId: rule.branchId, businessDate: businessDateUtc } });
    const duration = slotDurationMinutes({ slotMinutes: sitting?.averageConsultationMinutes ?? null }, { ...rule, service });
    if (duration < 1) throw new WonFlowApiError(409, "booking-slot-unavailable", "This appointment option is not configured for booking. Please call the hospital.");
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    const withinWindow = await assertWithinEffectiveWindow(transaction, { tenantId: context.tenantId, doctorId: rule.doctorId, branchId: rule.branchId, startsAt, endsAt, timezone: rule.branch.timezone, rosterStartsMinute: rule.startsMinute, rosterEndsMinute: rule.endsMinute });
    if (!withinWindow.ok) throw new WonFlowApiError(409, "booking-slot-unavailable", withinWindow.reason);
    // Slots are offered on a fixed grid running from the window start.
    // Accepting an arbitrary minute inside the window would let one booking
    // straddle two offered slots and silently block both.
    const windowStartsMinute = sitting?.startsMinute ?? rule.startsMinute;
    if ((localMinuteOfDay(startsAt, rule.branch.timezone) - windowStartsMinute) % duration !== 0) throw new WonFlowApiError(409, "booking-slot-unavailable", "That appointment time is no longer offered. Choose another time.");
    const reserved = await transaction.appointment.count({ where: { tenantId: context.tenantId, branchId: rule.branchId, doctorId: rule.doctorId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
    if (reserved >= rule.capacity) throw new WonFlowApiError(409, "booking-slot-taken", "That appointment time was just taken. Choose another time.");
    const requiresPrepayment = mode === "ONLINE" && service.requiresPrepayment;
    const appointment = await transaction.appointment.create({ data: { tenantId: context.tenantId, patientId: patient.id, doctorId: rule.doctorId, branchId: rule.branchId, serviceId: service.id, consultationMode: mode, paymentStatus: requiresPrepayment ? "AWAITING_PAYMENT" : "NOT_REQUIRED", status: "CONFIRMED", source: "PATIENT_PORTAL", reason: reason || null, startsAt, endsAt, idempotencyKey: input.idempotencyKey } });
    const isUuid = (val?: string | null): val is string => typeof val === "string" && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
    await transaction.idempotencyRecord.create({ data: { tenantId: context.tenantId, key: input.idempotencyKey, operation: "patient.appointment.book", responsePayload: { appointmentId: appointment.id }, expiresAt: new Date(Date.now() + 86_400_000) } });
    await transaction.notification.create({ data: { tenantId: context.tenantId, identityId: context.identityId, patientId: patient.id, channel: "IN_APP", status: "PENDING", templateCode: "appointment-confirmed", payload: { appointmentId: appointment.id, startsAt: appointment.startsAt.toISOString(), branchId: appointment.branchId } } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: rule.branchId, actorMembershipId: isUuid(context.membershipId) ? context.membershipId : null, sessionId: isUuid(context.sessionId) ? context.sessionId : null, requestId: context.requestId, action: "patient.appointment.booked", entityType: "appointment", entityId: appointment.id, severity: "INFORMATION", sourceApplication: context.sourceApplication } });
    return appointment;
  }, { isolationLevel: "Serializable" });
}

export async function getMyActiveCarePlan(requestContext: WonFlowRequestContext) {
  const { context, patient, access } = await resolvePatient(requestContext);

  const carePlan = await database.carePlan.findFirst({
    where: {
      tenantId: context.tenantId,
      patientId: patient.id,
      status: "ACTIVE",
    },
    include: {
      template: true,
      managingDoctor: {
        include: {
          staffProfile: {
            include: {
              membership: true,
            },
          },
        },
      },
      tasks: {
        orderBy: [{ scheduledFor: "asc" }, { dayNumber: "asc" }],
      },
      alerts: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!carePlan) {
    return {
      carePlan: null,
      patient: {
        id: patient.id,
        name: `${patient.givenName} ${patient.familyName}`,
      },
      isCaregiver: access.relationship !== "self",
      relationship: access.relationship,
    };
  }

  const doctorName =
    carePlan.managingDoctor?.staffProfile?.membership?.displayName || "Care Team Clinician";

  return {
    carePlan: {
      id: carePlan.id,
      tenantId: carePlan.tenantId,
      patientId: carePlan.patientId,
      templateId: carePlan.templateId,
      category: carePlan.category,
      title: carePlan.title,
      status: carePlan.status,
      startDate: carePlan.startDate.toISOString(),
      endDate: carePlan.endDate?.toISOString() ?? null,
      currentStage: carePlan.currentStage,
      managingDoctorName: doctorName,
      stages: carePlan.template?.stages || [],
      tasks: carePlan.tasks.map((t) => ({
        id: t.id,
        tenantId: t.tenantId,
        carePlanId: t.carePlanId,
        taskType: t.taskType,
        stageNumber: t.stageNumber,
        dayNumber: t.dayNumber,
        scheduledFor: t.scheduledFor.toISOString(),
        dueBy: t.dueBy?.toISOString() ?? null,
        title: t.title,
        instructions: t.instructions,
        requiredSource: t.requiredSource,
        status: t.status,
        completedAt: t.completedAt?.toISOString() ?? null,
        completedByIdentityId: t.completedByIdentityId,
        resultData: t.resultData,
        skipReason: t.skipReason,
        createdAt: t.createdAt.toISOString(),
      })),
      alerts: carePlan.alerts.map((a) => ({
        id: a.id,
        tenantId: a.tenantId,
        carePlanId: a.carePlanId,
        patientId: a.patientId,
        severity: a.severity,
        status: a.status,
        title: a.title,
        message: a.message,
        createdAt: a.createdAt.toISOString(),
      })),
    },
    patient: {
      id: patient.id,
      name: `${patient.givenName} ${patient.familyName}`,
    },
    isCaregiver: access.relationship !== "self",
    relationship: access.relationship,
  };
}
