"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Check, Copy, Eye, FileCheck2, FileText, Plus, Printer, ShieldAlert, X } from "lucide-react";

import { WonFlowAsyncDataBoundary, WonFlowEmptyState, WonFlowPagination, useWonFlowConfirm, useWonFlowPagination } from "@/components/feedback";
import { phaseOneApi } from "@/lib/api/phase-one-api";
import { useWonFlowAsyncData } from "@/lib/data";

type PolicyStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface PolicyRecord {
  id: string;
  code: string;
  title: string;
  category: string;
  summary: string | null;
  body: string;
  status: PolicyStatus;
  version: number;
  effectiveFrom: string | null;
  publishedAt: string | null;
  updatedAt: string;
  versions: Array<{ id: string; version: number; publishedAt: string; title: string }>;
}

const policyCategories = [
  { code: "CONSENT", label: "Consent & authorisation" },
  { code: "PRIVACY", label: "Privacy & data protection" },
  { code: "TERMS", label: "Terms of service" },
  { code: "REFUND", label: "Billing & refunds" },
  { code: "BOOKING", label: "Booking & cancellation" },
  { code: "SAFETY", label: "Clinical safety notice" },
  { code: "PATIENT", label: "Patient information" },
  { code: "OTHER", label: "Other hospital policy" },
] as const;

const categoryLabel = (code: string) => policyCategories.find((category) => category.code === code)?.label ?? code;

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

const statusStyles: Record<PolicyStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border border-amber-200 dark:border-amber-800/40 dark:bg-amber-950/60 dark:text-amber-300",
  PUBLISHED: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:border-emerald-800/40 dark:bg-emerald-950/60 dark:text-emerald-300",
  ARCHIVED: "bg-slate-100 text-slate-600 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>{children}</label>;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatShortDate = (value: string | null | undefined) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
};

const emptyForm = { title: "", category: "CONSENT", summary: "", body: "", effectiveFrom: "" };

