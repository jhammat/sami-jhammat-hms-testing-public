"use client";

import { useEffect, useState } from "react";
import { Archive, Building2, RefreshCw, Trash2, RotateCcw } from "lucide-react";

import { PlatformEmptyState, PlatformLoadingState, PlatformPanel, PlatformStatusBadge } from "./platform-administration-ui";

interface DeletedTenant {
  id: string;
  displayName: string;
  slug: string;
  status: "ARCHIVED";
  archivedAt: string | null;
  updatedAt: string;
  organizations: Array<{ branches: Array<{ id: string }> }>;
  subscription: { planCode: string; status: string; seatCount: number } | null;
}

export function PlatformDeletedTenants() {
  const [tenants, setTenants] = useState<DeletedTenant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [restoringTenantId, setRestoringTenantId] = useState<string | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [restoreReason, setRestoreReason] = useState("");
  const [restoreError, setRestoreError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const response = await fetch("/api/v1/platform/organizations?scope=deleted", { credentials: "same-origin" });
      const body = await response.json() as { tenants?: DeletedTenant[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Deleted tenants could not be loaded.");
      setTenants(body.tenants ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Deleted tenants could not be loaded.");
    }
  }

  async function permanentlyDelete(tenantId: string) {
    setDeleteError(null);
    try {
      const response = await fetch(`/api/v1/platform/organizations/${encodeURIComponent(tenantId)}/permanently-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
          reason: deleteReason,
        }),
        credentials: "same-origin",
      });
      const body = await response.json() as { result?: { deletedTenantId: string }; error?: string };
      if (!response.ok) throw new Error(body.error ?? "The tenant could not be permanently deleted.");
      setTenants((prev) => prev?.filter((t) => t.id !== tenantId) ?? null);
      setDeletingTenantId(null);
      setDeleteConfirmation("");
      setDeleteReason("");
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "The tenant could not be permanently deleted.");
    }
  }

  async function restore(tenantId: string) {
    setRestoreError(null);
    try {
      const response = await fetch(`/api/v1/platform/organizations/${encodeURIComponent(tenantId)}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: restoreConfirmation,
          reason: restoreReason,
        }),
        credentials: "same-origin",
      });
      const body = await response.json() as { tenant?: { id: string }; error?: string };
      if (!response.ok) throw new Error(body.error ?? "The tenant could not be restored.");
      setTenants((prev) => prev?.filter((t) => t.id !== tenantId) ?? null);
      setRestoringTenantId(null);
      setRestoreConfirmation("");
      setRestoreReason("");
    } catch (cause) {
      setRestoreError(cause instanceof Error ? cause.message : "The tenant could not be restored.");
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, []);

  if (tenants === null && error === null) return <PlatformLoadingState label="Loading deleted tenant backups…" />;
  if (error !== null) return <PlatformEmptyState action={<button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white" onClick={() => void load()} type="button"><RefreshCw aria-hidden size={16} />Try again</button>} description={error} title="Deleted tenants could not be loaded" />;
  if (tenants?.length === 0) return <PlatformEmptyState description="Deleted tenant records will appear here. Their operational data remains retained in the platform backup." icon={<Archive aria-hidden size={25} />} title="No deleted tenant backups" />;

  return (
    <PlatformPanel description="These tenants are removed from active operations. Their records are retained for platform-only backup and audit purposes." title="Deleted tenant backups">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-3 py-3">Organization</th><th className="px-3 py-3">Deleted</th><th className="px-3 py-3">Subscription</th><th className="px-3 py-3">Seats</th><th className="px-3 py-3">Branches retained</th><th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants?.map((tenant) => (
              <tr className="border-b border-slate-100 last:border-0" key={tenant.id}>
                <td className="px-3 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><Building2 aria-hidden size={17} /></span><div><p className="text-sm font-semibold text-slate-950">{tenant.displayName}</p><p className="mt-0.5 text-xs text-slate-500">{tenant.slug}</p></div></div></td>
                <td className="px-3 py-4 text-sm text-slate-600">{tenant.archivedAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(tenant.archivedAt)) : "—"}</td>
                <td className="px-3 py-4"><PlatformStatusBadge status={tenant.subscription?.status.toLowerCase() ?? "cancelled"} /></td>
                <td className="px-3 py-4 text-sm font-semibold text-slate-700">{tenant.subscription?.seatCount ?? 0}</td>
                <td className="px-3 py-4 text-sm font-semibold text-slate-700">{tenant.organizations.reduce((total, organization) => total + organization.branches.length, 0)}</td>
                <td className="px-3 py-4">
                  {deletingTenantId === tenant.id ? (
                    <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                      <p className="text-xs font-semibold text-rose-900">Permanently delete {tenant.displayName}?</p>
                      <input
                        className="w-full rounded-lg border border-rose-300 bg-white px-2 py-1.5 text-xs"
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder='Type "PERMANENTLY DELETE"'
                        value={deleteConfirmation}
                      />
                      <textarea
                        className="w-full rounded-lg border border-rose-300 bg-white px-2 py-1.5 text-xs"
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="Reason (min 8 characters)"
                        rows={2}
                        value={deleteReason}
                      />
                      {deleteError && <p className="text-xs font-semibold text-rose-700">{deleteError}</p>}
                      <div className="flex gap-2">
                        <button
                          className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          onClick={() => {
                            setDeletingTenantId(null);
                            setDeleteConfirmation("");
                            setDeleteReason("");
                            setDeleteError(null);
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="inline-flex h-8 items-center rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700"
                          onClick={() => void permanentlyDelete(tenant.id)}
                          type="button"
                        >
                          Delete Forever
                        </button>
                      </div>
                    </div>
                  ) : restoringTenantId === tenant.id ? (
                    <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-semibold text-emerald-900">Restore {tenant.displayName}?</p>
                      <input
                        className="w-full rounded-lg border border-emerald-300 bg-white px-2 py-1.5 text-xs"
                        onChange={(e) => setRestoreConfirmation(e.target.value)}
                        placeholder='Type "RESTORE"'
                        value={restoreConfirmation}
                      />
                      <textarea
                        className="w-full rounded-lg border border-emerald-300 bg-white px-2 py-1.5 text-xs"
                        onChange={(e) => setRestoreReason(e.target.value)}
                        placeholder="Reason (min 8 characters)"
                        rows={2}
                        value={restoreReason}
                      />
                      {restoreError && <p className="text-xs font-semibold text-emerald-700">{restoreError}</p>}
                      <div className="flex gap-2">
                        <button
                          className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          onClick={() => {
                            setRestoringTenantId(null);
                            setRestoreConfirmation("");
                            setRestoreReason("");
                            setRestoreError(null);
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="inline-flex h-8 items-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
                          onClick={() => void restore(tenant.id)}
                          type="button"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        onClick={() => setRestoringTenantId(tenant.id)}
                        type="button"
                      >
                        <RotateCcw aria-hidden size={12} />
                        Restore
                      </button>
                      <button
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        onClick={() => setDeletingTenantId(tenant.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PlatformPanel>
  );
}
