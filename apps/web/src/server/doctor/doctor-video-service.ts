import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import { WonFlowApiError } from "@/server/http/route-handler";

async function resolveDoctor(requestContext: WonFlowRequestContext) {
  const context = requireTenantContext(requestContext);
  if (!context.membershipId) {
    throw new WonFlowApiError(403, "doctor-membership-required", "A doctor membership is required.");
  }
  const doctor = await database.doctorProfile.findFirst({
    where: {
      tenantId: context.tenantId,
      staffProfile: {
        membershipId: context.membershipId,
        status: "ACTIVE",
        membership: { organizationId: context.organizationId, archivedAt: null },
      },
    },
    include: {
      staffProfile: { include: { membership: true } },
    },
  });
  if (!doctor) {
    throw new WonFlowApiError(403, "doctor-profile-required", "A valid doctor profile is required.");
  }
  return { context, doctor };
}

function calculateAge(dateOfBirth: Date | null): number | undefined {
  if (!dateOfBirth) return undefined;
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) age -= 1;
  return age;
}

export interface VideoAppointmentSummary {
  id: string;
  patientId: string;
  patientName: string;
  patientNumber: string;
  patientPhone: string;
  patientGender: string;
  patientAge?: number;
  patientBloodGroup?: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  reason: string;
  isLiveNow: boolean;
  canJoin: boolean;
  startsInMinutes: number;
  sessionStatus?: "ACTIVE" | "ENDED" | "WAITING";
}

export async function listDoctorVideoConsultations(requestContext: WonFlowRequestContext) {
  const { context, doctor } = await resolveDoctor(requestContext);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Fetch online appointments or appointments with active video sessions
  const appointments = await database.appointment.findMany({
    where: {
      tenantId: context.tenantId,
      doctorId: doctor.id,
      OR: [
        { consultationMode: "ONLINE" },
        { videoCallSession: { isNot: null } },
      ],
      startsAt: { gte: new Date(todayStart.getTime() - 24 * 60 * 60 * 1000) }, // from yesterday forward
    },
    include: {
      patient: {
        include: { identifiers: { where: { isPrimary: true }, take: 1 } },
      },
      service: { select: { id: true, name: true, durationMinutes: true } },
      videoCallSession: true,
    },
    orderBy: { startsAt: "asc" },
  });

  const calls: VideoAppointmentSummary[] = appointments.map((apt) => {
    const startsAtDate = new Date(apt.startsAt);
    const endsAtDate = new Date(apt.endsAt);
    const diffMs = startsAtDate.getTime() - now.getTime();
    const startsInMinutes = Math.round(diffMs / 60000);

    // Call window is 15 minutes before startsAt until 60 minutes after endsAt
    const windowStart = new Date(startsAtDate.getTime() - 15 * 60000);
    const windowEnd = new Date(endsAtDate.getTime() + 60 * 60000);
    const isLiveNow = now >= windowStart && now <= windowEnd && apt.status !== "CANCELLED";
    const canJoin = isLiveNow || apt.videoCallSession?.status === "ACTIVE";

    const consent = (apt.patient.consentData as Record<string, unknown>) || {};

    let sessionStatus: "ACTIVE" | "ENDED" | "WAITING" = "WAITING";
    if (apt.videoCallSession?.status === "ACTIVE") sessionStatus = "ACTIVE";
    else if (apt.videoCallSession?.status === "ENDED") sessionStatus = "ENDED";

    return {
      id: apt.id,
      patientId: apt.patient.id,
      patientName: `${apt.patient.givenName} ${apt.patient.familyName}`.trim(),
      patientNumber: apt.patient.patientNumber,
      patientPhone: apt.patient.phone ?? "",
      patientGender: apt.patient.sex ?? "unknown",
      patientAge: calculateAge(apt.patient.dateOfBirth),
      patientBloodGroup: typeof consent.bloodGroup === "string" ? consent.bloodGroup : undefined,
      serviceName: apt.service?.name ?? "Online Video Consultation",
      startsAt: apt.startsAt.toISOString(),
      endsAt: apt.endsAt.toISOString(),
      status: apt.status,
      reason: apt.reason ?? "Online Consultation",
      isLiveNow,
      canJoin,
      startsInMinutes,
      sessionStatus,
    };
  });

  // Active call requiring attention
  const liveCall = calls.find((c) => c.isLiveNow && c.status !== "COMPLETED");
  const upcomingToday = calls.filter((c) => {
    const s = new Date(c.startsAt);
    return s >= todayStart && s <= todayEnd && !c.isLiveNow && c.status !== "COMPLETED";
  });

  return {
    calls,
    liveCall,
    upcomingToday,
    doctorName: doctor.staffProfile.membership.displayName,
    totalOnlineToday: calls.filter((c) => {
      const s = new Date(c.startsAt);
      return s >= todayStart && s <= todayEnd;
    }).length,
  };
}

