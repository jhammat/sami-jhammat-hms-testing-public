"use client";

import {
  Activity,
  SearchX,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import {
  usePlatformAdministration,
} from "./platform-administration-context";
import type {
  PlatformAuditSeverity,
} from "./platform-administration-context";
import {
  PlatformEmptyState,
  PlatformLoadingState,
  PlatformSearchField,
  PlatformStatusBadge,
  platformInputClassName,
} from "./platform-administration-ui";

export function PlatformAuditPanel() {
  const {
    ready,
    workspace,
  } = usePlatformAdministration();

  const [query, setQuery] =
    useState("");
  const [severity, setSeverity] =
    useState<
      "all" | PlatformAuditSeverity
    >("all");
  const [category, setCategory] =
    useState("all");

  const visibleEvents = useMemo(() => {
    const normalized =
      query.trim().toLocaleLowerCase();

    return workspace.auditEvents.filter(
      (event) => {
        if (
          severity !== "all" &&
          event.severity !== severity
        ) {
          return false;
        }

        if (
          category !== "all" &&
          event.category !== category
        ) {
          return false;
        }

        if (normalized === "") {
          return true;
        }

        return [
          event.action,
          event.description,
          event.organizationName,
          event.actorLabel,
          event.category,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalized);
      },
    );
  }, [
    category,
    query,
    severity,
    workspace.auditEvents,
  ]);

  if (!ready) {
    return (
      <PlatformLoadingState label="Loading platform audit…" />
    );
  }

  if (workspace.auditEvents.length === 0) {
    return (
      <PlatformEmptyState
        description="Real configuration, entitlement, subscription, lifecycle and support-access actions will appear here."
        icon={
          <Activity
            aria-hidden="true"
            size={24}
          />
        }
        title="No audit events"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_190px_190px]">
        <PlatformSearchField
          label="Search platform audit"
          onChange={setQuery}
          placeholder="Search action, tenant, actor or description"
          value={query}
        />

        <select
          aria-label="Filter audit by severity"
          className={platformInputClassName}
          onChange={(event) =>
            setSeverity(
              event.target
                .value as typeof severity,
            )
          }
          value={severity}
        >
          <option value="all">
            All severities
          </option>
          <option value="information">
            Information
          </option>
          <option value="warning">
            Warning
          </option>
          <option value="critical">
            Critical
          </option>
        </select>

        <select
          aria-label="Filter audit by category"
          className={platformInputClassName}
          onChange={(event) =>
            setCategory(event.target.value)
          }
          value={category}
        >
          <option value="all">
            All categories
          </option>
          <option value="tenant">
            Tenant
          </option>
          <option value="subscription">
            Subscription
          </option>
          <option value="entitlement">
            Entitlement
          </option>
          <option value="support-access">
            Support access
          </option>
          <option value="settings">
            Settings
          </option>
        </select>
      </div>

      {visibleEvents.length === 0 ? (
        <PlatformEmptyState
          description="Adjust the search text or audit filters."
          icon={
            <SearchX
              aria-hidden="true"
              size={24}
            />
          }
          title="No matching audit events"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-3">
                  Time
                </th>
                <th className="px-3 py-3">
                  Severity
                </th>
                <th className="px-3 py-3">
                  Action
                </th>
                <th className="px-3 py-3">
                  Tenant
                </th>
                <th className="px-3 py-3">
                  Actor
                </th>
                <th className="px-3 py-3">
                  Description
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleEvents.map(
                (event) => (
                  <tr
                    className={[
                      "border-b border-slate-100 last:border-0",
                      event.severity ===
                      "critical"
                        ? "bg-red-100/80 text-red-950"
                        : "hover:bg-blue-50/30",
                    ].join(" ")}
                    key={event.id}
                  >
                    <td className="px-3 py-4 text-xs">
                      <time
                        dateTime={
                          event.createdAt
                        }
                      >
                        {new Intl.DateTimeFormat(
                          "en",
                          {
                            dateStyle:
                              "medium",
                            timeStyle:
                              "short",
                          },
                        ).format(
                          new Date(
                            event.createdAt,
                          ),
                        )}
                      </time>
                    </td>

                    <td className="px-3 py-4">
                      <PlatformStatusBadge
                        status={
                          event.severity
                        }
                      />
                    </td>

                    <td className="px-3 py-4 font-mono text-xs font-semibold">
                      {event.action}
                    </td>

                    <td className="px-3 py-4 text-xs font-semibold">
                      {event.organizationName ||
                        "Platform-wide"}
                    </td>

                    <td className="px-3 py-4 text-xs">
                      {event.actorLabel}
                    </td>

                    <td className="max-w-md px-3 py-4 text-xs leading-5">
                      {event.description}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
