import { readFile } from "node:fs/promises";
import { database } from "@wonflow/database";
import { requireBranchId, requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  documentObjectPath,
  persistUploadedDocumentBytes,
} from "@/server/documents/document-storage";

/**
 * Lets a lab/radiology test carry real files -- a scan image, a photo of a
 * printed report, a PDF -- alongside its typed result. Three different
 * audiences can upload: the ordering doctor and lab/radiology staff (both
 * gated by the existing `*.orders.manage` permission, via the staff
 * functions below), and the patient themselves (via PatientAccess, the
 * same authorization model the patient document locker already uses --
 * see patient-document-service.ts).
 *
 * Uploads attach immediately and are visible to everyone with read access
 * to the order right away. Only lab/radiology staff can remove one
 * (`*.results.manage` / `*.reports.manage` -- the same permission that
 * gates entering the typed result), so a doctor or patient who uploads
 * the wrong file re-uploads the right one rather than deleting anything.
 */

const ATTACHMENT_CATEGORY = "DIAGNOSTIC_ATTACHMENT";

function orderReadPermission(type: "LABORATORY" | "RADIOLOGY"): string {
  return type === "LABORATORY" ? "laboratory.orders.read" : "radiology.orders.read";
}

function orderManagePermission(type: "LABORATORY" | "RADIOLOGY"): string {
  return type === "LABORATORY" ? "laboratory.orders.manage" : "radiology.orders.manage";
}

function resultManagePermission(type: "LABORATORY" | "RADIOLOGY"): string {
  return type === "LABORATORY" ? "laboratory.results.manage" : "radiology.reports.manage";
}

function attachmentView(document: {
  id: string;
  title: string;
  status: string;
  uploadedByMembershipId: string | null;
  createdAt: Date;
  object: { contentType: string; sizeBytes: bigint; status: string };
}) {
  return {
    id: document.id,
    title: document.title,
    contentType: document.object.contentType,
    sizeBytes: document.object.sizeBytes.toString(),
    objectStatus: document.object.status,
    uploadedByMembershipId: document.uploadedByMembershipId,
    uploadedByPatient: document.uploadedByMembershipId === null,
    createdAt: document.createdAt.toISOString(),
  };
}

async function validateUpload(file: File): Promise<Buffer> {
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) throw new WonFlowApiError(415, "unsupported-document-type", "Upload a PDF, JPG, PNG or WebP file.");
  if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) throw new WonFlowApiError(413, "document-size-invalid", "Files must be between 1 byte and 10 MB.");
  return Buffer.from(await file.arrayBuffer());
}

// ---- Staff and doctor -----------------------------------------------------

async function loadOrderForStaff(context: ReturnType<typeof requireTenantContext>, orderId: string) {
  const order = await database.diagnosticOrder.findFirst({ where: { id: orderId, tenantId: context.tenantId, branchId: requireBranchId(context) } });
  if (!order) throw new WonFlowApiError(404, "diagnostic-order-not-found", "The diagnostic order could not be found.");
  return order;
}

export async function uploadStaffDiagnosticAttachment(requestContext: WonFlowRequestContext, orderId: string, file: File) {
  const context = requireTenantContext(requestContext);
  const order = await loadOrderForStaff(context, orderId);
  requirePermission(context, orderManagePermission(order.type));
  const bytes = await validateUpload(file);
  const { objectKey, checksum, scanResult } = await persistUploadedDocumentBytes({ tenantId: context.tenantId, patientId: order.patientId, bytes });
  return database.$transaction(async (transaction) => {
    const object = await transaction.storedObject.create({ data: { tenantId: context.tenantId, objectKey, status: scanResult === "CLEAN" ? "AVAILABLE" : "QUARANTINED", contentType: file.type, sizeBytes: BigInt(file.size), checksum } });
    const document = await transaction.documentRecord.create({ data: { tenantId: context.tenantId, patientId: order.patientId, objectId: object.id, diagnosticOrderId: order.id, uploadedByMembershipId: context.membershipId, category: ATTACHMENT_CATEGORY, title: file.name || "Attachment", status: "AVAILABLE" }, include: { object: true } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: order.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: order.type === "LABORATORY" ? "laboratory.attachment.uploaded" : "radiology.attachment.uploaded", entityType: "diagnostic-order", entityId: order.id, severity: scanResult === "CLEAN" ? "INFORMATION" : "CRITICAL", metadata: { scanResult, documentId: document.id }, sourceApplication: context.sourceApplication } });
    return { document: attachmentView(document), scanResult };
  });
}