export async function createInstantDoctorVideoCall(
  requestContext: WonFlowRequestContext,
  input: { patientId: string; reason?: string },
) {
  const { context, doctor } = await resolveDoctor(requestContext);

  const patient = await database.patient.findFirst({
    where: { id: input.patientId, tenantId: context.tenantId, archivedAt: null },
  });
  if (!patient) {
    throw new WonFlowApiError(404, "patient-not-found", "Patient record could not be found.");
  }

  const now = new Date();
  const startsAt = new Date(now.getTime() - 2 * 60000); // 2 minutes ago to make joinable immediately
  const endsAt = new Date(now.getTime() + 30 * 60000);
  const expiresAt = new Date(now.getTime() + 4 * 60 * 60000); // 4 hours retention

  // Find or create online consultation service
  let service = await database.serviceDefinition.findFirst({
    where: { tenantId: context.tenantId, category: "CONSULTATION", consultationModes: { has: "ONLINE" } },
  });

  if (!service) {
    service = await database.serviceDefinition.findFirst({
      where: { tenantId: context.tenantId, category: "CONSULTATION" },
    });
  }

  const branch = await database.branch.findFirst({
    where: { tenantId: context.tenantId, archivedAt: null },
  });
  const branchId = branch?.id ?? doctor.staffProfile.branchId;
  if (!branchId) {
    throw new WonFlowApiError(400, "branch-required", "A valid branch is required.");
  }

  const appointment = await database.appointment.create({
    data: {
      tenantId: context.tenantId,
      patientId: patient.id,
      doctorId: doctor.id,
      branchId,
      serviceId: service?.id ?? null,
      consultationMode: "ONLINE",
      status: "CONFIRMED",
      paymentStatus: "NOT_REQUIRED",
      source: "DOCTOR_VIDEO_ROOM",
      reason: input.reason?.trim() || "Instant Video Consultation",
      startsAt,
      endsAt,
      idempotencyKey: `instant-video-${patient.id}-${Date.now()}`,
    },
  });

  // Ensure VideoCallSession exists with required expiresAt
  await database.videoCallSession.upsert({
    where: { appointmentId: appointment.id },
    create: {
      tenantId: context.tenantId,
      appointmentId: appointment.id,
      status: "ACTIVE",
      startedAt: now,
      expiresAt,
    },
    update: {
      status: "ACTIVE",
      startedAt: now,
      expiresAt,
    },
  });

  return {
    appointmentId: appointment.id,
    patientName: `${patient.givenName} ${patient.familyName}`.trim(),
    videoUrl: `/doctor/appointments/${appointment.id}/video`,
  };
}

