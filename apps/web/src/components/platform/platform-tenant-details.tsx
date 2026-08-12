"use client";

import Link from "next/link";
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  Mail,
  MapPin,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Rocket,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  PlatformDangerButton,
  PlatformEmptyState,
  PlatformLoadingState,
  PlatformPanel,
  PlatformPrimaryButton,
  PlatformSecondaryButton,
  PlatformStatusBadge,
  TenantLogo,
  UserAvatar,
  platformInputClassName,
  platformTextareaClassName,
} from "./platform-administration-ui";
import {
  PLATFORM_MODULE_CATALOG,
  usePlatformAdministration,
} from "./platform-administration-store";
import type {
  ApplyPlatformTenantActivationInput,
  CreatePlatformBranchInput,
  CreatePlatformTenantUserInput,
  PlatformTenantRecord,
  PlatformTenantSettings,
  PlatformTenantStatus,
  PlatformTenantSubscription,
  UpdatePlatformTenantProfileInput,
} from "./platform-administration-store";

type TenantDetailsTab =
  | "overview"
  | "branches"
  | "users"
  | "subscription"
  | "entitlements"
  | "settings"
  | "activity";

const tabs: readonly {
  value: TenantDetailsTab;
  label: string;
  icon: typeof Building2;
}[] = [
  {
    value: "overview",
    label: "Overview",
    icon: Building2,
  },
  {
    value: "branches",
    label: "Branches",
    icon: MapPin,
  },
  {
    value: "users",
    label: "Users",
    icon: Users,
  },
  {
    value: "subscription",
    label: "Subscription",
    icon: CircleDollarSign,
  },
  {
    value: "entitlements",
    label: "Entitlements",
    icon: ShieldCheck,
  },
  {
    value: "settings",
    label: "Settings",
    icon: Settings,
  },
  {
    value: "activity",
    label: "Activity",
    icon: Activity,
  },
];

function isTenantDetailsTab(
  value: string | null,
): value is TenantDetailsTab {
  return tabs.some(
    (tab) => tab.value === value,
  );
}

