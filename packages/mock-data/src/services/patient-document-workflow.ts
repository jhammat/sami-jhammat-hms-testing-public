import type { IsoDateTime, WonFlowId } from "@wonflow/contracts";
import type { WonFlowOrganizationScope } from "./practice-service";
export type PatientDocumentScanDisplayStatus = "pending"|"clean"|"quarantined"|"failed";
export type PatientDocumentVisibilityDisplayStatus = "patient-upload"|"released-to-patient"|"private-clinical";
export interface PatientDocumentCategoryOption { code:string; label:string; description?:string }
export interface PatientDocumentUploadPolicy { acceptedMimeTypes:string[]; maximumFileSizeBytes:number; chunkSizeBytes:number; maximumFilesPerUpload:number; categories:PatientDocumentCategoryOption[] }
export interface PatientDocumentTimelineItem { id:WonFlowId; title:string; categoryCode:string; categoryLabel:string; clinicalDate:string; uploadedAt:IsoDateTime; mimeType:string; sizeBytes:number; scanStatus:PatientDocumentScanDisplayStatus; visibility:PatientDocumentVisibilityDisplayStatus; sourceLabel:string; requestId?:WonFlowId; openable:boolean }
export type PatientDocumentRequestDisplayStatus = "open"|"fulfilled"|"cancelled"|"expired";
export interface PatientDocumentRequestItem { id:WonFlowId; title:string; instructions?:string; requestedCategoryCode?:string; requestedCategoryLabel?:string; requestedAt:IsoDateTime; dueAt?:IsoDateTime; status:PatientDocumentRequestDisplayStatus }
export interface PatientDocumentWorkspace { documents:PatientDocumentTimelineItem[]; requests:PatientDocumentRequestItem[]; uploadPolicy:PatientDocumentUploadPolicy }
export interface PatientDocumentActor { patientAccountId:WonFlowId; patientId:WonFlowId }
export interface GetPatientDocumentWorkspaceInput { actor:PatientDocumentActor }
export interface BeginPatientDocumentUploadInput extends PatientDocumentUploadMetadata { actor:PatientDocumentActor; fileName:string; mimeType:string; sizeBytes:number; clientFingerprint:string }
interface PatientDocumentUploadMetadata { categoryCode:string; clinicalDate:string; requestId?:WonFlowId }
export interface BeginPatientDocumentUploadResult { uploadId:WonFlowId; chunkSizeBytes:number; nextChunkIndex:number; expiresAt:IsoDateTime }
export interface UploadPatientDocumentChunkInput { actor:PatientDocumentActor; uploadId:WonFlowId; chunkIndex:number; offsetBytes:number; chunkSizeBytes:number; chunkChecksum:string }
export interface UploadPatientDocumentChunkResult { uploadId:WonFlowId; nextChunkIndex:number; uploadedBytes:number; totalBytes:number }
export interface CompletePatientDocumentUploadInput { actor:PatientDocumentActor; uploadId:WonFlowId; finalChecksum:string }
export interface IssuePatientDocumentReadAccessInput { actor:PatientDocumentActor; documentId:WonFlowId }
export interface PatientDocumentReadAccess { accessToken:string; documentId:WonFlowId; expiresAt:IsoDateTime }
export interface ResolvePatientDocumentReadAccessInput { actor:PatientDocumentActor; accessToken:string }
export interface PatientDocumentSecurePreview { document:PatientDocumentTimelineItem; previewKind:"image"|"pdf"|"download-only"|"unavailable"; expiresAt:IsoDateTime }
export interface WonFlowPatientDocumentService { getPatientDocumentWorkspace(scope:WonFlowOrganizationScope,input:GetPatientDocumentWorkspaceInput,signal?:AbortSignal):Promise<PatientDocumentWorkspace>; beginPatientDocumentUpload(scope:WonFlowOrganizationScope,input:BeginPatientDocumentUploadInput,signal?:AbortSignal):Promise<BeginPatientDocumentUploadResult>; uploadPatientDocumentChunk(scope:WonFlowOrganizationScope,input:UploadPatientDocumentChunkInput,signal?:AbortSignal):Promise<UploadPatientDocumentChunkResult>; completePatientDocumentUpload(scope:WonFlowOrganizationScope,input:CompletePatientDocumentUploadInput,signal?:AbortSignal):Promise<PatientDocumentTimelineItem>; issuePatientDocumentReadAccess(scope:WonFlowOrganizationScope,input:IssuePatientDocumentReadAccessInput,signal?:AbortSignal):Promise<PatientDocumentReadAccess>; resolvePatientDocumentReadAccess(scope:WonFlowOrganizationScope,input:ResolvePatientDocumentReadAccessInput,signal?:AbortSignal):Promise<PatientDocumentSecurePreview> }
