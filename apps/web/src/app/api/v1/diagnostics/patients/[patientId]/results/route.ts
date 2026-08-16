import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { diagnosticsService as s } from "@/server/diagnostics/diagnostics-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function GET(request: Request, context: { params: Promise<{ patientId: string }> }) {
  return handleApiRoute(async () => {
    const { patientId } = await context.params;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    if (type !== "LABORATORY" && type !== "RADIOLOGY") throw new WonFlowApiError(400, "diagnostic-type-required", "Select laboratory or radiology.");
    return NextResponse.json({ orders: await s.getPatientResults(await requireRequestContext(), patientId, type) });
  });
}
