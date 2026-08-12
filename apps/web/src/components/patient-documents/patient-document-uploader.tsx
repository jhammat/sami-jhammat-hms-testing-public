"use client";

import { useRef, useState } from "react";
import type { PatientDocumentActor, PatientDocumentTimelineItem, PatientDocumentUploadPolicy } from "@wonflow/mock-data";
import { validatePatientDocumentFile } from "./patient-document-file-policy";
import { runPatientDocumentUpload, type PatientDocumentUploadTransport } from "./resumable-patient-document-upload";

interface Props { actor: PatientDocumentActor; policy: PatientDocumentUploadPolicy; transport: PatientDocumentUploadTransport; initialRequestId?: string; onUploaded(document: PatientDocumentTimelineItem): void }

export function PatientDocumentUploader({ actor, policy, transport, initialRequestId, onUploaded }: Props) {
  const [file, setFile] = useState<File>();
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const controller = useRef<AbortController | undefined>(undefined);
  async function submit() {
    if (!file) { setErrors(["Choose a file or take a photo first."]); return; }
    const validation = validatePatientDocumentFile(file, policy);
    const next = [...validation.errors];
    if (!category) next.push("Select a document category.");
    if (!date) next.push("Enter the clinical date.");
    if (next.length) { setErrors(next); return; }
    setUploading(true); setErrors([]); controller.current = new AbortController();
    try {
      const document = await runPatientDocumentUpload({ file, actor, metadata: { categoryCode: category, clinicalDate: date, requestId: initialRequestId }, transport, signal: controller.current.signal, onProgress: setProgress });
      onUploaded(document); setFile(undefined); setCategory(""); setDate("");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setErrors([error instanceof Error ? error.message : "The upload could not be completed."]);
    } finally { setUploading(false); }
  }
  return <form className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-black text-slate-700">Document category<select className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3" onChange={(event) => setCategory(event.target.value)} required value={category}><option value="">Select category</option>{policy.categories.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><label className="text-xs font-black text-slate-700">Clinical date<input className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3" onChange={(event) => setDate(event.target.value)} required type="date" value={date}/></label></div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2"><label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed bg-white px-3 text-sm font-black">Choose file<input accept={policy.acceptedMimeTypes.join(",")} className="sr-only" onChange={(event) => setFile(event.target.files?.[0])} type="file"/></label><label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed bg-white px-3 text-sm font-black">Use phone camera<input accept="image/*" capture="environment" className="sr-only" onChange={(event) => setFile(event.target.files?.[0])} type="file"/></label></div>
    {file ? <p className="mt-3 break-all text-xs font-semibold text-slate-700">Selected: {file.name}</p> : null}
    {errors.length ? <ul aria-live="polite" className="mt-3 list-disc pl-5 text-xs font-bold text-rose-700">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
    {uploading ? <progress aria-label="Upload progress" className="mt-4 w-full" max={100} value={progress}/> : null}
    <div className="mt-4 flex gap-2"><button className="min-h-11 flex-1 rounded-xl bg-indigo-700 px-4 text-sm font-black text-white disabled:opacity-50" disabled={uploading} type="submit">Upload document</button>{uploading ? <button className="min-h-11 rounded-xl border px-4 text-sm font-black" onClick={() => controller.current?.abort()} type="button">Pause</button> : null}</div>
  </form>;
}
