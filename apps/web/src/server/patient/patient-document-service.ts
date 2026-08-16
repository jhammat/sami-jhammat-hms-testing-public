import { randomBytes } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { database } from "@wonflow/database";
import { hasPermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  documentObjectPath,
  documentUploadStagingRoot,
  finalizeStagedDocumentBytes,
  persistUploadedDocumentBytes,
} from "@/server/documents/document-storage";

const uploadStagingRoot = documentUploadStagingRoot;
const allowedTypes = ALLOWED_DOCUMENT_TYPES;
const MIN_CHUNK_BYTES = 16 * 1024;
const MAX_CHUNK_BYTES = 5 * 1024 * 1024;
const UPLOAD_SESSION_TTL_MS = 30 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 2 * 60 * 1000;

async function resolvePatient(requestContext: WonFlowRequestContext) {
  const context = requireTenantContext(requestContext);
  const access = await database.patientAccess.findFirst({ where: { identityId: context.identityId, isActive: true, patient: { tenantId: context.tenantId, status: "ACTIVE" } }, include: { patient: true }, orderBy: { isPrimary: "desc" } });
  if (!access) throw new WonFlowApiError(403, "patient-access-required", "This account is not linked to an active patient record.");
  return { context, patient: access.patient };
}

/** A denied cross-patient (or bogus-id) attempt is audited even though the response — a plain 404 — never reveals which case it was. */
async function auditDeniedDocumentAttempt(context: ReturnType<typeof requireTenantContext>, documentId: string) {
  const exists = await database.documentRecord.findFirst({ where: { id: documentId, tenantId: context.tenantId }, select: { id: true } });
  if (!exists) return;
  await database.auditEvent.create({ data: { tenantId: context.tenantId, branchId: context.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "patient.document.access_denied", entityType: "document", entityId: documentId, severity: "WARNING", sourceApplication: context.sourceApplication } });
}

export async function listPatientDocuments(requestContext: WonFlowRequestContext) {
  const { context, patient } = await resolvePatient(requestContext);
  const documents = await database.documentRecord.findMany({ where: { tenantId: context.tenantId, patientId: patient.id, status: { not: "DELETED" } }, include: { object: { select: { contentType: true, sizeBytes: true, status: true } } }, orderBy: { createdAt: "desc" } });
  return documents.map((document) => ({ ...document, object: { ...document.object, sizeBytes: document.object.sizeBytes.toString() } }));
}

// ---- Chunked, resumable upload -------------------------------------------------

function uploadTempPath(uploadId: string) {
  return path.join(uploadStagingRoot, `${uploadId}.part`);
}

function uploadSessionView(session: { id: string; nextChunkIndex: number; receivedBytes: bigint; totalSizeBytes: bigint; chunkSizeBytes: number; status: string; expiresAt: Date }) {
  return { uploadId: session.id, nextChunkIndex: session.nextChunkIndex, receivedBytes: session.receivedBytes.toString(), totalSizeBytes: session.totalSizeBytes.toString(), chunkSizeBytes: session.chunkSizeBytes, status: session.status, expiresAt: session.expiresAt.toISOString() };
}

export async function beginPatientDocumentUpload(requestContext: WonFlowRequestContext, input: { fileName: string; contentType: string; category: string; title: string; totalSizeBytes: number; chunkSizeBytes: number }) {
  const { context, patient } = await resolvePatient(requestContext);
  if (!allowedTypes.has(input.contentType)) throw new WonFlowApiError(415, "unsupported-document-type", "Upload a PDF, JPG, PNG or WebP document.");
  if (!Number.isFinite(input.totalSizeBytes) || input.totalSizeBytes < 1 || input.totalSizeBytes > MAX_DOCUMENT_BYTES) throw new WonFlowApiError(413, "document-size-invalid", "Documents must be between 1 byte and 10 MB.");
  if (!Number.isFinite(input.chunkSizeBytes) || input.chunkSizeBytes < MIN_CHUNK_BYTES || input.chunkSizeBytes > MAX_CHUNK_BYTES) throw new WonFlowApiError(400, "chunk-size-invalid", "Chunk size must be between 16 KB and 5 MB.");
  const session = await database.documentUploadSession.create({ data: { tenantId: context.tenantId, patientId: patient.id, fileName: input.fileName.trim() || "document", contentType: input.contentType, category: input.category.trim() || "PATIENT_UPLOAD", title: input.title.trim() || input.fileName, totalSizeBytes: BigInt(input.totalSizeBytes), chunkSizeBytes: input.chunkSizeBytes, expiresAt: new Date(Date.now() + UPLOAD_SESSION_TTL_MS) } });
  await mkdir(uploadStagingRoot, { recursive: true });
  await writeFile(uploadTempPath(session.id), new Uint8Array(0), { flag: "w" });
  return uploadSessionView(session);
}

