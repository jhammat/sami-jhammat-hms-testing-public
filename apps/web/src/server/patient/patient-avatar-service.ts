import { readFile } from "node:fs/promises";
import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import { documentObjectPath, persistUploadedDocumentBytes } from "@/server/documents/document-storage";

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

async function resolvePatient(requestContext: WonFlowRequestContext) {
  const context = requireTenantContext(requestContext);
  const access = await database.patientAccess.findFirst({ where: { identityId: context.identityId, isActive: true, patient: { tenantId: context.tenantId, status: "ACTIVE" } }, include: { patient: true }, orderBy: { isPrimary: "desc" } });
  if (!access) throw new WonFlowApiError(403, "patient-access-required", "This account is not linked to an active patient record.");
  return { context, patient: access.patient };
}

export async function uploadPatientAvatar(requestContext: WonFlowRequestContext, file: File) {
  const { context, patient } = await resolvePatient(requestContext);
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) throw new WonFlowApiError(415, "unsupported-image-type", "Upload a JPG, PNG or WebP photo.");
  if (file.size < 1 || file.size > MAX_AVATAR_BYTES) throw new WonFlowApiError(413, "image-size-invalid", "Photos must be between 1 byte and 5 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const { objectKey, scanResult } = await persistUploadedDocumentBytes({ tenantId: context.tenantId, patientId: patient.id, bytes });
  if (scanResult === "INFECTED") {
    await database.auditEvent.create({ data: { tenantId: context.tenantId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "patient.avatar.upload_rejected", entityType: "patient", entityId: patient.id, severity: "CRITICAL", metadata: { scanResult }, sourceApplication: context.sourceApplication } });
    throw new WonFlowApiError(422, "photo-failed-scan", "This photo failed a security scan and was not saved.");
  }
  await database.patient.update({ where: { id: patient.id }, data: { photoObjectKey: objectKey, photoContentType: file.type } });
  await database.auditEvent.create({ data: { tenantId: context.tenantId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "patient.avatar.uploaded", entityType: "patient", entityId: patient.id, severity: "INFORMATION", sourceApplication: context.sourceApplication } });
  return { updatedAt: new Date().toISOString() };
}

export async function removePatientAvatar(requestContext: WonFlowRequestContext) {
  const { context, patient } = await resolvePatient(requestContext);
  await database.patient.update({ where: { id: patient.id }, data: { photoObjectKey: null, photoContentType: null } });
  await database.auditEvent.create({ data: { tenantId: context.tenantId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "patient.avatar.removed", entityType: "patient", entityId: patient.id, severity: "INFORMATION", sourceApplication: context.sourceApplication } });
  return { success: true as const };
}

/** Streamed by the patient themselves (their own portrait) or a signed-in identity resolving `/api/v1/me/avatar`. */
export async function readPatientAvatarBytes(requestContext: WonFlowRequestContext) {
  const { patient } = await resolvePatient(requestContext);
  if (!patient.photoObjectKey) throw new WonFlowApiError(404, "avatar-not-found", "No photo has been uploaded.");
  const bytes = await readFile(documentObjectPath(patient.photoObjectKey));
  return { bytes, contentType: patient.photoContentType ?? "image/jpeg" };
}

/**
 * Used only by GET /api/v1/me/avatar, which resolves whichever role the
 * signed-in identity has (doctor or patient) without knowing in advance
 * which one it is -- so it looks a patient up by identity directly rather
 * than going through the tenant-context PatientAccess check every other
 * function here uses (a session with no tenant context yet, e.g. before a
 * workspace is selected, must still be able to show its own photo).
 */
export async function findPatientAvatarByIdentity(identityId: string, tenantId: string | null): Promise<{ objectKey: string; contentType: string } | null> {
  const access = await database.patientAccess.findFirst({ where: { identityId, isActive: true, patient: { status: "ACTIVE", ...(tenantId ? { tenantId } : {}) } }, include: { patient: { select: { photoObjectKey: true, photoContentType: true } } }, orderBy: { isPrimary: "desc" } });
  const objectKey = access?.patient.photoObjectKey;
  if (!objectKey) return null;
  return { objectKey, contentType: access?.patient.photoContentType ?? "image/jpeg" };
}
