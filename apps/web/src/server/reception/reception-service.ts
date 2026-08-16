import{randomBytes}from"node:crypto";import{database}from"@wonflow/database";import type{Prisma}from"@wonflow/database";import{requireBranchId,requirePermission,requireTenantContext}from"@wonflow/contracts";import type{WonFlowRequestContext}from"@wonflow/contracts";import{WonFlowApiError}from"@/server/http/route-handler";import{checkDoctorBookable}from"@/server/scheduling/effective-availability";import{listBookableSlots}from"@/server/scheduling/appointment-slots";
const normalizeOptional=(v?:string)=>v?.trim().toLowerCase()||null;const trimOrUndefined=(v?:string)=>{const t=v?.trim();return t?t:undefined;};const patientNumber=()=>`P-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomBytes(3).toString("hex").toUpperCase()}`;const isUniqueConstraintError=(caught:unknown)=>typeof caught==="object"&&caught!==null&&(caught as{code?:string}).code==="P2002";

export interface RegisterPatientInput{
  givenName:string;middleName?:string;familyName:string;
  dateOfBirth?:string;sex?:string;
  phone?:string;alternateMobileNumber?:string;email?:string;
  fatherName?:string;
  bloodGroup?:string;patientCategory?:string;preferredLanguage?:string;
  city?:string;addressLine?:string;address?:unknown;guardianData?:unknown;
  emergencyContactName?:string;emergencyContactRelation?:string;emergencyContactPhone?:string;
  referralSource?:string;notes?:string;consentToContact?:boolean;
  /** Which portal registered this patient — reception's own dropdown always sets referralSource explicitly, so this only matters as a fallback when it doesn't. */
  registeredVia?:"reception"|"doctor";
  identifiers?:{type:string;system:string;value:string;isPrimary?:boolean}[];
}

export interface ListPatientsOptions{
  query?:string;
  gender?:string;
  minimumAge?:number;maximumAge?:number;
  page?:number;pageSize?:number;
  sort?:"recent"|"name-ascending"|"mr-ascending"|"age-ascending"|"age-descending";
}

export interface DuplicatePatientLookup{givenName?:string;familyName?:string;phone?:string;}

/** Same-name-and-DOB or same-phone/email lookup, used both to warn before saving and to flag on the created record. */
async function queryDuplicatePatients(c:{tenantId:string},lookup:DuplicatePatientLookup&{dateOfBirth?:Date|null}){
  const normalizedPhone=normalizeOptional(lookup.phone);
  const nameConditions:Prisma.PatientWhereInput[]=lookup.givenName&&lookup.familyName?[{givenName:{equals:lookup.givenName.trim(),mode:"insensitive"},familyName:{equals:lookup.familyName.trim(),mode:"insensitive"},dateOfBirth:lookup.dateOfBirth??null}]:[];
  const orConditions:Prisma.PatientWhereInput[]=[...(normalizedPhone?[{normalizedPhone}]:[]),...nameConditions];
  if(orConditions.length===0)return[];
  return database.patient.findMany({where:{tenantId:c.tenantId,status:{not:"ARCHIVED"},OR:orConditions},include:{identifiers:{select:{type:true,value:true,isPrimary:true}}},orderBy:{createdAt:"desc"},take:10});
}

/**
 * Patient number generation happens here, inside the transaction, never in
 * the browser — two receptionists registering at the same instant would
 * otherwise generate the same number. patientNumber() is random and
 * unrequested, so on the rare collision (the database's [tenantId,
 * patientNumber] unique constraint) retrying with a freshly generated
 * number is safe and invisible to the caller.
 */
async function createPatientRecord(
  c:{tenantId:string;branchId:string|null;membershipId:string|null;sessionId:string;requestId:string;sourceApplication:string},
  derived:{dateOfBirth:Date|null;normalizedPhone:string|null;normalizedEmail:string|null;address:object|undefined;guardianData:object|undefined;consentData:object},
  input:RegisterPatientInput,
  attempt=0,
):Promise<Prisma.PatientGetPayload<object>>{
  try{
    return await database.$transaction(async tx=>{
      const p=await tx.patient.create({data:{tenantId:c.tenantId,patientNumber:patientNumber(),givenName:input.givenName.trim(),middleName:input.middleName?.trim()||null,familyName:input.familyName.trim(),dateOfBirth:derived.dateOfBirth,sex:input.sex?.trim()||null,phone:input.phone?.trim()||null,normalizedPhone:derived.normalizedPhone,email:input.email?.trim()||null,normalizedEmail:derived.normalizedEmail,address:derived.address,guardianData:derived.guardianData,consentData:derived.consentData,identifiers:{create:input.identifiers?.filter(i=>i.value.trim()).map(i=>({tenantId:c.tenantId,type:i.type.trim(),system:i.system.trim(),value:i.value.trim(),normalizedValue:i.value.trim().toLowerCase(),isPrimary:i.isPrimary??false}))??[]}}});
      await tx.auditEvent.create({data:{tenantId:c.tenantId,branchId:c.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"patient.registered",entityType:"patient",entityId:p.id,severity:"INFORMATION",sourceApplication:c.sourceApplication}});
      return p;
    });
  }catch(caught){
    if(!isUniqueConstraintError(caught)||attempt>=4)throw caught;
    return createPatientRecord(c,derived,input,attempt+1);
  }
}