export function PlatformTenantDetails({
  tenantId,
}: {
  tenantId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    ready,
    reload,
    workspace,
    getTenant,
    updateTenantProfile,
    setTenantStatus,
    addBranch,
    addTenantUser,
    applyTenantActivation,
    updateTenantSettings,
  } = usePlatformAdministration();

  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] =
    useState<TenantDetailsTab>(
      isTenantDetailsTab(requestedTab)
        ? requestedTab
        : "overview",
    );
  const [editingProfile, setEditingProfile] =
    useState(false);
  const [statusReason, setStatusReason] =
    useState("");
  const [deleteConfirmation, setDeleteConfirmation] =
    useState("");
  const [deleteReason, setDeleteReason] =
    useState("");
  const [deletingTenant, setDeletingTenant] =
    useState(false);
  const [actionMessage, setActionMessage] =
    useState<string>();

  const tenant = getTenant(tenantId);

  const [syncedRequestedTab, setSyncedRequestedTab] =
    useState(requestedTab);

  if (syncedRequestedTab !== requestedTab) {
    setSyncedRequestedTab(requestedTab);

    if (isTenantDetailsTab(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }

  if (!ready) {
    return (
      <PlatformLoadingState label="Loading tenant details…" />
    );
  }

  if (tenant === undefined) {
    return (
      <div className="space-y-6">
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/platform/organizations"
        >
          <ChevronLeft
            aria-hidden="true"
            size={17}
          />
          Tenant directory
        </Link>

        <PlatformEmptyState
          description="The tenant does not exist in this configuration workspace or may have been removed."
          icon={
            <Building2
              aria-hidden="true"
              size={25}
            />
          }
          title="Tenant not found"
        />
      </div>
    );
  }

  function changeTab(tab: TenantDetailsTab) {
    setActiveTab(tab);
    setActionMessage(undefined);
    router.replace(
      `/platform/organizations/${encodeURIComponent(
        tenantId,
      )}?tab=${tab}`,
      {
        scroll: false,
      },
    );
  }

  async function changeStatus(
    status: PlatformTenantStatus,
  ) {
    if (
      statusReason.trim().length < 4
    ) {
      setActionMessage(
        "Enter a clear reason before changing tenant status.",
      );
      return;
    }

    /*
     * The status change is written to the database, so success can only be
     * reported once the server has accepted it.
     */
    try {
      await setTenantStatus(
        tenantId,
        status,
        statusReason,
      );
      setStatusReason("");
      setActionMessage(
        `Tenant status changed to ${status}.`,
      );
    } catch (caught) {
      setActionMessage(
        caught instanceof Error
          ? caught.message
          : "The tenant status could not be changed.",
      );
    }
  }

  async function deleteTenant() {
    if (!tenant) return;

    if (
      deleteConfirmation !== tenant.organizationName ||
      deleteReason.trim().length < 8
    ) {
      setActionMessage(
        "Type the organization name exactly and enter a clear reason before archiving this tenant.",
      );
      return;
    }

    setDeletingTenant(true);
    setActionMessage(undefined);
    try {
      const response = await fetch(
        `/api/v1/platform/organizations/${encodeURIComponent(tenant.backendTenantId ?? tenant.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmation: deleteConfirmation,
            reason: deleteReason.trim(),
          }),
        },
      );
      const body = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? body.error ?? "The tenant could not be archived.");
      }

      // The DELETE above already archived the tenant; just re-project.
      await reload();
      router.push("/platform/organizations");
      router.refresh();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "The tenant could not be archived.");
    } finally {
      setDeletingTenant(false);
    }
  }

  async function saveTenantSubscription(subscription: PlatformTenantSubscription) {
    if (!tenant) return;
    try {
      const response = await fetch(`/api/v1/platform/organizations/${encodeURIComponent(tenant.backendTenantId ?? tenant.id)}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: tenant.slug,
          tenantDisplayName: tenant.organizationName,
          planCode: subscription.plan,
          status: subscription.billingStatus.replace("-", "_").toUpperCase(),
          monthlyAmountMinor: subscription.monthlyAmountMinor,
          seatCount: subscription.seatCount,
          currencyCode: subscription.currencyCode,
          trialEndsAt: subscription.trialEndsAt,
          renewsAt: subscription.renewsAt,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The subscription could not be saved.");
      // The write above is the single source of truth; re-project rather
      // than mirroring the change into local state a second time.
      await reload();
      setActionMessage("Subscription configuration saved to the database.");
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "The subscription could not be saved.");
    }
  }

  async function saveTenantEntitlement(moduleCode: string, enabled: boolean) {
    if (!tenant) return;
    try {
      const response = await fetch(`/api/v1/platform/organizations/${encodeURIComponent(tenant.backendTenantId ?? tenant.id)}/entitlements/${encodeURIComponent(moduleCode)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, tenantSlug: tenant.slug, tenantDisplayName: tenant.organizationName }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The entitlement could not be saved.");
      await reload();
      setActionMessage("Entitlement saved to the database.");
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "The entitlement could not be saved.");
    }
  }

  const tenantAuditEvents =
    workspace.auditEvents.filter(
      (event) =>
        event.organizationId === tenant.id,
    );

  return (
    <div
      className="space-y-4 overflow-x-clip"
      id="main-content"
    >
      <Link
        className="inline-flex min-h-9 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-slate-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        href="/platform/organizations"
      >
        <ChevronLeft
          aria-hidden="true"
          size={17}
        />
        Tenant directory
      </Link>

      <section className="overflow-hidden rounded-[26px] border border-violet-200/70 bg-white shadow-[0_20px_65px_rgba(79,70,229,0.12)]">
        <div className="relative isolate overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 px-5 py-4 text-white sm:px-6 sm:py-5">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 h-64 w-64 rounded-full bg-fuchsia-400/25 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <TenantLogo
                logoDataUrl={tenant.logoDataUrl}
                name={tenant.organizationName}
                size="md"
              />

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                  Tenant details
                </p>

                <h1 className="mt-1 truncate text-2xl font-bold tracking-[-0.035em] text-white sm:text-[28px]">
                  {tenant.organizationName}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-indigo-100">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
                    {tenant.domain ||
                      "No domain configured"}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
                    {tenant.slug}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PlatformStatusBadge
                status={tenant.status}
              />

              <button
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25"
                onClick={() =>
                  setEditingProfile(
                    (current) => !current,
                  )
                }
                type="button"
              >
                {editingProfile
                  ? "Close editor"
                  : "Edit tenant"}
              </button>
            </div>
          </div>
        </div>

        <nav
          aria-label="Tenant detail sections"
          className="overflow-x-auto border-t border-white/10 bg-slate-950 px-2"
        >
          <div className="flex min-w-[680px] lg:grid lg:min-w-0 lg:grid-cols-7">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected =
                activeTab === tab.value;

              return (
                <button
                  aria-current={
                    selected
                      ? "page"
                      : undefined
                  }
                  className={[
                    "inline-flex min-h-12 items-center justify-center gap-2 border-b-2 px-3 text-xs font-semibold transition",
                    selected
                      ? "border-violet-400 text-white"
                      : "border-transparent text-slate-400 hover:text-white",
                  ].join(" ")}
                  key={tab.value}
                  onClick={() =>
                    changeTab(tab.value)
                  }
                  type="button"
                >
                  <Icon
                    aria-hidden="true"
                    size={16}
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </section>

      {actionMessage ? (
        <div
          className="flex min-h-11 items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800"
          role="status"
        >
          {actionMessage}
        </div>
      ) : null}

      {editingProfile ? (
        <TenantProfileEditor
          onCancel={() =>
            setEditingProfile(false)
          }
          onSave={(input) => {
            updateTenantProfile(
              tenant.id,
              input,
            );
            setEditingProfile(false);
            setActionMessage(
              "Tenant organization details saved.",
            );
          }}
          tenant={tenant}
        />
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-4">
          <TenantActivationPanel
            onActivated={(input) => {
              applyTenantActivation(tenant.id, input);
              setActionMessage("Tenant, subscription and owner access activated in the database.");
            }}
            tenant={tenant}
          />
          <TenantOverview tenant={tenant} />
        </div>
      ) : null}

      {activeTab === "branches" ? (
        <TenantBranches
          onAdd={(input) =>
            addBranch(tenant.id, input)
          }
          tenant={tenant}
        />
      ) : null}

      {activeTab === "users" ? (
        <TenantUsers
          onAdd={(input) =>
            addTenantUser(
              tenant.id,
              input,
            )
          }
          tenant={tenant}
        />
      ) : null}

      {activeTab === "subscription" ? (
        <TenantSubscription
          onSave={saveTenantSubscription}
          tenant={tenant}
        />
      ) : null}

      {activeTab === "entitlements" ? (
        <TenantEntitlements
          onChange={saveTenantEntitlement}
          tenant={tenant}
        />
      ) : null}

      {activeTab === "settings" ? (
        <TenantSettings
          onSave={(settings) => {
            updateTenantSettings(
              tenant.id,
              settings,
            );
            setActionMessage(
              "Tenant settings saved.",
            );
          }}
          tenant={tenant}
        />
      ) : null}

      {activeTab === "activity" ? (
        <TenantActivity
          events={tenantAuditEvents}
        />
      ) : null}

      {activeTab === "settings" ? (
      <PlatformPanel
        className="border-red-200"
        description="Status and deletion actions require an explicit reason or typed confirmation."
        title="Tenant controls"
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <section>
            <h3 className="text-sm font-semibold text-slate-950">
              Lifecycle status
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Suspending a tenant is recorded as a critical platform event.
            </p>

            <textarea
              className={`${platformTextareaClassName} mt-4`}
              onChange={(event) =>
                setStatusReason(
                  event.target.value,
                )
              }
              placeholder="Reason for status change"
              value={statusReason}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {tenant.status !== "active" ? (
                <PlatformPrimaryButton
                  onClick={() => changeTab("overview")}
                  type="button"
                >
                  Open secure activation
                </PlatformPrimaryButton>
              ) : null}

              {tenant.status !== "suspended" ? (
                <PlatformDangerButton
                  onClick={() =>
                    changeStatus("suspended")
                  }
                  type="button"
                >
                  <ShieldAlert
                    aria-hidden="true"
                    size={17}
                  />
                  Suspend tenant
                </PlatformDangerButton>
              ) : null}

              {tenant.status !== "draft" ? (
                <PlatformSecondaryButton
                  onClick={() =>
                    changeStatus("draft")
                  }
                  type="button"
                >
                  Return to draft
                </PlatformSecondaryButton>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
            <h3 className="text-sm font-semibold text-red-950">
              Archive tenant safely
            </h3>

            <p className="mt-1 text-xs leading-5 text-red-800">
              Type{" "}
              <strong>
                {tenant.organizationName}
              </strong>{" "}
              exactly. Live access and billing are disabled, while clinical history and audit records are retained.
            </p>

            <textarea
              className={`${platformTextareaClassName} mt-4 border-red-200 focus:border-red-600 focus:ring-red-100`}
              onChange={(event) => setDeleteReason(event.target.value)}
              placeholder="Reason for archiving this tenant"
              value={deleteReason}
            />

            <input
              className={`${platformInputClassName} mt-4 border-red-200 focus:border-red-600 focus:ring-red-100`}
              onChange={(event) =>
                setDeleteConfirmation(
                  event.target.value,
                )
              }
              placeholder={tenant.organizationName}
              value={deleteConfirmation}
            />

            <PlatformDangerButton
              className="mt-3"
              disabled={
                deletingTenant ||
                deleteReason.trim().length < 8 ||
                deleteConfirmation !==
                tenant.organizationName
              }
              onClick={() => void deleteTenant()}
              type="button"
            >
              <Trash2
                aria-hidden="true"
                size={17}
              />
              {deletingTenant ? "Archivingâ€¦" : "Archive tenant"}
            </PlatformDangerButton>
          </section>
        </div>
      </PlatformPanel>
      ) : null}
    </div>
  );
}

function TenantActivationPanel({
  tenant,
  onActivated,
}: {
  tenant: PlatformTenantRecord;
  onActivated: (input: ApplyPlatformTenantActivationInput) => void;
}) {
  const defaultPlan = tenant.subscription.plan === "unconfigured" ? "professional" : tenant.subscription.plan;
  const defaultBillingStatus = tenant.subscription.billingStatus === "trial" ? "trial" : "active";
  const [ownerName, setOwnerName] = useState(tenant.primaryContactName);
  const [ownerEmail, setOwnerEmail] = useState(tenant.primaryContactEmail);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [plan, setPlan] = useState<PlatformTenantSubscription["plan"]>(defaultPlan);
  const [billingStatus, setBillingStatus] = useState<"trial" | "active">(defaultBillingStatus);
  const [seatCount, setSeatCount] = useState(String(Math.max(1, tenant.subscription.seatCount)));
  const [monthlyAmount, setMonthlyAmount] = useState(String(tenant.subscription.monthlyAmountMinor / 100));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [credentials, setCredentials] = useState<{ email: string; password: string; loginUrl: string }>();
  const [copied, setCopied] = useState<string>();

  // Once billing has been configured on the Subscription tab, that tab owns
  // seat count and monthly amount; they are read-only here.
  const subscriptionConfigured = Boolean(tenant.subscription.configuredAt);

  const emailSubject = `Your ${tenant.organizationName} WonFlow administrator account`;
  const handoffMessage = credentials
    ? [
      `Hello ${ownerName.trim() || "there"},`,
      "",
      `Your WonFlow administrator account for ${tenant.organizationName} is ready.`,
      "",
      `Sign in:            ${credentials.loginUrl}`,
      `Username (email):   ${credentials.email}`,
      `Temporary password: ${credentials.password}`,
      "",
      "Please sign in and change this password immediately. The temporary password above",
      "is not recoverable, so keep this message until you have replaced it.",
      "",
      "From your administrator workspace you can add branches and departments, invite",
      "your clinical and reception staff, and configure services and pricing.",
      "",
      "WonFlow Platform",
    ].join("\n")
    : "";
  const mailtoHref = credentials
    ? `mailto:${encodeURIComponent(credentials.email)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(handoffMessage)}`
    : "#";

  async function copyCredential(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setCredentials(undefined);
    if (ownerName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(ownerEmail)) {
      setError("Enter the tenant owner’s name and a valid email address.");
      return;
    }
    if (temporaryPassword.length < 12 || !/[A-Z]/.test(temporaryPassword) || !/[a-z]/.test(temporaryPassword) || !/[0-9]/.test(temporaryPassword)) {
      setError("The temporary password needs 12 characters with uppercase, lowercase and a number.");
      return;
    }
    if (temporaryPassword !== confirmation) {
      setError("The temporary passwords do not match.");
      return;
    }
    // The Subscription tab is the source of truth once billing is configured.
    const normalizedSeats = subscriptionConfigured
      ? tenant.subscription.seatCount
      : Math.max(1, Math.floor(Number(seatCount) || 1));
    const monthlyAmountMinor = subscriptionConfigured
      ? tenant.subscription.monthlyAmountMinor
      : Math.max(0, Math.round((Number(monthlyAmount) || 0) * 100));
    const subscription: PlatformTenantSubscription = {
      ...tenant.subscription,
      plan,
      billingStatus,
      currencyCode: tenant.subscription.currencyCode || tenant.settings.currencyCode || "PKR",
      seatCount: normalizedSeats,
      monthlyAmountMinor,
    };

    setBusy(true);
    try {
      const response = await fetch(`/api/v1/platform/organizations/${encodeURIComponent(tenant.backendTenantId ?? tenant.id)}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: tenant.slug,
          tenantDisplayName: tenant.organizationName,
          legalName: tenant.legalName,
          domain: tenant.domain,
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim(),
          temporaryPassword,
          primaryBranchName: tenant.settings.defaultBranchName,
          subscription: {
            planCode: plan,
            status: billingStatus.toUpperCase(),
            currencyCode: subscription.currencyCode,
            monthlyAmountMinor,
            seatCount: normalizedSeats,
            trialEndsAt: subscription.trialEndsAt,
            renewsAt: subscription.renewsAt,
          },
          entitlements: Object.entries(tenant.entitlements).map(([moduleCode, enabled]) => ({ moduleCode, enabled })),
        }),
      });
      const body = await response.json().catch(() => ({})) as {
        error?: string;
        activation?: { tenant: { id: string }; owner: { email: string }; loginPath: string };
      };
      if (!response.ok || !body.activation) throw new Error(body.error ?? "Tenant activation could not be completed.");
      onActivated({
        backendTenantId: body.activation.tenant.id,
        ownerName: ownerName.trim(),
        ownerEmail: body.activation.owner.email,
        subscription,
      });
      setCredentials({
        email: body.activation.owner.email,
        password: temporaryPassword,
        loginUrl: `${window.location.origin}${body.activation.loginPath}`,
      });
      setTemporaryPassword("");
      setConfirmation("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tenant activation could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PlatformPanel
      className={tenant.status === "active" ? "border-emerald-200" : "border-blue-200"}
      description={tenant.status === "active"
        ? "Reset the owner’s temporary password or confirm the tenant’s access configuration."
        : "Create the tenant owner account, activate billing and open the hospital administration workspace in one secure step."}
      title="Owner access and activation"
    >
      {credentials ? (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-700" size={21} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-emerald-950">Tenant access is ready</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">Copy these credentials now. The temporary password is not stored or returned by the backend, and the owner must replace it on first sign-in.</p>
              <div className="mt-3 grid gap-2 lg:grid-cols-3">
                {[
                  ["Email", credentials.email],
                  ["Temporary password", credentials.password],
                  ["Login", credentials.loginUrl],
                ].map(([label, value]) => (
                  <button className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-left" key={label} onClick={() => void copyCredential(label!, value!)} type="button">
                    <span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wide text-emerald-700">{label}</span><span className="block truncate text-xs font-semibold text-slate-900">{value}</span></span>
                    {copied === label ? <CheckCircle2 aria-hidden="true" className="shrink-0 text-emerald-700" size={16} /> : <Copy aria-hidden="true" className="shrink-0 text-slate-400" size={16} />}
                  </button>
                ))}
              </div>

              <div className="mt-4 border-t border-emerald-200 pt-3">
                <p className="text-xs font-bold text-emerald-950">Send these to the owner</p>
                <textarea
                  aria-label="Welcome message to send to the tenant owner"
                  className="mt-2 h-40 w-full resize-y rounded-xl border border-emerald-200 bg-white px-3 py-2 font-mono text-[11px] leading-5 text-slate-800"
                  onFocus={(event) => event.currentTarget.select()}
                  readOnly
                  value={handoffMessage}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white transition hover:bg-emerald-800"
                    onClick={() => void copyCredential("Message", handoffMessage)}
                    type="button"
                  >
                    {copied === "Message" ? <CheckCircle2 aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
                    {copied === "Message" ? "Copied" : "Copy full message"}
                  </button>
                  <a
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
                    href={mailtoHref}
                  >
                    <Mail aria-hidden="true" size={14} />
                    Email {credentials.email}
                  </a>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-emerald-800">
                  &ldquo;Copy full message&rdquo; puts the whole welcome note on your clipboard for WhatsApp, Teams or any other channel. &ldquo;Email&rdquo; opens your mail client addressed to the owner with the message prefilled.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={activate}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InputField label="Owner name" onChange={setOwnerName} required value={ownerName} />
          <InputField label="Owner email" onChange={setOwnerEmail} required type="email" value={ownerEmail} />
          <SelectField
            label="Subscription plan"
            onChange={(value) => setPlan(value as PlatformTenantSubscription["plan"])}
            options={[["starter", "Starter"], ["professional", "Professional"], ["enterprise", "Enterprise"]]}
            value={plan}
          />
          <SelectField
            label="Billing status"
            onChange={(value) => setBillingStatus(value as "trial" | "active")}
            options={[["trial", "Trial"], ["active", "Active"]]}
            value={billingStatus}
          />
          {subscriptionConfigured ? (
            <>
              <ReadOnlyField
                hint="Set on the Subscription tab"
                label="Seat count"
                value={String(tenant.subscription.seatCount)}
              />
              <ReadOnlyField
                hint="Set on the Subscription tab"
                label={`Monthly amount (${tenant.subscription.currencyCode || "PKR"})`}
                value={new Intl.NumberFormat("en-PK").format(tenant.subscription.monthlyAmountMinor / 100)}
              />
            </>
          ) : (
            <>
              <InputField label="Seat count" onChange={setSeatCount} required type="number" value={seatCount} />
              <InputField label={`Monthly amount (${tenant.subscription.currencyCode || "PKR"})`} onChange={setMonthlyAmount} required type="number" value={monthlyAmount} />
            </>
          )}
          <label>
            <span className="text-sm font-semibold text-slate-700">Temporary password</span>
            <span className="relative mt-1.5 block">
              <input autoComplete="new-password" className={`${platformInputClassName} pr-11`} onChange={(event) => setTemporaryPassword(event.target.value)} required type={showPassword ? "text" : "password"} value={temporaryPassword} />
              <button aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setShowPassword((current) => !current)} type="button">
                {showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
              </button>
            </span>
          </label>
          <InputField label="Confirm temporary password" onChange={setConfirmation} required type={showPassword ? "text" : "password"} value={confirmation} />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-blue-900 sm:flex-row sm:items-center sm:justify-between">
          <span>Password: 12+ characters, uppercase, lowercase and number. The owner is assigned the ADMIN workspace and must change this password immediately.</span>
          <span className="shrink-0 font-semibold">{Object.values(tenant.entitlements).filter(Boolean).length} entitlements included</span>
        </div>
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
        <div className="flex justify-end">
          <PlatformPrimaryButton className="min-w-64" disabled={busy} type="submit">
            <Rocket aria-hidden="true" size={17} />
            {busy ? "Activating tenant…" : tenant.status === "active" ? "Update owner access" : "Activate tenant and subscription"}
          </PlatformPrimaryButton>
        </div>
      </form>
    </PlatformPanel>
  );
}

function TenantOverview({
  tenant,
}: {
  tenant: PlatformTenantRecord;
}) {
  const enabledEntitlements =
    Object.values(
      tenant.entitlements,
    ).filter(Boolean).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(380px,0.7fr)]">
      <PlatformPanel
        description="Organization information remains blank until supplied."
        title="Organization overview"
      >
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Detail
            label="Legal name"
            value={tenant.legalName}
          />
          <Detail
            label="Tenant slug"
            value={tenant.slug}
          />
          <Detail
            label="Domain"
            value={tenant.domain}
          />
          <Detail
            label="Primary contact"
            value={tenant.primaryContactName}
          />
          <Detail
            label="Contact email"
            value={tenant.primaryContactEmail}
          />
          <Detail
            label="Contact phone"
            value={tenant.primaryContactPhone}
          />
          <Detail
            label="Created"
            value={formatDateTime(
              tenant.createdAt,
            )}
          />
          <Detail
            label="Last updated"
            value={formatDateTime(
              tenant.updatedAt,
            )}
          />
        </dl>
      </PlatformPanel>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          description="No branch is created automatically."
          label="Branches"
          value={tenant.branches.length}
        />
        <SummaryCard
          description="Users appear after manual invitation entry."
          label="Users"
          value={tenant.users.length}
        />
        <SummaryCard
          description="The billing plan remains empty until configured."
          label="Subscription"
          value={
            tenant.subscription.plan ===
            "unconfigured"
              ? "—"
              : tenant.subscription.plan
          }
        />
        <SummaryCard
          description="All modules begin disabled."
          label="Enabled entitlements"
          value={enabledEntitlements}
        />
      </div>
    </div>
  );
}

function TenantProfileEditor({
  tenant,
  onSave,
  onCancel,
}: {
  tenant: PlatformTenantRecord;
  onSave: (
    input: UpdatePlatformTenantProfileInput,
  ) => void;
  onCancel: () => void;
}) {
  const [form, setForm] =
    useState<UpdatePlatformTenantProfileInput>({
      organizationName:
        tenant.organizationName,
      slug: tenant.slug,
      domain: tenant.domain,
      legalName: tenant.legalName,
      primaryContactName:
        tenant.primaryContactName,
      primaryContactEmail:
        tenant.primaryContactEmail,
      primaryContactPhone:
        tenant.primaryContactPhone,
      logoDataUrl: tenant.logoDataUrl,
    });
  const [error, setError] =
    useState<string>();

  function update(
    field:
      keyof UpdatePlatformTenantProfileInput,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setError(undefined);
  }

  function readLogo(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (file === undefined) {
      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      setError(
        "Choose a supported image file.",
      );
      return;
    }

    if (file.size > 1_000_000) {
      setError(
        "Choose a logo smaller than 1 MB.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        setForm((current) => ({
          ...current,
          logoDataUrl: result,
        }));
      }
    };
    reader.readAsDataURL(file);
  }

  function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      form.organizationName.trim().length < 2 ||
      form.slug.trim().length < 2
    ) {
      setError(
        "Organization name and tenant slug are required.",
      );
      return;
    }

    if (
      form.primaryContactEmail !== "" &&
      !/^\S+@\S+\.\S+$/.test(
        form.primaryContactEmail,
      )
    ) {
      setError(
        "Enter a valid contact email or leave it empty.",
      );
      return;
    }

    onSave(form);
  }

  return (
    <PlatformPanel
      description="Update identity, contact details and the uploaded hospital logo."
      title="Edit tenant"
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={submit}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <TenantLogo
            logoDataUrl={form.logoDataUrl}
            name={form.organizationName}
            size="lg"
          />

          <div>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-800 transition hover:bg-violet-100">
              <ImagePlus
                aria-hidden="true"
                size={17}
              />
              Upload hospital logo
              <input
                accept="image/*"
                className="sr-only"
                onChange={readLogo}
                type="file"
              />
            </label>

            {form.logoDataUrl ? (
              <button
                className="ml-2 min-h-11 rounded-xl px-3 text-sm font-semibold text-red-700"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    logoDataUrl: undefined,
                  }))
                }
                type="button"
              >
                Remove
              </button>
            ) : null}

            <p className="mt-2 text-xs text-slate-500">
              PNG, JPG, SVG or WebP. Maximum 1 MB.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InputField
            label="Organization name"
            onChange={(value) =>
              update(
                "organizationName",
                value,
              )
            }
            required
            value={form.organizationName}
          />
          <InputField
            label="Tenant slug"
            onChange={(value) =>
              update("slug", value)
            }
            required
            value={form.slug}
          />
          <InputField
            label="Legal name"
            onChange={(value) =>
              update("legalName", value)
            }
            value={form.legalName}
          />
          <InputField
            label="Domain"
            onChange={(value) =>
              update("domain", value)
            }
            value={form.domain}
          />
          <InputField
            label="Primary contact"
            onChange={(value) =>
              update(
                "primaryContactName",
                value,
              )
            }
            value={form.primaryContactName}
          />
          <InputField
            label="Contact email"
            onChange={(value) =>
              update(
                "primaryContactEmail",
                value,
              )
            }
            type="email"
            value={form.primaryContactEmail}
          />
          <InputField
            label="Contact phone"
            onChange={(value) =>
              update(
                "primaryContactPhone",
                value,
              )
            }
            type="tel"
            value={form.primaryContactPhone}
          />
        </div>

        {error ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <PlatformSecondaryButton
            onClick={onCancel}
            type="button"
          >
            Cancel
          </PlatformSecondaryButton>
          <PlatformPrimaryButton type="submit">
            <Save
              aria-hidden="true"
              size={17}
            />
            Save changes
          </PlatformPrimaryButton>
        </div>
      </form>
    </PlatformPanel>
  );
}

