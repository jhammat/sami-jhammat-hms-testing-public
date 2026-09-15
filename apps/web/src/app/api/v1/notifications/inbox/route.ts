import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { readStaffInbox } from "@/server/notifications/staff-inbox-service";

/** The signed-in staff member's own in-app notifications and unread count. */
export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? "30");
    const inbox = await readStaffInbox(await requireRequestContext(), {
      limit: Number.isFinite(limit) ? limit : 30,
    });
    return NextResponse.json(inbox);
  });
}
