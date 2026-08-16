"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  ScanLine,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DoctorPageHeader } from "@/components/doctor/doctor-page-header";

import { DiagnosticAttachmentsPanel, Pill, patientNameOf, readApiError } from "./diagnostics-workspace";
import type { DiagnosticOrder, DiagnosticType } from "./diagnostics-workspace";

interface ClinicianResult {
  id: string;
  status: string;
  critical: boolean;
  criticalNotes: string | null;
  reportText: string | null;
  releasedAt: string | null;
  acknowledgedAt: string | null;
}

type ClinicianOrder = Omit<DiagnosticOrder, "results"> & { results: ClinicianResult[] };

const formatDateTime = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

const COPY = {
  LABORATORY: { title: "Laboratory Results", noun: "result", icon: FlaskConical },
  RADIOLOGY: { title: "Radiology Reports", noun: "report", icon: ScanLine },
} as const;

export function ClinicianResultsWorkspace({ type }: { type: DiagnosticType }) {
  const copy = COPY[type];
  const [orders, setOrders] = useState<ClinicianOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/diagnostics/clinician-results?type=${type}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));
      setOrders((await response.json() as { orders: ClinicianOrder[] }).orders);
    } catch (cause) {
      setOrders([]);
      setError(cause instanceof Error ? cause.message : `Your ${copy.noun}s could not be loaded.`);
    } finally {
      setLoading(false);
    }
  }, [copy.noun, type]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const pending = useMemo(
    () => orders.filter((order) => order.results.some((result) => !result.acknowledgedAt)).length,
    [orders],
  );
  const critical = useMemo(
    () => orders.filter((order) => order.results.some((result) => result.critical && !result.acknowledgedAt)).length,
    [orders],
  );

  async function acknowledge(orderId: string, resultId: string) {
    setBusyId(resultId);
    setError("");
    try {
      const response = await fetch(`/api/v1/diagnostics/orders/${encodeURIComponent(orderId)}/result/${encodeURIComponent(resultId)}/acknowledge`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(await readApiError(response));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The acknowledgement could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-5">
      <DoctorPageHeader
        description={`${copy.title} released to you by the diagnostics department, newest first.`}
        icon={<copy.icon size={18} />}
        title={copy.title}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {([["Released to you", orders.length], ["Awaiting your review", pending], ["Critical unreviewed", critical]] as const).map(([label, value]) => (
          <div className="relative overflow-hidden rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-white via-white to-indigo-50/40 p-4 shadow-[0_12px_32px_rgba(79,70,229,0.08)]" key={label}>
            <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${label === "Critical unreviewed" && value > 0 ? "from-red-500 to-orange-500" : "from-indigo-500 to-violet-500"}`} />
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
            <div className={`mt-2 text-3xl font-black tabular-nums ${label === "Critical unreviewed" && value > 0 ? "text-red-600" : value === 0 ? "text-slate-300" : "text-slate-900"}`}>{value}</div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertTriangle aria-hidden className="size-4 shrink-0" />
          {error}
          <button className="underline underline-offset-4" onClick={() => void load()} type="button">Try again</button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((key) => <div className="h-40 animate-pulse rounded-[22px] border border-indigo-100/80 bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/60" key={key} />)}
        </div>
      ) : null}

      {!loading && orders.length === 0 ? (
        <div className="flex flex-col items-center rounded-[22px] border border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/40 px-6 py-14 text-center shadow-[0_16px_42px_rgba(79,70,229,0.12)]">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
            <copy.icon aria-hidden className="size-6" />
          </span>
          <p className="mt-3 text-lg font-black text-slate-900">No {copy.noun}s released yet</p>
          <p className="mt-1 text-sm text-slate-500">
            When the department releases a {copy.noun} for a patient you ordered for, it appears here.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {orders.map((order) => (
          <article className="overflow-hidden rounded-[22px] border border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/40 shadow-[0_16px_42px_rgba(79,70,229,0.12)]" key={order.id}>
            <header className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden bg-gradient-to-r from-indigo-100 via-violet-50 to-cyan-100 px-5 py-4">
              <div className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-cyan-300/30 blur-2xl" />
              <div className="relative flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20"><copy.icon aria-hidden className="size-4" /></span>
                <div className="min-w-0">
                  <h2 className="font-black text-slate-950">{order.name}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {order.code} · {patientNameOf(order.patient)} ({order.patient.patientNumber})
                  </p>
                </div>
              </div>
              {order.results.some((result) => result.critical) ? <Pill icon={AlertTriangle} tone="red">Critical</Pill> : null}
            </header>

            <div className="space-y-4 p-5">
              {order.results.map((result) => (
                <div key={result.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Released {formatDateTime(result.releasedAt)}</span>
                    {result.acknowledgedAt ? (
                      <Pill icon={CheckCircle2} tone="emerald">Reviewed {formatDateTime(result.acknowledgedAt)}</Pill>
                    ) : (
                      <button
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
                        disabled={busyId === result.id}
                        onClick={() => void acknowledge(order.id, result.id)}
                        type="button"
                      >
                        <ClipboardCheck aria-hidden className="size-4" />
                        {busyId === result.id ? "Saving…" : "Mark as reviewed"}
                      </button>
                    )}
                  </div>

                  {result.critical && result.criticalNotes ? (
                    <p className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                      {result.criticalNotes}
                    </p>
                  ) : null}

                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-sm text-slate-700">
                    {result.reportText ?? "Released without narrative notes."}
                  </pre>
                </div>
              ))}

              <DiagnosticAttachmentsPanel attachments={order.attachments} canDelete={false} onChange={() => void load()} orderId={order.id} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
