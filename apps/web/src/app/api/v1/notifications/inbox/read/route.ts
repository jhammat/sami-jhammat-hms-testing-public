import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { markStaffInboxRead } from "@/server/notifications/staff-inbox-service";

/** Marks the caller's own notifications as read — specific ids, or all. */
export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const body = (await request.json().catch(() => null)) as { ids?: unknown; all?: unknown; patientId?: unknown } | null;
    const result = await markStaffInboxRead(await requireRequestContext(), body ?? {});
    return NextResponse.json(result);
  });
}
