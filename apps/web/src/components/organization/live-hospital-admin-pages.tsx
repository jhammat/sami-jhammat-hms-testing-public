"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
  Search,
  Settings2,
  Stethoscope,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
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
  doctorFeeAuthority: "DOCTOR" | "HOSPITAL" | "APPROVAL_REQUIRED";
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

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40 dark:placeholder:text-slate-500";
const primaryButtonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60";

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
    <section className="relative overflow-hidden rounded-[24px] border border-indigo-200/80 bg-gradient-to-br from-cyan-50 via-white to-violet-100 p-5 shadow-[0_12px_36px_rgba(79,70,229,0.08)] sm:p-6 dark:border-indigo-500/20 dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 via-indigo-500 to-violet-600" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-8 h-72 w-72 rounded-full bg-violet-400/30 blur-3xl dark:bg-violet-500/10" />
      <div className="relative flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/60 dark:ring-indigo-400/30">
          <Icon aria-hidden="true" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
      </div>
    </section>
  );
}

function Panel({ title, description, children, action }: { title: string; description: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="wf-admin-panel overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-transparent px-5 py-4 dark:border-slate-800 dark:from-slate-800/40 dark:to-transparent">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MutationMessage({ error, success }: { error: string; success: string }) {
  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300" role="alert">{error}</p>;
  if (success) return <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300" role="status">{success}</p>;
  return null;
}

function ConfigurationForm({ configuration, onSaved }: { configuration: OrganizationConfiguration; onSaved(): void }) {
  // The logo is persisted on the organization record by `submit` below, so the
  // saved value is the only source. There is no browser mirror to consult.
  const [logoPreview, setLogoPreview] = useState<string>(
    () => (configuration.settings as { logoDataUrl?: string } | null)?.logoDataUrl ?? "",
  );

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
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview("");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
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

/**
 * Self-service password change for the signed-in administrator.
 *
 * Administrators could reset everybody else's password but not their own:
 * `resetUserPassword` refuses when the target is the caller, pointing at
 * "your account settings" -- a screen that did not exist for them. The only
 * route out was asking a platform administrator for a temporary password,
 * which is a worse credential than the one being replaced.
 *
 * This reuses POST /api/auth/change-password, which already verifies the
 * current password, enforces the password policy and rotates the session.
 */
function AdministratorPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setDone(false);

    if (newPassword !== confirmation) {
      setError("The new passwords do not match. Retype them and try again.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPassword, newPassword, confirmation }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "The password could not be changed.");
      }

      // Only clear the fields once the server has confirmed the change.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The password could not be changed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="max-w-xl space-y-3" onSubmit={submit}>
      <LabeledField label="Current password">
        <input
          autoComplete="current-password"
          className={fieldClass}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          type="password"
          value={currentPassword}
        />
      </LabeledField>

      <LabeledField label="New password">
        <input
          autoComplete="new-password"
          className={fieldClass}
          minLength={12}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          type="password"
          value={newPassword}
        />
      </LabeledField>

      <LabeledField label="Confirm new password">
        <input
          autoComplete="new-password"
          className={fieldClass}
          minLength={12}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type="password"
          value={confirmation}
        />
      </LabeledField>

      <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
        At least 12 characters. If you signed in with a temporary password,
        changing it here clears the prompt to replace it.
      </p>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {done ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          Your password has been changed. Use it the next time you sign in.
        </p>
      ) : null}

      <button className={primaryButtonClass} disabled={saving} type="submit">
        <Save aria-hidden="true" size={17} />
        {saving ? "Changing" : "Change my password"}
      </button>
    </form>
  );
}

export function LiveHospitalSetupPage() {
  const resource = useAdminResource<{ configuration: OrganizationConfiguration }>("admin:configuration", "/api/v1/admin/configuration");
  return (
    <div className="space-y-4" id="main-content">
      <PageIntro icon={Settings2} eyebrow="Hospital administration" title="Hospital setup" description="Maintain the real organization profile used across operational and patient-facing workflows." />
      <WonFlowAsyncDataBoundary loadingTitle="Loading hospital profile" loadingDescription="Reading the current organization configuration." onRetry={resource.reload} state={resource}>
        {({ configuration }) => <Panel title="Organization profile" description="These values are stored in the tenant database."><ConfigurationForm configuration={configuration} onSaved={resource.reload} /></Panel>}
      </WonFlowAsyncDataBoundary>
      <Panel description="Change the password for your own administrator account." title="My sign-in password">
        <AdministratorPasswordForm />
      </Panel>
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
      <article className="rounded-2xl border border-indigo-300 bg-indigo-50/40 p-4 dark:border-indigo-500/30 dark:bg-indigo-950/40">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void call({ code: form.code, name: form.name, timezone: form.timezone }, "PATCH"); }}>
          <LabeledField label="Branch code"><input className={fieldClass} maxLength={80} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} required value={form.code} /></LabeledField>
          <LabeledField label="Branch name"><input className={fieldClass} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} /></LabeledField>
          <LabeledField label="Timezone"><input className={fieldClass} onChange={(event) => setForm({ ...form, timezone: event.target.value })} required value={form.timezone} /></LabeledField>
          <div className="flex flex-wrap gap-2">
            <button className={primaryButtonClass} disabled={busy} type="submit"><Save aria-hidden="true" size={16} />{busy ? "Saving" : "Save"}</button>
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={() => { setEditing(false); setForm({ code: branch.code, name: branch.name, timezone: branch.timezone }); }} type="button">Cancel</button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/60" key={branch.id}>
      {confirmDialog}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950 dark:text-white">{branch.name}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{branch.code} · {branch.timezone}</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300">{branch.status}</span>
      </div>

      {branch.isMainBranch ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300"><Check aria-hidden="true" size={12} />Main branch</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" disabled={busy} onClick={() => setEditing(true)} type="button"><Pencil aria-hidden="true" size={14} />Edit</button>
        {branch.isMainBranch ? null : (
          <>
            <button className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-500/30 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700" disabled={busy} onClick={() => void call({ isMainBranch: true }, "PATCH")} type="button"><Building2 aria-hidden="true" size={14} />Make main</button>
            <button className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700" disabled={busy} onClick={() => void remove()} type="button"><Trash2 aria-hidden="true" size={14} />Delete</button>
          </>
        )}
      </div>

      {branch.isMainBranch ? <p className="mt-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400">The main branch cannot be deleted. Promote another branch first.</p> : null}
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
      <Panel description={`${configuration.branches.length} real database ${configuration.branches.length === 1 ? "record" : "records"}. ${mainBranch ? `${mainBranch.name} is the main branch.` : "No main branch is set."}`} title="Configured branches">
        {error ? <div className="mb-3"><MutationMessage error={error} success="" /></div> : null}
        {configuration.branches.length === 0 ? <WonFlowEmptyState description="Create the hospital's first operating location." title="No branches configured" /> : <><div className="grid gap-3 sm:grid-cols-2">{branchPages.visible.map((branch) => <BranchCard branch={branch} key={branch.id} onChanged={onCreated} onError={setError} />)}</div><WonFlowPagination firstShown={branchPages.firstShown} lastShown={branchPages.lastShown} noun="branches" onPageChange={branchPages.setPage} page={branchPages.page} pageCount={branchPages.pageCount} total={branchPages.total} /></>}
      </Panel>
      <Panel description="Create a tenant-scoped operating location." title="Add branch">
        <form className="space-y-3" onSubmit={create}>
          <LabeledField label="Branch code"><input className={fieldClass} maxLength={80} onChange={(event) => setCode(event.target.value.toUpperCase())} required value={code} /></LabeledField>
          <LabeledField label="Branch name"><input className={fieldClass} onChange={(event) => setName(event.target.value)} required value={name} /></LabeledField>
          <LabeledField label="Timezone"><input className={fieldClass} onChange={(event) => setTimezone(event.target.value)} required value={timezone} /></LabeledField>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300"><input checked={isMainBranch} onChange={(event) => setIsMainBranch(event.target.checked)} type="checkbox" />Make this the main branch</label>
          {isMainBranch && mainBranch ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">{mainBranch.name} will stop being the main branch. A hospital has exactly one.</p> : null}
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
      <article className="rounded-2xl border border-indigo-300 bg-indigo-50/40 p-4 dark:border-indigo-500/30 dark:bg-indigo-950/40">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void call({ code: form.code, name: form.name, description: form.description, branchId: form.branchId || null }, "PATCH"); }}>
          <LabeledField label="Department code"><input className={fieldClass} maxLength={80} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} required value={form.code} /></LabeledField>
          <LabeledField label="Department name"><input className={fieldClass} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} /></LabeledField>
          <LabeledField label="Description"><input className={fieldClass} onChange={(event) => setForm({ ...form, description: event.target.value })} value={form.description} /></LabeledField>
          <LabeledField label="Branch"><select className={fieldClass} onChange={(event) => setForm({ ...form, branchId: event.target.value })} value={form.branchId}><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></LabeledField>
          <div className="flex flex-wrap gap-2">
            <button className={primaryButtonClass} disabled={busy} type="submit"><Save aria-hidden="true" size={16} />{busy ? "Saving" : "Save"}</button>
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={() => setEditing(false)} type="button">Cancel</button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/60" key={department.id}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950 dark:text-white">{department.name}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{department.code} · {department.branch?.name ?? "All branches"}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold ${department.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300" : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"}`}>{department.isActive ? "ACTIVE" : "INACTIVE"}</span>
      </div>
      {department.description ? <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{department.description}</p> : null}
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-400">{department._count.doctors} {department._count.doctors === 1 ? "doctor" : "doctors"}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" disabled={busy} onClick={() => setEditing(true)} type="button"><Pencil aria-hidden="true" size={14} />Edit</button>
        <button className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700" disabled={busy} onClick={() => { void (async () => { if (await wonflowConfirm({ title: "Delete department", message: `The ${department.name} department is removed. Doctors assigned to it keep their records.`, confirmLabel: "Delete department" })) await call(undefined, "DELETE"); })(); }} type="button"><Trash2 aria-hidden="true" size={14} />Delete</button>
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
    <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50/90 p-4 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-950/40">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <p className="text-xs font-black uppercase tracking-wide text-emerald-950 dark:text-emerald-300">Account created — share these credentials</p>
      </div>

      <div className="mt-3 space-y-1.5 rounded-xl border border-emerald-200/80 bg-white/80 p-3 dark:border-emerald-500/20 dark:bg-slate-900/80">
        <p className="break-all text-xs text-slate-800 dark:text-slate-200"><strong className="text-emerald-800 dark:text-emerald-400">Username:</strong> <span className="font-mono">{credentials.username}</span></p>
        <p className="break-all text-xs text-slate-800 dark:text-slate-200"><strong className="text-emerald-800 dark:text-emerald-400">Temporary password:</strong> <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{credentials.temporaryPassword}</span></p>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-emerald-900 dark:text-emerald-300">They must change this password the first time they sign in. You can edit the message below before sending.</p>

      {/* Editable textarea so the administrator can customize the message before sending */}
      <textarea
        aria-label="Message to send to the staff member"
        className="mt-3 w-full rounded-xl border border-emerald-300/80 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40"
        onChange={(e) => setUserEditedMessage(e.target.value)}
        rows={6}
        value={message}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500" onClick={() => { void copyMessage(); }} type="button">
          <Check aria-hidden="true" size={14} />
          {copied ? "Copied to clipboard!" : "Copy message"}
        </button>

        <a
          className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          href={`mailto:${encodeURIComponent(credentials.username)}?subject=${encodeURIComponent(`Your ${hospitalName} account`)}&body=${encodeURIComponent(message)}`}
        >
          Send by email
        </a>

        <a
          className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          href={`sms:?&body=${encodeURIComponent(message)}`}
        >
          Send by SMS
        </a>
      </div>
    </div>
  );
}

/**
 * Every staff workspace an administrator can invite into, with its label.
 *
 * The order is the order it is offered in. Which of these actually appear is
 * decided by the tenant's entitlements at render time, not here.
 */
const WORKSPACE_INVITE_OPTIONS: { code: string; label: string }[] = [
  { code: "DOCTOR", label: "Doctor" },
  { code: "RECEPTION", label: "Reception" },
  { code: "LABORATORY", label: "Laboratory" },
  { code: "RADIOLOGY", label: "Radiology" },
  { code: "PHARMACY", label: "Pharmacy" },
  { code: "PHYSIOTHERAPIST", label: "Physiotherapist" },
  { code: "NUTRITIONIST", label: "Clinical dietitian" },
  { code: "BILLING", label: "Billing" },
  { code: "MANAGEMENT", label: "Management" },
  { code: "ADMIN", label: "Administrator" },
];

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
  const [selectedWorkspace, setSelectedWorkspace] = useState("ALL");
  const [selectedBranch, setSelectedBranch] = useState("ALL");

  /**
   * Which staff workspaces this hospital may actually create logins for.
   *
   * The list used to be hardcoded, which had two consequences: the two
   * allied-health roles were missing entirely, and a hospital that had
   * switched off laboratory, radiology or pharmacy was still offered those
   * workspaces — an invitation that creates a login for a module the tenant
   * cannot open. The server decides now, from the tenant's entitlements.
   *
   * `undefined` means "not answered yet"; the select stays disabled rather
   * than briefly offering the full list and then taking options away.
   */
  const [allowedWorkspaces, setAllowedWorkspaces] = useState<string[] | undefined>();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/v1/tenant/entitlements", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (cancelled || !response.ok || !payload) return;
        setAllowedWorkspaces(payload.workspaces ?? []);
      } catch {
        // Leave it unanswered rather than guessing at a permissions list.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const workspaceOptions = useMemo(
    () =>
      WORKSPACE_INVITE_OPTIONS.filter(
        (option) => allowedWorkspaces?.includes(option.code) ?? false,
      ),
    [allowedWorkspaces],
  );

  /**
   * The workspace actually in force.
   *
   * Derived during render rather than corrected afterwards in an effect:
   * the default is DOCTOR, but a tenant might not be offered every option,
   * and calling setState from an effect to fix that cascades an extra render
   * and briefly leaves an invalid workspace selected. This just never
   * reports one that is not on offer.
   */
  const effectiveWorkspace =
    workspaceOptions.some((option) => option.code === workspace)
      ? workspace
      : (workspaceOptions[0]?.code ?? workspace);

  /**
   * Role filter chips, counted from the staff who are actually here.
   *
   * This was a second hardcoded list of workspaces, and it had drifted the
   * same way the invite dropdown had: no physiotherapist or dietitian entry.
   * Staff holding those roles were counted by nobody and reachable by no
   * filter -- a hospital with seven members saw chips accounting for four of
   * them and no way to page through the rest.
   *
   * So the known roles come from the same catalogue the invite form uses,
   * and then ANY other workspace code found on a real membership is appended.
   * A role added to the enum later shows up here on its own rather than
   * waiting for someone to remember this list.
   */
  const workspaceFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of users) {
      for (const ws of u.workspaceCodes) {
        counts.set(ws, (counts.get(ws) ?? 0) + 1);
      }
    }

    const known = WORKSPACE_INVITE_OPTIONS.map(({ code, label }) => ({
      code,
      label,
      count: counts.get(code) ?? 0,
    }));

    const unlisted = [...counts.keys()]
      .filter((code) => !WORKSPACE_INVITE_OPTIONS.some((option) => option.code === code))
      .sort()
      .map((code) => ({
        code,
        label: code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, " "),
        count: counts.get(code) ?? 0,
      }));

    return [
      { code: "ALL", label: "All staff", count: users.length },
      ...known,
      ...unlisted,
    ];
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (selectedWorkspace !== "ALL" && !user.workspaceCodes.includes(selectedWorkspace)) {
        return false;
      }
      if (selectedBranch !== "ALL" && user.primaryBranch?.id !== selectedBranch) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      const nameMatch = user.displayName.toLowerCase().includes(q);
      const emailMatch = user.identity.email.toLowerCase().includes(q);
      const branchMatch = (user.primaryBranch?.name ?? "").toLowerCase().includes(q);
      const workspaceMatch = user.workspaceCodes.join(" ").toLowerCase().includes(q);
      const roleMatch = user.roles.some((r) => r.role.name.toLowerCase().includes(q));
      const deptMatch = (user.doctorProfile?.department?.name ?? "").toLowerCase().includes(q);
      return nameMatch || emailMatch || branchMatch || workspaceMatch || roleMatch || deptMatch;
    });
  }, [query, users, selectedWorkspace, selectedBranch]);

  const userPages = useWonFlowPagination(filteredUsers, 6);
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
    if (effectiveWorkspace === "DOCTOR" && !department) {
      setError(departments.length === 0
        ? "Create a department first, then assign this doctor to it."
        : "Select the doctor's department.");
      return;
    }
    setSaving(true);
    setError("");
    setCredentials(undefined);
    try {
      const response = await phaseOneApi<{ credentials: IssuedCredentials }>("/api/v1/admin/users/invitations", { method: "POST", body: JSON.stringify({ displayName, email, departmentId: effectiveWorkspace === "DOCTOR" ? department : undefined, primaryBranchId: branchId || undefined, workspaceCodes: [effectiveWorkspace] }) });
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

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
      {confirmDialog}
      <Panel description={`${users.length} active tenant membership ${users.length === 1 ? "record" : "records"}.`} title="Hospital users">
        {removeError ? <div className="mb-3"><MutationMessage error={removeError} success="" /></div> : null}
        {resetCredentials ? <div className="mb-3"><IssuedCredentialsPanel credentials={resetCredentials} organizationName={organizationName} /></div> : null}

        {/* Glassmorphic Search & Filter Bar */}
        <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white/80 via-slate-50/70 to-indigo-50/40 p-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-gradient-to-r dark:from-slate-900/80 dark:via-slate-900/60 dark:to-indigo-950/40 dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={17} />
              <input
                aria-label="Search hospital users"
                className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-white/80 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 backdrop-blur-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-800 dark:focus:ring-indigo-900/40"
                id="team-search"
                onChange={(event) => {
                  setQuery(event.target.value);
                  userPages.setPage(1);
                }}
                placeholder="Search by name, email, department, role or branch..."
                type="search"
                value={query}
              />
              {query ? (
                <button
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  onClick={() => {
                    setQuery("");
                    userPages.setPage(1);
                  }}
                  type="button"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {branches.length > 1 ? (
              <select
                aria-label="Filter by branch"
                className="min-h-11 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-xs font-bold text-slate-700 outline-none backdrop-blur-sm transition focus:border-indigo-500 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200"
                onChange={(event) => {
                  setSelectedBranch(event.target.value);
                  userPages.setPage(1);
                }}
                value={selectedBranch}
              >
                <option value="ALL">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            ) : null}
          </div>

          {/* Workspace Filter Chips */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Role:</span>
            {workspaceFilterOptions.map(({ code, label, count }) => {
              if (count === 0 && code !== "ALL") return null;
              const isSelected = selectedWorkspace === code;
              return (
                <button
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition backdrop-blur-sm ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25 dark:bg-indigo-500"
                      : "border border-slate-200/60 bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                  key={code}
                  onClick={() => {
                    setSelectedWorkspace(code);
                    userPages.setPage(1);
                  }}
                  type="button"
                >
                  <span>{label}</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <WonFlowEmptyState description={query.trim() === "" && selectedWorkspace === "ALL" && selectedBranch === "ALL" ? "Invite the first staff member." : "Adjust the search terms or filter to find a team member."} title={query.trim() === "" && selectedWorkspace === "ALL" && selectedBranch === "ALL" ? "No hospital users" : "No matching users"} />
        ) : (
          <div className="space-y-2.5">
            {userPages.visible.map((user) => (
              <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition duration-200 hover:border-indigo-200/80 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-slate-700" key={user.id}>
                {/* min-w-0 so a long subtitle — a doctor with a department, or
                    a member holding three workspaces — wraps inside its own
                    column instead of squeezing the action buttons onto a
                    second line and leaving one row taller than its neighbours. */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-950 dark:text-white">{user.displayName}</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {user.identity.email} · {user.primaryBranch?.name ?? "No branch assigned"}{user.doctorProfile?.department ? ` · ${user.doctorProfile.department.name}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {user.workspaceCodes.join(", ") || "No workspace"}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {formatRoleList(user)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {user.status}
                  </span>
                  <button
                    aria-label={`Reset password for ${user.displayName}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700"
                    disabled={resettingId !== undefined || removingId !== undefined}
                    onClick={() => void resetPassword(user)}
                    type="button"
                  >
                    <KeyRound aria-hidden="true" size={14} />
                    {resettingId === user.id ? "Resetting" : "Reset password"}
                  </button>
                  <button
                    aria-label={`Remove ${user.displayName}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700"
                    disabled={removingId !== undefined || resettingId !== undefined}
                    onClick={() => void removeUser(user)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                    {removingId === user.id ? "Removing" : "Remove access"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <WonFlowPagination firstShown={userPages.firstShown} lastShown={userPages.lastShown} noun="users" onPageChange={userPages.setPage} page={userPages.page} pageCount={userPages.pageCount} total={userPages.total} />
      </Panel>
      <Panel description="A temporary password is generated to share with the staff member. They set their own password at first sign-in." title="Invite staff">
        <form className="space-y-3" onSubmit={invite}>
          <LabeledField label="Full name"><input className={fieldClass} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} /></LabeledField>
          <LabeledField label="Email (login username)"><input className={fieldClass} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></LabeledField>
          <LabeledField label="Workspace">
            <select
              className={fieldClass}
              disabled={allowedWorkspaces === undefined}
              onChange={(event) => setWorkspace(event.target.value)}
              value={effectiveWorkspace}
            >
              {allowedWorkspaces === undefined ? (
                <option value={effectiveWorkspace}>Loading workspaces…</option>
              ) : (
                workspaceOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
            {allowedWorkspaces !== undefined &&
            workspaceOptions.length < WORKSPACE_INVITE_OPTIONS.length ? (
              <p className="mt-1.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                Only the workspaces this hospital is licensed for are listed. To
                offer more, ask your platform administrator to enable that
                module for your organization.
              </p>
            ) : null}
          </LabeledField>
          {effectiveWorkspace === "DOCTOR" ? (
            <LabeledField label="Department">
              <select className={fieldClass} onChange={(event) => setDepartment(event.target.value)} required value={department}>
                <option value="">Select department</option>
                {departments.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
              {departments.length === 0 ? <p className="mt-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">No departments exist yet. Create one under Departments before inviting a doctor.</p> : null}
            </LabeledField>
          ) : null}
          <LabeledField label="Primary branch">
            <select className={fieldClass} onChange={(event) => setBranchId(event.target.value)} value={branchId}>
              <option value="">No branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </LabeledField>
          <MutationMessage error={error} success="" />
          <button className={`${primaryButtonClass} w-full`} disabled={saving} type="submit"><UserPlus aria-hidden="true" size={17} />{saving ? "Creating invitation" : "Invite staff"}</button>
          {credentials ? <IssuedCredentialsPanel credentials={credentials} organizationName={organizationName} /> : null}
        </form>
      </Panel>
    </div>
  );
}

export function LiveHospitalTeamPage() {
  const resource = useAdminResource<{ users: UserRecord[]; configuration: OrganizationConfiguration; departments: DepartmentRecord[] }>("admin:team", "/api/v1/admin/team-overview");
  return <div className="space-y-4" id="main-content"><PageIntro description="View tenant memberships and invite authorized hospital staff." eyebrow="People & locations" icon={Users} title="Team & permissions" /><WonFlowAsyncDataBoundary loadingDescription="Reading users and branches from the tenant database." loadingTitle="Loading hospital team" onRetry={resource.reload} state={resource}>{({ users, configuration, departments }) => <TeamManager branches={configuration.branches} departments={departments ?? []} onInvited={resource.reload} organizationName={configuration.displayName} users={users} />}</WonFlowAsyncDataBoundary></div>;
}

function DoctorDirectory({ doctors }: { doctors: DoctorRecord[] }) {
  const [query, setQuery] = useState("");
  const filteredDoctors = useMemo(() => {
    if (!query.trim()) return doctors;
    const q = query.toLowerCase().trim();
    return doctors.filter((doctor) => {
      const name = `${doctor.staffProfile.title ?? ""} ${doctor.staffProfile.membership.displayName}`.toLowerCase();
      const specialty = (doctor.specialty ?? "").toLowerCase();
      const branch = (doctor.staffProfile.branch?.name ?? "").toLowerCase();
      const reg = (doctor.registrationNumber ?? doctor.staffProfile.employeeNumber ?? "").toLowerCase();
      return name.includes(q) || specialty.includes(q) || branch.includes(q) || reg.includes(q);
    });
  }, [doctors, query]);

  const doctorPages = useWonFlowPagination(filteredDoctors, 6);

  return (
    <Panel description={`${doctors.length} doctor ${doctors.length === 1 ? "profile" : "profiles"}.`} title="Clinical staff directory">
      {/* Glassmorphic Search Bar */}
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white/80 via-slate-50/70 to-indigo-50/40 p-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-gradient-to-r dark:from-slate-900/80 dark:via-slate-900/60 dark:to-indigo-950/40 dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <div className="relative flex items-center">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 text-slate-400 dark:text-slate-500" size={17} />
          <input
            aria-label="Search clinical staff"
            className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-white/80 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 backdrop-blur-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-800 dark:focus:ring-indigo-900/40"
            onChange={(event) => {
              setQuery(event.target.value);
              doctorPages.setPage(1);
            }}
            placeholder="Search by doctor name, specialty, branch, or registration #..."
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear search"
              className="absolute right-3 grid h-6 w-6 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              onClick={() => {
                setQuery("");
                doctorPages.setPage(1);
              }}
              type="button"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {filteredDoctors.length === 0 ? (
        <WonFlowEmptyState description={query.trim() ? "Try adjusting your search terms." : "Invite a staff member with the Doctor workspace to create their clinical profile."} title={query.trim() ? "No matching doctors" : "No doctor profiles"} />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {doctorPages.visible.map((doctor) => (
              <article className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/60" key={doctor.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950 dark:text-white">{doctor.staffProfile.title ? `${doctor.staffProfile.title} ` : ""}{doctor.staffProfile.membership.displayName}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{doctor.specialty ?? "Specialty not set"} · {doctor.staffProfile.branch?.name ?? "No branch assigned"}</p>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300">{doctor.staffProfile.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                  <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800 dark:text-slate-300">{doctor.registrationNumber ?? doctor.staffProfile.employeeNumber}</span>
                  <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300">{doctor.durationMinutes} min appointments</span>
                  <span className={`rounded-lg px-2 py-1 ${doctor.publiclyBookable ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"}`}>{doctor.publiclyBookable ? "Publicly bookable" : "Internal bookings"}</span>
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

function ServiceManagerModern({ branches, enabledModules, onCreated, services }: { branches: BranchRecord[]; enabledModules?: string[]; onCreated(): void; services: ServiceRecord[] }) {
  const [query, setQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const enabledModulesSet = useMemo(() => new Set(enabledModules ?? []), [enabledModules]);
  const availableCategories = useMemo(() => {
    return serviceCategories.filter((c) => !c.requiredModule || enabledModulesSet.has(c.requiredModule));
  }, [enabledModulesSet]);
  const [form, setForm] = useState({ codeMode: "auto", code: "", name: "", category: "CONSULTATION", durationMinutes: "15", price: "", branchId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      if (selectedCategoryFilter !== "ALL" && service.category !== selectedCategoryFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return service.name.toLowerCase().includes(q) || service.code.toLowerCase().includes(q) || service.category.toLowerCase().includes(q) || (service.branch?.name.toLowerCase().includes(q) ?? false);
    });
  }, [services, query, selectedCategoryFilter]);

  const servicePages = useWonFlowPagination(filteredServices, 6);

  const categoryFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const service of services) counts.set(service.category, (counts.get(service.category) ?? 0) + 1);
    const visibleCategories = serviceCategories.filter((c) => {
      const count = counts.get(c.code) ?? 0;
      if (count > 0) return true;
      if (c.requiredModule && !enabledModulesSet.has(c.requiredModule)) return false;
      return true;
    });
    return [
      { code: "ALL", label: "All services", count: services.length },
      ...visibleCategories.map((c) => ({ code: c.code, label: c.label, count: counts.get(c.code) ?? 0 })),
    ];
  }, [services, enabledModulesSet]);

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

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
      <Panel description={`${services.length} live service ${services.length === 1 ? "record" : "records"}.`} title="Service catalogue">
        {/* Glassmorphic Search & Filter */}
        <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white/80 via-slate-50/70 to-indigo-50/40 p-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-gradient-to-r dark:from-slate-900/80 dark:via-slate-900/60 dark:to-indigo-950/40 dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <div className="relative flex items-center">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 text-slate-400 dark:text-slate-500" size={17} />
            <input
              aria-label="Search services catalogue"
              className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-white/80 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 backdrop-blur-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-800 dark:focus:ring-indigo-900/40"
              onChange={(event) => {
                setQuery(event.target.value);
                servicePages.setPage(1);
              }}
              placeholder="Search by service name, code, category, or branch..."
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
                  <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredServices.length === 0 ? (
          <WonFlowEmptyState description={query.trim() || selectedCategoryFilter !== "ALL" ? "Try adjusting your search terms or filter." : "Create the first hospital service and price."} title={query.trim() || selectedCategoryFilter !== "ALL" ? "No matching services" : "No services configured"} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {servicePages.visible.map((service) => (
                <article className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/60" key={service.id}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-950 dark:text-white">{service.name}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{service.code} · {service.category}</p>
                    </div>
                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                      {service.priceMinorUnits === null ? "Not priced" : new Intl.NumberFormat("en-PK", { style: "currency", currency: service.currencyCode, maximumFractionDigits: 0 }).format(service.priceMinorUnits / 100)}
                    </span>
                  </div>
                  <p className="mt-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{service.durationMinutes} minutes · {service.branch?.name ?? "All branches"}</p>
                </article>
              ))}
            </div>
            <WonFlowPagination firstShown={servicePages.firstShown} lastShown={servicePages.lastShown} noun="services" onPageChange={servicePages.setPage} page={servicePages.page} pageCount={servicePages.pageCount} total={servicePages.total} />
          </>
        )}
      </Panel>
      <Panel description="Create a real catalogue record." title="Add service">
        <form className="space-y-3" onSubmit={create}>
          <LabeledField label="Code mode">
            <select className={fieldClass} onChange={(event) => setForm({ ...form, codeMode: event.target.value })} value={form.codeMode}>
              <option value="auto">Generate automatically from category</option>
              <option value="custom">Custom code</option>
            </select>
          </LabeledField>
          {form.codeMode === "custom" ? (
            <LabeledField label="Service code"><input className={fieldClass} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} required value={form.code} /></LabeledField>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">The service code will be generated automatically when you save.</p>
          )}
          <LabeledField label="Service name"><input className={fieldClass} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} /></LabeledField>
          <LabeledField label="Category">
            <select className={fieldClass} onChange={(event) => setForm({ ...form, category: event.target.value })} required value={form.category}>
              {groupServiceCategoriesByHandler(availableCategories).map(({ handler, categories }) => (
                <optgroup key={handler} label={`Handled by ${handler}`}>
                  {categories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}
                </optgroup>
              ))}
            </select>
          </LabeledField>
          <div className="grid grid-cols-2 gap-3">
            <LabeledField label="Minutes"><input className={fieldClass} min="5" onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} required type="number" value={form.durationMinutes} /></LabeledField>
            <LabeledField label="Price (PKR)"><input className={fieldClass} min="0" onChange={(event) => setForm({ ...form, price: event.target.value })} step="0.01" type="number" value={form.price} /></LabeledField>
          </div>
          <LabeledField label="Branch">
            <select className={fieldClass} onChange={(event) => setForm({ ...form, branchId: event.target.value })} value={form.branchId}>
              <option value="">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </LabeledField>
          {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300" role="alert">{error}</p> : null}
          <button className={`${primaryButtonClass} w-full`} disabled={saving} type="submit"><Plus aria-hidden="true" size={17} />{saving ? "Creating" : "Create service"}</button>
        </form>
      </Panel>
    </div>
  );
}

export function LiveHospitalServicesPage() {
  const resource = useAdminResource<{ services: ServiceRecord[]; configuration: OrganizationConfiguration; enabledModules?: string[] }>("admin:services-live", "/api/v1/admin/service-overview");
  return <div className="space-y-4" id="main-content"><PageIntro description="Configure the real service catalogue used by appointments and billing." eyebrow="Services & governance" icon={Stethoscope} title="Services & prices" /><WonFlowAsyncDataBoundary loadingDescription="Reading catalogue records from the tenant database." loadingTitle="Loading services" onRetry={resource.reload} state={resource}>{({ services, configuration, enabledModules }) => <ServiceManagerModern branches={configuration.branches} enabledModules={enabledModules} onCreated={resource.reload} services={services} />}</WonFlowAsyncDataBoundary></div>;
}

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function formatMinute(value: number): string { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function timeToMinute(value: string): number { const [hours = "0", minutes = "0"] = value.split(":"); return Number(hours) * 60 + Number(minutes); }

type ScheduleForm = { doctorId: string; branchId: string; serviceId: string; weekday: string; startsAt: string; endsAt: string; capacity: string; validFrom: string };

/**
 * Rostered hours are necessary but not sufficient for the patient portal: it
 * only offers a clinic whose doctor *and* service are both marked bookable by
 * patients, and both flags default to off. Every card states which of those is
 * missing, because the portal side of this is otherwise silent.
 */
function patientBookingBlockers(doctor: DoctorRecord | undefined, service: ServiceRecord | undefined, hasService: boolean) {
  const blockers: string[] = [];
  if (doctor && !doctor.publiclyBookable) blockers.push("online booking is off for this doctor");
  if (!hasService) blockers.push("no consultation service is attached");
  else if (service && !service.isActive) blockers.push(`${service.name} is archived`);
  else if (service && !service.publiclyBookable) blockers.push(`${service.name} is not open to patient booking`);
  return blockers;
}

/** One card per doctor + branch + service, holding every weekday they are rostered. */
function groupSchedules(schedules: ScheduleRecord[], doctors: DoctorRecord[], services: ServiceRecord[]) {
  const groups = new Map<string, { key: string; doctorId: string; title: string; subtitle: string; doctor: DoctorRecord | undefined; blockers: string[]; rules: ScheduleRecord[] }>();
  for (const schedule of schedules) {
    const key = `${schedule.doctor.id}|${schedule.branch.id}|${schedule.service?.id ?? "general"}`;
    const doctor = doctors.find((item) => item.id === schedule.doctor.id);
    const service = services.find((item) => item.id === schedule.service?.id);
    const existing = groups.get(key);
    if (existing) existing.rules.push(schedule);
    else groups.set(key, {
      key,
      doctorId: schedule.doctor.id,
      title: doctor?.staffProfile.membership.displayName ?? schedule.doctor.specialty ?? schedule.doctor.registrationNumber ?? "Doctor",
      subtitle: `${schedule.branch.name} · ${schedule.service?.name ?? "General availability"}`,
      doctor,
      blockers: patientBookingBlockers(doctor, service, schedule.service !== null),
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
  const [publishing, setPublishing] = useState<string | null>(null);
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

  async function setPatientBooking(doctorId: string, publiclyBookable: boolean) {
    setPublishing(doctorId);
    setError("");
    try {
      await phaseOneApi(`/api/v1/admin/doctors/${doctorId}/patient-booking`, { method: "PATCH", body: JSON.stringify({ publiclyBookable }) });
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Online patient booking could not be changed for this doctor.");
    } finally {
      setPublishing(null);
    }
  }

  const canCreate = doctors.length > 0 && branches.length > 0;
  const groups = groupSchedules(schedules, doctors, services);
  const unpublished = groups.filter((group) => group.blockers.length > 0).length;
  const pagination = useWonFlowPagination(groups, 6);
  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      {confirmDialog}
      <Panel description={`${groups.length} rostered ${groups.length === 1 ? "doctor" : "doctors"} · ${schedules.length} weekly ${schedules.length === 1 ? "window" : "windows"}. Select a day to edit it.`} title="Rostered hours">
        {unpublished > 0 ? (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
            {unpublished} of {groups.length} rostered {groups.length === 1 ? "clinic is" : "clinics are"} invisible to patients booking online. Rostered hours alone do not publish a clinic — the doctor and the consultation service must both be open to patient booking.
          </p>
        ) : null}
        {schedules.length === 0 ? (
          <WonFlowEmptyState description={canCreate ? "Use the form to create the first availability rule." : "Create a doctor profile and branch before adding availability."} title="No schedules configured" />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {pagination.visible.map((group) => (
                <article className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/60" key={group.key}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-950 dark:text-white">{group.title}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{group.subtitle}</p>
                    </div>
                    <Link className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300" href={`/operations/reception?doctorId=${group.doctorId}`}>
                      Book appointment
                    </Link>
                  </div>
                  {group.blockers.length === 0 ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Patients can book this clinic online
                    </p>
                  ) : (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-950/40">
                      <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Not visible in the patient portal — {group.blockers.join("; ")}.</p>
                      {group.doctor && !group.doctor.publiclyBookable ? (
                        <button className="mt-2 min-h-8 rounded-lg border border-amber-300 bg-white px-2.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-500/30 dark:bg-slate-800 dark:text-amber-300" disabled={publishing !== null} onClick={() => void setPatientBooking(group.doctorId, true)} type="button">
                          {publishing === group.doctorId ? "Enabling" : "Enable online booking"}
                        </button>
                      ) : null}
                      {group.blockers.some((blocker) => blocker.includes("patient booking") || blocker.includes("archived")) ? (
                        <Link className="mt-2 ml-2 inline-flex min-h-8 items-center rounded-lg border border-amber-300 bg-white px-2.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-slate-800 dark:text-amber-300" href="/admin/services">
                          Open services
                        </Link>
                      ) : null}
                    </div>
                  )}
                  {group.doctor?.publiclyBookable && group.blockers.length === 0 ? (
                    <button className="mt-2 text-[11px] font-bold text-slate-500 underline-offset-2 hover:underline disabled:opacity-60 dark:text-slate-400" disabled={publishing !== null} onClick={() => void setPatientBooking(group.doctorId, false)} type="button">
                      {publishing === group.doctorId ? "Withdrawing" : "Withdraw from patient portal"}
                    </button>
                  ) : null}
                  <ul className="mt-3 space-y-1.5">
                    {group.rules.map((schedule) => {
                      const isEditing = schedule.id === editingId;
                      return (
                        <li className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 transition ${isEditing ? "border-indigo-500 bg-indigo-50 dark:border-indigo-500/50 dark:bg-indigo-950/60" : "border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/30"}`} key={schedule.id}>
                          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{weekdayNames[schedule.weekday] ?? `Day ${schedule.weekday}`} · {formatMinute(schedule.startsMinute)}–{formatMinute(schedule.endsMinute)}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{schedule.capacity} slot{schedule.capacity === 1 ? "" : "s"}</span>
                            <button className="min-h-8 rounded-lg border border-indigo-200 bg-white px-2.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700" onClick={() => void edit(schedule)} type="button">{isEditing ? "Editing" : "Edit"}</button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
            </div>
            <WonFlowPagination firstShown={pagination.firstShown} lastShown={pagination.lastShown} noun="rostered doctors" onPageChange={pagination.setPage} page={pagination.page} pageCount={pagination.pageCount} total={pagination.total} />
          </>
        )}
      </Panel>
      <Panel description={editingId ? "Change this weekly window, then save it." : "Create a recurring weekly expected-attendance window."} title={editingId ? "Edit rostered hours" : "Add rostered hours"}>
        <form className="space-y-3" onSubmit={save}>
          <LabeledField label="Doctor">
            <select className={fieldClass} disabled={!canCreate} onChange={(event) => setForm({ ...form, doctorId: event.target.value })} required value={form.doctorId}>
              <option value="">Select doctor</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.staffProfile.membership.displayName}</option>)}
            </select>
          </LabeledField>
          <LabeledField label="Branch">
            <select className={fieldClass} disabled={!canCreate} onChange={(event) => setForm({ ...form, branchId: event.target.value })} required value={form.branchId}>
              <option value="">Select branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </LabeledField>
          <LabeledField label="Service">
            <select className={fieldClass} onChange={(event) => setForm({ ...form, serviceId: event.target.value })} value={form.serviceId}>
              <option value="">General availability</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </select>
          </LabeledField>
          <div className="grid grid-cols-2 gap-3">
            <LabeledField label="Weekday">
              <select className={fieldClass} onChange={(event) => setForm({ ...form, weekday: event.target.value })} value={form.weekday}>
                {weekdayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </LabeledField>
            <LabeledField label="Capacity"><input className={fieldClass} min="1" onChange={(event) => setForm({ ...form, capacity: event.target.value })} required type="number" value={form.capacity} /></LabeledField>
            <LabeledField label="Start time"><input className={fieldClass} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required type="time" value={form.startsAt} /></LabeledField>
            <LabeledField label="End time"><input className={fieldClass} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} required type="time" value={form.endsAt} /></LabeledField>
          </div>
          <LabeledField label="Valid from"><input className={fieldClass} onChange={(event) => setForm({ ...form, validFrom: event.target.value })} required type="date" value={form.validFrom} /></LabeledField>
          <MutationMessage error={error} success="" />
          {editingId && isDirty ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">Unsaved changes to these rostered hours.</p> : null}
          <button className={`${primaryButtonClass} w-full`} disabled={saving || !canCreate} type="submit"><Plus aria-hidden="true" size={17} />{saving ? (editingId ? "Saving schedule" : "Creating schedule") : (editingId ? "Save schedule" : "Create schedule")}</button>
          {editingId ? (
            <div className="grid grid-cols-2 gap-2">
              <button className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" disabled={saving || deleting} onClick={() => void stopEditing()} type="button">Cancel</button>
              <button className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700" disabled={saving || deleting} onClick={() => void remove()} type="button">{deleting ? "Deleting" : "Delete"}</button>
            </div>
          ) : null}
          {!canCreate ? <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Add at least one doctor and branch first.</p> : null}
        </form>
      </Panel>
    </div>
  );
}

export function LiveHospitalSchedulesPage() {
  const resource = useAdminResource<{ schedules: ScheduleRecord[]; doctors: DoctorRecord[]; configuration: OrganizationConfiguration; services: ServiceRecord[] }>("admin:schedules-live", "/api/v1/admin/schedules");
  return (
    <div className="space-y-4" id="main-content">
      <PageIntro description="Set the hours staff and doctors are expected to attend each branch." eyebrow="People & locations" icon={CalendarDays} title="Rostered hours" />
      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-950/40">
        <p className="text-sm font-bold text-amber-950 dark:text-amber-200">These hours are bookable — use &ldquo;Book appointment&rdquo; on a doctor below.</p>
        <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">When a doctor records a sitting for a specific date, that sitting overrides the roster below for that date only. Otherwise, the weekly roster is what reception books against.</p>
      </section>
      <WonFlowAsyncDataBoundary loadingDescription="Reading availability rules from the tenant database." loadingTitle="Loading rostered hours" onRetry={resource.reload} state={resource}>
        {({ schedules, doctors, configuration, services }) => <ScheduleManager branches={configuration.branches} doctors={doctors} onCreated={resource.reload} schedules={schedules} services={services} />}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}

function AuditTrail({ audit }: { audit: AuditRecord[] }) {
  const auditPages = useWonFlowPagination(audit, 12);
  return (
    <Panel description="Up to 200 of the newest tenant events are displayed." title="Recent events">
      {audit.length === 0 ? (
        <WonFlowEmptyState description="Events will appear after configuration or access activity is recorded." title="No audit events" />
      ) : (
        <>
          <div className="space-y-2">
            {auditPages.visible.map((event) => (
              <article className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/60" key={event.id}>
                <div>
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">{event.action}</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{event.entityType} · {event.entityId}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300">{event.severity}</span>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</p>
                </div>
              </article>
            ))}
          </div>
          <WonFlowPagination firstShown={auditPages.firstShown} lastShown={auditPages.lastShown} noun="events" onPageChange={auditPages.setPage} page={auditPages.page} pageCount={auditPages.pageCount} total={auditPages.total} />
        </>
      )}
    </Panel>
  );
}

export function LiveHospitalAuditPage() {
  const resource = useAdminResource<{ audit: AuditRecord[] }>("admin:audit-live", "/api/v1/admin/audit");
  return (
    <div className="space-y-4" id="main-content">
      <PageIntro description="Review immutable tenant configuration and access events recorded by the backend." eyebrow="Services & governance" icon={FileClock} title="Audit trail" />
      <WonFlowAsyncDataBoundary loadingDescription="Reading the latest tenant audit events." loadingTitle="Loading audit trail" onRetry={resource.reload} state={resource}>
        {({ audit }) => <AuditTrail audit={audit} />}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}

