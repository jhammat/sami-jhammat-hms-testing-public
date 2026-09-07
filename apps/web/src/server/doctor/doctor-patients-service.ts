import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import { WonFlowApiError } from "@/server/http/route-handler";

/**
 * Lists all active patients for the hospital tenant, enriched with this doctor's
 * and hospital's appointments, encounters, active diagnoses, and unread lab/radiology
 * results. Surfacing all registered hospital patients ensures doctors can easily view,
 * track, and manage their full caseload and newly registered patients immediately.
 */

async function resolveDoctor(requestContext: WonFlowRequestContext) {
  const context = requireTenantContext(requestContext);
  if (!context.membershipId) throw new WonFlowApiError(403, "doctor-membership-required", "A doctor membership is required.");
  const doctor = await database.doctorProfile.findFirst({
    where: { tenantId: context.tenantId, staffProfile: { membershipId: context.membershipId, status: "ACTIVE", membership: { organizationId: context.organizationId, archivedAt: null } } },
  });
  if (!doctor) throw new WonFlowApiError(403, "doctor-profile-required", "A valid doctor profile is required.");
  return { context, doctor };
}

function readReferralSource(consentData: unknown): string | undefined {
  if (typeof consentData !== "object" || consentData === null) return undefined;
  const value = (consentData as Record<string, unknown>).referralSource;
  return typeof value === "string" && value.trim() ? value : undefined;
}

function calculateAge(dateOfBirth: Date | null): number | undefined {
  if (!dateOfBirth) return undefined;
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) age -= 1;
  return age;
}

