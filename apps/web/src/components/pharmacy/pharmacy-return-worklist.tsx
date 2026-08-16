"use client";

import { useState } from "react";

import { useWonFlowSession } from "@/app/_providers";
import { useCreateReturn, useDispenses, useReturns, useUpdateReturn } from "@/lib/api/pharmacy";
import type { DispenseRecord, PackageCondition, ReturnDisposition } from "@/lib/api/pharmacy";

interface LineDraft { dispenseItemId: string; quantity: string; disposition: ReturnDisposition; packageCondition: PackageCondition }

function NewReturnPanel({ dispenses }: { dispenses: DispenseRecord[] }) {
  const [dispenseId, setDispenseId] = useState("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<Record<string, LineDraft>>({});
  const [error, setError] = useState("");
  const createReturn = useCreateReturn();

  const dispense = dispenses.find((candidate) => candidate.id === dispenseId);

  function toggleItem(itemId: string, checked: boolean) {
    setLines((current) => {
      if (!checked) { const rest = { ...current }; delete rest[itemId]; return rest; }
      return { ...current, [itemId]: { dispenseItemId: itemId, quantity: "1", disposition: "RESTOCK", packageCondition: "SEALED" } };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!dispense) { setError("Select a dispense to return against."); return; }
    if (!reason.trim()) { setError("A reason is required."); return; }
    const selectedLines = Object.values(lines);
    if (!selectedLines.length) { setError("Select at least one item to return."); return; }
    try {
      await createReturn.mutate({ dispenseId: dispense.id, reason: reason.trim(), lines: selectedLines.map((line) => ({ ...line, quantity: Number(line.quantity) })) });
      setDispenseId(""); setReason(""); setLines({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The return could not be requested.");
    }
  }

  return (
    <form className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5" onSubmit={submit}>
      <h2 className="text-lg font-black">Request a return</h2>
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
      <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(e) => { setDispenseId(e.target.value); setLines({}); }} value={dispenseId}>
        <option value="">Select a completed dispense</option>
        {dispenses.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.patient.givenName} {candidate.patient.familyName} ({candidate.patient.patientNumber}) — {candidate.items.length} item(s)</option>)}
      </select>

      {dispense ? (
        <div className="space-y-2">
          {dispense.items.map((item) => {
            const selected = lines[item.id];
            return (
              <div className="rounded-xl border border-slate-100 p-3" key={item.id}>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input checked={Boolean(selected)} onChange={(e) => toggleItem(item.id, e.target.checked)} type="checkbox" />
                  {item.medication.genericName} — dispensed {item.quantity}
                </label>
                {selected ? (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <input className="rounded-lg border border-slate-200 px-2 py-1 text-sm" min="1" onChange={(e) => setLines((cur) => ({ ...cur, [item.id]: { ...cur[item.id], quantity: e.target.value } }))} type="number" value={selected.quantity} />
                    <select className="rounded-lg border border-slate-200 px-2 py-1 text-sm" onChange={(e) => setLines((cur) => ({ ...cur, [item.id]: { ...cur[item.id], disposition: e.target.value as ReturnDisposition } }))} value={selected.disposition}>
                      <option value="RESTOCK">Restock</option>
                      <option value="QUARANTINE">Quarantine</option>
                      <option value="DESTROY">Destroy</option>
                    </select>
                    <select className="rounded-lg border border-slate-200 px-2 py-1 text-sm" onChange={(e) => setLines((cur) => ({ ...cur, [item.id]: { ...cur[item.id], packageCondition: e.target.value as PackageCondition } }))} value={selected.packageCondition}>
                      <option value="SEALED">Sealed</option>
                      <option value="OPENED">Opened</option>
                      <option value="DAMAGED">Damaged</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(e) => setReason(e.target.value)} placeholder="Reason for return" rows={2} value={reason} />
      <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={createReturn.saveState === "saving"} type="submit">
        {createReturn.saveState === "saving" ? "Requesting…" : "Request return"}
      </button>
    </form>
  );
}

function ActionRow({ returnId, action, label, tone }: { returnId: string; action: "approve" | "reject" | "complete"; label: string; tone: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const update = useUpdateReturn();

  if (!open) return <button className={`rounded-lg px-3 py-1.5 text-xs font-black text-white ${tone}`} onClick={() => setOpen(true)} type="button">{label}</button>;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
      <input className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onChange={(e) => setReason(e.target.value)} placeholder="Reason" value={reason} />
      <button
        className={`rounded-lg px-3 py-1.5 text-xs font-black text-white ${tone}`}
        disabled={update.saveState === "saving"}
        onClick={async () => { setError(""); if (!reason.trim()) { setError("A reason is required."); return; } try { await update.mutate({ returnId, action, reason: reason.trim() }); } catch (cause) { setError(cause instanceof Error ? cause.message : "This action failed."); } }}
        type="button"
      >
        Confirm {label.toLowerCase()}
      </button>
    </div>
  );
}

export function PharmacyReturnWorklist() {
  const session = useWonFlowSession();
  const dispenses = useDispenses();
  const returns = useReturns();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="rounded-3xl bg-gradient-to-r from-rose-700 to-orange-700 p-6 text-white">
        <h1 className="text-2xl font-black">Pharmacy returns</h1>
        <p className="mt-1 text-sm text-rose-100">Signed in as {session?.name ?? "—"}.</p>
      </header>

      <NewReturnPanel dispenses={dispenses.data?.dispenses ?? []} />

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Return requests</h2>
        {returns.status === "loading" ? <p className="mt-3 text-sm text-slate-500">Loading…</p> : null}
        {returns.status === "empty" ? <p className="mt-3 text-sm text-slate-500">No return requests.</p> : null}
        <div className="mt-3 space-y-2">
          {(returns.data?.returns ?? []).map((item) => (
            <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3" key={item.id}>
              <div>
                <p className="text-sm font-bold">{item.reason}</p>
                <p className="text-xs text-slate-500">{item.lines.length} line(s) · {item.status}</p>
              </div>
              <div className="flex gap-2">
                {item.status === "REQUESTED" ? <ActionRow action="approve" label="Approve" returnId={item.id} tone="bg-emerald-600" /> : null}
                {item.status === "REQUESTED" ? <ActionRow action="reject" label="Reject" returnId={item.id} tone="bg-red-600" /> : null}
                {item.status === "APPROVED" ? <ActionRow action="complete" label="Complete" returnId={item.id} tone="bg-indigo-700" /> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
