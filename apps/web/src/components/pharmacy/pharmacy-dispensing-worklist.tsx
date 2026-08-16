"use client";

import { useState } from "react";

import { useWonFlowSession } from "@/app/_providers";
import { useInventoryItem, useDispensePrescription, usePrescriptionQueue } from "@/lib/api/pharmacy";
import type { PrescriptionQueueRecord } from "@/lib/api/pharmacy";

function remainingQuantity(item: PrescriptionQueueRecord["items"][number]): number {
  const dispensed = item.dispenseItems.reduce((sum, x) => sum + Number(x.quantity), 0);
  return Math.max(0, Number(item.quantity ?? 0) - dispensed);
}

function BatchPicker({ medicationId, onPick }: { medicationId: string; onPick: (batchId: string, available: number) => void }) {
  const detail = useInventoryItem(medicationId);
  if (detail.status === "loading") return <p className="text-xs text-slate-500">Loading batches…</p>;
  const available = (detail.data?.batches ?? []).filter((batch) => batch.status === "AVAILABLE" && Number(batch.quantity) > 0);
  if (!available.length) return <p className="text-xs font-bold text-red-700">No available stock for this medication.</p>;
  return (
    <select className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => { const batch = available.find((b) => b.id === e.target.value); if (batch) onPick(batch.id, Number(batch.quantity)); }} defaultValue="">
      <option disabled value="">Select a batch (earliest expiry first)</option>
      {available.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNumber} — {batch.quantity} available, expires {new Date(batch.expiryDate).toLocaleDateString("en-PK")}</option>)}
    </select>
  );
}

export function PharmacyDispensingWorklist() {
  const session = useWonFlowSession();
  const queue = usePrescriptionQueue();
  const [activePrescriptionId, setActivePrescriptionId] = useState("");
  const [selections, setSelections] = useState<Record<string, { batchId: string; quantity: string; available: number }>>({});
  const [complete, setComplete] = useState(true);
  const [error, setError] = useState("");
  const dispense = useDispensePrescription();

  const active = queue.data?.prescriptions.find((p) => p.id === activePrescriptionId);

  async function submit() {
    setError("");
    if (!active) return;
    const items = active.items
      .filter((item) => selections[item.id]?.batchId)
      .map((item) => ({ prescriptionItemId: item.id, inventoryBatchId: selections[item.id].batchId, quantity: selections[item.id].quantity }));
    if (!items.length) { setError("Select a batch and quantity for at least one item."); return; }
    for (const item of active.items) {
      const selection = selections[item.id];
      if (!selection) continue;
      const quantity = Number(selection.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) { setError("Enter a valid quantity for each selected item."); return; }
      if (quantity > selection.available) { setError(`Cannot dispense more than the ${selection.available} units available in the selected batch.`); return; }
      if (quantity > remainingQuantity(item)) { setError("Cannot dispense more than what remains prescribed."); return; }
    }
    try {
      await dispense.mutate({ prescriptionId: active.id, complete, items });
      setActivePrescriptionId("");
      setSelections({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The dispense could not be completed.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="rounded-3xl bg-gradient-to-r from-emerald-700 to-teal-700 p-6 text-white">
        <h1 className="text-2xl font-black">Dispensing worklist</h1>
        <p className="mt-1 text-sm text-emerald-100">Dispensing by: {session?.name ?? "—"}</p>
      </header>

      {queue.status === "loading" ? <p className="text-sm text-slate-500">Loading queue…</p> : null}
      {queue.status === "empty" ? <p className="text-sm text-slate-500">No prescriptions awaiting dispensing.</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-4">
          <h2 className="font-black">Queue</h2>
          <div className="mt-2 space-y-2">
            {(queue.data?.prescriptions ?? []).map((prescription) => (
              <button className={`block w-full rounded-xl border p-3 text-left text-sm ${activePrescriptionId === prescription.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200"}`} key={prescription.id} onClick={() => { setActivePrescriptionId(prescription.id); setSelections({}); setError(""); }} type="button">
                <p className="font-bold">{prescription.patient.givenName} {prescription.patient.familyName} · {prescription.patient.patientNumber}</p>
                <p className="text-xs text-slate-500">{prescription.items.length} item(s) · {prescription.status}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4">
          <h2 className="font-black">Dispense</h2>
          {error ? <p className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
          {!active ? <p className="mt-2 text-sm text-slate-500">Select a prescription from the queue.</p> : (
            <div className="mt-2 space-y-3">
              {active.items.map((item) => {
                const remaining = remainingQuantity(item);
                if (remaining <= 0) return null;
                return (
                  <div className="rounded-xl border border-slate-100 p-3" key={item.id}>
                    <p className="text-sm font-bold">{item.medication.genericName} — {item.dose}, {item.frequency}</p>
                    <p className="text-xs text-slate-500">Remaining to dispense: {remaining}</p>
                    <BatchPicker medicationId={item.medicationId} onPick={(batchId, available) => setSelections((cur) => ({ ...cur, [item.id]: { batchId, available, quantity: cur[item.id]?.quantity ?? String(Math.min(remaining, available)) } }))} />
                    {selections[item.id]?.batchId ? (
                      <input className="mt-2 w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm" min="1" onChange={(e) => setSelections((cur) => ({ ...cur, [item.id]: { ...cur[item.id], quantity: e.target.value } }))} type="number" value={selections[item.id].quantity} />
                    ) : null}
                  </div>
                );
              })}
              <label className="flex items-center gap-2 text-sm font-bold">
                <input checked={complete} onChange={(e) => setComplete(e.target.checked)} type="checkbox" />
                Mark prescription fully dispensed
              </label>
              <button className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={dispense.saveState === "saving"} onClick={() => void submit()} type="button">
                {dispense.saveState === "saving" ? "Dispensing…" : "Dispense"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
