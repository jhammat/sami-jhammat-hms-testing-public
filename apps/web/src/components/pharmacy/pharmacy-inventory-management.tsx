"use client";

import { useState } from "react";

import { useWonFlowSession } from "@/app/_providers";
import {
  useCreateBatch,
  useCreateMedication,
  useCreatePurchaseReceipt,
  useCreateSupplier,
  useInventory,
  useMovements,
  useStockAlerts,
  useSuppliers,
} from "@/lib/api/pharmacy";

type Tab = "inventory" | "receive" | "suppliers" | "movements" | "alerts";

function CreateMedicationForm() {
  const [form, setForm] = useState({ code: "", genericName: "", brandName: "", unit: "tablet", reorderLevel: "10" });
  const [error, setError] = useState("");
  const create = useCreateMedication();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await create.mutate({ code: form.code.trim(), genericName: form.genericName.trim(), brandName: form.brandName.trim() || undefined, unit: form.unit.trim(), reorderLevel: Number(form.reorderLevel) || 0 });
      setForm({ code: "", genericName: "", brandName: "", unit: "tablet", reorderLevel: "10" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The medication could not be added.");
    }
  }

  return (
    <form className="grid grid-cols-5 gap-2 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={submit}>
      {error ? <p className="col-span-5 text-xs font-bold text-red-700">{error}</p> : null}
      <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code" value={form.code} />
      <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setForm({ ...form, genericName: e.target.value })} placeholder="Generic name" value={form.genericName} />
      <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setForm({ ...form, brandName: e.target.value })} placeholder="Brand name" value={form.brandName} />
      <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Unit" value={form.unit} />
      <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" min="0" onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} placeholder="Reorder level" type="number" value={form.reorderLevel} />
      <button className="col-span-5 rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-black text-white disabled:opacity-50" disabled={create.saveState === "saving"} type="submit">Add medication</button>
    </form>
  );
}

function InventoryTab() {
  const inventory = useInventory();
  return (
    <div className="space-y-4">
      <CreateMedicationForm />
      {inventory.status === "loading" ? <p className="text-sm text-slate-500">Loading inventory…</p> : null}
      {inventory.status === "error" ? <p className="text-sm text-red-700">{inventory.error?.message}</p> : null}
      <div className="grid gap-2">
        {(inventory.data?.items ?? []).map((item) => (
          <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3" key={item.id}>
            <div>
              <p className="font-bold">{item.genericName}{item.brandName ? ` (${item.brandName})` : ""}</p>
              <p className="text-xs text-slate-500">{item.code} · {item.unit}</p>
            </div>
            <div className="text-right">
              <p className={`font-black ${item.isLowStock ? "text-red-700" : "text-slate-900"}`}>{item.availableQuantity} in stock</p>
              <p className="text-xs text-slate-500">Reorder at {item.reorderLevel}{item.isLowStock ? " · LOW STOCK" : ""}</p>
              {item.nearestExpiryState && item.nearestExpiryState !== "safe" ? <p className="text-xs font-bold text-amber-700">Nearest expiry: {item.nearestExpiryState}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReceiveTab() {
  const suppliers = useSuppliers();
  const inventory = useInventory();
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [lines, setLines] = useState([{ medicationId: "", batchNumber: "", expiryDate: "", quantity: "1", unitCostPkr: "0" }]);
  const [error, setError] = useState("");
  const createReceipt = useCreatePurchaseReceipt();
  const createBatch = useCreateBatch();
  const session = useWonFlowSession();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!supplierId) { setError("Choose a supplier."); return; }
    try {
      await createReceipt.mutate({
        supplierId,
        supplierInvoiceNumber: invoiceNumber.trim(),
        lines: lines.map((line) => ({ medicationId: line.medicationId, batchNumber: line.batchNumber.trim(), expiryDate: line.expiryDate, quantity: Number(line.quantity), unitCostMinor: Math.round(Number(line.unitCostPkr) * 100) })),
      });
      setLines([{ medicationId: "", batchNumber: "", expiryDate: "", quantity: "1", unitCostPkr: "0" }]);
      setInvoiceNumber("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The purchase receipt could not be posted.");
    }
  }

  return (
    <div className="space-y-4">
      <form className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={submit}>
        <h3 className="font-black">Receive stock from a supplier</h3>
        {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <select className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setSupplierId(e.target.value)} value={supplierId}>
            <option value="">Select supplier</option>
            {(suppliers.data?.suppliers ?? []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
          <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Supplier invoice number" value={invoiceNumber} />
        </div>
        {lines.map((line, index) => (
          <div className="grid grid-cols-6 gap-2" key={index}>
            <select className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setLines((cur) => cur.map((l, i) => (i === index ? { ...l, medicationId: e.target.value } : l)))} value={line.medicationId}>
              <option value="">Medication</option>
              {(inventory.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.genericName}</option>)}
            </select>
            <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setLines((cur) => cur.map((l, i) => (i === index ? { ...l, batchNumber: e.target.value } : l)))} placeholder="Batch #" value={line.batchNumber} />
            <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setLines((cur) => cur.map((l, i) => (i === index ? { ...l, expiryDate: e.target.value } : l)))} type="date" value={line.expiryDate} />
            <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" min="1" onChange={(e) => setLines((cur) => cur.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l)))} type="number" value={line.quantity} />
            <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" min="0" onChange={(e) => setLines((cur) => cur.map((l, i) => (i === index ? { ...l, unitCostPkr: e.target.value } : l)))} placeholder="Unit cost PKR" step="0.01" type="number" value={line.unitCostPkr} />
            <button className="rounded-lg border border-red-200 text-xs font-bold text-red-600" onClick={() => setLines((cur) => cur.filter((_, i) => i !== index))} type="button">Remove</button>
          </div>
        ))}
        <button className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700" onClick={() => setLines((cur) => [...cur, { medicationId: "", batchNumber: "", expiryDate: "", quantity: "1", unitCostPkr: "0" }])} type="button">+ Add line</button>
        <p className="text-xs font-bold text-slate-500">Received by: {session?.name ?? "—"}</p>
        <button className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={createReceipt.saveState === "saving"} type="submit">Post receipt</button>
      </form>

      <QuickBatchForm createBatch={createBatch} medications={inventory.data?.items ?? []} />
    </div>
  );
}

function QuickBatchForm({ createBatch, medications }: { createBatch: ReturnType<typeof useCreateBatch>; medications: { id: string; genericName: string }[] }) {
  const [form, setForm] = useState({ medicationId: "", batchNumber: "", expiryDate: "", quantity: "1" });
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await createBatch.mutate({ medicationId: form.medicationId, batchNumber: form.batchNumber.trim(), expiryDate: form.expiryDate, quantity: Number(form.quantity) });
      setForm({ medicationId: "", batchNumber: "", expiryDate: "", quantity: "1" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The batch could not be added.");
    }
  }
  return (
    <form className="grid grid-cols-5 gap-2 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={submit}>
      <h3 className="col-span-5 font-black">Or add a batch directly (opening stock count)</h3>
      {error ? <p className="col-span-5 text-xs font-bold text-red-700">{error}</p> : null}
      <select className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setForm({ ...form, medicationId: e.target.value })} value={form.medicationId}>
        <option value="">Medication</option>
        {medications.map((item) => <option key={item.id} value={item.id}>{item.genericName}</option>)}
      </select>
      <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="Batch #" value={form.batchNumber} />
      <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} type="date" value={form.expiryDate} />
      <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" min="1" onChange={(e) => setForm({ ...form, quantity: e.target.value })} type="number" value={form.quantity} />
      <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-black text-white disabled:opacity-50" disabled={createBatch.saveState === "saving"} type="submit">Add batch</button>
    </form>
  );
}

