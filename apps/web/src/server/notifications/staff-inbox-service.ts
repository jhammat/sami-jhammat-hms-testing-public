import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import { WonFlowApiError } from "@/server/http/route-handler";

/**
 * The signed-in staff member's in-app notifications.
 *
 * Notifications were being written for staff — result releases, alert
 * escalations — and read back by nobody: the /notifications page was a static
 * placeholder with hard-coded zeros. This is the reader.
 *
 * Every query is pinned to the caller's own identity inside their own tenant.
 * The inbox never accepts an identity from the request, so there is no id a
 * caller can pass to read or clear someone else's notifications.
 *
 * Read state reuses the existing status column rather than adding one: an
 * in-app notification is SENT while it waits in the inbox and DELIVERED once
 * the person has seen it.
 */

export interface StaffInboxItem {
  id: string;
  templateCode: string;
  unread: boolean;
  createdAt: string;
  patientId: string | null;
  payload: Record<string, unknown>;
}

const UNREAD_STATUSES = ["PENDING", "QUEUED", "SENT"] as const;

export async function readStaffInbox(
  requestContext: WonFlowRequestContext,
  options: { limit?: number } = {},
): Promise<{ items: StaffInboxItem[]; unreadCount: number }> {
  const context = requireTenantContext(requestContext);
  const limit = Math.min(Math.max(Math.floor(options.limit ?? 30), 1), 100);
  const where = { tenantId: context.tenantId, identityId: context.identityId, channel: "IN_APP" as const };

  const [rows, unreadCount] = await Promise.all([
    database.notification.findMany({
      where: { ...where, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, templateCode: true, status: true, createdAt: true, patientId: true, payload: true },
    }),
    database.notification.count({ where: { ...where, status: { in: [...UNREAD_STATUSES] } } }),
  ]);

  return {
    unreadCount,
    items: rows.map((row) => ({
      id: row.id,
      templateCode: row.templateCode,
      unread: (UNREAD_STATUSES as readonly string[]).includes(row.status),
      createdAt: row.createdAt.toISOString(),
      patientId: row.patientId,
      payload: row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
    })),
  };
}

export async function markStaffInboxRead(
  requestContext: WonFlowRequestContext,
  input: { ids?: unknown; all?: unknown; patientId?: unknown },
): Promise<{ updated: number }> {
  const context = requireTenantContext(requestContext);
  const all = input.all === true;
  // UUIDs only: the id columns are uuids, and a malformed string would make the
  // database reject the whole update instead of simply matching nothing.
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ids = Array.isArray(input.ids)
    ? [...new Set(input.ids.filter((id): id is string => typeof id === "string" && uuid.test(id.trim())).map((id) => id.trim()))].slice(0, 200)
    : [];
  // Opening a patient's care-team record reads everything new on it, so the
  // badge for that patient should clear without clicking each notification.
  const patientId = typeof input.patientId === "string" && uuid.test(input.patientId.trim()) ? input.patientId.trim() : null;

  if (!all && ids.length === 0 && !patientId) {
    throw new WonFlowApiError(400, "nothing-to-mark", "Choose which notifications to mark as read.");
  }

  const result = await database.notification.updateMany({
    where: {
      tenantId: context.tenantId,
      identityId: context.identityId,
      channel: "IN_APP",
      status: { in: [...UNREAD_STATUSES] },
      ...(all ? {} : patientId && ids.length === 0 ? { patientId } : { id: { in: ids } }),
    },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });

  return { updated: result.count };
}
