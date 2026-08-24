import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { addTenantPicklistEntry, isTenantPicklistKind, listTenantPicklistEntries } from "@/server/tenant/tenant-picklist-service";

export function GET(request: Request) {
  return handleApiRoute(async () => {
    const context = await requireRequestContext();
    const kinds = (new URL(request.url).searchParams.get("kinds") ?? "").split(",").map((value) => value.trim()).filter(isTenantPicklistKind);
    return NextResponse.json({ entries: await listTenantPicklistEntries(context, kinds) });
  });
}

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const context = await requireRequestContext();
    const body = (await request.json()) as { kind: unknown; label: unknown; code?: unknown; metadata?: unknown };
    return NextResponse.json({ entry: await addTenantPicklistEntry(context, body) }, { status: 201 });
  });
}
