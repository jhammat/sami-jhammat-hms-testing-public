"use client";

import Link from "next/link";
import {
  Check,
  LoaderCircle,
  Pencil,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import {
  PLATFORM_MODULE_CATALOG,
  usePlatformAdministration,
} from "./platform-administration-context";
import {
  PlatformEmptyState,
  PlatformLoadingState,
  PlatformPanel,
  PlatformStatusBadge,
  platformInputClassName,
} from "./platform-administration-ui";

export function PlatformEntitlementsPanel() {
  const {
    ready,
    reload,
    workspace,
  } = usePlatformAdministration();

  const [selectedTenantId, setTenantId] =
    useState("");
  const [drafts, setDrafts] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const tenantId =
    selectedTenantId ||
    workspace.tenants[0]?.id ||
    "";

  const tenant =
    workspace.tenants.find(
      (record) => record.id === tenantId,
    );

  const groupedModules = useMemo(
    () =>
      ["Core", "Access", "Clinical", "Operations"].map(
        (group) => ({
          group,
          modules:
            PLATFORM_MODULE_CATALOG.filter(
              (module) =>
                module.group === group,
            ),
        }),
      ),
    [],
  );

  if (!ready) {
    return (
      <PlatformLoadingState label="Loading entitlements…" />
    );
  }

  if (workspace.tenants.length === 0) {
    return (
      <PlatformEmptyState
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white"
            href="/platform/organizations/new"
          >
            Add tenant
          </Link>
        }
        description="Entitlements cannot be configured until a real tenant organization exists."
        icon={
          <ShieldCheck
            aria-hidden="true"
            size={24}
          />
        }
        title="No tenant entitlements"
      />
    );
  }

  if (tenant === undefined) {
    return null;
  }

  const activeTenant = tenant;

  const enabledCount =
    Object.values(
      tenant.entitlements,
    ).filter(Boolean).length;

  async function persistEntitlement(moduleCode: string, enabled: boolean): Promise<boolean> {
    try {
      const response = await fetch(`/api/v1/platform/organizations/${encodeURIComponent(activeTenant.backendTenantId ?? activeTenant.id)}/entitlements/${encodeURIComponent(moduleCode)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, tenantSlug: activeTenant.slug, tenantDisplayName: activeTenant.organizationName }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The entitlement could not be saved.");
      // The PUT above is the write; re-project instead of mirroring it.
      await reload();
      return true;
    } catch {
      return false;
    }
  }

  const pendingChanges = PLATFORM_MODULE_CATALOG.flatMap((module) => {
    const key = `${activeTenant.id}:${module.code}`;
    const saved = activeTenant.entitlements[module.code] === true;
    const draft = drafts[key];
    return draft !== undefined && draft !== saved ? [{ moduleCode: module.code, enabled: draft, key }] : [];
  });

  async function saveAllEntitlements(): Promise<void> {
    if (pendingChanges.length === 0 || saveState === "saving") return;
    setSaveState("saving");
    let failed = false;
    for (const change of pendingChanges) {
      const saved = await persistEntitlement(change.moduleCode, change.enabled);
      if (saved) setEditing((current) => ({ ...current, [change.key]: false }));
      else failed = true;
    }
    setSaveState(failed ? "error" : "saved");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label>
          <span className="text-sm font-semibold text-slate-700">
            Tenant organization
          </span>
          <select
            className={`${platformInputClassName} mt-1.5`}
            onChange={(event) =>
              setTenantId(event.target.value)
            }
            value={tenant.id}
          >
            {workspace.tenants.map(
              (record) => (
                <option
                  key={record.id}
                  value={record.id}
                >
                  {record.organizationName}
                </option>
              ),
            )}
          </select>
        </label>

        <div className="flex items-center gap-2 pb-1">
          <PlatformStatusBadge
            status={tenant.status}
          />
          <span className="text-xs font-semibold text-slate-500">
            {enabledCount} enabled
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        Every module starts disabled. Each change is recorded in Platform Audit.
      </div>

      {groupedModules.map(
        ({ group, modules }) => (
          <PlatformPanel
            description={`${group} modules for ${tenant.organizationName}.`}
            key={group}
            title={group}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {modules.map((module) => {
                const enabled =
                  tenant.entitlements[
                    module.code
                  ] === true;
                const key = `${tenant.id}:${module.code}`;
                const draftEnabled = drafts[key] ?? enabled;
                const dirty = draftEnabled !== enabled;
                const isEditing = editing[key] === true;

                return (
                  <article
                    className={[
                      "flex items-start gap-4 rounded-2xl border p-4 transition",
                      draftEnabled
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 bg-white hover:border-violet-200",
                    ].join(" ")}
                    key={module.code}
                  >
                    <label className={`flex min-w-0 flex-1 items-start gap-4 ${isEditing ? "cursor-pointer" : "cursor-default"}`}>
                      <input
                        checked={draftEnabled}
                        className="mt-1 h-4 w-4 accent-violet-700"
                        disabled={!isEditing}
                        onChange={(event) => {
                          setDrafts((current) => ({ ...current, [key]: event.target.checked }));
                          setSaveState("idle");
                        }}
                        type="checkbox"
                      />

                      <span>
                      <span className="block text-sm font-semibold text-slate-950">
                        {module.name}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {module.description}
                      </span>
                      </span>
                    </label>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <button
                        className={isEditing
                          ? "inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
                          : "inline-flex min-h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"}
                        onClick={() => {
                          if (isEditing) {
                            setDrafts((current) => ({ ...current, [key]: enabled }));
                            setEditing((current) => ({ ...current, [key]: false }));
                          } else {
                            setEditing((current) => ({ ...current, [key]: true }));
                          }
                          setSaveState("idle");
                        }}
                        type="button"
                      >
                        {isEditing ? <X aria-hidden="true" size={15} /> : <Pencil aria-hidden="true" size={15} />}
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                      {dirty ? <span className="text-[10px] font-semibold text-amber-700">Unsaved change</span> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </PlatformPanel>
        ),
      )}

      <div className="sticky bottom-4 z-20 rounded-2xl border border-blue-200 bg-white/95 p-3 shadow-[0_18px_50px_rgba(30,64,175,0.18)] backdrop-blur">
        <button
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 px-6 text-base font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pendingChanges.length === 0 || saveState === "saving"}
          onClick={() => void saveAllEntitlements()}
          type="button"
        >
          {saveState === "saving" ? <LoaderCircle aria-hidden="true" className="animate-spin" size={20} /> : saveState === "saved" && pendingChanges.length === 0 ? <Check aria-hidden="true" size={20} /> : <Save aria-hidden="true" size={20} />}
          {saveState === "saving"
            ? `Saving ${pendingChanges.length} changes…`
            : pendingChanges.length > 0
              ? `Save ${pendingChanges.length} entitlement ${pendingChanges.length === 1 ? "change" : "changes"}`
              : "All entitlement changes saved"}
        </button>
        {saveState === "error" ? <p className="mt-2 text-center text-xs font-semibold text-rose-600" role="alert">Some changes could not be saved. Review your connection and try Save Changes again.</p> : null}
      </div>
    </div>
  );
}
