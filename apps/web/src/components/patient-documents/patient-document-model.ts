import type { PatientDocumentActor,PatientDocumentRequestItem,PatientDocumentTimelineItem,PatientDocumentUploadPolicy } from "@wonflow/mock-data";
export interface PatientDocumentScreenModel { actor:PatientDocumentActor; documents:PatientDocumentTimelineItem[]; requests:PatientDocumentRequestItem[]; uploadPolicy:PatientDocumentUploadPolicy }
export interface PatientDocumentUploadDraft { file:File|undefined; categoryCode:string; clinicalDate:string; requestId:string|undefined }