const diagnosticTypeOf=(category:string):"LABORATORY"|"RADIOLOGY"|null=>{const value=category.trim().toUpperCase().replace(/[^A-Z0-9]+/g,"_");if(value==="LABORATORY"||value==="PATHOLOGY")return"LABORATORY";if(value==="RADIOLOGY"||value==="IMAGING")return"RADIOLOGY";return null;};
export class ReceptionService{
async getCatalog(rc:WonFlowRequestContext){const c=requireTenantContext(rc);requirePermission(c,"appointments.read");const[branches,doctors,services]=await Promise.all([database.branch.findMany({where:{tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null,status:"ACTIVE"},orderBy:[{isMainBranch:"desc"},{name:"asc"}],select:{id:true,name:true,address:true,phone:true,timezone:true}}),database.doctorProfile.findMany({where:{tenantId:c.tenantId,staffProfile:{status:"ACTIVE",membership:{organizationId:c.organizationId,archivedAt:null,status:{in:["ACTIVE","INVITED"]}}}},include:{staffProfile:{include:{membership:true}},department:{select:{id:true,name:true}}},orderBy:{staffProfile:{membership:{displayName:"asc"}}}}),database.serviceDefinition.findMany({where:{tenantId:c.tenantId,isActive:true,OR:[{branchId:null},{branch:{organizationId:c.organizationId,archivedAt:null,status:"ACTIVE"}}]},orderBy:[{category:"asc"},{name:"asc"}]})]);return{branches,practitioners:doctors.map(doctor=>{const doctorServices=services.filter(service=>service.doctorId===doctor.id&&service.priceMinorUnits!==null);const normalFee=doctorServices[0]?.priceMinorUnits??0;return{id:doctor.id,displayName:doctor.staffProfile.membership.displayName,specialtyName:doctor.specialty??"Clinical practitioner",primaryBranchId:doctor.staffProfile.branchId??branches[0]?.id??"",departmentName:doctor.department?.name??null,consultationFee:normalFee/100,urgentConsultationFee:normalFee?normalFee*1.5/100:0};}),services:services.map(service=>({id:service.id,name:service.name,category:service.category,price:service.priceMinorUnits===null?0:service.priceMinorUnits/100,doctorId:service.doctorId,branchId:service.branchId,publiclyBookable:service.publiclyBookable,consultationModes:service.consultationModes,requiresPrepayment:service.requiresPrepayment}))};}
async getOverview(rc:WonFlowRequestContext,date:string){const c=requireTenantContext(rc);requirePermission(c,"appointments.read");const branchId=requireBranchId(c),start=new Date(`${date}T00:00:00.000Z`),end=new Date(`${date}T23:59:59.999Z`);const[appointments,queue,patientsToday]=await Promise.all([database.appointment.findMany({where:{tenantId:c.tenantId,branchId,startsAt:{gte:start,lte:end}},orderBy:{startsAt:"asc"}}),database.queueEntry.findMany({where:{tenantId:c.tenantId,queue:{branchId,queueDate:start}},include:{patient:true,appointment:true},orderBy:[{priority:"desc"},{tokenNumber:"asc"}]}),database.patient.count({where:{tenantId:c.tenantId,createdAt:{gte:start,lte:end}}})]);return{patientsToday,appointmentsToday:appointments.length,waitingCount:queue.filter(x=>x.status==="WAITING").length,checkedInCount:appointments.filter(x=>x.checkedInAt).length,appointments,queue};}
/** Duplicate-check lookup for the registration form: same name+DOB or same phone, called before the record is saved. */
async findDuplicatePatients(rc:WonFlowRequestContext,lookup:DuplicatePatientLookup){const c=requireTenantContext(rc);requirePermission(c,"patients.read");return queryDuplicatePatients(c,lookup);}
/**
 * Removes a patient from the directory.
 *
 * Archives rather than deletes: appointments, encounters, invoices and
 * diagnostic orders reference the record, and a hospital may not erase a
 * clinical history. A patient with activity keeps it and simply leaves the
 * directory.
 */
async archivePatient(rc:WonFlowRequestContext,id:string){const c=requireTenantContext(rc);requirePermission(c,"patients.manage");
  const patient=await database.patient.findFirst({where:{id,tenantId:c.tenantId}});
  if(!patient)throw new WonFlowApiError(404,"patient-not-found","The patient could not be found.");
  if(patient.status==="ARCHIVED")return patient;
  return database.patient.update({where:{id:patient.id},data:{status:"ARCHIVED",archivedAt:new Date()}});}
async getPatient(rc:WonFlowRequestContext,id:string){
  const c=requireTenantContext(rc);requirePermission(c,"patients.read");
  const patient=await database.patient.findFirst({where:{id,tenantId:c.tenantId,status:{not:"ARCHIVED"}},include:{identifiers:{select:{type:true,value:true,isPrimary:true}}}});
  if(!patient)throw new WonFlowApiError(404,"patient-not-found","The patient could not be found.");
  return patient;
}
async updatePatient(rc:WonFlowRequestContext,id:string,input:Partial<RegisterPatientInput>&{guardianData?:unknown;address?:unknown}){
  const c=requireTenantContext(rc);requirePermission(c,"patients.manage");
  const existing=await database.patient.findFirst({where:{id,tenantId:c.tenantId,status:{not:"ARCHIVED"}},include:{identifiers:true}});
  if(!existing)throw new WonFlowApiError(404,"patient-not-found","The patient could not be found.");
  const normalizedPhone=input.phone!==undefined?normalizeOptional(input.phone):undefined;
  const normalizedEmail=input.email!==undefined?normalizeOptional(input.email):undefined;
  const dateOfBirth=input.dateOfBirth!==undefined?(input.dateOfBirth?new Date(`${input.dateOfBirth}T00:00:00.000Z`):null):undefined;
  const guardianDataFromInput=typeof input.guardianData==="object"&&input.guardianData!==null?input.guardianData as Record<string,unknown>:undefined;
  const existingGuardianData=typeof existing.guardianData==="object"&&existing.guardianData!==null?existing.guardianData as Record<string,unknown>:{};
  const fatherName=input.fatherName!==undefined?trimOrUndefined(input.fatherName):(typeof guardianDataFromInput?.fatherName==="string"?trimOrUndefined(guardianDataFromInput.fatherName):(typeof guardianDataFromInput?.name==="string"?trimOrUndefined(guardianDataFromInput.name):undefined));
  const emergencyContactName=input.emergencyContactName!==undefined?trimOrUndefined(input.emergencyContactName):(typeof guardianDataFromInput?.emergencyContactName==="string"?trimOrUndefined(guardianDataFromInput.emergencyContactName):(typeof guardianDataFromInput?.emergencyContact==="string"?trimOrUndefined(guardianDataFromInput.emergencyContact):undefined));
  const emergencyContactRelation=input.emergencyContactRelation!==undefined?trimOrUndefined(input.emergencyContactRelation):(typeof guardianDataFromInput?.emergencyContactRelation==="string"?trimOrUndefined(guardianDataFromInput.emergencyContactRelation):(typeof guardianDataFromInput?.relationship==="string"?trimOrUndefined(guardianDataFromInput.relationship):undefined));
  const emergencyContactPhone=input.emergencyContactPhone!==undefined?trimOrUndefined(input.emergencyContactPhone):(typeof guardianDataFromInput?.emergencyContactPhone==="string"?trimOrUndefined(guardianDataFromInput.emergencyContactPhone):(typeof guardianDataFromInput?.phone==="string"?trimOrUndefined(guardianDataFromInput.phone):undefined));
  const mergedGuardianData={
    ...existingGuardianData,
    ...(fatherName!==undefined?{fatherName}:{}),
    ...(emergencyContactName!==undefined?{emergencyContactName}:{}),
    ...(emergencyContactRelation!==undefined?{emergencyContactRelation}:{}),
    ...(emergencyContactPhone!==undefined?{emergencyContactPhone}:{}),
  };
  const address=input.address!==undefined?(input.address as Prisma.InputJsonValue):(input.addressLine||input.city?{text:trimOrUndefined(input.addressLine),city:trimOrUndefined(input.city)}:undefined);
  return database.patient.update({
    where:{id:existing.id},
    data:{
      givenName:input.givenName!==undefined?input.givenName.trim():undefined,
      middleName:input.middleName!==undefined?(input.middleName.trim()||null):undefined,
      familyName:input.familyName!==undefined?input.familyName.trim():undefined,
      dateOfBirth,
      sex:input.sex!==undefined?(input.sex.trim()||null):undefined,
      phone:input.phone!==undefined?(input.phone.trim()||null):undefined,
      normalizedPhone,
      email:input.email!==undefined?(input.email.trim()||null):undefined,
      normalizedEmail,
      address:address!==undefined?address:undefined,
      guardianData:mergedGuardianData as Prisma.InputJsonValue,
    },
    include:{identifiers:{select:{type:true,value:true,isPrimary:true}}},
  });
}
/**
 * Places laboratory and radiology orders for a walk-in booked at reception.
 *
 * These have no clinical encounter — the patient has not seen a doctor yet —
 * so the orders are raised against the patient directly and appear on the
 * department worklists immediately.
 */
async createDiagnosticOrders(rc:WonFlowRequestContext,input:{patientId:string;serviceIds:string[];clinicalReason?:string;priority?:string}){
  // Placing a walk-in order is part of booking a visit, which is reception's
  // domain, so orders.manage (a clinician permission) is not required.
  const c=requireTenantContext(rc);requirePermission(c,"patients.manage");
  const branchId=requireBranchId(c);
  const patient=await database.patient.findFirst({where:{id:input.patientId,tenantId:c.tenantId}});
  if(!patient)throw new WonFlowApiError(404,"patient-not-found","The patient could not be found.");
  const services=await database.serviceDefinition.findMany({where:{id:{in:input.serviceIds},tenantId:c.tenantId,isActive:true}});
  const diagnostic=services.map(service=>({service,type:diagnosticTypeOf(service.category)})).filter((entry):entry is{service:typeof services[number];type:"LABORATORY"|"RADIOLOGY"}=>entry.type!==null);
  if(diagnostic.length===0)return[];
  const orderedAt=new Date();
  return database.$transaction(diagnostic.map(({service,type})=>database.diagnosticOrder.create({data:{tenantId:c.tenantId,branchId,patientId:patient.id,encounterId:null,orderedByMembershipId:c.membershipId!,type,status:"ORDERED",priority:input.priority??"routine",code:service.code,name:service.name,clinicalReason:input.clinicalReason?.trim()||null,orderedAt}})));
}
/** Recent patients for the tenant, for the patient directory listing. */
/** Paginated, server-filtered patient directory: text search, gender and age-range filters, and sort all evaluate in the database, not in the browser. */
async listPatients(rc:WonFlowRequestContext,options:ListPatientsOptions={}){
  const c=requireTenantContext(rc);requirePermission(c,"patients.read");
  const page=Math.max(1,Math.floor(options.page??1));
  const pageSize=Math.min(Math.max(Math.floor(options.pageSize??25),1),100);
  const where:Prisma.PatientWhereInput={tenantId:c.tenantId,status:{not:"ARCHIVED"}};
  const query=options.query?.trim();
  if(query){where.OR=[{patientNumber:{contains:query,mode:"insensitive"}},{givenName:{contains:query,mode:"insensitive"}},{familyName:{contains:query,mode:"insensitive"}},{normalizedPhone:{contains:query.toLowerCase()}},{normalizedEmail:{contains:query.toLowerCase()}},{identifiers:{some:{normalizedValue:{contains:query.toLowerCase()}}}}];}
  if(options.gender&&options.gender!=="all")where.sex=options.gender;
  if(options.minimumAge!==undefined||options.maximumAge!==undefined){
    const dobFilter:Prisma.DateTimeNullableFilter={};
    // age >= minimumAge  <=>  born on/before (today - minimumAge years)
    if(options.minimumAge!==undefined){const d=new Date();d.setUTCFullYear(d.getUTCFullYear()-options.minimumAge);dobFilter.lte=d;}
    // age <= maximumAge  <=>  born after (today - (maximumAge+1) years)
    if(options.maximumAge!==undefined){const d=new Date();d.setUTCFullYear(d.getUTCFullYear()-options.maximumAge-1);dobFilter.gt=d;}
    where.dateOfBirth=dobFilter;
  }
  // Age has no stored column; dateOfBirth sorts inversely with age (a more
  // recent birth date is a younger patient).
  const orderBy:Prisma.PatientOrderByWithRelationInput[]=
    options.sort==="name-ascending"?[{familyName:"asc"},{givenName:"asc"}]:
    options.sort==="mr-ascending"?[{patientNumber:"asc"}]:
    options.sort==="age-ascending"?[{dateOfBirth:"desc"}]:
    options.sort==="age-descending"?[{dateOfBirth:"asc"}]:
    [{createdAt:"desc"}];
  const tenantWhere:Prisma.PatientWhereInput={tenantId:c.tenantId,status:{not:"ARCHIVED"}};
  const [patients,total,totalPatients,malePatients,femalePatients]=await Promise.all([
    database.patient.findMany({where,include:{identifiers:{select:{type:true,value:true,isPrimary:true}}},orderBy,skip:(page-1)*pageSize,take:pageSize}),
    database.patient.count({where}),
    database.patient.count({where:tenantWhere}),
    database.patient.count({where:{...tenantWhere,sex:"male"}}),
    database.patient.count({where:{...tenantWhere,sex:"female"}}),
  ]);
  return{patients,total,page,pageSize,summary:{totalPatients,malePatients,femalePatients}};
}
async registerPatient(rc:WonFlowRequestContext,input:RegisterPatientInput){const c=requireTenantContext(rc);requirePermission(c,"patients.manage");
    const normalizedPhone=normalizeOptional(input.phone),normalizedEmail=normalizeOptional(input.email),dateOfBirth=input.dateOfBirth?new Date(`${input.dateOfBirth}T00:00:00.000Z`):null;
    const possibleDuplicates=await queryDuplicatePatients(c,{givenName:input.givenName,familyName:input.familyName,phone:input.phone,dateOfBirth});
    for(const identifier of input.identifiers??[]){const value=identifier.value.trim();if(!value)continue;const existing=await database.patientIdentifier.findFirst({where:{tenantId:c.tenantId,system:identifier.system.trim(),normalizedValue:value.toLowerCase()}});if(existing)throw new WonFlowApiError(409,"duplicate-identifier",`A patient with this ${identifier.type} number is already registered.`);}
    // Administrative fields collected by the registration form (father/guardian
    // identity, emergency contact, blood group, category, referral, notes) have
    // no dedicated columns; they ride along in the record's flexible JSON slots.
    const address=input.addressLine||input.city?{text:trimOrUndefined(input.addressLine),city:trimOrUndefined(input.city)}:undefined;
    const guardianDataFromInput=typeof input.guardianData==="object"&&input.guardianData!==null?input.guardianData as Record<string,unknown>:undefined;
    const fatherName=trimOrUndefined(input.fatherName)||(typeof guardianDataFromInput?.fatherName==="string"?trimOrUndefined(guardianDataFromInput.fatherName):(typeof guardianDataFromInput?.name==="string"?trimOrUndefined(guardianDataFromInput.name):undefined));
    const emergencyContactName=trimOrUndefined(input.emergencyContactName)||(typeof guardianDataFromInput?.emergencyContactName==="string"?trimOrUndefined(guardianDataFromInput.emergencyContactName):(typeof guardianDataFromInput?.emergencyContact==="string"?trimOrUndefined(guardianDataFromInput.emergencyContact):undefined));
    const emergencyContactRelation=trimOrUndefined(input.emergencyContactRelation)||(typeof guardianDataFromInput?.emergencyContactRelation==="string"?trimOrUndefined(guardianDataFromInput.emergencyContactRelation):(typeof guardianDataFromInput?.relationship==="string"?trimOrUndefined(guardianDataFromInput.relationship):undefined));
    const emergencyContactPhone=trimOrUndefined(input.emergencyContactPhone)||(typeof guardianDataFromInput?.emergencyContactPhone==="string"?trimOrUndefined(guardianDataFromInput.emergencyContactPhone):(typeof guardianDataFromInput?.phone==="string"?trimOrUndefined(guardianDataFromInput.phone):undefined));
    const guardianData=fatherName||emergencyContactName||emergencyContactRelation||emergencyContactPhone?{fatherName,emergencyContactName,emergencyContactRelation,emergencyContactPhone}:guardianDataFromInput;
    // referralSource is what the doctor sees as "where this patient came from".
    // Reception's own form always sends one via its dropdown; the doctor's
    // "register a patient" page has no such field, so a doctor-registered
    // patient defaults to "doctor-referral" instead of silently reading back
    // as "walk-in" later.
    const referralSource=trimOrUndefined(input.referralSource)??(input.registeredVia==="doctor"?"doctor-referral":"walk-in");
    const consentData={consentToContact:input.consentToContact??true,patientCategory:trimOrUndefined(input.patientCategory),preferredLanguage:trimOrUndefined(input.preferredLanguage),bloodGroup:trimOrUndefined(input.bloodGroup),referralSource,notes:trimOrUndefined(input.notes),alternateMobileNumber:trimOrUndefined(input.alternateMobileNumber)};
    const patient=await createPatientRecord(c,{dateOfBirth,normalizedPhone,normalizedEmail,address,guardianData,consentData},input);
    return{patient,possibleDuplicates};}
async bookAppointment(rc:WonFlowRequestContext,input:{patientId:string;doctorId?:string;serviceId?:string;startsAt:string;endsAt:string;reason?:string;source:string;idempotencyKey:string;consultationMode?:"IN_PERSON"|"ONLINE"}){
  const c=requireTenantContext(rc);requirePermission(c,"appointments.manage");
  const branchId=requireBranchId(c),startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);
  if(!Number.isFinite(startsAt.getTime())||!Number.isFinite(endsAt.getTime())||endsAt<=startsAt)throw new WonFlowApiError(400,"invalid-appointment-time","The appointment time is invalid.");
  const old=await database.idempotencyRecord.findUnique({where:{tenantId_key_operation:{tenantId:c.tenantId,key:input.idempotencyKey,operation:"appointment.book"}}});
  if(old?.responsePayload&&typeof old.responsePayload==="object"&&"appointmentId"in old.responsePayload){const a=await database.appointment.findFirst({where:{id:String(old.responsePayload.appointmentId),tenantId:c.tenantId}});if(a)return a;}
  try{
    return await database.$transaction(async tx=>{
      if(!await tx.patient.findFirst({where:{id:input.patientId,tenantId:c.tenantId,status:"ACTIVE"}}))throw new WonFlowApiError(404,"patient-not-found","The patient could not be found.");
      const service=input.serviceId?await tx.serviceDefinition.findFirst({where:{id:input.serviceId,tenantId:c.tenantId,isActive:true,OR:[{branchId:null},{branchId}]}}):null;
      if(input.serviceId&&!service)throw new WonFlowApiError(400,"invalid-appointment-service","The selected service is unavailable at this branch.");
      if(service?.doctorId&&input.doctorId&&service.doctorId!==input.doctorId)throw new WonFlowApiError(400,"service-doctor-mismatch","The selected consultation service belongs to another doctor.");
      // Reception may pick the delivery mode on the phone, but a service that
      // does not offer that mode must not be booked into it, and a service
      // offering both modes must not silently default to one.
      if(service&&service.consultationModes.length>1&&!input.consultationMode)throw new WonFlowApiError(400,"consultation-mode-required","Choose whether this is an in-person or online consultation.");
      if(input.consultationMode&&service&&!service.consultationModes.includes(input.consultationMode))throw new WonFlowApiError(400,"consultation-mode-mismatch",`${service.name} does not offer ${input.consultationMode==="ONLINE"?"online consultations":"in-person visits"}.`);
      const doctorId=input.doctorId??service?.doctorId??null;
      if(doctorId&&!await tx.doctorProfile.findFirst({where:{id:doctorId,tenantId:c.tenantId,staffProfile:{membership:{organizationId:c.organizationId}}}}))throw new WonFlowApiError(400,"invalid-appointment-doctor","The selected doctor is unavailable.");
      if(doctorId&&await tx.appointment.findFirst({where:{tenantId:c.tenantId,branchId,doctorId,status:{in:["PENDING","CONFIRMED","CHECKED_IN","IN_QUEUE","IN_PROGRESS"]},startsAt:{lt:endsAt},endsAt:{gt:startsAt}}}))throw new WonFlowApiError(409,"appointment-conflict","The selected clinician is no longer available at that time.");
      // Reception books against the doctor's sitting hours; the hospital roster
      // applies only on dates where the doctor has not recorded a sitting.
      if(doctorId){const branch=await tx.branch.findFirst({where:{id:branchId,tenantId:c.tenantId},select:{timezone:true}});const bookable=await checkDoctorBookable(tx,{tenantId:c.tenantId,doctorId,branchId,startsAt,endsAt,timezone:branch?.timezone??c.timezone});if(!bookable.ok)throw new WonFlowApiError(409,"doctor-unavailable",bookable.reason);}
      // Final backstop against the [tenantId, doctorId, branchId, startsAt]
      // partial unique index: the findFirst check above can still race with
      // a concurrent request between the check and this insert. Postgres
      // rejects the loser with a unique violation, caught below as 409.
      const mode=input.consultationMode??service?.consultationModes[0]??"IN_PERSON";
      const requiresPrepayment=mode==="ONLINE"&&service?.requiresPrepayment===true;
      const a=await tx.appointment.create({data:{tenantId:c.tenantId,patientId:input.patientId,doctorId,branchId,serviceId:service?.id??null,consultationMode:mode,paymentStatus:requiresPrepayment?"AWAITING_PAYMENT":"NOT_REQUIRED",status:"CONFIRMED",source:input.source,reason:input.reason?.trim()||null,startsAt,endsAt,idempotencyKey:input.idempotencyKey}});
      await tx.idempotencyRecord.create({data:{tenantId:c.tenantId,key:input.idempotencyKey,operation:"appointment.book",responsePayload:{appointmentId:a.id},expiresAt:new Date(Date.now()+86400000)}});
      await tx.auditEvent.create({data:{tenantId:c.tenantId,branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"appointment.booked",entityType:"appointment",entityId:a.id,severity:"INFORMATION",sourceApplication:c.sourceApplication}});
      return a;
    });
  }catch(caught){
    if(isUniqueConstraintError(caught))throw new WonFlowApiError(409,"appointment-conflict","This time was just booked by someone else. Refresh the available times and choose another.");
    throw caught;
  }
}
async checkIn(rc:WonFlowRequestContext,id:string,input:{queueDate:string;priority?:number;notes?:string}){const c=requireTenantContext(rc);requirePermission(c,"queues.manage");const branchId=requireBranchId(c),queueDate=new Date(`${input.queueDate}T00:00:00.000Z`);return database.$transaction(async tx=>{const a=await tx.appointment.findFirst({where:{id,tenantId:c.tenantId,branchId,status:{in:["PENDING","CONFIRMED"]}}});if(!a)throw new WonFlowApiError(404,"appointment-not-found","The appointment cannot be checked in.");const q=await tx.queue.upsert({where:{tenantId_branchId_queueDate:{tenantId:c.tenantId,branchId,queueDate}},create:{tenantId:c.tenantId,branchId,queueDate},update:{}}),counter=await tx.queue.update({where:{id:q.id},data:{nextTokenNumber:{increment:1}}}),tokenNumber=counter.nextTokenNumber-1,queueEntry=await tx.queueEntry.create({data:{tenantId:c.tenantId,queueId:q.id,patientId:a.patientId,appointmentId:a.id,tokenNumber,priority:input.priority??0,notes:input.notes?.trim()||null},include:{patient:true,appointment:true}}),appointment=await tx.appointment.update({where:{id:a.id},data:{status:"IN_QUEUE",checkedInAt:new Date(),tokenNumber,queueStatus:"waiting"}});await tx.auditEvent.create({data:{tenantId:c.tenantId,branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"appointment.checked-in",entityType:"appointment",entityId:a.id,severity:"INFORMATION",sourceApplication:c.sourceApplication}});return{appointment,queueEntry};});}
async cancelAppointment(rc:WonFlowRequestContext,id:string,reason:string){const c=requireTenantContext(rc);requirePermission(c,"appointments.manage");if(!reason.trim())throw new WonFlowApiError(400,"cancellation-reason-required","A cancellation reason is required.");return database.$transaction(async tx=>{const found=await tx.appointment.findFirst({where:{id,tenantId:c.tenantId,branchId:requireBranchId(c)}});if(!found)throw new WonFlowApiError(404,"appointment-not-found","The appointment could not be found.");const appointment=await tx.appointment.update({where:{id:found.id},data:{status:"CANCELLED",cancellationReason:reason.trim(),cancelledAt:new Date()}});await tx.queueEntry.updateMany({where:{tenantId:c.tenantId,appointmentId:id},data:{status:"CANCELLED",cancelledAt:new Date()}});await tx.auditEvent.create({data:{tenantId:c.tenantId,branchId:c.branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"appointment.cancelled",entityType:"appointment",entityId:id,severity:"INFORMATION",reason:reason.trim(),sourceApplication:c.sourceApplication}});return appointment;});}
/** Moves a booked appointment to a new time, subject to the same conflict and doctor-availability checks as booking, and the same 409 on a lost race. */
async rescheduleAppointment(rc:WonFlowRequestContext,id:string,input:{startsAt:string;endsAt:string}){
  const c=requireTenantContext(rc);requirePermission(c,"appointments.manage");
  const branchId=requireBranchId(c),startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);
  if(!Number.isFinite(startsAt.getTime())||!Number.isFinite(endsAt.getTime())||endsAt<=startsAt)throw new WonFlowApiError(400,"invalid-appointment-time","The appointment time is invalid.");
  try{
    return await database.$transaction(async tx=>{
      const found=await tx.appointment.findFirst({where:{id,tenantId:c.tenantId,branchId}});
      if(!found)throw new WonFlowApiError(404,"appointment-not-found","The appointment could not be found.");
      if(found.status!=="PENDING"&&found.status!=="CONFIRMED")throw new WonFlowApiError(409,"appointment-not-reschedulable",`An appointment that is ${found.status.toLowerCase().replaceAll("_"," ")} cannot be rescheduled.`);
      if(found.doctorId&&await tx.appointment.findFirst({where:{id:{not:id},tenantId:c.tenantId,branchId,doctorId:found.doctorId,status:{in:["PENDING","CONFIRMED","CHECKED_IN","IN_QUEUE","IN_PROGRESS"]},startsAt:{lt:endsAt},endsAt:{gt:startsAt}}}))throw new WonFlowApiError(409,"appointment-conflict","The selected clinician is no longer available at that time.");
      if(found.doctorId){const branch=await tx.branch.findFirst({where:{id:branchId,tenantId:c.tenantId},select:{timezone:true}});const bookable=await checkDoctorBookable(tx,{tenantId:c.tenantId,doctorId:found.doctorId,branchId,startsAt,endsAt,timezone:branch?.timezone??c.timezone});if(!bookable.ok)throw new WonFlowApiError(409,"doctor-unavailable",bookable.reason);}
      const appointment=await tx.appointment.update({where:{id:found.id},data:{startsAt,endsAt,status:"CONFIRMED"}});
      await tx.auditEvent.create({data:{tenantId:c.tenantId,branchId,actorMembershipId:c.membershipId,sessionId:c.sessionId,requestId:c.requestId,action:"appointment.rescheduled",entityType:"appointment",entityId:id,severity:"INFORMATION",sourceApplication:c.sourceApplication}});
      return appointment;
    });
  }catch(caught){
    if(isUniqueConstraintError(caught))throw new WonFlowApiError(409,"appointment-conflict","This time was just booked by someone else. Refresh the available times and choose another.");
    throw caught;
  }
}
/** Paginated, server-filtered appointment directory. */
async listAppointments(rc:WonFlowRequestContext,options:{query?:string;branchId?:string;practitionerId?:string;status?:string;date?:string;dateFrom?:string;dateTo?:string;page?:number;pageSize?:number;sort?:"time-ascending"|"time-descending"}={}){
  const c=requireTenantContext(rc);requirePermission(c,"appointments.read");
  const page=Math.max(1,Math.floor(options.page??1));
  const pageSize=Math.min(Math.max(Math.floor(options.pageSize??25),1),100);
  const where:Prisma.AppointmentWhereInput={tenantId:c.tenantId};
  if(options.branchId)where.branchId=options.branchId;
  if(options.practitionerId)where.doctorId=options.practitionerId;
  const validStatuses=["PENDING","CONFIRMED","CHECKED_IN","IN_QUEUE","IN_PROGRESS","COMPLETED","CANCELLED","NO_SHOW"] as const;
  if(options.status&&(validStatuses as readonly string[]).includes(options.status))where.status=options.status as typeof validStatuses[number];
  if(options.date){const start=new Date(`${options.date}T00:00:00.000Z`);if(!Number.isNaN(start.getTime())){const end=new Date(start.getTime()+86_400_000);where.startsAt={gte:start,lt:end};}}
  else if(options.dateFrom||options.dateTo){const range:Prisma.DateTimeFilter={};if(options.dateFrom){const start=new Date(`${options.dateFrom}T00:00:00.000Z`);if(!Number.isNaN(start.getTime()))range.gte=start;}if(options.dateTo){const end=new Date(`${options.dateTo}T00:00:00.000Z`);if(!Number.isNaN(end.getTime()))range.lt=new Date(end.getTime()+86_400_000);}where.startsAt=range;}
  const query=options.query?.trim();
  if(query)where.OR=[{reason:{contains:query,mode:"insensitive"}},{patient:{OR:[{givenName:{contains:query,mode:"insensitive"}},{familyName:{contains:query,mode:"insensitive"}},{patientNumber:{contains:query,mode:"insensitive"}},{normalizedPhone:{contains:query.toLowerCase()}}]}},{doctor:{staffProfile:{membership:{displayName:{contains:query,mode:"insensitive"}}}}}];
  const whereWithoutStatus:Prisma.AppointmentWhereInput={...where,status:undefined};
  const [appointments,total,statusCounts]=await Promise.all([
    database.appointment.findMany({where,select:{id:true,patientId:true,doctorId:true,branchId:true,serviceId:true,status:true,consultationMode:true,source:true,reason:true,startsAt:true,endsAt:true,checkedInAt:true,tokenNumber:true,cancellationReason:true,cancelledAt:true,createdAt:true,patient:{select:{id:true,patientNumber:true,givenName:true,middleName:true,familyName:true,phone:true,identifiers:{select:{type:true,value:true,isPrimary:true}}}},doctor:{select:{id:true,specialty:true,staffProfile:{select:{membership:{select:{displayName:true}}}}}},service:{select:{id:true,name:true,durationMinutes:true,priceMinorUnits:true,currencyCode:true}}},orderBy:{startsAt:options.sort==="time-descending"?"desc":"asc"},skip:(page-1)*pageSize,take:pageSize}),
    database.appointment.count({where}),
    // Status breakdown ignores the status filter itself, so the KPI strip
    // reflects the whole (query/branch/doctor/date-filtered) set, not just
    // whichever status is currently selected.
    database.appointment.groupBy({by:["status"],where:whereWithoutStatus,_count:true}),
  ]);
  const countFor=(...statuses:(typeof statusCounts)[number]["status"][])=>statusCounts.filter(row=>statuses.includes(row.status)).reduce((sum,row)=>sum+row._count,0);
  const summary={
    total:statusCounts.reduce((sum,row)=>sum+row._count,0),
    booked:countFor("PENDING","CONFIRMED"),
    checkedIn:countFor("CHECKED_IN","IN_QUEUE","IN_PROGRESS"),
    completed:countFor("COMPLETED"),
    cancelled:countFor("CANCELLED","NO_SHOW"),
  };
  return{appointments,total,page,pageSize,summary};
}
/** Server-computed available times for a doctor, branch and date — never generated in the browser. */
async listAppointmentSlots(rc: WonFlowRequestContext, input: { doctorId: string; branchId?: string; date: string; serviceDurationMinutes: number }) {
  const c = requireTenantContext(rc);
  requirePermission(c, "appointments.read");
  let branch = input.branchId
    ? await database.branch.findFirst({ where: { id: input.branchId, tenantId: c.tenantId }, select: { id: true, timezone: true } })
    : null;
  if (!branch) {
    const doctor = await database.doctorProfile.findFirst({
      where: { id: input.doctorId, tenantId: c.tenantId },
      include: { staffProfile: { include: { branch: true } } },
    });
    branch = doctor?.staffProfile.branch ?? (await database.branch.findFirst({
      where: { tenantId: c.tenantId, status: "ACTIVE", archivedAt: null },
      orderBy: [{ isMainBranch: "desc" }, { createdAt: "asc" }],
      select: { id: true, timezone: true },
    }));
  }
  const timezone = branch?.timezone ?? "UTC";
  const branchId = branch?.id ?? input.branchId ?? "";
  return listBookableSlots({
    tenantId: c.tenantId,
    doctorId: input.doctorId,
    branchId,
    date: input.date,
    timezone,
    fallbackSlotMinutes: input.serviceDurationMinutes,
  });
}
}export const receptionService=new ReceptionService();
