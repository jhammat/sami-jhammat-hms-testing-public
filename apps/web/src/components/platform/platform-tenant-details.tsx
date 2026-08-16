"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArrowRight, Building2, CircleOff, CreditCard, ShieldCheck, Users, Check } from "lucide-react";

import { PLATFORM_MODULE_CATALOG, usePlatformAdministration } from "./platform-administration-context";
import type { ActivatePlatformTenantInput, PlatformTenantStatus } from "./platform-administration-context";

const STATUS_CONFIRMATION: Record<Exclude<PlatformTenantStatus, "archived">, string> = { draft: "ACTIVATE", active: "REACTIVATE", suspended: "RESTRICT" };

const STATUS_TONE: Record<PlatformTenantStatus, string> = {
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  suspended: "bg-rose-50 text-rose-700 ring-rose-200",
  archived: "bg-slate-100 text-slate-700 ring-slate-200",
};

const PLAN_LABEL: Record<string, string> = {
  unconfigured: "Not configured",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

function money(amountMinor: number, currencyCode: string): string {
  return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode || "PKR", maximumFractionDigits: 0 }).format(amountMinor / 100);
}

/** Meets validateNewPassword's rules (12+ chars, upper, lower, digit) by construction; the operator can still edit it before submitting. */
function generateTemporaryPassword(): string {
  return `Won${new Date().getFullYear()}!${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

const fieldClass = "mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const labelClass = "block text-xs font-semibold text-slate-600";

function StatCard({ icon, label, value, detail, configured }: { icon: React.ReactNode; label: string; value: string; detail?: string; configured?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${configured ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          {icon}
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
        </div>
        {configured && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check size={12} />
          </div>
        )}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

function ManageLink({ href, icon, title, detail, configured }: { href: string; icon: React.ReactNode; title: string; detail: string; configured?: boolean }) {
  return (
    <Link
      className={`group flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${configured ? "border-emerald-300 bg-emerald-50 hover:border-emerald-400" : "border-slate-200 bg-white hover:border-indigo-300"}`}
      href={href}
    >
      <span className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${configured ? "bg-emerald-100 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>{icon}</span>
        <span>
          <span className="block text-sm font-semibold text-slate-950">{title}</span>
          <span className="block text-xs text-slate-500">{detail}</span>
        </span>
      </span>
      <div className="flex items-center gap-2">
        {configured && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check size={12} />
          </div>
        )}
        <ArrowRight aria-hidden className={`transition group-hover:translate-x-0.5 ${configured ? "text-emerald-400 group-hover:text-emerald-500" : "text-slate-300 group-hover:text-indigo-500"}`} size={18} />
      </div>
    </Link>
  );
}

function ActivationForm({ tenantId, onActivated }: { tenantId: string; onActivated: (result: { ownerEmail: string; temporaryPassword: string }) => void }) {
  const { activateTenant } = usePlatformAdministration();
  const [form, setForm] = useState<Pick<ActivatePlatformTenantInput, "ownerName" | "ownerEmail" | "temporaryPassword" | "primaryBranchName">>({
    ownerName: "",
    ownerEmail: "",
    temporaryPassword: generateTemporaryPassword(),
    primaryBranchName: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      // Use default subscription values - subscription should be configured separately via "Manage subscription"
      const activationInput: ActivatePlatformTenantInput = {
        ...form,
        planCode: "starter",
        seatCount: 5,
        monthlyAmountMinor: 0,
        currencyCode: "PKR",
      };
      const activation = await activateTenant(tenantId, activationInput);
      // activateTenant's own reload() already flipped this tenant's status to
      // "active" by the time this resolves, which unmounts this form from its
      // parent's draft/active branch — the credentials must be handed to a
      // parent that outlives that swap, not kept in this component's own state.
      onActivated(activation);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This organization could not be activated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-indigo-50 px-3.5 py-2.5 text-xs font-medium text-indigo-900">
        Activation creates the hospital&rsquo;s first administrator account and its main branch. Configure subscription and entitlements separately using the links below.
      </p>
      {error ? <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>Owner name
          <input className={fieldClass} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} value={form.ownerName} />
        </label>
        <label className={labelClass}>Owner email
          <input className={fieldClass} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} type="email" value={form.ownerEmail} />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>Temporary password
          <span className="mt-1 flex gap-2">
            <input className={`${fieldClass} mt-0 font-mono`} onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })} value={form.temporaryPassword} />
            <button className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => setForm({ ...form, temporaryPassword: generateTemporaryPassword() })} type="button">Regenerate</button>
          </span>
        </label>
        <label className={`${labelClass} sm:col-span-2`}>Main branch name
          <input className={fieldClass} onChange={(e) => setForm({ ...form, primaryBranchName: e.target.value })} placeholder="Main Branch" value={form.primaryBranchName} />
        </label>
      </div>

      <button className="inline-flex h-10 items-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50" disabled={busy} onClick={submit} type="button">
        {busy ? "Activating…" : "Activate organization"}
      </button>
    </div>
  );
}

function StatusAction({ tenantId, target, label, tone }: { tenantId: string; target: Exclude<PlatformTenantStatus, "archived">; label: string; tone: string }) {
  const { setTenantStatus } = usePlatformAdministration();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const expected = STATUS_CONFIRMATION[target];

  if (!open) return <button className={`inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold text-white transition ${tone}`} onClick={() => setOpen(true)} type="button">{label}</button>;

  return (
    <div className="w-full max-w-md space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
      <p className="text-xs text-slate-600">Type <strong className="font-semibold text-slate-900">{expected}</strong> to confirm.</p>
      <input className={`${fieldClass} mt-0`} onChange={(e) => setConfirmation(e.target.value)} value={confirmation} />
      <textarea className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" onChange={(e) => setReason(e.target.value)} placeholder="Reason (at least 8 characters)" rows={2} value={reason} />
      <div className="flex gap-2">
        <button
          className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-white transition disabled:opacity-50 ${tone}`}
          disabled={busy}
          onClick={async () => {
            setError(""); setBusy(true);
            try { await setTenantStatus(tenantId, target, confirmation, reason); setOpen(false); setConfirmation(""); setReason(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "This action failed."); } finally { setBusy(false); }
          }}
          type="button"
        >
          Confirm {label.toLowerCase()}
        </button>
        <button className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setOpen(false)} type="button">Cancel</button>
      </div>
    </div>
  );
}

