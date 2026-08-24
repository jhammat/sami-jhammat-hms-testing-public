import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { medicationAdherenceService } from "@/server/clinical/medication-adherence-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { GenerateMedicationRemindersInput } from "@wonflow/contracts";

export function POST(
  request: Request,
  { params }: { params: Promise<{ prescriptionId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { prescriptionId } = await params;
    const body = (await request.json().catch(() => ({}))) as Partial<GenerateMedicationRemindersInput>;

    const result = await medicationAdherenceService.generateMedicationTasksFromPrescription(rc, {
      ...body,
      prescriptionId,
    });

    return NextResponse.json(result);
  });
}
