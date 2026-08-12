"use client";
import Link from "next/link";
import { Check, FilePlus2, Files } from "lucide-react";
import { createPatientDocumentUploadPath } from "@/lib/patient/patient-routes";
export interface BookingDocumentOption { id: string; title: string; categoryLabel: string; clinicalDate: string; openable: boolean }
interface Props { required: boolean; availableDocuments: readonly BookingDocumentOption[]; selectedDocumentIds: readonly string[]; returnTo: string; onChange(ids: string[]): void }
export function BookingDocumentRequirementCard({required,availableDocuments,selectedDocumentIds,returnTo,onChange}:Props) {
  if (!required) return null;
  return <section aria-labelledby="booking-document-heading" className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4"><div className="flex gap-3"><Files aria-hidden className="text-violet-700"/><div><h2 id="booking-document-heading" className="text-sm font-black text-violet-950">Supporting document required</h2><p className="mt-1 text-xs font-semibold text-violet-900">Attach at least one clean document before confirming this service.</p></div></div>
    <div className="mt-4 space-y-2">{availableDocuments.length === 0 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">No clean patient documents are available for attachment.</p> : availableDocuments.map((document) => { const selected=selectedDocumentIds.includes(document.id); return <button aria-pressed={selected} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left disabled:opacity-60" disabled={!document.openable} key={document.id} onClick={() => onChange(selected ? selectedDocumentIds.filter((id)=>id!==document.id) : [...selectedDocumentIds,document.id])} type="button"><span className="grid h-7 w-7 place-items-center rounded-full border">{selected ? <Check aria-hidden size={15}/> : null}</span><span className="min-w-0"><span className="block truncate text-sm font-black text-slate-950">{document.title}</span><span className="block text-xs text-slate-600">{document.categoryLabel} · {document.clinicalDate}</span></span></button> })}</div>
    <Link className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-black text-white" href={createPatientDocumentUploadPath({returnTo})}><FilePlus2 aria-hidden size={16}/>Upload another document</Link>
  </section>;
}
