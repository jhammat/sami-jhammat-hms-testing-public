import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { receptionService } from "@/server/reception/reception-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () =>
    NextResponse.json(await receptionService.getCatalog(await requireRequestContext())),
  );
}
