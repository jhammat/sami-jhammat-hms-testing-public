"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Banknote, Building2, CalendarDays, LockKeyhole, Plus, Save, Stethoscope, Trash2 } from "lucide-react";

import { WonFlowAsyncDataBoundary, WonFlowEmptyState, useWonFlowConfirm } from "@/components/feedback";
import { phaseOneApi } from "@/lib/api/phase-one-api";
import { useWonFlowAsyncData } from "@/lib/data";
import { useDoctorPortalContext } from "./doctor-portal-shell";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function formatMinuteOfDay(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function PracticeSchedulePanel() {
  const { roster } = useDoctorPortalContext();
  const orderedRoster = [...roster].sort(
    (left, right) => left.weekday - right.weekday || left.startsMinute - right.startsMinute,
  );

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20"><CalendarDays size={18} /></span>
          <div><h2 className="font-bold text-slate-950">Consultation schedule</h2><p className="mt-0.5 text-xs text-slate-500">Your weekly hours, set by hospital administration and bookable by reception and patients.</p></div>
        </div>
      </div>
      {orderedRoster.length === 0 ? (
        <div className="m-5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-7 text-center"><p className="text-sm font-bold text-slate-800">No consultation hours configured</p><p className="mt-1 text-xs text-slate-500">Ask hospital administration to add your weekly availability.</p></div>
      ) : (
        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{orderedRoster.map((item) => <article className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4" key={item.id}><h3 className="text-sm font-bold text-slate-900">{DAY_NAMES[item.weekday]}</h3><p className="mt-3 text-sm font-bold text-indigo-700">{formatMinuteOfDay(item.startsMinute)}–{formatMinuteOfDay(item.endsMinute)}</p><p className="mt-1 text-xs text-slate-500">{item.branch.name} · {item.capacity} slot{item.capacity === 1 ? "" : "s"}</p></article>)}</div>
      )}
    </section>
  );
}

interface DoctorServiceOverview {
  authority: "DOCTOR" | "HOSPITAL";
  organization: { id: string; name: string };
  doctor: { id: string; displayName: string; specialty: string | null };
  branches: Array<{ id: string; name: string; code: string; currencyCode: string }>;
  services: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceMinorUnits: number | null;
    currencyCode: string;
    publiclyBookable: boolean;
    consultationModes: ("IN_PERSON" | "ONLINE")[];
    isActive: boolean;
    branch: { id: string; name: string } | null;
  }>;
}

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

function ErrorMessage({ message }: { message: string }) {
  return message ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{message}</p> : null;
}

/** A service may be offered in person, online, or both — never neither. */
function ConsultationModeCheckboxes({ value, onChange }: { value: ("IN_PERSON" | "ONLINE")[]; onChange(next: ("IN_PERSON" | "ONLINE")[]): void }) {
  function toggle(mode: "IN_PERSON" | "ONLINE") {
    const isOn = value.includes(mode);
    if (isOn && value.length === 1) return;
    onChange(isOn ? value.filter((entry) => entry !== mode) : [...value, mode]);
  }
  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"><input checked={value.includes("IN_PERSON")} onChange={() => toggle("IN_PERSON")} type="checkbox" />In person</label>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"><input checked={value.includes("ONLINE")} onChange={() => toggle("ONLINE")} type="checkbox" />Online video consultation</label>
    </div>
  );
}

