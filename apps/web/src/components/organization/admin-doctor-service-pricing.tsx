"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { Building2, Plus, Save, ShieldCheck, Stethoscope, Trash2, UserRoundCog } from "lucide-react";

import { WonFlowAsyncDataBoundary, WonFlowEmptyState, WonFlowPagination, useWonFlowConfirm, useWonFlowPagination } from "@/components/feedback";
import { phaseOneApi } from "@/lib/api/phase-one-api";
import { useWonFlowAsyncData } from "@/lib/data";
import { getServiceCategory, groupServiceCategoriesByHandler, hasLivePortal, serviceCategories } from "@/lib/services/service-categories";
import { nextServiceCode, normalizeServiceCode } from "@/lib/services/service-code";

type FeeAuthority = "DOCTOR" | "HOSPITAL";
type BillingOwner = "HOSPITAL" | "DOCTOR";
type WorkspaceCode = "ADMIN" | "RECEPTION" | "DOCTOR" | "LABORATORY" | "RADIOLOGY" | "PHARMACY" | "BILLING" | "MANAGEMENT";

/** Desks that can operate a service, in the order administrators think of them. */
const serviceDesks: Array<{ code: WorkspaceCode; label: string }> = [
  { code: "RECEPTION", label: "Reception" },
  { code: "DOCTOR", label: "Doctor on duty" },
  { code: "LABORATORY", label: "Laboratory" },
  { code: "RADIOLOGY", label: "Radiology" },
  { code: "PHARMACY", label: "Pharmacy" },
  { code: "BILLING", label: "Billing counter" },
  { code: "MANAGEMENT", label: "Management" },
  { code: "ADMIN", label: "Hospital administration" },
];

const deskLabel = (code: WorkspaceCode | null) => serviceDesks.find((desk) => desk.code === code)?.label ?? "Unassigned";

/** The desk a category naturally routes to, used as the default handler. */
function defaultDeskForCategory(category: string): WorkspaceCode {
  if (category === "LABORATORY") return "LABORATORY";
  if (category === "RADIOLOGY") return "RADIOLOGY";
  if (category === "PHARMACY") return "PHARMACY";
  if (category === "CONSULTATION") return "DOCTOR";
  return "RECEPTION";
}

interface ServiceOverview {
  configuration: {
    id: string;
    displayName: string;
    doctorFeeAuthority: FeeAuthority;
    branches: Array<{ id: string; name: string }>;
  };
  handlers: Array<{ id: string; displayName: string; primaryWorkspace: WorkspaceCode | null; workspaceCodes: WorkspaceCode[] }>;
  doctors: Array<{
    id: string;
    specialty: string | null;
    staffProfile: { membership: { displayName: string } };
  }>;
  services: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    durationMinutes: number;
    priceMinorUnits: number | null;
    currencyCode: string;
    publiclyBookable: boolean;
    billingOwner: BillingOwner;
    consultationMode: "IN_PERSON" | "ONLINE";
    branch: { id: string; name: string } | null;
    handlerWorkspace: WorkspaceCode | null;
    handlerMembership: { id: string; displayName: string; primaryWorkspace: WorkspaceCode | null } | null;
    doctor: {
      id: string;
      staffProfile: { membership: { displayName: string } };
    } | null;
  }>;
}

const billingOwnerLabels: Record<BillingOwner, string> = {
  HOSPITAL: "Hospital administration",
  DOCTOR: "Assigned doctor",
};

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="space-y-1.5"><span className="block text-xs font-bold text-slate-700">{label}</span>{children}</label>;
}

function ErrorMessage({ message }: { message: string }) {
  return message ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{message}</p> : null;
}

