"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

type PaymentAccountMethod = "BANK_TRANSFER" | "JAZZCASH" | "EASYPAISA";

interface PaymentAccountView {
  id: string;
  method: PaymentAccountMethod;
  bankName: string | null;
  accountTitle: string;
  accountNumber: string;
  iban: string | null;
}

interface PaymentInfo {
  appointmentId: string;
  serviceName: string;
  priceMinorUnits: number | null;
  currencyCode: string;
  paymentStatus: "NOT_REQUIRED" | "AWAITING_PAYMENT" | "PAYMENT_CONFIRMED";
  proofUploaded: boolean;
  accounts: PaymentAccountView[];
}

interface UploadSession { uploadId: string; nextChunkIndex: number; receivedBytes: string; totalSizeBytes: string; chunkSizeBytes: number; status: string; expiresAt: string }

const CHUNK_SIZE_BYTES = 1 * 1024 * 1024;
const METHOD_LABELS: Record<PaymentAccountMethod, string> = { BANK_TRANSFER: "Bank transfer", JAZZCASH: "JazzCash", EASYPAISA: "Easypaisa" };

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "The request could not be completed.");
  return body;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold text-slate-900">{value}</p>
      </div>
      <button
        className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:border-blue-300 hover:text-blue-700"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        title={`Copy ${label.toLowerCase()}`}
        type="button"
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}

