import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";

type ParticipantRole = "PATIENT" | "DOCTOR";
type SignalType = "SDP_OFFER" | "SDP_ANSWER" | "ICE_CANDIDATE";

const JOIN_EARLY_MINUTES = 15;
const JOIN_LATE_MINUTES = 60;
const SIGNAL_RETENTION_MINUTES = 120;

async function resolveParticipant(requestContext: WonFlowRequestContext, appointmentId: string) {
  const context = requireTenantContext(requestContext);
  const appointment = await database.appointment.findFirst({
    where: { id: appointmentId, tenantId: context.tenantId },
    include: {
      patient: true,
      doctor: { include: { staffProfile: { include: { membership: true } } } },
      branch: true,
      service: true,
      videoCallSession: true,
    },
  });
  if (!appointment) throw new WonFlowApiError(404, "appointment-not-found", "The appointment could not be found.");

  let role: ParticipantRole | null = null;
  if (context.workspace === "patient") {
    const access = await database.patientAccess.findFirst({
      where: { patientId: appointment.patientId, identityId: context.identityId, isActive: true },
      select: { id: true },
    });
    if (access) role = "PATIENT";
  } else if (context.workspace === "doctor" && appointment.doctor?.staffProfile.membershipId === context.membershipId) {
    role = "DOCTOR";
  }
  if (!role) throw new WonFlowApiError(403, "video-call-access-denied", "Only the booked patient and assigned doctor can access this video consultation.");
  if (appointment.consultationMode !== "ONLINE") throw new WonFlowApiError(409, "not-online-consultation", "This appointment is not an online consultation.");
  if (["CANCELLED", "NO_SHOW"].includes(appointment.status)) throw new WonFlowApiError(409, "appointment-not-active", "This appointment is no longer active.");
  return { context, appointment, role };
}

/**
 * Minimal authorization for the polling path.
 *
 * `resolveParticipant` joins patient, doctor, staff profile, membership, branch,
 * service and session. Signal polling runs once a second per participant, so it
 * uses this narrower query and keeps the same access rules.
 */
async function resolvePollingParticipant(requestContext: WonFlowRequestContext, appointmentId: string) {
  const context = requireTenantContext(requestContext);
  const appointment = await database.appointment.findFirst({
    where: { id: appointmentId, tenantId: context.tenantId },
    select: {
      patientId: true,
      consultationMode: true,
      status: true,
      doctor: { select: { staffProfile: { select: { membershipId: true } } } },
    },
  });
  if (!appointment) throw new WonFlowApiError(404, "appointment-not-found", "The appointment could not be found.");

  let role: ParticipantRole | null = null;
  if (context.workspace === "patient") {
    const access = await database.patientAccess.findFirst({
      where: { patientId: appointment.patientId, identityId: context.identityId, isActive: true },
      select: { id: true },
    });
    if (access) role = "PATIENT";
  } else if (context.workspace === "doctor" && appointment.doctor?.staffProfile.membershipId === context.membershipId) {
    role = "DOCTOR";
  }
  if (!role) throw new WonFlowApiError(403, "video-call-access-denied", "Only the booked patient and assigned doctor can access this video consultation.");
  if (appointment.consultationMode !== "ONLINE") throw new WonFlowApiError(409, "not-online-consultation", "This appointment is not an online consultation.");
  if (["CANCELLED", "NO_SHOW"].includes(appointment.status)) throw new WonFlowApiError(409, "appointment-not-active", "This appointment is no longer active.");
  return { context, role };
}

function accessWindow(startsAt: Date, endsAt: Date) {
  const opensAt = new Date(startsAt.getTime() - JOIN_EARLY_MINUTES * 60_000);
  const closesAt = new Date(endsAt.getTime() + JOIN_LATE_MINUTES * 60_000);
  const now = new Date();
  return { opensAt, closesAt, canJoin: now >= opensAt && now <= closesAt };
}

