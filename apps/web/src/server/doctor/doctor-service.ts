import{database}from"@wonflow/database";import{requireBranchId,requirePermission,requireTenantContext}from"@wonflow/contracts";import type{WonFlowRequestContext}from"@wonflow/contracts";import{WonFlowApiError}from"@/server/http/route-handler";import{checkStartConsultationReadiness}from"@/server/readiness/readiness-service";import{dayFilterIn}from"@/server/time/business-day";import{findAllergyConflicts,describeAllergyConflicts}from"@/server/clinical/allergy-check";
/** Postgres SQLSTATE 40001 — a SERIALIZABLE transaction lost a write race and must be treated as "someone else won," not a server error. Prisma sometimes wraps this as P2034 and sometimes lets the driver adapter's own error through with the code nested under `cause`, so both shapes are checked. */
function isSerializationFailure(error:unknown):boolean{if(!(error instanceof Error))return false;const code=(error as{code?:unknown}).code;if(code==="P2034")return true;const cause=(error as{cause?:{originalCode?:unknown;kind?:unknown}}).cause;return cause?.originalCode==="40001"||cause?.kind==="TransactionWriteConflict";}
const isUniqueConstraintError=(caught:unknown)=>typeof caught==="object"&&caught!==null&&(caught as{code?:string}).code==="P2002";
export class DoctorService{private async resolveDoctor(rc:WonFlowRequestContext){const context=requireTenantContext(rc);if(!context.membershipId)throw new WonFlowApiError(403,"doctor-membership-required","A doctor membership is required.");const doctor=await database.doctorProfile.findFirst({where:{tenantId:context.tenantId,staffProfile:{membershipId:context.membershipId,status:"ACTIVE"}}});if(!doctor)throw new WonFlowApiError(403,"doctor-profile-required","A valid doctor profile is required.");return{context,doctor};}
async getDashboard(rc:WonFlowRequestContext,date:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"appointments.read");const appointments=await database.appointment.findMany({where:{tenantId:c.tenantId,branchId:requireBranchId(c),doctorId:doctor.id,startsAt:dayFilterIn(date,c.timezone)},include:{patient:true,queueEntry:true,service:true,encounter:true},orderBy:{startsAt:"asc"}});return{doctorId:doctor.id,appointments,metrics:{appointments:appointments.length,waiting:appointments.filter(a=>a.queueEntry?.status==="WAITING").length,inProgress:appointments.filter(a=>a.status==="IN_PROGRESS").length,completed:appointments.filter(a=>a.status==="COMPLETED").length}};}
private async getAppointmentDetail(tenantId:string,doctorId:string,appointmentId:string){const appointment=await database.appointment.findFirst({where:{id:appointmentId,tenantId,doctorId},include:{patient:true,queueEntry:true,service:true,encounter:true}});if(!appointment)throw new WonFlowApiError(404,"appointment-not-found","The appointment could not be found.");return appointment;}
/** Calls a waiting patient forward in the doctor's real queue. */
async callQueueEntry(rc:WonFlowRequestContext,appointmentId:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"queues.manage");const appointment=await this.getAppointmentDetail(c.tenantId,doctor.id,appointmentId);if(!appointment.queueEntry)throw new WonFlowApiError(409,"queue-entry-missing","This appointment has not been checked in to a queue.");if(appointment.queueEntry.status!=="WAITING")throw new WonFlowApiError(409,"queue-entry-not-waiting","Only a waiting patient can be called.");await database.queueEntry.update({where:{id:appointment.queueEntry.id},data:{status:"CALLED",calledAt:new Date()}});return this.getAppointmentDetail(c.tenantId,doctor.id,appointmentId);}
/** Returns a called or missed patient to the waiting line. */
async returnQueueEntry(rc:WonFlowRequestContext,appointmentId:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"queues.manage");const appointment=await this.getAppointmentDetail(c.tenantId,doctor.id,appointmentId);if(!appointment.queueEntry)throw new WonFlowApiError(409,"queue-entry-missing","This appointment has not been checked in to a queue.");await database.queueEntry.update({where:{id:appointment.queueEntry.id},data:{status:"WAITING",calledAt:null}});return this.getAppointmentDetail(c.tenantId,doctor.id,appointmentId);}
/** Marks a called patient as missed (no-show at the door). */
async skipQueueEntry(rc:WonFlowRequestContext,appointmentId:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"queues.manage");const appointment=await this.getAppointmentDetail(c.tenantId,doctor.id,appointmentId);if(!appointment.queueEntry)throw new WonFlowApiError(409,"queue-entry-missing","This appointment has not been checked in to a queue.");await database.queueEntry.update({where:{id:appointment.queueEntry.id},data:{status:"MISSED"}});return this.getAppointmentDetail(c.tenantId,doctor.id,appointmentId);}
/** Starts (or resumes) the clinical encounter for a called or waiting patient, opening the consultation. */
async startConsultation(rc:WonFlowRequestContext,appointmentId:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.manage");requirePermission(c,"queues.manage");const appointment=await this.getAppointmentDetail(c.tenantId,doctor.id,appointmentId);const activeElsewhere=await database.appointment.findFirst({where:{tenantId:c.tenantId,doctorId:doctor.id,id:{not:appointmentId},status:"IN_PROGRESS"}});if(activeElsewhere)throw new WonFlowApiError(409,"another-consultation-active","Finish the current consultation before starting another.");const now=new Date();await database.$transaction(async tx=>{if(appointment.encounter&&appointment.encounter.status!=="CANCELLED"){await tx.encounter.update({where:{id:appointment.encounter.id},data:{status:"IN_PROGRESS",doctorId:doctor.id,startedAt:appointment.encounter.startedAt??now}});}else{await tx.encounter.create({data:{tenantId:c.tenantId,patientId:appointment.patientId,appointmentId:appointment.id,doctorId:doctor.id,branchId:appointment.branchId,status:"IN_PROGRESS",reason:appointment.reason,startedAt:now}});}if(appointment.queueEntry){await tx.queueEntry.update({where:{id:appointment.queueEntry.id},data:{status:"IN_SERVICE",calledAt:appointment.queueEntry.calledAt??now,startedAt:now}});}await tx.appointment.update({where:{id:appointment.id},data:{status:"IN_PROGRESS",checkedInAt:appointment.checkedInAt??now}});});return this.getAppointmentDetail(c.tenantId,doctor.id,appointmentId);}
/** Completes the active clinical encounter and closes out the queue entry and appointment. */
async completeConsultation(rc:WonFlowRequestContext,appointmentId:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.manage");const appointment=await this.getAppointmentDetail(c.tenantId,doctor.id,appointmentId);if(!appointment.encounter)throw new WonFlowApiError(409,"encounter-not-found","No clinical encounter has been started for this appointment.");const now=new Date();await database.$transaction(async tx=>{await tx.encounter.update({where:{id:appointment.encounter!.id},data:{status:"COMPLETED",endedAt:now}});if(appointment.queueEntry){await tx.queueEntry.update({where:{id:appointment.queueEntry.id},data:{status:"COMPLETED",completedAt:now}});}await tx.appointment.update({where:{id:appointment.id},data:{status:"COMPLETED"}});});return this.getAppointmentDetail(c.tenantId,doctor.id,appointmentId);}
/** Doctor's open (in progress or paused) and recently closed encounters, for the consultation hub. */
async listMyEncounters(rc:WonFlowRequestContext){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.read");const[open,recent]=await Promise.all([database.encounter.findMany({where:{tenantId:c.tenantId,doctorId:doctor.id,status:{in:["PLANNED","IN_PROGRESS","PAUSED"]}},include:{patient:{select:{givenName:true,familyName:true,patientNumber:true}},appointment:true},orderBy:{startedAt:"asc"}}),database.encounter.findMany({where:{tenantId:c.tenantId,doctorId:doctor.id,status:{in:["COMPLETED","CANCELLED"]}},include:{patient:{select:{givenName:true,familyName:true,patientNumber:true}},appointment:true},orderBy:{updatedAt:"desc"},take:20})]);return{open,recent};}
/**
 * Creates the clinical encounter that starting a consultation actually
 * requires. Validated against start-consultation readiness.
 */
async createEncounter(rc:WonFlowRequestContext,appointmentId:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.manage");requirePermission(c,"queues.manage");const readiness=await checkStartConsultationReadiness(rc,{appointmentId});if(!readiness.ready){const first=readiness.blockers[0]!;throw new WonFlowApiError(409,first.code,first.reason);}
  try{
    return await database.$transaction(async tx=>{
      const appointment=await tx.appointment.findFirst({where:{id:appointmentId,tenantId:c.tenantId,doctorId:doctor.id},include:{queueEntry:true,encounter:true}});
      if(!appointment)throw new WonFlowApiError(404,"appointment-not-found","The appointment could not be found.");
      if(appointment.encounter&&appointment.encounter.status!=="CANCELLED"){
        if(appointment.encounter.status!=="IN_PROGRESS"){
          await tx.encounter.update({where:{id:appointment.encounter.id},data:{status:"IN_PROGRESS"}});
        }
        if(appointment.queueEntry&&appointment.queueEntry.status!=="IN_SERVICE"){
          await tx.queueEntry.update({where:{id:appointment.queueEntry.id},data:{status:"IN_SERVICE"}});
        }
        if(appointment.status!=="IN_PROGRESS"){
          await tx.appointment.update({where:{id:appointment.id},data:{status:"IN_PROGRESS"}});
        }
        return appointment.encounter;
      }
      const activeElsewhere=await tx.encounter.findFirst({where:{tenantId:c.tenantId,doctorId:doctor.id,id:{not:appointment.encounter?.id},status:"IN_PROGRESS"}});
      if(activeElsewhere)throw new WonFlowApiError(409,"another-consultation-active","Finish or pause the current consultation before starting another.");
      const now=new Date();
      const encounter=await tx.encounter.create({data:{tenantId:c.tenantId,patientId:appointment.patientId,appointmentId:appointment.id,doctorId:doctor.id,branchId:appointment.branchId,status:"IN_PROGRESS",reason:appointment.reason,startedAt:now}});
      if(appointment.queueEntry)await tx.queueEntry.update({where:{id:appointment.queueEntry.id},data:{status:"IN_SERVICE",calledAt:appointment.queueEntry.calledAt??now,startedAt:now}});
      await tx.appointment.update({where:{id:appointment.id},data:{status:"IN_PROGRESS",checkedInAt:appointment.checkedInAt??now}});
      await tx.auditEvent.create({data:{tenantId:c.tenantId,branchId:appointment.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"encounter.created",entityType:"encounter",entityId:encounter.id,severity:"INFORMATION",sourceApplication:c.sourceApplication}});
      return encounter;
    },{isolationLevel:"Serializable"});
  }catch(error){
    if(error instanceof WonFlowApiError)throw error;
    if(isSerializationFailure(error))throw new WonFlowApiError(409,"another-consultation-active","Finish or pause the current consultation before starting another.");
    if(isUniqueConstraintError(error)){
      const existing=await database.encounter.findFirst({where:{appointmentId,tenantId:c.tenantId}});
      if(existing)return existing;
    }
    throw error;
  }
}
/** Completes an encounter directly by id — the counterpart to createEncounter, for the consultation hub which works in terms of encounters rather than appointments. */
async completeEncounter(rc:WonFlowRequestContext,encounterId:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.manage");const encounter=await database.encounter.findFirst({where:{id:encounterId,tenantId:c.tenantId,doctorId:doctor.id},include:{appointment:{include:{queueEntry:true}}}});if(!encounter)throw new WonFlowApiError(404,"encounter-not-found","The encounter could not be found.");if(encounter.status!=="IN_PROGRESS"&&encounter.status!=="PAUSED")throw new WonFlowApiError(409,"encounter-not-active","Only an active or paused consultation can be completed.");const now=new Date();return database.$transaction(async tx=>{const updated=await tx.encounter.update({where:{id:encounter.id},data:{status:"COMPLETED",endedAt:now}});if(encounter.appointment?.queueEntry){await tx.queueEntry.update({where:{id:encounter.appointment.queueEntry.id},data:{status:"COMPLETED",completedAt:now}});}if(encounter.appointment){await tx.appointment.update({where:{id:encounter.appointment.id},data:{status:"COMPLETED"}});}await tx.auditEvent.create({data:{tenantId:c.tenantId,branchId:encounter.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"encounter.completed",entityType:"encounter",entityId:encounter.id,severity:"INFORMATION",sourceApplication:c.sourceApplication}});return updated;});}
/** Pauses an in-progress encounter without releasing the patient — the appointment and queue entry stay IN_PROGRESS/IN_SERVICE, so nobody else can be called into the room the doctor stepped out of. */
async pauseEncounter(rc:WonFlowRequestContext,encounterId:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.manage");const encounter=await database.encounter.findFirst({where:{id:encounterId,tenantId:c.tenantId,doctorId:doctor.id}});if(!encounter)throw new WonFlowApiError(404,"encounter-not-found","The encounter could not be found.");if(encounter.status!=="IN_PROGRESS")throw new WonFlowApiError(409,"encounter-not-in-progress","Only a consultation in progress can be paused.");const updated=await database.encounter.update({where:{id:encounter.id},data:{status:"PAUSED"}});await database.auditEvent.create({data:{tenantId:c.tenantId,branchId:encounter.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"encounter.paused",entityType:"encounter",entityId:encounter.id,severity:"INFORMATION",sourceApplication:c.sourceApplication}});return updated;}
/** Resumes a paused encounter. Blocked if another consultation was started in the meantime, same as starting fresh — a doctor can only ever have one open encounter. */
async resumeEncounter(rc:WonFlowRequestContext,encounterId:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.manage");const encounter=await database.encounter.findFirst({where:{id:encounterId,tenantId:c.tenantId,doctorId:doctor.id}});if(!encounter)throw new WonFlowApiError(404,"encounter-not-found","The encounter could not be found.");if(encounter.status!=="PAUSED")throw new WonFlowApiError(409,"encounter-not-paused","Only a paused consultation can be resumed.");const activeElsewhere=await database.encounter.findFirst({where:{tenantId:c.tenantId,doctorId:doctor.id,status:"IN_PROGRESS",id:{not:encounter.id}}});if(activeElsewhere)throw new WonFlowApiError(409,"another-consultation-active","Finish or pause the current consultation before resuming another.");const updated=await database.encounter.update({where:{id:encounter.id},data:{status:"IN_PROGRESS"}});await database.auditEvent.create({data:{tenantId:c.tenantId,branchId:encounter.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"encounter.resumed",entityType:"encounter",entityId:encounter.id,severity:"INFORMATION",sourceApplication:c.sourceApplication}});return updated;}
/** Cancels an encounter with a mandatory reason. When the patient was checked in through a queue, they return to WAITING rather than being dropped; otherwise the appointment itself is marked cancelled/abandoned. */
async cancelEncounter(rc:WonFlowRequestContext,encounterId:string,reason:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.manage");const trimmedReason=reason?.trim();if(!trimmedReason)throw new WonFlowApiError(400,"cancellation-reason-required","A reason is required to cancel a consultation.");const encounter=await database.encounter.findFirst({where:{id:encounterId,tenantId:c.tenantId,doctorId:doctor.id},include:{appointment:{include:{queueEntry:true}}}});if(!encounter)throw new WonFlowApiError(404,"encounter-not-found","The encounter could not be found.");if(encounter.status==="COMPLETED"||encounter.status==="CANCELLED")throw new WonFlowApiError(409,"encounter-not-cancellable","This consultation has already ended and cannot be cancelled.");const now=new Date();return database.$transaction(async tx=>{const updated=await tx.encounter.update({where:{id:encounter.id},data:{status:"CANCELLED",endedAt:now}});if(encounter.appointment?.queueEntry){await tx.queueEntry.update({where:{id:encounter.appointment.queueEntry.id},data:{status:"WAITING",startedAt:null,calledAt:null}});await tx.appointment.update({where:{id:encounter.appointment.id},data:{status:"IN_QUEUE"}});}else if(encounter.appointment){await tx.appointment.update({where:{id:encounter.appointment.id},data:{status:"CANCELLED",cancellationReason:trimmedReason,cancelledAt:now}});}await tx.auditEvent.create({data:{tenantId:c.tenantId,branchId:encounter.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"encounter.cancelled",entityType:"encounter",entityId:encounter.id,severity:"WARNING",reason:trimmedReason,sourceApplication:c.sourceApplication}});return updated;});}
/**
 * Notes waiting for THIS doctor's countersignature.
 *
 * A supervised clinician cannot sign their own note — `signNote` refuses it —
 * so those notes sit as drafts until their assigned supervisor reviews them.
 * Until this method existed there was no way for a supervisor to discover
 * that a note was waiting: the countersignature page was a placeholder that
 * told the signed-in consultant their session was invalid.
 */
async listPendingCountersignatures(rc:WonFlowRequestContext){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.read");
  const notes=await database.encounterNote.findMany({
    where:{
      tenantId:c.tenantId,
      status:"DRAFT",
      // Scoped by supervision, not by branch: a supervisor is responsible for
      // their trainee's notes wherever the trainee saw the patient.
      encounter:{doctor:{requiresCountersignature:true,supervisorDoctorId:doctor.id}},
    },
    include:{
      encounter:{
        include:{
          patient:{select:{id:true,patientNumber:true,givenName:true,familyName:true}},
          doctor:{include:{staffProfile:{include:{membership:{select:{displayName:true}}}}}},
        },
      },
    },
    orderBy:{updatedAt:"asc"},
    take:100,
  });

  return notes.map(note=>({
    id:note.id,
    noteType:note.noteType,
    updatedAt:note.updatedAt.toISOString(),
    createdAt:note.createdAt.toISOString(),
    version:note.version,
    content:note.content,
    encounter:{
      id:note.encounter.id,
      reason:note.encounter.reason,
      startedAt:note.encounter.startedAt?.toISOString()??null,
      status:note.encounter.status,
    },
    patient:note.encounter.patient,
    author:{
      doctorId:note.encounter.doctorId,
      displayName:note.encounter.doctor?.staffProfile?.membership?.displayName??"Supervised clinician",
    },
  }));}
/** A doctor may reach an encounter as its treating clinician, or as the assigned supervisor of that clinician (to review and countersign). */
private async requireEncounterAccess(tenantId:string,doctorId:string,encounterId:string,options?:{requireActive?:boolean}){
  const encounter=await database.encounter.findFirst({where:{id:encounterId,tenantId,OR:[{doctorId},{doctor:{supervisorDoctorId:doctorId}}]}});
  if(!encounter)throw new WonFlowApiError(404,"encounter-not-found","The encounter could not be found.");
  if(options?.requireActive&&encounter.status!=="PLANNED"&&encounter.status!=="IN_PROGRESS"&&encounter.status!=="PAUSED"){
    throw new WonFlowApiError(409,"encounter-not-active",`The consultation is ${encounter.status.toLowerCase().replaceAll("_"," ")} and cannot be modified.`);
  }
  return encounter;
}
async getEncounter(rc:WonFlowRequestContext,id:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.read");const encounter=await database.encounter.findFirst({where:{id,tenantId:c.tenantId,OR:[{doctorId:doctor.id},{doctor:{supervisorDoctorId:doctor.id}}]},include:{patient:{include:{identifiers:true,allergies:{where:{status:"ACTIVE"}},observations:{orderBy:{observedAt:"desc"},take:20}}},notes:{orderBy:{updatedAt:"desc"}},diagnoses:true,diagnosticOrders:{include:{results:true,specimens:true}},prescriptions:{include:{items:{include:{medication:true}}}}}});if(!encounter)throw new WonFlowApiError(404,"encounter-not-found","The encounter could not be found.");
  // Every note view is audited — this response is the only place a clinician reads a note's content.
  await database.auditEvent.create({data:{tenantId:c.tenantId,branchId:encounter.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"encounter.notes.viewed",entityType:"encounter",entityId:encounter.id,severity:"INFORMATION",sourceApplication:c.sourceApplication}});
  return encounter;}
async saveDraft(rc:WonFlowRequestContext,id:string,input:{noteId?:string;noteType?:string;content?:object;bodyText?:string;version?:number}){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.manage");const encounter=await this.requireEncounterAccess(c.tenantId,doctor.id,id);const noteType=input.noteType||"GENERAL_OPD";const content=input.content??{bodyText:input.bodyText||""};
  if(input.noteId){
    const existing=await database.encounterNote.findFirst({where:{id:input.noteId,tenantId:c.tenantId,encounterId:id}});
    if(!existing)throw new WonFlowApiError(404,"note-not-found","The clinical note could not be found.");
    // Signed (or previously amended) notes are immutable: editing one creates a new row that
    // references the original instead of overwriting it, and both stay readable.
    if(existing.status!=="DRAFT"){
      return database.$transaction(async tx=>{
        const amendment=await tx.encounterNote.create({data:{tenantId:c.tenantId,encounterId:id,authorMembershipId:c.membershipId!,noteType,content:{...(content as object),amendsNoteId:existing.id}}});
        if(existing.status==="SIGNED")await tx.encounterNote.update({where:{id:existing.id},data:{status:"AMENDED"}});
        await tx.auditEvent.create({data:{tenantId:c.tenantId,branchId:encounter.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"encounter.note.amended",entityType:"encounter-note",entityId:amendment.id,severity:"INFORMATION",sourceApplication:c.sourceApplication}});
        return amendment;
      });
    }
    if(existing.authorMembershipId!==c.membershipId)throw new WonFlowApiError(403,"not-author","Only the author may edit this draft.");
    if(encounter.status!=="PLANNED"&&encounter.status!=="IN_PROGRESS")throw new WonFlowApiError(404,"encounter-not-editable","The encounter is not available for editing.");
    const result=await database.encounterNote.updateMany({where:{id:input.noteId,tenantId:c.tenantId,encounterId:id,authorMembershipId:c.membershipId!,status:"DRAFT",version:input.version},data:{content:content as object,version:{increment:1}}});
    if(result.count!==1)throw new WonFlowApiError(409,"clinical-draft-conflict","This draft changed in another session. Reload before continuing.");
    return database.encounterNote.findUnique({where:{id:input.noteId}});
  }
  if(encounter.status!=="PLANNED"&&encounter.status!=="IN_PROGRESS")throw new WonFlowApiError(404,"encounter-not-editable","The encounter is not available for editing.");
  return database.encounterNote.create({data:{tenantId:c.tenantId,encounterId:id,authorMembershipId:c.membershipId!,noteType,content:content as object}});}
/** A configured clinician's note can only be signed by their assigned supervisor — never by the author, and never by editing the request to claim a different role. */
async signNote(rc:WonFlowRequestContext,encounterId:string,noteId:string){const{context:c,doctor}=await this.resolveDoctor(rc);requirePermission(c,"encounters.sign");return database.$transaction(async tx=>{
  const note=await tx.encounterNote.findFirst({where:{id:noteId,tenantId:c.tenantId,encounterId,status:"DRAFT"}});
  if(!note)throw new WonFlowApiError(409,"note-not-signable","The clinical note cannot be signed.");
  const isAuthor=note.authorMembershipId===c.membershipId;
  const authorDoctor=await tx.doctorProfile.findFirst({where:{tenantId:c.tenantId,staffProfile:{membershipId:note.authorMembershipId}}});
  if(authorDoctor?.requiresCountersignature){
    if(isAuthor)throw new WonFlowApiError(403,"countersignature-required","Your notes require countersignature by your supervisor and cannot be self-signed.");
    if(authorDoctor.supervisorDoctorId!==doctor.id)throw new WonFlowApiError(403,"not-assigned-supervisor","Only this clinician's assigned supervisor may countersign this note.");
  }else if(!isAuthor){
    throw new WonFlowApiError(403,"not-author","Only the author may sign this note.");
  }
  const signed=await tx.encounterNote.update({where:{id:note.id},data:{status:"SIGNED",signedAt:new Date(),releasedAt:new Date()}});
  // A countersignature reviews and releases the note; it does not reassign the encounter to the supervisor.
  if(isAuthor)await tx.encounter.update({where:{id:encounterId},data:{doctorId:doctor.id,status:"IN_PROGRESS",signedAt:new Date()}});
  await tx.auditEvent.create({data:{tenantId:c.tenantId,branchId:c.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:isAuthor?"encounter.note.signed":"encounter.note.countersigned",entityType:"encounter-note",entityId:signed.id,severity:"INFORMATION",sourceApplication:c.sourceApplication}});
  return signed;
});}
async addDiagnosis(rc:WonFlowRequestContext,id:string,input:{codeSystem?:string;code?:string;display:string;certainty:"PROVISIONAL"|"DIFFERENTIAL"|"CONFIRMED"|"REFUTED";isPrimary?:boolean;notes?:string}){
  const{context:c,doctor}=await this.resolveDoctor(rc);
  requirePermission(c,"encounters.manage");
  const trimmedDisplay=input.display?.trim();
  if(!trimmedDisplay)throw new WonFlowApiError(400,"diagnosis-display-required","A diagnosis display name is required.");
  const e=await this.requireEncounterAccess(c.tenantId,doctor.id,id,{requireActive:true});
  return database.encounterDiagnosis.create({data:{tenantId:c.tenantId,patientId:e.patientId,encounterId:id,recordedByMembershipId:c.membershipId!,codeSystem:input.codeSystem??null,code:input.code??null,display:trimmedDisplay,certainty:input.certainty,isPrimary:input.isPrimary??false,notes:input.notes?.trim()||null}});
}
async removeDiagnosis(rc:WonFlowRequestContext,encounterId:string,diagnosisId:string){
  const{context:c,doctor}=await this.resolveDoctor(rc);
  requirePermission(c,"encounters.manage");
  const e=await this.requireEncounterAccess(c.tenantId,doctor.id,encounterId,{requireActive:true});
  const deleted=await database.encounterDiagnosis.deleteMany({where:{id:diagnosisId,encounterId,tenantId:c.tenantId}});
  await database.auditEvent.create({data:{tenantId:c.tenantId,branchId:e.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"encounter.diagnosis.removed",entityType:"encounter-diagnosis",entityId:diagnosisId,severity:"INFORMATION",sourceApplication:c.sourceApplication}});
  return deleted;
}
async recordObservation(rc:WonFlowRequestContext,id:string,input:{code:string;display:string;valueNumber?:number;valueText?:string;unit?:string;observedAt:string}){
  const{context:c,doctor}=await this.resolveDoctor(rc);
  requirePermission(c,"encounters.manage");
  const e=await this.requireEncounterAccess(c.tenantId,doctor.id,id,{requireActive:true});
  if(input.valueNumber!==undefined&&input.valueNumber!==null){
    if(!Number.isFinite(input.valueNumber))throw new WonFlowApiError(400,"invalid-vital-value","Observation numeric value must be a finite number.");
    const code=input.code.toLowerCase();
    if((code.includes("hr")||code.includes("pulse")||code.includes("heart-rate")||code.includes("heart_rate"))&&(input.valueNumber<0||input.valueNumber>350)){
      throw new WonFlowApiError(400,"vital-out-of-range","Heart rate must be between 0 and 350 bpm.");
    }
    if((code.includes("bp")||code.includes("blood-pressure")||code.includes("systolic")||code.includes("diastolic"))&&(input.valueNumber<0||input.valueNumber>350)){
      throw new WonFlowApiError(400,"vital-out-of-range","Blood pressure must be between 0 and 350 mmHg.");
    }
    if((code.includes("temp")||code.includes("temperature"))&&(input.valueNumber<70||input.valueNumber>115)&&input.unit?.toLowerCase().includes("f")){
      throw new WonFlowApiError(400,"vital-out-of-range","Temperature in Fahrenheit must be between 70°F and 115°F.");
    }
    if((code.includes("resp")||code.includes("respiratory"))&&(input.valueNumber<0||input.valueNumber>120)){
      throw new WonFlowApiError(400,"vital-out-of-range","Respiratory rate must be between 0 and 120 breaths/min.");
    }
    if((code.includes("spo2")||code.includes("oxygen"))&&(input.valueNumber<0||input.valueNumber>100)){
      throw new WonFlowApiError(400,"vital-out-of-range","SpO2 must be between 0% and 100%.");
    }
  }
  return database.clinicalObservation.create({data:{tenantId:c.tenantId,patientId:e.patientId,encounterId:id,recordedByMembershipId:c.membershipId!,source:"STAFF",code:input.code,display:input.display,valueNumber:input.valueNumber,valueText:input.valueText??null,unit:input.unit??null,observedAt:new Date(input.observedAt)}});
}
async removeObservation(rc:WonFlowRequestContext,encounterId:string,options:{observationId?:string;clearEncounter?:boolean;observedAt?:string}){
  const{context:c,doctor}=await this.resolveDoctor(rc);
  requirePermission(c,"encounters.manage");
  const e=await this.requireEncounterAccess(c.tenantId,doctor.id,encounterId,{requireActive:true});
  if(options.observationId){await database.carePlanAlert.updateMany({where:{triggeredByObservationId:options.observationId},data:{triggeredByObservationId:null}});return database.clinicalObservation.deleteMany({where:{id:options.observationId,tenantId:c.tenantId,encounterId}});}
  if(options.clearEncounter){return database.clinicalObservation.deleteMany({where:{tenantId:c.tenantId,encounterId}});}
  if(options.observedAt){const d=new Date(options.observedAt);return database.clinicalObservation.deleteMany({where:{tenantId:c.tenantId,observedAt:d,encounterId}});}
  throw new WonFlowApiError(400,"missing-params","observationId, clearEncounter, or observedAt parameter is required");
}
async createOrder(rc:WonFlowRequestContext,id:string,input:{type:"LABORATORY"|"RADIOLOGY";code:string;name:string;priority?:string;specimenOrBodySite?:string;clinicalReason?:string}){
  const{context:c,doctor}=await this.resolveDoctor(rc);
  requirePermission(c,input.type==="LABORATORY"?"laboratory.orders.manage":"radiology.orders.manage");
  const trimmedName=input.name?.trim();
  if(!trimmedName)throw new WonFlowApiError(400,"order-name-required","An order name is required.");
  const e=await this.requireEncounterAccess(c.tenantId,doctor.id,id,{requireActive:true});
  if(e.branchId!==requireBranchId(c))throw new WonFlowApiError(403,"branch-mismatch","Encounter branch does not match current branch.");
  return database.diagnosticOrder.create({data:{tenantId:c.tenantId,branchId:e.branchId,patientId:e.patientId,encounterId:e.id,orderedByMembershipId:c.membershipId!,type:input.type,status:"ORDERED",priority:input.priority??"routine",code:input.code.trim(),name:trimmedName,specimenOrBodySite:input.specimenOrBodySite?.trim()||null,clinicalReason:input.clinicalReason?.trim()||null,orderedAt:new Date()}});
}
async removeOrder(rc:WonFlowRequestContext,encounterId:string,orderId:string){
  const{context:c,doctor}=await this.resolveDoctor(rc);
  requirePermission(c,"encounters.manage");
  const e=await this.requireEncounterAccess(c.tenantId,doctor.id,encounterId,{requireActive:true});
  const deleted=await database.diagnosticOrder.deleteMany({where:{id:orderId,encounterId,tenantId:c.tenantId}});
  await database.auditEvent.create({data:{tenantId:c.tenantId,branchId:e.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"diagnostic.order.removed",entityType:"diagnostic-order",entityId:orderId,severity:"INFORMATION",sourceApplication:c.sourceApplication}});
  return deleted;
}
async createPrescription(rc:WonFlowRequestContext,id:string,input:{instructions?:string;allergyOverrideReason?:string;items:{medicationId:string;dose:string;route?:string;frequency:string;duration?:string;quantity?:number;instructions?:string}[]}){
  const{context:c,doctor}=await this.resolveDoctor(rc);
  requirePermission(c,"encounters.manage");
  if(!input.items||!input.items.length)throw new WonFlowApiError(400,"prescription-items-required","At least one medication is required.");
  for(const it of input.items){
    if(it.quantity!==undefined&&it.quantity!==null&&(it.quantity<=0||!Number.isFinite(it.quantity))){
      throw new WonFlowApiError(400,"invalid-medication-quantity","Medication quantity must be a positive number.");
    }
  }
  const e=await this.requireEncounterAccess(c.tenantId,doctor.id,id,{requireActive:true});
  const UUID_REGEX=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const resolvedItems=await Promise.all(input.items.map(async(x)=>{let med=null;if(UUID_REGEX.test(x.medicationId)){med=await database.medication.findFirst({where:{id:x.medicationId,tenantId:c.tenantId}});}if(!med){med=await database.medication.findFirst({where:{tenantId:c.tenantId,OR:[{genericName:{equals:x.medicationId,mode:"insensitive"}},{brandName:{equals:x.medicationId,mode:"insensitive"}},{code:{equals:x.medicationId,mode:"insensitive"}}]}});}if(!med){const cleanCode=`MED-${x.medicationId.slice(0,6).toUpperCase().replace(/[^A-Z0-9]/g,"")}-${Date.now().toString(36).toUpperCase()}`;med=await database.medication.create({data:{tenantId:c.tenantId,code:cleanCode,genericName:x.medicationId.trim(),unit:"unit",isActive:true}});}return{medicationId:med.id,dose:x.dose,route:x.route??null,frequency:x.frequency,duration:x.duration??null,quantity:x.quantity!=null?Number(x.quantity):null,instructions:x.instructions??null};}));
  /*
   * Allergy screening, immediately before the prescription is written.
   *
   * The allergy list was previously read only to paint a banner on the
   * consultation screen — nothing compared it against what was being
   * prescribed, and the video-consultation path did not even show the banner.
   * A conflict now stops the write and names it. A prescriber who means it can
   * still proceed by sending `allergyOverrideReason`, which is recorded on the
   * audit trail: the decision stays the clinician's, but it stops being silent.
   */
  const allergies=await database.patientAllergy.findMany({where:{tenantId:c.tenantId,patientId:e.patientId,status:"ACTIVE"},select:{allergen:true,severity:true,reaction:true}});
  if(allergies.length){
    const medications=await database.medication.findMany({where:{tenantId:c.tenantId,id:{in:resolvedItems.map(item=>item.medicationId)}},select:{genericName:true,brandName:true,code:true}});
    const conflicts=findAllergyConflicts(allergies,medications.map(medication=>({name:medication.genericName||medication.brandName||medication.code,alternateNames:[medication.brandName,medication.code]})));
    if(conflicts.length){
      const override=input.allergyOverrideReason?.trim();
      if(!override){
        throw new WonFlowApiError(409,"allergy-conflict",`${describeAllergyConflicts(conflicts)} Confirm you intend to prescribe despite this, with a reason.`);
      }
      await database.auditEvent.create({data:{tenantId:c.tenantId,branchId:e.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"prescription.allergy-override",entityType:"encounter",entityId:e.id,severity:"WARNING",reason:`${describeAllergyConflicts(conflicts)} Override: ${override}`,sourceApplication:c.sourceApplication}});
    }
  }
  return database.prescription.create({data:{tenantId:c.tenantId,patientId:e.patientId,encounterId:e.id,doctorId:doctor.id,status:"ACTIVE",prescribedAt:new Date(),instructions:input.instructions?.trim()||null,items:{create:resolvedItems}},include:{items:{include:{medication:true}}}});
}
}
export const doctorService=new DoctorService();