function SuppliersTab() {
  const suppliers = useSuppliers();
  const [form, setForm] = useState({ code: "", name: "" });
  const [error, setError] = useState("");
  const create = useCreateSupplier();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await create.mutate({ code: form.code.trim(), name: form.name.trim() });
      setForm({ code: "", name: "" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The supplier could not be added.");
    }
  }

  return (
    <div className="space-y-4">
      <form className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={submit}>
        {error ? <p className="col-span-3 text-xs font-bold text-red-700">{error}</p> : null}
        <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Supplier code" value={form.code} />
        <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" value={form.name} />
        <button className="rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-black text-white disabled:opacity-50" disabled={create.saveState === "saving"} type="submit">Add supplier</button>
      </form>
      <div className="grid gap-2">
        {(suppliers.data?.suppliers ?? []).map((supplier) => (
          <article className="rounded-xl border border-slate-200 bg-white p-3" key={supplier.id}>
            <p className="font-bold">{supplier.name}</p>
            <p className="text-xs text-slate-500">{supplier.code} · {supplier.status}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function MovementsTab() {
  const movements = useMovements();
  return (
    <div className="space-y-2">
      {(movements.data?.movements ?? []).map((movement) => (
        <article className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 text-sm" key={movement.id}>
          <span>{movement.medication.genericName} — {movement.type}</span>
          <span className={Number(movement.quantityDelta) < 0 ? "font-black text-red-700" : "font-black text-emerald-700"}>{movement.quantityDelta}</span>
          <span className="text-xs text-slate-400">{new Date(movement.occurredAt).toLocaleString("en-PK")}</span>
        </article>
      ))}
    </div>
  );
}

function AlertsTab() {
  const alerts = useStockAlerts();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <h3 className="font-black text-red-800">Low stock</h3>
        {(alerts.data?.lowStock ?? []).map((entry) => (
          <p className="mt-1 text-sm" key={entry.medication.id}>{entry.medication.genericName} — {entry.availableQuantity} (reorder at {entry.reorderLevel})</p>
        ))}
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="font-black text-amber-800">Expiring / expired batches</h3>
        {(alerts.data?.expiring ?? []).map((entry) => (
          <p className="mt-1 text-sm" key={entry.batch.id}>{entry.batch.medication.genericName} · batch {entry.batch.batchNumber} — {entry.state}</p>
        ))}
      </section>
    </div>
  );
}

export function PharmacyInventoryManagement() {
  const [tab, setTab] = useState<Tab>("inventory");
  const tabs: { key: Tab; label: string }[] = [
    { key: "inventory", label: "Inventory" },
    { key: "receive", label: "Receive stock" },
    { key: "suppliers", label: "Suppliers" },
    { key: "movements", label: "Movements" },
    { key: "alerts", label: "Alerts" },
  ];
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-3xl bg-gradient-to-r from-teal-700 to-emerald-700 p-6 text-white">
        <h1 className="text-2xl font-black">Pharmacy inventory</h1>
        <p className="mt-1 text-sm text-teal-100">Stock counts are always fetched fresh from the server.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {tabs.map((entry) => (
          <button className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === entry.key ? "bg-indigo-700 text-white" : "bg-white text-slate-600 border border-slate-200"}`} key={entry.key} onClick={() => setTab(entry.key)} type="button">{entry.label}</button>
        ))}
      </div>
      {tab === "inventory" ? <InventoryTab /> : null}
      {tab === "receive" ? <ReceiveTab /> : null}
      {tab === "suppliers" ? <SuppliersTab /> : null}
      {tab === "movements" ? <MovementsTab /> : null}
      {tab === "alerts" ? <AlertsTab /> : null}
    </div>
  );
}