function TenantBranches({
  tenant,
  onAdd,
}: {
  tenant: PlatformTenantRecord;
  onAdd: (
    input: CreatePlatformBranchInput,
  ) => void;
}) {
  const [form, setForm] =
    useState<CreatePlatformBranchInput>({
      name: "",
      code: "",
      city: "",
    });
  const [error, setError] =
    useState<string>();

  function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      setError(
        "Enter the branch name.",
      );
      return;
    }

    onAdd(form);
    setForm({
      name: "",
      code: "",
      city: "",
    });
    setError(undefined);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <PlatformPanel
        description="No branch is created automatically when a tenant is added."
        title="Branches"
      >
        {tenant.branches.length === 0 ? (
          <PlatformEmptyState
            description="Add the real hospital branch information when it is available."
            icon={
              <MapPin
                aria-hidden="true"
                size={24}
              />
            }
            title="No branches configured"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tenant.branches.map(
              (branch) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                  key={branch.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">
                        {branch.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {branch.code || "No code"}
                        {" · "}
                        {branch.city || "No city"}
                      </p>
                    </div>
                    <PlatformStatusBadge
                      status={branch.status}
                    />
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </PlatformPanel>

      <PlatformPanel
        description="Create only a real branch record."
        title="Add branch"
      >
        <form
          className="space-y-4"
          noValidate
          onSubmit={submit}
        >
          <InputField
            label="Branch name"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                name: value,
              }))
            }
            required
            value={form.name}
          />
          <InputField
            label="Branch code"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                code: value,
              }))
            }
            value={form.code}
          />
          <InputField
            label="City"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                city: value,
              }))
            }
            value={form.city}
          />

          {error ? (
            <p className="text-xs font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <PlatformPrimaryButton
            className="w-full"
            type="submit"
          >
            Add branch
          </PlatformPrimaryButton>
        </form>
      </PlatformPanel>
    </div>
  );
}