async function requireOwnedUploadSession(context: ReturnType<typeof requireTenantContext>, patientId: string, uploadId: string) {
  const session = await database.documentUploadSession.findFirst({ where: { id: uploadId, tenantId: context.tenantId, patientId } });
  if (!session) throw new WonFlowApiError(404, "upload-not-found", "The upload session could not be found.");
  if (session.status !== "IN_PROGRESS") throw new WonFlowApiError(409, "upload-not-in-progress", "This upload session is no longer accepting chunks.");
  if (session.expiresAt.getTime() < Date.now()) {
    await database.documentUploadSession.update({ where: { id: session.id }, data: { status: "ABORTED" } });
    throw new WonFlowApiError(410, "upload-expired", "This upload session expired. Start a new upload.");
  }
  return session;
}

/** Resume support: a client that lost connection mid-upload calls this to learn how many bytes actually landed before retrying only what's missing. */
export async function getPatientDocumentUploadStatus(requestContext: WonFlowRequestContext, uploadId: string) {
  const { context, patient } = await resolvePatient(requestContext);
  const session = await database.documentUploadSession.findFirst({ where: { id: uploadId, tenantId: context.tenantId, patientId: patient.id } });
  if (!session) throw new WonFlowApiError(404, "upload-not-found", "The upload session could not be found.");
  return uploadSessionView(session);
}

export async function putPatientDocumentUploadChunk(requestContext: WonFlowRequestContext, uploadId: string, chunkIndex: number, bytes: Buffer) {
  const { context, patient } = await resolvePatient(requestContext);
  const session = await requireOwnedUploadSession(context, patient.id, uploadId);
  // A chunk already received (client retried after losing the response) is accepted idempotently instead of appended twice.
  if (chunkIndex < session.nextChunkIndex) return uploadSessionView(session);
  if (chunkIndex !== session.nextChunkIndex) throw new WonFlowApiError(409, "chunk-out-of-order", `Expected chunk ${session.nextChunkIndex}, received ${chunkIndex}.`);
  if (session.receivedBytes + BigInt(bytes.length) > session.totalSizeBytes) throw new WonFlowApiError(413, "chunk-exceeds-declared-size", "This chunk would exceed the declared upload size.");
  await appendFile(uploadTempPath(session.id), bytes);
  const updated = await database.documentUploadSession.update({ where: { id: session.id }, data: { receivedBytes: session.receivedBytes + BigInt(bytes.length), nextChunkIndex: session.nextChunkIndex + 1 } });
  return uploadSessionView(updated);
}

export async function completePatientDocumentUpload(requestContext: WonFlowRequestContext, uploadId: string) {
  const { context, patient } = await resolvePatient(requestContext);
  const session = await requireOwnedUploadSession(context, patient.id, uploadId);
  if (session.receivedBytes !== session.totalSizeBytes) throw new WonFlowApiError(409, "upload-incomplete", `${session.receivedBytes} of ${session.totalSizeBytes} bytes received. Send the remaining chunks before completing.`);
  const tempPath = uploadTempPath(session.id);
  const bytes = await readFile(tempPath);
  const { objectKey, checksum, scanResult } = await finalizeStagedDocumentBytes({ tenantId: context.tenantId, patientId: patient.id, stagedPath: tempPath, bytes });
  return database.$transaction(async (transaction) => {
    const object = await transaction.storedObject.create({ data: { tenantId: context.tenantId, objectKey, status: scanResult === "CLEAN" ? "AVAILABLE" : "QUARANTINED", contentType: session.contentType, sizeBytes: session.totalSizeBytes, checksum } });
    const document = await transaction.documentRecord.create({ data: { tenantId: context.tenantId, patientId: patient.id, objectId: object.id, category: session.category, title: session.title, status: "AVAILABLE" } });
    await transaction.documentUploadSession.update({ where: { id: session.id }, data: { status: "COMPLETED" } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: context.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "patient.document.uploaded", entityType: "document", entityId: document.id, severity: scanResult === "CLEAN" ? "INFORMATION" : "CRITICAL", metadata: { scanResult }, sourceApplication: context.sourceApplication } });
    return { document, scanResult };
  });
}

// ---- Short-lived, single-use document access -----------------------------------

export async function createPatientDocumentAccessToken(requestContext: WonFlowRequestContext, documentId: string) {
  const { context, patient } = await resolvePatient(requestContext);
  const document = await database.documentRecord.findFirst({ where: { id: documentId, tenantId: context.tenantId, patientId: patient.id, status: { not: "DELETED" } }, include: { object: true } });
  if (!document) {
    await auditDeniedDocumentAttempt(context, documentId);
    throw new WonFlowApiError(404, "document-not-found", "The document could not be found.");
  }
  if (document.object.status !== "AVAILABLE") throw new WonFlowApiError(409, "document-not-available", document.object.status === "QUARANTINED" ? "This document failed a security scan and cannot be opened." : "This document is still being scanned and is not available yet.");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
  await database.documentAccessToken.create({ data: { tenantId: context.tenantId, documentId: document.id, token, expiresAt } });
  await database.auditEvent.create({ data: { tenantId: context.tenantId, branchId: context.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "patient.document.access_token_issued", entityType: "document", entityId: document.id, severity: "INFORMATION", sourceApplication: context.sourceApplication } });
  return { url: `/api/v1/patient/documents/access/${token}`, expiresAt: expiresAt.toISOString() };
}

