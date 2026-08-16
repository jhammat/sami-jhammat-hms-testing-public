"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Headphones,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import type {
  FormEvent,
} from "react";

import {
  usePlatformAdministration,
} from "./platform-administration-context";
import type {
  CreatePlatformSupportAccessInput,
  PlatformSupportAccessStatus,
} from "./platform-administration-context";
import {
  PlatformEmptyState,
  PlatformLoadingState,
  PlatformPanel,
  PlatformPrimaryButton,
  PlatformSecondaryButton,
  PlatformStatusBadge,
  UserAvatar,
  platformInputClassName,
  platformTextareaClassName,
} from "./platform-administration-ui";

const EMPTY_FORM:
  CreatePlatformSupportAccessInput = {
    organizationId: "",
    requestedBy: "",
    reason: "",
    expiresAt: "",
  };

export function PlatformSupportAccessPanel() {
  const {
    ready,
    workspace,
    createSupportAccess,
    setSupportAccessStatus,
  } = usePlatformAdministration();

  const [form, setForm] =
    useState<CreatePlatformSupportAccessInput>(
      EMPTY_FORM,
    );
  const [statusFilter, setStatusFilter] =
    useState<
      "all" | PlatformSupportAccessStatus
    >("all");
  const [error, setError] =
    useState<string>();
  const [message, setMessage] =
    useState<string>();

  const visibleRecords = useMemo(
    () =>
      workspace.supportAccess.filter(
        (record) =>
          statusFilter === "all" ||
          record.status === statusFilter,
      ),
    [
      statusFilter,
      workspace.supportAccess,
    ],
  );

  if (!ready) {
    return (
      <PlatformLoadingState label="Loading support access…" />
    );
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      form.organizationId === "" ||
      form.requestedBy.trim().length < 2 ||
      form.reason.trim().length < 8 ||
      form.expiresAt === ""
    ) {
      setError(
        "Select a tenant and enter the requester, reason and expiry.",
      );
      return;
    }

    if (
      new Date(form.expiresAt).getTime() <=
      Date.now()
    ) {
      setError(
        "Choose a future expiry time.",
      );
      return;
    }

    /*
     * The grant is written to the database, so the form may only be
     * cleared once the server has accepted it.
     */
    try {
      await createSupportAccess(form);
      setForm(EMPTY_FORM);
      setError(undefined);
      setMessage(
        "Support-access request created.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The support-access request could not be created.",
      );
    }
  }

  async function updateStatus(
    accessId: string,
    status: PlatformSupportAccessStatus,
    reason: string,
  ) {
    try {
      await setSupportAccessStatus(
        accessId,
        status,
        reason,
      );
      setMessage(
        `Support access marked ${status}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The support-access status could not be changed.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusSummary
          icon={
            <Clock3
              aria-hidden="true"
              size={19}
            />
          }
          label="Pending"
          value={
            workspace.supportAccess.filter(
              (record) =>
                record.status === "pending",
            ).length
          }
        />
        <StatusSummary
          icon={
            <CheckCircle2
              aria-hidden="true"
              size={19}
            />
          }
          label="Active"
          value={
            workspace.supportAccess.filter(
              (record) =>
                record.status === "active",
            ).length
          }
        />
        <StatusSummary
          icon={
            <XCircle
              aria-hidden="true"
              size={19}
            />
          }
          label="Revoked"
          value={
            workspace.supportAccess.filter(
              (record) =>
                record.status === "revoked",
            ).length
          }
        />
        <StatusSummary
          icon={
            <ShieldAlert
              aria-hidden="true"
              size={19}
            />
          }
          label="Expired"
          value={
            workspace.supportAccess.filter(
              (record) =>
                record.status === "expired",
            ).length
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <PlatformPanel
          actions={
            <select
              aria-label="Filter support access by status"
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as
                    typeof statusFilter,
                )
              }
              value={statusFilter}
            >
              <option value="all">
                All statuses
              </option>
              <option value="pending">
                Pending
              </option>
              <option value="active">
                Active
              </option>
              <option value="revoked">
                Revoked
              </option>
              <option value="expired">
                Expired
              </option>
            </select>
          }
          description="Temporary support access is explicit, time-limited and audited."
          title="Access requests"
        >
          {workspace.supportAccess.length === 0 ? (
            <PlatformEmptyState
              description="No access is granted automatically. Create a request only for a real support need."
              icon={
                <Headphones
                  aria-hidden="true"
                  size={24}
                />
              }
              title="No support-access requests"
            />
          ) : visibleRecords.length === 0 ? (
            <PlatformEmptyState
              description="No records match the selected status."
              title="No matching access records"
            />
          ) : (
            <div className="space-y-3">
              {visibleRecords.map(
                (record) => (
                  <article
                    className={[
                      "rounded-2xl border p-4",
                      record.status === "active"
                        ? "border-red-200 bg-red-50/45"
                        : "border-slate-200 bg-white",
                    ].join(" ")}
                    key={record.id}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <UserAvatar
                          displayName={
                            record.requestedBy
                          }
                        />

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-950">
                              {
                                record.organizationName
                              }
                            </h3>
                            <PlatformStatusBadge
                              status={
                                record.status
                              }
                            />
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            Requested by{" "}
                            {record.requestedBy}
                          </p>

                          <p className="mt-3 text-sm leading-6 text-slate-700">
                            {record.reason}
                          </p>

                          <p className="mt-2 text-[11px] text-slate-400">
                            Expires{" "}
                            {formatDateTime(
                              record.expiresAt,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {record.status ===
                        "pending" ? (
                          <PlatformPrimaryButton
                            onClick={() =>
                              updateStatus(
                                record.id,
                                "active",
                                "Approved from the platform console.",
                              )
                            }
                            type="button"
                          >
                            Approve
                          </PlatformPrimaryButton>
                        ) : null}

                        {record.status ===
                          "pending" ||
                        record.status ===
                          "active" ? (
                          <PlatformSecondaryButton
                            onClick={() => {
                              const reason = window.prompt("Reason for revoking this support access grant (required):")?.trim();
                              if (reason) updateStatus(record.id, "revoked", reason);
                            }}
                            type="button"
                          >
                            Revoke
                          </PlatformSecondaryButton>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </PlatformPanel>

        <PlatformPanel
          description="The request remains pending until explicitly approved."
          title="Request support access"
        >
          {workspace.tenants.length === 0 ? (
            <PlatformEmptyState
              action={
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white"
                  href="/platform/organizations/new"
                >
                  Add tenant
                </Link>
              }
              description="A tenant must exist before support access can be requested."
              title="No tenant available"
            />
          ) : (
            <form
              className="space-y-4"
              noValidate
              onSubmit={submit}
            >
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Tenant
                </span>
                <select
                  className={`${platformInputClassName} mt-1.5`}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      organizationId:
                        event.target.value,
                    }))
                  }
                  value={form.organizationId}
                >
                  <option value="">
                    Select tenant
                  </option>
                  {workspace.tenants.map(
                    (tenant) => (
                      <option
                        key={tenant.id}
                        value={tenant.id}
                      >
                        {
                          tenant.organizationName
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Requested by
                </span>
                <input
                  className={`${platformInputClassName} mt-1.5`}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      requestedBy:
                        event.target.value,
                    }))
                  }
                  value={form.requestedBy}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Reason
                </span>
                <textarea
                  className={`${platformTextareaClassName} mt-1.5`}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason:
                        event.target.value,
                    }))
                  }
                  placeholder="Describe the support task and required scope"
                  value={form.reason}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Expires at
                </span>
                <input
                  className={`${platformInputClassName} mt-1.5`}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expiresAt:
                        event.target.value,
                    }))
                  }
                  type="datetime-local"
                  value={form.expiresAt}
                />
              </label>

              {error ? (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              {message ? (
                <p
                  className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800"
                  role="status"
                >
                  {message}
                </p>
              ) : null}

              <PlatformPrimaryButton
                className="w-full"
                type="submit"
              >
                Create request
              </PlatformPrimaryButton>
            </form>
          )}
        </PlatformPanel>
      </div>
    </div>
  );
}

function StatusSummary({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
          {icon}
        </div>
      </div>
    </article>
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