function TenantUsers({
  tenant,
  onAdd,
}: {
  tenant: PlatformTenantRecord;
  onAdd: (
    input: CreatePlatformTenantUserInput,
  ) => void;
}) {
  const [form, setForm] =
    useState<CreatePlatformTenantUserInput>({
      displayName: "",
      email: "",
      role: "",
    });
  const [error, setError] =
    useState<string>();

  function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      form.displayName.trim().length < 2 ||
      !/^\S+@\S+\.\S+$/.test(
        form.email,
      ) ||
      form.role.trim().length < 2
    ) {
      setError(
        "Enter a name, valid email and role.",
      );
      return;
    }

    onAdd(form);
    setForm({
      displayName: "",
      email: "",
      role: "",
    });
    setError(undefined);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <PlatformPanel
        description="Profile photos are optional; initials use the approved circular violet outline."
        title="Tenant users"
      >
        {tenant.users.length === 0 ? (
          <PlatformEmptyState
            description="Users appear only after their real details are entered."
            icon={
              <Users
                aria-hidden="true"
                size={24}
              />
            }
            title="No tenant users"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {tenant.users.map((user) => (
              <article
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                key={user.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    displayName={
                      user.displayName
                    }
                    photoDataUrl={
                      user.photoDataUrl
                    }
                  />

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-950">
                      {user.displayName}
                    </h3>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {user.email}
                      {" · "}
                      {user.role}
                    </p>
                  </div>
                </div>

                <PlatformStatusBadge
                  status={user.status}
                />
              </article>
            ))}
          </div>
        )}
      </PlatformPanel>

      <PlatformPanel
        description="This creates an invitation record only; authentication delivery is a backend integration."
        title="Add user"
      >
        <form
          className="space-y-4"
          noValidate
          onSubmit={submit}
        >
          <InputField
            label="Display name"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                displayName: value,
              }))
            }
            required
            value={form.displayName}
          />
          <InputField
            label="Email"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                email: value,
              }))
            }
            required
            type="email"
            value={form.email}
          />
          <InputField
            label="Role"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                role: value,
              }))
            }
            required
            value={form.role}
          />

          {error ? (
            <p className="text-xs font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <PlatformPrimaryButton
            className="w-full"
            type="submit"
          >
            <UserPlus
              aria-hidden="true"
              size={17}
            />
            Add user
          </PlatformPrimaryButton>
        </form>
      </PlatformPanel>
    </div>
  );
}

