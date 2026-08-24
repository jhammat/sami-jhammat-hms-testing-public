import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { physiotherapyService } from "@/server/allied/physiotherapy-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function GET(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const patientId = request.nextUrl.searchParams.get("patientId");
    if (!patientId) {
      throw new WonFlowApiError(400, "missing-patient-id", "patientId query parameter is required.");
    }
    const sessions = await physiotherapyService.listSessions(rc, patientId);
    return NextResponse.json({ sessions });
  });
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = await request.json();
    const session = await physiotherapyService.logSession(rc, body);
    return NextResponse.json({ session }, { status: 201 });
  });
}