function PolicyPreviewModal({
  policy,
  onClose,
  onEdit,
}: {
  policy: PolicyRecord;
  onClose: () => void;
  onEdit: (policy: PolicyRecord) => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      const textToCopy = `${policy.title}\n${policy.code} · ${categoryLabel(policy.category)}\nStatus: ${policy.status} (v${policy.version})\n\n${policy.summary ? `Summary:\n${policy.summary}\n\n` : ""}Full Policy Content:\n${policy.body}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      aria-labelledby="policy-preview-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative my-8 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <header className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 px-6 py-5 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                  <FileText size={12} />
                  {categoryLabel(policy.category)}
                </span>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-mono font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {policy.code}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${statusStyles[policy.status]}`}>
                  {policy.status}
                </span>
              </div>
              <h2 id="policy-preview-title" className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                {policy.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {policy.status === "PUBLISHED" && policy.publishedAt
                  ? `Version ${policy.version} · Published ${formatDate(policy.publishedAt)}`
                  : `Version ${policy.version} · Last edited ${formatDate(policy.updatedAt)}`}
                {policy.effectiveFrom ? ` · Effective from ${formatShortDate(policy.effectiveFrom)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                onClick={handlePrint}
                title="Print document"
                type="button"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                onClick={handleCopy}
                title="Copy policy content to clipboard"
                type="button"
              >
                {copied ? (
                  <>
                    <Check className="text-emerald-600 dark:text-emerald-400" size={14} />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
              <button
                aria-label="Close popup"
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                onClick={onClose}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {policy.summary ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs leading-relaxed text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Policy Summary
              </p>
              <p>{policy.summary}</p>
            </div>
          ) : null}

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Full Policy Content
            </h3>
            <div className="whitespace-pre-wrap select-text rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 font-sans text-sm leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
              {policy.body}
            </div>
          </div>

          {policy.versions.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Published Version History ({policy.versions.length})
              </p>
              <div className="mt-2 divide-y divide-slate-200/60 dark:divide-slate-800">
                {policy.versions.map((ver) => (
                  <div className="flex items-center justify-between py-1.5 text-xs text-slate-600 dark:text-slate-300" key={ver.id}>
                    <span className="font-semibold">Version {ver.version} · {ver.title}</span>
                    <span className="text-[11px] text-slate-400">{formatDate(ver.publishedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Document ID: <code className="font-mono">{policy.id.slice(0, 8)}...</code>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="min-h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
            <button
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700"
              onClick={() => {
                onClose();
                onEdit(policy);
              }}
              type="button"
            >
              <span>Edit policy</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function PolicyManager({ policies, onChanged }: { policies: PolicyRecord[]; onChanged(): void }) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadedForm, setLoadedForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [previewingPolicy, setPreviewingPolicy] = useState<PolicyRecord | null>(null);
  const pages = useWonFlowPagination(policies, 6);
  const { confirm, dialog: confirmDialog } = useWonFlowConfirm();
  const editing = policies.find((policy) => policy.id === editingId) ?? null;
  const isDirty = JSON.stringify(form) !== JSON.stringify(loadedForm);

  async function edit(policy: PolicyRecord) {
    if (policy.id === editingId) return;
    if (isDirty && !await confirm({ title: "Discard changes", message: "The unsaved changes to this policy are lost if you edit another one.", confirmLabel: "Discard and edit" })) return;
    const next = { title: policy.title, category: policy.category, summary: policy.summary ?? "", body: policy.body, effectiveFrom: policy.effectiveFrom?.slice(0, 10) ?? "" };
    setForm(next);
    setLoadedForm(next);
    setEditingId(policy.id);
    setError("");
  }

  async function reset() {
    if (isDirty && !await confirm({ title: "Discard changes", message: "The unsaved changes to this policy are lost.", confirmLabel: "Discard changes" })) return;
    setForm(emptyForm);
    setLoadedForm(emptyForm);
    setEditingId(null);
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = JSON.stringify({ ...form, summary: form.summary || null, effectiveFrom: form.effectiveFrom || null });
    try {
      if (editingId) await phaseOneApi(`/api/v1/admin/policies/${editingId}`, { method: "PATCH", body });
      else await phaseOneApi("/api/v1/admin/policies", { method: "POST", body });
      setLoadedForm(form);
      if (!editingId) { setForm(emptyForm); setLoadedForm(emptyForm); }
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The policy could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function act(policy: PolicyRecord, action: "publish" | "archive" | "restore") {
    if (action === "publish" && isDirty && editingId === policy.id && !await confirm({ title: "Publish saved wording", message: "Unsaved edits in the form are not included in this version.", confirmLabel: "Publish", tone: "primary" })) return;
    if (action === "archive" && !await confirm({ title: "Archive policy", message: `${policy.title} stops being the active policy. Published versions stay readable.`, confirmLabel: "Archive policy" })) return;
    setBusyAction(`${policy.id}:${action}`);
    setError("");
    try {
      await phaseOneApi(`/api/v1/admin/policies/${policy.id}`, { method: "PATCH", body: JSON.stringify({ action }) });
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The policy could not be updated.");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      {confirmDialog}
      {previewingPolicy ? (
        <PolicyPreviewModal
          onClose={() => setPreviewingPolicy(null)}
          onEdit={(policy) => {
            void edit(policy);
          }}
          policy={previewingPolicy}
        />
      ) : null}

      <section className="wf-admin-panel rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">Policy library</h2>
        <p className="mt-1 text-xs text-slate-500">{policies.length} {policies.length === 1 ? "document" : "documents"}. Publishing snapshots the wording so an earlier version can always be produced.</p>
        {error ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{error}</p> : null}
        {policies.length === 0 ? (
          <div className="mt-4"><WonFlowEmptyState title="No policies yet" description="Publish the hospital's consent, privacy and booking policies so they can be shown to patients." /></div>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              {pages.visible.map((policy) => (
                <article className={`rounded-2xl border p-4 transition ${policy.id === editingId ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`} key={policy.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-950">{policy.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{policy.code} · {categoryLabel(policy.category)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${statusStyles[policy.status]}`}>{policy.status}</span>
                  </div>
                  {policy.summary ? <p className="mt-2 text-xs leading-5 text-slate-600">{policy.summary}</p> : null}
                  <p className="mt-2 text-[10px] font-semibold text-slate-500">
                    {policy.status === "PUBLISHED" && policy.publishedAt ? `Version ${policy.version} published ${formatDate(policy.publishedAt)}` : `Last edited ${formatDate(policy.updatedAt)}`}
                    {policy.versions.length > 0 ? ` · ${policy.versions.length === 1 ? "1 published version" : `${policy.versions.length} published versions`}` : " · never published"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button className="min-h-9 rounded-xl border border-blue-200 px-3 text-xs font-bold text-blue-700 hover:bg-blue-50" onClick={() => void edit(policy)} type="button">{policy.id === editingId ? "Editing" : "Edit"}</button>
                    {policy.status !== "ARCHIVED" ? <button className="min-h-9 rounded-xl border border-emerald-200 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60" disabled={busyAction !== ""} onClick={() => void act(policy, "publish")} type="button">{busyAction === `${policy.id}:publish` ? "Publishing" : policy.status === "PUBLISHED" ? "Republish" : "Publish"}</button> : null}
                    {policy.status === "ARCHIVED"
                      ? <button className="min-h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60" disabled={busyAction !== ""} onClick={() => void act(policy, "restore")} type="button">{busyAction === `${policy.id}:restore` ? "Restoring" : "Restore"}</button>
                      : <button className="min-h-9 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60" disabled={busyAction !== ""} onClick={() => void act(policy, "archive")} type="button">{busyAction === `${policy.id}:archive` ? "Archiving" : "Archive"}</button>}
                    <button
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100/70 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                      onClick={() => setPreviewingPolicy(policy)}
                      title="View full policy content"
                      type="button"
                    >
                      <Eye aria-hidden="true" size={13} />
                      <span>Preview</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <WonFlowPagination firstShown={pages.firstShown} lastShown={pages.lastShown} noun="policies" onPageChange={pages.setPage} page={pages.page} pageCount={pages.pageCount} total={pages.total} />
          </>
        )}
      </section>
      <section className="wf-admin-panel rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-950">{editing ? "Edit policy" : "Add policy"}</h2>
            <p className="mt-1 text-xs text-slate-500">{editing ? `${editing.code} · saving keeps it a draft until you publish.` : "Drafts are private until published."}</p>
          </div>
          {editing ? (
            <button
              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/40 px-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100/70"
              onClick={() =>
                setPreviewingPolicy({
                  ...editing,
                  title: form.title || editing.title,
                  category: form.category,
                  summary: form.summary || null,
                  body: form.body,
                  effectiveFrom: form.effectiveFrom || null,
                })
              }
              title="Preview changes"
              type="button"
            >
              <Eye aria-hidden="true" size={13} />
              <span>Preview</span>
            </button>
          ) : null}
        </div>
        <form className="mt-4 space-y-3" onSubmit={save}>
          <Field label="Title"><input className={fieldClass} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label="Category"><select className={fieldClass} required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{policyCategories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}</select></Field>
          <Field label="Summary (optional)"><input className={fieldClass} maxLength={500} placeholder="One line shown next to the policy" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></Field>
          <Field label="Policy content"><textarea className={`${fieldClass} min-h-48 py-2 leading-6`} required value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></Field>
          <Field label="Effective from (optional)"><input className={fieldClass} type="date" value={form.effectiveFrom} onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} /></Field>
          {editing && isDirty ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Unsaved changes. Save first, then publish.</p> : null}
          {editing && editing.versions.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Published versions</p>
              <ul className="mt-1.5 space-y-1">{editing.versions.map((version) => <li className="text-[11px] font-semibold text-slate-600" key={version.id}>v{version.version} · {formatDate(version.publishedAt)}</li>)}</ul>
            </div>
          ) : null}
          <button className={`${buttonClass} w-full`} disabled={saving} type="submit"><Plus aria-hidden="true" size={17} />{saving ? "Saving" : editing ? "Save draft" : "Create policy"}</button>
          {editing ? <div className="grid grid-cols-2 gap-2"><button className={secondaryButtonClass} disabled={saving} onClick={() => void reset()} type="button">Cancel</button><button className={`${buttonClass} bg-emerald-600 hover:bg-emerald-700`} disabled={saving || busyAction !== "" || isDirty} onClick={() => void act(editing, "publish")} type="button"><FileCheck2 aria-hidden="true" size={16} />Publish</button></div> : null}
        </form>
      </section>
    </div>
  );
}

export function HospitalPolicyManagementPage() {
  const resource = useWonFlowAsyncData<{ policies: PolicyRecord[] }>({
    key: "admin:policies",
    loader: async (signal) => phaseOneApi<{ policies: PolicyRecord[] }>("/api/v1/admin/policies", { signal }),
  });

  return (
    <div className="space-y-4" id="main-content">
      <section className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-violet-50 p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white"><ShieldAlert aria-hidden="true" size={22} /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Services &amp; governance</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Policies &amp; content</h1>
            <p className="mt-1 text-sm text-slate-600">Write, publish and version the hospital&rsquo;s consent, privacy and patient-facing documents.</p>
          </div>
        </div>
      </section>
      <WonFlowAsyncDataBoundary loadingTitle="Loading policies" loadingDescription="Reading policy documents from the tenant database." onRetry={resource.reload} state={resource}>
        {({ policies }) => <PolicyManager onChanged={resource.reload} policies={policies} />}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}

