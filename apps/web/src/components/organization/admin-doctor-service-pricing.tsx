"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Building2, Plus, Save, Search, ShieldCheck, Stethoscope, Trash2, UserRoundCog, X } from "lucide-react";

import { WonFlowAsyncDataBoundary, WonFlowEmptyState, WonFlowPagination, useWonFlowConfirm, useWonFlowPagination } from "@/components/feedback";
import { phaseOneApi } from "@/lib/api/phase-one-api";
import { useWonFlowAsyncData } from "@/lib/data";
import { getServiceCategory, groupServiceCategoriesByHandler, hasLivePortal, serviceCategories } from "@/lib/services/service-categories";
import { nextServiceCode, normalizeServiceCode } from "@/lib/services/service-code";

type FeeAuthority = "DOCTOR" | "HOSPITAL";
type BillingOwner = "HOSPITAL" | "DOCTOR";
type WorkspaceCode = "ADMIN" | "RECEPTION" | "DOCTOR" | "LABORATORY" | "RADIOLOGY" | "PHARMACY" | "BILLING" | "MANAGEMENT" | "PHYSIOTHERAPIST" | "NUTRITIONIST";

/** Desks that can operate a service, in the order administrators think of them. */
const serviceDesks: Array<{ code: WorkspaceCode; label: string }> = [
  { code: "RECEPTION", label: "Reception" },
  { code: "DOCTOR", label: "Doctor on duty" },
  { code: "PHYSIOTHERAPIST", label: "Physiotherapy" },
  { code: "NUTRITIONIST", label: "Nutrition / Dietetics" },
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
    consultationModes: ("IN_PERSON" | "ONLINE")[];
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

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40 dark:placeholder:text-slate-500";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="space-y-1.5"><span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>{children}</label>;
}

function ErrorMessage({ message }: { message: string }) {
  return message ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300" role="alert">{message}</p> : null;
}

/** A service may be offered in person, online, or both — never neither, so the caller keeps the last checked box on if it would otherwise leave the set empty. */
function ConsultationModeCheckboxes({ value, onChange }: { value: ("IN_PERSON" | "ONLINE")[]; onChange(next: ("IN_PERSON" | "ONLINE")[]): void }) {
  function toggle(mode: "IN_PERSON" | "ONLINE") {
    const isOn = value.includes(mode);
    if (isOn && value.length === 1) return;
    onChange(isOn ? value.filter((entry) => entry !== mode) : [...value, mode]);
  }
  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"><input checked={value.includes("IN_PERSON")} onChange={() => toggle("IN_PERSON")} type="checkbox" />In person</label>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"><input checked={value.includes("ONLINE")} onChange={() => toggle("ONLINE")} type="checkbox" />Online video consultation</label>
    </div>
  );
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
    <section className="wf-admin-panel rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 text-indigo-600 dark:text-indigo-400" size={21} />
        <div>
          <h2 className="font-bold text-slate-950 dark:text-white">Doctor fee access</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">This setting is enforced by the backend for every doctor consultation service.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {options.map(({ value, icon: Icon, title, description }) => (
          <button
            className={`rounded-2xl border p-4 text-left transition ${
              authority === value
                ? "border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-200 dark:border-indigo-500 dark:bg-indigo-950/40 dark:ring-indigo-900/40"
                : "border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-slate-700"
            }`}
            disabled={saving !== null}
            key={value}
            onClick={() => select(value)}
            type="button"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Icon aria-hidden="true" className="text-indigo-600 dark:text-indigo-400" size={18} />
                <strong className="text-sm font-bold text-slate-950 dark:text-white">{title}</strong>
              </span>
              <span className={`h-3 w-3 rounded-full ${authority === value ? "bg-indigo-600 dark:bg-indigo-400" : "bg-slate-200 dark:bg-slate-700"}`} />
            </span>
            <span className="mt-2 block text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</span>
            {saving === value ? <span className="mt-2 block text-[10px] font-bold text-indigo-700 dark:text-indigo-300">Updating access…</span> : null}
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
  const [consultationModes, setConsultationModes] = useState(service.consultationModes);
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
          consultationModes,
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
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 transition duration-200 hover:border-indigo-200/80 hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-slate-700">
      {confirmDialog}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white">{service.name}</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{service.code} / {category?.label ?? service.category}</p>
          </div>
          {!editing ? (
            <strong className="whitespace-nowrap text-sm font-black text-indigo-600 dark:text-indigo-400">
              {service.priceMinorUnits === null ? "Not priced" : new Intl.NumberFormat("en-PK", { style: "currency", currency: service.currencyCode, maximumFractionDigits: 0 }).format(service.priceMinorUnits / 100)}
            </strong>
          ) : null}
        </div>
        <p className="mt-2.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{service.durationMinutes} minutes / {service.branch?.name ?? "All branches"}</p>
        <p className="mt-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">Handled by {service.handlerMembership?.displayName ?? deskLabel(service.handlerWorkspace)}</p>
        <p className="mt-1 text-[10px] font-bold text-slate-700 dark:text-slate-300">Price set by {billingOwnerLabels[service.billingOwner].toLowerCase()}</p>
        {category && hasLivePortal(category.code) ? (
          <Link className="mt-2.5 inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300" href={category.portalPath}>
            Linked to {category.portalLabel} portal
          </Link>
        ) : null}
        {category && !hasLivePortal(category.code) ? (
          <p className="mt-2.5 inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{category.portalLabel} portal arrives in Phase 2</p>
        ) : null}
        {service.doctor ? (
          <p className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 dark:border-violet-500/30 dark:bg-violet-950/60 dark:text-violet-300">
            Doctor: {service.doctor.staffProfile.membership.displayName}
          </p>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-3">
            {hospitalMaySetPrice ? (
              <Field label={`Price (${service.currencyCode})`}><input className={fieldClass} min="0" onChange={(event) => setPrice(event.target.value)} step="0.01" type="number" value={price} /></Field>
            ) : (
              <p className="self-end rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-bold leading-4 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">The assigned doctor controls this fee.</p>
            )}
            <Field label="Minutes"><input className={fieldClass} min="5" onChange={(event) => setDuration(event.target.value)} required type="number" value={duration} /></Field>
          </div>
          {service.category === "CONSULTATION" ? <Field label="Consultation delivery"><ConsultationModeCheckboxes onChange={setConsultationModes} value={consultationModes} /></Field> : null}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300"><input checked={publiclyBookable} onChange={(event) => setPubliclyBookable(event.target.checked)} type="checkbox" />Available for booking</label>
          <ErrorMessage message={error} />
          <div className="flex gap-2">
            <button className={buttonClass} disabled={saving || duration === ""} onClick={save} type="button"><Save aria-hidden="true" size={16} />{saving ? "Saving" : "Save service"}</button>
            <button className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" disabled={saving} onClick={() => setEditing(false)} type="button">Cancel</button>
          </div>
        </div>
      ) : hospitalMayEdit ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button className="inline-flex min-h-9 items-center rounded-xl border border-indigo-200 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700" onClick={() => setEditing(true)} type="button">
            Edit service & fee
          </button>
          <button className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700" disabled={deleting} onClick={() => void remove()} type="button">
            <Trash2 size={14} />{deleting ? "Deleting..." : "Delete service"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[10px] font-bold text-amber-700 dark:text-amber-400">Doctor-managed: this fee is read-only for hospital administrators.</p>
      )}
    </article>
  );
}