export async function listMyConnectedPatients(
  requestContext: WonFlowRequestContext,
  options: { search?: string } = {},
) {
  const { context, doctor } = await resolveDoctor(requestContext);

  /*
   * "My Patients" now means this doctor's patients.
   *
   * This screen used to return every active patient in the tenant, capped at
   * 300 — the name, phone, identifier, address, blood group, guardian and
   * emergency contact of every person the hospital had ever registered, to
   * every doctor who opened the page. In a multi-consultant hospital that is
   * other clinicians' patients, and the enrichment below then pulled every
   * appointment and encounter belonging to all of them.
   *
   * The default is the caller's own caseload: anyone they have an appointment
   * or an encounter with. Nobody becomes unreachable — a search term looks
   * across the hospital directory as before, which is the deliberate act of
   * looking someone up rather than the passive act of opening a page, and is
   * recorded as one.
   */
  const search = options.search?.trim() ?? "";
  const isDirectorySearch = search.length >= 2;

  const patients = await database.patient.findMany({
    where: {
      tenantId: context.tenantId,
      archivedAt: null,
      ...(isDirectorySearch
        ? {
            OR: [
              { givenName: { contains: search, mode: "insensitive" } },
              { familyName: { contains: search, mode: "insensitive" } },
              { patientNumber: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { identifiers: { some: { normalizedValue: { contains: search.toLowerCase() } } } },
            ],
          }
        : {
            OR: [
              { appointments: { some: { doctorId: doctor.id } } },
              { encounters: { some: { doctorId: doctor.id } } },
            ],
          }),
    },
    include: { identifiers: { where: { isPrimary: true }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  if (isDirectorySearch) {
    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        actorMembershipId: context.membershipId,
        sessionId: context.sessionId,
        requestId: context.requestId,
        action: "patient.directory.searched",
        entityType: "patient",
        entityId: null,
        severity: "INFORMATION",
        reason: `Doctor searched the patient directory for "${search}" (${patients.length} match(es)).`,
        sourceApplication: context.sourceApplication,
      },
    }).catch(() => { /* a logging failure must not break the search */ });
  }

  if (patients.length === 0) return { patients: [] };

  const patientIds = patients.map((patient) => patient.id);

  const [appointments, encounters, unreadCounts] = await Promise.all([
    database.appointment.findMany({
      where: { tenantId: context.tenantId, patientId: { in: patientIds } },
      select: { id: true, patientId: true, doctorId: true, status: true, startsAt: true, endsAt: true, service: { select: { name: true } } },
      orderBy: { startsAt: "desc" },
    }),
    database.encounter.findMany({
      where: { tenantId: context.tenantId, patientId: { in: patientIds } },
      include: { diagnoses: { where: { isPrimary: true }, take: 1, orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    }),
    database.diagnosticResult.groupBy({
      by: ["orderId"],
      where: { order: { tenantId: context.tenantId, patientId: { in: patientIds } }, status: { in: ["FINAL", "AMENDED", "CORRECTED"] }, acknowledgedAt: null },
      _count: true,
    }),
  ]);

  const ordersForUnread = unreadCounts.length
    ? await database.diagnosticOrder.findMany({ where: { id: { in: unreadCounts.map((row) => row.orderId) } }, select: { id: true, patientId: true } })
    : [];
  const unreadByPatient = new Map<string, number>();
  for (const order of ordersForUnread) unreadByPatient.set(order.patientId, (unreadByPatient.get(order.patientId) ?? 0) + 1);

  const now = new Date();
  const appointmentsByPatient = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const list = appointmentsByPatient.get(appointment.patientId) ?? [];
    list.push(appointment);
    appointmentsByPatient.set(appointment.patientId, list);
  }

  const encountersByPatient = new Map<string, typeof encounters>();
  for (const encounter of encounters) {
    const list = encountersByPatient.get(encounter.patientId) ?? [];
    list.push(encounter);
    encountersByPatient.set(encounter.patientId, list);
  }

  return {
    patients: patients.map((patient) => {
      const patientAppointments = appointmentsByPatient.get(patient.id) ?? [];
      const past = patientAppointments.filter((appointment) => appointment.startsAt <= now).sort((left, right) => right.startsAt.getTime() - left.startsAt.getTime());
      const upcoming = patientAppointments.filter((appointment) => appointment.startsAt > now && appointment.status !== "CANCELLED").sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
      const patientEncounters = encountersByPatient.get(patient.id) ?? [];
      const lastDiagnosis = patientEncounters.find((encounter) => encounter.diagnoses.length > 0)?.diagnoses[0]?.display;

      const guardian = (patient.guardianData as Record<string, unknown>) || {};
      const consent = (patient.consentData as Record<string, unknown>) || {};
      const address = (patient.address as Record<string, unknown>) || {};

      return {
        id: patient.id,
        displayName: `${patient.givenName} ${patient.familyName}`.trim(),
        mrNumber: patient.patientNumber,
        identityNumber: patient.identifiers[0]?.value ?? "",
        mobileNumber: patient.phone ?? "",
        email: patient.email ?? undefined,
        gender: patient.sex ?? "unknown",
        age: calculateAge(patient.dateOfBirth),
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : undefined,
        fatherName: typeof guardian.fatherName === "string" ? guardian.fatherName : undefined,
        emergencyContactName: typeof guardian.emergencyContactName === "string" ? guardian.emergencyContactName : undefined,
        emergencyContactPhone: typeof guardian.emergencyContactPhone === "string" ? guardian.emergencyContactPhone : undefined,
        city: typeof address.city === "string" ? address.city : undefined,
        addressLine: typeof address.text === "string" ? address.text : undefined,
        bloodGroup: typeof consent.bloodGroup === "string" ? consent.bloodGroup : undefined,
        notes: typeof consent.notes === "string" ? consent.notes : undefined,
        referralSource: readReferralSource(patient.consentData),
        lastActivityAt: past[0]?.startsAt.toISOString() ?? patientEncounters[0]?.createdAt.toISOString() ?? patient.createdAt.toISOString(),
        lastDiagnosis: lastDiagnosis ?? null,
        nextAppointment: upcoming[0] ? { id: upcoming[0].id, appointmentDate: upcoming[0].startsAt.toISOString().slice(0, 10), slotStart: upcoming[0].startsAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }), serviceName: upcoming[0].service?.name ?? "Consultation" } : undefined,
        encounterCount: patientEncounters.length,
        unreadReports: unreadByPatient.get(patient.id) ?? 0,
      };
    }),
  };
}

export async function deleteDoctorConnectedPatient(
  requestContext: WonFlowRequestContext,
  patientId: string,
) {
  const { context } = await resolveDoctor(requestContext);
  const patient = await database.patient.findFirst({
    where: { id: patientId, tenantId: context.tenantId, archivedAt: null },
  });
  if (!patient) {
    throw new WonFlowApiError(404, "patient-not-found", "Patient could not be found.");
  }
  const now = new Date();
  await database.patient.update({
    where: { id: patient.id },
    data: {
      status: "ARCHIVED",
      archivedAt: now,
    },
  });
  return { success: true, patientId };
}