function ArchiveTenantAction({ tenantId, organizationName }: { tenantId: string; organizationName: string }) {
  const { removeTenant } = usePlatformAdministration();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100" onClick={() => setOpen(true)} type="button"><Archive aria-hidden size={16} />Delete tenant</button>;

  return (
    <div className="w-full max-w-xl space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <div>
        <p className="text-sm font-semibold text-rose-950">Delete this tenant from active operations</p>
        <p className="mt-1 text-xs leading-5 text-rose-800">This immediately revokes tenant access, cancels its subscription, disables entitlements and support access, and preserves its records for platform administrators.</p>
      </div>
      {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
      <label className={labelClass}>Type the organization name to confirm
        <input className={`${fieldClass} mt-1`} onChange={(e) => setConfirmation(e.target.value)} value={confirmation} />
      </label>
      <label className={labelClass}>Reason
        <textarea className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100" onChange={(e) => setReason(e.target.value)} placeholder="Reason (at least 8 characters)" rows={2} value={reason} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="inline-flex h-10 items-center rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:opacity-50" disabled={busy} onClick={async () => { setError(""); setBusy(true); try { const removed = await removeTenant(tenantId, confirmation, reason); if (!removed) setError(`Type \"${organizationName}\" exactly to confirm.`); else { router.push("/platform/deleted-tenants"); router.refresh(); } } catch (cause) { setError(cause instanceof Error ? cause.message : "This tenant could not be deleted."); } finally { setBusy(false); } }} type="button">{busy ? "Deleting…" : "Delete tenant entirely"}</button>
        <button className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setOpen(false)} type="button">Cancel</button>
      </div>
    </div>
  );
}

function CancelSubscriptionAction({ tenantId }: { tenantId: string }) {
  const { cancelTenantSubscription } = usePlatformAdministration();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100" onClick={() => setOpen(true)} type="button"><CircleOff aria-hidden size={16} />Cancel subscription</button>;

  return <div className="w-full max-w-xl space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><div><p className="text-sm font-semibold text-amber-950">Cancel this tenant&rsquo;s subscription</p><p className="mt-1 text-xs leading-5 text-amber-800">Billing is cancelled immediately. This does not restrict tenant access; use Restrict tenant when access must stop.</p></div>{error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}<label className={labelClass}>Type CANCEL SUBSCRIPTION to confirm<input className={`${fieldClass} mt-1`} onChange={(event) => setConfirmation(event.target.value)} value={confirmation} /></label><label className={labelClass}>Reason<textarea className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100" onChange={(event) => setReason(event.target.value)} placeholder="Reason (at least 8 characters)" rows={2} value={reason} /></label><div className="flex flex-wrap gap-2"><button className="inline-flex h-10 items-center rounded-xl bg-amber-700 px-4 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50" disabled={busy} onClick={async () => { setError(""); setBusy(true); try { await cancelTenantSubscription(tenantId, confirmation, reason); setOpen(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "This subscription could not be cancelled."); } finally { setBusy(false); } }} type="button">{busy ? "Cancelling…" : "Confirm cancellation"}</button><button className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setOpen(false)} type="button">Keep subscription</button></div></div>;
}

