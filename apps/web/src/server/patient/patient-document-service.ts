import { randomBytes } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import {
  MAX_DOCUMENT_BYTES,
  documentObjectPath,
  documentUploadStagingRoot,
  finalizeStagedDocumentBytes,
  isAllowedDocumentType,
  persistUploadedDocumentBytes,
} from "@/server/documents/document-storage";

const uploadStagingRoot = documentUploadStagingRoot;
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
  if (!isAllowedDocumentType(input.contentType, input.fileName)) throw new WonFlowApiError(415, "unsupported-document-type", "Upload a PDF, Word document, Excel spreadsheet, PowerPoint, image, or text file.");
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
  const patients = await database.patient.findMany({
    where: { tenantId: context.tenantId, status: "ACTIVE" },
    select: {
      id: true,
      patientNumber: true,
      givenName: true,
      middleName: true,
      familyName: true,
      dateOfBirth: true,
      sex: true,
      phone: true,
      documents: {
        where: { status: { not: "DELETED" } },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          createdAt: true,
          releasedAt: true,
          object: {
            select: {
              contentType: true,
              sizeBytes: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      encounters: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          endedAt: true,
          notes: {
            select: {
              id: true,
              noteType: true,
              content: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: [{ givenName: "asc" }, { familyName: "asc" }],
    take: 500,
  });

  return patients.map((patient) => ({
    id: patient.id,
    patientNumber: patient.patientNumber,
    givenName: patient.givenName,
    middleName: patient.middleName,
    familyName: patient.familyName,
    dateOfBirth: patient.dateOfBirth?.toISOString() ?? null,
    gender: patient.sex,
    phoneNumber: patient.phone,
    bloodGroup: null,
    documents: patient.documents.map((doc) => ({
      ...doc,
      createdAt: doc.createdAt.toISOString(),
      releasedAt: doc.releasedAt?.toISOString() ?? null,
      object: {
        contentType: doc.object.contentType,
        sizeBytes: doc.object.sizeBytes.toString(),
      },
    })),
    encounters: patient.encounters.map((enc) => ({
      ...enc,
      startedAt: enc.startedAt ? enc.startedAt.toISOString() : enc.id,
      endedAt: enc.endedAt?.toISOString() ?? null,
      clinicalNotes: enc.notes.map((note) => ({
        ...note,
        createdAt: note.createdAt.toISOString(),
      })),
    })),
  }));
}

export async function getClinicianDocumentBytes(requestContext: WonFlowRequestContext, documentId: string) {
  const context = requireTenantContext(requestContext);
  const document = await database.documentRecord.findFirst({
    where: { id: documentId, tenantId: context.tenantId, status: { not: "DELETED" } },
    include: { object: true },
  });
  if (!document) throw new WonFlowApiError(404, "document-not-found", "The document could not be found.");
  const bytes = await readFile(documentObjectPath(document.object.objectKey));
  return { document, bytes, contentType: document.object.contentType };
}

export async function deleteClinicianDocument(requestContext: WonFlowRequestContext, documentId: string) {
  const context = requireTenantContext(requestContext);
  const document = await database.documentRecord.findFirst({
    where: { id: documentId, tenantId: context.tenantId, status: { not: "DELETED" } },
  });
  if (!document) throw new WonFlowApiError(404, "document-not-found", "The document could not be found.");

  await database.documentRecord.update({
    where: { id: documentId },
    data: { status: "DELETED" },
  });

  await database.auditEvent.create({
    data: {
      tenantId: context.tenantId,
      branchId: context.branchId,
      actorMembershipId: context.membershipId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      action: "doctor.document.deleted",
      entityType: "document",
      entityId: document.id,
      severity: "WARNING",
      sourceApplication: context.sourceApplication,
    },
  });

  return { success: true };
}

export async function updateClinicianDocument(
  requestContext: WonFlowRequestContext,
  documentId: string,
  input: { title?: string; category?: string },
) {
  const context = requireTenantContext(requestContext);
  const document = await database.documentRecord.findFirst({
    where: { id: documentId, tenantId: context.tenantId, status: { not: "DELETED" } },
  });
  if (!document) throw new WonFlowApiError(404, "document-not-found", "The document could not be found.");

  const updated = await database.documentRecord.update({
    where: { id: documentId },
    data: {
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.category ? { category: input.category.trim() } : {}),
    },
  });

  return { document: updated };
}

export async function uploadClinicianDocument(requestContext: WonFlowRequestContext, patientId: string, file: File, title: string, category: string) {
  const context = requireTenantContext(requestContext);
  if (!isAllowedDocumentType(file.type, file.name)) throw new WonFlowApiError(415, "unsupported-document-type", "Upload a PDF, Word document, Excel spreadsheet, PowerPoint, image, or text file.");
  if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) throw new WonFlowApiError(413, "document-size-invalid", "Documents must be between 1 byte and 25 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const { objectKey, checksum, scanResult } = await persistUploadedDocumentBytes({ tenantId: context.tenantId, patientId, bytes });
  return database.$transaction(async (transaction) => {
    const object = await transaction.storedObject.create({ data: { tenantId: context.tenantId, objectKey, status: scanResult === "CLEAN" ? "AVAILABLE" : "QUARANTINED", contentType: file.type || "application/octet-stream", sizeBytes: BigInt(file.size), checksum } });
    const document = await transaction.documentRecord.create({ data: { tenantId: context.tenantId, patientId, objectId: object.id, category: category.trim() || "CLINICAL_REPORT", title: title.trim() || file.name, status: "RELEASED", releasedAt: new Date() } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: context.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "doctor.document.released", entityType: "document", entityId: document.id, severity: scanResult === "CLEAN" ? "INFORMATION" : "CRITICAL", metadata: { scanResult }, sourceApplication: context.sourceApplication } });
    if (scanResult === "CLEAN") await transaction.notification.create({ data: { tenantId: context.tenantId, patientId, channel: "IN_APP", status: "PENDING", templateCode: "clinical-document-released", payload: { documentId: document.id, title: document.title } } });
    return { document, scanResult };
  });
}
