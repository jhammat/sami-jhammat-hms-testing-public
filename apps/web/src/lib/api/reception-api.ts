import { phaseOneApi } from "./phase-one-api";
export interface ReceptionPatient{id:string;patientNumber:string;givenName:string;middleName:string|null;familyName:string;dateOfBirth:string|null;sex?:string|null;phone:string|null;email:string|null;address?:unknown;guardianData?:unknown;consentData?:unknown;bloodGroup?:string|null;emergencyContact?:string|null;fatherName?:string|null;status:string;identifiers?:Array<{type:string;value:string;isPrimary:boolean}>}
export interface ReceptionAppointment{id:string;patientId:string;doctorId:string|null;serviceId:string|null;status:string;startsAt:string;endsAt:string;checkedInAt:string|null;tokenNumber:number|null}
export interface ReceptionQueueEntry{id:string;tokenNumber:number;priority:number;status:string;joinedAt:string;patient:ReceptionPatient;appointment:ReceptionAppointment|null}
export interface ReceptionOverview{patientsToday:number;appointmentsToday:number;waitingCount:number;checkedInCount:number;appointments:ReceptionAppointment[];queue:ReceptionQueueEntry[]}
export interface RegisterPatientInput{givenName:string;middleName?:string;familyName:string;dateOfBirth?:string;sex?:string;phone?:string;email?:string;fatherName?:string;bloodGroup?:string;emergencyContact?:string;address?:unknown;guardianData?:unknown;consentData?:unknown;identifiers?:{type:string;system:string;value:string;isPrimary?:boolean}[]}
export interface BookAppointmentInput{patientId:string;doctorId?:string;serviceId?:string;startsAt:string;endsAt:string;reason?:string;source:"reception"|"walk-in"|"patient"|"public";idempotencyKey:string;consultationMode?:"IN_PERSON"|"ONLINE"}
export interface ReceptionSlot{start:string;end:string;label:string;available:boolean;startsAt:string;endsAt:string;roomLabel:string|null}
export interface ReceptionSlotsResult{slots:ReceptionSlot[];slotMinutes:number;maxSlots:number;doctorTimingLabel?:string;unavailableReason?:string}
export const getReceptionOverview=(date:string)=>phaseOneApi<{overview:ReceptionOverview}>(`/api/v1/reception/overview?date=${encodeURIComponent(date)}`);
export const searchReceptionPatients=(query:string)=>phaseOneApi<{patients:ReceptionPatient[]}>(`/api/v1/patients?query=${encodeURIComponent(query)}`);
export const registerReceptionPatient=(input:RegisterPatientInput)=>phaseOneApi<{patient:ReceptionPatient;possibleDuplicates:ReceptionPatient[]}>("/api/v1/patients",{method:"POST",body:JSON.stringify(input)});
export const updateReceptionPatient=(id:string,input:Partial<RegisterPatientInput>)=>phaseOneApi<{patient:ReceptionPatient}>(`/api/v1/patients/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(input)});
export const bookReceptionAppointment=(input:BookAppointmentInput)=>phaseOneApi<{appointment:ReceptionAppointment}>("/api/v1/appointments",{method:"POST",body:JSON.stringify(input)});
export const getReceptionAppointmentSlots=(params:{doctorId:string;branchId?:string;date:string;durationMinutes?:number})=>{
  const q=new URLSearchParams({slots:"1",doctorId:params.doctorId,date:params.date,...(params.branchId?{branchId:params.branchId}:{}),...(params.durationMinutes?{durationMinutes:String(params.durationMinutes)}:{})});
  return phaseOneApi<ReceptionSlotsResult>(`/api/v1/appointments?${q.toString()}`);
};
export const checkInReceptionAppointment=(id:string,input:{queueDate:string;priority?:number;notes?:string})=>phaseOneApi<{appointment:ReceptionAppointment;queueEntry:ReceptionQueueEntry}>(`/api/v1/appointments/${id}/check-in`,{method:"POST",body:JSON.stringify(input)});
export const cancelReceptionAppointment=(id:string,reason:string)=>phaseOneApi<{appointment:ReceptionAppointment}>(`/api/v1/appointments/${id}`,{method:"PATCH",body:JSON.stringify({action:"cancel",reason})});
export interface ReceptionDiagnosticOrder{id:string;code:string;name:string;type:"LABORATORY"|"RADIOLOGY";status:string}
export const createReceptionDiagnosticOrders=(input:{patientId:string;serviceIds:string[];clinicalReason?:string;priority?:string})=>phaseOneApi<{orders:ReceptionDiagnosticOrder[]}>("/api/v1/reception/diagnostic-orders",{method:"POST",body:JSON.stringify(input)});
