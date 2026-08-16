"use client";

import { useEffect, useState } from "react";

import { readApiError } from "./diagnostics-workspace";
import type { DiagnosticOrder } from "./diagnostics-workspace";

/** A patient's laboratory history — released results only, fetched fresh from the server every load. */
export function PatientLaboratoryTimeline({ patientId }: { patientId: string }) {
  const [orders, setOrders] = useState<DiagnosticOrder[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        const response = await fetch(`/api/v1/diagnostics/patients/${patientId}/results?type=LABORATORY`, { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) { setError(await readApiError(response)); return; }
        const body = await response.json() as { orders: DiagnosticOrder[] };
        setOrders(body.orders);
      })();
    });
  }, [patientId]);

  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!orders) return <p className="text-sm text-slate-500">Loading laboratory history…</p>;
  if (!orders.length) return <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">No released laboratory results yet.</p>;

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <article className="rounded-2xl border border-slate-200 bg-white p-4" key={order.id}>
          <div className="flex items-center justify-between">
            <p className="font-black">{order.name}</p>
            <span className="text-xs text-slate-500">{order.accessionNumber}</span>
          </div>
          {order.results.filter((result) => result.releasedAt).map((result) => (
            <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm" key={result.id}>
              {result.critical ? <p className="mb-1 font-black text-red-700">Critical — {result.criticalNotes}</p> : null}
              <p className="whitespace-pre-wrap">{result.reportText ?? "Structured result released."}</p>
              <p className="mt-1 text-xs text-slate-400">Released {new Date(result.releasedAt!).toLocaleDateString("en-PK")}</p>
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}
