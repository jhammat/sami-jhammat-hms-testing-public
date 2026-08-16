"use client";

import { useState } from "react";

import { useAdminServices, useConfiguration, useCreateAdminService, useUpdateAdminService } from "@/lib/api/admin";
import type { AdminServiceRecord } from "@/lib/api/admin";

function minorToPkr(minor: number | null): string {
  if (minor === null) return "Not set";
  return (minor / 100).toLocaleString("en-PK", { style: "currency", currency: "PKR" });
}

function ServiceRow({ service }: { service: AdminServiceRecord }) {
  const [pricePkr, setPricePkr] = useState(service.priceMinorUnits !== null ? String(service.priceMinorUnits / 100) : "0");
  const [error, setError] = useState("");
  const update = useUpdateAdminService();

  return (
    <article className="rounded-xl border border-slate-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-black">{service.name}</p>
          <p className="text-xs text-slate-500">{service.category} · {service.durationMinutes} min · {service.branch?.name ?? "All locations"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${service.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{service.isActive ? "Active" : "Inactive"}</span>
      </div>
      {error ? <p className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm" min="0" onChange={(e) => setPricePkr(e.target.value)} step="0.01" type="number" value={pricePkr} />
        <button
          className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
          disabled={update.saveState === "saving"}
          onClick={async () => { setError(""); try { await update.mutate({ serviceId: service.id, priceMinorUnits: Math.round(Number(pricePkr) * 100) }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update the fee."); } }}
          type="button"
        >
          Update fee
        </button>
        <button
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold"
          onClick={() => void update.mutate({ serviceId: service.id, isActive: !service.isActive })}
          type="button"
        >
          {service.isActive ? "Deactivate" : "Reactivate"}
        </button>
      </div>
      {service.feeHistory.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-black text-slate-500">Fee history ({service.feeHistory.length})</summary>
          <ul className="mt-2 space-y-1">
            {service.feeHistory.map((entry, index) => (
              <li className="rounded-lg bg-slate-50 p-2 text-xs" key={index}>{minorToPkr(entry.priceMinorUnits)} — {new Date(entry.changedAt).toLocaleString("en-PK")}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

function CreateServiceForm() {
  const configuration = useConfiguration();
  const [form, setForm] = useState({ name: "", category: "CONSULTATION", branchId: "", durationMinutes: "20", priceMinorUnits: "0" });
  const [error, setError] = useState("");
  const create = useCreateAdminService();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await create.mutate({ name: form.name.trim(), category: form.category, branchId: form.branchId || undefined, durationMinutes: Number(form.durationMinutes), priceMinorUnits: Math.round(Number(form.priceMinorUnits) * 100) });
      setForm({ name: "", category: "CONSULTATION", branchId: "", durationMinutes: "20", priceMinorUnits: "0" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the service.");
    }
  }

  return (
    <form className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5" onSubmit={submit}>
      <h2 className="text-lg font-black">Add a service</h2>
      <p className="text-xs text-slate-500">Per-location pricing: leave location blank to apply everywhere, or create one row per branch for a different fee at each location.</p>
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Service name" required value={form.name} />
        <select className="rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setForm({ ...form, category: e.target.value })} value={form.category}>
          {["CONSULTATION", "LABORATORY", "RADIOLOGY", "PHARMACY", "EMERGENCY", "PHYSIOTHERAPY", "DENTAL", "VACCINATION", "HEALTH_PACKAGE", "AMBULANCE", "OTHER"].map((code) => <option key={code} value={code}>{code.replaceAll("_", " ")}</option>)}
        </select>
        <select className="rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setForm({ ...form, branchId: e.target.value })} value={form.branchId}>
          <option value="">All locations</option>
          {(configuration.data?.configuration.branches ?? []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded-xl border border-slate-200 px-3 py-2" min="5" onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} type="number" value={form.durationMinutes} />
        <input className="rounded-xl border border-slate-200 px-3 py-2" min="0" onChange={(e) => setForm({ ...form, priceMinorUnits: e.target.value })} placeholder="Price (PKR)" step="0.01" type="number" value={form.priceMinorUnits} />
      </div>
      <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={create.saveState === "saving"} type="submit">Add service</button>
    </form>
  );
}

export function PracticeServiceCatalogueManagement() {
  const services = useAdminServices();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <CreateServiceForm />
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Services</h2>
        {services.status === "loading" ? <p className="mt-3 text-sm text-slate-500">Loading…</p> : null}
        <div className="mt-3 space-y-2">
          {(services.data?.services ?? []).map((service) => <ServiceRow key={service.id} service={service} />)}
        </div>
      </section>
    </div>
  );
}