export function PatientAppointmentPaymentScreen({ appointmentId }: { appointmentId: string }) {
  const [payment, setPayment] = useState<PaymentInfo | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uploadState, setUploadState] = useState<{ phase: "idle" | "uploading" | "scanning" | "linking" } | { phase: "error"; message: string; canResume: boolean }>({ phase: "idle" });
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const pendingUpload = useRef<{ file: File; uploadId: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const body = await readJson<{ payment: PaymentInfo }>(await fetch(`/api/v1/patient/appointments/${appointmentId}/payment`, { cache: "no-store" }));
      setPayment(body.payment);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "This payment could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

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
    setMessage("");
    setProgress(0);
    setUploadState({ phase: "uploading" });
    try {
      const beginBody = await readJson<{ upload: UploadSession }>(await fetch("/api/v1/patient/documents/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: file.name, contentType: file.type, title: `Payment proof — appointment ${appointmentId}`,
          category: "PAYMENT_PROOF", totalSizeBytes: file.size, chunkSizeBytes: CHUNK_SIZE_BYTES,
        }),
      }));
      const uploadId = beginBody.upload.uploadId;
      pendingUpload.current = { file, uploadId };
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES) || 1;
      await uploadChunks(file, uploadId, 0, CHUNK_SIZE_BYTES, totalChunks);
      setUploadState({ phase: "scanning" });
      const completeBody = await readJson<{ document: { id: string }; scanResult: "CLEAN" | "INFECTED" }>(await fetch(`/api/v1/patient/documents/uploads/${uploadId}/complete`, { method: "POST" }));
      if (completeBody.scanResult === "INFECTED") {
        pendingUpload.current = null;
        setUploadState({ phase: "error", message: "This file failed a security scan and cannot be used as proof. Try a clearer photo or a different file.", canResume: false });
        return;
      }
      setUploadState({ phase: "linking" });
      await readJson(await fetch(`/api/v1/patient/appointments/${appointmentId}/payment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: completeBody.document.id }),
      }));
      pendingUpload.current = null;
      form.reset();
      setUploadState({ phase: "idle" });
      setMessage("Payment proof uploaded. The doctor confirms it before your appointment is finalized.");
      await load();
    } catch (cause) {
      setUploadState({ phase: "error", message: cause instanceof Error ? cause.message : "The upload was interrupted.", canResume: pendingUpload.current !== null });
    }
  }

  async function resumeUpload() {
    const pending = pendingUpload.current;
    if (!pending) return;
    setUploadState({ phase: "uploading" });
    try {
      const status = await readJson<{ upload: UploadSession }>(await fetch(`/api/v1/patient/documents/uploads/${pending.uploadId}`, { cache: "no-store" }));
      const totalChunks = Math.ceil(pending.file.size / status.upload.chunkSizeBytes) || 1;
      await uploadChunks(pending.file, pending.uploadId, status.upload.nextChunkIndex, status.upload.chunkSizeBytes, totalChunks);
      setUploadState({ phase: "scanning" });
      const completeBody = await readJson<{ document: { id: string }; scanResult: "CLEAN" | "INFECTED" }>(await fetch(`/api/v1/patient/documents/uploads/${pending.uploadId}/complete`, { method: "POST" }));
      if (completeBody.scanResult === "INFECTED") {
        pendingUpload.current = null;
        setUploadState({ phase: "error", message: "This file failed a security scan and cannot be used as proof.", canResume: false });
        return;
      }
      setUploadState({ phase: "linking" });
      await readJson(await fetch(`/api/v1/patient/appointments/${appointmentId}/payment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: completeBody.document.id }),
      }));
      pendingUpload.current = null;
      setUploadState({ phase: "idle" });
      setMessage("Payment proof uploaded. The doctor confirms it before your appointment is finalized.");
      await load();
    } catch (cause) {
      setUploadState({ phase: "error", message: cause instanceof Error ? cause.message : "The upload was interrupted.", canResume: true });
    }
  }

  const busy = uploadState.phase === "uploading" || uploadState.phase === "scanning" || uploadState.phase === "linking";

  if (loading) {
    return <main className="mx-auto max-w-xl px-4 py-8" id="main-content"><p className="text-sm text-slate-500">Loading…</p></main>;
  }

  if (loadError || !payment) {
    return (
      <main className="mx-auto max-w-xl px-4 py-8" id="main-content">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{loadError || "This appointment payment could not be found."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8" id="main-content">
      <Link className="text-sm font-black text-blue-700" href="/patient/appointments">← Appointment details</Link>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-black uppercase text-slate-500">Secure appointment payment</p>
        <h1 className="mt-2 text-2xl font-black">{payment.serviceName}</h1>
        <p className="mt-3 text-lg font-black">
          {payment.priceMinorUnits === null ? "Fee confirmed by hospital" : new Intl.NumberFormat("en-PK", { style: "currency", currency: payment.currencyCode, maximumFractionDigits: 0 }).format(payment.priceMinorUnits / 100)}
        </p>

        {payment.paymentStatus === "PAYMENT_CONFIRMED" ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Payment confirmed. Your appointment is fully booked.</p>
        ) : (
          <>
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
              {payment.proofUploaded
                ? "Not yet confirmed — your proof is waiting for the doctor to review it."
                : "Not yet confirmed. Send payment to one of the accounts below, then upload your payment screenshot or receipt."}
            </p>

            {payment.accounts.length === 0 ? (
              <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No payment account is currently configured. Contact the hospital for payment instructions.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {payment.accounts.map((account) => (
                  <div className="rounded-xl border border-slate-200 p-3" key={account.id}>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">{METHOD_LABELS[account.method]}{account.bankName ? ` · ${account.bankName}` : ""}</p>
                    <div className="mt-2 space-y-1.5">
                      <CopyField label="Account title" value={account.accountTitle} />
                      <CopyField label="Account number" value={account.accountNumber} />
                      {account.iban ? <CopyField label="IBAN" value={account.iban} /> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}

            <form className="mt-5 space-y-3 border-t border-slate-100 pt-4" onSubmit={(event) => void upload(event)}>
              <p className="text-sm font-bold text-slate-800">{payment.proofUploaded ? "Replace payment proof" : "Upload payment proof"}</p>
              <p className="text-xs text-slate-500">Screenshot or receipt · PDF, JPG, PNG or WebP · uploaded in chunks so a dropped connection can resume</p>
              <input accept="application/pdf,image/jpeg,image/png,image/webp" capture="environment" className="w-full rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-4" disabled={busy} name="file" required type="file" />

              {uploadState.phase === "uploading" ? (
                <div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} /></div>
                  <p className="mt-1 text-xs font-bold text-slate-500">Uploading… {progress}%</p>
                </div>
              ) : null}
              {uploadState.phase === "scanning" ? <p className="text-xs font-bold text-slate-500">Scanning for threats…</p> : null}
              {uploadState.phase === "linking" ? <p className="text-xs font-bold text-slate-500">Attaching to your appointment…</p> : null}
              {uploadState.phase === "error" ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-bold text-amber-800">{uploadState.message}</p>
                  {uploadState.canResume ? (
                    <button className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-black text-white" onClick={() => void resumeUpload()} type="button">Resume upload</button>
                  ) : null}
                </div>
              ) : null}

              <button className="min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50" disabled={busy} type="submit">
                {busy ? "Uploading securely…" : payment.proofUploaded ? "Upload replacement proof" : "Upload payment proof"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
