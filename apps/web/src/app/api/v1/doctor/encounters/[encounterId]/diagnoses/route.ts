import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorService as s } from "@/server/doctor/doctor-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function POST(r: Request, c: { params: Promise<{ encounterId: string }> }) {
  return handleApiRoute(async () =>
    NextResponse.json(
      {
        diagnosis: await s.addDiagnosis(
          await requireRequestContext(),
          (await c.params).encounterId,
          await r.json(),
        ),
      },
      { status: 201 },
    ),
  );
}

export function DELETE(r: Request, c: { params: Promise<{ encounterId: string }> }) {
  return handleApiRoute(async () => {
    const url = new URL(r.url);
    const diagnosisId = url.searchParams.get("diagnosisId");
    if (!diagnosisId) {
      throw new WonFlowApiError(400, "missing-diagnosis-id", "diagnosisId parameter is required");
    }
    const { encounterId } = await c.params;
    await s.removeDiagnosis(await requireRequestContext(), encounterId, diagnosisId);
    return NextResponse.json({ success: true });
  });
}
