"use client";

/**
 * Unified platform audit trail for one tenant: control actions
 * (subscription, entitlement and lifecycle changes) merged with support
 * access audit events, newest first.
 */

import { useMemo } from "react";

import type {
  WonFlowPlatformTenantOverview,
} from "@wonflow/mock-data";

import {
  WonFlowEmptyState,
} from "@/components/feedback";

interface AuditRow {
  id: string;
  occurredAt: string;
  kind: "Control action" | "Support access";
  action: string;
  actorUserId: string;
  detail: string;
  status?: string;
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) =>
      part.length === 0
        ? part
        : `${part[0]?.toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString();
}

function statusClasses(status: string): string {
  switch (status) {
    case "completed":
    case "active":
      return "bg-emerald-100 text-emerald-800";

    case "requested":
    case "approved":
    case "in-progress":
      return "bg-blue-100 text-blue-800";

    case "expired":
      return "bg-amber-100 text-amber-800";

    case "failed":
    case "cancelled":
    case "rejected":
    case "revoked":
      return "bg-red-100 text-red-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export interface PlatformAuditTrailProps {
  overview:
    WonFlowPlatformTenantOverview;
}

export function PlatformAuditTrail({
  overview,
}: PlatformAuditTrailProps) {
  const rows = useMemo<AuditRow[]>(
    () => {
      const controlRows: AuditRow[] =
        overview.controlActions.map(
          (action) => ({
            id: action.id,
            occurredAt:
              action.completedAt ??
              action.requestedAt,
            kind: "Control action",
            action: titleCase(action.type),
            actorUserId: action.actorUserId,
            detail: action.reason,
            status: action.status,
          }),
        );

      const supportRows: AuditRow[] =
        overview.supportAccessAuditEvents.map(
          (event) => ({
            id: event.id,
            occurredAt: event.occurredAt,
            kind: "Support access",
            action: titleCase(event.type),
            actorUserId: event.platformUserId,
            detail:
              event.reason ??
              ([
                event.resourceType,
                event.resourceId,
                event.permissionCode,
              ]
                .filter((value) => value !== undefined)
                .join(" · ") ||
                "No detail recorded"),
          }),
        );

      return [...controlRows, ...supportRows].sort(
        (left, right) =>
          right.occurredAt.localeCompare(left.occurredAt),
      );
    },
    [overview],
  );

  if (rows.length === 0) {
    return (
      <WonFlowEmptyState
        description="Subscription changes, entitlement updates, lifecycle actions and support access will appear here as they happen."
        title="No platform audit events yet"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 font-black text-slate-700">Type</th>
            <th className="px-4 py-3 font-black text-slate-700">Action</th>
            <th className="px-4 py-3 font-black text-slate-700">Status</th>
            <th className="px-4 py-3 font-black text-slate-700">Actor</th>
            <th className="px-4 py-3 font-black text-slate-700">Detail</th>
            <th className="px-4 py-3 font-black text-slate-700">Time</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={`${row.kind}-${row.id}`}>
              <td className="px-4 py-3">
                <span
                  className={[
                    "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                    row.kind === "Control action"
                      ? "bg-violet-100 text-violet-800"
                      : "bg-blue-100 text-blue-800",
                  ].join(" ")}
                >
                  {row.kind}
                </span>
              </td>

              <td className="px-4 py-3 font-bold text-slate-900">
                {row.action}
              </td>

              <td className="px-4 py-3">
                {row.status !== undefined ? (
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-1 text-xs font-bold",
                      statusClasses(row.status),
                    ].join(" ")}
                  >
                    {titleCase(row.status)}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>

              <td className="px-4 py-3">
                <code className="text-xs text-slate-600">
                  {row.actorUserId}
                </code>
              </td>

              <td className="max-w-sm px-4 py-3 text-slate-600">
                {row.detail}
              </td>

              <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                {formatDateTime(row.occurredAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
