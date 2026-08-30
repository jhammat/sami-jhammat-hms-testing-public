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
    const tasks = await physiotherapyService.listAssignedExercises(rc, patientId);
    return NextResponse.json({ tasks });
  });
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = await request.json();
    const task = await physiotherapyService.assignExercise(rc, body);
    return NextResponse.json({ task }, { status: 201 });
  });
}

export function DELETE(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const taskId = request.nextUrl.searchParams.get("taskId");
    if (!taskId) {
      throw new WonFlowApiError(400, "missing-task-id", "taskId query parameter is required.");
    }
    await physiotherapyService.deleteAssignedExercise(rc, taskId);
    return NextResponse.json({ success: true });
  });
}