function iceServers() {
  const configured = process.env.WONFLOW_WEBRTC_ICE_SERVERS_JSON;
  if (configured) {
    try {
      const parsed = JSON.parse(configured) as RTCIceServer[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      throw new WonFlowApiError(500, "invalid-webrtc-configuration", "The video-call network configuration is invalid.");
    }
  }
  return [{ urls: ["stun:stun.l.google.com:19302"] }];
}

async function audit(input: Awaited<ReturnType<typeof resolveParticipant>>, action: string, entityId: string) {
  await database.auditEvent.create({
    data: {
      tenantId: input.context.tenantId,
      branchId: input.appointment.branchId,
      actorMembershipId: input.context.membershipId,
      sessionId: input.context.sessionId,
      requestId: input.context.requestId,
      action,
      entityType: "video-call-session",
      entityId,
      severity: "INFORMATION",
      sourceApplication: input.context.sourceApplication,
    },
  });
}

export async function getVideoConsultation(requestContext: WonFlowRequestContext, appointmentId: string) {
  const participant = await resolveParticipant(requestContext, appointmentId);
  const window = accessWindow(participant.appointment.startsAt, participant.appointment.endsAt);
  return {
    appointment: {
      id: participant.appointment.id,
      startsAt: participant.appointment.startsAt,
      endsAt: participant.appointment.endsAt,
      status: participant.appointment.status,
      reason: participant.appointment.reason,
      patientName: `${participant.appointment.patient.givenName} ${participant.appointment.patient.familyName}`.trim(),
      doctorName: participant.appointment.doctor?.staffProfile.membership.displayName ?? "Assigned doctor",
      serviceName: participant.appointment.service?.name ?? "Online consultation",
      branchName: participant.appointment.branch.name,
      timezone: participant.appointment.branch.timezone,
    },
    role: participant.role,
    initiator: participant.role === "DOCTOR",
    canJoin: window.canJoin,
    opensAt: window.opensAt,
    closesAt: window.closesAt,
    session: participant.appointment.videoCallSession,
    iceServers: iceServers(),
  };
}

export async function joinVideoConsultation(requestContext: WonFlowRequestContext, appointmentId: string) {
  const participant = await resolveParticipant(requestContext, appointmentId);
  const window = accessWindow(participant.appointment.startsAt, participant.appointment.endsAt);
  if (!window.canJoin) throw new WonFlowApiError(409, "video-call-outside-window", `The call room opens ${JOIN_EARLY_MINUTES} minutes before the appointment.`);
  const now = new Date();
  const reopening = participant.appointment.videoCallSession?.status === "ENDED";
  const session = await database.videoCallSession.upsert({
    where: { appointmentId },
    create: {
      tenantId: participant.context.tenantId,
      appointmentId,
      expiresAt: new Date(participant.appointment.endsAt.getTime() + SIGNAL_RETENTION_MINUTES * 60_000),
      ...(participant.role === "PATIENT" ? { patientJoinedAt: now } : { doctorJoinedAt: now }),
    },
    update: {
      status: reopening ? "WAITING" : undefined,
      endedAt: null,
      patientJoinedAt: participant.role === "PATIENT" ? now : reopening ? null : undefined,
      doctorJoinedAt: participant.role === "DOCTOR" ? now : reopening ? null : undefined,
    },
  });
  if (participant.role === "DOCTOR") await database.videoCallSignal.deleteMany({ where: { sessionId: session.id } });
  const active = session.patientJoinedAt && session.doctorJoinedAt
    ? await database.videoCallSession.update({ where: { id: session.id }, data: { status: "ACTIVE", startedAt: session.startedAt ?? now } })
    : session;
  await audit(participant, `video-consultation.${participant.role.toLowerCase()}.joined`, active.id);
  return active;
}

export async function sendVideoSignal(requestContext: WonFlowRequestContext, appointmentId: string, input: { type: SignalType; payload: unknown }) {
  const participant = await resolveParticipant(requestContext, appointmentId);
  const window = accessWindow(participant.appointment.startsAt, participant.appointment.endsAt);
  if (!window.canJoin) throw new WonFlowApiError(409, "video-call-outside-window", "The video consultation is not currently open.");
  if (!(["SDP_OFFER", "SDP_ANSWER", "ICE_CANDIDATE"] as string[]).includes(input.type)) throw new WonFlowApiError(400, "invalid-video-signal", "The call signal type is invalid.");
  const serialized = JSON.stringify(input.payload);
  if (serialized.length > 65_536) throw new WonFlowApiError(413, "video-signal-too-large", "The call signal is too large.");
  const session = await database.videoCallSession.findUnique({ where: { appointmentId } });
  if (!session || session.status === "ENDED") throw new WonFlowApiError(409, "video-call-not-joined", "Join the call before sending media signals.");
  return database.videoCallSignal.create({
    data: {
      sessionId: session.id,
      senderRole: participant.role,
      signalType: input.type,
      payload: JSON.parse(serialized),
      expiresAt: new Date(Date.now() + SIGNAL_RETENTION_MINUTES * 60_000),
    },
  });
}

export async function listVideoSignals(requestContext: WonFlowRequestContext, appointmentId: string, after?: string) {
  const participant = await resolvePollingParticipant(requestContext, appointmentId);
  const session = await database.videoCallSession.findUnique({ where: { appointmentId }, select: { id: true } });
  if (!session) return [];
  const afterDate = after ? new Date(after) : new Date(Date.now() - 5 * 60_000);
  if (Number.isNaN(afterDate.getTime())) throw new WonFlowApiError(400, "invalid-signal-cursor", "The call cursor is invalid.");

  /**
   * Sweep only this session's expired signals. This runs on every poll — once
   * per second per participant — so it must stay bounded by the
   * `sessionId` index. Tenant-wide retention cleanup belongs in the worker,
   * not on the hot signalling path.
   */
  await database.videoCallSignal.deleteMany({ where: { sessionId: session.id, expiresAt: { lt: new Date() } } });

  return database.videoCallSignal.findMany({
    where: { sessionId: session.id, senderRole: { not: participant.role }, createdAt: { gt: afterDate } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export async function endVideoConsultation(requestContext: WonFlowRequestContext, appointmentId: string) {
  const participant = await resolveParticipant(requestContext, appointmentId);
  const session = await database.videoCallSession.findUnique({ where: { appointmentId } });
  if (!session) return null;
  const ended = await database.$transaction(async (transaction) => {
    const result = await transaction.videoCallSession.update({ where: { id: session.id }, data: { status: "ENDED", endedAt: new Date() } });
    await transaction.videoCallSignal.create({ data: { sessionId: session.id, senderRole: participant.role, signalType: "CALL_ENDED", payload: {}, expiresAt: new Date(Date.now() + SIGNAL_RETENTION_MINUTES * 60_000) } });
    return result;
  });
  await audit(participant, `video-consultation.${participant.role.toLowerCase()}.ended`, ended.id);
  return ended;
}