export async function consumePatientDocumentAccessToken(token: string) {
  const record = await database.documentAccessToken.findUnique({ where: { token } });
  if (!record) throw new WonFlowApiError(404, "link-not-found", "This link is invalid.");
  if (record.usedAt) throw new WonFlowApiError(410, "link-already-used", "This link has already been used. Open the document again from your document list.");
  if (record.expiresAt.getTime() < Date.now()) throw new WonFlowApiError(410, "link-expired", "This link has expired. Open the document again from your document list.");
  // Atomic single-use claim: only the first caller to flip usedAt from null wins a concurrent race.
  const claimed = await database.documentAccessToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) throw new WonFlowApiError(410, "link-already-used", "This link has already been used. Open the document again from your document list.");
  const document = await database.documentRecord.findFirst({ where: { id: record.documentId, tenantId: record.tenantId, status: { not: "DELETED" } }, include: { object: true } });
  if (!document || document.object.status !== "AVAILABLE") throw new WonFlowApiError(404, "document-not-found", "The document could not be found.");
  await database.auditEvent.create({ data: { tenantId: record.tenantId, requestId: `document-access-token:${record.id}`, action: "patient.document.accessed", entityType: "document", entityId: document.id, severity: "INFORMATION", sourceApplication: "patient-portal-link" } });
  const bytes = await readFile(documentObjectPath(document.object.objectKey));
  return { document, bytes };
}

// ---- Clinician-side upload (unrelated to the patient portal flow above) --------

export async function listClinicianDocumentPatients(requestContext: WonFlowRequestContext) {
  const context = requireTenantContext(requestContext);
  if (!context.membershipId) throw new WonFlowApiError(403, "clinician-required", "A clinician membership is required.");
  const doctor = await database.doctorProfile.findFirst({ where: { tenantId: context.tenantId, staffProfile: { membershipId: context.membershipId, status: "ACTIVE" } } });
  if (!doctor) throw new WonFlowApiError(403, "doctor-profile-required", "A valid doctor profile is required.");
  return database.patient.findMany({ where: { tenantId: context.tenantId, status: "ACTIVE", encounters: { some: { doctorId: doctor.id } } }, select: { id: true, patientNumber: true, givenName: true, middleName: true, familyName: true, documents: { where: { status: { not: "DELETED" } }, select: { id: true, title: true, category: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } } }, orderBy: [{ givenName: "asc" }, { familyName: "asc" }], take: 500 });
}

export async function uploadClinicianDocument(requestContext: WonFlowRequestContext, patientId: string, file: File, title: string, category: string) {
  const context = requireTenantContext(requestContext);
  if (!context.membershipId) throw new WonFlowApiError(403, "clinician-required", "A clinician membership is required.");
  const doctor = await database.doctorProfile.findFirst({ where: { tenantId: context.tenantId, staffProfile: { membershipId: context.membershipId, status: "ACTIVE" } } });
  if (!doctor) throw new WonFlowApiError(403, "clinician-required", "A clinician membership is required.");
  // Either an encounter already links this doctor to the patient, or the
  // doctor holds patients.manage -- the same permission that lets them
  // register a patient in the first place, which is exactly the moment a
  // brand-new patient has no encounter yet to link through.
  const hasEncounter = await database.encounter.findFirst({ where: { tenantId: context.tenantId, patientId, doctorId: doctor.id } });
  if (!hasEncounter && !hasPermission(context, "patients.manage")) throw new WonFlowApiError(403, "patient-care-access-required", "This patient is not assigned to your care.");
  if (!allowedTypes.has(file.type)) throw new WonFlowApiError(415, "unsupported-document-type", "Upload a PDF, JPG, PNG or WebP document.");
  if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) throw new WonFlowApiError(413, "document-size-invalid", "Documents must be between 1 byte and 10 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const { objectKey, checksum, scanResult } = await persistUploadedDocumentBytes({ tenantId: context.tenantId, patientId, bytes });
  return database.$transaction(async (transaction) => {
    const object = await transaction.storedObject.create({ data: { tenantId: context.tenantId, objectKey, status: scanResult === "CLEAN" ? "AVAILABLE" : "QUARANTINED", contentType: file.type, sizeBytes: BigInt(file.size), checksum } });
    const document = await transaction.documentRecord.create({ data: { tenantId: context.tenantId, patientId, objectId: object.id, category: category.trim() || "CLINICAL_REPORT", title: title.trim() || file.name, status: "RELEASED", releasedAt: new Date() } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: context.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "doctor.document.released", entityType: "document", entityId: document.id, severity: scanResult === "CLEAN" ? "INFORMATION" : "CRITICAL", metadata: { scanResult }, sourceApplication: context.sourceApplication } });
    if (scanResult === "CLEAN") await transaction.notification.create({ data: { tenantId: context.tenantId, patientId, channel: "IN_APP", status: "PENDING", templateCode: "clinical-document-released", payload: { documentId: document.id, title: document.title } } });
    return { document, scanResult };
  });
}
