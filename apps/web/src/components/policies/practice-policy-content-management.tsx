"use client";

import { useState } from "react";

import { usePolicies, usePolicyAction, useCreatePolicy, useUpdatePolicy } from "@/lib/api/admin";
import type { PolicyRecord } from "@/lib/api/admin";

const STATUS_TONE: Record<PolicyRecord["status"], string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-amber-100 text-amber-800",
};

function CreatePolicyForm() {
  const [form, setForm] = useState({ title: "", category: "GENERAL", body: "" });
  const [error, setError] = useState("");
  const create = useCreatePolicy();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await create.mutate({ title: form.title.trim(), category: form.category.trim(), body: form.body.trim() });
      setForm({ title: "", category: "GENERAL", body: "" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the policy.");
    }
  }

  return (
    <form className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5" onSubmit={submit}>
      <h2 className="text-lg font-black">New policy</h2>
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" required value={form.title} />
        <input className="rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" required value={form.category} />
      </div>
      <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Policy content" required rows={4} value={form.body} />
      <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={create.saveState === "saving"} type="submit">Create draft</button>
    </form>
  );
}

function PolicyCard({ policy }: { policy: PolicyRecord }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(policy.body);
  const [error, setError] = useState("");
  const update = useUpdatePolicy();
  const action = usePolicyAction();

  return (
    <article className="rounded-xl border border-slate-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-black">{policy.title}</p>
          <p className="text-xs text-slate-500">{policy.category} · v{policy.version}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_TONE[policy.status]}`}>{policy.status}</span>
      </div>
      {error ? <p className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(e) => setBody(e.target.value)} rows={4} value={body} />
          <button
            className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-black text-white"
            onClick={async () => { setError(""); try { await update.mutate({ policyId: policy.id, body }); setEditing(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save."); } }}
            type="button"
          >
            Save (editing a published policy returns it to draft; the published wording stays readable in its version history)
          </button>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{policy.body}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold" onClick={() => setEditing((current) => !current)} type="button">{editing ? "Cancel" : "Edit"}</button>
        {policy.status === "DRAFT" ? <button className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-black text-white" onClick={() => void action.mutate({ policyId: policy.id, action: "publish" })} type="button">Publish</button> : null}
        {policy.status === "PUBLISHED" ? <button className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-black text-white" onClick={() => void action.mutate({ policyId: policy.id, action: "archive" })} type="button">Archive</button> : null}
        {policy.status === "ARCHIVED" ? <button className="rounded-lg bg-slate-600 px-3 py-1 text-xs font-black text-white" onClick={() => void action.mutate({ policyId: policy.id, action: "restore" })} type="button">Restore</button> : null}
      </div>
      {policy.versions.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-black text-slate-500">Version history ({policy.versions.length})</summary>
          <ul className="mt-2 space-y-1">
            {policy.versions.map((version) => (
              <li className="rounded-lg bg-slate-50 p-2 text-xs" key={version.id}>v{version.version} — published {version.publishedAt ? new Date(version.publishedAt).toLocaleString("en-PK") : "—"}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

/**
 * Scoped to versioned PolicyDocument records — the real, server-backed
 * model. The mock version of this screen also managed content blocks,
 * notification templates and terminology overrides, none of which have
 * a real Prisma model yet; that surface is intentionally out of scope
 * here rather than faked against nothing.
 */
export function PracticePolicyContentManagement() {
  const policies = usePolicies();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="rounded-3xl bg-gradient-to-r from-slate-800 to-slate-700 p-6 text-white">
        <h1 className="text-2xl font-black">Policies</h1>
        <p className="mt-1 text-sm text-slate-300">Editing never mutates a published version — publishing snapshots the current wording into history.</p>
      </header>
      <CreatePolicyForm />
      <section className="space-y-3">
        {policies.status === "loading" ? <p className="text-sm text-slate-500">Loading…</p> : null}
        {policies.status === "empty" ? <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">No policies yet.</p> : null}
        {(policies.data?.policies ?? []).map((policy) => <PolicyCard key={policy.id} policy={policy} />)}
      </section>
    </div>
  );
}
