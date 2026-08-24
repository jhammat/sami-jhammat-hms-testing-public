import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { syncService } from "@/server/offline/sync-service";
import type { BatchSyncRequest } from "@wonflow/contracts";

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = (await request.json()) as BatchSyncRequest;
    const response = await syncService.processBatchSync(rc, body);
    return NextResponse.json(response, { status: 200 });
  });
}
