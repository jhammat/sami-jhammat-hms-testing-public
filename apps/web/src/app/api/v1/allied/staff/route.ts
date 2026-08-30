import { NextResponse } from "next/server";

import { database } from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";

/**
 * The allied health clinicians a care plan or referral can be assigned to.
 *
 * Deliberately narrow: id, staff type, title and display name only. A screen
 * choosing who to refer a patient to needs to render a picker, not read a
 * colleague's staff record, so nothing else is exposed.
 */
export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const context = requireTenantContext(await requireRequestContext());
    requirePermission(context, "patients.read");

    const staff = await database.staffProfile.findMany({
      where: {
        tenantId: context.tenantId,
        status: "ACTIVE",
        staffType: { in: ["PHYSIOTHERAPIST", "NUTRITIONIST"] },
      },
      select: {
        id: true,
        staffType: true,
        title: true,
        membership: { select: { displayName: true } },
      },
      orderBy: { staffType: "asc" },
    });

    return NextResponse.json({
      staff: staff.map((row) => ({
        id: row.id,
        staffType: row.staffType,
        title: row.title,
        displayName: row.membership?.displayName ?? "Unnamed clinician",
      })),
    });
  });
}
