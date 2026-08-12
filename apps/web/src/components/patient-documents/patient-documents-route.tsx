"use client";

import type { BeginPatientDocumentUploadResult, PatientDocumentTimelineItem } from "@wonflow/mock-data";
import type { PatientDocumentScreenModel } from "./patient-document-model";
import type { PatientDocumentUploadTransport } from "./resumable-patient-document-upload";
import { PatientDocumentsScreen } from "./patient-documents-screen";

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error("The document operation could not be completed.");
  return response.json() as Promise<T>;
}

export function PatientDocumentsRoute({ initialModel }: { initialModel: PatientDocumentScreenModel }) {
  const transport: PatientDocumentUploadTransport = {
    beginUpload: (input, signal) => fetch("/api/patient/documents/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), signal }).then((response) => json<BeginPatientDocumentUploadResult>(response)),
    uploadChunk: (input, bytes, signal) => fetch(`/api/patient/documents/uploads/${encodeURIComponent(input.uploadId)}/chunks/${input.chunkIndex}`, { method: "PUT", headers: { "x-upload-metadata": JSON.stringify(input) }, body: bytes, signal }).then((response) => json<{ nextChunkIndex: number; uploadedBytes: number; totalBytes: number }>(response)),
    completeUpload: (input, signal) => fetch(`/api/patient/documents/uploads/${encodeURIComponent(input.uploadId)}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), signal }).then((response) => json<PatientDocumentTimelineItem>(response)),
  };
  return <PatientDocumentsScreen initialModel={initialModel} refresh={() => fetch("/api/patient/documents", { cache: "no-store" }).then((response) => json<PatientDocumentScreenModel>(response))} requestReadAccess={(documentId) => fetch(`/api/patient/documents/${encodeURIComponent(documentId)}/access`, { method: "POST" }).then((response) => json<{ accessToken: string }>(response))} transport={transport}/>;
}
