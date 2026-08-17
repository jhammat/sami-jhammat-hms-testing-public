"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  Check,
  FileClock,
  KeyRound,
  Network,
  Pencil,
  Plus,
  Save,
  Settings2,
  Stethoscope,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";

import { WonFlowAsyncDataBoundary, WonFlowEmptyState, WonFlowPagination, useWonFlowConfirm, useWonFlowPagination, wonflowConfirm } from "@/components/feedback";
import { phaseOneApi } from "@/lib/api/phase-one-api";
import { useWonFlowAsyncData } from "@/lib/data";
import { groupServiceCategoriesByHandler, serviceCategories } from "@/lib/services/service-categories";

interface BranchRecord {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  isMainBranch: boolean;
  timezone: string;
  currencyCode: string;
  email: string | null;
  phone: string | null;
}

interface OrganizationConfiguration {
  id: string;
  displayName: string;
  doctorFeeAuthority: "DOCTOR" | "HOSPITAL";
  legalName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoObjectKey?: string | null;
  settings?: { logoDataUrl?: string; [key: string]: unknown } | null;
  updatedAt: string;
  branches: BranchRecord[];
}

interface UserRecord {
  id: string;
  displayName: string;
  status: string;
  workspaceCodes: string[];
  identity: { email: string; status: string };
  primaryBranch: { id: string; name: string } | null;
  roles: Array<{ role: { id: string; name: string } }>;
  doctorProfile?: { department: { id: string; name: string; code: string } | null } | null;
}

type IssuedCredentials = {
  mode?: "TEMPORARY_PASSWORD";
  username: string;
  temporaryPassword: string;
  loginUrl: string;
};

interface ServiceRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  durationMinutes: number;
  priceMinorUnits: number | null;
  currencyCode: string;
  publiclyBookable: boolean;
  isActive: boolean;
  branch: { id: string; name: string } | null;
  doctor: {
    id: string;
    staffProfile: { membership: { displayName: string } };
  } | null;
}

interface ScheduleRecord {
  id: string;
  weekday: number;
  startsMinute: number;
  endsMinute: number;
  capacity: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string | null;
  branch: { id: string; name: string };
  doctor: { id: string; specialty: string | null; registrationNumber: string | null };
  service: { id: string; name: string } | null;
}

interface AuditRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  severity: string;
  createdAt: string;
}

interface DoctorRecord {
  id: string;
  registrationNumber: string | null;
  specialty: string | null;
  durationMinutes: number;
  publiclyBookable: boolean;
  staffProfile: {
    employeeNumber: string;
    status: string;
    title: string | null;
    membership: { displayName: string };
    branch: { id: string; name: string } | null;
  };
}

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const primaryButtonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

function formatRoleList(user: UserRecord) {
  return user.roles.map((assignment) => assignment.role.name).filter(Boolean).join(", ") || "No role assigned";
}

function useAdminResource<T>(key: string, path: string) {
  return useWonFlowAsyncData<T>({
    key,
    loader: (signal) => phaseOneApi<T>(path, { signal }),
  });
}