function TenantSubscription({
  tenant,
  onSave,
}: {
  tenant: PlatformTenantRecord;
  onSave: (
    subscription:
      PlatformTenantSubscription,
  ) => void;
}) {
  const [form, setForm] =
    useState<PlatformTenantSubscription>(
      tenant.subscription,
    );
  const [syncedSubscription, setSyncedSubscription] =
    useState(tenant.subscription);

  if (syncedSubscription !== tenant.subscription) {
    setSyncedSubscription(tenant.subscription);
    setForm(tenant.subscription);
  }

  return (
    <PlatformPanel
      description="PKR is the approved default and remains configurable."
      title="Subscription configuration"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SelectField
            label="Plan"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                plan:
                  value as
                    PlatformTenantSubscription["plan"],
              }))
            }
            options={[
              ["unconfigured", "Not configured"],
              ["starter", "Starter"],
              ["professional", "Professional"],
              ["enterprise", "Enterprise"],
            ]}
            value={form.plan}
          />

          <SelectField
            label="Billing status"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                billingStatus:
                  value as
                    PlatformTenantSubscription["billingStatus"],
              }))
            }
            options={[
              ["unconfigured", "Not configured"],
              ["trial", "Trial"],
              ["active", "Active"],
              ["past-due", "Past due"],
              ["cancelled", "Cancelled"],
            ]}
            value={form.billingStatus}
          />

          <InputField
            label="Currency"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                currencyCode:
                  value.toUpperCase(),
              }))
            }
            value={form.currencyCode}
          />

          <NumberField
            label="Seat count"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                seatCount: value,
              }))
            }
            value={form.seatCount}
          />

          <NumberField
            label={`Monthly amount (${form.currencyCode || "PKR"})`}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                monthlyAmountMinor:
                  Math.round(value * 100),
              }))
            }
            step="0.01"
            value={
              form.monthlyAmountMinor / 100
            }
          />

          <InputField
            label="Trial end"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                trialEndsAt: value,
              }))
            }
            type="date"
            value={form.trialEndsAt}
          />

          <InputField
            label="Renewal date"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                renewsAt: value,
              }))
            }
            type="date"
            value={form.renewsAt}
          />
        </div>

        <div className="flex justify-end">
          <PlatformPrimaryButton type="submit">
            <Save
              aria-hidden="true"
              size={17}
            />
            Save subscription
          </PlatformPrimaryButton>
        </div>
      </form>
    </PlatformPanel>
  );
}

