"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Save,
} from "lucide-react";
import {
  useRef,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import {
  usePlatformAdministration,
} from "./platform-administration-context";
import type {
  PlatformTenantSubscription,
} from "./platform-administration-context";
import {
  PlatformEmptyState,
  PlatformLoadingState,
  PlatformPrimaryButton,
  PlatformStatusBadge,
  platformInputClassName,
} from "./platform-administration-ui";

export function PlatformSubscriptionsPanel() {
  const {
    ready,
    reload,
    workspace,
  } = usePlatformAdministration();

  const [tenantId, setTenantId] =
    useState("");
  const [form, setForm] =
    useState<PlatformTenantSubscription>();
  const [message, setMessage] =
    useState<string>();
  const [syncedSubscription, setSyncedSubscription] =
    useState<PlatformTenantSubscription>();
  const [seatCountInput, setSeatCountInput] = useState("");
  const [monthlyAmountInput, setMonthlyAmountInput] = useState("");
  const formRegionRef = useRef<HTMLDivElement>(null);
  const [activeControlIndex, setActiveControlIndex] = useState(-1);

  const selected =
    workspace.tenants.find(
      (record) => record.id === tenantId,
    ) ??
    workspace.tenants[0];

  if (
    selected !== undefined &&
    syncedSubscription !== selected.subscription
  ) {
    setSyncedSubscription(selected.subscription);
    setForm(selected.subscription);
    setSeatCountInput(String(selected.subscription.seatCount));
    setMonthlyAmountInput(String(selected.subscription.monthlyAmountMinor / 100));

    if (tenantId !== selected.id) {
      setTenantId(selected.id);
    }
  }

  const tenant = selected;

  if (!ready) {
    return (
      <PlatformLoadingState label="Loading subscriptions…" />
    );
  }

  if (
    workspace.tenants.length === 0 ||
    tenant === undefined ||
    form === undefined
  ) {
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
        description="No subscription data exists until a tenant is created and its real billing plan is entered."
        icon={
          <ReceiptText
            aria-hidden="true"
            size={24}
          />
        }
        title="No subscriptions configured"
      />
    );
  }

  function selectTenant(
    nextTenantId: string,
  ) {
    const nextTenant =
      workspace.tenants.find(
        (record) =>
          record.id === nextTenantId,
      );

    setTenantId(nextTenantId);
    setForm(nextTenant?.subscription);
    setMessage(undefined);
  }

  async function save() {
    if (form === undefined) {
      return;
    }

    const seatCount = Math.max(0, Number(seatCountInput) || 0);
    const monthlyAmountMinor = Math.max(0, Math.round((Number(monthlyAmountInput) || 0) * 100));
    const normalizedForm = { ...form, seatCount, monthlyAmountMinor };

    try {
      const response = await fetch(`/api/v1/platform/organizations/${encodeURIComponent(tenant.backendTenantId ?? tenant.id)}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: tenant.slug,
          tenantDisplayName: tenant.organizationName,
          planCode: normalizedForm.plan,
          status: normalizedForm.billingStatus.replace("-", "_").toUpperCase(),
          monthlyAmountMinor,
          seatCount,
          currencyCode: normalizedForm.currencyCode,
          trialEndsAt: normalizedForm.trialEndsAt,
          renewsAt: normalizedForm.renewsAt,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The subscription could not be saved.");
      // The PUT above is the write; re-project instead of mirroring it.
      await reload();
      setForm(normalizedForm);
      setSeatCountInput(String(seatCount));
      setMonthlyAmountInput(String(monthlyAmountMinor / 100));
      setMessage("Subscription configuration saved to the database.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The subscription could not be saved.");
    }
  }

  function controls(): HTMLElement[] {
    return Array.from(
      formRegionRef.current?.querySelectorAll<HTMLElement>("[data-subscription-control]") ?? [],
    );
  }

  function moveFocus(direction: 1 | -1): void {
    const items = controls();
    if (items.length === 0) return;
    const current = items.findIndex((item) => item === document.activeElement);
    const next = Math.min(items.length - 1, Math.max(0, (current < 0 ? (direction === 1 ? -1 : items.length) : current) + direction));
    items[next]?.focus();
    setActiveControlIndex(next);
  }

  function handleKeyboard(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void save();
      return;
    }
    if (event.altKey && event.key === "ArrowRight") {
      event.preventDefault();
      moveFocus(1);
      return;
    }
    if (event.altKey && event.key === "ArrowLeft") {
      event.preventDefault();
      moveFocus(-1);
      return;
    }
    const target = event.target as HTMLElement;
    if (event.key === "Enter" && !event.shiftKey && target.matches("input, select")) {
      event.preventDefault();
      moveFocus(1);
    }
  }

  return (
    <div
      className="space-y-5"
      onFocusCapture={(event) => {
        const index = controls().findIndex((item) => item === event.target);
        if (index >= 0) setActiveControlIndex(index);
      }}
      onKeyDown={handleKeyboard}
      ref={formRegionRef}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs font-semibold text-blue-800">
        <span>Enter: next field · Alt + ←/→: move · Ctrl/⌘ + Enter: save</span>
        <span aria-live="polite">Field {Math.max(1, activeControlIndex + 1)} of 8</span>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label>
          <span className="text-sm font-semibold text-slate-700">
            Tenant organization
          </span>
          <select
            className={`${platformInputClassName} mt-1.5`}
            data-subscription-control
            onChange={(event) =>
              selectTenant(event.target.value)
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

        <PlatformStatusBadge
          status={form.billingStatus}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Plan">
          <select
            className={platformInputClassName}
            data-subscription-control
            onChange={(event) =>
              setForm((current) =>
                current === undefined
                  ? current
                  : {
                      ...current,
                      plan:
                        event.target
                          .value as
                          PlatformTenantSubscription["plan"],
                    },
              )
            }
            value={form.plan}
          >
            <option value="unconfigured">
              Not configured
            </option>
            <option value="starter">
              Starter
            </option>
            <option value="professional">
              Professional
            </option>
            <option value="enterprise">
              Enterprise
            </option>
          </select>
        </Field>

        <Field label="Billing status">
          <select
            className={platformInputClassName}
            data-subscription-control
            onChange={(event) =>
              setForm((current) =>
                current === undefined
                  ? current
                  : {
                      ...current,
                      billingStatus:
                        event.target
                          .value as
                          PlatformTenantSubscription["billingStatus"],
                    },
              )
            }
            value={form.billingStatus}
          >
            <option value="unconfigured">
              Not configured
            </option>
            <option value="trial">
              Trial
            </option>
            <option value="active">
              Active
            </option>
            <option value="past-due">
              Past due
            </option>
            <option value="cancelled">
              Cancelled
            </option>
          </select>
        </Field>

        <Field label="Currency">
          <input
            className={platformInputClassName}
            data-subscription-control
            onChange={(event) =>
              setForm((current) =>
                current === undefined
                  ? current
                  : {
                      ...current,
                      currencyCode:
                        event.target.value
                          .toUpperCase(),
                    },
              )
            }
            value={form.currencyCode}
          />
        </Field>

        <Field label="Seat count">
          <input
            className={platformInputClassName}
            data-subscription-control
            min="0"
            onBlur={() => {
              const value = Math.max(0, Number(seatCountInput) || 0);
              setSeatCountInput(String(value));
              setForm((current) => current === undefined ? current : { ...current, seatCount: value });
            }}
            onChange={(event) => {
              const value = event.target.value;
              setSeatCountInput(value);
              if (value !== "") {
                setForm((current) => current === undefined ? current : { ...current, seatCount: Math.max(0, Number(value) || 0) });
              }
            }}
            onFocus={(event) => {
              if (event.currentTarget.value === "0") event.currentTarget.select();
            }}
            type="number"
            value={seatCountInput}
          />
        </Field>

        <Field
          label={`Monthly amount (${form.currencyCode || "PKR"})`}
        >
          <input
            className={platformInputClassName}
            data-subscription-control
            min="0"
            onBlur={() => {
              const value = Math.max(0, Number(monthlyAmountInput) || 0);
              setMonthlyAmountInput(String(value));
              setForm((current) => current === undefined ? current : { ...current, monthlyAmountMinor: Math.round(value * 100) });
            }}
            onChange={(event) => {
              const value = event.target.value;
              setMonthlyAmountInput(value);
              if (value !== "") {
                setForm((current) => current === undefined ? current : { ...current, monthlyAmountMinor: Math.max(0, Math.round((Number(value) || 0) * 100)) });
              }
            }}
            onFocus={(event) => {
              if (event.currentTarget.value === "0") event.currentTarget.select();
            }}
            step="0.01"
            type="number"
            value={monthlyAmountInput}
          />
        </Field>

        <Field label="Trial end">
          <input
            className={platformInputClassName}
            data-subscription-control
            onChange={(event) =>
              setForm((current) =>
                current === undefined
                  ? current
                  : {
                      ...current,
                      trialEndsAt:
                        event.target.value,
                    },
              )
            }
            type="date"
            value={form.trialEndsAt}
          />
        </Field>

        <Field label="Renewal date">
          <input
            className={platformInputClassName}
            onChange={(event) =>
              setForm((current) =>
                current === undefined
                  ? current
                  : {
                      ...current,
                      renewsAt:
                        event.target.value,
                    },
              )
            }
            type="date"
            value={form.renewsAt}
          />
        </Field>
      </div>

      {message ? (
        <p
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          href={`/platform/organizations/${encodeURIComponent(
            tenant.id,
          )}?tab=subscription`}
        >
          Open tenant details
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={activeControlIndex <= 0}
            onClick={() => moveFocus(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={17} />
            Previous
          </button>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={activeControlIndex >= 7}
            onClick={() => moveFocus(1)}
            type="button"
          >
            Next
            <ChevronRight aria-hidden="true" size={17} />
          </button>
          <PlatformPrimaryButton
            onClick={save}
            type="button"
          >
            <Save
              aria-hidden="true"
              size={17}
            />
            Save subscription
          </PlatformPrimaryButton>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>
      <span className="mt-1.5 block">
        {children}
      </span>
    </label>
  );
}