function AuthoritySelector({ authority, onSaved }: { authority: FeeAuthority; onSaved(): void }) {
  const [saving, setSaving] = useState<FeeAuthority | null>(null);
  const [error, setError] = useState("");

  async function select(next: FeeAuthority) {
    if (next === authority) return;
    setSaving(next);
    setError("");
    try {
      await phaseOneApi("/api/v1/admin/doctor-fee-authority", {
        method: "PATCH",
        body: JSON.stringify({ authority: next }),
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Fee access could not be updated.");
    } finally {
      setSaving(null);
    }
  }

  const options = [
    { value: "DOCTOR" as const, icon: Stethoscope, title: "Doctor managed", description: "Doctors create their consultation services and set their own fees." },
    { value: "HOSPITAL" as const, icon: Building2, title: "Hospital managed", description: "Hospital administrators create doctor services and control the fees." },
  ];

  return (
    <section className="wf-admin-panel rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-blue-600" size={21} /><div><h2 className="font-bold text-slate-950">Doctor fee access</h2><p className="mt-1 text-xs text-slate-500">This setting is enforced by the backend for every doctor consultation service.</p></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {options.map(({ value, icon: Icon, title, description }) => (
          <button className={`rounded-2xl border p-4 text-left transition ${authority === value ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-300"}`} disabled={saving !== null} key={value} onClick={() => select(value)} type="button">
            <span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Icon aria-hidden="true" className="text-blue-600" size={18} /><strong className="text-sm text-slate-950">{title}</strong></span><span className={`h-3 w-3 rounded-full ${authority === value ? "bg-blue-600" : "bg-slate-200"}`} /></span>
            <span className="mt-2 block text-xs leading-5 text-slate-600">{description}</span>
            {saving === value ? <span className="mt-2 block text-[10px] font-bold text-blue-700">Updating access…</span> : null}
          </button>
        ))}
      </div>
      <div className="mt-3"><ErrorMessage message={error} /></div>
    </section>
  );
}

function ServiceCard({ authority, onSaved, service }: { authority: FeeAuthority; onSaved(): void; service: ServiceOverview["services"][number] }) {
  const category = getServiceCategory(service.category);
  const hospitalMayEdit = !service.doctor || authority === "HOSPITAL";
  const hospitalMaySetPrice = hospitalMayEdit && service.billingOwner !== "DOCTOR";
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(service.priceMinorUnits === null ? "" : String(service.priceMinorUnits / 100));
  const [duration, setDuration] = useState(String(service.durationMinutes));
  const [publiclyBookable, setPubliclyBookable] = useState(service.publiclyBookable);
  const [consultationMode, setConsultationMode] = useState(service.consultationMode);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const { confirm, dialog: confirmDialog } = useWonFlowConfirm();

  async function save() {
    setSaving(true);
    setError("");
    try {
      await phaseOneApi(`/api/v1/admin/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          durationMinutes: Number(duration),
          priceMinorUnits: hospitalMaySetPrice ? (price === "" ? null : Math.round(Number(price) * 100)) : undefined,
          publiclyBookable,
          consultationMode,
        }),
      });
      setEditing(false);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The service could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!await confirm({ title: "Delete service", message: `${service.name} disappears from every operational portal.`, confirmLabel: "Delete service" })) return;
    setDeleting(true);
    setError("");
    try {
      await phaseOneApi(`/api/v1/admin/services/${service.id}`, { method: "DELETE" });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The service could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      {confirmDialog}
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-bold text-slate-950">{service.name}</h3><p className="mt-1 text-xs text-slate-500">{service.code} / {category?.label ?? service.category}</p></div>
        {!editing ? <strong className="whitespace-nowrap text-sm text-blue-700">{service.priceMinorUnits === null ? "Not priced" : new Intl.NumberFormat("en-PK", { style: "currency", currency: service.currencyCode, maximumFractionDigits: 0 }).format(service.priceMinorUnits / 100)}</strong> : null}
      </div>
      <p className="mt-3 text-[10px] font-semibold text-slate-500">{service.durationMinutes} minutes / {service.branch?.name ?? "All branches"}</p>
      <p className="mt-1 text-[10px] font-semibold text-slate-600">Handled by {service.handlerMembership?.displayName ?? deskLabel(service.handlerWorkspace)}</p>
      <p className="mt-1 text-[10px] font-bold text-slate-700">Price set by {billingOwnerLabels[service.billingOwner].toLowerCase()}</p>
      {category && hasLivePortal(category.code) ? <Link className="mt-2 inline-flex rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100" href={category.portalPath}>Linked to {category.portalLabel} portal</Link> : null}
      {category && !hasLivePortal(category.code) ? <p className="mt-2 inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{category.portalLabel} portal arrives in Phase 2</p> : null}
      {service.doctor ? <p className="mt-2 rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">Doctor: {service.doctor.staffProfile.membership.displayName}</p> : null}
      {editing ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {hospitalMaySetPrice ? <Field label={`Price (${service.currencyCode})`}><input className={fieldClass} min="0" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} /></Field> : <p className="self-end rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-bold leading-4 text-amber-800">The assigned doctor controls this fee.</p>}
            <Field label="Minutes"><input className={fieldClass} min="5" required type="number" value={duration} onChange={(event) => setDuration(event.target.value)} /></Field>
          </div>
          {service.category === "CONSULTATION" ? <Field label="Consultation delivery"><select className={fieldClass} value={consultationMode} onChange={(event) => setConsultationMode(event.target.value as "IN_PERSON" | "ONLINE")}><option value="IN_PERSON">In person</option><option value="ONLINE">Online video consultation</option></select></Field> : null}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input checked={publiclyBookable} onChange={(event) => setPubliclyBookable(event.target.checked)} type="checkbox" />Available for booking</label>
          <ErrorMessage message={error} />
          <div className="flex gap-2"><button className={buttonClass} disabled={saving || duration === ""} onClick={save} type="button"><Save aria-hidden="true" size={16} />{saving ? "Saving" : "Save service"}</button><button className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700" disabled={saving} onClick={() => setEditing(false)} type="button">Cancel</button></div>
        </div>
      ) : hospitalMayEdit ? (
        <button className="mt-3 min-h-10 rounded-xl border border-blue-200 px-4 text-xs font-bold text-blue-700 hover:bg-blue-50" onClick={() => setEditing(true)} type="button">Edit service & fee</button>
      ) : (
        <p className="mt-3 text-[10px] font-bold text-amber-700">Doctor-managed: this fee is read-only for hospital administrators.</p>
      )}
      {!editing && hospitalMayEdit ? <div className="mt-3 flex justify-end"><button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60" disabled={deleting} onClick={() => void remove()} type="button"><Trash2 size={14} />{deleting ? "Deleting..." : "Delete service"}</button></div> : null}
    </article>
  );
}

function ServiceCatalogue({ overview, onCreated }: { overview: ServiceOverview; onCreated(): void }) {
  const [form, setForm] = useState({ codeMode: "AUTOMATIC" as "AUTOMATIC" | "CUSTOM", code: "", name: "", category: "CONSULTATION", handler: "", doctorId: "", branchId: "", duration: "15", price: "", publiclyBookable: false, billingOwner: "HOSPITAL" as BillingOwner, consultationMode: "IN_PERSON" as "IN_PERSON" | "ONLINE" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const servicePages = useWonFlowPagination(overview.services, 8);
  const isDoctorManaged = overview.configuration.doctorFeeAuthority === "DOCTOR";
  const availableCategories = isDoctorManaged ? serviceCategories.filter((category) => category.code !== "CONSULTATION") : serviceCategories;
  const selectedCategory = isDoctorManaged && form.category === "CONSULTATION" ? availableCategories[0]!.code : form.category;
  const submittedCategory = !isDoctorManaged && form.doctorId ? "CONSULTATION" : selectedCategory;
  const generatedCode = nextServiceCode(submittedCategory, overview.services.map((service) => service.code));
  // "desk:RECEPTION" or "person:<membershipId>"; empty falls back to the category's desk.
  const handlerValue = form.handler || `desk:${defaultDeskForCategory(submittedCategory)}`;
  const handlerPersonId = handlerValue.startsWith("person:") ? handlerValue.slice("person:".length) : "";
  const handlerPerson = overview.handlers.find((handler) => handler.id === handlerPersonId) ?? null;
  const handlerSummary = handlerPerson ? handlerPerson.displayName : deskLabel(handlerValue.slice("desk:".length) as WorkspaceCode);
  const billingOwnerOptions: Array<{ value: BillingOwner; label: string; description: string }> = [
    { value: "HOSPITAL", label: billingOwnerLabels.HOSPITAL, description: "Only hospital administrators can set or change this price." },
    ...(!isDoctorManaged && form.doctorId ? [{ value: "DOCTOR" as const, label: billingOwnerLabels.DOCTOR, description: "Only the assigned doctor sets this fee, from the doctor portal." }] : []),
  ];
  const selectedBillingOwner: BillingOwner = billingOwnerOptions.some((option) => option.value === form.billingOwner) ? form.billingOwner : "HOSPITAL";

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await phaseOneApi("/api/v1/admin/services", {
        method: "POST",
        body: JSON.stringify({
          code: form.codeMode === "CUSTOM" ? form.code : undefined,
          name: form.name,
          category: submittedCategory,
          doctorId: !isDoctorManaged && form.doctorId ? form.doctorId : undefined,
          handlerMembershipId: handlerPersonId || undefined,
          handlerWorkspace: handlerPersonId ? undefined : handlerValue.slice("desk:".length),
          branchId: form.branchId || undefined,
          durationMinutes: Number(form.duration),
          priceMinorUnits: selectedBillingOwner === "DOCTOR" || form.price === "" ? undefined : Math.round(Number(form.price) * 100),
          publiclyBookable: form.publiclyBookable,
          billingOwner: selectedBillingOwner,
          consultationMode: form.consultationMode,
          currencyCode: "PKR",
        }),
      });
      setForm({ codeMode: form.codeMode, code: "", name: "", category: isDoctorManaged ? "LABORATORY" : "CONSULTATION", handler: "", doctorId: "", branchId: "", duration: "15", price: "", publiclyBookable: false, billingOwner: "HOSPITAL", consultationMode: "IN_PERSON" });
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The service could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="wf-admin-panel rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">Service catalogue</h2><p className="mt-1 text-xs text-slate-500">Hospital services and doctor-linked consultation services.</p>
        {isDoctorManaged ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-800">Doctors manage only their own consultation services and fees. The hospital continues to manage every other service category.</p> : null}
        {overview.services.length === 0 ? <div className="mt-4"><WonFlowEmptyState title="No services configured" description="Create the hospital's first service." /></div> : <><div className="mt-4 grid gap-3 md:grid-cols-2">{servicePages.visible.map((service) => <ServiceCard authority={overview.configuration.doctorFeeAuthority} key={service.id} onSaved={onCreated} service={service} />)}</div><WonFlowPagination firstShown={servicePages.firstShown} lastShown={servicePages.lastShown} noun="services" onPageChange={servicePages.setPage} page={servicePages.page} pageCount={servicePages.pageCount} total={servicePages.total} /></>}
      </section>
      <section className="wf-admin-panel rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">Add hospital service</h2><p className="mt-1 text-xs text-slate-500">{isDoctorManaged ? "Create any non-consultation hospital service. Doctors add their own consultations in their portal." : "Create hospital services or assign a doctor to a hospital-managed consultation."}</p>
        <form className="mt-4 space-y-3" onSubmit={create}>
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-700">Service code</span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Service code mode">
              {([{ mode: "AUTOMATIC" as const, label: "Generate automatically" }, { mode: "CUSTOM" as const, label: "Use custom code" }]).map(({ mode, label }) => (
                <button aria-pressed={form.codeMode === mode} className={`min-h-10 rounded-xl border px-3 text-xs font-bold transition ${form.codeMode === mode ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-blue-300"}`} key={mode} onClick={() => setForm({ ...form, codeMode: mode })} type="button">{label}</button>
              ))}
            </div>
            {form.codeMode === "AUTOMATIC" ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Next code for this category: <strong className="font-mono text-slate-950">{generatedCode}</strong>. The final code is confirmed by the server when the service is created.</p>
            ) : (
              <input aria-label="Custom service code" className={fieldClass} placeholder="LAB-XRAY-01" required value={form.code} onChange={(event) => setForm({ ...form, code: normalizeServiceCode(event.target.value) })} />
            )}
          </div>
          <Field label="Service name"><input className={fieldClass} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          {!isDoctorManaged ? <Field label="Assigned doctor"><select className={fieldClass} value={form.doctorId} onChange={(event) => setForm({ ...form, doctorId: event.target.value })}><option value="">Hospital service</option>{overview.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.staffProfile.membership.displayName}{doctor.specialty ? ` · ${doctor.specialty}` : ""}</option>)}</select></Field> : null}
          {isDoctorManaged || !form.doctorId ? (
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-700">Category</span>
              <p className="text-[10px] font-semibold text-slate-500">What the service is, grouped by the team that performs it.</p>
              <select aria-label="Service category" className={fieldClass} required value={selectedCategory} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {groupServiceCategoriesByHandler(availableCategories).map(({ handler, categories }) => (
                  <optgroup key={handler} label={`Handled by ${handler}`}>
                    {categories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-700">Handled by</span>
            <p className="text-[10px] font-semibold text-slate-500">Who operates this service — a desk, or one named person.</p>
            <select aria-label="Handled by" className={fieldClass} value={handlerValue} onChange={(event) => setForm({ ...form, handler: event.target.value })}>
              <optgroup label="Desk">
                {serviceDesks.map((desk) => <option key={desk.code} value={`desk:${desk.code}`}>{desk.label}</option>)}
              </optgroup>
              {overview.handlers.length > 0 ? (
                <optgroup label="Specific person">
                  {overview.handlers.map((handler) => <option key={handler.id} value={`person:${handler.id}`}>{handler.displayName}{handler.primaryWorkspace ? ` · ${deskLabel(handler.primaryWorkspace)}` : ""}</option>)}
                </optgroup>
              ) : null}
            </select>
          </div>
          {!isDoctorManaged && form.doctorId ? <Field label="Consultation delivery"><select className={fieldClass} value={form.consultationMode} onChange={(event) => setForm({ ...form, consultationMode: event.target.value as "IN_PERSON" | "ONLINE" })}><option value="IN_PERSON">In person</option><option value="ONLINE">Online video consultation</option></select></Field> : null}
          <Field label="Branch"><select className={fieldClass} value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}><option value="">All branches</option>{overview.configuration.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Minutes"><input className={fieldClass} min="5" required type="number" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} /></Field>{selectedBillingOwner === "DOCTOR" ? null : <Field label="Price (PKR)"><input className={fieldClass} min="0" placeholder="0" required step="0.01" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>}</div>
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-700">Price controlled by</span>
            <p className="text-[10px] font-semibold text-slate-500">Enforced by the backend for every change to this service fee.</p>
            <div className="grid gap-2">
              {billingOwnerOptions.map((option) => (
                <button aria-pressed={selectedBillingOwner === option.value} className={`rounded-xl border p-3 text-left transition ${selectedBillingOwner === option.value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`} key={option.value} onClick={() => setForm({ ...form, billingOwner: option.value })} type="button">
                  <span className="flex items-center justify-between gap-2"><strong className="text-xs text-slate-950">{option.label}</strong><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${selectedBillingOwner === option.value ? "bg-blue-600" : "bg-slate-200"}`} /></span>
                  <span className="mt-1 block text-[10px] leading-4 text-slate-600">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input checked={form.publiclyBookable} onChange={(event) => setForm({ ...form, publiclyBookable: event.target.checked })} type="checkbox" />Available for booking</label>
          {isDoctorManaged ? <p className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">Consultation is intentionally excluded here. Doctors manage it under <strong>Doctor Portal → Fees &amp; Services</strong>.</p> : null}
          {isDoctorManaged || !form.doctorId ? <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700"><strong>{getServiceCategory(selectedCategory)?.label}</strong> service, handled by <strong>{handlerSummary}</strong>, priced by <strong>{billingOwnerLabels[selectedBillingOwner].toLowerCase()}</strong>. It stays available to Reception and Billing.</p> : null}
          <ErrorMessage message={error} />
          <button className={`${buttonClass} w-full`} disabled={saving} type="submit"><Plus aria-hidden="true" size={17} />{saving ? "Creating" : "Create service"}</button>
        </form>
      </section>
    </div>
  );
}

export function AdminDoctorServicePricingPage() {
  const resource = useWonFlowAsyncData<ServiceOverview>({
    key: "admin:doctor-service-pricing",
    loader: async (signal) => phaseOneApi<ServiceOverview>("/api/v1/admin/service-overview", { signal }),
  });

  return (
    <div className="space-y-4" id="main-content">
      <section className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-violet-50 p-5 shadow-sm sm:p-6"><div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white"><UserRoundCog aria-hidden="true" size={22} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Services & governance</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Services, prices & doctor access</h1><p className="mt-1 text-sm text-slate-600">Configure hospital services and choose who controls doctor consultation fees.</p></div></div></section>
      <WonFlowAsyncDataBoundary loadingTitle="Loading service access" loadingDescription="Reading live hospital pricing controls." onRetry={resource.reload} state={resource}>
        {(overview) => <div className="space-y-4"><AuthoritySelector authority={overview.configuration.doctorFeeAuthority} onSaved={resource.reload} /><ServiceCatalogue onCreated={resource.reload} overview={overview} /></div>}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