function TenantEntitlements({
  tenant,
  onChange,
}: {
  tenant: PlatformTenantRecord;
  onChange: (
    moduleCode: string,
    enabled: boolean,
  ) => void;
}) {
  const groups = useMemo(
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        All modules begin disabled. Enable a module only after the tenant’s plan and implementation scope are confirmed.
      </div>

      {groups.map(({ group, modules }) => (
        <PlatformPanel
          description={`${group} module entitlements for this tenant.`}
          key={group}
          title={group}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {modules.map((module) => {
              const enabled =
                tenant.entitlements[
                  module.code
                ] === true;

              return (
                <label
                  className={[
                    "flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition",
                    enabled
                      ? "border-violet-300 bg-violet-50"
                      : "border-slate-200 bg-white hover:border-violet-200",
                  ].join(" ")}
                  key={module.code}
                >
                  <input
                    checked={enabled}
                    className="mt-1 h-4 w-4 accent-violet-700"
                    onChange={(event) =>
                      onChange(
                        module.code,
                        event.target.checked,
                      )
                    }
                    type="checkbox"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-slate-950">
                      {module.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {module.description}
                    </span>
                    <span className="mt-2 block font-mono text-[10px] text-slate-400">
                      {module.code}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </PlatformPanel>
      ))}
    </div>
  );
}

function TenantSettings({
  tenant,
  onSave,
}: {
  tenant: PlatformTenantRecord;
  onSave: (
    settings: PlatformTenantSettings,
  ) => void;
}) {
  const [form, setForm] =
    useState<PlatformTenantSettings>(
      tenant.settings,
    );
  const [syncedSettings, setSyncedSettings] =
    useState(tenant.settings);

  if (syncedSettings !== tenant.settings) {
    setSyncedSettings(tenant.settings);
    setForm(tenant.settings);
  }

  return (
    <PlatformPanel
      description="Defaults may be changed for this tenant without hardcoding hospital-specific values."
      title="Tenant settings"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InputField
            label="Default branch label"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                defaultBranchName: value,
              }))
            }
            value={form.defaultBranchName}
          />
          <InputField
            label="Currency code"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                currencyCode:
                  value.toUpperCase(),
              }))
            }
            value={form.currencyCode}
          />
          <InputField
            label="Default locale"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                defaultLocale: value,
              }))
            }
            value={form.defaultLocale}
          />
          <InputField
            label="Secondary locale"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                secondaryLocale: value,
              }))
            }
            value={form.secondaryLocale}
          />
          <InputField
            label="Timezone"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                timezone: value,
              }))
            }
            value={form.timezone}
          />
        </div>

        <div className="flex justify-end">
          <PlatformPrimaryButton type="submit">
            <Save
              aria-hidden="true"
              size={17}
            />
            Save tenant settings
          </PlatformPrimaryButton>
        </div>
      </form>
    </PlatformPanel>
  );
}