function ServiceEditor({ service, onSaved }: { service: DoctorServiceOverview["services"][number]; onSaved(): void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(service.priceMinorUnits === null ? "" : String(service.priceMinorUnits / 100));
  const [duration, setDuration] = useState(String(service.durationMinutes));
  const [publiclyBookable, setPubliclyBookable] = useState(service.publiclyBookable);
  const [consultationModes, setConsultationModes] = useState(service.consultationModes);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const { confirm, dialog: confirmDialog } = useWonFlowConfirm();

  async function save() {
    setSaving(true);
    setError("");
    try {
      await phaseOneApi(`/api/v1/doctor/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          priceMinorUnits: Math.round(Number(price) * 100),
          durationMinutes: Number(duration),
          publiclyBookable,
          consultationModes,
        }),
      });
      setEditing(false);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The consultation service could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!await confirm({ title: "Delete service", message: `${service.name} is removed from Reception and all booking portals.`, confirmLabel: "Delete service" })) return;
    setDeleting(true);
    setError("");
    try {
      await phaseOneApi(`/api/v1/doctor/services/${service.id}`, { method: "DELETE" });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The service could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {confirmDialog}
      {editing ? <div className="mb-3 space-y-1"><span className="block text-xs font-bold text-slate-700">Consultation delivery</span><ConsultationModeCheckboxes onChange={setConsultationModes} value={consultationModes} /></div> : null}
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{service.name}</h3><p className="mt-1 text-xs text-slate-500">{service.code} · {service.branch?.name ?? "All branches"}</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${service.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{service.isActive ? "ACTIVE" : "INACTIVE"}</span></div>
      {editing ? <div className="mt-4 space-y-3"><div className="grid grid-cols-2 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-slate-700">Fee ({service.currencyCode})</span><input className={fieldClass} min="0" required step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label className="space-y-1"><span className="text-xs font-bold text-slate-700">Minutes</span><input className={fieldClass} min="5" required type="number" value={duration} onChange={(event) => setDuration(event.target.value)} /></label></div><label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input checked={publiclyBookable} onChange={(event) => setPubliclyBookable(event.target.checked)} type="checkbox" />Available for patient booking</label><ErrorMessage message={error} /><div className="flex gap-2"><button className={buttonClass} disabled={saving || price === ""} onClick={save} type="button"><Save aria-hidden="true" size={16} />{saving ? "Saving" : "Save changes"}</button><button className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700" disabled={saving} onClick={() => setEditing(false)} type="button">Cancel</button></div></div> : <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Consultation fee</p><p className="mt-1 text-xl font-bold text-blue-700">{service.priceMinorUnits === null ? "Not set" : new Intl.NumberFormat("en-PK", { style: "currency", currency: service.currencyCode, maximumFractionDigits: 0 }).format(service.priceMinorUnits / 100)}</p><p className="mt-1 text-xs text-slate-500">{service.durationMinutes} minutes · {service.publiclyBookable ? "Public booking enabled" : "Internal booking only"}</p></div><button className="min-h-10 rounded-xl border border-blue-200 px-4 text-xs font-bold text-blue-700 hover:bg-blue-50" onClick={() => setEditing(true)} type="button">Edit service</button></div>}
      {!editing ? <div className="mt-3 flex justify-end"><button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60" disabled={deleting} onClick={() => void remove()} type="button"><Trash2 size={14} />{deleting ? "Deleting..." : "Delete service"}</button></div> : null}
    </article>
  );
}

function CreateDoctorService({ overview, onCreated }: { overview: DoctorServiceOverview; onCreated(): void }) {
  const [form, setForm] = useState({ code: "INITIAL", name: "Initial consultation", branchId: overview.branches[0]?.id ?? "", duration: "15", price: "", publiclyBookable: false, consultationModes: ["IN_PERSON"] as ("IN_PERSON" | "ONLINE")[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await phaseOneApi("/api/v1/doctor/services", {
        method: "POST",
        body: JSON.stringify({ code: form.code, name: form.name, branchId: form.branchId || undefined, durationMinutes: Number(form.duration), priceMinorUnits: Math.round(Number(form.price) * 100), publiclyBookable: form.publiclyBookable, consultationModes: form.consultationModes }),
      });
      setForm({ code: "FOLLOWUP", name: "Follow-up consultation", branchId: overview.branches[0]?.id ?? "", duration: "15", price: "", publiclyBookable: false, consultationModes: ["IN_PERSON"] });
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The consultation service could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="wf-admin-panel rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-950">Add consultation service</h2><p className="mt-1 text-xs text-slate-500">Create an in-person or secure online video consultation.</p><form className="mt-4 space-y-3" onSubmit={create}><label className="space-y-1"><span className="text-xs font-bold text-slate-700">Short code</span><input className={fieldClass} required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></label><label className="space-y-1"><span className="text-xs font-bold text-slate-700">Service name</span><input className={fieldClass} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><div className="space-y-1"><span className="block text-xs font-bold text-slate-700">Consultation delivery</span><ConsultationModeCheckboxes onChange={(modes) => setForm({ ...form, consultationModes: modes })} value={form.consultationModes} /></div><label className="space-y-1"><span className="text-xs font-bold text-slate-700">Branch</span><select className={fieldClass} value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}><option value="">All branches</option>{overview.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-slate-700">Minutes</span><input className={fieldClass} min="5" required type="number" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} /></label><label className="space-y-1"><span className="text-xs font-bold text-slate-700">Fee (PKR)</span><input className={fieldClass} min="0" required step="0.01" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label></div><label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input checked={form.publiclyBookable} onChange={(event) => setForm({ ...form, publiclyBookable: event.target.checked })} type="checkbox" />Available for patient booking</label><ErrorMessage message={error} /><button className={`${buttonClass} w-full`} disabled={saving} type="submit"><Plus aria-hidden="true" size={17} />{saving ? "Creating" : "Add consultation service"}</button></form></section>
  );
}

export function DoctorFeeManagementPage() {
  const resource = useWonFlowAsyncData<{ services: DoctorServiceOverview }>({
    key: "doctor:services-and-fees",
    loader: (signal) => phaseOneApi<{ services: DoctorServiceOverview }>("/api/v1/doctor/services", { signal }),
  });

  return (
    <div className="space-y-4" id="main-content">
      <section className="rounded-[26px] bg-gradient-to-br from-slate-950 via-blue-950 to-violet-900 p-5 text-white shadow-xl"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20"><Banknote aria-hidden="true" size={23} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Doctor workspace</p><h1 className="mt-1 text-2xl font-bold">Practice Configuration</h1><p className="mt-1 text-sm text-blue-100/80">Configure your consultation services, fees, booking access and weekly schedule.</p></div></div></section>
      <PracticeSchedulePanel />
      <WonFlowAsyncDataBoundary loadingTitle="Loading consultation services" loadingDescription="Reading your live doctor profile and fee access." onRetry={resource.reload} state={resource}>
        {({ services: overview }) => <><section className={`rounded-2xl border p-4 ${overview.authority === "DOCTOR" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-start gap-3">{overview.authority === "DOCTOR" ? <Stethoscope className="text-emerald-700" size={20} /> : <LockKeyhole className="text-amber-700" size={20} />}<div><h2 className="font-bold text-slate-950">{overview.authority === "DOCTOR" ? "Doctor-managed access is active" : "Hospital-managed access is active"}</h2><p className="mt-1 text-xs leading-5 text-slate-600">{overview.authority === "DOCTOR" ? "You may create consultation services and update your own fees." : `${overview.organization.name} controls consultation services and fees. You can review them here but cannot change them.`}</p></div></div></section><div className={`grid gap-4 ${overview.authority === "DOCTOR" ? "xl:grid-cols-[1.2fr_0.8fr]" : ""}`}><section className="wf-admin-panel rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><Building2 className="text-blue-600" size={20} /><div><h2 className="font-bold text-slate-950">My consultation services</h2><p className="text-xs text-slate-500">{overview.doctor.displayName}{overview.doctor.specialty ? ` · ${overview.doctor.specialty}` : ""}</p></div></div>{overview.services.length === 0 ? <div className="mt-4"><WonFlowEmptyState title="No consultation services" description={overview.authority === "DOCTOR" ? "Add your first consultation service and fee." : "Ask the hospital administrator to configure your consultation service."} /></div> : <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">{overview.services.map((service) => overview.authority === "DOCTOR" ? <ServiceEditor key={service.id} onSaved={resource.reload} service={service} /> : <article className="rounded-2xl border border-slate-200 p-4" key={service.id}><h3 className="font-bold text-slate-950">{service.name}</h3><p className="mt-1 text-xs text-slate-500">{service.branch?.name ?? "All branches"} · {service.durationMinutes} minutes</p><p className="mt-3 text-lg font-bold text-blue-700">{service.priceMinorUnits === null ? "Not priced" : new Intl.NumberFormat("en-PK", { style: "currency", currency: service.currencyCode, maximumFractionDigits: 0 }).format(service.priceMinorUnits / 100)}</p></article>)}</div>}</section>{overview.authority === "DOCTOR" ? <CreateDoctorService onCreated={resource.reload} overview={overview} /> : null}</div></>}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
