"use client";

import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Plus,
  SearchX,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import {
  PlatformEmptyState,
  PlatformLoadingState,
  PlatformPanel,
  PlatformSearchField,
  PlatformStatusBadge,
  TenantLogo,
} from "./platform-administration-ui";
import {
  usePlatformAdministration,
} from "./platform-administration-store";
import type {
  PlatformTenantStatus,
} from "./platform-administration-store";

type TenantStatusFilter =
  | "all"
  | PlatformTenantStatus;

export function PlatformTenantRegistry() {
  const {
    ready,
    loadError,
    reload,
    workspace,
  } = usePlatformAdministration();

  const [query, setQuery] =
    useState("");
  const [status, setStatus] =
    useState<TenantStatusFilter>("all");

  const visibleTenants = useMemo(() => {
    const normalizedQuery =
      query.trim().toLocaleLowerCase();

    return [...workspace.tenants]
      .filter((tenant) => {
        if (
          status !== "all" &&
          tenant.status !== status
        ) {
          return false;
        }

        if (normalizedQuery === "") {
          return true;
        }

        return [
          tenant.organizationName,
          tenant.legalName,
          tenant.slug,
          tenant.domain,
          tenant.primaryContactName,
          tenant.primaryContactEmail,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) =>
        left.organizationName.localeCompare(
          right.organizationName,
        ),
      );
  }, [
    query,
    status,
    workspace.tenants,
  ]);

  if (!ready) {
    return (
      <PlatformLoadingState label="Loading tenant organizations…" />
    );
  }

  /*
   * A failed read looks exactly like an empty platform, so it gets its own
   * state rather than the "add your first tenant" invitation.
   */
  if (loadError !== null) {
    return (
      <PlatformEmptyState
        action={
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            onClick={() => {
              void reload();
            }}
            type="button"
          >
            Try again
          </button>
        }
        description={loadError}
        icon={
          <SearchX
            aria-hidden="true"
            size={25}
          />
        }
        title="Tenant organizations could not be loaded"
      />
    );
  }

  if (workspace.tenants.length === 0) {
    return (
      <PlatformEmptyState
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            href="/platform/organizations/new"
          >
            <Plus
              aria-hidden="true"
              size={17}
            />
            Add first tenant
          </Link>
        }
        description="No organizations are preloaded. Add a tenant only when you have its real configuration details."
        icon={
          <Building2
            aria-hidden="true"
            size={25}
          />
        }
        title="No tenant organizations yet"
      />
    );
  }

  return (
    <PlatformPanel
      description={`${visibleTenants.length} of ${workspace.tenants.length} tenant organizations`}
      title="Tenant directory"
    >
      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <PlatformSearchField
          label="Search tenants"
          onChange={setQuery}
          placeholder="Search organization, slug, domain or contact"
          value={query}
        />

        <select
          aria-label="Filter tenants by status"
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          onChange={(event) =>
            setStatus(
              event.target
                .value as TenantStatusFilter,
            )
          }
          value={status}
        >
          <option value="all">
            All statuses
          </option>
          <option value="draft">
            Draft
          </option>
          <option value="active">
            Active
          </option>
          <option value="suspended">
            Suspended
          </option>
        </select>
      </div>

      {visibleTenants.length === 0 ? (
        <PlatformEmptyState
          description="Adjust the search text or status filter to see configured organizations."
          icon={
            <SearchX
              aria-hidden="true"
              size={24}
            />
          }
          title="No matching tenants"
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-3 py-3">
                    Organization
                  </th>
                  <th className="px-3 py-3">
                    Status
                  </th>
                  <th className="px-3 py-3">
                    Branches
                  </th>
                  <th className="px-3 py-3">
                    Users
                  </th>
                  <th className="px-3 py-3">
                    Subscription
                  </th>
                  <th className="px-3 py-3">
                    Updated
                  </th>
                  <th className="px-3 py-3 text-right">
                    Open
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleTenants.map(
                  (tenant) => (
                    <tr
                      className="border-b border-slate-100 last:border-0 hover:bg-blue-50/35"
                      key={tenant.id}
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <TenantLogo
                            logoDataUrl={
                              tenant.logoDataUrl
                            }
                            name={
                              tenant.organizationName
                            }
                            size="sm"
                          />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {
                                tenant.organizationName
                              }
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {tenant.domain ||
                                tenant.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <PlatformStatusBadge
                          status={tenant.status}
                        />
                      </td>

                      <td className="px-3 py-4 text-sm font-semibold text-slate-700">
                        {tenant.branches.length}
                      </td>

                      <td className="px-3 py-4 text-sm font-semibold text-slate-700">
                        {tenant.users.length}
                      </td>

                      <td className="px-3 py-4 text-sm text-slate-600">
                        {tenant.subscription
                          .plan ===
                        "unconfigured"
                          ? "—"
                          : tenant.subscription
                              .plan}
                      </td>

                      <td className="px-3 py-4 text-xs text-slate-500">
                        {new Intl.DateTimeFormat(
                          "en",
                          {
                            dateStyle: "medium",
                          },
                        ).format(
                          new Date(
                            tenant.updatedAt,
                          ),
                        )}
                      </td>

                      <td className="px-3 py-4 text-right">
                        <Link
                          aria-label={`Open ${tenant.organizationName}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                          href={`/platform/organizations/${encodeURIComponent(
                            tenant.id,
                          )}`}
                        >
                          <ChevronRight
                            aria-hidden="true"
                            size={18}
                          />
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {visibleTenants.map((tenant) => (
              <Link
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                href={`/platform/organizations/${encodeURIComponent(
                  tenant.id,
                )}`}
                key={tenant.id}
              >
                <div className="flex items-start gap-3">
                  <TenantLogo
                    logoDataUrl={
                      tenant.logoDataUrl
                    }
                    name={
                      tenant.organizationName
                    }
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-slate-950">
                        {tenant.organizationName}
                      </h3>

                      <PlatformStatusBadge
                        status={tenant.status}
                      />
                    </div>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {tenant.domain ||
                        tenant.slug}
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <Metric
                        label="Branches"
                        value={tenant.branches.length}
                      />
                      <Metric
                        label="Users"
                        value={tenant.users.length}
                      />
                      <Metric
                        label="Plan"
                        value={
                          tenant.subscription
                            .plan ===
                          "unconfigured"
                            ? "—"
                            : tenant.subscription
                                .plan
                        }
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </PlatformPanel>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2">
      <p className="truncate text-xs font-semibold text-slate-800">
        {value}
      </p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}
