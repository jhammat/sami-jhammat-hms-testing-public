import { database } from "@wonflow/database";
import type { Prisma } from "@wonflow/database";
import type { TenantPicklistKind } from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";

/**
 * Options staff add mid-workflow — a chief complaint that is not in the
 * starter list, a diagnosis, a lab or radiology order, a consultation room.
 *
 * These used to be written to localStorage, which meant a complaint typed at
 * one workstation was invisible at the next and vanished when the browser was
 * cleared. They are hospital data and belong in PostgreSQL, per
 * docs/architecture/client-storage.md.
 */

const KINDS = ["CHIEF_COMPLAINT", "DIAGNOSIS", "LABORATORY_ORDER", "RADIOLOGY_ORDER", "CONSULTATION_ROOM"] as const;

export function isTenantPicklistKind(value: unknown): value is TenantPicklistKind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}

/**
 * Adding to a list is governed by the permission that already governs doing
 * the thing the list feeds. Someone who may not order radiology may not invent
 * a radiology order either.
 */
const WRITE_PERMISSION: Record<TenantPicklistKind, string> = {
  CHIEF_COMPLAINT: "encounters.manage",
  DIAGNOSIS: "encounters.manage",
  LABORATORY_ORDER: "laboratory.orders.manage",
  RADIOLOGY_ORDER: "radiology.orders.manage",
  CONSULTATION_ROOM: "queues.manage",
};

/** Collapses case and inner whitespace so near-duplicates collide on the unique index. */
const normalizeLabel = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

export interface TenantPicklistEntryView {
  id: string;
  kind: TenantPicklistKind;
  label: string;
  code: string | null;
  metadata: Prisma.JsonValue | null;
}

export async function listTenantPicklistEntries(
  requestContext: WonFlowRequestContext,
  kinds: readonly TenantPicklistKind[],
): Promise<TenantPicklistEntryView[]> {
  const context = requireTenantContext(requestContext);
  if (kinds.length === 0) return [];
  const entries = await database.tenantPicklistEntry.findMany({
    where: { tenantId: context.tenantId, kind: { in: [...kinds] } },
    orderBy: [{ kind: "asc" }, { label: "asc" }],
    select: { id: true, kind: true, label: true, code: true, metadata: true },
  });
  return entries;
}

export async function addTenantPicklistEntry(
  requestContext: WonFlowRequestContext,
  input: { kind: unknown; label: unknown; code?: unknown; metadata?: unknown },
): Promise<TenantPicklistEntryView> {
  const context = requireTenantContext(requestContext);
  if (!isTenantPicklistKind(input.kind)) {
    throw new WonFlowApiError(400, "invalid-picklist-kind", "That is not a list this hospital keeps.");
  }
  requirePermission(context, WRITE_PERMISSION[input.kind]);

  const label = typeof input.label === "string" ? input.label.trim().replace(/\s+/g, " ") : "";
  if (label.length < 2) throw new WonFlowApiError(400, "picklist-label-required", "Enter at least two characters.");
  if (label.length > 250) throw new WonFlowApiError(400, "picklist-label-too-long", "Keep this under 250 characters.");
  const code = typeof input.code === "string" && input.code.trim() ? input.code.trim().slice(0, 100) : null;
  const metadata = input.metadata !== undefined && input.metadata !== null && typeof input.metadata === "object"
    ? (input.metadata as Prisma.InputJsonValue)
    : undefined;

  const normalizedLabel = normalizeLabel(label);
  // Two clinicians typing the same new complaint at the same moment is normal,
  // not an error: upsert so the second one silently joins the first.
  const entry = await database.tenantPicklistEntry.upsert({
    where: { tenantId_kind_normalizedLabel: { tenantId: context.tenantId, kind: input.kind, normalizedLabel } },
    create: {
      tenantId: context.tenantId,
      kind: input.kind,
      label,
      normalizedLabel,
      code,
      metadata,
      createdByMembershipId: context.membershipId,
    },
    update: {},
    select: { id: true, kind: true, label: true, code: true, metadata: true },
  });
  return entry;
}