function TenantActivity({
  events,
}: {
  events:
    readonly {
      id: string;
      action: string;
      description: string;
      severity: string;
      actorLabel: string;
      createdAt: string;
    }[];
}) {
  return (
    <PlatformPanel
      description="Append-only frontend activity generated by tenant configuration actions."
      title="Tenant activity"
    >
      {events.length === 0 ? (
        <PlatformEmptyState
          description="Activity will appear after this tenant is changed."
          icon={
            <Activity
              aria-hidden="true"
              size={24}
            />
          }
          title="No tenant activity"
        />
      ) : (
        <ol className="divide-y divide-slate-100">
          {events.map((event) => (
            <li
              className={[
                "py-4 first:pt-0 last:pb-0",
                event.severity ===
                "critical"
                  ? "rounded-xl bg-red-50 px-4"
                  : "",
              ].join(" ")}
              key={event.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-950">
                      {event.action}
                    </h3>
                    <PlatformStatusBadge
                      status={event.severity}
                    />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {event.description}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {event.actorLabel}
                  </p>
                </div>
                <time
                  className="text-[11px] text-slate-400"
                  dateTime={event.createdAt}
                >
                  {formatDateTime(
                    event.createdAt,
                  )}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </PlatformPanel>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "—"}
      </dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <article className="relative min-h-36 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-[26px] font-bold tracking-[-0.04em] text-slate-950">
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

/** A value owned by another screen, shown here for confirmation only. */
function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>
      <p className={`${platformInputClassName} mt-1.5 flex items-center bg-slate-50 font-semibold text-slate-700`}>
        {value}
      </p>
      <span className="mt-1 block text-[11px] font-medium text-slate-500">
        {hint}
      </span>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required ? (
          <span className="ml-1 text-red-700">
            *
          </span>
        ) : null}
      </span>
      <input
        className={`${platformInputClassName} mt-1.5`}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        className={`${platformInputClassName} mt-1.5`}
        min="0"
        onChange={(event) =>
          onChange(
            Math.max(
              0,
              Number(event.target.value) ||
                0,
            ),
          )
        }
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options:
    readonly (
      readonly [string, string]
    )[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        className={`${platformInputClassName} mt-1.5`}
        onChange={(event) =>
          onChange(event.target.value)
        }
        value={value}
      >
        {options.map(
          ([optionValue, optionLabel]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

function formatDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "en",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}
