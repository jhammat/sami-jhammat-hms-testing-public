import{database}from"@wonflow/database";const interval=Number(process.env.WORKER_POLL_INTERVAL_MS??5000);async function poll(){const events=await database.outboxEvent.findMany({where:{status:"PENDING",availableAt:{lte:new Date()}},orderBy:{createdAt:"asc"},take:25});for(const event of events){const claimed=await database.outboxEvent.updateMany({where:{id:event.id,status:"PENDING"},data:{status:"PROCESSING",attempts:{increment:1}}});if(!claimed.count)continue;try{console.log("Processing outbox event",{id:event.id,type:event.type});await database.outboxEvent.update({where:{id:event.id},data:{status:"COMPLETED",processedAt:new Date(),lastError:null}})}catch(error){await database.outboxEvent.update({where:{id:event.id},data:{status:event.attempts>=4?"DEAD_LETTER":"FAILED",lastError:error instanceof Error?error.message:"Unknown worker error",availableAt:new Date(Date.now()+60000)}})}}}

/**
 * Retention sweep for video consultation signalling.
 *
 * WebRTC offers, answers and ICE candidates are short-lived connection data.
 * The request path only clears the session it is polling, so tenant-wide
 * cleanup runs here rather than on the per-second signalling hot path.
 */
const retentionInterval=Number(process.env.WORKER_RETENTION_INTERVAL_MS??300_000);
async function sweepVideoConsultations(){const now=new Date();try{const signals=await database.videoCallSignal.deleteMany({where:{expiresAt:{lt:now}}});const sessions=await database.videoCallSession.updateMany({where:{status:{not:"ENDED"},expiresAt:{lt:now}},data:{status:"ENDED",endedAt:now}});if(signals.count||sessions.count)console.log("Video consultation sweep",{expiredSignals:signals.count,closedSessions:sessions.count})}catch(error){console.error("Video consultation sweep failed",error instanceof Error?error.message:error)}}

/**
 * Periodic sweep for expired clinical referrals.
 *
 * Referrals past their validUntil timestamp transition to EXPIRED,
 * revoking allied health access to the referred patient.
 */
const referralSweepInterval = Number(process.env.WORKER_REFERRAL_SWEEP_INTERVAL_MS ?? 60_000);
async function sweepExpiredReferrals() {
  const now = new Date();
  try {
    const expired = await database.clinicalReferral.findMany({
      where: {
        status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
        validUntil: { lt: now },
      },
      select: {
        id: true,
        tenantId: true,
        patientId: true,
        specialty: true,
      },
    });

    if (expired.length === 0) return;

    for (const ref of expired) {
      await database.$transaction(async (tx) => {
        await tx.clinicalReferral.update({
          where: { id: ref.id },
          data: { status: "EXPIRED" },
        });
        await tx.auditEvent.create({
          data: {
            tenantId: ref.tenantId,
            requestId: `worker-sweep-${Date.now()}`,
            action: "clinical.referral.expired",
            entityType: "clinical-referral",
            entityId: ref.id,
            severity: "INFORMATION",
            sourceApplication: "worker",
            metadata: {
              patientId: ref.patientId,
              specialty: ref.specialty,
            },
          },
        });
      });
    }
    console.log("Expired referrals sweep completed", { expiredCount: expired.length });
  } catch (error) {
    console.error("Expired referrals sweep failed", error instanceof Error ? error.message : error);
  }
}

console.log("WonFlow worker started");
setInterval(()=>void poll(),interval);void poll();
setInterval(()=>void sweepVideoConsultations(),retentionInterval);void sweepVideoConsultations();
setInterval(()=>void sweepExpiredReferrals(),referralSweepInterval);void sweepExpiredReferrals();