function PageIntro({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: typeof Building2;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-violet-50 p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-200"><Icon aria-hidden="true" size={22} /></span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </section>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="wf-admin-panel overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MutationMessage({ error, success }: { error: string; success: string }) {
  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{error}</p>;
  if (success) return <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700" role="status">{success}</p>;
  return null;
}

function ConfigurationForm({ configuration, onSaved }: { configuration: OrganizationConfiguration; onSaved(): void }) {
  const [logoPreview, setLogoPreview] = useState<string>(() => {
    return (
      (configuration.settings as { logoDataUrl?: string } | null)?.logoDataUrl ??
      // eslint-disable-next-line no-restricted-syntax
      (typeof window !== "undefined" ? localStorage.getItem("wonflow_hospital_logo") ?? "" : "")
    );
  });

  const [form, setForm] = useState({
    displayName: configuration.displayName,
    legalName: configuration.legalName ?? "",
    email: configuration.email ?? "",
    phone: configuration.phone ?? "",
    website: configuration.website ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setLogoPreview(dataUrl);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-restricted-syntax
        localStorage.setItem("wonflow_hospital_logo", dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview("");
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-restricted-syntax
      localStorage.removeItem("wonflow_hospital_logo");
    }
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (typeof window !== "undefined" && logoPreview) {
        // eslint-disable-next-line no-restricted-syntax
        localStorage.setItem("wonflow_hospital_logo", logoPreview);
      }
      await phaseOneApi("/api/v1/admin/configuration", {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          settings: {
            ...(configuration.settings ?? {}),
            logoDataUrl: logoPreview || undefined,
          },
        }),
      });
      setSuccess("Hospital profile and official logo saved successfully. The logo will now appear across all slips, reports, and receipts.");
      setIsEditing(false);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Hospital Logo" className="h-full w-full object-contain" src={logoPreview} />
              ) : (
                <Building2 className="text-slate-400" size={32} />
              )}
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Hospital Logo & Document Branding</h4>
              <p className="text-[11px] text-slate-500 font-medium">
                This logo is printed on all Billing Receipts, Test Execution Slips, and Diagnostic Reports.
              </p>
              {logoPreview ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <Check size={11} /> Custom Logo Active
                </span>
              ) : (
                <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Using default WonFlow logo
                </span>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100">
                <Upload size={14} /> Upload New Logo
                <input accept="image/*" className="sr-only" onChange={handleLogoUpload} type="file" />
              </label>
              {logoPreview && (
                <button
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100"
                  onClick={removeLogo}
                  type="button"
                >
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LabeledField label="Hospital name"><input className={fieldClass} readOnly={!isEditing} required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></LabeledField>
        <LabeledField label="Legal name"><input className={fieldClass} readOnly={!isEditing} value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></LabeledField>
        <LabeledField label="Contact email"><input className={fieldClass} readOnly={!isEditing} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></LabeledField>
        <LabeledField label="Contact phone"><input className={fieldClass} readOnly={!isEditing} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></LabeledField>
        <LabeledField label="Website"><input className={fieldClass} readOnly={!isEditing} type="url" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></LabeledField>
      </div>
      <MutationMessage error={error} success={success} />
      <div className="flex flex-wrap gap-3">
        {isEditing ? (
          <button className={primaryButtonClass} disabled={saving} type="submit"><Save aria-hidden="true" size={17} />{saving ? "Saving" : "Save hospital profile"}</button>
        ) : (
          <>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm" disabled type="button"><Check aria-hidden="true" size={17} />Saved</button>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700" onClick={() => { setIsEditing(true); setSuccess(""); }} type="button"><Pencil aria-hidden="true" size={16} />Edit profile</button>
          </>
        )}
      </div>
    </form>
  );
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="space-y-1.5"><span className="block text-xs font-bold text-slate-700">{label}</span>{children}</label>;
}

export function LiveHospitalSetupPage() {
  const resource = useAdminResource<{ configuration: OrganizationConfiguration }>("admin:configuration", "/api/v1/admin/configuration");
  return (
    <div className="space-y-4" id="main-content">
      <PageIntro icon={Settings2} eyebrow="Hospital administration" title="Hospital setup" description="Maintain the real organization profile used across operational and patient-facing workflows." />
      <WonFlowAsyncDataBoundary loadingTitle="Loading hospital profile" loadingDescription="Reading the current organization configuration." onRetry={resource.reload} state={resource}>
        {({ configuration }) => <Panel title="Organization profile" description="These values are stored in the tenant database."><ConfigurationForm configuration={configuration} onSaved={resource.reload} /></Panel>}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}

function BranchCard({ branch, onChanged, onError }: { branch: BranchRecord; onChanged(): void; onError(message: string): void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ code: branch.code, name: branch.name, timezone: branch.timezone });
  const [busy, setBusy] = useState(false);
  const { confirm, dialog: confirmDialog } = useWonFlowConfirm();

  async function call(body: Record<string, unknown> | undefined, method: "PATCH" | "DELETE") {
    setBusy(true);
    onError("");
    try {
      await phaseOneApi(`/api/v1/admin/branches/${branch.id}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      setEditing(false);
      onChanged();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "The branch could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!await confirm({ title: "Delete branch", message: `${branch.name} is archived and its availability rules are switched off. Historical records are preserved.`, confirmLabel: "Delete branch" })) return;
    await call(undefined, "DELETE");
  }

  if (editing) {
    return (
      <article className="rounded-2xl border border-blue-300 bg-blue-50/40 p-4">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void call({ code: form.code, name: form.name, timezone: form.timezone }, "PATCH"); }}>
          <LabeledField label="Branch code"><input className={fieldClass} maxLength={80} required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></LabeledField>
          <LabeledField label="Branch name"><input className={fieldClass} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></LabeledField>
          <LabeledField label="Timezone"><input className={fieldClass} required value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></LabeledField>
          <div className="flex flex-wrap gap-2">
            <button className={primaryButtonClass} disabled={busy} type="submit"><Save aria-hidden="true" size={16} />{busy ? "Saving" : "Save"}</button>
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700" onClick={() => { setEditing(false); setForm({ code: branch.code, name: branch.name, timezone: branch.timezone }); }} type="button">Cancel</button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200 p-4" key={branch.id}>
      {confirmDialog}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950">{branch.name}</h3>
          <p className="mt-1 text-xs text-slate-500">{branch.code} · {branch.timezone}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">{branch.status}</span>
      </div>

      {branch.isMainBranch ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700"><Check aria-hidden="true" size={12} />Main branch</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60" disabled={busy} onClick={() => setEditing(true)} type="button"><Pencil aria-hidden="true" size={14} />Edit</button>
        {branch.isMainBranch ? null : (
          <>
            <button className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60" disabled={busy} onClick={() => void call({ isMainBranch: true }, "PATCH")} type="button"><Building2 aria-hidden="true" size={14} />Make main</button>
            <button className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60" disabled={busy} onClick={() => void remove()} type="button"><Trash2 aria-hidden="true" size={14} />Delete</button>
          </>
        )}
      </div>

      {branch.isMainBranch ? <p className="mt-3 text-[11px] leading-5 text-slate-500">The main branch cannot be deleted. Promote another branch first.</p> : null}
    </article>
  );
}

function BranchManager({ configuration, onCreated }: { configuration: OrganizationConfiguration; onCreated(): void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [isMainBranch, setIsMainBranch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const mainBranch = configuration.branches.find((branch) => branch.isMainBranch);
  const branchPages = useWonFlowPagination(configuration.branches, 8);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await phaseOneApi("/api/v1/admin/branches", {
        method: "POST",
        body: JSON.stringify({ code, name, timezone, isMainBranch }),
      });
      setCode("");
      setName("");
      setIsMainBranch(false);
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The branch could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <Panel title="Configured branches" description={`${configuration.branches.length} real database ${configuration.branches.length === 1 ? "record" : "records"}. ${mainBranch ? `${mainBranch.name} is the main branch.` : "No main branch is set."}`}>
        {error ? <div className="mb-3"><MutationMessage error={error} success="" /></div> : null}
        {configuration.branches.length === 0 ? <WonFlowEmptyState title="No branches configured" description="Create the hospital's first operating location." /> : <><div className="grid gap-3 sm:grid-cols-2">{branchPages.visible.map((branch) => <BranchCard branch={branch} key={branch.id} onChanged={onCreated} onError={setError} />)}</div><WonFlowPagination firstShown={branchPages.firstShown} lastShown={branchPages.lastShown} noun="branches" onPageChange={branchPages.setPage} page={branchPages.page} pageCount={branchPages.pageCount} total={branchPages.total} /></>}
      </Panel>
      <Panel title="Add branch" description="Create a tenant-scoped operating location.">
        <form className="space-y-3" onSubmit={create}>
          <LabeledField label="Branch code"><input className={fieldClass} maxLength={80} required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /></LabeledField>
          <LabeledField label="Branch name"><input className={fieldClass} required value={name} onChange={(event) => setName(event.target.value)} /></LabeledField>
          <LabeledField label="Timezone"><input className={fieldClass} required value={timezone} onChange={(event) => setTimezone(event.target.value)} /></LabeledField>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input checked={isMainBranch} onChange={(event) => setIsMainBranch(event.target.checked)} type="checkbox" />Make this the main branch</label>
          {isMainBranch && mainBranch ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">{mainBranch.name} will stop being the main branch. A hospital has exactly one.</p> : null}
          <MutationMessage error={error} success="" />
          <button className={`${primaryButtonClass} w-full`} disabled={saving} type="submit"><Plus aria-hidden="true" size={17} />{saving ? "Creating" : "Create branch"}</button>
        </form>
      </Panel>
    </div>
  );
}

interface DepartmentRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  branch: { id: string; name: string } | null;
  _count: { doctors: number };
}

function DepartmentCard({ department, branches, onChanged, onError }: { department: DepartmentRecord; branches: BranchRecord[]; onChanged(): void; onError(message: string): void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ code: department.code, name: department.name, description: department.description ?? "", branchId: department.branch?.id ?? "" });
  const [busy, setBusy] = useState(false);

  async function call(body: Record<string, unknown> | undefined, method: "PATCH" | "DELETE") {
    setBusy(true);
    onError("");
    try {
      await phaseOneApi(`/api/v1/admin/departments/${department.id}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      setEditing(false);
      onChanged();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "The department could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <article className="rounded-2xl border border-blue-300 bg-blue-50/40 p-4">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void call({ code: form.code, name: form.name, description: form.description, branchId: form.branchId || null }, "PATCH"); }}>
          <LabeledField label="Department code"><input className={fieldClass} maxLength={80} required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></LabeledField>
          <LabeledField label="Department name"><input className={fieldClass} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></LabeledField>
          <LabeledField label="Description"><input className={fieldClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></LabeledField>
          <LabeledField label="Branch"><select className={fieldClass} value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></LabeledField>
          <div className="flex flex-wrap gap-2">
            <button className={primaryButtonClass} disabled={busy} type="submit"><Save aria-hidden="true" size={16} />{busy ? "Saving" : "Save"}</button>
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700" onClick={() => setEditing(false)} type="button">Cancel</button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950">{department.name}</h3>
          <p className="mt-1 text-xs text-slate-500">{department.code} · {department.branch?.name ?? "All branches"}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${department.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{department.isActive ? "ACTIVE" : "INACTIVE"}</span>
      </div>
      {department.description ? <p className="mt-2 text-xs leading-5 text-slate-600">{department.description}</p> : null}
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-blue-700">{department._count.doctors} {department._count.doctors === 1 ? "doctor" : "doctors"}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60" disabled={busy} onClick={() => setEditing(true)} type="button"><Pencil aria-hidden="true" size={14} />Edit</button>
        <button className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60" disabled={busy} onClick={() => { void (async () => { if (await wonflowConfirm({ title: "Delete department", message: `The ${department.name} department is removed. Doctors assigned to it keep their records.`, confirmLabel: "Delete department" })) await call(undefined, "DELETE"); })(); }} type="button"><Trash2 aria-hidden="true" size={14} />Delete</button>
      </div>
    </article>
  );
}

function DepartmentManager({ departments, branches, onChanged }: { departments: DepartmentRecord[]; branches: BranchRecord[]; onChanged(): void }) {
  const [form, setForm] = useState({ code: "", name: "", description: "", branchId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const departmentPages = useWonFlowPagination(departments, 8);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await phaseOneApi("/api/v1/admin/departments", { method: "POST", body: JSON.stringify({ ...form, branchId: form.branchId || undefined }) });
      setForm({ code: "", name: "", description: "", branchId: "" });
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The department could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <Panel title="Configured departments" description={`${departments.length} department ${departments.length === 1 ? "record" : "records"}. Doctors are assigned to these when they are invited.`}>
        {error ? <div className="mb-3"><MutationMessage error={error} success="" /></div> : null}
        {departments.length === 0 ? <WonFlowEmptyState title="No departments configured" description="Create the first department so doctors can be assigned to one." /> : <><div className="grid gap-3 sm:grid-cols-2">{departmentPages.visible.map((department) => <DepartmentCard branches={branches} department={department} key={department.id} onChanged={onChanged} onError={setError} />)}</div><WonFlowPagination firstShown={departmentPages.firstShown} lastShown={departmentPages.lastShown} noun="departments" onPageChange={departmentPages.setPage} page={departmentPages.page} pageCount={departmentPages.pageCount} total={departmentPages.total} /></>}
      </Panel>
      <Panel title="Add department" description="Departments group clinical staff and appear when inviting a doctor.">
        <form className="space-y-3" onSubmit={create}>
          <LabeledField label="Department code"><input className={fieldClass} maxLength={80} required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></LabeledField>
          <LabeledField label="Department name"><input className={fieldClass} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></LabeledField>
          <LabeledField label="Description"><input className={fieldClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></LabeledField>
          <LabeledField label="Branch"><select className={fieldClass} value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></LabeledField>
          <MutationMessage error={error} success="" />
          <button className={`${primaryButtonClass} w-full`} disabled={saving} type="submit"><Plus aria-hidden="true" size={17} />{saving ? "Creating" : "Create department"}</button>
        </form>
      </Panel>
    </div>
  );
}

export function LiveHospitalDepartmentsPage() {
  const resource = useAdminResource<{ departments: DepartmentRecord[] }>("admin:departments", "/api/v1/admin/departments");
  const configuration = useAdminResource<{ configuration: OrganizationConfiguration }>("admin:departments-branches", "/api/v1/admin/configuration");
  return (
    <div className="space-y-4" id="main-content">
      <PageIntro icon={Network} eyebrow="People & locations" title="Departments" description="Manage the clinical departments doctors are assigned to across this hospital." />
      <WonFlowAsyncDataBoundary loadingTitle="Loading departments" loadingDescription="Reading department records from the tenant database." onRetry={resource.reload} state={resource}>
        {({ departments }) => <DepartmentManager branches={configuration.data?.configuration.branches ?? []} departments={departments} onChanged={resource.reload} />}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}

export function LiveHospitalBranchesPage() {
  const resource = useAdminResource<{ configuration: OrganizationConfiguration }>("admin:branches", "/api/v1/admin/configuration");
  return <div className="space-y-4" id="main-content"><PageIntro icon={Building2} eyebrow="People & locations" title="Branches & locations" description="Manage only the locations stored for this hospital tenant." /><WonFlowAsyncDataBoundary loadingTitle="Loading branches" loadingDescription="Reading branch records from the tenant database." onRetry={resource.reload} state={resource}>{({ configuration }) => <BranchManager configuration={configuration} onCreated={resource.reload} />}</WonFlowAsyncDataBoundary></div>;
}

/*
 * Credentials are handed over as plain text the administrator can paste into
 * email, SMS or WhatsApp. No sign-in link is issued: the recipient goes to the
 * hospital's normal login page and is forced to set their own password there.
 */
function buildCredentialMessage(credentials: IssuedCredentials, organizationName?: string): string {
  const hospitalName = organizationName?.trim() || "WonFlow";
  return [
    `${hospitalName} account`,
    `Username: ${credentials.username}`,
    `Temporary password: ${credentials.temporaryPassword}`,
    "",
    `Sign in at your ${hospitalName} address and you will be asked to set your own password straight away.`,
    "This temporary password stops working once you change it. Do not share it.",
  ].join("\n");
}

function IssuedCredentialsPanel({ credentials, organizationName }: { credentials: IssuedCredentials; organizationName?: string }) {
  const [copied, setCopied] = useState(false);
  const [userEditedMessage, setUserEditedMessage] = useState<string | null>(null);
  const [prevCredentials, setPrevCredentials] = useState(credentials);

  if (prevCredentials !== credentials) {
    setPrevCredentials(credentials);
    setUserEditedMessage(null);
  }

  const message = userEditedMessage ?? buildCredentialMessage(credentials, organizationName);
  const hospitalName = organizationName?.trim() || "WonFlow";

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => { setCopied(false); }, 2500);
    } catch {
      // Clipboard permission denied: the text stays selectable on screen.
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-xs font-bold text-emerald-900">Account created — share these credentials</p>

      <p className="mt-2 break-all text-xs text-emerald-800"><strong>Username:</strong> {credentials.username}</p>
      <p className="mt-1 break-all text-xs text-emerald-800"><strong>Temporary password:</strong> <span className="font-mono">{credentials.temporaryPassword}</span></p>
      <p className="mt-1 text-xs leading-5 text-emerald-700">They must change this password the first time they sign in. You can edit the message below before sending.</p>

      {/* Editable textarea so the administrator can customize the message before sending */}
      <textarea
        aria-label="Message to send to the staff member"
        className="mt-3 w-full rounded-lg border border-emerald-300 bg-white p-2 font-mono text-[11px] leading-5 text-emerald-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        onChange={(e) => setUserEditedMessage(e.target.value)}
        rows={6}
        value={message}
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button className="inline-flex min-h-9 items-center rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800" onClick={() => { void copyMessage(); }} type="button">
          {copied ? "Copied" : "Copy message"}
        </button>

        <a
          className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
          href={`mailto:${encodeURIComponent(credentials.username)}?subject=${encodeURIComponent(`Your ${hospitalName} account`)}&body=${encodeURIComponent(message)}`}
        >
          Send by email
        </a>

        <a
          className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
          href={`sms:?&body=${encodeURIComponent(message)}`}
        >
          Send by SMS
        </a>
      </div>
    </div>
  );
}

function TeamManager({ users, branches, departments, organizationName, onInvited }: { users: UserRecord[]; branches: BranchRecord[]; departments: DepartmentRecord[]; organizationName?: string; onInvited(): void }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [workspace, setWorkspace] = useState("DOCTOR");
  const [department, setDepartment] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [removingId, setRemovingId] = useState<string>();
  const [resettingId, setResettingId] = useState<string>();
  const [resetCredentials, setResetCredentials] = useState<IssuedCredentials>();
  const [credentials, setCredentials] = useState<IssuedCredentials>();
  const [query, setQuery] = useState("");

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized === "") return users;
    return users.filter((user) => {
      const roleNames = user.roles.map((assignment) => assignment.role.name).join(" ").toLowerCase();
      const departmentName = user.doctorProfile?.department?.name?.toLowerCase() ?? "";
      return [user.displayName, user.identity.email, user.primaryBranch?.name ?? "", user.workspaceCodes.join(" "), roleNames, departmentName].join(" ").toLowerCase().includes(normalized);
    });
  }, [query, users]);

  const userPages = useWonFlowPagination(filteredUsers, 4);
  const { confirm, dialog: confirmDialog } = useWonFlowConfirm();

  async function removeUser(user: UserRecord) {
    if (!await confirm({ title: "Remove hospital access", message: `${user.displayName} loses access immediately. Their historical records are preserved.`, confirmLabel: "Remove access" })) return;
    setRemovingId(user.id);
    setRemoveError("");
    try {
      await phaseOneApi(`/api/v1/admin/users/${user.id}`, { method: "DELETE" });
      onInvited();
    } catch (caught) {
      setRemoveError(caught instanceof Error ? caught.message : "The user could not be removed.");
    } finally {
      setRemovingId(undefined);
    }
  }

  async function resetPassword(user: UserRecord) {
    if (!await confirm({ title: "Reset password", message: `${user.displayName}'s active sessions end immediately, and they must set a new password at next login.`, confirmLabel: "Reset password", tone: "primary" })) return;
    setResettingId(user.id);
    setRemoveError("");
    setResetCredentials(undefined);
    try {
      const response = await phaseOneApi<{ credentials: { username: string; temporaryPassword: string; loginUrl: string } }>(`/api/v1/admin/users/${user.id}/reset-password`, { method: "POST" });
      setResetCredentials({ mode: "TEMPORARY_PASSWORD", ...response.credentials });
    } catch (caught) {
      setRemoveError(caught instanceof Error ? caught.message : "The password could not be reset.");
    } finally {
      setResettingId(undefined);
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (workspace === "DOCTOR" && !department) {
      setError(departments.length === 0
        ? "Create a department first, then assign this doctor to it."
        : "Select the doctor's department.");
      return;
    }
    setSaving(true);
    setError("");
    setCredentials(undefined);
    try {
      const response = await phaseOneApi<{ credentials: IssuedCredentials }>("/api/v1/admin/users/invitations", { method: "POST", body: JSON.stringify({ displayName, email, departmentId: workspace === "DOCTOR" ? department : undefined, primaryBranchId: branchId || undefined, workspaceCodes: [workspace] }) });
      setCredentials(response.credentials);
      setDisplayName("");
      setEmail("");
      setDepartment("");
      onInvited();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The invitation could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">{confirmDialog}<Panel title="Hospital users" description={`${users.length} active tenant membership ${users.length === 1 ? "record" : "records"}.`}>{removeError ? <div className="mb-3"><MutationMessage error={removeError} success="" /></div> : null}{resetCredentials ? <div className="mb-3"><IssuedCredentialsPanel credentials={resetCredentials} organizationName={organizationName} /></div> : null}<div className="mb-3"><label className="sr-only" htmlFor="team-search">Search hospital users</label><input className={fieldClass} id="team-search" placeholder="Search by name, email, branch, department, role or workspace" type="search" value={query} onChange={(event) => { setQuery(event.target.value); userPages.setPage(1); }} /></div>{filteredUsers.length === 0 ? <WonFlowEmptyState title={query.trim() === "" ? "No hospital users" : "No matching users"} description={query.trim() === "" ? "Invite the first staff member." : "Adjust the search terms to find a team member."} /> : <div className="space-y-2">{userPages.visible.map((user) => <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between" key={user.id}><div><h3 className="font-bold text-slate-950">{user.displayName}</h3><p className="text-xs text-slate-500">{user.identity.email} · {user.primaryBranch?.name ?? "No branch assigned"}{user.doctorProfile?.department ? ` · ${user.doctorProfile.department.name}` : ""}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">{user.workspaceCodes.join(", ") || "No workspace"}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">{formatRoleList(user)}</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">{user.status}</span><button aria-label={`Reset password for ${user.displayName}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={resettingId !== undefined || removingId !== undefined} onClick={() => void resetPassword(user)} type="button"><KeyRound aria-hidden="true" size={14} />{resettingId === user.id ? "Resetting" : "Reset password"}</button><button aria-label={`Remove ${user.displayName}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={removingId !== undefined || resettingId !== undefined} onClick={() => void removeUser(user)} type="button"><Trash2 aria-hidden="true" size={14} />{removingId === user.id ? "Removing" : "Remove access"}</button></div></article>)}</div>}<WonFlowPagination firstShown={userPages.firstShown} lastShown={userPages.lastShown} noun="users" onPageChange={userPages.setPage} page={userPages.page} pageCount={userPages.pageCount} total={userPages.total} /></Panel><Panel title="Invite staff" description="A temporary password is generated to share with the staff member. They set their own password at first sign-in."><form className="space-y-3" onSubmit={invite}><LabeledField label="Full name"><input className={fieldClass} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></LabeledField><LabeledField label="Email (login username)"><input className={fieldClass} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></LabeledField><LabeledField label="Workspace"><select className={fieldClass} value={workspace} onChange={(event) => setWorkspace(event.target.value)}><option value="DOCTOR">Doctor</option><option value="RECEPTION">Reception</option><option value="LABORATORY">Laboratory</option><option value="RADIOLOGY">Radiology</option><option value="PHARMACY">Pharmacy</option><option value="BILLING">Billing</option><option value="MANAGEMENT">Management</option><option value="ADMIN">Administrator</option></select></LabeledField>{workspace === "DOCTOR" ? <LabeledField label="Department"><select className={fieldClass} required value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Select department</option>{departments.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>{departments.length === 0 ? <p className="mt-1.5 text-[11px] font-semibold text-amber-700">No departments exist yet. Create one under Departments before inviting a doctor.</p> : null}</LabeledField> : null}<LabeledField label="Primary branch"><select className={fieldClass} value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">No branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></LabeledField><MutationMessage error={error} success="" /><button className={`${primaryButtonClass} w-full`} disabled={saving} type="submit"><UserPlus aria-hidden="true" size={17} />{saving ? "Creating invitation" : "Invite staff"}</button>{credentials ? <IssuedCredentialsPanel credentials={credentials} organizationName={organizationName} /> : null}</form></Panel></div>;
}

export function LiveHospitalTeamPage() {
  const resource = useAdminResource<{ users: UserRecord[]; configuration: OrganizationConfiguration; departments: DepartmentRecord[] }>("admin:team", "/api/v1/admin/team-overview");
  return <div className="space-y-4" id="main-content"><PageIntro icon={Users} eyebrow="People & locations" title="Team & permissions" description="View tenant memberships and invite authorized hospital staff." /><WonFlowAsyncDataBoundary loadingTitle="Loading hospital team" loadingDescription="Reading users and branches from the tenant database." onRetry={resource.reload} state={resource}>{({ users, configuration, departments }) => <TeamManager branches={configuration.branches} departments={departments ?? []} onInvited={resource.reload} organizationName={configuration.displayName} users={users} />}</WonFlowAsyncDataBoundary></div>;
}

function DoctorDirectory({ doctors }: { doctors: DoctorRecord[] }) {
  const doctorPages = useWonFlowPagination(doctors, 8);
  return (
          <Panel title="Clinical staff directory" description={`${doctors.length} doctor ${doctors.length === 1 ? "profile" : "profiles"}.`}>
            {doctors.length === 0 ? (
              <WonFlowEmptyState title="No doctor profiles" description="Invite a staff member with the Doctor workspace to create their clinical profile." />
            ) : (
              <>
              <div className="grid gap-3 md:grid-cols-2">
                {doctorPages.visible.map((doctor) => (
                  <article className="rounded-2xl border border-slate-200 p-4" key={doctor.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-950">{doctor.staffProfile.title ? `${doctor.staffProfile.title} ` : ""}{doctor.staffProfile.membership.displayName}</h3>
                        <p className="mt-1 text-xs text-slate-500">{doctor.specialty ?? "Specialty not set"} · {doctor.staffProfile.branch?.name ?? "No branch assigned"}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">{doctor.staffProfile.status}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600">
                      <span className="rounded-lg bg-slate-100 px-2 py-1">{doctor.registrationNumber ?? doctor.staffProfile.employeeNumber}</span>
                      <span className="rounded-lg bg-blue-50 px-2 py-1 text-blue-700">{doctor.durationMinutes} min appointments</span>
                      <span className={`rounded-lg px-2 py-1 ${doctor.publiclyBookable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{doctor.publiclyBookable ? "Publicly bookable" : "Internal bookings"}</span>
                    </div>
                  </article>
                ))}
              </div>
              <WonFlowPagination firstShown={doctorPages.firstShown} lastShown={doctorPages.lastShown} noun="doctors" onPageChange={doctorPages.setPage} page={doctorPages.page} pageCount={doctorPages.pageCount} total={doctorPages.total} />
              </>
            )}
          </Panel>
  );
}

export function LiveHospitalDoctorsPage() {
  const resource = useAdminResource<{ doctors: DoctorRecord[] }>("admin:doctors-live", "/api/v1/admin/doctors");
  return (
    <div className="space-y-4" id="main-content">
      <PageIntro icon={Stethoscope} eyebrow="People & locations" title="Doctors & clinical staff" description="Review clinical profiles, specialties and hospital branch assignments." />
      <WonFlowAsyncDataBoundary loadingTitle="Loading clinical staff" loadingDescription="Reading doctor profiles from the tenant database." onRetry={resource.reload} state={resource}>
        {({ doctors }) => <DoctorDirectory doctors={doctors} />}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}

function ServiceManagerModern({ services, branches, onCreated }: { services: ServiceRecord[]; branches: BranchRecord[]; onCreated(): void }) {
  const servicePages = useWonFlowPagination(services, 8);
  const [form, setForm] = useState({ codeMode: "auto", code: "", name: "", category: "CONSULTATION", durationMinutes: "15", price: "", branchId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await phaseOneApi("/api/v1/admin/services", {
        method: "POST",
        body: JSON.stringify({
          code: form.codeMode === "auto" ? undefined : form.code,
          name: form.name,
          category: form.category,
          durationMinutes: Number(form.durationMinutes),
          priceMinorUnits: form.price === "" ? undefined : Math.round(Number(form.price) * 100),
          branchId: form.branchId || undefined,
          currencyCode: "PKR",
        }),
      });
      setForm({ codeMode: "auto", code: "", name: "", category: "CONSULTATION", durationMinutes: "15", price: "", branchId: "" });
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The service could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]"><Panel title="Service catalogue" description={`${services.length} live service ${services.length === 1 ? "record" : "records"}.`}>{services.length === 0 ? <WonFlowEmptyState title="No services configured" description="Create the first hospital service and price." /> : <><div className="grid gap-3 sm:grid-cols-2">{servicePages.visible.map((service) => <article className="rounded-2xl border border-slate-200 p-4" key={service.id}><div className="flex justify-between gap-3"><div><h3 className="font-bold text-slate-950">{service.name}</h3><p className="mt-1 text-xs text-slate-500">{service.code} · {service.category}</p></div><span className="text-sm font-bold text-blue-700">{service.priceMinorUnits === null ? "Not priced" : new Intl.NumberFormat("en-PK", { style: "currency", currency: service.currencyCode, maximumFractionDigits: 0 }).format(service.priceMinorUnits / 100)}</span></div><p className="mt-3 text-[10px] font-semibold text-slate-500">{service.durationMinutes} minutes · {service.branch?.name ?? "All branches"}</p></article>)}</div><WonFlowPagination firstShown={servicePages.firstShown} lastShown={servicePages.lastShown} noun="services" onPageChange={servicePages.setPage} page={servicePages.page} pageCount={servicePages.pageCount} total={servicePages.total} /></>}</Panel><Panel title="Add service" description="Create a real catalogue record."><form className="space-y-3" onSubmit={create}><LabeledField label="Code mode"><select className={fieldClass} value={form.codeMode} onChange={(event) => setForm({ ...form, codeMode: event.target.value })}><option value="auto">Generate automatically from category</option><option value="custom">Custom code</option></select></LabeledField>{form.codeMode === "custom" ? <LabeledField label="Service code"><input className={fieldClass} required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></LabeledField> : <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">The service code will be generated automatically when you save.</p>}<LabeledField label="Service name"><input className={fieldClass} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></LabeledField><LabeledField label="Category"><select className={fieldClass} required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{groupServiceCategoriesByHandler(serviceCategories).map(({ handler, categories }) => <optgroup key={handler} label={`Handled by ${handler}`}>{categories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}</optgroup>)}</select></LabeledField><div className="grid grid-cols-2 gap-3"><LabeledField label="Minutes"><input className={fieldClass} min="5" required type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} /></LabeledField><LabeledField label="Price (PKR)"><input className={fieldClass} min="0" step="0.01" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></LabeledField></div><LabeledField label="Branch"><select className={fieldClass} value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></LabeledField>{error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{error}</p> : null}<button className={`${primaryButtonClass} w-full`} disabled={saving} type="submit"><Plus aria-hidden="true" size={17} />{saving ? "Creating" : "Create service"}</button></form></Panel></div>;
}

export function LiveHospitalServicesPage() {
  const resource = useAdminResource<{ services: ServiceRecord[]; configuration: OrganizationConfiguration }>("admin:services-live", "/api/v1/admin/service-overview");
  return <div className="space-y-4" id="main-content"><PageIntro icon={Stethoscope} eyebrow="Services & governance" title="Services & prices" description="Configure the real service catalogue used by appointments and billing." /><WonFlowAsyncDataBoundary loadingTitle="Loading services" loadingDescription="Reading catalogue records from the tenant database." onRetry={resource.reload} state={resource}>{({ services, configuration }) => <ServiceManagerModern branches={configuration.branches} onCreated={resource.reload} services={services} />}</WonFlowAsyncDataBoundary></div>;
}

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function formatMinute(value: number): string { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function timeToMinute(value: string): number { const [hours = "0", minutes = "0"] = value.split(":"); return Number(hours) * 60 + Number(minutes); }

type ScheduleForm = { doctorId: string; branchId: string; serviceId: string; weekday: string; startsAt: string; endsAt: string; capacity: string; validFrom: string };

/** One card per doctor + branch + service, holding every weekday they are rostered. */
function groupSchedules(schedules: ScheduleRecord[], doctors: DoctorRecord[]) {
  const groups = new Map<string, { key: string; doctorId: string; title: string; subtitle: string; rules: ScheduleRecord[] }>();
  for (const schedule of schedules) {
    const key = `${schedule.doctor.id}|${schedule.branch.id}|${schedule.service?.id ?? "general"}`;
    const doctor = doctors.find((item) => item.id === schedule.doctor.id);
    const existing = groups.get(key);
    if (existing) existing.rules.push(schedule);
    else groups.set(key, {
      key,
      doctorId: schedule.doctor.id,
      title: doctor?.staffProfile.membership.displayName ?? schedule.doctor.specialty ?? schedule.doctor.registrationNumber ?? "Doctor",
      subtitle: `${schedule.branch.name} · ${schedule.service?.name ?? "General availability"}`,
      rules: [schedule],
    });
  }
  return [...groups.values()]
    .map((group) => ({ ...group, rules: [...group.rules].sort((a, b) => a.weekday - b.weekday || a.startsMinute - b.startsMinute) }))
    .sort((a, b) => a.title.localeCompare(b.title) || a.subtitle.localeCompare(b.subtitle));
}

function scheduleToForm(schedule: ScheduleRecord): ScheduleForm {
  return {
    doctorId: schedule.doctor.id,
    branchId: schedule.branch.id,
    serviceId: schedule.service?.id ?? "",
    weekday: String(schedule.weekday),
    startsAt: formatMinute(schedule.startsMinute),
    endsAt: formatMinute(schedule.endsMinute),
    capacity: String(schedule.capacity),
    validFrom: schedule.validFrom.slice(0, 10),
  };
}

function ScheduleManager({ schedules, doctors, branches, services, onCreated }: { schedules: ScheduleRecord[]; doctors: DoctorRecord[]; branches: BranchRecord[]; services: ServiceRecord[]; onCreated(): void }) {
  const blankForm: ScheduleForm = { doctorId: doctors[0]?.id ?? "", branchId: branches[0]?.id ?? "", serviceId: "", weekday: "1", startsAt: "09:00", endsAt: "17:00", capacity: "1", validFrom: "" };
  const [form, setForm] = useState<ScheduleForm>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadedForm, setLoadedForm] = useState<ScheduleForm>(blankForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const { confirm, dialog: confirmDialog } = useWonFlowConfirm();
  const isDirty = JSON.stringify(form) !== JSON.stringify(loadedForm);

  async function edit(schedule: ScheduleRecord) {
    if (schedule.id === editingId) return;
    if (isDirty && !await confirm({ title: "Discard changes", message: "The unsaved changes to these rostered hours are lost if you edit another roster.", confirmLabel: "Discard and edit" })) return;
    const next = scheduleToForm(schedule);
    setForm(next);
    setLoadedForm(next);
    setEditingId(schedule.id);
    setError("");
  }

  async function stopEditing() {
    if (isDirty && !await confirm({ title: "Discard changes", message: "The unsaved changes to these rostered hours are lost.", confirmLabel: "Discard changes" })) return;
    setForm(blankForm);
    setLoadedForm(blankForm);
    setEditingId(null);
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startsMinute = timeToMinute(form.startsAt);
    const endsMinute = timeToMinute(form.endsAt);
    if (endsMinute <= startsMinute) { setError("End time must be later than start time."); return; }
    setSaving(true);
    setError("");
    const body = JSON.stringify({ doctorId: form.doctorId, branchId: form.branchId, serviceId: form.serviceId || (editingId ? null : undefined), weekday: Number(form.weekday), startsMinute, endsMinute, capacity: Number(form.capacity), validFrom: form.validFrom });
    try {
      if (editingId) await phaseOneApi(`/api/v1/admin/schedules/${editingId}`, { method: "PATCH", body });
      else await phaseOneApi("/api/v1/admin/schedules", { method: "POST", body });
      setForm(blankForm);
      setLoadedForm(blankForm);
      setEditingId(null);
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : editingId ? "The schedule could not be saved." : "The schedule could not be created.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId || !await confirm({ title: "Delete rostered hours", message: "This weekly attendance window is removed from the roster.", confirmLabel: "Delete hours" })) return;
    setDeleting(true);
    setError("");
    try {
      await phaseOneApi(`/api/v1/admin/schedules/${editingId}`, { method: "DELETE" });
      setForm(blankForm);
      setLoadedForm(blankForm);
      setEditingId(null);
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The schedule could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  const canCreate = doctors.length > 0 && branches.length > 0;
  const groups = groupSchedules(schedules, doctors);
  const pagination = useWonFlowPagination(groups, 6);
  return <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">{confirmDialog}<Panel title="Rostered hours" description={`${groups.length} rostered ${groups.length === 1 ? "doctor" : "doctors"} · ${schedules.length} weekly ${schedules.length === 1 ? "window" : "windows"}. Select a day to edit it.`}>{schedules.length === 0 ? <WonFlowEmptyState title="No schedules configured" description={canCreate ? "Use the form to create the first availability rule." : "Create a doctor profile and branch before adding availability."} /> : <><div className="grid gap-3 md:grid-cols-2">{pagination.visible.map((group) => <article className="rounded-2xl border border-slate-200 p-4" key={group.key}><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-slate-950">{group.title}</h3><p className="mt-1 text-xs text-slate-500">{group.subtitle}</p></div><Link className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100" href={`/operations/appointments/new?doctorId=${group.doctorId}`}>Book appointment</Link></div><ul className="mt-3 space-y-1.5">{group.rules.map((schedule) => { const isEditing = schedule.id === editingId; return <li className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 transition ${isEditing ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-blue-200"}`} key={schedule.id}><span className="text-sm font-semibold text-blue-700">{weekdayNames[schedule.weekday] ?? `Day ${schedule.weekday}`} · {formatMinute(schedule.startsMinute)}–{formatMinute(schedule.endsMinute)}</span><span className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-500">{schedule.capacity} slot{schedule.capacity === 1 ? "" : "s"}</span><button className="min-h-8 rounded-lg border border-blue-200 px-2.5 text-[11px] font-bold text-blue-700 hover:bg-blue-50" onClick={() => void edit(schedule)} type="button">{isEditing ? "Editing" : "Edit"}</button></span></li>; })}</ul></article>)}</div><WonFlowPagination firstShown={pagination.firstShown} lastShown={pagination.lastShown} noun="rostered doctors" onPageChange={pagination.setPage} page={pagination.page} pageCount={pagination.pageCount} total={pagination.total} /></>}</Panel><Panel title={editingId ? "Edit rostered hours" : "Add rostered hours"} description={editingId ? "Change this weekly window, then save it." : "Create a recurring weekly expected-attendance window."}><form className="space-y-3" onSubmit={save}><LabeledField label="Doctor"><select className={fieldClass} disabled={!canCreate} required value={form.doctorId} onChange={(event) => setForm({ ...form, doctorId: event.target.value })}><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.staffProfile.membership.displayName}</option>)}</select></LabeledField><LabeledField label="Branch"><select className={fieldClass} disabled={!canCreate} required value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></LabeledField><LabeledField label="Service"><select className={fieldClass} value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}><option value="">General availability</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></LabeledField><div className="grid grid-cols-2 gap-3"><LabeledField label="Weekday"><select className={fieldClass} value={form.weekday} onChange={(event) => setForm({ ...form, weekday: event.target.value })}>{weekdayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></LabeledField><LabeledField label="Capacity"><input className={fieldClass} min="1" required type="number" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></LabeledField><LabeledField label="Start time"><input className={fieldClass} required type="time" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></LabeledField><LabeledField label="End time"><input className={fieldClass} required type="time" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></LabeledField></div><LabeledField label="Valid from"><input className={fieldClass} required type="date" value={form.validFrom} onChange={(event) => setForm({ ...form, validFrom: event.target.value })} /></LabeledField><MutationMessage error={error} success="" />{editingId && isDirty ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Unsaved changes to these rostered hours.</p> : null}<button className={`${primaryButtonClass} w-full`} disabled={saving || !canCreate} type="submit"><Plus aria-hidden="true" size={17} />{saving ? (editingId ? "Saving schedule" : "Creating schedule") : (editingId ? "Save schedule" : "Create schedule")}</button>{editingId ? <div className="grid grid-cols-2 gap-2"><button className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50" disabled={saving || deleting} onClick={() => void stopEditing()} type="button">Cancel</button><button className="min-h-11 rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60" disabled={saving || deleting} onClick={() => void remove()} type="button">{deleting ? "Deleting" : "Delete"}</button></div> : null}{!canCreate ? <p className="text-xs font-semibold text-amber-700">Add at least one doctor and branch first.</p> : null}</form></Panel></div>;
}

export function LiveHospitalSchedulesPage() {
  const resource = useAdminResource<{ schedules: ScheduleRecord[]; doctors: DoctorRecord[]; configuration: OrganizationConfiguration; services: ServiceRecord[] }>("admin:schedules-live", "/api/v1/admin/schedules");
  return <div className="space-y-4" id="main-content"><PageIntro icon={CalendarDays} eyebrow="People & locations" title="Rostered hours" description="Set the hours staff and doctors are expected to attend each branch." /><section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"><p className="text-sm font-bold text-amber-950">These hours are bookable — use &ldquo;Book appointment&rdquo; on a doctor below.</p><p className="mt-1 text-xs leading-5 text-amber-800">When a doctor records a sitting for a specific date, that sitting overrides the roster below for that date only. Otherwise, the weekly roster is what reception books against.</p></section><WonFlowAsyncDataBoundary loadingTitle="Loading rostered hours" loadingDescription="Reading availability rules from the tenant database." onRetry={resource.reload} state={resource}>{({ schedules, doctors, configuration, services }) => <ScheduleManager branches={configuration.branches} doctors={doctors} onCreated={resource.reload} schedules={schedules} services={services} />}</WonFlowAsyncDataBoundary></div>;
}

function AuditTrail({ audit }: { audit: AuditRecord[] }) {
  const auditPages = useWonFlowPagination(audit, 12);
  return <Panel title="Recent events" description="Up to 200 of the newest tenant events are displayed.">{audit.length === 0 ? <WonFlowEmptyState title="No audit events" description="Events will appear after configuration or access activity is recorded." /> : <><div className="space-y-2">{auditPages.visible.map((event) => <article className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between" key={event.id}><div><h3 className="text-sm font-bold text-slate-950">{event.action}</h3><p className="mt-1 text-xs text-slate-500">{event.entityType} · {event.entityId}</p></div><div className="text-left sm:text-right"><span className="text-[9px] font-bold uppercase tracking-wide text-blue-700">{event.severity}</span><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</p></div></article>)}</div><WonFlowPagination firstShown={auditPages.firstShown} lastShown={auditPages.lastShown} noun="events" onPageChange={auditPages.setPage} page={auditPages.page} pageCount={auditPages.pageCount} total={auditPages.total} /></>}</Panel>;
}

export function LiveHospitalAuditPage() {
  const resource = useAdminResource<{ audit: AuditRecord[] }>("admin:audit-live", "/api/v1/admin/audit");
  return <div className="space-y-4" id="main-content"><PageIntro icon={FileClock} eyebrow="Services & governance" title="Audit trail" description="Review immutable tenant configuration and access events recorded by the backend." /><WonFlowAsyncDataBoundary loadingTitle="Loading audit trail" loadingDescription="Reading the latest tenant audit events." onRetry={resource.reload} state={resource}>{({ audit }) => <AuditTrail audit={audit} />}</WonFlowAsyncDataBoundary></div>;
}

