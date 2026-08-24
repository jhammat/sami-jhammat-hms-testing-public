import { NextResponse } from "next/server";
import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";

/**
 * The hospital's own letterhead — name and logo — for anything this staff
 * member prints. Deliberately not permission-gated beyond being signed in:
 * it is the branding already shown on every receipt and report the user can
 * produce, and it carries no patient, clinical or financial data.
 *
 * Exists because printed receipts previously took the logo from a localStorage
 * copy, which meant the hospital's own logo was missing from receipts printed
 * on any workstation that had not uploaded it.
 */
export function GET() {
  return handleApiRoute(async () => {
    const context = requireTenantContext(await requireRequestContext());
    const organization = await database.organization.findFirst({
      where: { id: context.organizationId, tenantId: context.tenantId },
      select: { displayName: true, settings: true },
    });
    return NextResponse.json({
      displayName: organization?.displayName ?? null,
      logoDataUrl: (organization?.settings as { logoDataUrl?: string } | null)?.logoDataUrl ?? null,
    });
  });
}
