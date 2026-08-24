import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { nutritionService } from "@/server/allied/nutrition-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function GET(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const patientId = request.nextUrl.searchParams.get("patientId");
    if (!patientId) {
      throw new WonFlowApiError(400, "missing-patient-id", "patientId query parameter is required.");
    }
    const assessments = await nutritionService.listAssessments(rc, patientId);
    return NextResponse.json({ assessments });
  });
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = await request.json();
    const assessment = await nutritionService.createAssessment(rc, body);
    return NextResponse.json({ assessment }, { status: 201 });
  });
}
