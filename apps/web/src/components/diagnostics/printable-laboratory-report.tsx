"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import Link from "next/link";

import { WonFlowBrandMark } from "@/components/design";
import { WonFlowActionButton } from "@/components/workspace";
import { readApiError } from "./diagnostics-workspace";
import type { DiagnosticOrder } from "./diagnostics-workspace";

/** Renders strictly from the server order/result — the same record laboratory staff release, never a locally cached copy. */
export function PrintableLaboratoryReport({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<DiagnosticOrder | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        const response = await fetch(`/api/v1/diagnostics/orders/${orderId}`, { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) { setError(await readApiError(response)); return; }
        const body = await response.json() as { order: DiagnosticOrder };
        setOrder(body.order);
      })();
    });
  }, [orderId]);

  if (error) return <p className="p-6 text-sm text-red-700">{error}</p>;
  if (!order) return <p className="p-6 text-sm text-slate-500">Loading report…</p>;
  const released = order.results.filter((result) => result.releasedAt);
  if (!released.length) return <p className="p-6 text-sm text-red-700">No released laboratory result exists for this order.</p>;

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link className="wf-button-secondary" href={`/operations/laboratory/results/${encodeURIComponent(orderId)}`}>Return to Result</Link>
        <WonFlowActionButton icon={<Printer size={17} />} onClick={() => window.print()} variant="primary">Print Laboratory Report</WonFlowActionButton>
      </div>
      <article className="wf-print-report mx-auto max-w-[1000px] bg-white p-8 text-slate-950 shadow-sm print:shadow-none">
        <header className="flex items-center gap-4 border-b-2 border-blue-700 pb-5">
          <WonFlowBrandMark size={54} />
          <div>
            <h1 className="text-2xl font-black tracking-[-0.04em]">WonFlow Laboratory Report</h1>
            <p className="mt-1 text-xs text-slate-500">{order.accessionNumber ?? order.id}</p>
          </div>
        </header>
        <section className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 p-5 text-sm lg:grid-cols-4">
          <div><div className="text-[10px] font-black uppercase text-slate-400">Patient</div><div className="mt-1 font-bold">{[order.patient.givenName, order.patient.familyName].join(" ")} ({order.patient.patientNumber})</div></div>
          <div><div className="text-[10px] font-black uppercase text-slate-400">Test</div><div className="mt-1 font-bold">{order.name}</div></div>
          <div><div className="text-[10px] font-black uppercase text-slate-400">Specimen</div><div className="mt-1 font-bold">{order.specimenOrBodySite ?? "—"}</div></div>
        </section>
        {released.map((result) => (
          <section className="mt-6 rounded-xl border border-slate-200 p-4" key={result.id}>
            {result.critical ? <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-black text-red-700">Critical — {result.criticalNotes}</p> : null}
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{result.reportText ?? JSON.stringify((result as unknown as { resultData?: unknown }).resultData ?? {}, null, 2)}</pre>
            <p className="mt-2 text-xs text-slate-400">Released {new Date(result.releasedAt!).toLocaleString("en-PK")}</p>
          </section>
        ))}
        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">Results must be interpreted in the context of the patient&apos;s clinical presentation.</p>
      </article>
    </div>
  );
}
