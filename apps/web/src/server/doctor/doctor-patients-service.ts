import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import { WonFlowApiError } from "@/server/http/route-handler";

/**
 * Every patient this doctor has a real appointment with — the doctor's "My
 * Patients" list, previously an entirely local/demo data source that never
 * reflected a real registration, appointment or diagnosis. referralSource is
 * surfaced here so the doctor can see how each patient reached the hospital
 * (website, reception walk-in, their own referral), tagged consistently at
 * registration time across all three intake paths.
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

export async function listMyConnectedPatients(requestContext: WonFlowRequestContext) {
  const { context, doctor } = await resolveDoctor(requestContext);

  const appointments = await database.appointment.findMany({
    where: { tenantId: context.tenantId, doctorId: doctor.id },
    select: { id: true, patientId: true, status: true, startsAt: true, endsAt: true, service: { select: { name: true } } },
    orderBy: { startsAt: "desc" },
  });

  const patientIds = [...new Set(appointments.map((appointment) => appointment.patientId))];
  if (patientIds.length === 0) return { patients: [] };

  const [patients, encounters, unreadCounts] = await Promise.all([
    database.patient.findMany({
      where: { id: { in: patientIds }, tenantId: context.tenantId },
      include: { identifiers: { where: { isPrimary: true }, take: 1 } },
    }),
    database.encounter.findMany({
      where: { tenantId: context.tenantId, doctorId: doctor.id, patientId: { in: patientIds } },
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

      return {
        id: patient.id,
        displayName: `${patient.givenName} ${patient.familyName}`.trim(),
        mrNumber: patient.patientNumber,
        identityNumber: patient.identifiers[0]?.value ?? "",
        mobileNumber: patient.phone ?? "",
        gender: patient.sex ?? "unknown",
        age: calculateAge(patient.dateOfBirth),
        referralSource: readReferralSource(patient.consentData),
        lastActivityAt: past[0]?.startsAt.toISOString(),
        lastDiagnosis: lastDiagnosis ?? null,
        nextAppointment: upcoming[0] ? { appointmentDate: upcoming[0].startsAt.toISOString().slice(0, 10), slotStart: upcoming[0].startsAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }), serviceName: upcoming[0].service?.name ?? "Consultation" } : undefined,
        encounterCount: patientEncounters.length,
        unreadReports: unreadByPatient.get(patient.id) ?? 0,
      };
    }),
  };
}