function ServiceCatalogue({ overview, onCreated }: { overview: ServiceOverview; onCreated(): void }) {
  const [query, setQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [form, setForm] = useState({ codeMode: "AUTOMATIC" as "AUTOMATIC" | "CUSTOM", code: "", name: "", category: "CONSULTATION", handler: "", doctorId: "", branchId: "", duration: "15", price: "", publiclyBookable: false, billingOwner: "HOSPITAL" as BillingOwner, consultationModes: ["IN_PERSON"] as ("IN_PERSON" | "ONLINE")[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  // Filtered services based on search query and category
  const filteredServices = useMemo(() => {
    return overview.services.filter((service) => {
      if (selectedCategoryFilter !== "ALL" && service.category !== selectedCategoryFilter) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      const nameMatch = service.name.toLowerCase().includes(q);
      const codeMatch = service.code.toLowerCase().includes(q);
      const categoryMatch = (getServiceCategory(service.category)?.label ?? service.category).toLowerCase().includes(q);
      const doctorMatch = service.doctor?.staffProfile.membership.displayName.toLowerCase().includes(q) ?? false;
      const handlerMatch = (service.handlerMembership?.displayName ?? deskLabel(service.handlerWorkspace)).toLowerCase().includes(q);
      const branchMatch = service.branch?.name.toLowerCase().includes(q) ?? false;
      return nameMatch || codeMatch || categoryMatch || doctorMatch || handlerMatch || branchMatch;
    });
  }, [overview.services, query, selectedCategoryFilter]);

  // Paginate 6 entries per page as requested
  const servicePages = useWonFlowPagination(filteredServices, 6);

  // Category filter options with counts
  const categoryFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const service of overview.services) {
      counts.set(service.category, (counts.get(service.category) ?? 0) + 1);
    }
    return [
      { code: "ALL", label: "All services", count: overview.services.length },
      ...serviceCategories.map((c) => ({
        code: c.code,
        label: c.label,
        count: counts.get(c.code) ?? 0,
      })),
    ];
  }, [overview.services]);

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
          consultationModes: form.consultationModes,
          currencyCode: "PKR",
        }),
      });
      setForm({ codeMode: form.codeMode, code: "", name: "", category: isDoctorManaged ? "LABORATORY" : "CONSULTATION", handler: "", doctorId: "", branchId: "", duration: "15", price: "", publiclyBookable: false, billingOwner: "HOSPITAL", consultationModes: ["IN_PERSON"] });
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The service could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
      {/* Service Catalogue Panel */}
      <section className="wf-admin-panel rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">Service catalogue</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Hospital services and doctor-linked consultation services.</p>
          </div>
          <span className="self-start rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300 sm:self-auto">
            {overview.services.length} {overview.services.length === 1 ? "service" : "services"}
          </span>
        </div>

        {isDoctorManaged ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
            Doctors manage only their own consultation services and fees. The hospital continues to manage every other service category.
          </p>
        ) : null}

        {/* Glassmorphic Search & Filter Container */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white/80 via-slate-50/70 to-indigo-50/40 p-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-gradient-to-r dark:from-slate-900/80 dark:via-slate-900/60 dark:to-indigo-950/40 dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <div className="relative flex items-center">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 text-slate-400 dark:text-slate-500" size={17} />
            <input
              aria-label="Search services catalogue"
              className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-white/80 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 backdrop-blur-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-800 dark:focus:ring-indigo-900/40"
              onChange={(event) => {
                setQuery(event.target.value);
                servicePages.setPage(1);
              }}
              placeholder="Search by service name, code, category, doctor, or desk..."
              type="search"
              value={query}
            />
            {query ? (
              <button
                aria-label="Clear search"
                className="absolute right-3 grid h-6 w-6 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                onClick={() => {
                  setQuery("");
                  servicePages.setPage(1);
                }}
                type="button"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          {/* Filter Pills */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Filter:</span>
            {categoryFilters.map(({ code, label, count }) => {
              if (count === 0 && code !== "ALL") return null;
              const isSelected = selectedCategoryFilter === code;
              return (
                <button
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition backdrop-blur-sm ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25 dark:bg-indigo-500"
                      : "border border-slate-200/60 bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                  key={code}
                  onClick={() => {
                    setSelectedCategoryFilter(code);
                    servicePages.setPage(1);
                  }}
                  type="button"
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Services List or Empty State */}
        {filteredServices.length === 0 ? (
          <div className="mt-4">
            <WonFlowEmptyState
              description={query.trim() || selectedCategoryFilter !== "ALL" ? "Try adjusting your search query or filter." : "Create the hospital's first service using the form."}
              title={query.trim() || selectedCategoryFilter !== "ALL" ? "No matching services" : "No services configured"}
            />
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              {servicePages.visible.map((service) => (
                <ServiceCard authority={overview.configuration.doctorFeeAuthority} key={service.id} onSaved={onCreated} service={service} />
              ))}
            </div>
            <WonFlowPagination
              firstShown={servicePages.firstShown}
              lastShown={servicePages.lastShown}
              noun="services"
              onPageChange={servicePages.setPage}
              page={servicePages.page}
              pageCount={servicePages.pageCount}
              total={servicePages.total}
            />
          </>
        )}
      </section>

      {/* Add Service Form Panel */}
      <section className="wf-admin-panel rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        <h2 className="font-bold text-slate-950 dark:text-white">Add hospital service</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isDoctorManaged ? "Create any non-consultation hospital service. Doctors add their own consultations in their portal." : "Create hospital services or assign a doctor to a hospital-managed consultation."}</p>
        <form className="mt-4 space-y-3" onSubmit={create}>
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Service code</span>
            <div aria-label="Service code mode" className="grid grid-cols-2 gap-2" role="group">
              {([{ mode: "AUTOMATIC" as const, label: "Generate automatically" }, { mode: "CUSTOM" as const, label: "Use custom code" }]).map(({ mode, label }) => (
                <button
                  aria-pressed={form.codeMode === mode}
                  className={`min-h-10 rounded-xl border px-3 text-xs font-bold transition ${
                    form.codeMode === mode
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "border-slate-200 text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                  }`}
                  key={mode}
                  onClick={() => setForm({ ...form, codeMode: mode })}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            {form.codeMode === "AUTOMATIC" ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Next code for this category: <strong className="font-mono text-indigo-700 dark:text-indigo-400">{generatedCode}</strong>. The final code is confirmed by the server when the service is created.</p>
            ) : (
              <input aria-label="Custom service code" className={fieldClass} onChange={(event) => setForm({ ...form, code: normalizeServiceCode(event.target.value) })} placeholder="LAB-XRAY-01" required value={form.code} />
            )}
          </div>
          <Field label="Service name"><input className={fieldClass} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} /></Field>
          {!isDoctorManaged ? (
            <Field label="Assigned doctor">
              <select className={fieldClass} onChange={(event) => setForm({ ...form, doctorId: event.target.value })} value={form.doctorId}>
                <option value="">Hospital service</option>
                {overview.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.staffProfile.membership.displayName}{doctor.specialty ? ` · ${doctor.specialty}` : ""}</option>)}
              </select>
            </Field>
          ) : null}
          {isDoctorManaged || !form.doctorId ? (
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Category</span>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">What the service is, grouped by the team that performs it.</p>
              <select aria-label="Service category" className={fieldClass} onChange={(event) => setForm({ ...form, category: event.target.value })} required value={selectedCategory}>
                {groupServiceCategoriesByHandler(availableCategories).map(({ handler, categories }) => (
                  <optgroup key={handler} label={`Handled by ${handler}`}>
                    {categories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Handled by</span>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Who operates this service — a desk, or one named person.</p>
            <select aria-label="Handled by" className={fieldClass} onChange={(event) => setForm({ ...form, handler: event.target.value })} value={handlerValue}>
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
          {!isDoctorManaged && form.doctorId ? <Field label="Consultation delivery"><ConsultationModeCheckboxes onChange={(modes) => setForm({ ...form, consultationModes: modes })} value={form.consultationModes} /></Field> : null}
          <Field label="Branch">
            <select className={fieldClass} onChange={(event) => setForm({ ...form, branchId: event.target.value })} value={form.branchId}>
              <option value="">All branches</option>
              {overview.configuration.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Minutes"><input className={fieldClass} min="5" onChange={(event) => setForm({ ...form, duration: event.target.value })} required type="number" value={form.duration} /></Field>
            {selectedBillingOwner === "DOCTOR" ? null : (
              <Field label="Price (PKR)"><input className={fieldClass} min="0" onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="0" required step="0.01" type="number" value={form.price} /></Field>
            )}
          </div>
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Price controlled by</span>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Enforced by the backend for every change to this service fee.</p>
            <div className="grid gap-2">
              {billingOwnerOptions.map((option) => (
                <button
                  aria-pressed={selectedBillingOwner === option.value}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedBillingOwner === option.value
                      ? "border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/60"
                      : "border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                  key={option.value}
                  onClick={() => setForm({ ...form, billingOwner: option.value })}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong className="text-xs font-bold text-slate-950 dark:text-white">{option.label}</strong>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${selectedBillingOwner === option.value ? "bg-indigo-600 dark:bg-indigo-400" : "bg-slate-200 dark:bg-slate-700"}`} />
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-slate-600 dark:text-slate-300">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300"><input checked={form.publiclyBookable} onChange={(event) => setForm({ ...form, publiclyBookable: event.target.checked })} type="checkbox" />Available for booking</label>
          {isDoctorManaged ? <p className="rounded-xl bg-indigo-50 p-3 text-xs leading-5 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">Consultation is intentionally excluded here. Doctors manage it under <strong>Doctor Portal → Fees &amp; Services</strong>.</p> : null}
          {isDoctorManaged || !form.doctorId ? <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><strong>{getServiceCategory(selectedCategory)?.label}</strong> service, handled by <strong>{handlerSummary}</strong>, priced by <strong>{billingOwnerLabels[selectedBillingOwner].toLowerCase()}</strong>. It stays available to Reception and Billing.</p> : null}
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
      <section className="relative overflow-hidden rounded-[24px] border border-indigo-200/80 bg-gradient-to-br from-cyan-50 via-white to-violet-100 p-5 shadow-[0_12px_36px_rgba(79,70,229,0.08)] sm:p-6 dark:border-indigo-500/20 dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 via-indigo-500 to-violet-600" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-8 h-72 w-72 rounded-full bg-violet-400/30 blur-3xl dark:bg-violet-500/10" />
        <div className="relative flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/60 dark:ring-indigo-400/30">
            <UserRoundCog aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Services & governance</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white sm:text-3xl">Services & Prices</h1>
            <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">Configure hospital services and choose who controls doctor consultation fees.</p>
          </div>
        </div>
      </section>

      <WonFlowAsyncDataBoundary loadingDescription="Reading live hospital pricing controls." loadingTitle="Loading service access" onRetry={resource.reload} state={resource}>
        {(overview) => (
          <div className="space-y-4">
            <AuthoritySelector authority={overview.configuration.doctorFeeAuthority} onSaved={resource.reload} />
            <ServiceCatalogue onCreated={resource.reload} overview={overview} />
          </div>
        )}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
