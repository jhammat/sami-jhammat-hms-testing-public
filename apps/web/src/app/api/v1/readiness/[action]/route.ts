import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { checkReadiness } from "@/server/readiness/readiness-service";
import type { ReadinessAction } from "@/server/readiness/readiness-service";

const VALID_ACTIONS: ReadonlySet<string> = new Set<ReadinessAction>([
  "start-sitting",
  "start-consultation",
  "book-appointment",
  "confirm-online-payment",
]);

export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params;
    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json({ error: `Unknown readiness action: ${action}`, code: "unknown-action" }, { status: 404 });
    }
    const searchParams = new URL(request.url).searchParams;
    const context = await requireRequestContext();
    const result = await checkReadiness(action as ReadinessAction, context, Object.fromEntries(searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return safeApiError(error);
  }
}