export interface SaveVideoChartInput {
  appointmentId: string;
  chiefComplaints?: string;
  vitals?: {
    bloodPressure?: string;
    pulse?: string;
    temperature?: string;
    oxygenSaturation?: string;
    bloodSugar?: string;
    weightKg?: string;
  };
  primaryDiagnosis?: string;
  clinicalNotes?: string;
  prescriptions?: Array<{
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  diagnosticOrders?: string[];
  followUpPlan?: string;
}

export async function saveVideoConsultationChart(
  requestContext: WonFlowRequestContext,
  input: SaveVideoChartInput,
) {
  const { context, doctor } = await resolveDoctor(requestContext);

  const appointment = await database.appointment.findFirst({
    where: { id: input.appointmentId, tenantId: context.tenantId },
    include: { patient: true },
  });
  if (!appointment) {
    throw new WonFlowApiError(404, "appointment-not-found", "Appointment was not found.");
  }

  if (appointment.doctorId && appointment.doctorId !== doctor.id) {
    const treatingDoc = await database.doctorProfile.findFirst({
      where: { id: appointment.doctorId, tenantId: context.tenantId },
    });
    if (treatingDoc?.supervisorDoctorId !== doctor.id) {
      throw new WonFlowApiError(403, "forbidden", "You do not have permission to chart this consultation.");
    }
  }

  // Ensure valid branchId
  let resolvedBranchId: string | null = appointment.branchId;
  if (!resolvedBranchId) {
    const branch = await database.branch.findFirst({
      where: { tenantId: context.tenantId, archivedAt: null },
    });
    if (!branch) {
      throw new WonFlowApiError(400, "branch-required", "A hospital branch is required for clinical encounter.");
    }
    resolvedBranchId = branch.id;
  }

  const now = new Date();

  // Find or create Encounter
  let encounter = await database.encounter.findFirst({
    where: { tenantId: context.tenantId, appointmentId: appointment.id },
  });

  if (!encounter) {
    encounter = await database.encounter.create({
      data: {
        tenantId: context.tenantId,
        patientId: appointment.patientId,
        doctorId: doctor.id,
        branchId: resolvedBranchId,
        appointmentId: appointment.id,
        status: "IN_PROGRESS",
        startedAt: now,
        reason: input.chiefComplaints || appointment.reason || "Video Consultation",
      },
    });
  }

  // 1. Save Diagnosis
  if (input.primaryDiagnosis?.trim()) {
    await database.encounterDiagnosis.create({
      data: {
        tenantId: context.tenantId,
        encounterId: encounter.id,
        patientId: appointment.patientId,
        display: input.primaryDiagnosis.trim(),
        codeSystem: "ICD-10",
        code: "UNSPECIFIED",
        recordedByMembershipId: context.membershipId!,
        isPrimary: true,
      },
    });
  }

  // 2. Save Clinical Observations (Vitals)
  if (input.vitals) {
    const vitalsEntries = Object.entries(input.vitals).filter(([, val]) => Boolean(val?.trim()));
    for (const [key, value] of vitalsEntries) {
      if (value) {
        await database.clinicalObservation.create({
          data: {
            tenantId: context.tenantId,
            patientId: appointment.patientId,
            encounterId: encounter.id,
            code: key,
            display: key.replace(/([A-Z])/g, " $1").trim(),
            valueText: String(value),
            observedAt: now,
            status: "FINAL",
          },
        });
      }
    }
  }

  // 3. Save Prescriptions if entered
  if (input.prescriptions && input.prescriptions.length > 0) {
    const validItems = input.prescriptions.filter((p) => p.medicineName.trim());
    if (validItems.length > 0) {
      const rx = await database.prescription.create({
        data: {
          tenantId: context.tenantId,
          patientId: appointment.patientId,
          doctorId: doctor.id,
          encounterId: encounter.id,
          status: "ACTIVE",
          instructions: input.followUpPlan || "Take medications as prescribed.",
        },
      });

      for (const item of validItems) {
        // Find or create Medication
        let medication = await database.medication.findFirst({
          where: { tenantId: context.tenantId, genericName: item.medicineName.trim() },
        });
        if (!medication) {
          medication = await database.medication.create({
            data: {
              tenantId: context.tenantId,
              code: `MED-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
              genericName: item.medicineName.trim(),
              unit: "tablets",
            },
          });
        }

        await database.prescriptionItem.create({
          data: {
            prescriptionId: rx.id,
            medicationId: medication.id,
            dose: item.dosage.trim() || "As directed",
            frequency: item.frequency.trim() || "As directed",
            duration: item.duration?.trim() || null,
            instructions: item.instructions?.trim() || null,
          },
        });
      }
    }
  }

  // 4. Save Clinical Note
  const noteBody = [
    input.chiefComplaints ? `Chief Complaints: ${input.chiefComplaints}` : "",
    input.clinicalNotes ? `Clinical Assessment: ${input.clinicalNotes}` : "",
    input.followUpPlan ? `Follow-up: ${input.followUpPlan}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (noteBody) {
    const isSupervised = Boolean(doctor.requiresCountersignature);
    await database.encounterNote.create({
      data: {
        tenantId: context.tenantId,
        encounterId: encounter.id,
        authorMembershipId: context.membershipId!,
        noteType: "consultation_summary",
        content: { text: noteBody },
        status: isSupervised ? "DRAFT" : "SIGNED",
        signedAt: isSupervised ? null : now,
      },
    });
  }

  // Update encounter to COMPLETED
  await database.encounter.update({
    where: { id: encounter.id },
    data: {
      status: "COMPLETED",
      endedAt: now,
      clinicalData: {
        vitals: input.vitals ?? {},
        diagnosis: input.primaryDiagnosis ?? "",
        summary: noteBody,
      },
    },
  });

  // Mark appointment completed
  await database.appointment.update({
    where: { id: appointment.id },
    data: { status: "COMPLETED" },
  });

  return {
    success: true,
    encounterId: encounter.id,
    patientName: `${appointment.patient.givenName} ${appointment.patient.familyName}`.trim(),
    completedAt: now.toISOString(),
  };
}
