"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DocumentItem { id: string; title: string; category: string; status: string; createdAt: string; object: { contentType: string; sizeBytes: string; status: string } }
interface UploadSession { uploadId: string; nextChunkIndex: number; receivedBytes: string; totalSizeBytes: string; chunkSizeBytes: number; status: string; expiresAt: string }

const CHUNK_SIZE_BYTES = 1 * 1024 * 1024;

function objectStatusLabel(status: string) {
  if (status === "PENDING") return "Pending virus scan";
  if (status === "QUARANTINED") return "Failed security scan — cannot be opened";
  if (status === "AVAILABLE") return null;
  return status;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "The request could not be completed.");
  return body;
}

export default function PatientDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadState, setUploadState] = useState<{ phase: "idle" | "uploading" | "resuming" | "scanning" } | { phase: "error"; message: string; canResume: boolean }>({ phase: "idle" });
  const [progress, setProgress] = useState(0);
  // In-memory only — kept for the lifetime of this tab so a dropped-connection retry can resume
  // from the last acknowledged chunk instead of restarting. Browser storage is not used here
  // (per this app's client-storage policy); a hard page reload always requires reselecting the file,
  // the same as any resumable-upload implementation that doesn't cache raw file bytes locally.
  const pendingUpload = useRef<{ file: File; uploadId: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = await readJson<{ documents: DocumentItem[] }>(await fetch("/api/v1/patient/documents", { cache: "no-store" }));
      setDocuments(body.documents);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Documents could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const uploadChunks = useCallback(async (file: File, uploadId: string, fromChunkIndex: number, chunkSizeBytes: number, totalChunks: number) => {
    for (let index = fromChunkIndex; index < totalChunks; index += 1) {
      const start = index * chunkSizeBytes;
      const chunk = file.slice(start, start + chunkSizeBytes);
      const response = await fetch(`/api/v1/patient/documents/uploads/${uploadId}/chunks/${index}`, { method: "PUT", body: chunk });
      await readJson<{ upload: UploadSession }>(response);
      setProgress(Math.round(((index + 1) / totalChunks) * 100));
    }
  }, []);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) return;
    const title = String(new FormData(form).get("title") ?? "");
    const category = String(new FormData(form).get("category") ?? "");
    setError("");
    setProgress(0);
    setUploadState({ phase: "uploading" });
    try {
      const beginBody = await readJson<{ upload: UploadSession }>(await fetch("/api/v1/patient/documents/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, title, category, totalSizeBytes: file.size, chunkSizeBytes: CHUNK_SIZE_BYTES }),
      }));
      const uploadId = beginBody.upload.uploadId;
      pendingUpload.current = { file, uploadId };
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES) || 1;
      await uploadChunks(file, uploadId, 0, CHUNK_SIZE_BYTES, totalChunks);
      setUploadState({ phase: "scanning" });
      const completeBody = await readJson<{ scanResult: "CLEAN" | "INFECTED" }>(await fetch(`/api/v1/patient/documents/uploads/${uploadId}/complete`, { method: "POST" }));
      pendingUpload.current = null;
      form.reset();
      setUploadState({ phase: "idle" });
      if (completeBody.scanResult === "INFECTED") setError("This file failed a security scan and has been quarantined — it cannot be opened.");
      await load();
    } catch (cause) {
      setUploadState({ phase: "error", message: cause instanceof Error ? cause.message : "The upload was interrupted.", canResume: pendingUpload.current !== null });
    }
  }

  async function resumeUpload() {
    const pending = pendingUpload.current;
    if (!pending) return;
    setUploadState({ phase: "resuming" });
    try {
      // The server, not the browser, is the source of truth for how much of the file already arrived.
      const status = await readJson<{ upload: UploadSession }>(await fetch(`/api/v1/patient/documents/uploads/${pending.uploadId}`, { cache: "no-store" }));
      const totalChunks = Math.ceil(pending.file.size / status.upload.chunkSizeBytes) || 1;
      setUploadState({ phase: "uploading" });
      await uploadChunks(pending.file, pending.uploadId, status.upload.nextChunkIndex, status.upload.chunkSizeBytes, totalChunks);
      setUploadState({ phase: "scanning" });
      const completeBody = await readJson<{ scanResult: "CLEAN" | "INFECTED" }>(await fetch(`/api/v1/patient/documents/uploads/${pending.uploadId}/complete`, { method: "POST" }));
      pendingUpload.current = null;
      setUploadState({ phase: "idle" });
      if (completeBody.scanResult === "INFECTED") setError("This file failed a security scan and has been quarantined — it cannot be opened.");
      await load();
    } catch (cause) {
      setUploadState({ phase: "error", message: cause instanceof Error ? cause.message : "The upload was interrupted.", canResume: true });
    }
  }

  async function openDocument(document: DocumentItem) {
    setError("");
    try {
      const body = await readJson<{ url: string }>(await fetch(`/api/v1/patient/documents/${document.id}/access`, { method: "POST" }));
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This document could not be opened.");
    }
  }

  const busy = uploadState.phase === "uploading" || uploadState.phase === "resuming" || uploadState.phase === "scanning";

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-100">Patient portal</p>
        <h1 className="mt-2 text-3xl font-black">My health documents</h1>
        <p className="mt-2 text-sm text-violet-100">Upload reports and supporting medical records for your authorized care team. Every document is scanned before it can be opened, and each &quot;Open&quot; link works once.</p>
      </header>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}

      <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2" onSubmit={(event) => void upload(event)}>
        <div className="md:col-span-2">
          <h2 className="text-lg font-black">Upload a report</h2>
          <p className="text-xs text-slate-500">PDF, JPG, PNG or WebP · maximum 10 MB · uploaded in chunks so a dropped connection can resume</p>
        </div>
        <label className="text-xs font-bold">Document title<input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" disabled={busy} name="title" placeholder="e.g. Previous laboratory report" required /></label>
        <label className="text-xs font-bold">Category<select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" disabled={busy} name="category">
          <option value="LABORATORY_REPORT">Laboratory report</option>
          <option value="RADIOLOGY_REPORT">Radiology report</option>
          <option value="PRESCRIPTION">Prescription</option>
          <option value="DISCHARGE_SUMMARY">Discharge summary</option>
          <option value="PREVIOUS_MEDICAL_HISTORY">Previous medical history</option>
          <option value="OTHER_MEDICAL_RECORD">Other medical record</option>
        </select></label>
        <input accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.tiff,.heic,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*" capture="environment" className="md:col-span-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-4" disabled={busy} name="file" required type="file" />

        {uploadState.phase === "uploading" || uploadState.phase === "resuming" ? (
          <div className="md:col-span-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="mt-1 text-xs font-bold text-slate-500">{uploadState.phase === "resuming" ? "Resuming from where we left off…" : `Uploading… ${progress}%`}</p>
          </div>
        ) : null}
        {uploadState.phase === "scanning" ? <p className="md:col-span-2 text-xs font-bold text-slate-500">Scanning for threats…</p> : null}
        {uploadState.phase === "error" ? (
          <div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-bold text-amber-800">{uploadState.message}</p>
            {uploadState.canResume ? (
              <button className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-black text-white" onClick={() => void resumeUpload()} type="button">Resume upload</button>
            ) : null}
          </div>
        ) : null}

        <button className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50 md:col-span-2" disabled={busy} type="submit">{busy ? "Uploading securely…" : "Upload document"}</button>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Document history</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : documents.length ? (
          <div className="mt-4 space-y-3">
            {documents.map((document) => {
              const blockedLabel = objectStatusLabel(document.object.status);
              return (
                <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4" key={document.id}>
                  <div>
                    <div className="font-black">{document.title}</div>
                    <div className="text-xs text-slate-500">{document.category.replaceAll("_", " ")} · {document.status} · {new Date(document.createdAt).toLocaleDateString("en-PK")}</div>
                    {blockedLabel ? <div className="mt-1 text-xs font-black text-amber-700">{blockedLabel}</div> : null}
                  </div>
                  {blockedLabel ? (
                    <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-400">Open</span>
                  ) : (
                    <button className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700" onClick={() => void openDocument(document)} type="button">Open</button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">No documents uploaded yet.</p>
        )}
      </section>
    </div>
  );
}