export async function deleteStaffDiagnosticAttachment(requestContext: WonFlowRequestContext, orderId: string, documentId: string) {
  const context = requireTenantContext(requestContext);
  const order = await loadOrderForStaff(context, orderId);
  requirePermission(context, resultManagePermission(order.type));
  const updated = await database.documentRecord.updateMany({ where: { id: documentId, tenantId: context.tenantId, diagnosticOrderId: order.id, status: { not: "DELETED" } }, data: { status: "DELETED" } });
  if (updated.count !== 1) throw new WonFlowApiError(404, "attachment-not-found", "The attachment could not be found.");
  await database.auditEvent.create({ data: { tenantId: context.tenantId, branchId: order.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: order.type === "LABORATORY" ? "laboratory.attachment.deleted" : "radiology.attachment.deleted", entityType: "diagnostic-order", entityId: order.id, severity: "INFORMATION", metadata: { documentId }, sourceApplication: context.sourceApplication } });
  return { success: true as const };
}

export async function readStaffDiagnosticAttachmentBytes(requestContext: WonFlowRequestContext, orderId: string, documentId: string) {
  const context = requireTenantContext(requestContext);
  const order = await loadOrderForStaff(context, orderId);
  requirePermission(context, orderReadPermission(order.type));
  const document = await database.documentRecord.findFirst({ where: { id: documentId, tenantId: context.tenantId, diagnosticOrderId: order.id, status: { not: "DELETED" } }, include: { object: true } });
  if (!document || document.object.status !== "AVAILABLE") throw new WonFlowApiError(404, "attachment-not-found", "The attachment could not be found.");
  const bytes = await readFile(documentObjectPath(document.object.objectKey));
  return { document, bytes };
}

// ---- Patient (PatientAccess model, not requirePermission) -----------------

async function resolvePatientOrder(requestContext: WonFlowRequestContext, orderId: string) {
  const context = requireTenantContext(requestContext);
  const access = await database.patientAccess.findFirst({ where: { identityId: context.identityId, isActive: true, patient: { tenantId: context.tenantId, status: "ACTIVE" } }, include: { patient: true }, orderBy: { isPrimary: "desc" } });
  if (!access) throw new WonFlowApiError(403, "patient-access-required", "This account is not linked to an active patient record.");
  const order = await database.diagnosticOrder.findFirst({ where: { id: orderId, tenantId: context.tenantId, patientId: access.patient.id } });
  if (!order) throw new WonFlowApiError(404, "diagnostic-order-not-found", "The diagnostic order could not be found.");
  return { context, patient: access.patient, order };
}

export async function uploadPatientDiagnosticAttachment(requestContext: WonFlowRequestContext, orderId: string, file: File) {
  const { context, patient, order } = await resolvePatientOrder(requestContext, orderId);
  if (order.status === "CANCELLED" || order.status === "ENTERED_IN_ERROR") throw new WonFlowApiError(409, "diagnostic-order-not-open", "This test is no longer open for attachments.");
  const bytes = await validateUpload(file);
  const { objectKey, checksum, scanResult } = await persistUploadedDocumentBytes({ tenantId: context.tenantId, patientId: patient.id, bytes });
  return database.$transaction(async (transaction) => {
    const object = await transaction.storedObject.create({ data: { tenantId: context.tenantId, objectKey, status: scanResult === "CLEAN" ? "AVAILABLE" : "QUARANTINED", contentType: file.type, sizeBytes: BigInt(file.size), checksum } });
    const document = await transaction.documentRecord.create({ data: { tenantId: context.tenantId, patientId: patient.id, objectId: object.id, diagnosticOrderId: order.id, category: ATTACHMENT_CATEGORY, title: file.name || "Attachment", status: "AVAILABLE" }, include: { object: true } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: order.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "patient.diagnostic-attachment.uploaded", entityType: "diagnostic-order", entityId: order.id, severity: scanResult === "CLEAN" ? "INFORMATION" : "CRITICAL", metadata: { scanResult, documentId: document.id }, sourceApplication: context.sourceApplication } });
    return { document: attachmentView(document), scanResult };
  });
}

export async function readPatientDiagnosticAttachmentBytes(requestContext: WonFlowRequestContext, orderId: string, documentId: string) {
  const { context, order } = await resolvePatientOrder(requestContext, orderId);
  const document = await database.documentRecord.findFirst({ where: { id: documentId, tenantId: context.tenantId, diagnosticOrderId: order.id, status: { not: "DELETED" } }, include: { object: true } });
  if (!document || document.object.status !== "AVAILABLE") throw new WonFlowApiError(404, "attachment-not-found", "The attachment could not be found.");
  const bytes = await readFile(documentObjectPath(document.object.objectKey));
  return { document, bytes };
}
