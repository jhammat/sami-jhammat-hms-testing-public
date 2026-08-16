import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Shared by every place in the app that turns uploaded bytes into a
 * StoredObject on disk: the patient's own document locker, a doctor
 * attaching a file to a patient's record, and diagnostic-order
 * attachments (lab/radiology staff, the ordering doctor, or the patient).
 */

export const documentStorageRoot = path.join(process.cwd(), ".wonflow-private", "patient-documents");
export const documentUploadStagingRoot = path.join(process.cwd(), ".wonflow-private", "patient-document-uploads");

export const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/rtf",
  "application/rtf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "application/dicom",
  "application/octet-stream",
]);

export function isAllowedDocumentType(contentType: string, fileName?: string): boolean {
  if (ALLOWED_DOCUMENT_TYPES.has(contentType)) return true;
  if (contentType.startsWith("image/") || contentType.startsWith("text/")) return true;
  if (fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const validExtensions = new Set([
      ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
      ".txt", ".csv", ".rtf", ".md", ".png", ".jpg", ".jpeg", ".webp",
      ".gif", ".bmp", ".svg", ".tiff", ".tif", ".heic", ".heif", ".dcm",
    ]);
    if (validExtensions.has(ext)) return true;
  }
  return false;
}

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

/**
 * No external anti-malware vendor is integrated in this environment. The
 * EICAR test string is the real, industry-standard signature anti-virus
 * engines themselves use to self-test — detecting it here is a genuine
 * (if minimal) scan, not a simulated pass. Anything else is treated as
 * clean; nothing here claims to catch real malware.
 */
const EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export function scanForKnownThreats(bytes: Buffer): "CLEAN" | "INFECTED" {
  return bytes.includes(EICAR_SIGNATURE) ? "INFECTED" : "CLEAN";
}

export function documentObjectPath(objectKey: string): string {
  return path.join(documentStorageRoot, ...objectKey.split("/"));
}

/**
 * Writes already-fully-received bytes to their final, permanent location
 * and scans them. Returns everything a StoredObject row needs — callers
 * decide the surrounding transaction (StoredObject + DocumentRecord +
 * whatever else belongs with it).
 */
export async function persistUploadedDocumentBytes(input: {
  tenantId: string;
  /** Groups objects on disk — the patient the document is about. */
  patientId: string;
  bytes: Buffer;
}): Promise<{ objectKey: string; checksum: string; scanResult: "CLEAN" | "INFECTED" }> {
  const checksum = createHash("sha256").update(input.bytes).digest("hex");
  const objectKey = `${input.tenantId}/${input.patientId}/${randomUUID()}`;
  const finalPath = documentObjectPath(objectKey);
  await mkdir(path.dirname(finalPath), { recursive: true });
  await writeFile(finalPath, input.bytes, { flag: "wx" });
  const scanResult = scanForKnownThreats(input.bytes);
  return { objectKey, checksum, scanResult };
}

/** Same as above, but the bytes are already staged at a temp path (the chunked-upload flow) — moved into place instead of copied. */
export async function finalizeStagedDocumentBytes(input: {
  tenantId: string;
  patientId: string;
  stagedPath: string;
  bytes: Buffer;
}): Promise<{ objectKey: string; checksum: string; scanResult: "CLEAN" | "INFECTED" }> {
  const checksum = createHash("sha256").update(input.bytes).digest("hex");
  const objectKey = `${input.tenantId}/${input.patientId}/${randomUUID()}`;
  const finalPath = documentObjectPath(objectKey);
  await mkdir(path.dirname(finalPath), { recursive: true });
  await rename(input.stagedPath, finalPath);
  const scanResult = scanForKnownThreats(input.bytes);
  return { objectKey, checksum, scanResult };
}