/**
 * A tenant's own overview: identity, lifecycle and the commercial position at
 * a glance. Subscription and entitlement editing deliberately live on their
 * dedicated pages (/platform/subscriptions, /platform/entitlements), which
 * already cover every tenant — duplicating those editors here meant the same
 * record could be changed from two places with no indication they were the
 * same thing.
 */
export function PlatformTenantDetails({ tenantId }: { tenantId: string }) {
  const { getTenant, workspace } = usePlatformAdministration();
  const tenant = getTenant(tenantId);
  const [justActivated, setJustActivated] = useState<{ ownerEmail: string; temporaryPassword: string } | null>(null);

  if (!workspace) return <p className="p-6 text-sm text-slate-500">Loading…</p>;
  if (!tenant) return <p className="p-6 text-sm text-rose-700">This organization could not be found.</p>;

  const enabledModules = PLATFORM_MODULE_CATALOG.filter((module) => tenant.entitlements[module.code]).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5" id="main-content">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-semibold text-white">
              {tenant.organizationName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{tenant.organizationName}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{tenant.slug}</p>
            </div>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${STATUS_TONE[tenant.status]}`}>
            {tenant.status}
          </span>
        </div>
      </header>

      {justActivated ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-900">{tenant.organizationName} is active.</p>
          <p className="mt-1.5 text-sm text-emerald-800">Give these sign-in details to the hospital&rsquo;s owner. Nothing is emailed automatically.</p>
          <div className="mt-3 space-y-1 rounded-xl bg-white p-3.5 font-mono text-xs text-slate-900">
            <p>Email: <strong>{justActivated.ownerEmail}</strong></p>
            <p>Temporary password: <strong>{justActivated.temporaryPassword}</strong></p>
          </div>
          <p className="mt-2 text-xs text-emerald-700">They must set their own password on first sign-in. This will not be shown again.</p>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard configured={tenant.subscription.plan !== "unconfigured"} detail={PLAN_LABEL[tenant.subscription.plan] ?? tenant.subscription.plan} icon={<CreditCard aria-hidden size={16} />} label="Plan" value={PLAN_LABEL[tenant.subscription.plan] ?? "—"} />
        <StatCard configured={tenant.subscription.seatCount > 0} detail="Licensed seats" icon={<Users aria-hidden size={16} />} label="Seats" value={String(tenant.subscription.seatCount)} />
        <StatCard configured={tenant.subscription.billingStatus !== "unconfigured"} detail="Recurring monthly" icon={<Building2 aria-hidden size={16} />} label="Monthly" value={money(tenant.subscription.monthlyAmountMinor, tenant.subscription.currencyCode)} />
        <StatCard configured={enabledModules > 0} detail={`of ${PLATFORM_MODULE_CATALOG.length} modules`} icon={<ShieldCheck aria-hidden size={16} />} label="Entitlements" value={String(enabledModules)} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Lifecycle</h2>
        <div className="mt-4">
          {tenant.status === "archived" ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Archived backup</p>
              <p className="mt-1 text-xs leading-5">This tenant&rsquo;s records are retained for platform administration. Tenant access is revoked and its subscription is cancelled.</p>
            </div>
          ) : tenant.status === "draft" ? (
            <div className="space-y-4">
              <ActivationForm onActivated={setJustActivated} tenantId={tenantId} />
              <ArchiveTenantAction organizationName={tenant.organizationName} tenantId={tenantId} />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tenant.subscription.billingStatus !== "unconfigured" && tenant.subscription.billingStatus !== "cancelled" ? <CancelSubscriptionAction tenantId={tenantId} /> : null}
              {tenant.status !== "suspended" ? <StatusAction label="Restrict tenant" target="suspended" tenantId={tenantId} tone="bg-rose-700 hover:bg-rose-800" /> : null}
              {tenant.status === "suspended" ? <StatusAction label="Reactivate" target="active" tenantId={tenantId} tone="bg-emerald-600 hover:bg-emerald-700" /> : null}
              <ArchiveTenantAction organizationName={tenant.organizationName} tenantId={tenantId} />
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <ManageLink configured={tenant.subscription.billingStatus !== "unconfigured"} detail="Plan, seats and billing status" href="/platform/subscriptions" icon={<CreditCard aria-hidden size={18} />} title="Manage subscription" />
        <ManageLink configured={enabledModules > 0} detail={`${enabledModules} of ${PLATFORM_MODULE_CATALOG.length} modules enabled`} href="/platform/entitlements" icon={<ShieldCheck aria-hidden size={18} />} title="Manage entitlements" />
      </div>
    </div>
  );
}
