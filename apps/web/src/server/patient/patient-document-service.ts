import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";

const storageRoot = path.join(process.cwd(), ".wonflow-private", "patient-documents");
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

async function resolvePatient(requestContext: WonFlowRequestContext) {
  const context = requireTenantContext(requestContext);
  const access = await database.patientAccess.findFirst({ where: { identityId: context.identityId, isActive: true, patient: { tenantId: context.tenantId, status: "ACTIVE" } }, include: { patient: true }, orderBy: { isPrimary: "desc" } });
  if (!access) throw new WonFlowApiError(403, "patient-access-required", "This account is not linked to an active patient record.");
  return { context, patient: access.patient };
}

export async function listPatientDocuments(requestContext: WonFlowRequestContext) {
  const { context, patient } = await resolvePatient(requestContext);
  const documents = await database.documentRecord.findMany({ where: { tenantId: context.tenantId, patientId: patient.id, status: { not: "DELETED" } }, include: { object: { select: { contentType: true, sizeBytes: true } } }, orderBy: { createdAt: "desc" } });
  return documents.map((document) => ({ ...document, object: { ...document.object, sizeBytes: document.object.sizeBytes.toString() } }));
}

export async function uploadPatientDocument(requestContext: WonFlowRequestContext, file: File, title: string, category: string) {
  const { context, patient } = await resolvePatient(requestContext);
  if (!allowedTypes.has(file.type)) throw new WonFlowApiError(415, "unsupported-document-type", "Upload a PDF, JPG, PNG or WebP document.");
  if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new WonFlowApiError(413, "document-size-invalid", "Documents must be between 1 byte and 10 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const objectKey = `${context.tenantId}/${patient.id}/${randomUUID()}`;
  const absolutePath = path.join(storageRoot, ...objectKey.split("/"));
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes, { flag: "wx" });
  return database.$transaction(async (transaction) => {
    const object = await transaction.storedObject.create({ data: { tenantId: context.tenantId, objectKey, status: "AVAILABLE", contentType: file.type, sizeBytes: BigInt(file.size), checksum } });
    const document = await transaction.documentRecord.create({ data: { tenantId: context.tenantId, patientId: patient.id, objectId: object.id, category: category.trim() || "PATIENT_UPLOAD", title: title.trim() || file.name, status: "AVAILABLE" } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: context.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "patient.document.uploaded", entityType: "document", entityId: document.id, severity: "INFORMATION", sourceApplication: context.sourceApplication } });
    return document;
  });
}

export async function readPatientDocument(requestContext: WonFlowRequestContext, documentId: string) {
  const { context, patient } = await resolvePatient(requestContext);
  const document = await database.documentRecord.findFirst({ where: { id: documentId, tenantId: context.tenantId, patientId: patient.id, status: { not: "DELETED" } }, include: { object: true } });
  if (!document || document.object.status !== "AVAILABLE") throw new WonFlowApiError(404, "document-not-found", "The document could not be found.");
  return { document, bytes: await readFile(path.join(storageRoot, ...document.object.objectKey.split("/"))) };
}

export async function listClinicianDocumentPatients(requestContext: WonFlowRequestContext) {
  const context = requireTenantContext(requestContext);
  if (!context.membershipId) throw new WonFlowApiError(403, "clinician-required", "A clinician membership is required.");
  const doctor = await database.doctorProfile.findFirst({ where: { tenantId: context.tenantId, staffProfile: { membershipId: context.membershipId, status: "ACTIVE" } } });
  if (!doctor) throw new WonFlowApiError(403, "doctor-profile-required", "A valid doctor profile is required.");
  return database.patient.findMany({ where: { tenantId: context.tenantId, status: "ACTIVE", encounters: { some: { doctorId: doctor.id } } }, select: { id: true, patientNumber: true, givenName: true, middleName: true, familyName: true, documents: { where: { status: { not: "DELETED" } }, select: { id: true, title: true, category: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } } }, orderBy: [{ givenName: "asc" }, { familyName: "asc" }] });
}

export async function uploadClinicianDocument(requestContext: WonFlowRequestContext, patientId: string, file: File, title: string, category: string) {
  const context = requireTenantContext(requestContext);
  if (!context.membershipId) throw new WonFlowApiError(403, "clinician-required", "A clinician membership is required.");
  const doctor = await database.doctorProfile.findFirst({ where: { tenantId: context.tenantId, staffProfile: { membershipId: context.membershipId, status: "ACTIVE" } } });
  if (!doctor || !await database.encounter.findFirst({ where: { tenantId: context.tenantId, patientId, doctorId: doctor.id } })) throw new WonFlowApiError(403, "patient-care-access-required", "This patient is not assigned to your care.");
  if (!allowedTypes.has(file.type)) throw new WonFlowApiError(415, "unsupported-document-type", "Upload a PDF, JPG, PNG or WebP document.");
  if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new WonFlowApiError(413, "document-size-invalid", "Documents must be between 1 byte and 10 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const objectKey = `${context.tenantId}/${patientId}/${randomUUID()}`;
  const absolutePath = path.join(storageRoot, ...objectKey.split("/"));
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes, { flag: "wx" });
  return database.$transaction(async (transaction) => {
    const object = await transaction.storedObject.create({ data: { tenantId: context.tenantId, objectKey, status: "AVAILABLE", contentType: file.type, sizeBytes: BigInt(file.size), checksum } });
    const document = await transaction.documentRecord.create({ data: { tenantId: context.tenantId, patientId, objectId: object.id, category: category.trim() || "CLINICAL_REPORT", title: title.trim() || file.name, status: "RELEASED", releasedAt: new Date() } });
    await transaction.auditEvent.create({ data: { tenantId: context.tenantId, branchId: context.branchId, actorMembershipId: context.membershipId, sessionId: context.sessionId, requestId: context.requestId, action: "doctor.document.released", entityType: "document", entityId: document.id, severity: "INFORMATION", sourceApplication: context.sourceApplication } });
    await transaction.notification.create({ data: { tenantId: context.tenantId, patientId, channel: "IN_APP", status: "PENDING", templateCode: "clinical-document-released", payload: { documentId: document.id, title: document.title } } });
    return document;
  });
}
